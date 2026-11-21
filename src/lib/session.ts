import { cookies } from "next/headers";
import { PERSONAS } from "./mock";
import { getAccount, personaFromAccount, personaWithOverrides } from "./users";

export const SESSION_COOKIE = "pp_session";
export const SESSION_MAX_AGE = 60 * 60 * 4;

/**
 * Symulowana sesja po „logowaniu przez mObywatel” – w produkcji: Węzeł Krajowy / login.gov.pl (SAML/OIDC).
 * Sesja wskazuje konto testowe („dane z ZUS”) albo konto założone przez użytkownika (dane z ankiety, id „u-…”).
 */
export async function currentPersona(req?: Request) {
  const url = req ? new URL(req.url) : null;
  const q = url?.searchParams.get("persona");
  const id = q || (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const test = PERSONAS.find((p) => p.id === id);
  if (test) return personaWithOverrides(test); // dane „z ZUS” + ewentualne poprawki użytkownika
  const acc = getAccount(id);
  return acc ? personaFromAccount(acc) : null;
}

export async function startSession(id: string) {
  (await cookies()).set(SESSION_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE });
}

export const json = (data: unknown, status = 200) => Response.json(data, { status });
