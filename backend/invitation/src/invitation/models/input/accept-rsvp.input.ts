// checkpoint/services/invitation/src/graphql/inputs/create-invitation.input.ts
import { Field, ID, InputType, Int } from "@nestjs/graphql";

@InputType({
  description: "",
})
export class AcceptRSVPInput {
  @Field(() => String, { description: "Vornme" })
  firstName!: string;

  @Field(() => String, { description: "Nachname" })
  lastName!: string;

  @Field(() => String, { description: "Email addresse", nullable: true, })
  email?: string;
}
