// checkpoint/services/invitation/src/graphql/inputs/create-invitation.input.ts
import { Field, ID, InputType, Int } from "@nestjs/graphql";
import { RsvpChoice } from "../enums/rsvp-choice.enum";

@InputType({
  description: "",
})
export class AcceptRSVPInput {
  @Field(() => String, { description: "Vornme" })
  firstName!: string;

  @Field(() => String, { description: "Nachname" })
  lastName!: string;

  @Field(() => String, { description: "Email addresse", nullable: true })
  email?: string;

  @Field(() => String, { description: "Telefonnummer", nullable: true })
  phone?: string;
}

@InputType({
  description: "",
})
export class RSVPReply {
  @Field(() => RsvpChoice)
  reply!: RsvpChoice;

  @Field(() => AcceptRSVPInput, { nullable: true })
  input?: AcceptRSVPInput;
}
