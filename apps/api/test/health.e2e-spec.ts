import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { HealthController } from "../src/health/health.controller";
import { PrismaService } from "../src/prisma.service";

// Health/ready DB'ni tekshiradi — testda soxta PrismaService beramiz (real DB shart emas)
const prismaMock = { $queryRaw: jest.fn().mockResolvedValue([{ ok: 1 }]) };

describe("Health (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prismaMock }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("GET /api/health → { status: 'ok' } (liveness)", async () => {
    const res = await request(app.getHttpServer()).get("/api/health").expect(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.timestamp).toBe("string");
  });

  it("GET /api/health/ready → DB up (readiness)", async () => {
    const res = await request(app.getHttpServer()).get("/api/health/ready").expect(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.db).toBe("up");
    expect(prismaMock.$queryRaw).toHaveBeenCalled();
  });
});
