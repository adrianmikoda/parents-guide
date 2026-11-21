import { timingSafeEqual } from "crypto";
import { PARAM_LABELS } from "@/lib/params";
import { json } from "@/lib/session";
import { getHistory, getParams, resetParams, saveParams } from "@/lib/store";

const PIN = () => process.env.ADMIN_PIN || "1234";
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const authorized = (req: Request) => same(req.headers.get("x-admin-pin") ?? "", PIN());
const slow = () => new Promise((r) => setTimeout(r, 400)); // utrudnia zgadywanie PIN-u

/** GET – aktualne parametry prawne (+ historia zmian) */
export async function GET() {
  return json({ params: getParams(), labels: PARAM_LABELS, history: getHistory() });
}

/** POST – sprawdzenie PIN-u przed otwarciem panelu (nagłówek x-admin-pin) */
export async function POST(req: Request) {
  if (!authorized(req)) { await slow(); return json({ error: "Nieprawidłowy PIN administratora" }, 403); }
  return json({ ok: true });
}

/** PUT – zapis parametrów (panel administracyjny) */
export async function PUT(req: Request) {
  if (!authorized(req)) return slow().then(() => json({ error: "Nieprawidłowy PIN administratora" }, 403));
  const body = await req.json();
  const res = saveParams(body.params, body.by || "administrator");
  return json({ ok: true, ...res, history: getHistory() });
}

/** DELETE – przywrócenie wartości domyślnych */
export async function DELETE(req: Request) {
  if (!authorized(req)) return slow().then(() => json({ error: "Nieprawidłowy PIN administratora" }, 403));
  const res = resetParams("administrator (reset)");
  return json({ ok: true, ...res, history: getHistory() });
}
