import { diffDays } from "@/lib/engine";
import { currentPersona, json } from "@/lib/session";

/** GET – symulacja podglądu zaświadczeń lekarskich e-ZLA */
export async function GET(req: Request) {
  const p = await currentPersona(req);
  if (!p) return json({ error: "Brak sesji" }, 401);
  return json({ items: p.ezla.map((e) => ({ ...e, dni: diffDays(e.od, e.do) + 1 })) });
}
