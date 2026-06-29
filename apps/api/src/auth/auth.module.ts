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
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || "mana-dev-secret",
      signOptions: { expiresIn: "7d" },
    }),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtGuard, AdminGuard, OptionalJwtGuard, GoogleStrategy],
  exports: [JwtGuard, AdminGuard, OptionalJwtGuard, JwtModule],
})
export class AuthModule {}
