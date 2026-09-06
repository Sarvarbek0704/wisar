// Client-side auth: qisqa muddatli access token localStorage'da, uzoq muddatli
// refresh token httpOnly cookie'da (34-vazifa). 401'da bir marta silent refresh.
import { fetchWithTimeout, notifyOffline, ApiOfflineError } from "./http";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const TOKEN_KEY = "wisar-token";
const USER_KEY = "wisar-user";

export type AuthUser = {
  id: string;
  /** Telefon bilan ro'yxatdan o'tgan foydalanuvchida email bo'lmasligi mumkin. */
  email: string | null;
  phone: string | null;
  name: string | null;
  role: string;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  try {
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function save(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** Telegram orqali telefonni tasdiqlash uchun kerakli ma'lumot. */
export type PhoneVerification = {
  phone: string;
  telegramUrl: string | null;
  linkToken: string;
  expiresInMinutes: number;
};

const PENDING_PHONE_KEY = "wisar-pending-phone";

/**
 * Tasdiqlash ma'lumotini sahifalar orasida saqlaymiz.
 * sessionStorage — chunki bu vaqtinchalik va faqat shu tabga tegishli.
 */
export function savePendingPhone(v: PhoneVerification): void {
  try {
    sessionStorage.setItem(PENDING_PHONE_KEY, JSON.stringify(v));
  } catch {
    /* xotira yopiq bo'lsa jim o'tamiz */
  }
}

export function readPendingPhone(): PhoneVerification | null {
  try {
    const raw = sessionStorage.getItem(PENDING_PHONE_KEY);
    return raw ? (JSON.parse(raw) as PhoneVerification) : null;
  } catch {
    return null;
  }
}

export function clearPendingPhone(): void {
  try {
    sessionStorage.removeItem(PENDING_PHONE_KEY);
  } catch {
    /* ignore */
  }
}

/** Havola tokeni bo'yicha tasdiqlash holati — kirish talab qilinmaydi. */
export async function checkPhoneLink(
  token: string,
): Promise<{ verified: boolean; expired?: boolean; phone?: string | null }> {
  const res = await fetchWithTimeout(
    `${API}/api/auth/phone/link-status?token=${encodeURIComponent(token)}`,
  );
  if (!res.ok) return { verified: false };
  return res.json();
}

// Natija: tizimga kirildi YOKI tasdiqlash / 2FA kerak
export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; needsVerification: true; email: string }
  | { ok: false; needsPhoneVerification: true; verification: PhoneVerification }
  | { ok: false; needs2fa: true; email: string };

async function authRequest(
  path: string,
  body: Record<string, unknown>,
): Promise<AuthResult> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${API}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include", // refresh cookie qabul qilish uchun
    });
  } catch (e) {
    if (e instanceof ApiOfflineError) {
      notifyOffline();
      throw new Error("Server bilan aloqa yo'q. Keyinroq urinib ko'ring.");
    }
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  // Tasdiqlanmagan email (login 401 yoki register 200 ikkalasida ham)
  if (data?.needsVerification) {
    return { ok: false, needsVerification: true, email: data.email ?? (body.email as string) };
  }
  // Telefon tasdiqlanmagan — Telegram havolasi qaytadi
  if (data?.needsPhoneVerification) {
    return {
      ok: false,
      needsPhoneVerification: true,
      verification: {
        phone: data.phone,
        telegramUrl: data.telegramUrl ?? null,
        linkToken: data.linkToken,
        expiresInMinutes: data.expiresInMinutes ?? 30,
      },
    };
  }
  // 2FA kodi kerak (40-vazifa)
  if (data?.needs2fa) {
    return { ok: false, needs2fa: true, email: body.email as string };
  }
  if (!res.ok) throw new Error(data.message || "Xatolik yuz berdi");
  save(data.token, data.user);
  return { ok: true, user: data.user };
}

/** `identifier` — email yoki telefon raqami. */
export const login = (identifier: string, password: string, code?: string) =>
  authRequest("/auth/login", { identifier, password, ...(code ? { code } : {}) });

// 2FA boshqaruv (40-vazifa)
export const get2faStatus = () =>
  authFetch<{ enabled: boolean }>("/auth/2fa/status");
export const setup2fa = () =>
  authFetch<{ otpauth: string; qr: string; secret: string }>("/auth/2fa/setup", { method: "POST" });
export const enable2fa = (code: string) =>
  authFetch<{ ok: boolean }>("/auth/2fa/enable", { method: "POST", body: JSON.stringify({ code }) });
export const disable2fa = (code: string) =>
  authFetch<{ ok: boolean }>("/auth/2fa/disable", { method: "POST", body: JSON.stringify({ code }) });

/** Login qilingan holda parolni yangilash. */
export const changePassword = (currentPassword: string, newPassword: string) =>
  authFetch<{ message: string }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

/** Ro'yxatdan o'tish — `email` YOKI `phone` dan bittasi berilishi kerak. */
export const register = (input: {
  email?: string;
  phone?: string;
  password: string;
  name?: string;
  inviteCode?: string;
}) => authRequest("/auth/register", { ...input });

// ─── Telefon (Telegram orqali tasdiqlanadi) ──────────────────────────────────

/** Hisobga telefon qo'shadi/o'zgartiradi va tasdiqlashni boshlaydi. */
export const setPhone = (phone: string) =>
  authFetch<PhoneVerification & { needsPhoneVerification: true }>("/auth/phone", {
    method: "PUT",
    body: JSON.stringify({ phone }),
  });

/** Tasdiqlash havolasini qaytadan oladi. */
export const startPhoneVerification = () =>
  authFetch<PhoneVerification & { needsPhoneVerification?: true; phoneVerified?: true }>(
    "/auth/phone/start",
    { method: "POST" },
  );

/**
 * Tasdiqlash holatini so'raydi. Tasdiqlangan bo'lsa yangi token ham keladi —
 * uni saqlab qo'yamiz, foydalanuvchi qaytadan kirmasin.
 */
export async function phoneStatus(): Promise<{ phoneVerified: boolean; phone: string | null }> {
  const r = await authFetch<{
    phoneVerified: boolean;
    phone: string | null;
    token?: string;
    user?: AuthUser;
  }>("/auth/phone/status");
  if (r.phoneVerified && r.token && r.user) save(r.token, r.user);
  return { phoneVerified: r.phoneVerified, phone: r.phone };
}

export async function verifyEmail(email: string, code: string): Promise<AuthUser> {
  const res = await fetch(`${API}/api/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
    credentials: "include", // refresh cookie'ni qabul qilish uchun SHART
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Kod noto'g'ri");
  save(data.token, data.user);
  return data.user;
}

export async function resendVerification(email: string): Promise<void> {
  await fetch(`${API}/api/auth/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function forgotPassword(email: string): Promise<void> {
  const res = await fetch(`${API}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || "Xatolik yuz berdi");
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || "Xatolik yuz berdi");
  }
}

export function loginWithGoogle(): void {
  if (typeof window !== "undefined") {
    window.location.href = `${API}/api/auth/google`;
  }
}

export const isLoggedIn = (): boolean => !!getToken();

// Silent refresh (34-vazifa): 401'da httpOnly refresh cookie bilan yangi access token olamiz.
// Parallel 401'lar uchun bitta refresh so'rovi (deduplication).
let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetchWithTimeout(`${API}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return false;
        const data = await res.json().catch(() => null);
        if (data?.token) {
          if (data.user) save(data.token, data.user);
          else localStorage.setItem(TOKEN_KEY, data.token);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    })();
    void refreshing.then(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

/** Refresh cookie'ni serverda bekor qiladi va lokal sessiyani tozalaydi. */
export async function logoutServer(): Promise<void> {
  try {
    await fetchWithTimeout(`${API}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    /* offline bo'lsa ham lokal tozalaymiz */
  }
  logout();
}

// Himoyalangan so'rov (Authorization header + refresh cookie bilan)
export async function authFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  _retried = false,
): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetchWithTimeout(`${API}/api${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (e) {
    if (e instanceof ApiOfflineError) notifyOffline();
    throw e;
  }
  if (res.status === 401) {
    // Bir marta silent refresh urinib ko'ramiz
    if (!_retried) {
      const ok = await tryRefresh();
      if (ok) return authFetch<T>(path, options, true);
    }
    logout();
    throw new Error("Sessiya tugadi — qayta kiring");
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || `Xato (${res.status})`);
  }
  return res.status === 204 ? (null as T) : ((await res.json()) as T);
}
