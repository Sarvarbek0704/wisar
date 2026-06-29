import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsString, MaxLength, MinLength } from "class-validator";
import { LlmService } from "./llm.service";
import { JwtGuard } from "../auth/jwt.guard";

class GrammarDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;
}

@Controller("llm")
export class LlmController {
  constructor(private readonly llm: LlmService) {}

  /** Grammatika tekshiruv (21-vazifa) — 10/min throttle. */
  @UseGuards(JwtGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("grammar")
  grammar(@Body() dto: GrammarDto) {
    return this.llm.grammar(dto.text);
  }
}
