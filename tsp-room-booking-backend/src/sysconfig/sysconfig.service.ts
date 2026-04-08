import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SysconfigService {
  constructor(private prisma: PrismaService) {}

  async getHardware(room?: string, start?: string, end?: string) {
    const where = room ? { room } : {};
    const hws = await this.prisma.hardware.findMany({ where, orderBy: { name: 'asc' } });
    
    if (start && end) {
      const startTime = new Date(start);
      const endTime = new Date(end);
      
      const resCountMap = new Map<string, number>();
      const overlaps = await this.prisma.reservation.findMany({
        where: {
          room: room,
          hardware: { not: '-' },
          startTime: { lt: endTime },
          endTime: { gt: startTime }
        }
      });
      overlaps.forEach(r => {
        resCountMap.set(r.hardware, (resCountMap.get(r.hardware) || 0) + 1);
      });
      
      return hws.map(hw => ({
        ...hw,
        available: Math.max(0, hw.quantity - (resCountMap.get(hw.name) || 0))
      }));
    }
    
    return hws.map(hw => ({...hw, available: hw.quantity}));
  }

  async addHardware(name: string, room: string = 'IPB', quantity: number = 1) {
    if (!name) throw new BadRequestException('Name is required');
    return this.prisma.hardware.create({ data: { name, room, quantity } });
  }

  async deleteHardware(id: number) {
    return this.prisma.hardware.delete({ where: { id } });
  }

  async getSoftware(room?: string) {
    const where = room ? { room } : {};
    return this.prisma.software.findMany({ where, orderBy: { name: 'asc' } });
  }

  async addSoftware(name: string, room: string = 'IPB') {
    if (!name) throw new BadRequestException('Name is required');
    return this.prisma.software.create({ data: { name, room } });
  }

  async deleteSoftware(id: number) {
    return this.prisma.software.delete({ where: { id } });
  }
}
