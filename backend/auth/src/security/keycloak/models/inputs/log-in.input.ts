import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class LogInInput {
  @Field(() => String)
  username!: string;

  @Field(() => String)
  password!: string;
}
