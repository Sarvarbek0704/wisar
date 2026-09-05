-- Audit tuzatishlari:
--   1) Indekssiz tashqi kalitlar (13 ta) — sekin JOIN va sekin CASCADE DELETE.
--   2) FlashcardReview.reps — kanonik SM-2 uchun (ReviewItem bilan bir xil algoritm).
--   3) User.emailOptIn — haftalik xatdan obunani bekor qilish.
-- Jadvallar kichik (eng kattasi ~3000 qator) — indeks yaratish bir necha ms.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailOptIn" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "FlashcardReview" ADD COLUMN     "reps" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Progress_articleId_idx" ON "Progress"("articleId");

-- CreateIndex
CREATE INDEX "Bookmark_articleId_idx" ON "Bookmark"("articleId");

-- CreateIndex
CREATE INDEX "Note_userId_idx" ON "Note"("userId");

-- CreateIndex
CREATE INDEX "Note_articleId_idx" ON "Note"("articleId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Question_quizId_idx" ON "Question"("quizId");

-- CreateIndex
CREATE INDEX "FlashcardReview_cardId_idx" ON "FlashcardReview"("cardId");

-- CreateIndex
CREATE INDEX "Highlight_articleId_idx" ON "Highlight"("articleId");

-- CreateIndex
CREATE INDEX "Group_ownerId_idx" ON "Group"("ownerId");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

-- CreateIndex
CREATE INDEX "CommentLike_userId_idx" ON "CommentLike"("userId");

-- CreateIndex
CREATE INDEX "ForumThread_userId_idx" ON "ForumThread"("userId");

-- CreateIndex
CREATE INDEX "ForumPost_userId_idx" ON "ForumPost"("userId");

