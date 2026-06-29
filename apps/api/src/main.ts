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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Frontend (Next.js) bilan ishlash uchun CORS
  app.enableCors({ origin: true });
  app.use(helmet());
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const port = Number(process.env.API_PORT) || 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API ishga tushdi: http://localhost:${port}/api`);
}

bootstrap();
