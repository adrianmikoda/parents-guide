import { randomUUID } from "crypto";
import { PERSONAS } from "./mock";
import { clearCookie, readCookie, writeCookie } from "./cookie";
import { ACCOUNT_COOKIE, OVERRIDES_COOKIE, getAccount, personaFromAccount, personaWithOverrides } from "./users";

export const SESSION_COOKIE = "pp_session";
export const SESSION_MAX_AGE = 60 * 60 * 4;

type SessionData = { id: string; sid: string; exp: number };

/**
 * Symulowana sesja po „logowaniu przez mObywatel” – w produkcji: Węzeł Krajowy / login.gov.pl (SAML/OIDC).
 * Ciasteczko jest podpisane i ma wbudowany czas ważności. Wskazuje konto testowe („dane z ZUS”)
 * albo konto założone przez użytkownika (dane z ankiety, id „u-…”).
 */
export async function currentSession(): Promise<SessionData | null> {
  const s = await readCookie<SessionData>(SESSION_COOKIE);
  if (!s || typeof s.id !== "string" || !(s.exp > Date.now())) return null;
  return s;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function currentPersona(_req?: Request) {
  const s = await currentSession();
  if (!s) return null;
  const test = PERSONAS.find((p) => p.id === s.id);
  if (test) return personaWithOverrides(test); // dane „z ZUS” + ewentualne poprawki użytkownika (tylko w tej przeglądarce)
  const acc = await getAccount(s.id);
  return acc ? personaFromAccount(acc) : null;
}

export async function startSession(id: string) {
  const prev = await currentSession();
  // poprawki danych z ZUS dotyczą jednej sesji – nowe logowanie zaczyna od czystych danych
  if (!prev || prev.id !== id) await clearCookie(OVERRIDES_COOKIE);
  await writeCookie(SESSION_COOKIE, { id, sid: randomUUID(), exp: Date.now() + SESSION_MAX_AGE * 1000 } satisfies SessionData, SESSION_MAX_AGE);
}

export async function endSession() {
  await clearCookie(SESSION_COOKIE);
  await clearCookie(OVERRIDES_COOKIE);
  await clearCookie(ACCOUNT_COOKIE);
}

/** Odpowiedź JSON. Dane zależne od sesji nigdy nie trafiają do współdzielonego cache. */
export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
