import { Module } from "@nestjs/common";
import { TelegramService } from "./telegram.service";
import { TelegramController } from "./telegram.controller";
import { PrismaService } from "../prisma.service";
import { AuthModule } from "../auth/auth.module";

/** Telegram orqali telefon raqamini tasdiqlash (SMS o'rniga). */
@Module({
  imports: [AuthModule],
  controllers: [TelegramController],
  providers: [TelegramService, PrismaService],
  exports: [TelegramService],
})
export class TelegramModule {}
