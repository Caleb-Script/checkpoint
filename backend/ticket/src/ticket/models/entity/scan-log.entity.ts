import { Field, ID, ObjectType } from "@nestjs/graphql";
import { PresenceState } from "./enums/presence-state.enum";

@ObjectType()
export class ScanLog {
    @Field(() => ID) id!: string;
    @Field(() => ID) ticketId!: string;
    @Field(() => ID) eventId!: string;
    @Field(() => ID, { nullable: true }) byUserId?: string | null;
    @Field(() => PresenceState) direction!: PresenceState;
    @Field() verdict!: string;
    @Field({ nullable: true }) gate?: string | null;
    @Field({ nullable: true }) deviceHash?: string | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
}
