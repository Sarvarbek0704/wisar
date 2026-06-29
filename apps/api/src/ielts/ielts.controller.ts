import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { IeltsService, type Skill } from "./ielts.service";
import { OptionalJwtGuard, JwtGuard } from "../auth/jwt.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";

class ScoreWritingDto {
  @IsIn([1, 2])
  task!: 1 | 2;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  prompt?: string;

  @IsString()
  @MaxLength(8000)
  essay!: string;
}

class ScoreSpeakingDto {
  @IsIn([1, 2, 3])
  part!: 1 | 2 | 3;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  question?: string;

  @IsString()
  @MaxLength(8000)
  transcript!: string;
}

class GenPromptDto {
  @IsIn([1, 2, 3])
  part!: 1 | 2 | 3;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  topic?: string;
}

class GenWritingPromptDto {
  @IsIn([1, 2])
  task!: 1 | 2;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  topic?: string;
}

class GenTestDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  topic?: string;
}

class AttemptDto {
  @IsIn(["reading", "listening", "writing", "speaking"]) skill!: Skill;
  @IsOptional() @IsString() part?: string;
  @IsNumber() @Min(0) @Max(9) band!: number;
  @IsOptional() detail?: unknown;
}

@UseGuards(OptionalJwtGuard)
@Controller("ielts")
export class IeltsController {
  constructor(private readonly svc: IeltsService) {}

  @Post("score-writing")
  scoreWriting(@Body() dto: ScoreWritingDto, @CurrentUser() u?: AuthUser) {
    return this.svc.scoreWriting(dto.task, dto.prompt ?? "", dto.essay, u?.sub);
  }

  @Post("score-speaking")
  scoreSpeaking(@Body() dto: ScoreSpeakingDto, @CurrentUser() u?: AuthUser) {
    return this.svc.scoreSpeaking(dto.part, dto.question ?? "", dto.transcript, u?.sub);
  }

  /** Audio → transcript (20-vazifa) */
  @Post("transcribe")
  @UseInterceptors(FileInterceptor("audio"))
  transcribe(@UploadedFile() file: { buffer: Buffer; mimetype?: string; originalname?: string }) {
    return this.svc.transcribe(file);
  }

  /** Reading/Listening natijasini saqlash (20,30-vazifa) — login kerak */
  @UseGuards(JwtGuard)
  @Post("attempt")
  recordAttempt(@CurrentUser() u: AuthUser, @Body() dto: AttemptDto) {
    return this.svc.saveAttempt(u.sub, dto.skill, dto.band, dto.detail ?? {}, dto.part);
  }

  /** Foydalanuvchi urinishlari (analitika uchun) — login kerak */
  @UseGuards(JwtGuard)
  @Get("attempts")
  attempts(@CurrentUser() u: AuthUser) {
    return this.svc.attempts(u.sub);
  }

  @Post("writing-prompt")
  writingPrompt(@Body() dto: GenWritingPromptDto) {
    return this.svc.generateWritingPrompt(dto.task, dto.topic);
  }

  @Post("speaking-prompt")
  speakingPrompt(@Body() dto: GenPromptDto) {
    return this.svc.generateSpeakingPrompt(dto.part, dto.topic);
  }

  @Post("reading-test")
  readingTest(@Body() dto: GenTestDto) {
    return this.svc.generateReading(dto.topic);
  }

  @Post("listening-test")
  listeningTest(@Body() dto: GenTestDto) {
    return this.svc.generateListening(dto.topic);
  }
}
