import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('Token')
export class TokenPayload {
  @Field(() => String) token!: string;
  @Field(() => Int) exp!: number;
  @Field(() => String) jti!: string;
}
