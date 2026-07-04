import { Module } from "@nestjs/common";
import { ForumController } from "./forum.controller";
import { ForumService } from "./forum.service";
import { PrismaService } from "../prisma.service";
import { AuthModule } from "../auth/auth.module";
import { NotificationModule } from "../notifications/notification.module";

@Module({
  imports: [AuthModule, NotificationModule],
  controllers: [ForumController],
  providers: [ForumService, PrismaService],
})
export class ForumModule {}
