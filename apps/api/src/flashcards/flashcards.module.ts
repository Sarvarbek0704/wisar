import { Module } from "@nestjs/common";
import { FlashcardsController } from "./flashcards.controller";
import { FlashcardsService } from "./flashcards.service";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [FlashcardsController],
  providers: [FlashcardsService, PrismaService],
  exports: [FlashcardsService],
})
export class FlashcardsModule {}
