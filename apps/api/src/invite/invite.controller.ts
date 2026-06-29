import { Controller, Get, Param } from "@nestjs/common";
import { AdminService } from "../admin/admin.service";

@Controller("invites")
export class InviteController {
  constructor(private readonly admin: AdminService) {}

  @Get(":code")
  checkInvite(@Param("code") code: string) {
    return this.admin.checkInvite(code);
  }
}
