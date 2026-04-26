import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

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

  /** Return history for a single reservation.
   *  - ADMIN: always allowed
   *  - Regular user: only if the reservation belongs to them */
  async findByReservation(reservationId: number, requestingUserId: number, role: Role) {
    // Check ownership if not admin
    if (role !== Role.ADMIN) {
      const reservation = await this.prisma.reservation.findFirst({
        where: { id: reservationId },
        select: { userId: true },
      });
      if (!reservation || reservation.userId !== requestingUserId) {
        throw new ForbiddenException('You can only view history of your own reservations');
      }
    }

    return this.prisma.history.findMany({
      where: { reservationId },
      orderBy: { timestamp: 'asc' },
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
