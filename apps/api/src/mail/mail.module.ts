import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { WeeklyCronService } from './weekly-cron.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [MailService, WeeklyCronService, PrismaService],
  exports: [MailService],
})
export class MailModule {}
