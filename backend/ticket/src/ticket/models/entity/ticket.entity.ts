import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType("Ticket")
export class Ticket {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, { nullable: true })
  @IsString()
  eventId: String!

  @Field(() => ID, { nullable: true })
  @IsString()
  invitationId: String!

  @Field(() => ID, { nullable: true })
  @IsString()
  seatId: string
}
