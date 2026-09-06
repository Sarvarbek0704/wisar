import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtGuard, AdminGuard, OptionalJwtGuard } from "./jwt.guard";
import { GoogleStrategy } from "./google.strategy";
import { PrismaService } from "../prisma.service";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [
    PassportModule,
    // Sir prod'da validateEnv() tomonidan kafolatlanadi (fail-fast). Dev uchun aniq nomlangan fallback.
    // signOptions bermaymiz — har token o'z TTL'sini beradi (access 15m; refresh — DB'da, JWT emas).
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || "dev-insecure-secret-CHANGE-IN-PROD",
    }),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtGuard, AdminGuard, OptionalJwtGuard, GoogleStrategy],
  exports: [AuthService, JwtGuard, AdminGuard, OptionalJwtGuard, JwtModule],
})
export class AuthModule {}
