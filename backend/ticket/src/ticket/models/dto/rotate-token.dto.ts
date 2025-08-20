import { IsOptional, IsString, IsNumber } from 'class-validator';

export class RotateTokenDto {
  @IsString()
  ticketId!: string;

  @IsOptional()
  @IsNumber()
  ttlSeconds?: number;

  @IsOptional()
  @IsString()
  deviceHash?: string; // zur Device-Bindung
}
