// checkpoint/services/invitation/src/graphql/inputs/create-invitation.input.ts
import { Field, InputType, Int } from "@nestjs/graphql";

@InputType({
  description:
    "Create-Input für Einladungen: nur Event-Bezug, Plus-Ones und ggf. Invite-Chain. Gastprofil wird erst bei Ticketausgabe erzeugt.",
})
export class InvitationCreateInput {
  @Field(() => String, { description: "Event-ID (String)." })
  eventId!: string;

  @Field(() => Int, {
    defaultValue: 0,
    description: "Maximale Anzahl Plus-Ones (>= 0).",
  })
  maxInvitees: number = 0;

  @Field(() => String, {
    nullable: true,
    description:
      "Optional: Eltern-Einladung (Invite-Chain), falls diese Einladung von einer anderen abgeleitet wurde.",
  })
  invitedByInvitationId?: string;
}
