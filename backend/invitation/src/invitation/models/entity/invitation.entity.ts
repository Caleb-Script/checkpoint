// checkpoint/services/invitation/src/graphql/entities/invitation.entity.ts
import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from "@nestjs/graphql";
import { InvitationStatus } from "../enums/invitation-status.enum";
import { RsvpChoice } from "../enums/rsvp-choice.enum";
import { IsBoolean, IsOptional } from "class-validator";

@ObjectType({
  description:
    "Einladung zu einem Event. Minimalvariante ohne Prisma-Relationen (eventId, guestProfileId sind Strings).",
})
export class Invitation {
  @Field(() => ID, { description: "ID der Einladung (cuid)." })
  id!: string;

  @Field(() => String, { nullable: true })
  firstName?: string;
  @Field(() => String, { nullable: true })
  lastName?: string;

  @Field(() => ID, { description: "ID des Events (String, FK im Zielsystem)." })
  eventId!: string;

  @Field(() => ID, {
    nullable: true,
    description: "ID des Gast-Profils (String, FK im Zielsystem).",
  })
  guestProfileId?: string;

  @Field(() => InvitationStatus, {
    description: "Aktueller Status der Einladung.",
  })
  status!: InvitationStatus;

  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;

  @Field(() => RsvpChoice, {
    nullable: true,
    description: "RSVP-Antwort (YES/NO), optional.",
  })
  rsvpChoice?: RsvpChoice;

  @Field(() => GraphQLISODateTime, { nullable: true }) rsvpAt?: Date | null;
  @Field(() => Boolean, {
    nullable: true,
    description:
      "Admin-Approval. Wenn das DB-Schema dieses Feld enthält, wird es hier gespiegelt.",
  })
  approved?: boolean;

  @Field(() => ID, {
    nullable: true,
  })
  approvedById?: string;

  @Field(() => GraphQLISODateTime, { nullable: true }) approvedAt?: Date | null;

  @Field(() => Int, {
    description:
      "Wie viele zusätzliche Gäste darf dieser Gast einladen (Plus-Ones).",
  })
  maxInvitees!: number;

  @Field({
    nullable: true,
    description:
      "Optional: Referenz auf die Einladung, durch die diese Einladung entstanden ist (Invite-Chain).",
  })
  invitedByInvitationId?: string;

  @Field(() => ID, {
    nullable: true,
  })
  invitedById?: string;

  @Field(() => [String], {
    nullable: true,
    description: "Liste der IDs der Plus-Ones, die dieser Gast eingeladen hat.",
  })
  @IsOptional()
  plusOnes?: string[];

  @Field(() => String, {
    nullable: true,
  })
  phone?: string;
}
