-- Telefon bilan autentifikatsiya:
--   User.phone / phoneVerified / telegramId — telefon identifikator sifatida
--   User.email endi ixtiyoriy — telefon bilan ro'yxatdan o'tish mumkin
--     (kodda kamida bittasi bo'lishi tekshiriladi)
--   PhoneLinkToken — Telegram orqali raqamni tasdiqlash uchun bir martalik token
-- Hammasi qo'shimcha; email dagi NOT NULL yumshatiladi, mavjud qatorlarga ta'sir qilmaydi.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "telegramId" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PhoneLinkToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhoneLinkToken_token_key" ON "PhoneLinkToken"("token");

-- CreateIndex
CREATE INDEX "PhoneLinkToken_userId_idx" ON "PhoneLinkToken"("userId");

-- CreateIndex
CREATE INDEX "PhoneLinkToken_chatId_idx" ON "PhoneLinkToken"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- AddForeignKey
ALTER TABLE "PhoneLinkToken" ADD CONSTRAINT "PhoneLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

