import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  // Create a new reservation with 10-min buffer and history
  async create(dto: CreateReservationDto, userId: number) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    // Minimum duration: 30 min
    const duration = (end.getTime() - start.getTime()) / 60000;
    if (duration < 30) {
      throw new BadRequestException('Minimum reservation is 30 minutes');
    }

    // Check for overlapping NORMAL or BUFFER reservations
    const overlap = await this.prisma.reservation.findFirst({
      where: {
        AND: [
          {
            startTime: { lt: end },
            endTime: { gt: start },
          },
        ],
      },
    });

    if (overlap) {
      throw new BadRequestException('Time slot already reserved');
    }

    // Create main reservation
    const reservation = await this.prisma.reservation.create({
      data: {
        startTime: start,
        endTime: end,
        activity: dto.activity,
        hardware: dto.hardware,
        software: dto.software,
        type: 'NORMAL',

        userId,
      },
    });

    // Create 10-min buffer after reservation
    const bufferReservation = await this.prisma.reservation.create({
      data: {
        startTime: end,
        endTime: new Date(end.getTime() + 10 * 60000),
        activity: 'TSP buffer',
        hardware: '-',
        software: '-',
        type: 'BUFFER',

        userId, // can be changed to admin user later
      },
    });

    // Insert into History
    await this.prisma.history.create({
      data: {
        action: 'CREATE_RESERVATION',
        reservationId: reservation.id,
        performedBy: userId,
        oldValue: Prisma.JsonNull,
        newValue: {
          reservation,
          buffer: bufferReservation,
        },
      },
    });

    return reservation;
  }

  // Return all reservations with user info
  async findAll() {
    return this.prisma.reservation.findMany({
      orderBy: { startTime: 'asc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  // Find one reservation by ID
  async findOne(id: number) {
    const res = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!res) {
      throw new BadRequestException('Reservation not found');
    }

    return res;
  }

  // Delete reservation (only owner or admin)
  async remove(id: number, userId: number, isAdmin: boolean) {
    const res = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!res) {
      throw new BadRequestException('Reservation not found');
    }

    if (!isAdmin && res.userId !== userId) {
      throw new BadRequestException('You cannot delete this reservation');
    }

    await this.prisma.reservation.delete({
      where: { id },
    });

    await this.prisma.history.create({
      data: {
        action: 'DELETE_RESERVATION',
        reservationId: id,
        performedBy: userId,
        oldValue: res,
        newValue: Prisma.JsonNull,
      },
    });

    return { message: 'Reservation deleted' };
  }
}
