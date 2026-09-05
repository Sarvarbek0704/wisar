import { Body, Controller, Get, Param, Post, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { TutorService } from "./tutor.service";
import { JwtGuard, AdminGuard, OptionalJwtGuard } from "../auth/jwt.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";

class AskTutorDto {
  @IsString() articleId!: string;
  @IsString() @MinLength(2) question!: string;
}

class CreateThreadDto {
  @IsIn(["tutor", "roleplay"]) kind!: "tutor" | "roleplay";
  @IsOptional() @IsString() articleId?: string;
  @IsOptional() @IsString() scenario?: string;
}

class AskDto {
  @IsString() @MinLength(1) question!: string;
}

@Controller("tutor")
export class TutorController {
  constructor(private readonly tutor: TutorService) {}

  // Eski bitta savol-javob. Har chaqiruv LLM'ga pul turadi — guard + qat'iy cheklov.
  @UseGuards(OptionalJwtGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("ask")
  ask(@Body() dto: AskTutorDto) {
    return this.tutor.askTutor(dto.articleId, dto.question);
  }

  // Multi-turn suhbat yaratish (17,19-vazifa)
  @UseGuards(OptionalJwtGuard)
  @Post("thread")
  createThread(@Body() dto: CreateThreadDto, @CurrentUser() u?: AuthUser) {
    return this.tutor.createThread(u?.sub, dto.kind, dto.articleId, dto.scenario);
  }

  @UseGuards(OptionalJwtGuard)
  @Get("thread/:id")
  getThread(@Param("id") id: string, @CurrentUser() u?: AuthUser) {
    return this.tutor.getThread(id, u?.sub);
  }

  // SSE streaming javob (17-vazifa)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @UseGuards(OptionalJwtGuard)
  @Post("thread/:id/ask")
  async askStream(
    @Param("id") id: string,
    @Body() dto: AskDto,
    @Res() res: Response,
    @CurrentUser() u?: AuthUser,
  ) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    (res as unknown as { flushHeaders?: () => void }).flushHeaders?.();
    try {
      for await (const delta of this.tutor.askStream(id, dto.question, u?.sub)) {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: (e as Error).message })}\n\n`);
    } finally {
      res.end();
    }
  }

  // Roleplay suhbati oxiri fikr-mulohaza (19-vazifa)
  @UseGuards(OptionalJwtGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("thread/:id/feedback")
  feedback(@Param("id") id: string, @CurrentUser() u?: AuthUser) {
    return this.tutor.feedback(id, u?.sub);
  }

  // RAG indeksatsiya (18-vazifa, admin)
  @UseGuards(JwtGuard, AdminGuard)
  @Post("index")
  index() {
    return this.tutor.indexAll();
  }
}
