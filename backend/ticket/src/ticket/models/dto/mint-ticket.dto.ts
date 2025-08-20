import { IsString } from 'class-validator';

export class MintTicketDto {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsString()
  invitationId!: string;

  // Optional: fixe Seat-Zuweisung, falls noch nicht gesetzt
  seatId?: string;
}
