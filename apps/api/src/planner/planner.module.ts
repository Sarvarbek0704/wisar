import { Module } from "@nestjs/common";
import { PlannerController } from "./planner.controller";
import { PlannerService } from "./planner.service";
import { PrismaService } from "../prisma.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [PlannerController],
  providers: [PlannerService, PrismaService],
})
export class PlannerModule {}
