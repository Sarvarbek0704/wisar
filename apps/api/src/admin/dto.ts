import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class CreateTopicDto {
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsString() accent?: string;
  @IsOptional() @IsInt() order?: number;
}

export class UpdateTopicDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsString() accent?: string;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class CreateSectionDto {
  @IsString() topicId!: string;
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsInt() order?: number;
}

export class UpdateSectionDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsInt() order?: number;
}

export class CreateArticleDto {
  @IsString() sectionId!: string;
  @IsString() @MinLength(2) title!: string;
  @IsString() content!: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsInt() order?: number;
}

export class UpdateArticleDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class CreateQuizDto {
  @IsString() sectionId!: string;
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsInt() order?: number;
}

export class CreateQuestionDto {
  @IsString() quizId!: string;
  @IsString() @MinLength(2) text!: string;
  @IsArray() @IsString({ each: true }) options!: string[];
  @IsInt() correctIndex!: number;
  @IsOptional() @IsString() explanation?: string;
  @IsOptional() @IsInt() order?: number;
}

export class UpdateQuestionDto {
  @IsOptional() @IsString() text?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) options?: string[];
  @IsOptional() @IsInt() correctIndex?: number;
  @IsOptional() @IsString() explanation?: string;
  @IsOptional() @IsInt() order?: number;
}
