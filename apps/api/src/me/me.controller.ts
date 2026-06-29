import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { IsString } from "class-validator";
import { MeService } from "./me.service";
import { StreakService } from "./streak.service";
import { JwtGuard } from "../auth/jwt.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";

class NoteDto {
  @IsString() body!: string;
}

@UseGuards(JwtGuard)
@Controller("me")
export class MeController {
  constructor(
    private readonly me: MeService,
    private readonly streak: StreakService,
  ) {}

  @Get("state")
  state(@CurrentUser() u: AuthUser) {
    return this.me.state(u.sub);
  }

  @Get("dashboard")
  dashboard(@CurrentUser() u: AuthUser) {
    return this.me.dashboard(u.sub);
  }

  @Get("bookmarks")
  bookmarks(@CurrentUser() u: AuthUser) {
    return this.me.bookmarks(u.sub);
  }

  @Post("progress/:articleId")
  mark(@CurrentUser() u: AuthUser, @Param("articleId") id: string) {
    return this.me.markProgress(u.sub, id);
  }
  @Delete("progress/:articleId")
  unmark(@CurrentUser() u: AuthUser, @Param("articleId") id: string) {
    return this.me.unmarkProgress(u.sub, id);
  }

  @Post("bookmark/:articleId")
  addBookmark(@CurrentUser() u: AuthUser, @Param("articleId") id: string) {
    return this.me.addBookmark(u.sub, id);
  }
  @Delete("bookmark/:articleId")
  removeBookmark(@CurrentUser() u: AuthUser, @Param("articleId") id: string) {
    return this.me.removeBookmark(u.sub, id);
  }

  @Get("notes/:articleId")
  getNote(@CurrentUser() u: AuthUser, @Param("articleId") id: string) {
    return this.me.getNote(u.sub, id);
  }
  @Put("notes/:articleId")
  saveNote(
    @CurrentUser() u: AuthUser,
    @Param("articleId") id: string,
    @Body() dto: NoteDto,
  ) {
    return this.me.saveNote(u.sub, id, dto.body);
  }
  @Delete("notes/:articleId")
  deleteNote(@CurrentUser() u: AuthUser, @Param("articleId") id: string) {
    return this.me.deleteNote(u.sub, id);
  }

  @Post("streak/checkin")
  checkin(@CurrentUser() u: AuthUser) {
    return this.streak.checkin(u.sub);
  }

  @Get("streak")
  getStreak(@CurrentUser() u: AuthUser) {
    return this.streak.getStreak(u.sub);
  }
}
