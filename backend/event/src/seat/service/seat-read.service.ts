import { PrismaService } from '../../prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SeatReadService {
  constructor(private readonly prisma: PrismaService) {}
}
