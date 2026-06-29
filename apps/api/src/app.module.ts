import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaService } from "./prisma.service";
import { CommonModule } from "./common/common.module";
import { LlmModule } from "./llm/llm.module";
import { ContentController } from "./content/content.controller";
import { ContentService } from "./content/content.service";
import { AuthModule } from "./auth/auth.module";
import { AdminModule } from "./admin/admin.module";
import { MeModule } from "./me/me.module";
import { CommentsModule } from "./comments/comments.module";
import { QuizModule } from "./quiz/quiz.module";
import { IeltsModule } from "./ielts/ielts.module";
import { MailModule } from "./mail/mail.module";
import { PlannerModule } from "./planner/planner.module";
import { TutorModule } from "./tutor/tutor.module";
import { InviteModule } from "./invite/invite.module";
import { FlashcardsModule } from "./flashcards/flashcards.module";
import { ReviewModule } from "./review/review.module";
import { GroupsModule } from "./groups/groups.module";
import { ForumModule } from "./forum/forum.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    CommonModule,
    LlmModule,
    AuthModule,
    AdminModule,
    MeModule,
    CommentsModule,
    QuizModule,
    IeltsModule,
    MailModule,
    PlannerModule,
    TutorModule,
    InviteModule,
    FlashcardsModule,
    ReviewModule,
    GroupsModule,
    ForumModule,
  ],
  controllers: [ContentController, HealthController],
  providers: [
    PrismaService,
    ContentService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
