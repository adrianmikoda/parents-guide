import { currentPersona, json } from "@/lib/session";

/**
 * Symulowana wysyłka wniosków. Serwer niczego nie przechowuje – zwraca UPO, a listę „Wysłane w tej sesji”
 * trzyma przeglądarka (sessionStorage). Dzięki temu wnioski jednej osoby nie są widoczne dla innych.
 */
const ADRESAT: Record<string, string> = {
  urlop_macierzynski: "Pracodawca",
  urlop_rodzicielski: "Pracodawca",
  urlop_ojcowski: "Pracodawca",
  urlop_uzupelniajacy: "Pracodawca",
  praca_rodzicielski: "Pracodawca",
  ZAM: "ZUS (PUE/eZUS)",
  "ZAS-53": "ZUS (PUE/eZUS)",
  "Z-3": "ZUS (PUE/eZUS)",
  "Z-3a": "ZUS (PUE/eZUS)",
  "ZAS-12": "ZUS (PUE/eZUS)",
  odpis_aktu: "Urząd Stanu Cywilnego (rejestr stanu cywilnego)",
  pytanie_pue: "ZUS – Centrum Obsługi Telefonicznej / e-wizyta",
  zaswiadczenie: "ZUS (PUE/eZUS)",
  plan_urlopow: "Moje dokumenty (zapis planu)",
  urlop_na_warunkach: "Pracodawca",
  rezygnacja_macierzynski: "Pracodawca",
  pozostala_czesc: "Pracodawca",
  czesc_sytuacja: "Pracodawca",
  urlop_wychowawczy: "Pracodawca",
  obnizenie_wymiaru: "Pracodawca",
};
const MAX_BODY = 64 * 1024;

/** GET – wysłane wnioski są przechowywane w przeglądarce, nie na serwerze */
export async function GET() {
  return json({ items: [], info: "Lista wysłanych wniosków jest przechowywana w przeglądarce (sessionStorage)." });
}

/** POST {typ, dane, adresat?} – symulacja wysłania wniosku do pracodawcy / ZUS / USC; zwraca UPO */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: "Wniosek jest za duży." }, 413);
  let body: { typ?: unknown; dane?: unknown; adresat?: unknown };
  try { body = JSON.parse(raw); } catch { return json({ error: "Niepoprawne dane wniosku." }, 400); }
  const typ = typeof body.typ === "string" ? body.typ : "";
  if (!ADRESAT[typ]) return json({ error: "Nieznany typ wniosku." }, 400);
  const adresat = typeof body.adresat === "string" && body.adresat.trim() ? body.adresat.trim().slice(0, 160) : ADRESAT[typ];
  const dane = body.dane && typeof body.dane === "object" ? (body.dane as Record<string, unknown>) : {};
  const p = await currentPersona(req);
  const now = new Date();
  return json({
    ok: true,
    application: {
      id: `W-${now.getTime().toString(36).toUpperCase()}`,
      upo: `UPO/${now.toISOString().slice(0, 10).replace(/-/g, "")}/${Math.floor(Math.random() * 900000 + 100000)}`,
      typ,
      adresat,
      dane,
      status: typ === "pytanie_pue" ? "Przekazano konsultantowi – odpowiedź w ciągu 2 dni roboczych (symulacja)"
        : typ === "zaswiadczenie" ? (adresat.startsWith("ZUS") ? "Przyjęto – zaświadczenie zostanie wydane bez zbędnej zwłoki, najpóźniej w ciągu 7 dni (symulacja)" : "Wysłano prośbę do płatnika składek (symulacja)")
        : typ === "plan_urlopow" ? "Zapisano w tej przeglądarce (symulacja)"
        : "Doręczono (symulacja)",
      zlozono: now.toISOString(),
      osoba: p?.id || "gosc",
    },
  });
}
