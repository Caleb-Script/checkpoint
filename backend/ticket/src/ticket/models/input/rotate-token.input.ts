import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

@InputType()
export class RotateTicketInput {
  @Field()
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
