/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Field, ID, InputType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateSeatInput {
  @Field(() => ID)
  eventId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  section?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  table?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  number?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;
}
