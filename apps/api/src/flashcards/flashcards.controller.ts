import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { FlashcardsService } from "./flashcards.service";
import { JwtGuard } from "../auth/jwt.guard";
import { OptionalJwtGuard } from "../auth/jwt.guard";
import { CurrentUser, AuthUser } from "../auth/current-user.decorator";

class ReviewDto {
  cardId!: string;
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
    if (
      dto.quality === undefined ||
      dto.quality === null ||
      !Number.isInteger(dto.quality) ||
      dto.quality < 0 ||
      dto.quality > 5
    ) {
      throw new BadRequestException("quality 0-5 orasida butun son bo'lishi kerak");
    }
    if (!dto.cardId) throw new BadRequestException("cardId kerak");
    return this.flashcards.reviewCard(user.sub, dto.cardId, dto.quality);
  }

  /** POST /flashcards/:cardId/hint — AI yodlash maslahati + misol (11-vazifa). */
  @UseGuards(JwtGuard)
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
