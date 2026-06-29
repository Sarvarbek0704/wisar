import { Global, Module } from "@nestjs/common";
import { LlmService } from "./llm.service";
import { EmbedService } from "./embed.service";
import { LlmController } from "./llm.controller";

/** Global LLM modul — ask/chat/stream/embed hamma joyda inject qilinadi (17,18,21-vazifa). */
@Global()
@Module({
  controllers: [LlmController],
  providers: [LlmService, EmbedService],
  exports: [LlmService, EmbedService],
})
export class LlmModule {}
