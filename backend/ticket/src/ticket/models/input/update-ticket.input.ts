import { Field, ID, InputType } from "@nestjs/graphql";

@InputType()
export class UpdateTicketInput {
  @Field(() => ID)
  id!: string;

  // 👉 Beispiel-Feld — an dein Prisma-Modell anpassen:
  @Field({ nullable: true })
  name?: string;
}
