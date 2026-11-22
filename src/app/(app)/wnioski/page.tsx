"use client";
import { Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import { useApp } from "@/components/AppContext";
import { addDays, addMonths, documentsFor, fmtDate, isEmployee, isSelfEmployed, isValidDate, Title, TITLE_LABELS, weeksByChildren } from "@/lib/engine";
import type { Params } from "@/lib/params";
import type { Persona } from "@/lib/mock";
import { loadApps, sendApp, SentApp } from "@/lib/apps-client";
import { OfficialInputs, OfficialPaper } from "@/components/OfficialForm";
import { OfficialForm, summary, validateZAM, validateZAS53, ZAM, ZAS53 } from "@/lib/zusforms";
import { summaryPayer, validateZ3, validateZ3a, validateZAS12, Z3, Z3A, ZAS12 } from "@/lib/zusforms-platnik";
import { EMPLOYER_SPECS, type F } from "@/lib/wnioski-pracodawca";

type Ctx = { due: string; params: Params; children: number; title: Title; birth?: string };
type Spec = {
  key: string; title: string; to: string; desc: string; fields: F[];
  body: (d: Record<string, string>, c: Ctx) => string;
  validate: (d: Record<string, string>, c: Ctx) => Record<string, string>;
  zusForm?: string;
  /** paragraf rozporządzenia (Dz.U. 2025 poz. 322) – wnioski do pracodawcy */
  par?: string;
  /** formularz ZUS odwzorowany 1:1 – zamiast pól i pisma */
  official?: OfficialForm;
};

const ZUS_FORMS = "https://www.zus.pl/wzory-formularzy/zasilki";
const today = () => new Date().toISOString().slice(0, 10);
const v = (x?: string) => (x && x.trim() ? x.trim() : "—");
const date = (x?: string) => (isValidDate(x) ? fmtDate(x) : "—");
const int = (x?: string) => (x && /^\d+$/.test(x.trim()) ? Number(x) : NaN);
const NAME = /^[\p{L}][\p{L}\p{M} '’.-]*$/u;
const iban = (x?: string) => (x ?? "").replace(/\s/g, "").replace(/^PL/i, "");
const GEN: Record<string, string> = { "skrócony": "skróconego", "zupełny": "zupełnego", "wielojęzyczny": "wielojęzycznego" };
const poolFor = (c: Ctx) => (c.children > 1 ? c.params.wymiary.rodzicielskiWiele : c.params.wymiary.rodzicielskiJedno);

/** Wspólne reguły pól: wymagane, poprawna data, kolejność dat. */
function need(d: Record<string, string>, e: Record<string, string>, names: string[]) {
  for (const n of names) if (!d[n]?.trim()) e[n] ??= "To pole jest wymagane.";
}
function needDate(d: Record<string, string>, e: Record<string, string>, n: string) {
  if (!d[n]) e[n] ??= "Podaj datę.";
  else if (!isValidDate(d[n])) e[n] ??= "Podaj poprawną datę.";
}
function order(d: Record<string, string>, e: Record<string, string>, from: string, to: string) {
  if (isValidDate(d[from]) && isValidDate(d[to]) && d[to] < d[from]) e[to] ??= "Data końcowa nie może być wcześniejsza niż początkowa.";
}
function account(d: Record<string, string>, e: Record<string, string>) {
  if (!d.rachunek?.trim()) e.rachunek = "Podaj numer rachunku.";
  else if (!/^\d{26}$/.test(iban(d.rachunek))) e.rachunek = "Numer rachunku ma 26 cyfr (spacje i „PL” na początku są dopuszczalne).";
}

const SPECS: Spec[] = [
  ...EMPLOYER_SPECS,
  {
    key: "ZAM", title: "ZAM – Wniosek o zasiłek macierzyński", to: "ZUS (PUE/eZUS)", zusForm: ZUS_FORMS, official: ZAM, fields: [],
    desc: "Wzór ZUS. Jeden wniosek obejmuje wszystkie okresy: urlop macierzyński (albo na warunkach urlopu macierzyńskiego), rodzicielski, uzupełniający i ojcowski. Składasz go temu, kto wypłaca zasiłek – płatnikowi składek albo ZUS.",
    body: (d) => summary(ZAM, d),
    validate: (d, c) => validateZAM(d, { params: c.params, children: c.children, birth: c.birth, selfEmployed: isSelfEmployed(c.title), today: today() }),
  },
  {
    key: "ZAS-53", title: "ZAS-53 – Wniosek o zasiłek chorobowy", to: "ZUS (PUE/eZUS)", zusForm: ZUS_FORMS, official: ZAS53, fields: [],
    desc: "Wzór ZUS. Dla prowadzących działalność i osób z nimi współpracujących, duchownych, marynarzy oraz osób niezdolnych do pracy z powodu choroby po ustaniu zatrudnienia/ubezpieczenia.",
    body: (d) => summary(ZAS53, d),
    validate: (d, c) => validateZAS53(d, { params: c.params, today: today() }),
  },
  {
    key: "Z-3", title: "Z-3 – Zaświadczenie płatnika składek (pracownik)", to: "ZUS (PUE/eZUS)", zusForm: ZUS_FORMS, official: Z3, fields: [],
    desc: "Wzór ZUS. Wypełnia pracodawca, gdy zasiłek ustala i wypłaca ZUS (płatnik zgłasza do ubezpieczenia chorobowego nie więcej niż 20 osób). Możesz przygotować dane i przekazać je pracodawcy.",
    body: (d) => summaryPayer("Z-3", d),
    validate: (d) => validateZ3(d, { today: today() }),
  },
  {
    key: "Z-3a", title: "Z-3a – Zaświadczenie płatnika składek (zlecenie i inne tytuły)", to: "ZUS (PUE/eZUS)", zusForm: ZUS_FORMS, official: Z3A, fields: [],
    desc: "Wzór ZUS. Wypełnia płatnik składek (np. zleceniodawca) dla osoby niebędącej pracownikiem – z wyłączeniem prowadzących działalność, osób współpracujących, duchownych i marynarzy.",
    body: (d) => summaryPayer("Z-3a", d),
    validate: (d) => validateZ3a(d, { today: today() }),
  },
  {
    key: "ZAS-12", title: "ZAS-12 – Zaświadczenie płatnika składek (dalszy okres)", to: "ZUS (PUE/eZUS)", zusForm: ZUS_FORMS, official: ZAS12, fields: [],
    desc: "Wzór ZUS. Wypełnia płatnik składek, gdy ZUS ma ustalić prawo do zasiłku chorobowego lub opiekuńczego za dalszy okres nieprzerwanej niezdolności do pracy.",
    body: (d) => summaryPayer("ZAS-12", d),
    validate: (d) => validateZAS12(d, { today: today() }),
  },
  {
    key: "odpis_aktu", title: "Odpis aktu urodzenia (rejestr stanu cywilnego – symulacja)", to: "Urząd Stanu Cywilnego", desc: "Odpis skrócony lub zupełny – potrzebny pracodawcy/ZUS.",
    fields: [{ name: "rodzaj", label: "Rodzaj odpisu", type: "select", options: ["skrócony", "zupełny", "wielojęzyczny"] }, { name: "dziecko", label: "Imię i nazwisko dziecka", type: "text" }, { name: "data", label: "Data urodzenia", type: "date" }, { name: "miejsce", label: "Miejsce urodzenia", type: "text" }, { name: "forma", label: "Forma", type: "select", options: ["elektroniczna (skrzynka)", "papierowa – odbiór w USC"] }],
    body: (d) => `Wnoszę o wydanie odpisu ${GEN[d.rodzaj] ?? "—"} aktu urodzenia dziecka ${v(d.dziecko)}, urodzonego ${date(d.data)} w ${v(d.miejsce)}. Forma: ${v(d.forma)}. Cel: przedłożenie pracodawcy/ZUS w sprawie zasiłku macierzyńskiego.`,
    validate: (d) => {
      const e: Record<string, string> = {};
      need(d, e, ["rodzaj", "dziecko", "miejsce", "forma"]); needDate(d, e, "data");
      if (d.dziecko?.trim() && !NAME.test(d.dziecko.trim())) e.dziecko = "Imię i nazwisko może zawierać tylko litery, spacje i myślnik.";
      if (isValidDate(d.data) && d.data > today()) e.data = "Odpis można zamówić po urodzeniu i rejestracji dziecka.";
      return e;
    },
  },
];

const SHORT: Record<string, string> = {
  urlop_macierzynski: "Macierzyński przed porodem", rezygnacja_macierzynski: "Rezygnacja z macierzyńskiego", pozostala_czesc: "Pozostała część macierzyńskiego",
  czesc_sytuacja: "Macierzyński – sytuacja szczególna", urlop_uzupelniajacy: "Uzupełniający macierzyński", urlop_rodzicielski: "Rodzicielski",
  praca_rodzicielski: "Rodzicielski + praca", urlop_ojcowski: "Ojcowski", urlop_na_warunkach: "Na warunkach macierzyńskiego",
  urlop_wychowawczy: "Wychowawczy", obnizenie_wymiaru: "Obniżenie wymiaru (zamiast wychowawczego)", odpis_aktu: "Odpis aktu urodzenia",
};
const tabLabel = (s: Spec) => SHORT[s.key] ?? s.title.split(" – ")[0];

const BENEFIT_SPEC = (benefit: string, title: Title): string | null => {
  const emp = isEmployee(title);
  if (benefit === "chorobowy") return isSelfEmployed(title) ? "ZAS-53" : null;
  if (!emp) return "ZAM";
  return { macierzynski: "urlop_macierzynski", rodzicielski: "urlop_rodzicielski", ojcowski: "urlop_ojcowski", uzupelniajacy: "urlop_uzupelniajacy", adopcja: "urlop_na_warunkach" }[benefit] ?? null;
};

/** Dane do formularzy ZUS, które wynikają z profilu (bez zgadywania adresu czy miejsca urodzenia). */
function officialDefaults(key: string, me: Persona | undefined, title: Title, due: string, children: number, params: Params): Record<string, string> {
  const d: Record<string, string> = { dataWniosku: today() };
  if (me) {
    Object.assign(d, { pesel: /^\d{11}$/.test(me.pesel ?? "") ? me.pesel : "", imie: me.imie, nazwisko: me.nazwisko });
    if (isSelfEmployed(title)) d.pNazwa = `${me.imie} ${me.nazwisko}`;
    else if (me.platnik) Object.assign(d, { pNip: me.platnik.nip ?? "", pNazwa: me.platnik.nazwa });
  }
  const z = [...(me?.ezla ?? [])].sort((a, b) => (a.od < b.od ? 1 : -1))[0];
  if (key === "ZAS-53") {
    d.wOkresie = "X";
    if (z) Object.assign(d, { okres_od: z.od, okres_do: z.do, zla: z.seria });
    return d;
  }
  if (key === "Z-3" || key === "Z-3a" || key === "ZAS-12") {
    // dane płatnika i ubezpieczonego z profilu; okres – z ostatniego e-ZLA albo z planowanego urlopu macierzyńskiego
    if (me?.platnik) d[me.platnik.liczbaUbezpieczonych > params.kwoty.progPlatnikaUbezpieczonych ? "pow20" : "do20"] = "X";
    if (key !== "ZAS-12") d.pierwszorazowy = "X";
    if (key === "ZAS-12") d.trwa = "TAK";
    if (z) Object.assign(d, { zChor: "X", ok_zChor_od: z.od, ok_zChor_do: z.do, zla_zChor: z.seria });
    else if (key !== "ZAS-12" && isValidDate(due)) {
      const end = addDays(due, weeksByChildren(params.wymiary.macierzynski, children) * 7 - 1);
      Object.assign(d, { zMac: "X", ok_zMac_od: due, ok_zMac_do: end, ...(key === "Z-3" ? { u6mac: "X" } : {}) });
    }
    const months = [...(me?.przychody ?? [])].sort((a, b) => (a.miesiac < b.miesiac ? 1 : -1)).slice(0, 12).reverse();
    const kw = (n: number) => n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
    if (key === "Z-3" && me) {
      const etat = me.etat ?? 1;
      Object.assign(d, { zatr_od: me.ubezpieczenieOd, wymiar: ({ 1: "1/1", 0.75: "3/4", 0.5: "1/2", 0.25: "1/4" } as Record<number, string>)[etat] ?? String(etat), wymiarOd: me.ubezpieczenieOd });
      months.forEach((m, i) => Object.assign(d, { [`tMies_${i}_0`]: m.miesiac.slice(0, 4), [`tMies_${i}_1`]: String(Number(m.miesiac.slice(5, 7))), [`tMies_${i}_5`]: kw(m.kwota), [`tMies_${i}_8`]: "13,71" }));
    }
    if (key === "Z-3a" && me) {
      Object.assign(d, { ubChor: "TAK", tytul2: title.startsWith("zlecenie") ? "X" : "", podlChor_od: me.ubezpieczenieOd, ustal: "NIE" });
      months.forEach((m, i) => Object.assign(d, { [`tPrzych_${i}_0`]: m.miesiac.slice(0, 4), [`tPrzych_${i}_1`]: String(Number(m.miesiac.slice(5, 7))), [`tPrzych_${i}_4`]: kw(m.kwota) }));
    }
    return d;
  }
  if (title === "jdg_chorobowe") d.ubezpDobrowolne = "TAK";
  if (title === "jdg_bez") d.ubezpDobrowolne = "NIE";
  const W = params.wymiary;
  const born = me?.dzieci?.[0];
  if (me?.przyjecie) {
    const end = addDays(me.przyjecie.data, weeksByChildren(W.naWarunkachMacierzynskiego, children) * 7 - 1);
    Object.assign(d, { [me.przyjecie.rodzaj === "zastepcza" ? "p1zast" : "p1adop"]: "X", p1data: me.przyjecie.data, zWar: "X", okMac_od: me.przyjecie.data, okMac_do: end, koniecMac: end });
  } else if (isValidDate(due)) {
    const end = addDays(due, weeksByChildren(W.macierzynski, children) * 7 - 1);
    Object.assign(d, { zMac: "X", okMac_od: due, okMac_do: end, koniecMac: end });
    if (born) Object.assign(d, { p1: "X", dziecko1: `${born.imie} ${me?.nazwisko ?? ""}, ur. ${fmtDate(born.dataUrodzenia)}, ` });
    else Object.assign(d, { p2: "X", p2data: due });
  }
  return d;
}

const DRAFT_KEY = "pp_wnioski_draft";
function loadDrafts(): Record<string, Record<string, string>> {
  try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}"); } catch { return {}; }
}

function Field({ f, value, error, onChange }: { f: F; value: string; error?: string; onChange: (v: string) => void }) {
  const id = useId();
  const desc = error ? `${id}-err` : f.hint ? `${id}-hint` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{f.label}</label>
      {f.type === "select" ? (
        <select id={id} className="input" value={value} aria-invalid={!!error} aria-describedby={desc} onChange={(e) => onChange(e.target.value)}>
          <option value="">— wybierz —</option>{f.options!.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : f.type === "textarea" ? (
        <textarea id={id} className="input" rows={3} value={value} aria-invalid={!!error} aria-describedby={desc} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className="input" type={f.type || "text"} inputMode={f.type === "number" ? "numeric" : undefined} value={value} aria-invalid={!!error} aria-describedby={desc} onChange={(e) => onChange(e.target.value)} />
      )}
      {error ? <span id={`${id}-err`} className="hint" style={{ color: "var(--err)" }}>{error}</span> : f.hint && <span id={`${id}-hint`} className="hint">{f.hint}</span>}
    </div>
  );
}

function Wnioski() {
  const { params, profile, session } = useApp();
  const sp = useSearchParams();
  const me = profile?.person;
  const who = session?.id ?? "";
  const [title, setTitle] = useState<Title>("umowa_o_prace");
  const [benefit, setBenefit] = useState<Parameters<typeof documentsFor>[1]>("macierzynski");
  const [insured, setInsured] = useState(50);
  const [specKey, setSpecKey] = useState(SPECS[0].key);
  const spec = SPECS.find((s) => s.key === specKey) ?? SPECS[0];
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendErr, setSendErr] = useState("");
  const [sent, setSent] = useState<SentApp | null>(null);
  const [list, setList] = useState<SentApp[]>([]);
  const restored = useRef(false);

  // data wydarzenia: z adresu (plan z kalkulatora), z ciąży, z urodzenia lub z przyjęcia dziecka
  const qDate = sp.get("date");
  const due: string = (isValidDate(qDate) ? qDate : "") || me?.ciaza?.przewidywanyPorod || me?.przyjecie?.data || me?.dzieci?.[0]?.dataUrodzenia || "";
  const qChildren = Number(sp.get("children"));
  const children = qChildren >= 1 && qChildren <= 6 ? Math.round(qChildren) : 1;
  const ctx: Ctx = { due, params, children, title, birth: me?.dzieci?.[0]?.dataUrodzenia || due || undefined };

  useEffect(() => {
    if (me) { setTitle(me.title); setInsured(me.platnik?.liczbaUbezpieczonych ?? 0); if (me.przyjecie) setBenefit("adopcja"); }
  }, [me]);
  useEffect(() => { setList(loadApps(who)); }, [who, sent]);

  // szkice formularzy: przywróć z sessionStorage, zapisuj przy każdej zmianie
  useEffect(() => { if (!restored.current) { restored.current = true; setDrafts(loadDrafts()); } }, []);
  useEffect(() => { if (restored.current) try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(drafts)); } catch { /* brak pamięci przeglądarki */ } }, [drafts]);

  // wartości początkowe – tylko te, które wynikają z danych (bez wymyślania imion czy stawek)
  const defaults = useMemo((): Record<string, string> => {
    const W = params.wymiary;
    const born = me?.dzieci?.[0]?.dataUrodzenia || "";
    const macEnd = isValidDate(due) ? addDays(due, weeksByChildren(W.macierzynski, children) * 7) : "";
    const qWeeks = sp.get("weeks");
    const child = me?.dzieci?.[0];
    const emp = SPECS.find((x) => x.key === specKey)?.to === "Pracodawca";
    // urlop rodzicielski z kalkulatora: bezpośrednio po macierzyńskim, liczba tygodni z planu (przy 81,5% – pełny wymiar)
    const rodzWeeks = Number(qWeeks) > 0 ? Number(qWeeks) : (children > 1 ? W.rodzicielskiWiele : W.rodzicielskiJedno) - W.nieprzenoszalnaCzescTygodnie;
    return {
      ...(emp ? { imieNazwisko: me ? `${me.imie} ${me.nazwisko}` : "", dokUrodzenia: "odpis skrócony aktu urodzenia", przyjete: me?.przyjecie ? (me.przyjecie.rodzaj === "zastepcza" ? "Tak – rodzina zastępcza (z wyjątkiem zawodowej)" : "Tak – przysposobienie (wniosek do sądu opiekuńczego)") : "Nie – dziecko urodzone", dataPrzyjecia: me?.przyjecie?.data ?? "", odroczenie: "Nie" } : {}),
      ...(specKey === "urlop_rodzicielski" && macEnd ? { od: macEnd, do: addDays(macEnd, rodzWeeks * 7 - 1), wykorzystany: "nie wykorzystano", liczbaCzesci: "0", drugi: "nie zamierza korzystać z urlopu rodzicielskiego ani z zasiłku macierzyńskiego za ten okres", zaZyciem: "Nie" } : {}),
      ...(specKey === "urlop_uzupelniajacy" && macEnd ? { koniecMac: addDays(macEnd, -1), od: macEnd } : {}),
      ...(specKey === "urlop_ojcowski" ? { dataUrDziecka: born || due, od: born || "", do: born ? addDays(born, W.ojcowskiDni - 1) : "", przysposobione: me?.przyjecie?.rodzaj === "adopcja" ? "Tak" : "Nie", korzystal: "nie korzystałem z urlopu ojcowskiego" } : {}),
      ...(specKey === "urlop_na_warunkach" && me?.przyjecie ? { podstawa: me.przyjecie.rodzaj === "zastepcza" ? "jako rodzina zastępcza, z wyjątkiem rodziny zastępczej zawodowej" : "i wystąpienie do sądu opiekuńczego z wnioskiem o wszczęcie postępowania w sprawie przysposobienia", dzieci: String(children), od: me.przyjecie.data, do: addDays(me.przyjecie.data, weeksByChildren(W.naWarunkachMacierzynskiego, children) * 7 - 1) } : {}),
      ...((specKey === "urlop_wychowawczy" || specKey === "obnizenie_wymiaru") && child ? { dziecko: `${child.imie} ${me?.nazwisko ?? ""}`.trim() } : {}),
      ...(specKey === "odpis_aktu" ? { data: born } : {}),
      ...(SPECS.find((x) => x.key === specKey)?.official ? officialDefaults(specKey, me, title, due, children, params) : {}),
    };
  }, [due, children, specKey, me, params, sp, title]);
  const data = { ...defaults, ...(drafts[specKey] ?? {}) };
  const setField = (k: string, val: string) => { setSent(null); setSendErr(""); setDrafts((d) => ({ ...d, [specKey]: { ...(d[specKey] ?? {}), [k]: val } })); };

  const docs = useMemo(() => documentsFor(title, benefit, insured, params), [title, benefit, insured, params]);
  const errors = spec.validate(data, ctx);
  const errCount = Object.keys(errors).length;
  const text = spec.body(data, ctx);
  const employerForm = spec.to === "Pracodawca";
  const payerName = me?.platnik?.nazwa || "Pracodawca";
  const recipient = employerForm ? payerName : spec.key === "ZAM" && docs.payer !== "ZUS" ? payerName : spec.to;
  const wrongTitle = employerForm && !isEmployee(title);
  const header = me ? `${me.imie} ${me.nazwisko}${/^\d{11}$/.test(me.pesel ?? "") ? `, PESEL ${me.pesel}` : ", PESEL: —"}` : "Imię i nazwisko, PESEL (zaloguj się, aby uzupełnić)";
  const suggested = BENEFIT_SPEC(benefit, title);

  function chooseSpec(key: string) { setSpecKey(key); setTouched(false); setSent(null); setSendErr(""); }

  async function send() {
    setTouched(true);
    if (errCount || wrongTitle || busy) return;
    setBusy(true); setSendErr("");
    try {
      setSent(await sendApp(who, { typ: spec.key, dane: { ...data, tresc: text }, adresat: recipient }));
    } catch (e) {
      setSendErr(e instanceof Error ? e.message : "Nie udało się wysłać.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wnioski-page">
      <div className="card noprint" data-guide="t-wnioski-lista">
        <h1>Gdzie i jakie dokumenty złożyć?</h1>
        <p className="muted">Zasiłek wypłaca płatnik składek, jeśli zgłasza do ubezpieczenia chorobowego więcej niż {params.kwoty.progPlatnikaUbezpieczonych} osób – w pozostałych przypadkach ZUS. Przedsiębiorcom zawsze wypłaca ZUS.</p>
        <div className="grid g3">
          <div className="field"><label htmlFor="wn-title">Twój tytuł ubezpieczenia</label>
            <select id="wn-title" className="input" value={title} onChange={(e) => setTitle(e.target.value as Title)}>
              {(Object.keys(TITLE_LABELS) as Title[]).map((t) => <option key={t} value={t}>{TITLE_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="wn-benefit">Świadczenie</label>
            <select id="wn-benefit" className="input" value={benefit} onChange={(e) => setBenefit(e.target.value as typeof benefit)}>
              <option value="chorobowy">Zasiłek chorobowy w ciąży</option><option value="macierzynski">Zasiłek macierzyński – urlop macierzyński</option><option value="rodzicielski">Zasiłek macierzyński – urlop rodzicielski</option><option value="ojcowski">Zasiłek macierzyński – urlop ojcowski</option><option value="uzupelniajacy">Uzupełniający urlop macierzyński</option><option value="adopcja">Przyjęcie dziecka na wychowanie</option>
            </select>
          </div>
          {!isSelfEmployed(title) && <div className="field"><label htmlFor="wn-ins">Liczba ubezpieczonych u płatnika</label><input id="wn-ins" className="input" type="number" min={1} value={insured} onChange={(e) => setInsured(Math.max(0, parseInt(e.target.value, 10) || 0))} /></div>}
        </div>
        {["zlecenie_bez", "jdg_bez", "dzielo", "brak"].includes(title) ? (
          <div className="alert a-warn mt"><Icon name="alert" size={18} /><span>Przy tym tytule nie ma ubezpieczenia chorobowego, więc zasiłki z ZUS nie przysługują. Sprawdź świadczenie rodzicielskie i możliwość dobrowolnego ubezpieczenia (zakładka „Ryzyka”).</span></div>
        ) : (
          <div className="alert a-info mt"><Icon name="building" size={18} /><span>Zasiłek ustali i wypłaci: <b>{docs.payer}</b></span></div>
        )}
        <div className="steps mt" data-guide="wnioski-lista">
          {docs.steps.map((s, i) => (
            <div key={i} className="step"><div><b>{s.doc}</b><br /><small>Gdzie: {s.to} · Kiedy: {s.when}{s.note ? ` · ${s.note}` : ""}</small></div></div>
          ))}
        </div>
        {suggested && suggested !== specKey && (
          <div className="row mt"><button className="btn btn-outline" onClick={() => chooseSpec(suggested)}>Wypełnij: {SPECS.find((s) => s.key === suggested)?.title.replace(" (symulacja)", "")} <span className="chev">›</span></button></div>
        )}
        {benefit === "chorobowy" && !suggested && <p className="muted mt">Przy zasiłku chorobowym pracownika i zleceniobiorcy wniosek nie jest potrzebny – wystarczy e-ZLA wystawione przez lekarza.</p>}
      </div>

      <div className="section-title noprint">Wypełnij wniosek</div>
      <div className="noprint" data-guide="t-wnioski-formularze">
        {([
          ["Formularze ZUS (wzory 1:1)", SPECS.filter((s) => s.official)],
          ["Wnioski do pracodawcy (Dz.U. 2025 poz. 322)", SPECS.filter((s) => s.to === "Pracodawca")],
          ["Inne", SPECS.filter((s) => !s.official && s.to !== "Pracodawca")],
        ] as const).map(([label, list]) => (
          <div key={label} className="mb">
            <small className="muted" style={{ fontWeight: 600 }}>{label}</small>
            <div className="pill-tabs" role="group" aria-label={label}>
              {list.map((s) => <button key={s.key} data-guide={`wniosek-${s.key}`} aria-pressed={s.key === specKey} className={s.key === specKey ? "on" : ""} onClick={() => chooseSpec(s.key)}>{s.official ? s.key : tabLabel(s)}</button>)}
            </div>
          </div>
        ))}
      </div>
      <div className="grid wn-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", alignItems: "start" }}>
        <div className="card noprint" data-guide="t-wnioski-formularz">
          <h2>{spec.title}</h2>
          <p className="muted">{spec.desc} Adresat: <b>{recipient}</b>.</p>
          {spec.par && <p className="muted" style={{ fontSize: 14 }}>Treść i załączniki według {spec.par} rozporządzenia MRPiPS z 11 marca 2025 r. (Dz.U. 2025 poz. 322).</p>}
          {wrongTitle && <div className="alert a-warn mb"><Icon name="alert" size={18} /><span>Ten wniosek składa pracownik u pracodawcy. Przy tytule „{TITLE_LABELS[title]}” złóż <button className="linkbtn" onClick={() => chooseSpec("ZAM")}>wniosek ZAM</button>{isSelfEmployed(title) ? " do ZUS" : ""}.</span></div>}
          {spec.zusForm && <p><a href={spec.zusForm} target="_blank" rel="noreferrer">Wzory formularzy na zus.pl ↗</a></p>}
          {spec.official ? <OfficialInputs form={spec.official} values={data} errors={touched ? errors : {}} onChange={setField} /> : <div className="grid" style={{ gap: 10 }}>
            {spec.fields.filter((f) => !f.when || f.when(data)).map((f) => (
              <Field key={spec.key + f.name} f={f} value={data[f.name] ?? ""} error={touched ? errors[f.name] : undefined} onChange={(val) => setField(f.name, val)} />
            ))}
          </div>}
          {drafts[specKey] && <button className="linkbtn mt" style={{ fontSize: 14 }} onClick={() => setDrafts((d) => { const n = { ...d }; delete n[specKey]; return n; })}>Wyczyść formularz</button>}
        </div>
        <div className="card wn-preview" data-guide="t-wnioski-podglad">
          <div className="card-head noprint"><h2 style={{ margin: 0 }}>Podgląd</h2><button className="btn btn-outline" data-guide="wnioski-drukuj" onClick={() => window.print()}><Icon name="print" size={16} /> Drukuj</button></div>
          {spec.official ? <OfficialPaper form={spec.official} values={data} /> : <div className="paper" style={{ fontFamily: "Georgia, serif", fontSize: 14 }}>
            <div style={{ textAlign: "right" }}>{fmtDate(today())}</div>
            <div>{header}</div>
            <div style={{ margin: "12px 0", textAlign: "right" }}><b>{recipient}</b></div>
            <div style={{ textAlign: "center", fontWeight: 700, margin: "10px 0" }}>{spec.title.replace(" (symulacja)", "").toUpperCase()}</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{text}</div>
            <div style={{ marginTop: 24, textAlign: "right" }}>podpis: {me ? "podpis zaufany / mObywatel (symulacja)" : "……………"}</div>
          </div>}
          {touched && errCount > 0 && <div className="alert a-err mt" role="alert"><Icon name="alert" size={18} /><span>Popraw {errCount === 1 ? "1 pole" : `${errCount} ${errCount < 5 ? "pola" : "pól"}`} w formularzu, aby wysłać wniosek.</span></div>}
          {sendErr && <div className="alert a-err mt" role="alert"><Icon name="alert" size={18} /><span>{sendErr}</span></div>}
          <div className="row mt noprint">
            <button className="btn btn-primary" data-guide="wnioski-wyslij" disabled={busy || wrongTitle} aria-disabled={busy || wrongTitle} onClick={send}><Icon name="send" size={18} /> {busy ? "Wysyłanie…" : `Wyślij do: ${recipient}`}</button>
          </div>
          {sent && <div className="alert a-ok mt" role="status"><Icon name="check" size={18} /><span>Wysłano (symulacja). Urzędowe poświadczenie odbioru: <b>{sent.upo}</b>. Status: {sent.status}</span></div>}
        </div>
      </div>

      {list.length > 0 && (
        <div className="card mt noprint">
          <h2>Wysłane w tej sesji</h2>
          <small>Lista jest widoczna tylko w tej karcie przeglądarki.</small>
          <div className="list">
            {list.map((a) => (
              <div key={a.id + a.upo} className="li"><Icon name="doc" size={20} /><div className="grow"><b>{SPECS.find((s) => s.key === a.typ)?.title ?? (a.typ === "plan_urlopow" ? "Plan urlopów" : a.typ)}</b><br /><small>{a.adresat} · {new Date(a.zlozono).toLocaleString("pl-PL")} · {a.upo}</small></div><span className="badge b-ok">{a.status.split(" ")[0]}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div className="spinner" />}><Wnioski /></Suspense>;
}
