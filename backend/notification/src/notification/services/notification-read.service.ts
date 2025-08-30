/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable no-unused-private-class-members */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { LoggerPlus } from '../../logger/logger-plus';
import { LoggerService } from '../../logger/logger.service';
import { KafkaConsumerService } from '../../messaging/kafka-consumer.service';
import { KafkaProducerService } from '../../messaging/kafka-producer.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TraceContextProvider } from '../../trace/trace-context.provider';
import { Notification } from '../models/entitys/notification.entity';
import { ListNotificationsInput } from '../models/inputs/inputs';
import { NotificationRenderer } from '../utils/notification.renderer';
import { Injectable, NotFoundException } from '@nestjs/common';
import { trace, Tracer } from '@opentelemetry/api';

@Injectable()
export class NotificationReadService {
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
    this.#prismaService = prismaService;
    this.#kafkaConsumerService = kafkaConsumerService;
    this.#loggerService = loggerService;
    this.#logger = this.#loggerService.getLogger(NotificationReadService.name);
    this.#kafkaProducerService = kafkaProducerService;
    this.#tracer = trace.getTracer(NotificationReadService.name);
    this.#traceContextProvider = traceContextProvider;
    this.#renderer = renderer;
  }

  // async onModuleInit(): Promise<void> {
  //     await this.#kafkaConsumerService.consume({
  //         topics: getKafkaTopicsBy(["user"]),
  //     });
  // }

  async findById(id: string) {
    void this.#logger.debug('findById: id=%s', id);

    const notification = await this.#prismaService.notification.findUnique({
      where: { id },
    });

    if (!notification) throw new NotFoundException('Notification not found');
    return notification as Notification;
  }

  async findByUser(userId: string) {
    void this.#logger.debug('findById: userId=%s', userId);

    const where = {
      recipientId: userId,
    };

    const findManyArgs: any = {
      where,
      orderBy: { createdAt: 'desc' },
    };

    const notifications =
      await this.#prismaService.notification.findMany(findManyArgs);

    if (!notifications.length) {
      throw new NotFoundException('Notifications not found');
    }

    return notifications as Notification[];
  }

  async find(input: ListNotificationsInput) {
    const take = Math.min(input.limit ?? 20, 100);
    const where = {
      recipientUsername: input.recipientUsername,
      ...(input.includeRead ? {} : { read: false }),
      ...(input.category ? { category: input.category } : {}),
    };

    const findManyArgs: any = {
      where,
      orderBy: { createdAt: 'desc' },
      take,
    };
    if (input.cursor) {
      findManyArgs.cursor = { id: input.cursor };
      findManyArgs.skip = 1;
    }
    const items = await this.#prismaService.notification.findMany(findManyArgs);

    const nextCursor =
      items.length === take ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }
}
