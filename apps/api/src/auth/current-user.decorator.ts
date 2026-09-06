import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type AuthUser = {
  sub: string;
  /** Telefon bilan ro'yxatdan o'tgan foydalanuvchida email bo'lmasligi mumkin. */
  email: string | null;
  phone: string | null;
  role: string;
  name?: string | null;
};

// Controller'da @CurrentUser() bilan joriy foydalanuvchini olamiz
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
