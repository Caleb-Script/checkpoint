import { Field, ID, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType()
export class CreateTicketInput {
  @Field(() => ID)
  @IsString()
  eventId!: string;

  @Field(() => ID)
  @IsString()
  invitationId!: string;

  @Field(() => ID, { nullable: true })
  @IsString()
  seatId?: string;

  @Field(() => ID)
  @IsString()
  guestProfileId!: string;
}
