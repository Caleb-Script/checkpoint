/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class ListNotificationsInput {
  @Field() recipientUsername!: string; // Tipp: sonst i.d.R. aus Auth ableiten
  @Field({ defaultValue: false }) includeRead?: boolean;
  @Field(() => Int, { defaultValue: 20 }) limit?: number;
  @Field({ nullable: true }) cursor?: string; // createdAt ISO string oder ID
  @Field({ nullable: true }) category?: string;
}

@InputType()
export class MarkReadInput {
  @Field(() => ID) id!: string;
}
