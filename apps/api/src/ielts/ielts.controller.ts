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
import { Throttle } from "@nestjs/throttler";
import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { IeltsService, type Skill } from "./ielts.service";
import { OptionalJwtGuard, JwtGuard } from "../auth/jwt.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";

/**
 * IELTS endpointlari mehmonlar uchun ham ochiq (mahsulot qarori) — lekin har biri
 * LLM'ga real pul turadi. Shuning uchun global 100/daq yetarli emas: har bir
 * qimmat amalga alohida, qat'iy cheklov qo'yamiz.
 */
const SCORE_LIMIT = { default: { limit: 5, ttl: 60_000 } };
const GENERATE_LIMIT = { default: { limit: 5, ttl: 60_000 } };
const TRANSCRIBE_LIMIT = { default: { limit: 3, ttl: 60_000 } };
/** Audio uchun maksimal hajm — 10 MB (~10 daqiqa nutq). Cheklovsiz yuklash xotirani tugatadi. */
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

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

  @Throttle(SCORE_LIMIT)
  @Post("score-writing")
  scoreWriting(@Body() dto: ScoreWritingDto, @CurrentUser() u?: AuthUser) {
    return this.svc.scoreWriting(dto.task, dto.prompt ?? "", dto.essay, u?.sub);
  }

  @Throttle(SCORE_LIMIT)
  @Post("score-speaking")
  scoreSpeaking(@Body() dto: ScoreSpeakingDto, @CurrentUser() u?: AuthUser) {
    return this.svc.scoreSpeaking(dto.part, dto.question ?? "", dto.transcript, u?.sub);
  }

  /** Audio → transcript (20-vazifa) */
  @Throttle(TRANSCRIBE_LIMIT)
  @Post("transcribe")
  @UseInterceptors(FileInterceptor("audio", { limits: { fileSize: MAX_AUDIO_BYTES, files: 1 } }))
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

  @Throttle(GENERATE_LIMIT)
  @Post("writing-prompt")
  writingPrompt(@Body() dto: GenWritingPromptDto) {
    return this.svc.generateWritingPrompt(dto.task, dto.topic);
  }

  @Throttle(GENERATE_LIMIT)
  @Post("speaking-prompt")
  speakingPrompt(@Body() dto: GenPromptDto) {
    return this.svc.generateSpeakingPrompt(dto.part, dto.topic);
  }

  @Throttle(GENERATE_LIMIT)
  @Post("reading-test")
  readingTest(@Body() dto: GenTestDto) {
    return this.svc.generateReading(dto.topic);
  }

  @Throttle(GENERATE_LIMIT)
  @Post("listening-test")
  listeningTest(@Body() dto: GenTestDto) {
    return this.svc.generateListening(dto.topic);
  }
}
