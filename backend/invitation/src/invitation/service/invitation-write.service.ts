// /src/invitation/service/invitation-write.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
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
import { AcceptRSVPInput, RSVPReply } from "../models/input/accept-rsvp.input";
import { Invitation } from "../models/entity/invitation.entity";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class InvitationWriteService {
  readonly #prismaService: PrismaService;
  readonly #kafkaConsumerService: KafkaConsumerService;
  readonly #kafkaProducerService: KafkaProducerService;
  readonly #loggerService: LoggerService;
  readonly #logger: LoggerPlus;
  readonly #tracer: Tracer;
  readonly #traceContextProvider: TraceContextProvider;

  constructor(
    prismaService: PrismaService,
    private readonly readService: InvitationReadService,
    kafkaConsumerService: KafkaConsumerService,
    kafkaProducerService: KafkaProducerService,
    loggerService: LoggerService,
    traceContextProvider: TraceContextProvider,
  ) {
    this.#prismaService = prismaService;
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

              await this.#ensureExists(invitationId);

              const updated = await this.#prismaService.invitation.update({
                where: { id: invitationId },
                data: {
                  guestProfileId: userId,
                },
              });

              // Wichtig: Subscription-Event
              // this.#pubsub?.publish('invitationUpdated', { invitationUpdated: updated });
              return updated;
            },
          );
        } catch (error) {
          handleSpanError(span, error, this.#logger, "addUserId");
        } finally {
          span.end();
        }
      },
    );
  }

  async reply(arg0: { id: string; reply: RSVPReply }) {
    this.#logger.debug("Replay:");
    const { id, reply } = arg0;
    const { reply: reply1, input } = reply;

    if (reply1 === RsvpChoice.NO) {
      return await this.#prismaService.invitation.update({
        where: { id },
        data: {
          rsvpChoice: reply1,
          status: InvitationStatus.DECLINED,
        },
      });
    } else {
      if (!input) throw new Error("keine Input Daten gegeben");
      return await this.accept({ id, input });
    }
  }

  /**
   * RSVP "accept" – setzt rsvpChoice=YES, status=ACCEPTED, rsvpAt=jetzt.
   * Optional könnte hier ein Profil-/Ticket-Workflow über Events gestartet werden.
   */
  async accept({ id, input }: { id: string; input: AcceptRSVPInput }) {
    const { lastName, firstName, email, phone } = input;
    const Invitation = await this.readService.findOne(id);

    if (Invitation.rsvpChoice === RsvpChoice.YES)
      throw new Error("already Accepted");
    return await this.#tracer.startActiveSpan(
      "invitation.accept-rsvp",
      async (span) => {
        try {
          return await otelContext.with(
            trace.setSpan(otelContext.active(), span),
            async () => {
              this.#logger.debug("accept");

              await this.#ensureExists(id);

              const updated = await this.#prismaService.invitation.update({
                where: { id },
                data: {
                  rsvpChoice: RsvpChoice.YES,
                  status: InvitationStatus.ACCEPTED,
                  lastName,
                  firstName,
                  phone,
                },
              });
              return updated;
            },
          );
        } catch (error) {
          handleSpanError(span, error, this.#logger, "accept");
        } finally {
          span.end();
        }
      },
    );
  }

  async approve(id: string, approve: boolean) {
    this.#logger.debug("approve: input=%o", { id, approve });

    return await this.#tracer.startActiveSpan(
      "invitation.accept-rsvp",
      async (span) => {
        try {
          return await otelContext.with(
            trace.setSpan(otelContext.active(), span),
            async () => {
              this.#logger.debug("approve");

              await this.#ensureExists(id);

              const data: Record<string, any> = {};
              data.approved = approve;

              const updated = (await this.#prismaService.invitation.update({
                where: { id },
                data,
              })) as Invitation;

              const trace = this.#traceContextProvider.getContext();

              if (approve) {
                this.#logger.debug("Zugang gewährt");
                if (!updated.guestProfileId) {
                  this.#kafkaProducerService.approved(
                    {
                      invitationId: id,
                      firstName: updated.firstName ?? "N/A",
                      lastName: updated.lastName ?? "N/A",
                      emailData: updated.email,
                      phone: updated.phone,
                    },
                    "invitation.write-service",
                    trace,
                  );
                } else {
                  this.#logger.debug(
                    "Gastprofil bereits vorhanden – Kafka-Event übersprungen (idempotent).",
                  );
                }
              } else {
                this.#logger.debug("Zugang verweigert");
              }

              // // (Optional) gleich ein „updated“ Event fürs Realtime-UI publizieren, siehe PubSub unten
              // this.#pubsub?.publish('invitationUpdated', { invitationUpdated: updated });

              return updated;
            },
          );
        } catch (error) {
          handleSpanError(span, error, this.#logger, "approve");
        } finally {
          span.end();
        }
      },
    );
  }

  async create(input: InvitationCreateInput) {
    const { eventId, firstName, lastName } = input;
    this.#logger.debug("create: input=%o", input);
    this.#logger.debug("Einladung für %s %s", firstName, lastName);

    if (input.invitedByInvitationId)
      this.#logger.debug(
        "eingeladen von der ID: %s",
        input.invitedByInvitationId,
      );

    if (!input.eventId) throw new BadRequestException("eventId is required");
    if (typeof input.maxInvitees === "number" && input.maxInvitees < 0) {
      throw new BadRequestException("maxInvitees must be >= 0");
    }

    const data = {
      eventId,
      firstName,
      lastName,
      status: InvitationStatus.PENDING,
      maxInvitees: input.maxInvitees ?? 0,
      invitedByInvitationId: input.invitedByInvitationId ?? null,
    };

    const created = await this.#prismaService.invitation.create({ data });
    return created;
  }

  async createPlusOne(input) {
    const { eventId, invitedByInvitationId, firstName, lastName } = input;
    this.#logger.debug("createPlusOne: input=%o", input);
    if (!eventId) throw new BadRequestException("eventId is required");
    if (!invitedByInvitationId) {
      throw new BadRequestException(
        "invitedByInvitationId is required for Plus-Ones",
      );
    }

    const result = await this.#prismaService.$transaction(async (tx) => {
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
          throw new NotFoundException("Keine Einladung für dieses Event!");
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
          lastName,
          firstName,
        },
      });

      // 3) Child-ID zur String-Liste des Parents hinzufügen
      //    -> benötigt in Prisma-Schema: plusOnes String[] @default([])
      await tx.invitation.update({
        where: { id: invitedByInvitationId },
        data: {
          plusOnes: { push: created.id },
        },
      });

      return created;
    });

    return result;
  }

  async update(id: string, input: InvitationUpdateInput) {
    await this.#ensureExists(id);

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

    const updated = await this.#prismaService.invitation.update({
      where: { id },
      data,
    });

    return updated;
  }

  async delete(id: string) {
    await this.#ensureExists(id);
    const deleted = await this.#prismaService.invitation.delete({
      where: { id },
    });

    return deleted;
  }

  async setGuestProfileId(id: string, guestProfileId: string | null) {
    await this.#ensureExists(id);
    const updated = await this.#prismaService.invitation.update({
      where: { id },
      data: { guestProfileId },
    });
    return updated as unknown;
  }

  async importMany(records: InvitationCreateInput[]) {
    if (!records?.length) return { inserted: 0 };

    const ops = records.map((r) =>
      this.#prismaService.invitation.create({
        data: {
          eventId: r.eventId,
          status: InvitationStatus.PENDING,
          maxInvitees: r.maxInvitees ?? 0,
          invitedByInvitationId: r.invitedByInvitationId ?? null,
          // KEIN guestProfileId hier!
        },
      }),
    );

    const res = await this.#prismaService.$transaction(ops);
    return { inserted: res.length };
  }

  async #ensureExists(id: string) {
    const found = await this.#prismaService.invitation.findUnique({
      where: { id },
    });
    if (!found) throw new NotFoundException("Invitation not found");
  }

  /**
   * Löscht ein einzelnes Plus-One (Child) und erhöht das maxInvitees der Parent-Einladung um 1.
   */
  async deletePlusOne(id: string) {
    return await this.#prismaService.$transaction(async (tx) => {
      // Child holen
      const child = await tx.invitation.findUnique({
        where: { id },
        select: { id: true, eventId: true, invitedByInvitationId: true },
      });

      if (!child) {
        throw new NotFoundException("Invitation not found");
      }
      if (!child.invitedByInvitationId) {
        throw new BadRequestException("Invitation is not a Plus-One");
      }

      // Parent validieren
      const parent = await tx.invitation.findFirst({
        where: { id: child.invitedByInvitationId, eventId: child.eventId },
        select: { id: true, plusOnes: true },
      });
      if (!parent) {
        throw new NotFoundException(
          "Parent invitation (invitedByInvitationId) not found for this event",
        );
      }

      // Child löschen
      const deleted = await tx.invitation.delete({ where: { id: child.id } });

      // Parent-Slot zurückgeben
      await tx.invitation.update({
        where: { id: parent.id },
        data: { maxInvitees: { increment: 1 } },
      });

      if (parent) {
        await tx.invitation.update({
          where: { id: child.invitedByInvitationId! },
          data: {
            plusOnes: {
              set: (parent.plusOnes ?? []).filter((id) => id !== child.id),
            },
          },
        });
      }

      return deleted;
    });
  }

  /**
   * Löscht alle Plus-Ones einer Parent-Einladung und erhöht maxInvitees entsprechend um die Anzahl.
   */
  async deleteAllPlusOnes(invitedByInvitationId: string) {
    return await this.#prismaService.$transaction(async (tx) => {
      // Parent prüfen (+ plusOnes laden)
      const parent = await tx.invitation.findUnique({
        where: { id: invitedByInvitationId },
        select: { id: true, eventId: true, plusOnes: true },
      });
      if (!parent) throw new NotFoundException("Invitation not found");

      // Alle Children sammeln
      const children = await tx.invitation.findMany({
        where: { invitedByInvitationId, eventId: parent.eventId },
        select: { id: true },
      });

      if (children.length === 0) {
        // Nichts zu tun → sicherstellen, dass plusOnes konsistent ist
        // (optional, kann man auch weglassen)
        // await tx.invitation.update({ where: { id: parent.id }, data: { plusOnes: { set: [] } } });
        return [];
      }

      // IDs-Menge für effizientes Filtern
      const toRemove = new Set(children.map((c) => c.id));

      // Alle Children löschen
      const deleted = await Promise.all(
        children.map((c) => tx.invitation.delete({ where: { id: c.id } })),
      );

      // Slots auf Parent zurückbuchen
      await tx.invitation.update({
        where: { id: parent.id },
        data: { maxInvitees: { increment: children.length } },
      });

      // plusOnes-Liste des Parents bereinigen (nur die gelöschten IDs entfernen)
      await tx.invitation.update({
        where: { id: parent.id },
        data: {
          plusOnes: {
            set: (parent.plusOnes ?? []).filter((id) => !toRemove.has(id)),
          },
        },
      });

      return deleted;
    });
  }
}
