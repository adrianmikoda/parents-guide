import { missingQuestions, validateAnswers } from "@/lib/quiz";
import { currentSession, json, startSession } from "@/lib/session";
import { cleanAnswers, getAccount, saveAccount } from "@/lib/users";

/** Konto założone bez pobierania danych z ZUS (dane z ankiety). */

async function ownAccount() {
  const s = await currentSession();
  return s ? getAccount(s.id) : null;
}

function invalid(answers: Record<string, unknown>) {
  const errs = validateAnswers(answers);
  const first = Object.values(errs)[0];
  return first ? json({ error: first, fields: errs }, 400) : null;
}

/** GET – odpowiedzi ankiety zalogowanego użytkownika (do uzupełnienia braków). */
export async function GET() {
  const acc = await ownAccount();
  if (!acc) return json({ account: null });
  return json({ account: { id: acc.id, answers: acc.answers, missing: missingQuestions(acc.answers).map((q) => q.id) } });
}

/** POST { answers } – załóż konto i zaloguj. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { answers?: Record<string, unknown> };
  const raw = body.answers ?? {};
  const bad = invalid(raw);
  if (bad) return bad;
  const answers = cleanAnswers(raw);
  if (!answers.imie || !answers.nazwisko) return json({ error: "Podaj imię i nazwisko." }, 400);
  const acc = await saveAccount(answers);
  await startSession(acc.id);
  return json({ ok: true, user: { id: acc.id, imie: answers.imie, nazwisko: answers.nazwisko }, missing: missingQuestions(answers).map((q) => q.id) });
}

/** PUT { answers } – uzupełnij / popraw dane własnego konta (scalane z dotychczasowymi). */
export async function PUT(req: Request) {
  const acc = await ownAccount();
  if (!acc) return json({ error: "To nie jest konto założone w aplikacji." }, 403);
  const body = (await req.json().catch(() => ({}))) as { answers?: Record<string, unknown> };
  const raw = { ...acc.answers, ...(body.answers ?? {}) };
  const bad = invalid(raw);
  if (bad) return bad;
  const merged = cleanAnswers(raw);
  if (!merged.imie || !merged.nazwisko) return json({ error: "Podaj imię i nazwisko." }, 400);
  const saved = await saveAccount(merged, acc.id);
  return json({ ok: true, missing: missingQuestions(saved.answers).map((q) => q.id) });
}
