import { PARAM_LABELS } from "@/lib/params";
import { json } from "@/lib/session";
import { getHistory, getParams, resetParams, saveParams } from "@/lib/store";

const PIN = () => process.env.ADMIN_PIN || "1234";
const authorized = (req: Request) => req.headers.get("x-admin-pin") === PIN();

/** GET – aktualne parametry prawne (+ historia zmian) */
export async function GET() {
  return json({ params: getParams(), labels: PARAM_LABELS, history: getHistory() });
}

/** PUT – zapis parametrów (panel administracyjny) */
export async function PUT(req: Request) {
  if (!authorized(req)) return json({ error: "Nieprawidłowy PIN administratora" }, 403);
  const body = await req.json();
  const res = saveParams(body.params, body.by || "administrator");
  return json({ ok: true, ...res, history: getHistory() });
}

/** DELETE – przywrócenie wartości domyślnych */
export async function DELETE(req: Request) {
  if (!authorized(req)) return json({ error: "Nieprawidłowy PIN administratora" }, 403);
  const res = resetParams("administrator (reset)");
  return json({ ok: true, ...res, history: getHistory() });
}
