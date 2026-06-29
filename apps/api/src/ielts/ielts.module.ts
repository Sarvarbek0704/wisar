import { Module } from "@nestjs/common";
import { IeltsController } from "./ielts.controller";
import { IeltsService } from "./ielts.service";
import { PrismaService } from "../prisma.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [IeltsController],
  providers: [IeltsService, PrismaService],
})
export class IeltsModule {}
