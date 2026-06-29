import { ConflictException, UnauthorizedException, BadRequestException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { AuthService } from "./auth.service";

// PrismaService va MailService o'rnini bosuvchi soxta (mock) obyektlar — DB'siz test.
function makePrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    emailVerification: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn(),
    },
    invite: { findUnique: jest.fn(), update: jest.fn() },
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: "rt1" }),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  } as any;
}

const jwtMock = { sign: jest.fn().mockReturnValue("signed.jwt.token") } as any;
const mailMock = {
  sendVerificationCode: jest.fn().mockResolvedValue(undefined),
} as any;

describe("AuthService", () => {
  let prisma: any;
  let auth: AuthService;

  beforeEach(() => {
    prisma = makePrismaMock();
    auth = new AuthService(prisma, jwtMock);
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("birinchi foydalanuvchini admin qilib darhol kiritadi (token qaytaradi)", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.count.mockResolvedValue(0);
      prisma.user.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: "u1", ...data, name: data.name ?? null }),
      );

      const res: any = await auth.register("a@b.uz", "secret1", "Ali", undefined, mailMock);

      expect(prisma.user.create).toHaveBeenCalled();
      const createArg = prisma.user.create.mock.calls[0][0].data;
      expect(createArg.role).toBe("admin");
      expect(createArg.emailVerified).toBe(true);
      expect(res.token).toBe("signed.jwt.token");
    });

    it("ikkinchi foydalanuvchidan email tasdiqlash so'raydi", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.count.mockResolvedValue(1);
      prisma.user.create.mockResolvedValue({ id: "u2", email: "c@d.uz", name: null });

      const res: any = await auth.register("c@d.uz", "secret1", undefined, undefined, mailMock);

      expect(res.needsVerification).toBe(true);
      expect(mailMock.sendVerificationCode).toHaveBeenCalled();
    });

    it("tasdiqlangan email allaqachon mavjud bo'lsa ConflictException tashlaydi", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "a@b.uz",
        emailVerified: true,
        name: null,
      });
      await expect(
        auth.register("a@b.uz", "secret1", undefined, undefined, mailMock),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("parolni bcrypt bilan hash qiladi (ochiq saqlamaydi)", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.count.mockResolvedValue(5);
      prisma.user.create.mockResolvedValue({ id: "u3", email: "x@y.uz", name: null });

      await auth.register("x@y.uz", "myPlainPass", undefined, undefined, mailMock);
      const hash = prisma.user.create.mock.calls[0][0].data.passwordHash;
      expect(hash).not.toBe("myPlainPass");
      expect(await bcrypt.compare("myPlainPass", hash)).toBe(true);
    });
  });

  describe("login", () => {
    it("noto'g'ri parolda UnauthorizedException tashlaydi", async () => {
      const hash = await bcrypt.hash("correct", 10);
      prisma.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "a@b.uz",
        passwordHash: hash,
        emailVerified: true,
        name: null,
        role: "user",
      });
      await expect(auth.login("a@b.uz", "wrong", mailMock)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("to'g'ri parolda token qaytaradi", async () => {
      const hash = await bcrypt.hash("correct", 10);
      prisma.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "a@b.uz",
        passwordHash: hash,
        emailVerified: true,
        name: "Ali",
        role: "user",
      });
      const res: any = await auth.login("a@b.uz", "correct", mailMock);
      expect(res.token).toBe("signed.jwt.token");
      expect(res.user.email).toBe("a@b.uz");
    });

    it("mavjud bo'lmagan foydalanuvchida UnauthorizedException tashlaydi", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(auth.login("none@x.uz", "x", mailMock)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe("verifyEmail", () => {
    it("noto'g'ri kodda BadRequestException tashlaydi", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "a@b.uz",
        emailVerified: false,
        name: null,
      });
      prisma.emailVerification.findFirst.mockResolvedValue(null);
      await expect(auth.verifyEmail("a@b.uz", "000000")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("to'g'ri va muddati o'tmagan kodda tasdiqlab token beradi", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "a@b.uz",
        emailVerified: false,
        name: "Ali",
        role: "user",
      });
      prisma.emailVerification.findFirst.mockResolvedValue({
        id: "v1",
        code: "123456",
        expiresAt: new Date(Date.now() + 60000),
      });
      prisma.user.update.mockResolvedValue({
        id: "u1",
        email: "a@b.uz",
        emailVerified: true,
        name: "Ali",
        role: "user",
      });
      const res: any = await auth.verifyEmail("a@b.uz", "123456");
      expect(res.token).toBe("signed.jwt.token");
    });
  });

  describe("refresh token", () => {
    it("createRefreshToken DB'da faqat hashni saqlaydi (xom token qaytaradi)", async () => {
      const raw = await auth.createRefreshToken("u1");
      expect(typeof raw).toBe("string");
      expect(raw.length).toBeGreaterThan(32);
      const data = prisma.refreshToken.create.mock.calls[0][0].data;
      expect(data.userId).toBe("u1");
      expect(data.tokenHash).not.toBe(raw); // xom token saqlanmaydi
      expect(data.tokenHash).toHaveLength(64); // sha256 hex
    });

    it("refresh(undefined) → null", async () => {
      expect(await auth.refresh(undefined)).toBeNull();
    });

    it("yaroqli refresh tokenni rotatsiya qiladi (eskisini bekor qiladi, yangi beradi)", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: "rt1",
        userId: "u1",
        revoked: false,
        expiresAt: new Date(Date.now() + 1000000),
        user: { id: "u1", email: "a@b.uz", name: "Ali", role: "user" },
      });
      const res = await auth.refresh("somerawtoken");
      expect(res).not.toBeNull();
      expect(res!.token).toBe("signed.jwt.token");
      expect(res!.user.id).toBe("u1");
      // eskisi bekor qilindi
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: "rt1" },
        data: { revoked: true },
      });
      // yangisi yaratildi
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it("bekor qilingan refresh token → null", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: "rt1",
        userId: "u1",
        revoked: true,
        expiresAt: new Date(Date.now() + 1000000),
        user: { id: "u1" },
      });
      expect(await auth.refresh("x")).toBeNull();
    });

    it("muddati o'tgan refresh token → null", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: "rt1",
        userId: "u1",
        revoked: false,
        expiresAt: new Date(Date.now() - 1000),
        user: { id: "u1" },
      });
      expect(await auth.refresh("x")).toBeNull();
    });

    it("revokeRefreshToken updateMany chaqiradi", async () => {
      await auth.revokeRefreshToken("sometoken");
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });
  });
});
