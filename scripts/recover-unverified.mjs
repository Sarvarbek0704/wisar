/**
 * BIR MARTALIK TIKLASH SKRIPTI
 *
 * 2026-07 dan 2026-09 gacha Gmail App Password bekor bo'lgani sababli
 * tasdiqlash xatlari yuborilmagan. Natijada ro'yxatdan o'tgan foydalanuvchilar
 * hisobiga umuman kira olmagan.
 *
 * Bu skript har bir tasdiqlanmagan foydalanuvchi uchun:
 *   1. emailVerified = true qiladi (ular aybdor emas, qayta tasdiqlatmaymiz)
 *   2. TASODIFIY vaqtinchalik parol o'rnatadi (xatda ko'rsatiladi)
 *   3. nima bo'lganini tushuntirib, parolni o'zgartirishni so'rab xat yuboradi
 *
 * Nega email'ning o'zi parol emas: email manzili sir emas — forumda, izohlarda
 * uchraydi. Parol email bo'lsa, uni bilgan har kim hisobga kirardi. Tasodifiy
 * parol foydalanuvchi uchun bir xil qulay (nusxa-joylash), lekin taxmin qilinmaydi.
 *
 * Ishlatish (wisar-api konteyneri ichida):
 *   node scripts/recover-unverified.mjs            # QURUQ REJIM — hech narsa o'zgarmaydi
 *   node scripts/recover-unverified.mjs --send     # haqiqiy bajarish
 */
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

/**
 * O'qish oson vaqtinchalik parol: chalkashadigan belgilar yo'q (0/O, 1/l/I).
 * Masalan "wisar-k7m3xqpr". Nusxa olish oson, taxmin qilish esa mumkin emas
 * (31 belgidan 8 ta ≈ 850 milliard variant).
 */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
function tempPassword() {
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[randomInt(0, ALPHABET.length)];
  return `wisar-${out}`;
}

const SEND = process.argv.includes("--send");
const SITE = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://wisar.uz";

const prisma = new PrismaClient();

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function html(name, email, password) {
  const salom = name ? ` ${name}` : "";
  return `
  <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#222;line-height:1.6">
    <h2 style="color:#3b5bdb;margin:0 0 20px">Hisobingiz tayyor</h2>

    <p>Salom${salom},</p>

    <p>
      Siz Wisar'ga ro'yxatdan o'tgansiz, lekin bizning tomonimizdagi nosozlik
      tufayli tasdiqlash xati sizga yetib bormagan — shu sababli hisobingizga
      kira olmagansiz. <strong>Bu bizning xatoyimiz, uzr so'raymiz.</strong>
    </p>

    <p>
      Nosozlik tuzatildi. Hisobingiz, ismingiz va o'qigan darslaringiz joyida.
    </p>

    <div style="background:#f6f8fd;border:1px solid #dde3f0;border-radius:12px;padding:20px;margin:24px 0">
      <p style="margin:0 0 12px;font-weight:600">Kirish uchun:</p>
      <p style="margin:0 0 6px"><span style="color:#666">Login:</span>
        <strong>${email}</strong></p>
      <p style="margin:0"><span style="color:#666">Vaqtinchalik parol:</span>
        <strong style="font-family:monospace;font-size:17px;letter-spacing:1px">${password}</strong></p>
    </div>

    <p style="text-align:center;margin:28px 0">
      <a href="${SITE}/login" style="display:inline-block;background:#3b5bdb;color:#fff;
         padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:600">Kirish →</a>
    </p>

    <p style="background:#fff8e6;border:1px solid #f0e0b0;border-radius:10px;padding:14px">
      <strong>Kirganingizdan so'ng parolni albatta o'zgartiring:</strong>
      profilingizga o'ting → <em>"Parolni o'zgartirish"</em>. Bu bir necha soniya vaqt oladi
      va hisobingizni himoyalaydi.
    </p>

    <p style="color:#666;font-size:14px;margin-top:24px">
      Savolingiz yoki muammoyingiz bo'lsa — to'g'ridan-to'g'ri menga yozing,
      albatta yordam beraman:
    </p>

    <div style="text-align:center;margin:20px 0">
      <a href="https://t.me/SarvarbekSodiqov"
         style="display:inline-block;background:#229ED9;color:#fff;padding:13px 30px;
                border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">
        Telegram: @SarvarbekSodiqov
      </a>
    </div>

    <p style="color:#aaa;font-size:12px;border-top:1px solid #eee;padding-top:12px;margin-top:24px">
      Agar siz Wisar'ga ro'yxatdan o'tmagan bo'lsangiz — bu xatni e'tiborsiz qoldiring.
    </p>
  </div>`;
}

async function main() {
  const users = await prisma.user.findMany({
    where: { emailVerified: false },
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`${users.length} ta tasdiqlanmagan foydalanuvchi topildi.`);
  console.log(SEND ? "REJIM: HAQIQIY BAJARISH\n" : "REJIM: QURUQ (hech narsa o'zgarmaydi)\n");

  const tx = SEND ? transporter() : null;
  let ok = 0;
  let fail = 0;

  for (const u of users) {
    if (!SEND) {
      console.log(
        `  [quruq] ${u.email.padEnd(34)} ism=${(u.name ?? "—").padEnd(12)} ` +
          `→ emailVerified=true, parol=${tempPassword()}`,
      );
      continue;
    }

    try {
      const pw = tempPassword();
      await prisma.user.update({
        where: { id: u.id },
        data: {
          emailVerified: true,
          passwordHash: await bcrypt.hash(pw, 10),
        },
      });
      // Kutayotgan eski kodlar endi keraksiz
      await prisma.emailVerification.deleteMany({ where: { userId: u.id } });

      await tx.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: u.email,
        subject: "Wisar — hisobingiz tayyor",
        html: html(u.name, u.email, pw),
      });
      ok++;
      console.log(`  ✓ ${u.email}`);
    } catch (e) {
      fail++;
      console.error(`  ✗ ${u.email}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 1500)); // Gmail'ni bo'g'masligimiz uchun
  }

  if (SEND) console.log(`\nBajarildi: ${ok}, xato: ${fail}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
