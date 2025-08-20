import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class CreateTicketInput {
  // 👉 Beispiel-Feld — an dein Prisma-Modell anpassen:
  @Field({ nullable: true })
  name?: string;
}
