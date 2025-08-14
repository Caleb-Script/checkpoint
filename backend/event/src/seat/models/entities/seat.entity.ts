import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Seat {
  @Field(() => ID)
  id!: string;

  @Field()
  eventId!: string;

  @Field(() => String, { nullable: true })
  section?: string | null;

  @Field(() => String, { nullable: true })
  table?: string | null;

  @Field(() => String, { nullable: true })
  number?: string | null;

  @Field(() => String, { nullable: true })
  note?: string | null;
}
