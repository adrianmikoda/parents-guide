/**
 * Prosty limit zapytań w pamięci instancji serwera (okno przesuwne). Chroni kosztowne funkcje AI przed nadużyciem.
 * Na hostingu serverless każda instancja liczy osobno – to ochrona „best effort”; w produkcji: Redis/KV lub limit na bramce.
 */
const g = globalThis as unknown as { __rl?: Map<string, number[]> };
const hitsMap = (): Map<string, number[]> => (g.__rl ??= new Map<string, number[]>());
const hits = hitsMap;

export function clientKey(req: Request) {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("x-real-ip") || "local";
}

/** true – zapytanie mieści się w limicie; false – przekroczono limit. */
export function allow(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const list = (hits().get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) { hits().set(key, list); return false; }
  list.push(now);
  hits().set(key, list);
  if (hits().size > 5000) hits().clear(); // zabezpieczenie pamięci
  return true;
}
