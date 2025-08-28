import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class RegisterFailPayload {
  @Field(() => ID)
  ticketId!: string;

  @Field(() => String)
  reason!: string;
}
