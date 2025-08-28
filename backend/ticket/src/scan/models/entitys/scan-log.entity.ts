import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { PresenceState } from '../enums/presenceState.enum.js';

@ObjectType()
export class ScanLog {
  @Field(() => ID) id!: string;
  @Field(() => ID) ticketId!: string;
  @Field(() => ID) eventId!: string;
  @Field(() => ID, { nullable: true }) byUserId?: string;
  @Field(() => PresenceState) direction!: PresenceState;
  @Field() verdict!: string;
  @Field({ nullable: true }) gate?: string;
  @Field({ nullable: true }) deviceHash?: string;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
}
