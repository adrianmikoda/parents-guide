import { assessRisks, computeBase, whoPays, TITLE_LABELS } from "@/lib/engine";
import { PERSONAS, ZUS_MESSAGES } from "@/lib/mock";
import { currentPersona, json } from "@/lib/session";
import { getParams } from "@/lib/store";

/** GET – symulacja pobrania danych z systemów ZUS (KSI/PUE) dla zalogowanej osoby */
export async function GET(req: Request) {
  const p = await currentPersona(req);
  if (!p) return json({ error: "Brak sesji – zaloguj się przez mObywatel (symulacja)" }, 401);
  const params = getParams();
  const base = computeBase({ title: p.title, months: p.przychody.slice(-12).map((m) => m.kwota), etat: p.etat }, params);
  const partner = p.partnerId ? PERSONAS.find((x) => x.id === p.partnerId) : undefined;
  const partnerBase = partner ? computeBase({ title: partner.title, months: partner.przychody.slice(-12).map((m) => m.kwota), etat: partner.etat }, params) : undefined;
  const risks = assessRisks(
    {
      title: p.title,
      insuranceStart: p.ubezpieczenieOd,
      dueDate: p.ciaza?.przewidywanyPorod,
      pregnancyStart: p.ciaza?.poczatek,
      contractEnd: p.ustanieZatrudnienia?.data ?? p.umowaDo,
      contractKind: p.rodzajUmowy,
      baseHistory: p.przychody.map((m) => ({ month: m.miesiac, base: m.kwota })),
      debt: p.zadluzenie,
      voluntaryPaidOnTime: p.skladkiTerminowo,
      zlaWithoutB: p.ezla.some((e) => e.kod !== "B") && !!p.ciaza,
    },
    params
  );
  return json({
    source: "wlasne" in p ? "Dane wpisane przez Ciebie (bez pobierania z ZUS)" : "ZUS – symulacja (dane fikcyjne)",
    wlasne: "wlasne" in p,
    brakujace: "brakujace" in p ? p.brakujace : [],
    nadpisane: "nadpisane" in p ? p.nadpisane : [],
    fetchedAt: new Date().toISOString(),
    person: { ...p, tytulLabel: TITLE_LABELS[p.title] },
    payer: p.platnik ? { ...p.platnik, wyplacaZasilki: whoPays(p.title, p.platnik.liczbaUbezpieczonych, params) } : null,
    base,
    partner: partner ? { id: partner.id, imie: partner.imie, nazwisko: partner.nazwisko, title: partner.title, base: partnerBase?.base, payer: partner.platnik } : null,
    risks,
    messages: ZUS_MESSAGES,
  });
}
