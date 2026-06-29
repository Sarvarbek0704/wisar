import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

// Token mavjud bo'lsa tekshiradi, bo'lmasa ham o'tkazadi (public + auth endpointlar uchun)
@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (token) {
      try {
        req.user = this.jwt.verify(token);
      } catch {
        // Yaroqsiz token — foydalanuvchisiz davom etadi
      }
    }
    return true; // har doim o'tkazadi
  }
}

// Bearer tokenni tekshiradi va req.user ga payloadni qo'yadi
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException("Token kerak");
    try {
      req.user = this.jwt.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException("Yaroqsiz token");
    }
  }
}

// Faqat admin rolini o'tkazadi (JwtGuard'dan keyin ishlatiladi)
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    if (req.user?.role !== "admin") {
      throw new ForbiddenException("Admin huquqi kerak");
    }
    return true;
  }
}
