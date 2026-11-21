import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * Podpisane ciasteczka (HMAC-SHA256). Dane sesji i kont trzymamy u użytkownika, a nie w pamięci serwera –
 * na hostingu serverless (Vercel) każda instancja funkcji ma własną pamięć, więc dane „znikałyby” między żądaniami.
 * Podpis uniemożliwia podmianę wartości (np. ręczne wpisanie id innej osoby).
 * W produkcji: ustaw SESSION_SECRET (losowy, długi ciąg znaków).
 */
const SECRET = process.env.SESSION_SECRET || `pp-demo-${process.env.ADMIN_PIN || "1234"}-secret`;
const SECURE = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "1" : !!process.env.VERCEL;

const mac = (s: string) => createHmac("sha256", SECRET).update(s).digest("base64url");

export function seal(data: unknown): string {
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${body}.${mac(body)}`;
}

export function unseal<T>(value?: string): T | null {
  if (!value) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  const a = Buffer.from(mac(body));
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export async function readCookie<T>(name: string): Promise<T | null> {
  return unseal<T>((await cookies()).get(name)?.value);
}

export async function writeCookie(name: string, data: unknown, maxAge: number) {
  (await cookies()).set(name, seal(data), { httpOnly: true, sameSite: "lax", secure: SECURE, path: "/", maxAge });
}

export async function clearCookie(name: string) {
  (await cookies()).delete(name);
}
