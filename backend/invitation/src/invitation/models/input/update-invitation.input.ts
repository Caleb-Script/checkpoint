// checkpoint/services/invitation/src/graphql/inputs/update-invitation.input.ts
import { Field, InputType, Int } from "@nestjs/graphql";
import { RsvpChoice } from "../enums/rsvp-choice.enum";

@InputType({
  description:
    "Update-Input: nur RSVP (Gast) und Approved (Admin). Plus-Ones (maxInvitees) kann Admin anpassen. Alles andere wird automatisch ermittelt.",
})
export class InvitationUpdateInput {
  @Field(() => RsvpChoice, {
    nullable: true,
    description: "RSVP des Gasts (YES/NO).",
  })
  rsvpChoice?: RsvpChoice;

  @Field(() => Boolean, {
    nullable: true,
    description:
      "Admin-Approval der Einladung (true/false). Erfordert passende Berechtigung im Resolver/Guard.",
  })
  approved?: boolean;

  @Field(() => Int, {
    nullable: true,
    description:
      "Plus-Ones Limit. Änderung typischerweise nur durch Admin erlaubt.",
  })
  maxInvitees?: number;

  @Field(() => String, {
    nullable: true,
    description:
      "Optional: ID der Einladung, die diese Einladung referenziert (Invite-Chain).",
  })
  invitedByInvitationId?: string;

  @Field(() => String, {
    nullable: true,
    description: "Optional: ID des Gast-Profils (String, FK im Zielsystem).",
  })
  guestProfileId?: string;
}
