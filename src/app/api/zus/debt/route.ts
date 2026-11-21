import { debtCertificate } from "@/lib/mock";
import { currentPersona, json } from "@/lib/session";

/** GET ?date=YYYY-MM-DD – symulacja zaświadczenia o niezaleganiu / należnościach do uregulowania na dzień powstania prawa */
export async function GET(req: Request) {
  const p = await currentPersona(req);
  if (!p) return json({ error: "Brak sesji" }, 401);
  const date = new URL(req.url).searchParams.get("date") || p.ciaza?.przewidywanyPorod || new Date().toISOString().slice(0, 10);
  return json({ osoba: `${p.imie} ${p.nazwisko}`, pesel: p.pesel, ...debtCertificate(p, date) });
}
