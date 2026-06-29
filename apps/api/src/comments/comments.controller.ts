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
import { IsOptional, IsString, MinLength } from "class-validator";
import { CommentsService } from "./comments.service";
import { JwtGuard, OptionalJwtGuard } from "../auth/jwt.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";

class CreateCommentDto {
  @IsString() articleId!: string;
  @IsString() @MinLength(1) body!: string;
  @IsOptional() @IsString() parentId?: string;
}

@Controller("comments")
export class CommentsController {
  constructor(private readonly svc: CommentsService) {}

  @UseGuards(OptionalJwtGuard)
  @Get()
  list(@Query("articleId") articleId: string, @CurrentUser() u?: AuthUser) {
    return this.svc.list(articleId, u?.sub);
  }

  @UseGuards(JwtGuard)
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateCommentDto) {
    return this.svc.create(u.sub, dto.articleId, dto.body, dto.parentId);
  }

  @UseGuards(JwtGuard)
  @Post(":id/like")
  like(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.svc.toggleLike(u.sub, id);
  }

  @UseGuards(JwtGuard)
  @Delete(":id")
  remove(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.svc.remove(id, u.sub, u.role);
  }
}
