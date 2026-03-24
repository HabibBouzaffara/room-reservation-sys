import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SysconfigService {
  constructor(private prisma: PrismaService) {}

  async getHardware(room?: string) {
    const where = room ? { room } : {};
    return this.prisma.hardware.findMany({ where, orderBy: { name: 'asc' } });
  }

  async addHardware(name: string, room: string = 'IPB') {
    if (!name) throw new BadRequestException('Name is required');
    return this.prisma.hardware.create({ data: { name, room } });
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
