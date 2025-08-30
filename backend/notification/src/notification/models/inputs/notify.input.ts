import { Priority } from '../enums/priority.enum';
import { Field, InputType, Int } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class NotifyFromTemplateInput {
  @Field() templateKey!: string;
  @Field() recipientUsername!: string;
  @Field({ nullable: true }) recipientId?: string;
  @Field({ nullable: true }) recipientTenant?: string;
  @Field(() => GraphQLJSON) variables!: Record<string, unknown>;
  @Field(() => Priority, { defaultValue: 'NORMAL' }) priority?: Priority;
  @Field({ nullable: true }) category?: string;
  @Field({ nullable: true }) linkUrl?: string;
  @Field({ defaultValue: false }) sensitive?: boolean;
  @Field(() => Int, { nullable: true }) ttlSeconds?: number;
}
