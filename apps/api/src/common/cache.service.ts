import { Injectable, Logger } from "@nestjs/common";

type Entry = { value: unknown; expires: number };

/**
 * Oddiy in-memory TTL kesh (36-vazifa).
 * Tez-tez o'qiladigan public ma'lumot (stats, topics, topicBySlug) uchun.
 * Redis shart emas — agar kelajakda REDIS_URL bilan ishlatilsa, shu interfeysni
 * (get/set/wrap/invalidate) saqlagan holda almashtirish mumkin.
 */
@Injectable()
export class CacheService {
  private readonly store = new Map<string, Entry>();
  private readonly logger = new Logger(CacheService.name);
  private readonly debug = process.env.CACHE_DEBUG === "1";

  get<T>(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value as T;
  }

  set<T>(key: string, value: T, ttlMs = 60_000): void {
    this.store.set(key, { value, expires: Date.now() + ttlMs });
  }

  /** Keshda bo'lsa qaytaradi, bo'lmasa fn() ni chaqirib natijani keshlaydi. */
  async wrap<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      if (this.debug) this.logger.debug(`HIT ${key}`);
      return cached;
    }
    if (this.debug) this.logger.debug(`MISS ${key}`);
    const value = await fn();
    this.set(key, value, ttlMs);
    return value;
  }

  /** Prefiks bo'yicha (yoki butun) keshni tozalash — admin CRUD invalidatsiyasi. */
  invalidate(prefix?: string): void {
    if (!prefix) {
      this.store.clear();
      return;
    }
    for (const k of [...this.store.keys()]) {
      if (k.startsWith(prefix)) this.store.delete(k);
    }
    if (this.debug) this.logger.debug(`INVALIDATE ${prefix}`);
  }
}
