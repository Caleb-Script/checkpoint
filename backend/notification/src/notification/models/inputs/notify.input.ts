import { Category } from '../enums/category.enum';
import { Priority } from '../enums/priority.enum';
import { Field, ID, InputType, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class NotificationInput {
  @Field(() => ID) templateId!: string;
  @Field() recipientUsername!: string;
  @Field({ nullable: true }) recipientId?: string;
  @Field({ nullable: true }) recipientTenant?: string;
  @Field(() => GraphQLJSON) variables!: Record<string, unknown>;
  @Field(() => Priority, { defaultValue: 'NORMAL' }) priority?: Priority;
  @Field(() => Category, { defaultValue: 'INFO', nullable: true })
  category?: Category;
  @Field({ nullable: true }) linkUrl?: string;
  @Field({ defaultValue: false }) sensitive?: boolean;
  @Field(() => Int, { nullable: true }) ttlSeconds?: number;
}
