import "reflect-metadata";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
loadEnv({ path: resolve(process.cwd(), "../../.env") });

// Sentry faqat DSN mavjud bo'lsa ishga tushadi
import * as Sentry from "@sentry/nestjs";
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.2 });
}

import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";
import { validateEnv } from "./common/env";

/** CORS uchun ruxsat etilgan domenlar (.env: CORS_ORIGINS yoki NEXT_PUBLIC_SITE_URL). */
function allowedOrigins(): string[] {
  const raw = (process.env.CORS_ORIGINS || process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (!raw) {
    // Sozlanmagan bo'lsa: dev'da localhost, prod'da bo'sh (CORS_ORIGINS majburiy)
    return process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:3000", "http://localhost:3001"];
  }
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

async function bootstrap() {
  validateEnv(); // prod'da kritik/zaif sirlar bo'lsa shu yerda to'xtaydi (fail-fast)

  const app = await NestFactory.create(AppModule);

  // Reverse-proxy (Nginx) orqasida: X-Forwarded-For dan haqiqiy IP — rate-limit va secure cookie to'g'ri ishlashi uchun
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  // SIGTERM/SIGINT'da toza to'xtash (Prisma $disconnect, ulanishlar yopiladi) — konteyner qayta ishga tushishi uchun
  app.enableShutdownHooks();

  // CORS — faqat oq ro'yxatdagi domenlar (refresh cookie uchun credentials kerak)
  const origins = allowedOrigins();
  app.enableCors({
    origin: (origin, cb) => {
      // origin yo'q (server-server / curl / mobil) yoki ro'yxatda bo'lsa — ruxsat
      if (!origin || origins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: ruxsat etilmagan domen — ${origin}`), false);
    },
    credentials: true,
  });
  app.use(helmet());
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = Number(process.env.API_PORT) || 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API ishga tushdi: http://localhost:${port}/api`);
}

bootstrap();
