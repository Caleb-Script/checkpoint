import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Event {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => GraphQLISODateTime)
  startsAt!: Date;

  @Field(() => GraphQLISODateTime)
  endsAt!: Date;

  @Field(() => String)
  allowReEntry!: boolean;

  @Field(() => Number)
  maxSeats!: number;

  @Field(() => Number)
  rotateSeconds!: number;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
