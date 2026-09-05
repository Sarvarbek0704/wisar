import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness — jarayon tirikmi (tez, DB'siz). Load balancer / orchestrator uchun. */
  @Get()
  live() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  /**
   * Readiness — DB ulanishini tekshiradi. Trafik yuborishdan oldin tekshiriladi.
   *
   * Baza yiqilsa 503 qaytaradi. Ilgari bu yerda `@HttpCode(OK)` turgani uchun
   * xato holatda ham 200 qaytar edi — Docker healthcheck faqat HTTP kodini
   * ko'rgani sababli konteyner o'lik baza bilan ham "healthy" ko'rinardi.
   */
  @Get("ready")
  async ready() {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        db: "up",
        latencyMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new HttpException(
        { status: "error", db: "down", timestamp: new Date().toISOString() },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
