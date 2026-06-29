import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { IsString, MaxLength, MinLength } from "class-validator";
import { ForumService } from "./forum.service";
import { JwtGuard } from "../auth/jwt.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";

class CreateThreadDto {
  @IsString() @MinLength(5) @MaxLength(160) title!: string;
  @IsString() @MaxLength(4000) body!: string;
}
class PostDto {
  @IsString() @MinLength(2) @MaxLength(4000) body!: string;
}

@Controller("forum")
export class ForumController {
  constructor(private readonly forum: ForumService) {}

  @Get()
  list(@Query("take") take?: string, @Query("skip") skip?: string) {
    return this.forum.listThreads(Number(take) || 20, Number(skip) || 0);
  }

  @UseGuards(JwtGuard)
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateThreadDto) {
    return this.forum.createThread(u.sub, dto.title, dto.body);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.forum.getThread(id);
  }

  @UseGuards(JwtGuard)
  @Post(":id/posts")
  addPost(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() dto: PostDto) {
    return this.forum.addPost(u.sub, id, dto.body);
  }

  @UseGuards(JwtGuard)
  @Post("posts/:postId/accept")
  accept(@CurrentUser() u: AuthUser, @Param("postId") postId: string) {
    return this.forum.acceptPost(u.sub, postId);
  }
}
