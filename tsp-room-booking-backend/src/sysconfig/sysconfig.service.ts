import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SysconfigService {
  constructor(private prisma: PrismaService) {}

  async getHardware() {
    return this.prisma.hardware.findMany({ orderBy: { name: 'asc' } });
  }

  async addHardware(name: string) {
    if (!name) throw new BadRequestException('Name is required');
    return this.prisma.hardware.create({ data: { name } });
  }

  async deleteHardware(id: number) {
    return this.prisma.hardware.delete({ where: { id } });
  }

  async getSoftware() {
    return this.prisma.software.findMany({ orderBy: { name: 'asc' } });
  }

  async addSoftware(name: string) {
    if (!name) throw new BadRequestException('Name is required');
    return this.prisma.software.create({ data: { name } });
  }

  async deleteSoftware(id: number) {
    return this.prisma.software.delete({ where: { id } });
  }
}
