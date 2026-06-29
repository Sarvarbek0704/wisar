import { Body, Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsString, MinLength } from "class-validator";
import { TutorService } from "./tutor.service";

class AskTutorDto {
  @IsString()
  articleId!: string;

  @IsString()
  @MinLength(2)
  question!: string;
}

@Controller("tutor")
export class TutorController {
  constructor(private readonly tutor: TutorService) {}

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post("ask")
  ask(@Body() dto: AskTutorDto) {
    return this.tutor.askTutor(dto.articleId, dto.question);
  }
}
