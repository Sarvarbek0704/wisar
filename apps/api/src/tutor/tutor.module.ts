import { Module } from "@nestjs/common";
import { TutorController } from "./tutor.controller";
import { TutorService } from "./tutor.service";
import { PrismaService } from "../prisma.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [TutorController],
  providers: [TutorService, PrismaService],
})
export class TutorModule {}
