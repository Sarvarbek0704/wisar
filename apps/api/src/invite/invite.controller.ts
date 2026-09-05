import { Controller, Get, Param } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AdminService } from "../admin/admin.service";

@Controller("invites")
export class InviteController {
  constructor(private readonly admin: AdminService) {}

  /** Ochiq endpoint — kodlarni tanlab ko'rishga qarshi qat'iy cheklov. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get(":code")
  checkInvite(@Param("code") code: string) {
    return this.admin.checkInvite(code);
  }
}
