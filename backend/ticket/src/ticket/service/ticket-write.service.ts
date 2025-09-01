/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, NotFoundException } from '@nestjs/common';
import { context as otelContext, trace, Tracer } from '@opentelemetry/api';
import { LoggerPlus } from '../../logger/logger-plus.js';
import { LoggerService } from '../../logger/logger.service.js';
import { KafkaProducerService } from '../../messaging/kafka-producer.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TraceContextProvider } from '../../trace/trace-context.provider.js';
import { CreateTicketInput } from '../models/input/create-ticket.input.js';
import { handleSpanError } from '../utils/error.util.js';
import { UpdateTicketInput } from '../models/input/update-ticket.input.js';

@Injectable()
export class TicketWriteService {
  readonly #prismaService: PrismaService;
  readonly #kafkaProducerService: KafkaProducerService;
  readonly #loggerService: LoggerService;
  readonly #logger: LoggerPlus;
  readonly #tracer: Tracer;
  readonly #traceContextProvider: TraceContextProvider;

  constructor(
    prismaService: PrismaService,
    kafkaProducerService: KafkaProducerService,
    loggerService: LoggerService,
    traceContextProvider: TraceContextProvider,
  ) {
    this.#prismaService = prismaService;
    this.#loggerService = loggerService;
    this.#logger = this.#loggerService.getLogger(TicketWriteService.name);
    this.#kafkaProducerService = kafkaProducerService;
    this.#tracer = trace.getTracer(TicketWriteService.name);
    this.#traceContextProvider = traceContextProvider;
  }

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

            void this.#kafkaProducerService.updateSeat(
              {
                id: input?.seatId,
                guestId: input?.guestProfileId,
                eventId: input.eventId,
              },
              'ticket.write-service',
              trace,
            );

            return ticket;
          },
        );
      } catch (error) {
        handleSpanError(span, error, this.#logger, 'create');
      } finally {
        span.end();
      }
    });
  }

  async addSeatId(input: {
    id: string | undefined;
    eventId: string;
    guestId: string;
  }) {
    const { id: seatId, eventId, guestId: guestProfileId } = input;
    const ticket = await (this.#prismaService as any).ticket.findUnique({
      where: { eventId, guestProfileId },
      select: { id: true, seatId: true, eventId: true, guestProfileId: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const updated = await this.#prismaService.$transaction(async (tx) => {
      const updatedTicket = await tx.ticket.update({
        where: { id: ticket.id },
        data: { seatId },
        select: {
          id: true,
          eventId: true,
          guestProfileId: true,
          seatId: true,
        },
      });
      return updatedTicket;
    });
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

  async update(input: UpdateTicketInput) {
    await this.#ensureExists(input.id);

    return this.#prismaService.ticket.update({
      where: { id: input.id },
      data: {
        revoked: input.revoked,
        deviceBoundKey: input.deviceBoundKey,
        currentState: input.currentState,
        seatId: input.seatId,
      },
    });
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

  async assignSeat(ticketId: string, seatId: string) {
    await this.#ensureExists(ticketId);
    return await await (this.#prismaService as any).ticket.update({
      where: { id: ticketId },
      data: { seatId },
    });
  }
}
