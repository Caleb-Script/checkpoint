/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Field, InputType, Int, GraphQLISODateTime } from '@nestjs/graphql';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';

@InputType()
export class CreateEventInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Field(() => GraphQLISODateTime)
  @IsDateString()
  startsAt!: string;

  @Field(() => GraphQLISODateTime)
  @IsDateString()
  endsAt!: string;

  @Field({ defaultValue: true })
  @IsBoolean()
  allowReEntry?: boolean = true;

  @Field(() => Int, { defaultValue: 300 })
  @IsInt()
  @Min(10)
  maxSeats?: number = 300;

  @Field(() => Int, { defaultValue: 300 })
  @IsInt()
  @Min(10)
  rotateSeconds?: number = 300;
}
