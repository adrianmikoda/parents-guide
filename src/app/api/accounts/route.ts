import { cookies } from "next/headers";
import { missingQuestions } from "@/lib/quiz";
import { SESSION_COOKIE, json, startSession } from "@/lib/session";
import { cleanAnswers, getAccount, saveAccount } from "@/lib/users";

/** Konto założone bez pobierania danych z ZUS (dane z ankiety). */

async function ownAccount() {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  return id ? getAccount(id) : null;
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
  const answers = cleanAnswers(body.answers ?? {});
  if (!answers.imie || !answers.nazwisko) return json({ error: "Podaj imię i nazwisko." }, 400);
  const acc = saveAccount(answers);
  await startSession(acc.id);
  return json({ ok: true, user: { id: acc.id, imie: answers.imie, nazwisko: answers.nazwisko }, missing: missingQuestions(answers).map((q) => q.id) });
}

/** PUT { answers } – uzupełnij / popraw dane własnego konta (scalane z dotychczasowymi). */
export async function PUT(req: Request) {
  const acc = await ownAccount();
  if (!acc) return json({ error: "To nie jest konto założone w aplikacji." }, 403);
  const body = (await req.json().catch(() => ({}))) as { answers?: Record<string, unknown> };
  const merged = cleanAnswers({ ...acc.answers, ...(body.answers ?? {}) });
  if (!merged.imie || !merged.nazwisko) return json({ error: "Podaj imię i nazwisko." }, 400);
  const saved = saveAccount(merged, acc.id);
  return json({ ok: true, missing: missingQuestions(saved.answers).map((q) => q.id) });
}
