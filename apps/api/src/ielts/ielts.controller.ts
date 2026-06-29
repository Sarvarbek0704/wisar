import { Body, Controller, Post } from "@nestjs/common";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { IeltsService } from "./ielts.service";

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

@Controller("ielts")
export class IeltsController {
  constructor(private readonly svc: IeltsService) {}

  @Post("score-writing")
  scoreWriting(@Body() dto: ScoreWritingDto) {
    return this.svc.scoreWriting(dto.task, dto.prompt ?? "", dto.essay);
  }

  @Post("score-speaking")
  scoreSpeaking(@Body() dto: ScoreSpeakingDto) {
    return this.svc.scoreSpeaking(dto.part, dto.question ?? "", dto.transcript);
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
