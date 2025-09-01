import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TokenPayload {
  @Field(() => String)
  accessToken!: string;

  @Field(() => String)
  expiresIn!: number;

  @Field(() => String)
  refreshToken!: string;

  @Field(() => String)
  refreshExpiresIn!: number;

  @Field(() => String)
  idToken!: string;

  @Field(() => String)
  scope!: string;
}
