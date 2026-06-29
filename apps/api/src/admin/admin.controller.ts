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

  @Get("analytics")
  analytics() {
    return this.admin.analytics();
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
  async setTopicPublished(
    @CurrentUser() u: AuthUser,
    @Param("id") id: string,
    @Body() body: { published: boolean },
  ) {
    const r = await this.admin.setTopicPublished(id, !!body?.published);
    await this.admin.audit(u.sub, "publish_topic", id, { published: !!body?.published });
    return r;
  }
  @Delete("topics/:id")
  async deleteTopic(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    const r = await this.admin.deleteTopic(id);
    await this.admin.audit(u.sub, "delete_topic", id);
    return r;
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
  async deleteSection(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    const r = await this.admin.deleteSection(id);
    await this.admin.audit(u.sub, "delete_section", id);
    return r;
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
  async setArticlePublished(
    @CurrentUser() u: AuthUser,
    @Param("id") id: string,
    @Body() body: { published: boolean },
  ) {
    const r = await this.admin.setArticlePublished(id, !!body?.published);
    await this.admin.audit(u.sub, "publish_article", id, { published: !!body?.published });
    return r;
  }
  @Delete("articles/:id")
  async deleteArticle(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    const r = await this.admin.deleteArticle(id);
    await this.admin.audit(u.sub, "delete_article", id);
    return r;
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
  listUsers(@Query("q") q?: string, @Query("take") take?: string, @Query("skip") skip?: string) {
    return this.admin.listUsers(q, Number(take) || 50, Number(skip) || 0);
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
  async deleteUser(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    const r = await this.admin.deleteUser(u.sub, id);
    await this.admin.audit(u.sub, "delete_user", id);
    return r;
  }

  // Izohlar (moderatsiya)
  @Get("comments")
  listComments(@Query("q") q?: string, @Query("take") take?: string, @Query("skip") skip?: string) {
    return this.admin.listComments(q, Number(take) || 50, Number(skip) || 0);
  }
  @Delete("comments/:id")
  async deleteComment(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    const r = await this.admin.deleteComment(id);
    await this.admin.audit(u.sub, "delete_comment", id);
    return r;
  }

  // Audit jurnal (40-vazifa)
  @Get("audit")
  audit() {
    return this.admin.listAuditLog();
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
