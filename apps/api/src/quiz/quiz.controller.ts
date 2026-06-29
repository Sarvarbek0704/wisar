import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { IsArray, IsInt, IsString } from "class-validator";
import { QuizService } from "./quiz.service";
import { JwtGuard, AdminGuard, OptionalJwtGuard } from "../auth/jwt.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";

class SubmitDto {
  @IsArray()
  @IsInt({ each: true })
  answers!: number[];
}

class GenerateDto {
  @IsString() articleId!: string;
}

@Controller("quizzes")
export class QuizController {
  constructor(private readonly svc: QuizService) {}

  @Get()
  list(@Query("section") section: string) {
    return this.svc.listBySection(section);
  }

  // Maqola uchun AI test yaratish (admin) — 8-vazifa
  @UseGuards(JwtGuard, AdminGuard)
  @Post("generate")
  generate(@Body() dto: GenerateDto) {
    return this.svc.generateForArticle(dto.articleId);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.svc.forTaking(id);
  }

  // Login bo'lsa xato savollar review navbatiga qo'shiladi (ixtiyoriy auth)
  @UseGuards(OptionalJwtGuard)
  @Post(":id/submit")
  submit(@Param("id") id: string, @Body() dto: SubmitDto, @CurrentUser() u?: AuthUser) {
    return this.svc.submit(id, dto.answers, u?.sub);
  }
}
