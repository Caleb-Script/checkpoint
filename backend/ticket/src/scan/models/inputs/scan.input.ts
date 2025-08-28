import { InputType, Field, ID } from '@nestjs/graphql';
import { PresenceState } from '../enums/presenceState.enum.js';

@InputType()
export class ScanInput {
  @Field(() => ID)
  ticketId!: string;

  /**
   * Optional: erzwinge Richtung (falls kein Toggle)
   * Ohne Angabe entscheidet der Service (z. B. Toggle aus aktuellem State).
   */
  @Field(() => PresenceState)
  direction!: PresenceState;

  @Field(() => String, { nullable: true })
  gate?: string;

  @Field(() => String, { nullable: true })
  deviceHash?: string;

  @Field(() => ID, { nullable: true })
  byUserId?: string;
}
