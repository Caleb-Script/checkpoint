/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Template } from '../../../template/models/entitys/template.entity';
import { DeliveryStatus } from '../enums/deliveryStatus.enum';
import { Priority } from '../enums/priority.enum';
import { Field, ID, ObjectType, GraphQLISODateTime } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class Notification {
  @Field(() => ID) id!: string;

  @Field() recipientUsername!: string;
  @Field({ nullable: true }) recipientId?: string;
  @Field({ nullable: true }) recipientTenant?: string;

  @Field({ nullable: true }) templateId?: string;
  @Field(() => Template, { nullable: true }) template?: Template;

  @Field(() => GraphQLJSON) variables!: Record<string, unknown>;
  @Field() renderedTitle!: string;
  @Field() renderedBody!: string;
  @Field(() => GraphQLJSON) data!: Record<string, unknown>;
  @Field({ nullable: true }) linkUrl?: string;

  @Field(() => Priority) priority!: Priority;
  @Field({ nullable: true }) category?: string;
  @Field(() => DeliveryStatus) status!: DeliveryStatus;
  @Field() read!: boolean;

  @Field(() => GraphQLISODateTime, { nullable: true })
  deliveredAt?: Date;
  @Field(() => GraphQLISODateTime, { nullable: true }) readAt?: Date;
  @Field(() => GraphQLISODateTime, { nullable: true }) archivedAt?: Date;
  @Field(() => GraphQLISODateTime, { nullable: true }) expiresAt?: Date;
  @Field() sensitive!: boolean;

  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
  @Field({ nullable: true }) createdBy?: string;
}

@ObjectType()
export class NotificationConnection {
  @Field(() => [Notification]) items!: Notification[];
  @Field({ nullable: true }) nextCursor?: string;
}
