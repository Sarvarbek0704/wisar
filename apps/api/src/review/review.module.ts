import { Module } from "@nestjs/common";
import { ReviewController } from "./review.controller";
import { ReviewService } from "./review.service";
import { PrismaService } from "../prisma.service";
import { AuthModule } from "../auth/auth.module";
import { FlashcardsModule } from "../flashcards/flashcards.module";

@Module({
  imports: [AuthModule, FlashcardsModule],
  controllers: [ReviewController],
  providers: [ReviewService, PrismaService],
  exports: [ReviewService],
})
export class ReviewModule {}
