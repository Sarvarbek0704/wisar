import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsInt, IsString, Max, Min } from "class-validator";
import { FlashcardsService } from "./flashcards.service";
import { JwtGuard } from "../auth/jwt.guard";
import { OptionalJwtGuard } from "../auth/jwt.guard";
import { CurrentUser, AuthUser } from "../auth/current-user.decorator";

// DIQQAT: har bir maydonda class-validator dekoratori BO'LISHI SHART.
// Global ValidationPipe `whitelist: true` bilan ishlaydi — dekoratorsiz maydonlar
// jimgina o'chirib tashlanadi va endpoint hech qachon ishlamaydi.
class ReviewDto {
  @IsString()
  cardId!: string;

  @IsInt()
  @Min(0)
  @Max(5)
  quality!: number; // 0-5
}

@Controller("flashcards")
export class FlashcardsController {
  constructor(private readonly flashcards: FlashcardsService) {}

  /** GET /flashcards/decks — barcha dastalar (publika) */
  @Get("decks")
  getDecks() {
    return this.flashcards.getDecks();
  }

  /** GET /flashcards/stats — foydalanuvchi statistikasi (auth kerak) */
  @UseGuards(JwtGuard)
  @Get("stats")
  getStats(@CurrentUser() user: AuthUser) {
    return this.flashcards.getStats(user.sub);
  }

  /**
   * POST /flashcards/review — kartani baholash (auth kerak)
   * Body: { cardId: string, quality: 0|1|2|3|4|5 }
   */
  @UseGuards(JwtGuard)
  @Post("review")
  @HttpCode(HttpStatus.OK)
  review(@CurrentUser() user: AuthUser, @Body() dto: ReviewDto) {
    // Validatsiya ValidationPipe + ReviewDto dekoratorlari orqali bajariladi.
    return this.flashcards.reviewCard(user.sub, dto.cardId, dto.quality);
  }

  /**
   * POST /flashcards/:cardId/hint — AI yodlash maslahati + misol (11-vazifa).
   * Har chaqiruv LLM'ga pul turadi — shuning uchun qat'iy cheklov.
   */
  @UseGuards(JwtGuard)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post(":cardId/hint")
  @HttpCode(HttpStatus.OK)
  hint(@Param("cardId") cardId: string) {
    return this.flashcards.getHint(cardId);
  }

  /**
   * GET /flashcards/:deckSlug — dastadagi kartalar.
   * Auth token berilsa review holati ham qaytariladi (OptionalJwt).
   */
  @UseGuards(OptionalJwtGuard)
  @Get(":deckSlug")
  getDeck(@Param("deckSlug") deckSlug: string, @CurrentUser() user?: AuthUser) {
    return this.flashcards.getDeckWithCards(deckSlug, user?.sub);
  }
}
