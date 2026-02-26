import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

    async findAll() {
    return this.prisma.history.findMany({
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        action: true,
        reservationId: true,
        performedBy: true,
        timestamp: true,
        oldValue: true,
        newValue: true,
      },
    });
  }

}
