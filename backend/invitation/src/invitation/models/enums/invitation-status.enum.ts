// checkpoint/services/invitation/src/graphql/enums/invitation-status.enum.ts
import { registerEnumType } from "@nestjs/graphql";

export enum InvitationStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  CANCELED = "CANCELED",
}

registerEnumType(InvitationStatus, {
  name: "InvitationStatus",
  description:
    "Status einer Einladung: PENDING (neu), ACCEPTED (zugesagt), DECLINED (abgelehnt), CANCELED (storniert).",
});
