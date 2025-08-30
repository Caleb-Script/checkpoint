/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-unused-private-class-members */
import { LoggerPlus } from '../../logger/logger-plus';
import { LoggerService } from '../../logger/logger.service';
import { KafkaConsumerService } from '../../messaging/kafka-consumer.service';
import { KafkaProducerService } from '../../messaging/kafka-producer.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TraceContextProvider } from '../../trace/trace-context.provider';
import { NotifyFromTemplateInput } from '../models/inputs/notify.input';
import { NotificationRenderer } from '../utils/notification.renderer';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { context as otelContext, trace, Tracer } from '@opentelemetry/api';
import { DeliveryStatus } from '@prisma/client/edge';

@Injectable()
export class NotificationWriteService {
  readonly #prismaService: PrismaService;
  readonly #kafkaConsumerService: KafkaConsumerService;
  readonly #kafkaProducerService: KafkaProducerService;
  readonly #loggerService: LoggerService;
  readonly #logger: LoggerPlus;
  readonly #tracer: Tracer;
  readonly #traceContextProvider: TraceContextProvider;
  readonly #renderer: NotificationRenderer;

  constructor(
    prismaService: PrismaService,
    kafkaConsumerService: KafkaConsumerService,
    kafkaProducerService: KafkaProducerService,
    loggerService: LoggerService,
    traceContextProvider: TraceContextProvider,
    renderer: NotificationRenderer,
  ) {
    this.#kafkaConsumerService = kafkaConsumerService;
    this.#loggerService = loggerService;
    this.#logger = this.#loggerService.getLogger(NotificationWriteService.name);
    this.#kafkaProducerService = kafkaProducerService;
    this.#tracer = trace.getTracer(NotificationWriteService.name);
    this.#traceContextProvider = traceContextProvider;
    this.#renderer = renderer;
    this.#prismaService = prismaService;
  }

  // async onModuleInit(): Promise<void> {
  //     await this.#kafkaConsumerService.consume({
  //         topics: getKafkaTopicsBy(["user"]),
  //     });
  // }

  // ---------- Notifications ----------
  async notifyFromTemplate(input: NotifyFromTemplateInput) {
    this.#logger.debug('notifyFromTemplate: input=%o', input);

    const tpl = await (this.#prismaService as any).template.findUnique({
      where: { key: input.templateKey },
    });

    this.#logger.debug('notifyFromTemplate: template=%o', tpl);
    if (!tpl || !tpl.isActive)
      throw new NotFoundException('Template not found or inactive');

    const vars = input.variables ?? {};
    this.#renderer.validate((tpl.variables as unknown as string[]) ?? [], vars);
    const rendered = this.#renderer.render(
      { title: tpl.title, body: tpl.body },
      vars,
    );

    const expiresAt = input.ttlSeconds
      ? new Date(Date.now() + input.ttlSeconds * 1000)
      : null;

    const notification = await (this.#prismaService as any).notification.create(
      {
        data: {
          recipientUsername: input.recipientUsername,
          recipientId: input.recipientId ?? null,
          recipientTenant: input.recipientTenant ?? null,
          templateId: tpl.id,
          variables: vars as any,
          renderedTitle: rendered.title,
          renderedBody: rendered.body,
          data: {} as any,
          linkUrl: input.linkUrl ?? null,
          priority: input.priority ?? 'NORMAL',
          category: input.category ?? tpl.category,
          status: 'NEW',
          read: false,
          deliveredAt: null,
          readAt: null,
          expiresAt,
          sensitive: input.sensitive ?? false,
          createdBy: 'notification-service',
        },
      },
    );

    // Markiere als SENT/DELIVERED wenn dein Transport (WebSocket/GraphQL Sub) zugestellt hat.
    // Hier simulativ direkt SENT:
    await (this.#prismaService as any).notification.update({
      where: { id: notification.id },
      data: { status: 'SENT', deliveredAt: new Date() },
    });

    return notification;
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
