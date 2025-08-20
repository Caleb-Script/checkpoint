import { IsArray, IsEmail, IsOptional, IsString } from 'class-validator';

export class SendTicketDto {
    @IsString()
    ticketId!: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    whatsapp?: string; // E.164

    @IsOptional()
    @IsArray()
    channels?: Array<'email' | 'whatsapp'>;
}
