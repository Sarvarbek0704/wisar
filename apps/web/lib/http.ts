// Tarmoq qatlami — timeout + yumshoq offline degradatsiya (1-vazifa).
import { toast } from "./ui";

/** Serverga ulanib bo'lmaganda (o'chiq / timeout / tarmoq) tashlangan maxsus xato. */
export class ApiOfflineError extends Error {
  constructor(message = "Server bilan aloqa yo'q") {
    super(message);
    this.name = "ApiOfflineError";
  }
}

export const DEFAULT_TIMEOUT = 8000;

let lastOfflineToast = 0;
const OFFLINE_DEBOUNCE_MS = 8000;

/** Bitta yumshoq "server bilan aloqa yo'q" toast — spam emas (debounce). Faqat brauzerda. */
export function notifyOffline(): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastOfflineToast < OFFLINE_DEBOUNCE_MS) return;
  lastOfflineToast = now;
  toast("Server bilan aloqa yo'q. Internet yoki server holatini tekshiring.", "error");
}

/**
 * AbortController timeout bilan fetch. Ulanish xatosi (server o'chiq) yoki timeout
 * `ApiOfflineError` ga aylanadi — chaqiruvchi jim fallback ko'rsatishi mumkin.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (e) {
    const err = e as Error;
    // AbortError = timeout; TypeError = tarmoq (ERR_CONNECTION_REFUSED) — ikkalasi ham "offline"
    if (err.name === "AbortError" || err instanceof TypeError) {
      throw new ApiOfflineError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
