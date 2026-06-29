import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IsString, MaxLength, MinLength } from "class-validator";
import { GroupsService } from "./groups.service";
import { JwtGuard } from "../auth/jwt.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";

class CreateGroupDto {
  @IsString() @MinLength(2) @MaxLength(60) name!: string;
}
class JoinGroupDto {
  @IsString() @MinLength(4) @MaxLength(12) code!: string;
}

@UseGuards(JwtGuard)
@Controller("groups")
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  myGroups(@CurrentUser() u: AuthUser) {
    return this.groups.myGroups(u.sub);
  }

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateGroupDto) {
    return this.groups.create(u.sub, dto.name);
  }

  @Post("join")
  join(@CurrentUser() u: AuthUser, @Body() dto: JoinGroupDto) {
    return this.groups.join(u.sub, dto.code);
  }

  @Get(":id")
  detail(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.groups.detail(u.sub, id);
  }

  @Delete(":id/leave")
  leave(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.groups.leave(u.sub, id);
  }
}
