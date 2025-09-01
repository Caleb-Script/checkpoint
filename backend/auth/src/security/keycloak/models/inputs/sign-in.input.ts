import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class SignInInput {
  @Field(() => String)
  firstName!: string;

  @Field(() => String)
  lastName!: string;

  @Field(() => String, { nullable: true })
  readonly emailData?: string;

  @Field(() => ID)
  readonly invitationId!: string;

  @Field(() => String, { nullable: true })
  readonly phone?: string;
}
