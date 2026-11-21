import { PERSONAS } from "@/lib/mock";
import type { Answers } from "@/lib/quiz";
import { missingQuestions, validateAnswers } from "@/lib/quiz";
import { currentPersona, json } from "@/lib/session";
import { cleanAnswers, getAccount, getOverride, personaToAnswers, saveAccount, saveOverride } from "@/lib/users";

/**
 * Profil użytkownika: bieżące dane + skąd pochodzą.
 *  • konto z ZUS (testowe): dane z ZUS, każde pole można nadpisać i przywrócić (poprawki dotyczą tylko tej sesji),
 *  • konto z ankiety: dane wpisane przez użytkownika.
 */
async function who(req: Request) {
  const me = await currentPersona(req);
  if (!me) return null;
  const acc = await getAccount(me.id);
  const zus = PERSONAS.find((p) => p.id === me.id) ?? null;
  return { me, acc, zus };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export async function GET(req: Request) {
  const w = await who(req);
  if (!w) return json({ error: "Zaloguj się, aby zobaczyć profil." }, 401);
  if (w.acc) return json({ zrodlo: "wlasne", answers: w.acc.answers, brakujace: missingQuestions(w.acc.answers).map((q) => q.id) });
  return json({ zrodlo: "zus", answers: personaToAnswers(w.me), zus: personaToAnswers(w.zus!), nadpisane: Object.keys((await getOverride(w.me.id)) ?? {}) });
}

/** PUT { answers } – zapis zmian. Dla danych z ZUS zapamiętujemy tylko pola różniące się od ZUS. */
export async function PUT(req: Request) {
  const w = await who(req);
  if (!w) return json({ error: "Zaloguj się, aby zmienić profil." }, 401);
  const body = (await req.json().catch(() => ({}))) as { answers?: Record<string, unknown> };
  const errs = validateAnswers(body.answers ?? {});
  const first = Object.values(errs)[0];
  if (first) return json({ error: first, fields: errs }, 400);
  const incoming = cleanAnswers(body.answers ?? {});
  if (w.acc) {
    const merged = { ...w.acc.answers, ...incoming };
    if (!merged.imie || !merged.nazwisko) return json({ error: "Podaj imię i nazwisko." }, 400);
    await saveAccount(merged, w.acc.id);
    return json({ ok: true });
  }
  const original = personaToAnswers(w.zus!);
  const ov: Answers = { ...((await getOverride(w.me.id)) ?? {}), ...incoming };
  for (const k of Object.keys(ov) as (keyof Answers)[]) if (same(ov[k], original[k])) delete ov[k];
  await saveOverride(w.me.id, ov);
  return json({ ok: true, nadpisane: Object.keys(ov) });
}

/** DELETE { keys?: string[] } – przywróć dane z ZUS (wybrane pola albo wszystkie). */
export async function DELETE(req: Request) {
  const w = await who(req);
  if (!w || w.acc) return json({ error: "Przywracanie dotyczy danych pobranych z ZUS." }, 400);
  const body = (await req.json().catch(() => ({}))) as { keys?: string[] };
  const ov: Answers = { ...((await getOverride(w.me.id)) ?? {}) };
  if (body.keys?.length) for (const k of body.keys) delete ov[k as keyof Answers];
  await saveOverride(w.me.id, body.keys?.length ? ov : {});
  return json({ ok: true, nadpisane: Object.keys(body.keys?.length ? ov : {}) });
}
