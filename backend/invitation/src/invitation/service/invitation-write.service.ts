// /src/invitation/service/invitation-write.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";
import { RsvpChoice } from "../models/enums/rsvp-choice.enum";
import { InvitationStatus } from "../models/enums/invitation-status.enum";
import { InvitationUpdateInput } from "../models/input/update-invitation.input";
import { InvitationCreateInput } from "../models/input/create-invitation.input";
import { InvitationReadService } from "./invitation-read.service";
import { KafkaConsumerService } from "../../messaging/kafka-consumer.service";
import { KafkaProducerService } from "../../messaging/kafka-producer.service";
import { LoggerService } from "../../logger/logger.service";
import { LoggerPlus } from "../../logger/logger-plus";
import { getKafkaTopicsBy } from "../../messaging/kafka-topic.properties";
import { trace, Tracer, context as otelContext } from "@opentelemetry/api";
import { TraceContextProvider } from "../../trace/trace-context.provider";
import { handleSpanError } from "../utils/error.util";
import { AcceptRSVPInput } from "../models/input/accept-rsvp.input";
import { Invitation } from '../models/entity/invitation.entity';

@Injectable()
export class InvitationWriteService {
  readonly #kafkaConsumerService: KafkaConsumerService;
  readonly #kafkaProducerService: KafkaProducerService;
  readonly #loggerService: LoggerService;
  readonly #logger: LoggerPlus;
  readonly #tracer: Tracer;
  readonly #traceContextProvider: TraceContextProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly readService: InvitationReadService,
    kafkaConsumerService: KafkaConsumerService,
    kafkaProducerService: KafkaProducerService,
    loggerService: LoggerService,
    traceContextProvider: TraceContextProvider,
  ) {
    this.#kafkaConsumerService = kafkaConsumerService;
    this.#loggerService = loggerService;
    this.#logger = this.#loggerService.getLogger(InvitationWriteService.name);
    this.#kafkaProducerService = kafkaProducerService;
    this.#tracer = trace.getTracer(InvitationWriteService.name);
    this.#traceContextProvider = traceContextProvider;
  }

  async onModuleInit(): Promise<void> {
    await this.#kafkaConsumerService.consume({
      topics: getKafkaTopicsBy(["user"]),
    });
  }

  async addUserId({
    userId,
    invitationId,
  }: {
    userId: string;
    invitationId: string;
  }) {
    return await this.#tracer.startActiveSpan(
      "invitation.accept-rsvp",
      async (span) => {
        try {
          return await otelContext.with(
            trace.setSpan(otelContext.active(), span),
            async () => {
              this.#logger.debug("accept");

              await this.ensureExists(invitationId);

              const updated = await this.prisma.invitation.update({
                where: { id: invitationId },
                data: {
                  guestProfileId: userId,
                },
              });
              return updated;
            },
          );
        } catch (error) {
          handleSpanError(span, error, this.#logger, "addItem");
        } finally {
          span.end();
        }
      },
    );
  }

  /**
   * RSVP "accept" – setzt rsvpChoice=YES, status=ACCEPTED, rsvpAt=jetzt.
   * Optional könnte hier ein Profil-/Ticket-Workflow über Events gestartet werden.
   */
  async accept({ id, input }: { id: string; input: AcceptRSVPInput }) {
    const Invitation = await this.readService.findOne(id)
    
    if (Invitation.rsvpChoice === RsvpChoice.YES) throw new Error('already Accepted')
    return await this.#tracer.startActiveSpan(
      "invitation.accept-rsvp",
      async (span) => {
        try {
          return await otelContext.with(
            trace.setSpan(otelContext.active(), span),
            async () => {
              this.#logger.debug("accept");

              await this.ensureExists(id);

              const updated = await this.prisma.invitation.update({
                where: { id },
                data: {
                  rsvpChoice: RsvpChoice.YES,
                  status: InvitationStatus.ACCEPTED,
                },
              });

              const trace = this.#traceContextProvider.getContext();

              this.#kafkaProducerService.approved(
                {
                  invitationId: id,
                  firstName: input.firstName,
                  lastName: input.lastName,
                  emailData: input.email,
                },
                "invitation.write-service",
                trace,
              );
              return updated;
            },
          );
        } catch (error) {
          handleSpanError(span, error, this.#logger, "addItem");
        } finally {
          span.end();
        }
      },
    );
  }

  async create(input: InvitationCreateInput) {
    if (!input.eventId) throw new BadRequestException("eventId is required");
    if (typeof input.maxInvitees === "number" && input.maxInvitees < 0) {
      throw new BadRequestException("maxInvitees must be >= 0");
    }

    const data = {
      eventId: input.eventId,
      status: InvitationStatus.PENDING,
      maxInvitees: input.maxInvitees ?? 0,
      invitedByInvitationId: input.invitedByInvitationId ?? null,
    };

    const created = await this.prisma.invitation.create({ data });
    return created;
  }

  async createPlusOne(input) {
    const { eventId, invitedByInvitationId } = input;
    if (!eventId) throw new BadRequestException("eventId is required");
    if (!invitedByInvitationId) {
      throw new BadRequestException(
        "invitedByInvitationId is required for Plus-Ones",
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1) Versuch, maxInvitees zu dekrementieren, NUR wenn > 0
      const dec = await tx.invitation.updateMany({
        where: {
          id: invitedByInvitationId,
          eventId,
          maxInvitees: { gt: 0 },
        },
        data: {
          maxInvitees: { decrement: 1 },
        },
      });

      if (dec.count !== 1) {
        // Prüfen ob es die Einladung gibt (um bessere Fehlermeldungen zu liefern)
        const exists = await tx.invitation.findFirst({
          where: { id: invitedByInvitationId, eventId },
          select: { id: true, maxInvitees: true },
        });
        if (!exists) {
          throw new NotFoundException(
            "Parent invitation (invitedByInvitationId) not found for this event",
          );
        }
        // Existiert, aber keine Plus-Ones mehr frei
        throw new BadRequestException(
          "No more Plus-Ones allowed for this invitation",
        );
      }

      // 2) Kind-Einladung anlegen (maxInvitees=0)
      const created = await tx.invitation.create({
        data: {
          eventId,
          status: InvitationStatus.PENDING,
          maxInvitees: 0,
          invitedByInvitationId,
        },
      });

      return created;
    });

    return result;
  }

  async update(id: string, input: InvitationUpdateInput) {
    await this.ensureExists(id);

    const data: Record<string, any> = {};

    data.status = InvitationStatus.ACCEPTED;

    if (typeof input.maxInvitees === "number") {
      if (input.maxInvitees < 0)
        throw new BadRequestException("maxInvitees must be >= 0");
      data.maxInvitees = input.maxInvitees;
    }

    if (typeof input.approved === "boolean") {
      // Feld muss im Schema vorhanden sein (Boolean? @default(false))
      data.approved = input.approved;
    }

    if (typeof input.rsvpChoice !== "undefined") {
      data.rsvpChoice = input.rsvpChoice as any;
      if (input.rsvpChoice === RsvpChoice.YES)
        data.status = InvitationStatus.ACCEPTED;
      if (input.rsvpChoice === RsvpChoice.NO)
        data.status = InvitationStatus.DECLINED;
    }

    if (input.invitedByInvitationId) {
      data.invitedByInvitationId = input.invitedByInvitationId;
    }

    if (input.guestProfileId) {
      data.guestProfileId = input.guestProfileId;
    }

    const updated = await this.prisma.invitation.update({
      where: { id },
      data,
    });
    return updated;
  }

  async delete(id: string) {
    await this.ensureExists(id);
    const deleted = await this.prisma.invitation.delete({ where: { id } });
    return deleted;
  }

  async setGuestProfileId(id: string, guestProfileId: string | null) {
    await this.ensureExists(id);
    const updated = await this.prisma.invitation.update({
      where: { id },
      data: { guestProfileId },
    });
    return updated as unknown;
  }

  async importMany(records: InvitationCreateInput[]) {
    if (!records?.length) return { inserted: 0 };

    const ops = records.map((r) =>
      this.prisma.invitation.create({
        data: {
          eventId: r.eventId,
          status: InvitationStatus.PENDING,
          maxInvitees: r.maxInvitees ?? 0,
          invitedByInvitationId: r.invitedByInvitationId ?? null,
          // KEIN guestProfileId hier!
        },
      }),
    );

    const res = await this.prisma.$transaction(ops);
    return { inserted: res.length };
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.invitation.findUnique({ where: { id } });
    if (!found) throw new NotFoundException("Invitation not found");
  }
}
