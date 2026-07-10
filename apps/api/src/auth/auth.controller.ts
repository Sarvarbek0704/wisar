import {
  Body,
  Controller,
  Get,
  Post,
  Redirect,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response, CookieOptions } from "express";
import { AuthService } from "./auth.service";
import {
  LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto,
  VerifyEmailDto, ResendVerificationDto, ChangePasswordDto,
} from "./dto";
import { JwtGuard } from "./jwt.guard";
import { CurrentUser, type AuthUser } from "./current-user.decorator";
import { MailService } from "../mail/mail.service";

const REFRESH_COOKIE = "wisar_refresh";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly mail: MailService,
  ) {}

  // ─── Refresh cookie yordamchilari (34-vazifa) ─────────────────────────────────
  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth", // faqat refresh/logout endpointlariga yuboriladi
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 kun
    };
  }

  private async issueRefresh(res: Response, userId: string): Promise<void> {
    const raw = await this.auth.createRefreshToken(userId);
    res.cookie(REFRESH_COOKIE, raw, this.cookieOptions());
  }

  private readRefreshCookie(req: Request): string | undefined {
    const header = req.headers.cookie;
    if (!header) return undefined;
    for (const part of header.split(";")) {
      const idx = part.indexOf("=");
      if (idx === -1) continue;
      if (part.slice(0, idx).trim() === REFRESH_COOKIE) {
        return decodeURIComponent(part.slice(idx + 1).trim());
      }
    }
    return undefined;
  }

  // Brute-force himoyasi: hisob yaratishni cheklaymiz (daqiqasiga 5)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("register")
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(dto.email, dto.password, dto.name, dto.inviteCode, this.mail);
    if ("token" in result) await this.issueRefresh(res, result.user.id);
    return result;
  }

  // Brute-force himoyasi: parol tanlashga qarshi (daqiqasiga 10 urinish)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto.email, dto.password, this.mail, dto.code);
    await this.issueRefresh(res, result.user.id);
    return result;
  }

  // ─── 2FA (40-vazifa) ──────────────────────────────────────────────────────────
  @UseGuards(JwtGuard)
  @Get("2fa/status")
  twoFactorStatus(@CurrentUser() u: AuthUser) {
    return this.auth.twoFactorStatus(u.sub);
  }

  @UseGuards(JwtGuard)
  @Post("2fa/setup")
  setupTwoFactor(@CurrentUser() u: AuthUser) {
    return this.auth.setupTwoFactor(u.sub);
  }

  @UseGuards(JwtGuard)
  @Post("2fa/enable")
  enableTwoFactor(@CurrentUser() u: AuthUser, @Body() body: { code: string }) {
    return this.auth.enableTwoFactor(u.sub, body?.code ?? "");
  }

  @UseGuards(JwtGuard)
  @Post("2fa/disable")
  disableTwoFactor(@CurrentUser() u: AuthUser, @Body() body: { code: string }) {
    return this.auth.disableTwoFactor(u.sub, body?.code ?? "");
  }

  // Kodni tanlashga qarshi (6 xonali kod brute-force himoyasi)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("verify-email")
  async verifyEmail(@Body() dto: VerifyEmailDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.verifyEmail(dto.email, dto.code);
    await this.issueRefresh(res, result.user.id);
    return result;
  }

  // Email spam himoyasi (daqiqasiga 3 marta)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post("resend-verification")
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.auth.resendVerification(dto.email, this.mail);
    return { message: "Agar email mavjud va tasdiqlanmagan bo'lsa, kod yuborildi" };
  }

  /** Silent refresh — httpOnly cookie bilan yangi access token (34-vazifa). */
  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.refresh(this.readRefreshCookie(req));
    if (!result) {
      res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
      throw new UnauthorizedException("Sessiya tugadi");
    }
    res.cookie(REFRESH_COOKIE, result.refreshToken, this.cookieOptions());
    return { token: result.token, user: result.user };
  }

  /** Logout — refresh tokenni bekor qiladi va cookie'ni tozalaydi. */
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.revokeRefreshToken(this.readRefreshCookie(req));
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    return { ok: true };
  }

  @UseGuards(JwtGuard)
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  // Parolni yangilash (login qilingan holda). Brute-force himoyasi: 5/daqiqa.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(JwtGuard)
  @Post("change-password")
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    await this.auth.changePassword(
      user.sub,
      dto.currentPassword,
      dto.newPassword,
      this.readRefreshCookie(req),
    );
    return { message: "Parol yangilandi. Boshqa qurilmalardagi sessiyalar yopildi." };
  }

  // Email spam himoyasi (daqiqasiga 3 marta)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post("forgot-password")
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email, this.mail);
    return { message: "Agar email mavjud bo'lsa, xabar yuborildi" };
  }

  // Reset token'ni tanlashga qarshi
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("reset-password")
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.newPassword);
    return { message: "Parol muvaffaqiyatli yangilandi" };
  }

  @UseGuards(AuthGuard("google"))
  @Get("google")
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  googleAuth() {
    // Passport redirects to Google — no body needed
  }

  @UseGuards(AuthGuard("google"))
  @Get("google/callback")
  @Redirect()
  async googleCallback(
    @Req() req: Request & { user: { googleId: string; email: string; name: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.googleLogin(req.user);
    await this.issueRefresh(res, result.user.id);
    const frontendUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace(":4000", ":3001") || "http://localhost:3001";
    return { url: `${frontendUrl}/auth/google?token=${result.token}` };
  }
}
