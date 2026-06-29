import { Body, Controller, Get, Post, Redirect, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import {
  LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto,
  VerifyEmailDto, ResendVerificationDto,
} from "./dto";
import { JwtGuard } from "./jwt.guard";
import { CurrentUser, type AuthUser } from "./current-user.decorator";
import { MailService } from "../mail/mail.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly mail: MailService,
  ) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.name, dto.inviteCode, this.mail);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password, this.mail);
  }

  @Post("verify-email")
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.email, dto.code);
  }

  @Post("resend-verification")
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.auth.resendVerification(dto.email, this.mail);
    return { message: "Agar email mavjud va tasdiqlanmagan bo'lsa, kod yuborildi" };
  }

  @UseGuards(JwtGuard)
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Post("forgot-password")
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email, this.mail);
    return { message: "Agar email mavjud bo'lsa, xabar yuborildi" };
  }

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
  async googleCallback(@Req() req: { user: { googleId: string; email: string; name: string } }) {
    const result = await this.auth.googleLogin(req.user);
    const frontendUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace(":4000", ":3001") || "http://localhost:3001";
    return { url: `${frontendUrl}/auth/google?token=${result.token}` };
  }
}
