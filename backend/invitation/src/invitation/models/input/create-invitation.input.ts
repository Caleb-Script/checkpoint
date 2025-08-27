// checkpoint/services/invitation/src/graphql/inputs/create-invitation.input.ts
import { Field, ID, InputType, Int } from "@nestjs/graphql";

@InputType({
  description:
    "Create-Input für Einladungen: nur Event-Bezug, Plus-Ones und ggf. Invite-Chain. Gastprofil wird erst bei Ticketausgabe erzeugt.",
})
export class InvitationCreateInput {
  @Field(() => ID, { description: "Event-ID (String)." })
  eventId!: string;

  @Field(() => Int, {
    defaultValue: 0,
    description: "Maximale Anzahl Plus-Ones (>= 0).",
  })
  maxInvitees: number = 0;

  @Field(() => ID, {
    nullable: true,
    description:
      "Optional: Eltern-Einladung (Invite-Chain), falls diese Einladung von einer anderen abgeleitet wurde.",
  })
  invitedByInvitationId?: string;

  @Field(() => String, { nullable: true })
  firstName?: string;

  @Field(() => String, { nullable: true })
  lastName?: string;
}
