import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { FeedbackService } from "./feedback.service";
import { JwtGuard, AdminGuard, OptionalJwtGuard } from "../auth/jwt.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";

class SubmitFeedbackDto {
  @IsString() @MaxLength(20) category!: string;
  @IsString() @MinLength(2) @MaxLength(4000) message!: string;
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(200) email?: string;
  @IsOptional() @IsString() @MaxLength(300) page?: string;
}

@Controller("feedback")
export class FeedbackController {
  constructor(private readonly svc: FeedbackService) {}

  /** Fikr yuborish — kirgan yoki mehmon (token ixtiyoriy). */
  @UseGuards(OptionalJwtGuard)
  @Post()
  submit(@CurrentUser() u: AuthUser | undefined, @Body() dto: SubmitFeedbackDto) {
    return this.svc.submit({
      userId: u?.sub ?? null,
      name: u?.name ?? dto.name ?? null,
      email: u?.email ?? dto.email ?? null,
      category: dto.category,
      message: dto.message,
      page: dto.page ?? null,
    });
  }

  // ─── Admin ───────────────────────────────────────────────────────────────
  @UseGuards(JwtGuard, AdminGuard)
  @Get("admin")
  adminList(
    @Query("filter") filter?: string,
    @Query("take") take?: string,
    @Query("skip") skip?: string,
  ) {
    return this.svc.adminList(
      filter === "unread" ? "unread" : "all",
      Number(take) || 30,
      Number(skip) || 0,
    );
  }

  @UseGuards(JwtGuard, AdminGuard)
  @Get("admin/unread-count")
  async unread() {
    return { count: await this.svc.unreadCount() };
  }

  @UseGuards(JwtGuard, AdminGuard)
  @Patch("admin/:id/read")
  markRead(@Param("id") id: string, @Body() body: { read?: boolean }) {
    return this.svc.markRead(id, body?.read !== false);
  }

  @UseGuards(JwtGuard, AdminGuard)
  @Delete("admin/:id")
  remove(@Param("id") id: string) {
    return this.svc.remove(id);
  }
}
