/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ShareGuard {
  @Field(() => ID) id!: string;
  @Field() ticketId!: string;
  @Field() failCount!: number;
  @Field(() => GraphQLISODateTime, { nullable: true }) lastFailAt?: Date;
  @Field(() => GraphQLISODateTime, { nullable: true })
  blockedUntil?: Date;
  @Field({ nullable: true }) reason?: string;
}
