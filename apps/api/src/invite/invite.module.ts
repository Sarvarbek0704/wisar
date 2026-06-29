import { Module } from "@nestjs/common";
import { InviteController } from "./invite.controller";
import { AdminService } from "../admin/admin.service";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [InviteController],
  providers: [AdminService, PrismaService],
})
export class InviteModule {}
