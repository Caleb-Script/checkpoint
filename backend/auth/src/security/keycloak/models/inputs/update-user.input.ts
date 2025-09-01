import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateUserInput {
  @Field(() => String, { nullable: true })
  firstName?: string;

  @Field(() => String, { nullable: true })
  lastName?: string;

  @Field(() => String, { nullable: true })
  email?: string;

  // Passwort separat hier mit drin – wird über reset-password gesetzt
  @Field(() => String, { nullable: true })
  password?: string;
}

@InputType()
export class UpdateUserPasswordInput {
  @Field(() => ID, { nullable: true })
  id!: string;

  @Field(() => String, { nullable: true })
  newPassword!: string;
}
