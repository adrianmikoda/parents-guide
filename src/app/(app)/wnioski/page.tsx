"use client";
import { Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import { useApp } from "@/components/AppContext";
import { addDays, addMonths, documentsFor, fmtDate, isEmployee, isSelfEmployed, isValidDate, Title, TITLE_LABELS, weeksByChildren } from "@/lib/engine";
import type { Params } from "@/lib/params";
import { loadApps, sendApp, SentApp } from "@/lib/apps-client";

type F = { name: string; label: string; type?: "text" | "date" | "number" | "select" | "textarea"; options?: string[]; hint?: string };
type Ctx = { due: string; params: Params; children: number };
type Spec = {
  key: string; title: string; to: string; desc: string; fields: F[];
  body: (d: Record<string, string>, c: Ctx) => string;
  validate: (d: Record<string, string>, c: Ctx) => Record<string, string>;
  zusForm?: string;
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
  {
    key: "urlop_macierzynski", title: "Wniosek o urlop macierzyński (i rodzicielski)", to: "Pracodawca", desc: "Jeden wniosek może obejmować urlop macierzyński i bezpośrednio po nim rodzicielski.",
    fields: [
      { name: "start", label: "Początek urlopu macierzyńskiego", type: "date", hint: "najwcześniej 6 tygodni przed przewidywaną datą porodu, najpóźniej w dniu porodu" },
      { name: "dzieci", label: "Liczba dzieci urodzonych przy jednym porodzie", type: "number" },
      { name: "rodzicielski", label: "Urlop rodzicielski bezpośrednio po macierzyńskim", type: "select", options: ["Nie", "Tak – w pełnym wymiarze", "Tak – w części"] },
      { name: "tygodnie", label: "Wymiar urlopu rodzicielskiego (tyg.)", type: "number", hint: "tylko przy wyborze „w części”" },
      { name: "stawka", label: "Stawka zasiłku", type: "select", options: ["100% / 70%", "81,5% za cały okres (wniosek do 21 dni po porodzie)"] },
    ],
    body: (d, c) => {
      const n = int(d.dzieci);
      const weeks = d.rodzicielski === "Tak – w pełnym wymiarze" ? String(poolFor({ ...c, children: n || 1 })) : v(d.tygodnie);
      return `Proszę o udzielenie urlopu macierzyńskiego od dnia ${date(d.start)} w wymiarze przysługującym przy urodzeniu ${Number.isFinite(n) && n > 0 ? n : "—"} ${n === 1 ? "dziecka" : "dzieci"} przy jednym porodzie.${d.rodzicielski?.startsWith("Tak") ? `\nJednocześnie wnoszę o udzielenie, bezpośrednio po urlopie macierzyńskim, urlopu rodzicielskiego w wymiarze ${weeks} tygodni.` : ""}\nWnioskowana stawka zasiłku macierzyńskiego: ${v(d.stawka)}.\nZałączniki: skrócony odpis aktu urodzenia dziecka (lub zaświadczenie lekarskie o przewidywanej dacie porodu).`;
    },
    validate: (d, c) => {
      const e: Record<string, string> = {};
      needDate(d, e, "start");
      need(d, e, ["rodzicielski", "stawka"]);
      const W = c.params.wymiary;
      if (isValidDate(d.start) && isValidDate(c.due)) {
        if (d.start < addDays(c.due, -W.przedPorodemMaxTygodnie * 7)) e.start = `Urlop może zacząć się najwcześniej ${W.przedPorodemMaxTygodnie} tyg. przed porodem (${fmtDate(addDays(c.due, -W.przedPorodemMaxTygodnie * 7))}).`;
        else if (d.start > c.due) e.start = `Urlop macierzyński zaczyna się najpóźniej w dniu porodu (${fmtDate(c.due)}).`;
      }
      const n = int(d.dzieci);
      if (!(n >= 1 && n <= 6)) e.dzieci = "Podaj liczbę dzieci od 1 do 6.";
      if (d.rodzicielski === "Tak – w części") {
        const t = int(d.tygodnie);
        const max = poolFor({ ...c, children: n || 1 }) - W.nieprzenoszalnaCzescTygodnie;
        if (!(t >= 1 && t <= max)) e.tygodnie = `Podaj liczbę tygodni od 1 do ${max}.`;
      }
      if (d.stawka?.startsWith("81,5")) {
        if (!d.rodzicielski?.startsWith("Tak")) e.stawka = "Stawka 81,5% wymaga jednoczesnego wniosku o urlop rodzicielski.";
        else if (isValidDate(c.due) && today() > addDays(c.due, c.params.terminy.jednolityWniosekDni))
          e.stawka = `Termin na wniosek o 81,5% minął (${c.params.terminy.jednolityWniosekDni} dni po porodzie: ${fmtDate(addDays(c.due, c.params.terminy.jednolityWniosekDni))}). Wybierz 100% / 70%.`;
      }
      return e;
    },
  },
  {
    key: "urlop_na_warunkach", title: "Wniosek o urlop na warunkach urlopu macierzyńskiego", to: "Pracodawca", desc: "Przy przysposobieniu dziecka lub w rodzinie zastępczej niezawodowej.",
    fields: [
      { name: "od", label: "Początek urlopu (dzień przyjęcia dziecka lub później)", type: "date" },
      { name: "dzieci", label: "Liczba przyjętych dzieci", type: "number" },
      { name: "podstawa", label: "Podstawa", type: "select", options: ["przysposobienie (wniosek do sądu złożony)", "rodzina zastępcza niezawodowa"] },
    ],
    body: (d) => `Proszę o udzielenie urlopu na warunkach urlopu macierzyńskiego od dnia ${date(d.od)} w związku z przyjęciem na wychowanie ${v(d.dzieci)} ${d.dzieci === "1" ? "dziecka" : "dzieci"} (${v(d.podstawa)}).\nZałącznik: zaświadczenie sądu o wszczęciu postępowania o przysposobienie / postanowienie o umieszczeniu w rodzinie zastępczej.`,
    validate: (d) => {
      const e: Record<string, string> = {};
      needDate(d, e, "od");
      need(d, e, ["podstawa"]);
      const n = int(d.dzieci);
      if (!(n >= 1 && n <= 6)) e.dzieci = "Podaj liczbę dzieci od 1 do 6.";
      return e;
    },
  },
  {
    key: "urlop_rodzicielski", title: "Wniosek o urlop rodzicielski (lub jego część)", to: "Pracodawca", desc: "Składany 21 dni przed rozpoczęciem; do 5 części.",
    fields: [
      { name: "od", label: "Od", type: "date", hint: "zwykle dzień po zakończeniu urlopu macierzyńskiego" }, { name: "do", label: "Do", type: "date" },
      { name: "czesc", label: "Która część", type: "select", options: ["1", "2", "3", "4", "5"] },
      { name: "drugi", label: "Drugi rodzic korzysta z urlopu", type: "select", options: ["Nie", "Tak – jednocześnie", "Tak – w innym terminie"] },
    ],
    body: (d) => `Proszę o udzielenie urlopu rodzicielskiego (część ${v(d.czesc)}) w okresie od ${date(d.od)} do ${date(d.do)}.\nOświadczenie o korzystaniu z urlopu przez drugiego rodzica: ${v(d.drugi)}.`,
    validate: (d, c) => {
      const e: Record<string, string> = {};
      needDate(d, e, "od"); needDate(d, e, "do"); order(d, e, "od", "do");
      need(d, e, ["czesc", "drugi"]);
      if (isValidDate(d.od) && isValidDate(c.due) && d.od < c.due) e.od = "Urlop rodzicielski zaczyna się po urodzeniu dziecka.";
      if (isValidDate(d.od) && isValidDate(d.do) && !e.do) {
        const weeks = (new Date(d.do).getTime() - new Date(d.od).getTime()) / 86400000 / 7 + 1 / 7;
        if (weeks > poolFor(c)) e.do = `Urlop rodzicielski trwa maks. ${poolFor(c)} tyg.`;
      }
      return e;
    },
  },
  {
    key: "urlop_ojcowski", title: "Wniosek o urlop ojcowski", to: "Pracodawca", desc: "14 dni, w całości lub w 2 częściach po 7 dni; wniosek 7 dni przed.",
    fields: [
      { name: "dziecko", label: "Data urodzenia dziecka", type: "date" },
      { name: "od", label: "Od", type: "date" },
      { name: "dni", label: "Liczba dni", type: "select", options: ["14", "7"] },
    ],
    body: (d) => `Proszę o udzielenie urlopu ojcowskiego w wymiarze ${v(d.dni)} dni od dnia ${date(d.od)}, w związku z urodzeniem dziecka w dniu ${date(d.dziecko)}.\nZałącznik: skrócony odpis aktu urodzenia dziecka.`,
    validate: (d, c) => {
      const e: Record<string, string> = {};
      needDate(d, e, "dziecko"); needDate(d, e, "od"); need(d, e, ["dni"]);
      if (d.dni && !["7", "14"].includes(d.dni)) e.dni = "Urlop ojcowski trwa 14 dni albo 7 dni (jedna z dwóch części).";
      if (isValidDate(d.dziecko) && isValidDate(d.od) && !e.od) {
        const limit = addMonths(d.dziecko, c.params.wymiary.ojcowskiDoMiesiacaZycia);
        if (d.od < d.dziecko) e.od = "Urlop ojcowski zaczyna się najwcześniej w dniu urodzenia dziecka.";
        else if (addDays(d.od, (Number(d.dni) || 14) - 1) > limit) e.od = `Urlop trzeba wykorzystać do ukończenia przez dziecko ${c.params.wymiary.ojcowskiDoMiesiacaZycia} miesięcy (${fmtDate(limit)}).`;
      }
      return e;
    },
  },
  {
    key: "urlop_uzupelniajacy", title: "Wniosek o uzupełniający urlop macierzyński", to: "Pracodawca", desc: "Wcześniak lub hospitalizacja noworodka – bezpośrednio po macierzyńskim.",
    fields: [{ name: "tydzien", label: "Tydzień ciąży przy porodzie", type: "number" }, { name: "masa", label: "Masa urodzeniowa (g)", type: "number" }, { name: "szpital", label: "Okres hospitalizacji (od–do)", type: "text" }],
    body: (d) => `Proszę o udzielenie uzupełniającego urlopu macierzyńskiego bezpośrednio po urlopie macierzyńskim.\nDziecko urodziło się w ${v(d.tydzien)}. tygodniu ciąży, masa urodzeniowa ${v(d.masa)} g, hospitalizacja: ${v(d.szpital)}.\nZałącznik: zaświadczenie wydane przez szpital.`,
    validate: (d) => {
      const e: Record<string, string> = {};
      const t = int(d.tydzien);
      if (!(t >= 20 && t <= 42)) e.tydzien = "Podaj tydzień ciąży od 20 do 42.";
      const m = int(d.masa);
      if (!(m >= 200 && m <= 7000)) e.masa = "Podaj masę urodzeniową w gramach (200–7000).";
      need(d, e, ["szpital"]);
      return e;
    },
  },
  {
    key: "praca_rodzicielski", title: "Wniosek o łączenie urlopu rodzicielskiego z pracą", to: "Pracodawca", desc: "Praca do ½ etatu – urlop wydłuża się proporcjonalnie.",
    fields: [{ name: "od", label: "Od", type: "date" }, { name: "wymiar", label: "Wymiar pracy", type: "select", options: ["1/4 etatu", "1/3 etatu", "1/2 etatu"] }],
    body: (d) => `Proszę o umożliwienie mi wykonywania pracy w wymiarze ${v(d.wymiar)} w trakcie urlopu rodzicielskiego od dnia ${date(d.od)}. Wniosek składam nie później niż 21 dni przed rozpoczęciem pracy.`,
    validate: (d) => {
      const e: Record<string, string> = {};
      needDate(d, e, "od"); need(d, e, ["wymiar"]);
      if (isValidDate(d.od) && d.od < addDays(today(), 21)) e.od = `Wniosek składa się co najmniej 21 dni wcześniej – najwcześniejszy możliwy początek to ${fmtDate(addDays(today(), 21))}.`;
      return e;
    },
  },
  {
    key: "ZAM", title: "ZAM – wniosek o zasiłek macierzyński (symulacja)", to: "ZUS (PUE/eZUS)", desc: "Dla osób niebędących pracownikami (zlecenie, działalność). Od 24.10.2026 obejmuje też dawne ZUR i ZAO.", zusForm: ZUS_FORMS,
    fields: [
      { name: "okres", label: "Zasiłek za okres", type: "select", options: ["urlopu macierzyńskiego", "urlopu macierzyńskiego i rodzicielskiego", "urlopu rodzicielskiego", "urlopu ojcowskiego", "urlopu na warunkach urlopu macierzyńskiego"] },
      { name: "od", label: "Od", type: "date" }, { name: "do", label: "Do", type: "date" },
      { name: "rachunek", label: "Numer rachunku bankowego", type: "text" },
      { name: "stawka", label: "Stawka", type: "select", options: ["100% / 70%", "81,5%"] },
    ],
    body: (d) => `Wnoszę o wypłatę zasiłku macierzyńskiego za okres ${v(d.okres)}: ${date(d.od)} – ${date(d.do)}.\nStawka: ${v(d.stawka)}. Rachunek: ${v(d.rachunek)}.`,
    validate: (d, c) => {
      const e: Record<string, string> = {};
      need(d, e, ["okres", "stawka"]); needDate(d, e, "od"); needDate(d, e, "do"); order(d, e, "od", "do"); account(d, e);
      if (d.stawka === "81,5%" && isValidDate(c.due) && today() > addDays(c.due, c.params.terminy.jednolityWniosekDni))
        e.stawka = `Termin na wniosek o 81,5% minął (${fmtDate(addDays(c.due, c.params.terminy.jednolityWniosekDni))}).`;
      return e;
    },
  },
  {
    key: "ZAS-53", title: "ZAS-53 – wniosek o zasiłek chorobowy (symulacja)", to: "ZUS (PUE/eZUS)", desc: "Dla przedsiębiorców; Z-3b zlikwidowany.", zusForm: ZUS_FORMS,
    fields: [{ name: "zla", label: "Seria i numer e-ZLA", type: "text" }, { name: "rachunek", label: "Numer rachunku bankowego", type: "text" }, { name: "praca", label: "Czy w okresie zwolnienia wykonujesz pracę zarobkową?", type: "select", options: ["Nie", "Tak"] }],
    body: (d) => `Wnoszę o wypłatę zasiłku chorobowego na podstawie zaświadczenia lekarskiego ${v(d.zla)}.\nOświadczam, że w okresie niezdolności do pracy ${d.praca === "Tak" ? "WYKONUJĘ" : d.praca === "Nie" ? "nie wykonuję" : "—"} pracy zarobkowej. Rachunek: ${v(d.rachunek)}.`,
    validate: (d) => {
      const e: Record<string, string> = {};
      need(d, e, ["zla", "praca"]); account(d, e);
      return e;
    },
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

const BENEFIT_SPEC = (benefit: string, title: Title): string | null => {
  const emp = isEmployee(title);
  if (benefit === "chorobowy") return isSelfEmployed(title) ? "ZAS-53" : null;
  if (!emp) return "ZAM";
  return { macierzynski: "urlop_macierzynski", rodzicielski: "urlop_rodzicielski", ojcowski: "urlop_ojcowski", uzupelniajacy: "urlop_uzupelniajacy", adopcja: "urlop_na_warunkach" }[benefit] ?? null;
};

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
  const ctx: Ctx = { due, params, children };

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
    return {
      start: due, dzieci: String(children), od: specKey === "urlop_rodzicielski" ? macEnd : specKey === "urlop_na_warunkach" ? due : "",
      dziecko: specKey === "urlop_ojcowski" ? born || due : "", data: born, dni: "14", czesc: "1",
      ...(qWeeks && specKey === "urlop_macierzynski" ? { rodzicielski: "Tak – w części", tygodnie: qWeeks } : {}),
      ...(sp.get("jednolity") === "1" && specKey === "urlop_macierzynski" ? { stawka: "81,5% za cały okres (wniosek do 21 dni po porodzie)" } : {}),
      ...(me?.przyjecie ? { podstawa: me.przyjecie.rodzaj === "zastepcza" ? "rodzina zastępcza niezawodowa" : "przysposobienie (wniosek do sądu złożony)" } : {}),
    };
  }, [due, children, specKey, me, params, sp]);
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
      <div className="card" data-guide="t-wnioski-lista">
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

      <div className="section-title">Wypełnij wniosek</div>
      <div className="pill-tabs mb" data-guide="t-wnioski-formularze">
        {SPECS.map((s) => <button key={s.key} data-guide={`wniosek-${s.key}`} aria-pressed={s.key === specKey} className={s.key === specKey ? "on" : ""} onClick={() => chooseSpec(s.key)}>{s.title.split(" (")[0].replace("Wniosek o ", "")}</button>)}
      </div>
      <div className="grid wn-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", alignItems: "start" }}>
        <div className="card" data-guide="t-wnioski-formularz">
          <h2>{spec.title}</h2>
          <p className="muted">{spec.desc} Adresat: <b>{recipient}</b>.</p>
          {wrongTitle && <div className="alert a-warn mb"><Icon name="alert" size={18} /><span>Ten wniosek składa pracownik u pracodawcy. Przy tytule „{TITLE_LABELS[title]}” złóż <button className="linkbtn" onClick={() => chooseSpec("ZAM")}>wniosek ZAM</button>{isSelfEmployed(title) ? " do ZUS" : ""}.</span></div>}
          {spec.zusForm && <p><a href={spec.zusForm} target="_blank" rel="noreferrer">Wzory formularzy na zus.pl ↗</a></p>}
          <div className="grid" style={{ gap: 10 }}>
            {spec.fields.filter((f) => f.name !== "tygodnie" || data.rodzicielski === "Tak – w części").map((f) => (
              <Field key={spec.key + f.name} f={f} value={data[f.name] ?? ""} error={touched ? errors[f.name] : undefined} onChange={(val) => setField(f.name, val)} />
            ))}
          </div>
          {drafts[specKey] && <button className="linkbtn mt" style={{ fontSize: 14 }} onClick={() => setDrafts((d) => { const n = { ...d }; delete n[specKey]; return n; })}>Wyczyść formularz</button>}
        </div>
        <div className="card wn-preview" data-guide="t-wnioski-podglad">
          <div className="card-head"><h2 style={{ margin: 0 }}>Podgląd</h2><button className="btn btn-outline" data-guide="wnioski-drukuj" onClick={() => window.print()}><Icon name="print" size={16} /> Drukuj</button></div>
          <div className="paper" style={{ fontFamily: "Georgia, serif", fontSize: 14 }}>
            <div style={{ textAlign: "right" }}>{fmtDate(today())}</div>
            <div>{header}</div>
            <div style={{ margin: "12px 0", textAlign: "right" }}><b>{recipient}</b></div>
            <div style={{ textAlign: "center", fontWeight: 700, margin: "10px 0" }}>{spec.title.replace(" (symulacja)", "").toUpperCase()}</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{text}</div>
            <div style={{ marginTop: 24, textAlign: "right" }}>podpis: {me ? "podpis zaufany / mObywatel (symulacja)" : "……………"}</div>
          </div>
          {touched && errCount > 0 && <div className="alert a-err mt" role="alert"><Icon name="alert" size={18} /><span>Popraw {errCount === 1 ? "1 pole" : `${errCount} ${errCount < 5 ? "pola" : "pól"}`} w formularzu, aby wysłać wniosek.</span></div>}
          {sendErr && <div className="alert a-err mt" role="alert"><Icon name="alert" size={18} /><span>{sendErr}</span></div>}
          <div className="row mt">
            <button className="btn btn-primary" data-guide="wnioski-wyslij" disabled={busy || wrongTitle} aria-disabled={busy || wrongTitle} onClick={send}><Icon name="send" size={18} /> {busy ? "Wysyłanie…" : `Wyślij do: ${recipient}`}</button>
          </div>
          {sent && <div className="alert a-ok mt" role="status"><Icon name="check" size={18} /><span>Wysłano (symulacja). Urzędowe poświadczenie odbioru: <b>{sent.upo}</b>. Status: {sent.status}</span></div>}
        </div>
      </div>

      {list.length > 0 && (
        <div className="card mt">
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
