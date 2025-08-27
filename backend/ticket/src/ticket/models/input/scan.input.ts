/* eslint-disable @typescript-eslint/no-unsafe-return */
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
  @Field(() => PresenceState, { nullable: true })
  direction?: PresenceState | null;

  @Field(() => String, { nullable: true })
  gate?: string | null;

  @Field(() => String, { nullable: true })
  deviceHash?: string | null;

  @Field(() => ID, { nullable: true })
  byUserId?: string;
}
