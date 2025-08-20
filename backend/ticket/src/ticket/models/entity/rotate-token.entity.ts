import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RotatedToken {
  @Field()
  token!: string;

  @Field(() => Int)
  ttlSeconds!: number;
}
