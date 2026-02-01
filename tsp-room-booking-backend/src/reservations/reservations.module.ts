import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // 👈 IMPORT HERE
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
