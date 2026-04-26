import { Controller, Get, Param, UseGuards, Request, Query } from '@nestjs/common';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, User } from '@prisma/client';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: User;
}

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  /** Admin-only: get all history */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    return this.historyService.findAll(p, l);
  }

  /** Any authenticated user: get history for a specific reservation
   *  Non-admins will get a 403 if the reservation doesn't belong to them */
  @UseGuards(JwtAuthGuard)
  @Get('reservation/:id')
  findByReservation(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.historyService.findByReservation(+id, req.user.id, req.user.role);
  }
}
