import { IsString } from 'class-validator';

export class MintTicketDto {
  @IsString()
  invitationId!: string;

  // Optional: fixe Seat-Zuweisung, falls noch nicht gesetzt
  seatId?: string;
}
