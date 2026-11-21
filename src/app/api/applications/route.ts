import { currentPersona, json } from "@/lib/session";

type App = { id: string; upo: string; typ: string; adresat: string; dane: Record<string, unknown>; status: string; zlozono: string; osoba: string };
const g = globalThis as unknown as { __apps?: App[] };
const store = () => (g.__apps ??= []);

const ADRESAT: Record<string, string> = {
  urlop_macierzynski: "Pracodawca",
  urlop_rodzicielski: "Pracodawca",
  urlop_ojcowski: "Pracodawca",
  urlop_uzupelniajacy: "Pracodawca",
  praca_rodzicielski: "Pracodawca",
  ZAM: "ZUS (PUE/eZUS)",
  "ZAS-53": "ZUS (PUE/eZUS)",
  odpis_aktu: "Urząd Stanu Cywilnego (rejestr stanu cywilnego)",
  pytanie_pue: "ZUS – Centrum Obsługi Telefonicznej / e-wizyta",
  zaswiadczenie: "ZUS (PUE/eZUS)",
};

/** GET – wnioski złożone w tej sesji (symulacja skrzynki) */
export async function GET(req: Request) {
  const p = await currentPersona(req);
  return json({ items: store().filter((a) => !p || a.osoba === p.id).slice().reverse() });
}

/** POST {typ, dane, adresat?} – symulacja wysłania wniosku do pracodawcy / ZUS / USC; zwraca UPO */
export async function POST(req: Request) {
  const p = await currentPersona(req);
  const { typ, dane, adresat } = await req.json();
  if (!typ) return json({ error: "Brak typu wniosku" }, 400);
  const now = new Date();
  const id = `W-${now.getTime().toString(36).toUpperCase()}`;
  const app: App = {
    id,
    upo: `UPO/${now.toISOString().slice(0, 10).replace(/-/g, "")}/${Math.floor(Math.random() * 900000 + 100000)}`,
    typ,
    adresat: adresat || ADRESAT[typ] || "ZUS",
    dane: dane || {},
    status: typ === "pytanie_pue" ? "Przekazano konsultantowi – odpowiedź w ciągu 2 dni roboczych (symulacja)"
      : typ === "zaswiadczenie" ? (String(adresat || "").startsWith("ZUS") ? "Przyjęto – zaświadczenie zostanie wydane bez zbędnej zwłoki, najpóźniej w ciągu 7 dni (symulacja)" : "Wysłano prośbę do płatnika składek (symulacja)")
      : "Doręczono (symulacja)",
    zlozono: now.toISOString(),
    osoba: p?.id || "anonim",
  };
  store().push(app);
  return json({ ok: true, application: app });
}
