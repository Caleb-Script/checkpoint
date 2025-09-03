// checkpoint/services/invitation/src/graphql/inputs/update-invitation.input.ts
import { Field, InputType } from "@nestjs/graphql";

@InputType({
  description:
    "Update-Input: nur RSVP (Gast) und Approved (Admin). Plus-Ones (maxInvitees) kann Admin anpassen. Alles andere wird automatisch ermittelt.",
})
export class ApproveInput {
  @Field(() => Boolean, {
    nullable: true,
    description:
      "Admin-Approval der Einladung (true/false). Erfordert passende Berechtigung im Resolver/Guard.",
  })
  approved?: boolean;
}
