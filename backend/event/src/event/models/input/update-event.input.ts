/* eslint-disable @typescript-eslint/no-unsafe-call */
import { CreateEventInput } from './create-event.input.js';
import { Field, ID, InputType, Int, PartialType } from '@nestjs/graphql';
import {
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';

@InputType()
export class UpdateEventInput extends PartialType(CreateEventInput) {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  allowReEntry?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(10)
  maxSeats?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(10)
  rotateSeconds?: number;
}
