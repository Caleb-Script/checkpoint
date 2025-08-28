/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { context as otelContext, trace, Tracer } from '@opentelemetry/api';
import { randomUUID } from 'crypto';
import { LoggerPlus } from '../../logger/logger-plus.js';
import { LoggerService } from '../../logger/logger.service.js';
import { KafkaConsumerService } from '../../messaging/kafka-consumer.service.js';
import { KafkaProducerService } from '../../messaging/kafka-producer.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PresenceState } from '../../scan/models/enums/presenceState.enum.js';
import { TraceContextProvider } from '../../trace/trace-context.provider.js';
import { Ticket } from '../models/entity/ticket.entity.js';
import { CreateTicketInput } from '../models/input/create-ticket.input.js';
import { handleSpanError } from '../utils/error.util.js';
import { signTicketJwt, verifyTicketJwt } from '../utils/jwt.util.js';
import { TicketReadService } from './ticket-read.service.js';
import { TokenService } from '../../token/services/token.service.js';
import { getKafkaTopicsBy } from '../../messaging/kafka-topic.properties.js';

@Injectable()
export class TicketWriteService {
  readonly #prismaService: PrismaService;
  readonly #kafkaConsumerService: KafkaConsumerService;
  readonly #kafkaProducerService: KafkaProducerService;
  readonly #loggerService: LoggerService;
  readonly #logger: LoggerPlus;
  readonly #tracer: Tracer;
  readonly #traceContextProvider: TraceContextProvider;
  readonly #tokenService: TokenService;

  constructor(
    prismaService: PrismaService,
    private readonly ticketReadService: TicketReadService,
    kafkaConsumerService: KafkaConsumerService,
    kafkaProducerService: KafkaProducerService,
    loggerService: LoggerService,
    traceContextProvider: TraceContextProvider,
    tokenService: TokenService,
  ) {
    this.#prismaService = prismaService;
    this.#kafkaConsumerService = kafkaConsumerService;
    this.#loggerService = loggerService;
    this.#logger = this.#loggerService.getLogger(TicketWriteService.name);
    this.#kafkaProducerService = kafkaProducerService;
    this.#tracer = trace.getTracer(TicketWriteService.name);
    this.#traceContextProvider = traceContextProvider;
    this.#tokenService = tokenService;
  }

  // async onModuleInit(): Promise<void> {
  //   await this.#kafkaConsumerService.consume({
  //     topics: getKafkaTopicsBy(['user']),
  //   });
  // }

  async create(input: CreateTicketInput) {
    return await this.#tracer.startActiveSpan('ticket.create', async (span) => {
      try {
        return await otelContext.with(
          trace.setSpan(otelContext.active(), span),
          async () => {
            void this.#logger.debug('input=%o', input);

            const data = {
              event: input.eventId,
              invitation: input.invitationId,
              currentState: 'OUTSIDE',
              deviceBoundKey: null,
              revoked: false,
              seat: input.seatId,
              lastRotatedAt: null,
            };

            const ticket = await await (
              this.#prismaService as any
            ).ticket.create({ data: input });
            this.#logger.debug('ticket=%o', ticket);

            const trace = this.#traceContextProvider.getContext();

            void this.#kafkaProducerService.addAttribute(
              {
                guestProfileId: input.guestProfileId,
                attribute: 'ticketId',
                value: ticket.id,
                mode: 'set',
              },
              'ticket.write-service',
              trace,
            );

            return ticket;
          },
        );
      } catch (error) {
        handleSpanError(span, error, this.#logger, 'addItem');
      } finally {
        span.end();
      }
    });
  }

  async rotate(ticketId: string, ttlSeconds?: number, deviceHash?: string) {
    const ticket: Ticket = await this.ticketReadService.findById(ticketId);
    if (ticket.revoked) throw new BadRequestException('Ticket revoked');

    const ttl = ttlSeconds ?? 60; // Default TTL in seconds
    // ⚠️ Nur Minimaldaten ins JWT packen
    const payload = {
      sub: ticket.id, // Ticket-ID
      jti: randomUUID(), // eindeutige Token-ID
      eventId: ticket.eventId, // Event-ID
      deviceHash: deviceHash ?? undefined, // Gerät-Bindung
    };

    const token = await signTicketJwt(payload, ttl);

    await (this.#prismaService as any).ticket.update({
      where: { id: ticket.id },

      data: { lastRotatedAt: new Date() },
    });

    return { token, ttlSeconds: ttl };
  }

  async handleScan(
    token: string,
    // gate = 'Main Entrance',
    // scannerUserId?: string,
  ) {
    try {
      const { payload } = await verifyTicketJwt(token);

      const ticketId = payload.sub as string;
      const deviceHash = payload.deviceHash as string | undefined;

      // 🎯 Jetzt holen wir den aktuellen State IMMER aus der DB
      const ticket = await await (this.#prismaService as any).ticket.findUnique(
        {
          where: { id: ticketId },
        },
      );

      if (!ticket) throw new NotFoundException('Ticket not found');
      if (ticket.revoked) throw new BadRequestException('Ticket revoked');

      // Toggle State (INSIDE ⇆ OUTSIDE)
      const newState = ticket.currentState === 'INSIDE' ? 'OUTSIDE' : 'INSIDE';

      // Falls Wiedereintritt nicht erlaubt
      // if (ticket.currentState === 'INSIDE' && !ticket.event.allowReEntry) {
      //   throw new BadRequestException('Re-entry not allowed for this event');
      // }

      // Update Ticket
      await await (this.#prismaService as any).ticket.update({
        where: { id: ticket.id },
        data: { currentState: newState, deviceBoundKey: deviceHash ?? null },
      });

      // ScanLog schreiben
      // await await (this.#prismaService as any).scanLog.create({
      //   data: {
      //     ticketId,
      //     eventId: ticket.eventId,
      //     byUserId: scannerUserId,
      //     direction: newState,
      //     verdict: 'OK',
      //     gate,
      //     deviceHash,
      //   },
      // });

      // 🎯 Rückgabe: immer aktueller DB-State
      return {
        ticketId,
        eventId: ticket.eventId,
        invitationId: ticket.invitationId,
        deviceBoundKey: deviceHash,
        state: newState,
        seat: ticket.seatId!,
        deviceHash,
      };
    } catch (err) {
      console.error('❌ Invalid token:', err);
      throw new BadRequestException('Invalid token or ticket not found');
    }
  }

  async bindDevice(ticketId: string, deviceKey: string) {
    await this.#ensureExists(ticketId);
    return await (this.#prismaService as any).ticket.update({
      where: { id: ticketId },
      data: { deviceBoundKey: deviceKey },
    });
  }

  async #ensureExists(id: string) {
    const found = await (this.#prismaService as any).ticket.findUnique({
      where: { id },
    });
    if (!found) throw new NotFoundException('Ticket not found');
    return found;
  }

  /**
   * Löscht Ticket robust (Logs + ShareGuard zuerst).
   */
  async delete(ticketId: string) {
    await this.#ensureExists(ticketId);
    return await (this.#prismaService as any).$transaction(
      async (tx: {
        scanLog: { deleteMany: (arg0: { where: { ticketId: string } }) => any };
        shareGuard: {
          deleteMany: (arg0: { where: { ticketId: string } }) => any;
        };
        ticket: { delete: (arg0: { where: { id: string } }) => any };
      }) => {
        await tx.scanLog.deleteMany({ where: { ticketId } });
        await tx.shareGuard.deleteMany({ where: { ticketId } });
        return tx.ticket.delete({ where: { id: ticketId } });
      },
    );
  }

  async revoke(ticketId: string) {
    await this.#ensureExists(ticketId);
    return await (this.#prismaService as any).ticket.update({
      where: { id: ticketId },
      data: { revoked: true },
    });
  }

  /**
   * Erstellt ein Ticket aus einer bestätigten Einladung.
   * Garantiert Eindeutigkeit via unique(invitationId).
   */
  async createFromInvitation(params: {
    invitationId: string;
    eventId: string;
    guestProfileId?: string | null;
    seatId?: string | null;
  }) {
    const {
      invitationId,
      eventId,
      guestProfileId = null,
      seatId = null,
    } = params;

    const created = await await (this.#prismaService as any).ticket.create({
      data: {
        invitationId,
        eventId,
        guestProfileId,
        seatId,
        currentState: PresenceState.OUTSIDE,
        revoked: false,
        deviceBoundKey: null,
        lastRotatedAt: null,
      },
    });

    // Optionale default ShareGuard-Zeile anlegen
    await await (this.#prismaService as any).shareGuard.upsert({
      where: { ticketId: created.id },
      update: {},
      create: { ticketId: created.id },
    });

    return created;
  }

  async assignSeat(ticketId: string, seatId: string) {
    await this.#ensureExists(ticketId);
    return await await (this.#prismaService as any).ticket.update({
      where: { id: ticketId },
      data: { seatId },
    });
  }

  /**
   * issueTicketQr(ticketId: ID!, deviceHash: String!): { token: String!, exp: Int!, jti: String! }
   *
   * - gibt einen kurzlebigen QR-JWT zurück (Signatur/exp/jti)
   * - blockt, wenn das anfragende Gerät nicht dem gebundenen Gerät entspricht
   *   (dein Service loggt dann per console.log eine Admin-Notify)
   * Gibt ein kurzlebiges QR-JWT für ein Ticket aus.
   * Nur erlaubt, wenn das anfragende Gerät dem gebundenen Gerät entspricht.
   * Bei neuem Gerät: Admin-Notify (console.log) + Fehler.
   */
  async issueTicketQr(
    ticketId: string,
    deviceHash: string,
  ): Promise<{ token: string; exp: number; jti: string }> {
    const ticket = await this.#prismaService.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    if (ticket.deviceBoundKey && ticket.deviceBoundKey !== deviceHash) {
      // Admin-Notify (für Test: console.log)
      // In echt: Mail/Webhook/Push
      // Login mit neuem Gerät erfordert Admin-Freigabe → hier blocken
      // (Du kannst alternativ eine Pending-Approval-Queue führen)
      console.log(
        `[ADMIN] Neues Gerät erkennt: ticket=${ticket.id} expected=${ticket.deviceBoundKey} got=${deviceHash}`,
      );
      throw new Error('Untrusted device – admin approval required');
    }

    return this.#tokenService.signTicketJwt({
      sub: ticket.id,
      tid: ticket.id,
      eid: ticket.eventId,
      sk: ticket.seatId ?? undefined,
      cs: ticket.currentState as PresenceState,
      dk: ticket.deviceBoundKey ?? undefined,
    });
  }
}
