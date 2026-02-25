import { Module } from '@nestjs/common';
import { SysconfigService } from './sysconfig.service';
import { SysconfigController } from './sysconfig.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SysconfigController],
  providers: [SysconfigService],
})
export class SysconfigModule {}
