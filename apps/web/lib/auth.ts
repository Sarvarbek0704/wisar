// Client-side auth: qisqa muddatli access token localStorage'da, uzoq muddatli
// refresh token httpOnly cookie'da (34-vazifa). 401'da bir marta silent refresh.
import { fetchWithTimeout, notifyOffline, ApiOfflineError } from "./http";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const TOKEN_KEY = "wisar-token";
const USER_KEY = "wisar-user";

export type AuthUser = {
  id: string;
  email: string;
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

// Natija: tizimga kirildi YOKI email tasdiqlash / 2FA kerak
export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; needsVerification: true; email: string }
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
  // 2FA kodi kerak (40-vazifa)
  if (data?.needs2fa) {
    return { ok: false, needs2fa: true, email: body.email as string };
  }
  if (!res.ok) throw new Error(data.message || "Xatolik yuz berdi");
  save(data.token, data.user);
  return { ok: true, user: data.user };
}

export const login = (email: string, password: string, code?: string) =>
  authRequest("/auth/login", { email, password, ...(code ? { code } : {}) });

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

export const register = (email: string, password: string, name?: string, inviteCode?: string) =>
  authRequest("/auth/register", { email, password, name, ...(inviteCode ? { inviteCode } : {}) });

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
