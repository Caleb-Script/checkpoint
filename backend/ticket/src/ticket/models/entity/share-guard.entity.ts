import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class ShareGuard {
    @Field(() => ID) id!: string;
    @Field() ticketId!: string;
    @Field() failCount!: number;
    @Field(() => Date, { nullable: true }) lastFailAt?: Date | null;
    @Field(() => Date, { nullable: true }) blockedUntil?: Date | null;
    @Field({ nullable: true }) reason?: string | null;
}
