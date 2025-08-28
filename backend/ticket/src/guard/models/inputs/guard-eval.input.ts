import { Field, GraphQLISODateTime, ID, InputType } from '@nestjs/graphql';
import { PresenceState } from '../../../scan/models/enums/presenceState.enum.js';

@InputType()
export class GuardEvalInput {
  @Field(() => ID)
  ticketId!: string;

  @Field(() => PresenceState)
  currentState!: PresenceState;

  @Field(() => String, { nullable: true })
  incomingDeviceHash?: string;

  @Field(() => String)
  gate?: string;

  @Field(() => GraphQLISODateTime) now!: Date;
}
