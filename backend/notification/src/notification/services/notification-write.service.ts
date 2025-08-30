/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-unused-private-class-members */
import { LoggerPlus } from '../../logger/logger-plus';
import { LoggerService } from '../../logger/logger.service';
import { KafkaProducerService } from '../../messaging/kafka-producer.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TemplateReadService } from '../../template/services/template-read.service';
import { TraceContextProvider } from '../../trace/trace-context.provider';
import { NotificationInput } from '../models/inputs/notify.input';
import { NotificationRenderer } from '../utils/notification.renderer';
import { pubsub } from '../utils/pubsub';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { trace, Tracer } from '@opentelemetry/api';
import { DeliveryStatus } from '@prisma/client/edge';

type CreateOptions = {
  dedupeKey?: string | null; // bei Retries / Exactly-once Semantik
  publish?: boolean; // default: true
  mergeOnDuplicate?: boolean; // optionaler Modus, s. Kommentar unten
};

@Injectable()
export class NotificationWriteService {
  readonly #prismaService: PrismaService;
  readonly #kafkaProducerService: KafkaProducerService;
  readonly #loggerService: LoggerService;
  readonly #logger: LoggerPlus;
  readonly #tracer: Tracer;
  readonly #traceContextProvider: TraceContextProvider;
  readonly #renderer: NotificationRenderer;
  readonly #templateReadService: TemplateReadService;

  constructor(
    prismaService: PrismaService,
    kafkaProducerService: KafkaProducerService,
    loggerService: LoggerService,
    traceContextProvider: TraceContextProvider,
    renderer: NotificationRenderer,
    templateReadServie: TemplateReadService,
  ) {
    this.#loggerService = loggerService;
    this.#logger = this.#loggerService.getLogger(NotificationWriteService.name);
    this.#kafkaProducerService = kafkaProducerService;
    this.#tracer = trace.getTracer(NotificationWriteService.name);
    this.#traceContextProvider = traceContextProvider;
    this.#renderer = renderer;
    this.#prismaService = prismaService;
    this.#templateReadService = templateReadServie;
  }

  async create(input: NotificationInput, opts: CreateOptions = {}) {
    void this.#logger.debug('notifyFromTemplate: input=%o', input);

    const template = await this.#templateReadService.findById(input.templateId);

    void this.#logger.debug('notifyFromTemplate: template=%o', template);

    const vars = input.variables ?? {};
    this.#renderer.validate(
      (template.variables as unknown as string[]) ?? [],
      vars,
    );
    const rendered = this.#renderer.render(
      { title: template.title, body: template.body },
      vars,
    );

    const tenant = input.recipientTenant ?? undefined;

    const expiresAt = input.ttlSeconds
      ? new Date(Date.now() + input.ttlSeconds * 1000)
      : null;

    const data = {
      recipientUsername: input.recipientUsername,
      recipientId: input.recipientId ?? null,
      recipientTenant: tenant,
      templateId: template.id,
      variables: vars as any,
      renderedTitle: rendered.title,
      renderedBody: rendered.body,
      data: {} as any,
      linkUrl: input.linkUrl ?? undefined,
      priority: input.priority ?? 'NORMAL',
      category: input.category ?? template.category,
      status: 'NEW',
      read: false,
      deliveredAt: undefined,
      readAt: undefined,
      expiresAt,
      sensitive: input.sensitive ?? false,
      createdBy: 'notification-service',
      dedupeKey: opts?.dedupeKey ?? undefined,
    };

    // === Idempotentes Create ===
    try {
      const notification = await (
        this.#prismaService as any
      ).notification.create({ data });

      // Markiere als SENT/DELIVERED wenn dein Transport (WebSocket/GraphQL Sub) zugestellt hat.
      // Hier simulativ direkt SENT:
      await (this.#prismaService as any).notification.update({
        where: { id: notification.id },
        data: { status: 'SENT', deliveredAt: new Date() },
      });

      // optional Publish
      if (opts.publish !== false) {
        await pubsub.publish('notificationAdded', {
          recipientUsername: notification.recipientUsername,
          notificationAdded: notification,
        });
      }
      return notification;
    } catch (e: any) {
      // Prisma Unique Constraint
      if (e?.code === 'P2002' && e?.meta?.target?.includes('dedupeKey')) {
        // Duplikat → existierendes Objekt holen
        const existing = await this.#prismaService.notification.findUnique({
          where: { dedupeKey: opts.dedupeKey! },
        });
        if (existing) return existing;

        // sehr selten: Race condition → nochmal versuchen
        const retry = await this.#prismaService.notification.findFirst({
          where: {
            recipientUsername: input.recipientUsername,
            templateId: input.templateId,
            recipientTenant: tenant,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });
        if (retry) return retry;
      }
    }
  }

  async markRead(id: string) {
    const existing = await (this.#prismaService as any).notification.findUnique(
      {
        where: { id },
      },
    );
    if (!existing) throw new NotFoundException('Notification not found');

    if (existing.status === 'ARCHIVED')
      throw new BadRequestException('Archived notification cannot be read');

    return (this.#prismaService as any).notification.update({
      where: { id },
      data: { read: true, readAt: new Date(), status: DeliveryStatus.READ },
    });
  }

  async archive(id: string) {
    const existing = await (this.#prismaService as any).notification.findUnique(
      {
        where: { id },
      },
    );
    if (!existing) throw new NotFoundException('Notification not found');

    return (this.#prismaService as any).notification.update({
      where: { id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });
  }

  // Housekeeping: TTL -> archivieren/löschen
  async cleanupExpired(maxBatch = 500) {
    const now = new Date();
    const expired = await (this.#prismaService as any).notification.findMany({
      where: { expiresAt: { lte: now }, status: { not: 'ARCHIVED' } },
      take: maxBatch,
    });
    for (const n of expired) {
      await this.archive(n.id);
    }
    return expired.length;
  }
}
