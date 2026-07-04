import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness — jarayon tirikmi (tez, DB'siz). Load balancer / orchestrator uchun. */
  @Get()
  live() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  /** Readiness — DB ulanishini tekshiradi. Trafik yuborishdan oldin tekshiriladi. */
  @Get("ready")
  @HttpCode(HttpStatus.OK)
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
      return { status: "error", db: "down", timestamp: new Date().toISOString() };
    }
  }
}
