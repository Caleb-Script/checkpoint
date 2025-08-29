import { Field, ID, InputType } from '@nestjs/graphql';
import { PresenceState } from '../../../scan/models/enums/presenceState.enum.js';

@InputType()
export class UpdateTicketInput {
  @Field(() => ID)
  id!: string;

  @Field(() => Boolean, { nullable: true })
  revoked?: boolean;

  @Field(() => String, { nullable: true })
  deviceBoundKey?: string | null;

  @Field(() => PresenceState, { nullable: true })
  currentState?: PresenceState;

  @Field(() => ID, { nullable: true })
  seatId?: string;
}
