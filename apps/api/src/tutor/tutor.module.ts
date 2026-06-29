import { Module } from "@nestjs/common";
import { TutorController } from "./tutor.controller";
import { TutorService } from "./tutor.service";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [TutorController],
  providers: [TutorService, PrismaService],
})
export class TutorModule {}
