import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { IsArray, IsInt } from "class-validator";
import { QuizService } from "./quiz.service";

class SubmitDto {
  @IsArray()
  @IsInt({ each: true })
  answers!: number[];
}

@Controller("quizzes")
export class QuizController {
  constructor(private readonly svc: QuizService) {}

  @Get()
  list(@Query("section") section: string) {
    return this.svc.listBySection(section);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.svc.forTaking(id);
  }

  @Post(":id/submit")
  submit(@Param("id") id: string, @Body() dto: SubmitDto) {
    return this.svc.submit(id, dto.answers);
  }
}
