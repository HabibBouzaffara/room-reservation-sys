import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ReservationsModule } from './reservations/reservations.module';
import { AuthModule } from './auth/auth.module';
import { HistoryModule } from './history/history.module';
import { SysconfigModule } from './sysconfig/sysconfig.module';

@Module({
  imports: [PrismaModule, UsersModule, ReservationsModule, AuthModule, HistoryModule, SysconfigModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
