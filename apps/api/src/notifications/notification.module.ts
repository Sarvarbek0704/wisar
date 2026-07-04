import { Module } from "@nestjs/common";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { ReviewReminderCron } from "./review-reminder.cron";
import { PrismaService } from "../prisma.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [NotificationController],
  providers: [NotificationService, ReviewReminderCron, PrismaService],
  exports: [NotificationService], // boshqa modullar bildirishnoma yaratishi uchun
})
export class NotificationModule {}
