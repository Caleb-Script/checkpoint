/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { IsString } from 'class-validator';
import { PresenceState } from '../enums/presenceState.enum.js';

@ObjectType()
export class Ticket {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  @IsString()
  eventId!: string;

  @Field(() => ID)
  @IsString()
  invitationId!: string;

  @Field(() => ID)
  @IsString()
  seatId?: string;

  @Field(() => PresenceState)
  currentState?: PresenceState;

  @Field(() => String, { nullable: true })
  deviceBoundKey?: string | null;

  @Field(() => Boolean)
  revoked!: boolean;
}
