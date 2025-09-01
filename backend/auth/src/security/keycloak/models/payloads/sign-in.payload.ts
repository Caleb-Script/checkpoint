import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SignInPayload {
  @Field(() => ID)
  userId!: string;

  @Field(() => String)
  username!: string;

  @Field(() => String)
  password!: string;
}
