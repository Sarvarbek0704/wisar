import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/**
 * Ro'yxatdan o'tish: foydalanuvchi EMAIL yoki TELEFON dan bittasini kiritadi.
 * Ikkalasi ham ixtiyoriy deb belgilangan, lekin kamida bittasi bo'lishi
 * `AuthService.register` da tekshiriladi (class-validator buni ifodalay olmaydi).
 */
export class RegisterDto {
  @IsOptional()
  @IsEmail({}, { message: "Email manzili noto'g'ri" })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @MinLength(6, { message: "Parol kamida 6 belgi bo'lsin" })
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  inviteCode?: string;
}

export class LoginDto {
  /**
   * Email yoki telefon raqami — qaysi biri ekani serverda aniqlanadi.
   * `email` — eski mijozlar uchun; ikkalasidan biri bo'lsa yetadi.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  identifier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  code?: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class VerifyEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  code!: string;
}

export class ResendVerificationDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(1)
  token!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: "Joriy parolni kiriting" })
  currentPassword!: string;

  @MinLength(6, { message: "Yangi parol kamida 6 belgi bo'lsin" })
  newPassword!: string;
}

export class SetPhoneDto {
  @IsString()
  @MinLength(9, { message: "Telefon raqami juda qisqa" })
  @MaxLength(20)
  phone!: string;
}
