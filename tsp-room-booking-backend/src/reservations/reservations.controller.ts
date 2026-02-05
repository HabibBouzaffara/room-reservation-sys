import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Delete,
  Param,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, User } from '@prisma/client';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Request as ExpressRequest } from 'express';

// Extend Express request to include user
interface RequestWithUser extends ExpressRequest {
  user: User;
}

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateReservationDto, @Request() req: RequestWithUser) {
    // ✅ req.user is fully typed
    return this.reservationsService.create(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin-action')
  adminAction() {
    return { message: 'Only admin can do this' };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.reservationsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.reservationsService.remove(+id, req.user.id, req.user.role);
  }
}
