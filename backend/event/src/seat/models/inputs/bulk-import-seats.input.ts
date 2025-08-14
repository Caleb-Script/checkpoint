import { CreateSeatInput } from './create-seat.input.js';
import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class BulkImportSeatsInput {
  @Field(() => ID)
  eventId!: string;

  @Field(() => [CreateSeatInput])
  seats!: CreateSeatInput[];
}
