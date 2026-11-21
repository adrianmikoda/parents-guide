import { PERSONAS } from "@/lib/mock";
import { currentPersona, endSession, json, startSession } from "@/lib/session";

/** GET – lista kont testowych (symulacja) + aktualna sesja */
export async function GET(req: Request) {
  const me = await currentPersona(req);
  return json({
    session: me ? { id: me.id, imie: me.imie, nazwisko: me.nazwisko, wlasne: "wlasne" in me } : null,
    accounts: PERSONAS.map((p) => ({ id: p.id, imie: p.imie, nazwisko: p.nazwisko, pesel: p.pesel.slice(0, 2) + "*******" + p.pesel.slice(-2), opis: p.opisScenariusza })),
  });
}

/** POST {personaId} – symulacja potwierdzenia logowania w aplikacji mObywatel */
export async function POST(req: Request) {
  const { personaId } = await req.json().catch(() => ({}));
  const p = PERSONAS.find((x) => x.id === personaId);
  if (!p) return json({ error: "Nieznane konto testowe" }, 404);
  await startSession(p.id);
  return json({ ok: true, user: { id: p.id, imie: p.imie, nazwisko: p.nazwisko }, authLevel: "wysoki (symulacja)", provider: "mObywatel (symulacja)" });
}

/** DELETE – wylogowanie: usuwa sesję, poprawki profilu i konto z tej przeglądarki */
export async function DELETE() {
  await endSession();
  return json({ ok: true });
}
