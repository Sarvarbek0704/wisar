import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { CommentsService } from "./comments.service";
import { JwtGuard } from "../auth/jwt.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";

class CreateCommentDto {
  @IsString() articleId!: string;
  @IsString() @MinLength(1) body!: string;
}

@Controller("comments")
export class CommentsController {
  constructor(private readonly svc: CommentsService) {}

  @Get()
  list(@Query("articleId") articleId: string) {
    return this.svc.list(articleId);
  }

  @UseGuards(JwtGuard)
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateCommentDto) {
    return this.svc.create(u.sub, dto.articleId, dto.body);
  }

  @UseGuards(JwtGuard)
  @Delete(":id")
  remove(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.svc.remove(id, u.sub, u.role);
  }
}
