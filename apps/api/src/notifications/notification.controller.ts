import { Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { JwtGuard } from "../auth/jwt.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";

@UseGuards(JwtGuard)
@Controller("notifications")
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  /** Ro'yxat: ?unread=1 faqat o'qilmaganlar, ?take/?skip sahifalash. */
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query("unread") unread?: string,
    @Query("take") take?: string,
    @Query("skip") skip?: string,
  ) {
    return this.notifications.list(user.sub, {
      unreadOnly: unread === "1" || unread === "true",
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  /** O'qilmagan bildirishnomalar soni (bell badge uchun). */
  @Get("unread-count")
  async unreadCount(@CurrentUser() user: AuthUser) {
    return { count: await this.notifications.unreadCount(user.sub) };
  }

  @Patch(":id/read")
  async markRead(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.notifications.markRead(id, user.sub);
    return { ok: true };
  }

  @Patch("read-all")
  async markAllRead(@CurrentUser() user: AuthUser) {
    await this.notifications.markAllRead(user.sub);
    return { ok: true };
  }
}
