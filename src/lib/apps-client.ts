"use client";
/**
 * „Wysłane w tej sesji” – lista wniosków trzymana tylko w tej karcie przeglądarki (sessionStorage).
 * Serwer jedynie wystawia symulowane UPO i niczego nie przechowuje, więc inni odwiedzający
 * nie widzą Twoich wniosków. Lista jest osobna dla każdego zalogowanego konta.
 */
export type SentApp = { id: string; upo: string; typ: string; adresat: string; dane: Record<string, unknown>; status: string; zlozono: string; osoba: string };

const key = (who: string) => `pp_apps_${who || "gosc"}`;

export function loadApps(who: string): SentApp[] {
  try {
    const raw = sessionStorage.getItem(key(who));
    const list = raw ? (JSON.parse(raw) as SentApp[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addApp(who: string, app: SentApp) {
  const list = [app, ...loadApps(who)].slice(0, 50);
  try { sessionStorage.setItem(key(who), JSON.stringify(list)); } catch { /* brak pamięci przeglądarki – lista tylko na ekranie */ }
  return list;
}

/** Wysyła wniosek (symulacja) i zapisuje go na liście tej sesji. Rzuca błąd z komunikatem, gdy serwer odrzuci dane. */
export async function sendApp(who: string, body: { typ: string; dane?: Record<string, unknown>; adresat?: string }): Promise<SentApp> {
  const r = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.application) throw new Error(j.error || "Nie udało się wysłać. Spróbuj ponownie.");
  addApp(who, j.application);
  return j.application as SentApp;
}
