import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { AdminService } from "./admin.service";
import { JwtGuard, AdminGuard } from "../auth/jwt.guard";
import {
  CreateArticleDto,
  CreateQuestionDto,
  CreateQuizDto,
  CreateSectionDto,
  CreateTopicDto,
  UpdateArticleDto,
  UpdateQuestionDto,
  UpdateSectionDto,
  UpdateTopicDto,
} from "./dto";

// Barcha admin endpointlari JWT + admin roli bilan himoyalangan
@UseGuards(JwtGuard, AdminGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("overview")
  overview() {
    return this.admin.overview();
  }

  @Get("stats")
  stats() {
    return this.admin.stats();
  }

  @Get("articles/:id")
  getArticle(@Param("id") id: string) {
    return this.admin.getArticle(id);
  }

  // Topic
  @Post("topics")
  createTopic(@Body() dto: CreateTopicDto) {
    return this.admin.createTopic(dto);
  }
  @Patch("topics/:id")
  updateTopic(@Param("id") id: string, @Body() dto: UpdateTopicDto) {
    return this.admin.updateTopic(id, dto);
  }
  @Patch("topics/:id/publish")
  setTopicPublished(@Param("id") id: string, @Body() body: { published: boolean }) {
    return this.admin.setTopicPublished(id, !!body?.published);
  }
  @Delete("topics/:id")
  deleteTopic(@Param("id") id: string) {
    return this.admin.deleteTopic(id);
  }

  // Section
  @Post("sections")
  createSection(@Body() dto: CreateSectionDto) {
    return this.admin.createSection(dto);
  }
  @Patch("sections/:id")
  updateSection(@Param("id") id: string, @Body() dto: UpdateSectionDto) {
    return this.admin.updateSection(id, dto);
  }
  @Delete("sections/:id")
  deleteSection(@Param("id") id: string) {
    return this.admin.deleteSection(id);
  }

  // Article
  @Post("articles")
  createArticle(@Body() dto: CreateArticleDto) {
    return this.admin.createArticle(dto);
  }
  @Patch("articles/:id")
  updateArticle(@Param("id") id: string, @Body() dto: UpdateArticleDto) {
    return this.admin.updateArticle(id, dto);
  }
  @Patch("articles/:id/publish")
  setArticlePublished(@Param("id") id: string, @Body() body: { published: boolean }) {
    return this.admin.setArticlePublished(id, !!body?.published);
  }
  @Delete("articles/:id")
  deleteArticle(@Param("id") id: string) {
    return this.admin.deleteArticle(id);
  }

  // Quiz
  @Post("quizzes")
  createQuiz(@Body() dto: CreateQuizDto) {
    return this.admin.createQuiz(dto);
  }
  @Get("quizzes/:id")
  quizForEdit(@Param("id") id: string) {
    return this.admin.quizForEdit(id);
  }
  @Delete("quizzes/:id")
  deleteQuiz(@Param("id") id: string) {
    return this.admin.deleteQuiz(id);
  }

  // Question
  @Post("questions")
  createQuestion(@Body() dto: CreateQuestionDto) {
    return this.admin.createQuestion(dto);
  }
  @Patch("questions/:id")
  updateQuestion(@Param("id") id: string, @Body() dto: UpdateQuestionDto) {
    return this.admin.updateQuestion(id, dto);
  }
  @Delete("questions/:id")
  deleteQuestion(@Param("id") id: string) {
    return this.admin.deleteQuestion(id);
  }

  // Foydalanuvchilar
  @Get("users")
  listUsers(@Query("q") q?: string) {
    return this.admin.listUsers(q);
  }
  @Get("users/:id")
  getUserDetail(@Param("id") id: string) {
    return this.admin.getUserDetail(id);
  }
  @Patch("users/:id/role")
  setUserRole(@Param("id") id: string, @Body() body: { role: string }) {
    return this.admin.setUserRole(id, body?.role);
  }
  @Delete("users/:id")
  deleteUser(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.admin.deleteUser(u.sub, id);
  }

  // Izohlar (moderatsiya)
  @Get("comments")
  listComments(@Query("q") q?: string) {
    return this.admin.listComments(q);
  }
  @Delete("comments/:id")
  deleteComment(@Param("id") id: string) {
    return this.admin.deleteComment(id);
  }

  // Invites
  @Post("invites")
  createInvite(@CurrentUser() u: AuthUser) {
    return this.admin.createInvite(u.sub);
  }
  @Get("invites")
  listInvites() {
    return this.admin.listInvites();
  }
  @Delete("invites/:id")
  deleteInvite(@Param("id") id: string) {
    return this.admin.deleteInvite(id);
  }
}
