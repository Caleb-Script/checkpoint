/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/array-type */
import { LoggerPlus } from '../../logger/logger-plus.js';
import { LoggerService } from '../../logger/logger.service.js';
import { KafkaProducerService } from '../../messaging/kafka-producer.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TraceContextProvider } from '../../trace/trace-context.provider.js';
import { handleSpanError } from '../utils/error.util.js';
import { Injectable } from '@nestjs/common';
import { context as otelContext, trace, Tracer } from '@opentelemetry/api';

export type ReserveSeatArgs = {
  id?: string; // spezifischer Seat (optional)
  guestId: string;
  eventId: string; // optionaler Filter: nur Seats dieses Events
};

@Injectable()
export class SeatWriteService {
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
    this.#logger = this.#loggerService.getLogger(SeatWriteService.name);
    this.#kafkaProducerService = kafkaProducerService;
    this.#tracer = trace.getTracer(SeatWriteService.name);
    this.#traceContextProvider = traceContextProvider;
  }

  listByEvent(eventId: string) {
    return this.#prismaService.seat.findMany({
      where: { eventId },
      orderBy: [{ section: 'asc' }, { table: 'asc' }, { number: 'asc' }],
    });
  }

  create(input: {
    eventId: string;
    section?: string | null;
    table?: string | null;
    number?: string | null;
    note?: string | null;
  }) {
    return this.#prismaService.seat.create({ data: input });
  }

  async bulkImport(
    eventId: string,
    seats: Array<{
      section?: string | null;
      table?: string | null;
      number?: string | null;
      note?: string | null;
    }>,
  ) {
    if (!seats?.length) return [];
    const data = seats.map((s) => ({ eventId, ...s }));
    await this.#prismaService.seat.createMany({ data, skipDuplicates: true });
    return this.listByEvent(eventId);
  }

  /**
   * Reserviert einen Seat, indem note=<guestId> gesetzt wird.
   * - Ohne id: wählt zufällig einen freien Seat (note IS NULL) für eventId.
   * - Mit id: reserviert genau diesen Seat, aber nur falls noch frei.
   * Gleichverteilung: count + zufälliges skip.
   * Race-Condition-Schutz: updateMany + Retry.
   */
  async reserveSeat({ id, guestId, eventId }: ReserveSeatArgs) {
    return await this.#tracer.startActiveSpan('seat.reserve', async (span) => {
      try {
        return await otelContext.with(
          trace.setSpan(otelContext.active(), span),
          async () => {
            void this.#logger.debug('input=%o', { id, guestId, eventId });

            // --- Expliziter Seat ---
            if (id) {
              const { count } = await this.#prismaService.seat.updateMany({
                where: { id, eventId, note: null }, // nur wenn noch frei UND zum Event gehört
                data: { note: guestId },
              });
              if (count !== 1) {
                throw new Error(
                  'Seat ist bereits vergeben oder gehört nicht zu diesem Event.',
                );
              }
              return this.#prismaService.seat.findUnique({ where: { id } });
            }

            // --- Zufälligen freien Seat finden & reservieren ---
            const baseWhere = {
              eventId,
              note: null, // frei == NULL
            } as const;

            // Anzahl freier Seats
            let freeCount = await this.#prismaService.seat.count({
              where: baseWhere,
            });
            if (freeCount === 0) {
              throw new Error('Keine freien Plätze verfügbar.');
            }

            const MAX_RETRIES = 5;
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
              // Gleichverteiltes Los via zufälligem Offset
              const randomOffset = Math.floor(Math.random() * freeCount);

              const candidate = await this.#prismaService.seat.findFirst({
                where: baseWhere,
                orderBy: { id: 'asc' },
                skip: randomOffset,
                take: 1,
                select: { id: true },
              });

              if (!candidate) {
                // Bestand hat sich geändert → Count neu lesen und weiter
                freeCount = await this.#prismaService.seat.count({
                  where: baseWhere,
                });
                if (freeCount === 0 || attempt === MAX_RETRIES) {
                  throw new Error('Keine freien Plätze mehr verfügbar.');
                }
                continue;
              }

              // Bedingtes Update: nur reservieren, wenn noch frei
              const { count } = await this.#prismaService.seat.updateMany({
                where: { id: candidate.id, note: null },
                data: { note: guestId },
              });

              if (count === 1) {
                const trace = this.#traceContextProvider.getContext();

                // ✅ Kafka NACH Erfolg (fire-and-forget)
                void this.#kafkaProducerService.addSeatID(
                  {
                    guestProfileId: guestId,
                    eventId: eventId,
                    seatId: candidate.id,
                  },
                  'seat.write-service',
                  trace, // oder `span`
                );

                return this.#prismaService.seat.findUnique({
                  where: { id: candidate.id },
                });
              }

              // Jemand war schneller → Retry (optional: freeCount neu bestimmen)
              freeCount = await this.#prismaService.seat.count({
                where: baseWhere,
              });
              if (freeCount === 0 || attempt === MAX_RETRIES) {
                throw new Error(
                  'Reservierung fehlgeschlagen (Parallelzugriff). Bitte erneut versuchen.',
                );
              }
            }

            throw new Error('Unerwarteter Fehler bei der Reservierung.');
          },
        );
      } catch (error) {
        handleSpanError(span, error, this.#logger, 'addItem');
      } finally {
        span.end();
      }
    });
  }
}
