import { Controller, Get, Post, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { SysconfigService } from './sysconfig.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('sysconfig')
export class SysconfigController {
  constructor(private readonly sysconfigService: SysconfigService) {}

  @UseGuards(JwtAuthGuard)
  @Get('hardware')
  getHardware(@Query('room') room?: string) {
    return this.sysconfigService.getHardware(room);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('hardware')
  addHardware(@Body('name') name: string, @Body('room') room?: string) {
    return this.sysconfigService.addHardware(name, room);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('hardware/:id')
  deleteHardware(@Param('id') id: string) {
    return this.sysconfigService.deleteHardware(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('software')
  getSoftware(@Query('room') room?: string) {
    return this.sysconfigService.getSoftware(room);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('software')
  addSoftware(@Body('name') name: string, @Body('room') room?: string) {
    return this.sysconfigService.addSoftware(name, room);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('software/:id')
  deleteSoftware(@Param('id') id: string) {
    return this.sysconfigService.deleteSoftware(+id);
  }
}
