import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { MeService } from "./me.service";
import { StreakService } from "./streak.service";
import { ActivityService } from "./activity.service";
import { JwtGuard } from "../auth/jwt.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";

class NoteDto {
  @IsString() body!: string;
}

class ActivityDto {
  @IsOptional() @IsInt() @Min(0) @Max(60) minutes?: number;
  @IsOptional() @IsInt() @Min(0) articlesRead?: number;
  @IsOptional() @IsInt() @Min(0) cardsReviewed?: number;
  @IsOptional() @IsInt() @Min(0) quizzesTaken?: number;
}

class GoalDto {
  @IsInt() @Min(1) @Max(600) minutes!: number;
}

class CefrDto {
  @IsString() level!: string;
}

class EmailOptInDto {
  @IsBoolean() optIn!: boolean;
}

class ScrollDto {
  @IsNumber() @Min(0) @Max(1) pct!: number;
}

class HighlightDto {
  @IsString() articleId!: string;
  @IsString() quote!: string;
  @IsOptional() @IsString() prefix?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() color?: string;
}

class HighlightNoteDto {
  @IsString() note!: string;
}

@UseGuards(JwtGuard)
@Controller("me")
export class MeController {
  constructor(
    private readonly me: MeService,
    private readonly streak: StreakService,
    private readonly activity: ActivityService,
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
  bookmarks(@CurrentUser() u: AuthUser, @Query("take") take?: string, @Query("skip") skip?: string) {
    return this.me.bookmarks(u.sub, Number(take) || 20, Number(skip) || 0);
  }

  @Post("progress/:articleId")
  mark(@CurrentUser() u: AuthUser, @Param("articleId") id: string) {
    return this.me.markProgress(u.sub, id);
  }
  @Delete("progress/:articleId")
  unmark(@CurrentUser() u: AuthUser, @Param("articleId") id: string) {
    return this.me.unmarkProgress(u.sub, id);
  }

  @Put("progress/:articleId/scroll")
  saveScroll(@CurrentUser() u: AuthUser, @Param("articleId") id: string, @Body() dto: ScrollDto) {
    return this.me.saveScroll(u.sub, id, dto.pct);
  }
  @Get("progress/:articleId/scroll")
  getScroll(@CurrentUser() u: AuthUser, @Param("articleId") id: string) {
    return this.me.getScroll(u.sub, id);
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

  // ─── Kunlik faollik / maqsad (4,30-vazifa) ──────────────────────────────────
  @Post("activity")
  addActivity(@CurrentUser() u: AuthUser, @Body() dto: ActivityDto) {
    return this.activity.addActivity(u.sub, dto);
  }

  @Get("activity/today")
  todayActivity(@CurrentUser() u: AuthUser) {
    return this.activity.today(u.sub);
  }

  @Put("goal")
  setGoal(@CurrentUser() u: AuthUser, @Body() dto: GoalDto) {
    return this.activity.setGoal(u.sub, dto.minutes);
  }

  @Put("cefr")
  setCefr(@CurrentUser() u: AuthUser, @Body() dto: CefrDto) {
    return this.me.setCefr(u.sub, dto.level);
  }

  /** Haftalik hisobot xatiga obuna (obunani bekor qilish imkoniyati). */
  @Put("email-optin")
  setEmailOptIn(@CurrentUser() u: AuthUser, @Body() dto: EmailOptInDto) {
    return this.me.setEmailOptIn(u.sub, dto.optIn);
  }

  @Get("insights")
  insights(@CurrentUser() u: AuthUser) {
    return this.activity.insights(u.sub);
  }

  @Get("recommendations")
  recommendations(@CurrentUser() u: AuthUser) {
    return this.me.recommendations(u.sub);
  }

  // ─── Highlight + inline izoh (24-vazifa) ────────────────────────────────────
  @Get("highlights")
  allHighlights(@CurrentUser() u: AuthUser) {
    return this.me.allHighlights(u.sub);
  }

  @Get("highlights/:articleId")
  articleHighlights(@CurrentUser() u: AuthUser, @Param("articleId") id: string) {
    return this.me.listHighlights(u.sub, id);
  }

  @Post("highlights")
  createHighlight(@CurrentUser() u: AuthUser, @Body() dto: HighlightDto) {
    return this.me.createHighlight(u.sub, dto);
  }

  @Put("highlights/:id")
  updateHighlight(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() dto: HighlightNoteDto) {
    return this.me.updateHighlight(u.sub, id, dto.note);
  }

  @Delete("highlights/:id")
  deleteHighlight(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.me.deleteHighlight(u.sub, id);
  }
}
