import { Module } from "@nestjs/common";
import { FeedbackController } from "./feedback.controller";
import { FeedbackService } from "./feedback.service";
import { PrismaService } from "../prisma.service";
import { AuthModule } from "../auth/auth.module";
import { NotificationModule } from "../notifications/notification.module";

@Module({
  imports: [AuthModule, NotificationModule],
  controllers: [FeedbackController],
  providers: [FeedbackService, PrismaService],
})
export class FeedbackModule {}
