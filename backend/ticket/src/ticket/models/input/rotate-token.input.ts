import { InputType, Field, Int, ID } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

@InputType()
export class RotateTicketInput {
  @Field(() => ID)
  @IsString()
  ticketId!: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(10)
  ttlSeconds?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  deviceHash?: string;
}
