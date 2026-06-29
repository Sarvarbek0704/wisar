// Client-side auth: JWT tokenni localStorage'da saqlaymiz.
// (Eslatma: production'da httpOnly cookie xavfsizroq — 14.6-bob. Bu admin MVP.)

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const TOKEN_KEY = "mana-token";
const USER_KEY = "mana-user";

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

// Natija: tizimga kirildi YOKI email tasdiqlash kerak
export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; needsVerification: true; email: string };

async function authRequest(
  path: string,
  body: Record<string, unknown>,
): Promise<AuthResult> {
  const res = await fetch(`${API}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  // Tasdiqlanmagan email (login 401 yoki register 200 ikkalasida ham)
  if (data?.needsVerification) {
    return { ok: false, needsVerification: true, email: data.email };
  }
  if (!res.ok) throw new Error(data.message || "Xatolik yuz berdi");
  save(data.token, data.user);
  return { ok: true, user: data.user };
}

export const login = (email: string, password: string) =>
  authRequest("/auth/login", { email, password });

export const register = (email: string, password: string, name?: string, inviteCode?: string) =>
  authRequest("/auth/register", { email, password, name, ...(inviteCode ? { inviteCode } : {}) });

export async function verifyEmail(email: string, code: string): Promise<AuthUser> {
  const res = await fetch(`${API}/api/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
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

// Himoyalangan so'rov (Authorization header bilan)
export async function authFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error("Sessiya tugadi — qayta kiring");
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || `Xato (${res.status})`);
  }
  return res.status === 204 ? (null as T) : ((await res.json()) as T);
}
