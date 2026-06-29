import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { IsIn, IsInt, IsString, Max, Min } from "class-validator";
import { ReviewService, type ReviewKind } from "./review.service";
import { JwtGuard } from "../auth/jwt.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";

class GradeDto {
  @IsIn(["card", "question"]) kind!: ReviewKind;
  @IsString() refId!: string;
  @IsInt() @Min(0) @Max(5) quality!: number;
}

@UseGuards(JwtGuard)
@Controller("review")
export class ReviewController {
  constructor(private readonly review: ReviewService) {}

  @Get("due-count")
  dueCount(@CurrentUser() u: AuthUser) {
    return this.review.dueCount(u.sub);
  }

  @Get("queue")
  queue(@CurrentUser() u: AuthUser) {
    return this.review.queue(u.sub);
  }

  @Post("grade")
  grade(@CurrentUser() u: AuthUser, @Body() dto: GradeDto) {
    return this.review.grade(u.sub, dto.kind, dto.refId, dto.quality);
  }
}
