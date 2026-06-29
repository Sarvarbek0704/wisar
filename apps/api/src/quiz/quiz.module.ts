import { Module } from "@nestjs/common";
import { QuizController } from "./quiz.controller";
import { QuizService } from "./quiz.service";
import { PrismaService } from "../prisma.service";
import { AuthModule } from "../auth/auth.module";
import { ReviewModule } from "../review/review.module";

@Module({
  imports: [AuthModule, ReviewModule],
  controllers: [QuizController],
  providers: [QuizService, PrismaService],
})
export class QuizModule {}
