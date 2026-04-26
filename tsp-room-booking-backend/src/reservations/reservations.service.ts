import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async validateWorkingHours(start: Date, end: Date) {
    const startDay = start.getDay();
    const endDay = end.getDay();
    if (startDay === 0 || startDay === 6 || endDay === 0 || endDay === 6) {
      throw new BadRequestException('Reservations are only allowed on working days (Mon-Fri)');
    }

    let rules: any[] = [];
    const rulesConfig = await this.prisma.sysConfig.findUnique({ where: { key: 'WORK_HOUR_RULES' } });
    if (rulesConfig && rulesConfig.value) {
      try { rules = JSON.parse(rulesConfig.value); } catch(e) {}
    }

    let dayStart = 8;
    let dayEnd = 18;

    for (const rule of rules) {
        const rStart = new Date(rule.startDate);
        rStart.setHours(0,0,0,0);
        const rEnd = new Date(rule.endDate);
        rEnd.setHours(23,59,59,999);
        
        if (start.getTime() >= rStart.getTime() && start.getTime() <= rEnd.getTime()) {
            dayStart = rule.startHour;
            dayEnd = rule.endHour;
            break;
        }
    }

    const startHour = start.getHours();
    const endHour = end.getHours();
    const endMins = end.getMinutes();

    if (startHour < dayStart || startHour > dayEnd || (startHour === dayEnd && start.getMinutes() > 0)) {
      throw new BadRequestException(`Reservations are only allowed between ${dayStart}:00 and ${dayEnd}:00`);
    }
    if (endHour < dayStart || endHour > dayEnd || (endHour === dayEnd && endMins > 0)) {
       throw new BadRequestException(`Reservations are only allowed between ${dayStart}:00 and ${dayEnd}:00`);
    }
  }

  // Create a new reservation with 10-min buffer and history
  async create(dto: CreateReservationDto, userId: number) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    await this.validateWorkingHours(start, end);

    // Minimum duration: 30 min
    const duration = (end.getTime() - start.getTime()) / 60000;
    if (duration < 30) {
      throw new BadRequestException('Minimum reservation is 30 minutes');
    }

    // Check for overlapping NORMAL or BUFFER reservations in the same room
    if (!dto.isHardwareOnly) {
      const effectiveEnd = new Date(end.getTime() + 10 * 60000); // include buffer
      const overlap = await this.prisma.reservation.findFirst({
        where: {
          AND: [
            { room: dto.room },
            { isHardwareOnly: false },
            {
              startTime: { lt: effectiveEnd },
              endTime: { gt: start },
            },
          ],
        },
      });

      if (overlap) {
        throw new BadRequestException(`Room ${dto.room} is already reserved for this time slot (including 10m buffer)`);
      }
    }

    if (dto.hardware && dto.hardware !== '-' && dto.hardware !== '') {
      const hwObj = await this.prisma.hardware.findFirst({
        where: { name: dto.hardware, room: dto.room }
      });
      if (hwObj) {
        const overlappingHwCount = await this.prisma.reservation.count({
          where: {
            hardware: dto.hardware,
            room: dto.room,
            startTime: { lt: end },
            endTime: { gt: start }
          }
        });
        if (overlappingHwCount >= hwObj.quantity) {
          throw new BadRequestException(`Hardware ${dto.hardware} is out of stock for this time slot`);
        }
      }
    }

    // Create main reservation
    const reservation = await this.prisma.reservation.create({
      data: {
        startTime: start,
        endTime: end,
        activity: dto.activity,
        hardware: dto.hardware,
        software: dto.software,
        room: dto.room,
        isHardwareOnly: dto.isHardwareOnly || false,
        type: 'NORMAL',

        userId,
      },
    });

    let bufferReservation: any = null;
    if (!dto.isHardwareOnly) {
      // Create 10-min buffer after reservation
      bufferReservation = await this.prisma.reservation.create({
        data: {
          startTime: end,
          endTime: new Date(end.getTime() + 10 * 60000),
          activity: 'TSP buffer',
          hardware: '-',
          software: '-',
          room: dto.room,
          isHardwareOnly: false,
          type: 'BUFFER',
          userId,
        },
      });
    }

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

  // Return all reservations with user info, optionally filtered by room
  async findAll(room?: string) {
    const where = room ? { room } : {};
    return this.prisma.reservation.findMany({
      where,
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
        room: res.room,
        type: 'BUFFER',
      },
    });

    const newStart = dto.startTime ? new Date(dto.startTime) : res.startTime;
    const newEnd = dto.endTime ? new Date(dto.endTime) : res.endTime;

    await this.validateWorkingHours(newStart, newEnd);

    if (dto.startTime || dto.endTime) {
      const duration = (newEnd.getTime() - newStart.getTime()) / 60000;
      if (duration < 30) {
        throw new BadRequestException('Minimum reservation is 30 minutes');
      }

      const excludeIds = [res.id];
      if (buffer) excludeIds.push(buffer.id);

      if (!res.isHardwareOnly) {
        const effectiveEnd = new Date(newEnd.getTime() + 10 * 60000); // include buffer
        const overlap = await this.prisma.reservation.findFirst({
          where: {
            room: res.room,
            isHardwareOnly: false,
            id: { notIn: excludeIds },
            startTime: { lt: effectiveEnd },
            endTime: { gt: newStart },
          },
        });

        if (overlap) {
          throw new BadRequestException(`Room ${res.room} is already reserved for this time slot (including 10m buffer)`);
        }
      }
    }

    const newHw = dto.hardware ?? res.hardware;
    const newRoom = dto.room ?? res.room;
    if (newHw && newHw !== '-' && newHw !== '') {
      const hwObj = await this.prisma.hardware.findFirst({
        where: { name: newHw, room: newRoom }
      });
      if (hwObj) {
        const excludeIds = [res.id];
        if (buffer) excludeIds.push(buffer.id);

        const overlappingHwCount = await this.prisma.reservation.count({
          where: {
            hardware: newHw,
            room: newRoom,
            id: { notIn: excludeIds },
            startTime: { lt: newEnd },
            endTime: { gt: newStart }
          }
        });
        if (overlappingHwCount >= hwObj.quantity) {
          throw new BadRequestException(`Hardware ${newHw} is out of stock for this time slot`);
        }
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
        room: dto.room ?? res.room,
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

    const buffer = await this.prisma.reservation.findFirst({
      where: {
        startTime: res.endTime,
        room: res.room,
        type: 'BUFFER',
      },
    });

    await this.prisma.reservation.delete({
      where: { id },
    });

    if (buffer) {
      await this.prisma.reservation.delete({
        where: { id: buffer.id },
      });
    }

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
