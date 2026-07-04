import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

/**
 * Global exception filter — barcha xatolarni bir xil JSON formatga soladi,
 * strukturali log yozadi va (agar sozlangan bo'lsa) Sentry'ga yuboradi.
 * Ichki xato tafsilotlari (stack, message) mijozga sizib chiqmaydi — faqat 5xx uchun umumiy xabar.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Exception");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // HttpException'dan mijozga ko'rsatiladigan xabar; aks holda umumiy 500 xabari
    let message: string | string[] = "Ichki server xatosi";
    let error = "InternalServerError";
    if (isHttp) {
      const body = exception.getResponse();
      if (typeof body === "string") {
        message = body;
      } else if (body && typeof body === "object") {
        const b = body as { message?: string | string[]; error?: string };
        message = b.message ?? exception.message;
        error = b.error ?? exception.name;
      }
    }

    const payload = {
      statusCode: status,
      error,
      message,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    };

    // 5xx — jiddiy: to'liq stack log + Sentry. 4xx — faqat qisqa warn.
    if (status >= 500) {
      const err = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(`${req.method} ${req.originalUrl} → ${status}: ${err.message}`, err.stack);
      // Sentry (agar init qilingan bo'lsa) — dinamik import bilan bog'liqlik majburiy emas
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Sentry = require("@sentry/nestjs");
        Sentry.captureException?.(err);
      } catch {
        /* Sentry yo'q — e'tiborsiz */
      }
    } else {
      this.logger.warn(`${req.method} ${req.originalUrl} → ${status}: ${JSON.stringify(message)}`);
    }

    res.status(status).json(payload);
  }
}
