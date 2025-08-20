// checkpoint/services/invitation/src/graphql/enums/rsvp-choice.enum.ts
import { registerEnumType } from "@nestjs/graphql";

export enum RsvpChoice {
  YES = "YES",
  NO = "NO",
}

registerEnumType(RsvpChoice, {
  name: "RsvpChoice",
  description: "Antwort (RSVP) eines Gasts: YES oder NO.",
});
