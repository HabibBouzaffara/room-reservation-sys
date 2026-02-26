import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  private validateWorkingHours(start: Date, end: Date) {
    const startDay = start.getDay();
    const endDay = end.getDay();
    if (startDay === 0 || startDay === 6 || endDay === 0 || endDay === 6) {
      throw new BadRequestException('Reservations are only allowed on working days (Mon-Fri)');
    }

    const startHour = start.getHours();
    const endHour = end.getHours();
    const endMins = end.getMinutes();

    if (startHour < 8 || startHour > 18 || (startHour === 18 && start.getMinutes() > 0)) {
      throw new BadRequestException('Reservations are only allowed between 8 AM and 6 PM');
    }
    if (endHour < 8 || endHour > 18 || (endHour === 18 && endMins > 0)) {
       throw new BadRequestException('Reservations are only allowed between 8 AM and 6 PM');
    }
    // Also if it spans across the boundary, though max duration per UI usually isn't that large.
  }

  // Create a new reservation with 10-min buffer and history
  async create(dto: CreateReservationDto, userId: number) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    this.validateWorkingHours(start, end);

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

  async update(id: number, dto: Partial<CreateReservationDto>, userId: number, isAdmin: boolean) {
    const res = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!res) {
      throw new BadRequestException('Reservation not found');
    }

    if (!isAdmin && res.userId !== userId) {
      throw new BadRequestException('You cannot modify this reservation');
    }

    const buffer = await this.prisma.reservation.findFirst({
      where: {
        startTime: res.endTime,
        type: 'BUFFER',
      },
    });

    const newStart = dto.startTime ? new Date(dto.startTime) : res.startTime;
    const newEnd = dto.endTime ? new Date(dto.endTime) : res.endTime;

    this.validateWorkingHours(newStart, newEnd);

    if (dto.startTime || dto.endTime) {
      const duration = (newEnd.getTime() - newStart.getTime()) / 60000;
      if (duration < 30) {
        throw new BadRequestException('Minimum reservation is 30 minutes');
      }

      const excludeIds = [res.id];
      if (buffer) excludeIds.push(buffer.id);

      const overlap = await this.prisma.reservation.findFirst({
        where: {
          id: { notIn: excludeIds },
          startTime: { lt: newEnd },
          endTime: { gt: newStart },
        },
      });

      if (overlap) {
        throw new BadRequestException('Time slot already reserved');
      }
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        startTime: newStart,
        endTime: newEnd,
        activity: dto.activity ?? res.activity,
        hardware: dto.hardware ?? res.hardware,
        software: dto.software ?? res.software,
      },
    });

    let updatedBuffer: any = null;
    if (buffer && (dto.startTime || dto.endTime)) {
      updatedBuffer = await this.prisma.reservation.update({
        where: { id: buffer.id },
        data: {
          startTime: newEnd,
          endTime: new Date(newEnd.getTime() + 10 * 60000),
        },
      });
    }

    await this.prisma.history.create({
      data: {
        action: 'UPDATE_RESERVATION',
        reservationId: id,
        performedBy: userId,
        oldValue: res as unknown as Prisma.InputJsonValue,
        newValue: {
          reservation: updated,
          buffer: updatedBuffer ?? buffer,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return updated;
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
        oldValue: res as unknown as Prisma.InputJsonValue,
        newValue: Prisma.JsonNull,
      },
    });

    return { message: 'Reservation deleted' };
  }
}
