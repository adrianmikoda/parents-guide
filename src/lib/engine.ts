/**
 * Silnik reguł: ustalanie uprawnień i wyliczanie zasiłków.
 * Czyste funkcje (bez I/O) – używane zarówno przez REST API, jak i UI.
 * Logika jest deterministyczna, oparta na regułach (bez AI).
 */
import { Params } from "./params";

export const r2 = (n: number) => Math.round(n * 100) / 100;
const DAY = 86400000;
/** Czy tekst to istniejąca data RRRR-MM-DD (odrzuca np. „2027-13-40” i niepełne wartości z pola daty). */
export const isValidDate = (iso: unknown): iso is string => {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const t = new Date(iso + "T12:00:00Z");
  return !Number.isNaN(t.getTime()) && t.toISOString().startsWith(iso);
};
export const addDays = (iso: string, d: number) => {
  const t = new Date(iso + "T12:00:00Z").getTime() + d * DAY;
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : iso;
};
/** Ta sama data n miesięcy później (31.01 + 1 mies. → 28/29.02). */
export const addMonths = (iso: string, months: number) => {
  if (!isValidDate(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0, 12)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, last), 12)).toISOString().slice(0, 10);
};
export const diffDays = (a: string, b: string) =>
  Math.round((new Date(b + "T12:00:00Z").getTime() - new Date(a + "T12:00:00Z").getTime()) / DAY);
export const fmtDate = (iso?: string) =>
  iso && isValidDate(iso) ? new Date(iso + "T12:00:00Z").toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
export const zl = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł"; // twarda spacja: „zł” nie przeskakuje do nowej linii
/** Procent po polsku: 81,5% (przecinek dziesiętny). */
export const pct = (n: number) => `${n.toLocaleString("pl-PL", { maximumFractionDigits: 2 })}%`;
/** Kwota brutto, która po potrąceniu zaliczki na PIT daje co najmniej `net`. */
export const grossForNet = (net: number, pitPct: number) => Math.ceil((net / (1 - pitPct / 100)) * 100) / 100;

/* ───────────────────────── Tytuły ubezpieczenia ───────────────────────── */

export type Title =
  | "umowa_o_prace"
  | "zlecenie_chorobowe"
  | "zlecenie_bez"
  | "jdg_chorobowe"
  | "jdg_bez"
  | "dzielo"
  | "brak";

export const TITLE_LABELS: Record<Title, string> = {
  umowa_o_prace: "Umowa o pracę",
  zlecenie_chorobowe: "Umowa zlecenia – z dobrowolnym ubezpieczeniem chorobowym",
  zlecenie_bez: "Umowa zlecenia – bez ubezpieczenia chorobowego",
  jdg_chorobowe: "Działalność gospodarcza – z dobrowolnym ubezpieczeniem chorobowym",
  jdg_bez: "Działalność gospodarcza – bez ubezpieczenia chorobowego",
  dzielo: "Umowa o dzieło",
  brak: "Brak tytułu do ubezpieczenia",
};

export const hasSicknessInsurance = (t: Title) =>
  t === "umowa_o_prace" || t === "zlecenie_chorobowe" || t === "jdg_chorobowe";
export const isVoluntary = (t: Title) => t === "zlecenie_chorobowe" || t === "jdg_chorobowe";
export const isEmployee = (t: Title) => t === "umowa_o_prace";
export const isSelfEmployed = (t: Title) => t === "jdg_chorobowe" || t === "jdg_bez";

/** Kto ustala i wypłaca zasiłek (art. 61 ustawy zasiłkowej). */
export function whoPays(t: Title, insuredAtPayer: number, p: Params): "platnik" | "zus" {
  if (isSelfEmployed(t)) return "zus";
  return insuredAtPayer > p.kwoty.progPlatnikaUbezpieczonych ? "platnik" : "zus";
}

/* ───────────────────────── Podstawa wymiaru ───────────────────────── */

export type BaseInput = {
  title: Title;
  /** przychody brutto (pracownik/zlecenie) albo zadeklarowane podstawy składek (JDG) z 12 mies. */
  months: number[];
  etat?: number; // wymiar czasu pracy (pracownik)
  /** gotowa podstawa (np. z Z-3/poświadczenia) – pomija wyliczenie */
  overrideBase?: number;
};

export function computeBase(inp: BaseInput, p: Params) {
  const steps: string[] = [];
  if (inp.overrideBase && inp.overrideBase > 0) {
    steps.push(`Przyjęto podstawę wymiaru z dokumentu: ${zl(inp.overrideBase)}`);
    return { base: r2(inp.overrideBase), steps, minApplied: false };
  }
  const months = inp.months.filter((m) => m > 0);
  if (!months.length) return { base: 0, steps: ["Brak danych o przychodach"], minApplied: false };
  const avg = months.reduce((a, b) => a + b, 0) / months.length;
  const ded = p.kwoty.skladkiPracownikaProcent / 100;
  steps.push(
    `Średnia z ${months.length} mies. ${isSelfEmployed(inp.title) ? "zadeklarowanych podstaw składek" : "przychodu brutto"}: ${zl(r2(avg))}`
  );
  let base = r2(avg * (1 - ded));
  steps.push(`Pomniejszenie o ${p.kwoty.skladkiPracownikaProcent}% (składki na ubezpieczenia społeczne): ${zl(base)}`);
  let minApplied = false;
  if (isEmployee(inp.title)) {
    const etat = inp.etat ?? 1;
    const min = r2(p.kwoty.minimalneWynagrodzenie * etat * (1 - ded));
    if (base < min) {
      base = min;
      minApplied = true;
      steps.push(`Podstawa pracownika nie może być niższa niż minimalne wynagrodzenie po potrąceniu składek (${etat} etatu): ${zl(min)}`);
    }
  }
  if (months.length < 12)
    steps.push(`Ubezpieczenie krótsze niż 12 mies. – średnia z pełnych miesięcy ubezpieczenia (${months.length}).`);
  return { base, steps, minApplied };
}

/* ───────────────────────── Kalkulator zasiłku macierzyńskiego ───────────────────────── */

export type Scenario = "porod" | "adopcja" | "zastepcza";

export type ParentInput = {
  insured: boolean;
  base: number;
  /** tygodnie urlopu rodzicielskiego wykorzystane przez tego rodzica */
  rodzicielskiWeeks: number;
  /** ułamek etatu pracy łączonej z urlopem rodzicielskim (0 – brak pracy) */
  workFraction: number;
  /** wynagrodzenie brutto za pełny etat – do symulacji dochodu przy łączeniu z pracą */
  monthlyWage?: number;
};

export type CalcInput = {
  scenario: Scenario;
  eventDate: string; // data porodu (przewidywana) lub przyjęcia dziecka
  children: number;
  zaZyciem: boolean;
  childAgeYears?: number; // adopcja / rodzina zastępcza
  odroczenieSzkolne?: boolean;
  premature?: { enabled: boolean; tydzienCiazy: number; masa: number; dniHospitalizacji: number; who: "matka" | "ojciec" };
  stillbirth?: boolean;
  childDeathDay?: number | null; // dzień życia, w którym nastąpił zgon (null – nie dotyczy)
  mother: ParentInput & { beforeBirthWeeks: number; jednolity: boolean };
  father: ParentInput & { takeOverWeeks: number; ojcowski: boolean; ojcowskiStart?: string };
  rodzicielskiMode: "kolejno" | "jednoczesnie";
  fullPoolException: boolean;
};

export type Period = {
  who: "A" | "B";
  type: "macierzynski" | "warunki" | "uzupelniajacy" | "rodzicielski" | "ojcowski";
  label: string;
  weeks: number;
  days: number;
  start: string;
  end: string;
  rate: number;
  workFraction: number;
  daily: number;
  monthly: number;
  total: number;
  minApplied?: boolean;
};

export type CalcResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
  periods: Period[];
  limits: Record<string, number | string>;
  totals: { A: number; B: number; all: number; daysA: number; daysB: number };
  deadlines: { label: string; date: string }[];
  labels: { A: string; B: string };
};

export function weeksByChildren(arr: number[], n: number) {
  return arr[Math.min(Math.max(n, 1), arr.length) - 1];
}

function mkPeriod(
  who: "A" | "B",
  type: Period["type"],
  label: string,
  weeks: number,
  start: string,
  ratePct: number,
  base: number,
  p: Params,
  workFraction = 0,
  extraDays?: number
): Period {
  const f = Math.min(Math.max(workFraction, 0), p.wymiary.maxUlamekPracyPrzyRodzicielskim);
  const baseDays = extraDays ?? Math.round(weeks * 7);
  const days = f > 0 ? Math.round(baseDays / (1 - f)) : baseDays;
  let monthlyFull = r2((base * ratePct) / 100);
  let minApplied = false;
  // art. 31 ust. 3a ustawy zasiłkowej: zasiłek macierzyński (każdy okres poza urlopem ojcowskim) po potrąceniu
  // zaliczki na PIT nie może być niższy niż świadczenie rodzicielskie – minimum dotyczy kwoty netto
  const minGross = grossForNet(p.kwoty.swiadczenieRodzicielskie, p.kwoty.zaliczkaPitProcent);
  if (type !== "ojcowski" && monthlyFull < minGross) {
    monthlyFull = minGross;
    minApplied = true;
  }
  const daily = r2((monthlyFull / 30) * (1 - f));
  return {
    who,
    type,
    label,
    weeks: r2(days / 7),
    days,
    start,
    end: addDays(start, days - 1),
    rate: ratePct,
    workFraction: f,
    daily,
    monthly: r2(monthlyFull * (1 - f)),
    total: r2(daily * days),
    minApplied,
  };
}

export function calculate(inp: CalcInput, p: Params): CalcResult {
  const W = p.wymiary;
  const S = p.stawki;
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];
  const periods: Period[] = [];
  const deadlines: { label: string; date: string }[] = [];
  const n = Math.max(1, Math.round(inp.children || 1));
  const adoptive = inp.scenario !== "porod";
  const labels = adoptive ? { A: "Opiekun 1", B: "Opiekun 2" } : { A: "Matka", B: "Ojciec" };
  const M = inp.mother;
  const F = inp.father;
  const ev = inp.eventDate;
  const empty = () => ({ ok: false, errors, warnings, info, periods, limits: {}, totals: { A: 0, B: 0, all: 0, daysA: 0, daysB: 0 }, deadlines, labels });

  // ── Walidacja danych wejściowych ──
  if (!isValidDate(ev)) {
    errors.push(`Podaj poprawną datę ${adoptive ? "przyjęcia dziecka" : "porodu"} (dzień, miesiąc i rok), aby zobaczyć plan.`);
    return empty();
  }
  for (const [par, who] of [[M, labels.A], [F, labels.B]] as const) {
    if (par.insured && (!Number.isFinite(par.base) || par.base < 0))
      errors.push(`${who}: podstawa wymiaru musi być kwotą 0 zł lub wyższą.`);
    if (par.insured && par.base > 1_000_000) errors.push(`${who}: podstawa wymiaru wygląda na zbyt wysoką – sprawdź kwotę.`);
  }
  if (errors.length) return empty();

  // ── Wymiar urlopu rodzicielskiego (pula) ──
  let pool = inp.zaZyciem
    ? n > 1 ? W.rodzicielskiZaZyciemWiele : W.rodzicielskiZaZyciemJedno
    : n > 1 ? W.rodzicielskiWiele : W.rodzicielskiJedno;
  const reserved = W.nieprzenoszalnaCzescTygodnie;

  // ── Kwalifikacja wieku dziecka (adopcja / zastępcza) ──
  if (adoptive) {
    const age = inp.childAgeYears ?? 0;
    const maxAge =
      inp.scenario === "adopcja" ? W.adopcjaMaxWiekDziecka : inp.odroczenieSzkolne ? W.zastepczaMaxWiekOdroczenie : W.zastepczaMaxWiekDziecka;
    if (age >= maxAge) {
      errors.push(
        `Zasiłek macierzyński przy ${inp.scenario === "adopcja" ? "przysposobieniu" : "rodzinie zastępczej niezawodowej"} przysługuje do ukończenia przez dziecko ${maxAge} lat. Dziecko ma ${age} lat.`
      );
    }
    if (inp.scenario === "zastepcza")
      info.push("Prawo przysługuje rodzinie zastępczej niezawodowej. Rodzina zastępcza zawodowa nie nabywa prawa do zasiłku macierzyńskiego z tego tytułu.");
    else info.push("Warunek: przyjęcie dziecka na wychowanie i wystąpienie do sądu opiekuńczego z wnioskiem o wszczęcie postępowania w sprawie przysposobienia.");
  }

  if (!M.insured && !F.insured) {
    errors.push("Żaden z rodziców nie podlega ubezpieczeniu chorobowemu na dzień porodu/przyjęcia dziecka – zasiłek macierzyński nie przysługuje. Sprawdź świadczenie rodzicielskie (1000\u00a0zł) w gminie/ZUS.");
  }
  if (errors.length) return empty();

  // ── Etap 1: urlop macierzyński / na warunkach macierzyńskiego ──
  let cursorA = ev;
  let cursorB = ev;
  let rodzicielskiAllowed = true;
  const rateA_mac = M.jednolity && !adoptive ? S.jednolity : adoptive ? S.naWarunkachMacierzynskiego : S.macierzynski;
  // stawka jednolita obejmuje cały okres macierzyńskiego i rodzicielskiego – także przy przysposobieniu i rodzinie zastępczej
  const rateA_rodz = M.jednolity ? S.jednolity : S.rodzicielski;
  const rateAdoptJ = M.jednolity && adoptive ? S.jednolity : null;

  if (!adoptive) {
    let macWeeks = weeksByChildren(W.macierzynski, n);
    const before = Math.min(Math.max(M.beforeBirthWeeks || 0, 0), W.przedPorodemMaxTygodnie);

    if (inp.stillbirth || (inp.childDeathDay != null && inp.childDeathDay >= 0)) {
      rodzicielskiAllowed = false;
      const deathDay = inp.stillbirth ? 0 : (inp.childDeathDay as number);
      const after8 = deathDay >= W.martweUrodzenieTygodnie * 7;
      let daysAfterBirth: number;
      if (n > 1) {
        warnings.push("Przy ciąży mnogiej wymiar urlopu macierzyńskiego ustala się stosownie do liczby dzieci pozostałych przy życiu – uzupełnij dane w rozmowie z ZUS/pracodawcą.");
      }
      if (!after8) {
        daysAfterBirth = Math.max(W.martweUrodzenieTygodnie * 7, deathDay + W.minDniPoZgonieDziecka);
        info.push(
          inp.stillbirth
            ? `Martwe urodzenie: zasiłek macierzyński przysługuje za ${W.martweUrodzenieTygodnie} tygodni po porodzie.`
            : `Zgon dziecka przed ukończeniem 8 tygodni życia: ${W.martweUrodzenieTygodnie} tygodni po porodzie, nie krócej niż ${W.minDniPoZgonieDziecka} dni od dnia zgonu.`
        );
      } else {
        daysAfterBirth = deathDay + W.minDniPoZgonieDziecka;
      }
      const maxAfter = (macWeeks - before) * 7;
      if (after8) {
        info.push(
          daysAfterBirth <= maxAfter
            ? `Zgon dziecka po upływie 8 tygodni życia: zasiłek zachowany przez ${W.minDniPoZgonieDziecka} dni od dnia zgonu.`
            : deathDay >= maxAfter
              ? `Zgon nastąpił po zakończeniu urlopu macierzyńskiego (${macWeeks} tyg.) – zasiłek za ten urlop wypłacono w pełnym wymiarze. W sprawie urlopu rodzicielskiego skontaktuj się z pracodawcą lub ZUS.`
              : `Zgon dziecka po upływie 8 tygodni życia: zasiłek przysługuje do końca wymiaru urlopu macierzyńskiego (${macWeeks} tyg.), czyli krócej niż ${W.minDniPoZgonieDziecka} dni od zgonu – wymiar się nie wydłuża.`
        );
      }
      daysAfterBirth = Math.min(daysAfterBirth, maxAfter);
      if (M.insured) {
        const start = addDays(ev, -before * 7);
        periods.push(mkPeriod("A", "macierzynski", "Urlop macierzyński (po stracie dziecka)", 0, start, S.macierzynski, M.base, p, 0, before * 7 + daysAfterBirth));
      } else if (F.insured) {
        info.push("Matka nie podlegała ubezpieczeniu – ojciec nie nabywa prawa do zasiłku macierzyńskiego z tytułu urodzenia martwego dziecka (poza sytuacjami szczególnymi). Skontaktuj się z ZUS.");
      }
      info.push("Rodzice mogą skorzystać ze wsparcia psychologicznego i organizacji pomocowych – zobacz zakładkę „Wsparcie”.");
      if (M.jednolity) warnings.push("Stawka 81,5% nie ma zastosowania – po stracie dziecka urlop rodzicielski nie przysługuje; zasiłek wynosi 100%.");
    } else {
      const takeOver = M.insured && F.insured ? Math.max(0, F.takeOverWeeks || 0) : 0;
      const maxTakeOver = macWeeks - before - W.macierzynskiObowiazkowoMatkaTygodnie;
      let tko = takeOver;
      if (tko > maxTakeOver) {
        warnings.push(`Ojciec może przejąć maks. ${maxTakeOver} tyg. – matka musi wykorzystać co najmniej ${W.macierzynskiObowiazkowoMatkaTygodnie} tyg. po porodzie (poza sytuacjami szczególnymi: hospitalizacja, niezdolność do samodzielnej egzystencji, zgon matki).`);
        tko = Math.max(0, maxTakeOver);
      }
      if (M.insured) {
        const startA = addDays(ev, -before * 7);
        const pA = mkPeriod("A", "macierzynski", "Urlop macierzyński", macWeeks - tko, startA, rateA_mac, M.base, p);
        periods.push(pA);
        cursorA = addDays(pA.end, 1);
        if (before > 0) info.push(`Matka rozpoczyna urlop ${before} tyg. przed przewidywaną datą porodu (wymagane zaświadczenie lekarskie o przewidywanej dacie porodu).`);
        if (tko > 0) {
          const pB = mkPeriod("B", "macierzynski", "Przejęta część urlopu macierzyńskiego", tko, cursorA, S.macierzynski, F.base, p);
          periods.push(pB);
          cursorB = addDays(pB.end, 1);
          info.push("Przejęcie: matka składa rezygnację z dalszej części urlopu macierzyńskiego, a ojciec przejmuje ją bezpośrednio po matce.");
        }
      } else {
        info.push("Matka nie podlega ubezpieczeniu chorobowemu na dzień porodu – nie ma prawa do zasiłku macierzyńskiego za okres urlopu macierzyńskiego. Ojciec może pobierać zasiłek za okres urlopu rodzicielskiego, a jako pracownik – urlop ojcowski.");
      }

      // ── uzupełniający urlop macierzyński ──
      if (inp.premature?.enabled) {
        const pr = inp.premature;
        let cap = 0;
        let rule = "";
        if (pr.tydzienCiazy < 28 || (pr.masa > 0 && pr.masa <= 1000)) {
          cap = W.uzupelniajacyPonizej28TygLub1000g;
          rule = "poród przed 28. tyg. ciąży lub masa urodzeniowa do 1000 g";
        } else if (pr.tydzienCiazy < 37) {
          cap = W.uzupelniajacy28do36Tyg;
          rule = "poród między 28. a 36. tygodniem ciąży";
        } else if (pr.dniHospitalizacji >= W.uzupelniajacyMinDniHospitalizacjiOd37) {
          cap = W.uzupelniajacyOd37Tyg;
          rule = `poród od 37. tyg. i hospitalizacja co najmniej ${W.uzupelniajacyMinDniHospitalizacjiOd37} dni`;
        }
        const weeksHosp = Math.ceil((pr.dniHospitalizacji || 0) / 7);
        const uw = Math.min(cap, weeksHosp || cap);
        if (cap === 0) {
          warnings.push("Wskazane warunki nie dają prawa do uzupełniającego urlopu macierzyńskiego (sprawdź tydzień ciąży, masę urodzeniową i czas hospitalizacji).");
        } else {
          const toB = (pr.who === "ojciec" && F.insured) || !M.insured;
          const macEnd = periods.map((x) => x.end).sort().at(-1);
          const start = macEnd ? addDays(macEnd, 1) : ev;
          const per = mkPeriod(toB ? "B" : "A", "uzupelniajacy", "Uzupełniający urlop macierzyński", uw, start, S.uzupelniajacy, toB ? F.base : M.base, p);
          periods.push(per);
          info.push(`Uzupełniający urlop macierzyński: ${uw} tyg. (${rule}; liczba tygodni hospitalizacji: ${weeksHosp}, maks. ${cap}). Udzielany jednorazowo, bezpośrednio po urlopie macierzyńskim; dokument: zaświadczenie ze szpitala.`);
        }
      }
    }
  } else {
    // adopcja / rodzina zastępcza – urlop na warunkach urlopu macierzyńskiego
    const ww = weeksByChildren(W.naWarunkachMacierzynskiego, n);
    const takeOver = Math.min(Math.max(F.takeOverWeeks || 0, 0), ww);
    if (M.insured) {
      const pA = mkPeriod("A", "warunki", "Urlop na warunkach urlopu macierzyńskiego", ww - takeOver, ev, rateAdoptJ ?? S.naWarunkachMacierzynskiego, M.base, p);
      periods.push(pA);
      cursorA = addDays(pA.end, 1);
      if (takeOver > 0 && F.insured) {
        const pB = mkPeriod("B", "warunki", "Część urlopu na warunkach macierzyńskiego", takeOver, cursorA, S.naWarunkachMacierzynskiego, F.base, p);
        periods.push(pB);
        cursorB = addDays(pB.end, 1);
      }
    } else if (F.insured) {
      const pB = mkPeriod("B", "warunki", "Urlop na warunkach urlopu macierzyńskiego", ww, ev, S.naWarunkachMacierzynskiego, F.base, p);
      periods.push(pB);
      cursorB = addDays(pB.end, 1);
    }
  }

  // Koniec etapu 1 – urlop rodzicielski planujemy bezpośrednio po nim
  {
    const end = periods.map((x) => x.end).sort().at(-1);
    if (end) cursorA = cursorB = addDays(end, 1);
  }

  // ── Etap 2: urlop rodzicielski ──
  if (rodzicielskiAllowed) {
    // 9 tyg. jest nieprzenoszalne także wtedy, gdy drugi rodzic nie jest ubezpieczony – pełna pula tylko w wyjątkach ustawowych
    const exception = inp.fullPoolException;
    const maxPerParent = exception ? pool : pool - reserved;
    let wA = M.insured ? Math.max(0, Math.min(M.rodzicielskiWeeks || 0, maxPerParent)) : 0;
    let wB = F.insured ? Math.max(0, Math.min(F.rodzicielskiWeeks || 0, maxPerParent)) : 0;
    if ((M.rodzicielskiWeeks || 0) > maxPerParent && M.insured)
      warnings.push(`${labels.A}: maks. ${maxPerParent} tyg. urlopu rodzicielskiego – ${reserved} tyg. to wyłączne, nieprzenoszalne prawo drugiego rodzica.`);
    if ((F.rodzicielskiWeeks || 0) > maxPerParent && F.insured)
      warnings.push(`${labels.B}: maks. ${maxPerParent} tyg. urlopu rodzicielskiego – ${reserved} tyg. to wyłączne, nieprzenoszalne prawo drugiego rodzica.`);
    if (wA + wB > pool) {
      warnings.push(`Łączny wymiar urlopu rodzicielskiego nie może przekroczyć ${pool} tyg. – skrócono część ${labels.B}.`);
      wB = Math.max(0, pool - wA);
    }
    if (!exception && M.insured && F.insured) {
      if (wA < reserved && wA > 0) info.push(`${labels.A} wykorzystuje mniej niż ${reserved} tyg. – niewykorzystana część nieprzenoszalna przepada.`);
      if (wB < reserved) info.push(`${labels.B}: ${reserved} tyg. urlopu rodzicielskiego przysługuje wyłącznie temu rodzicowi – jeśli z nich nie skorzysta, przepadną (nie można ich przekazać).`);
    }
    if (!M.insured && F.insured && !adoptive) info.push(`Matka nieubezpieczona – ojciec może pobierać zasiłek za okres urlopu rodzicielskiego (maks. ${maxPerParent} tyg.; pełna pula tylko w wyjątkach ustawowych).`);
    if (!exception && (!M.insured || !F.insured) && M.insured !== F.insured) info.push(`${reserved} tyg. urlopu rodzicielskiego zarezerwowane dla drugiego rodzica nie przechodzi na ubezpieczonego rodzica (chyba że zachodzi wyjątek ustawowy – zaznacz opcję w kalkulatorze).`);

    const startA = cursorA;
    if (wA > 0) {
      const per = mkPeriod("A", "rodzicielski", M.workFraction > 0 ? "Urlop rodzicielski + praca" : "Urlop rodzicielski", wA, startA, rateA_rodz, M.base, p, M.workFraction);
      periods.push(per);
      cursorA = addDays(per.end, 1);
    }
    const startB = inp.rodzicielskiMode === "jednoczesnie" ? cursorB : cursorA;
    if (wB > 0) {
      const per = mkPeriod("B", "rodzicielski", F.workFraction > 0 ? "Urlop rodzicielski + praca" : "Urlop rodzicielski", wB, startB, S.rodzicielski, F.base, p, F.workFraction);
      periods.push(per);
    }
    if (M.jednolity) {
      const fullA = maxPerParent;
      info.push(`Stawka jednolita ${pct(S.jednolity)} – wniosek najpóźniej ${p.terminy.jednolityWniosekDni} dni po ${adoptive ? "przyjęciu dziecka" : "porodzie"}, za cały okres macierzyńskiego i rodzicielskiego. Część ${reserved} tyg. drugiego rodzica jest płatna ${pct(S.rodzicielski)}.`);
      if (wA < fullA) warnings.push(`Przy stawce ${pct(S.jednolity)} deklarujesz urlop rodzicielski w pełnym wymiarze (${fullA} tyg.). Jeśli wykorzystasz mniej, ZUS/płatnik przeliczy zasiłek (wyrównanie albo potrącenie nadwyżki). Jeśli nie skorzystasz z rodzicielskiego wcale – zasiłek za macierzyński zostanie wyrównany do 100%.`);
    }
    if (M.workFraction > 0 || F.workFraction > 0)
      info.push(`Łączenie urlopu rodzicielskiego z pracą (maks. ${p.wymiary.maxUlamekPracyPrzyRodzicielskim * 100}% etatu): urlop wydłuża się proporcjonalnie, a zasiłek jest proporcjonalnie niższy – łączna kwota zasiłku się nie zmienia. Dotyczy pracy u pracodawcy udzielającego urlopu.`);
    info.push(`Urlop rodzicielski można podzielić na maks. ${W.maksCzesciRodzicielskiego} części. Rodzice mogą korzystać z niego jednocześnie lub naprzemiennie.`);
    // termin wykorzystania
    if (adoptive) {
      const maxAge = inp.scenario === "adopcja" ? W.adopcjaMaxWiekDziecka : inp.odroczenieSzkolne ? W.zastepczaMaxWiekOdroczenie : W.zastepczaMaxWiekDziecka;
      // znamy tylko wiek w latach – przyjmujemy, że dziecko kończy kolejny rok w dniu przyjęcia (wynik orientacyjny)
      const lastDay = addDays(addMonths(ev, Math.max(0, maxAge - (inp.childAgeYears ?? 0)) * 12), -1);
      deadlines.push({ label: `Ostatni możliwy termin urlopu rodzicielskiego (orientacyjnie – do ukończenia przez dziecko ${maxAge} lat; dokładną datę wyznaczają urodziny dziecka)`, date: lastDay });
    } else {
      const eventYear = Number(ev.slice(0, 4));
      deadlines.push({ label: `Urlop rodzicielski do końca roku, w którym dziecko kończy ${W.rodzicielskiDoKoncaRokuWiekuDziecka} lat`, date: `${eventYear + W.rodzicielskiDoKoncaRokuWiekuDziecka}-12-31` });
    }
  }

  // ── Etap 3: urlop ojcowski ──
  if (F.ojcowski && F.insured && inp.scenario !== "zastepcza" && !inp.stillbirth) {
    const start = isValidDate(F.ojcowskiStart) ? F.ojcowskiStart : ev;
    const limit = addMonths(ev, W.ojcowskiDoMiesiacaZycia);
    const lastStart = addDays(limit, -(W.ojcowskiDni - 1));
    if (start < ev) {
      warnings.push(`Urlop ojcowski może zacząć się najwcześniej w dniu ${adoptive ? "przyjęcia dziecka" : "porodu"} (${fmtDate(ev)}) – zmień datę początku. Okresu nie wliczono do sumy.`);
    } else if (start > lastStart) {
      warnings.push(`Urlop ojcowski trzeba wykorzystać do ukończenia przez dziecko ${W.ojcowskiDoMiesiacaZycia} miesięcy (${adoptive ? "przy przysposobieniu – 12 mies. od uprawomocnienia postanowienia, nie dłużej niż do 14. r.ż." : `do ${fmtDate(limit)}`}), więc musi zacząć się najpóźniej ${fmtDate(lastStart)}. Okresu nie wliczono do sumy.`);
    } else {
      periods.push(mkPeriod("B", "ojcowski", "Urlop ojcowski", 0, start, S.ojcowski, F.base, p, 0, W.ojcowskiDni));
    }
    deadlines.push({ label: "Ostatni dzień na urlop ojcowski", date: limit });
    info.push(`Urlop ojcowski: ${W.ojcowskiDni} dni, jednorazowo albo w 2 częściach (min. ${W.ojcowskiMinCzesciDni} dni). Liczba dzieci nie wydłuża urlopu. Wniosek do pracodawcy min. ${p.terminy.wniosekOjcowskiDniPrzed} dni przed.`);
  } else if (F.ojcowski && inp.scenario === "zastepcza") {
    warnings.push("Urlop ojcowski nie przysługuje rodzinie zastępczej (przysługuje ojcu biologicznemu i adopcyjnemu).");
  }

  // ── terminy ──
  if (!adoptive && !inp.stillbirth) {
    deadlines.push({ label: `Wniosek o stawkę ${pct(S.jednolity)} / o rodzicielski bezpośrednio po macierzyńskim`, date: addDays(ev, p.terminy.jednolityWniosekDni) });
  }
  if (adoptive) deadlines.push({ label: `Wniosek o stawkę ${pct(S.jednolity)} (do 21 dni od przyjęcia dziecka)`, date: addDays(ev, p.terminy.jednolityWniosekDni) });

  const sum = (w: "A" | "B") => r2(periods.filter((x) => x.who === w).reduce((a, b) => a + b.total, 0));
  const days = (w: "A" | "B") => periods.filter((x) => x.who === w).reduce((a, b) => a + b.days, 0);
  periods.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return {
    ok: true,
    errors,
    warnings,
    info,
    periods,
    limits: {
      "Wymiar macierzyńskiego / na warunkach (tyg.)": adoptive ? weeksByChildren(W.naWarunkachMacierzynskiego, n) : weeksByChildren(W.macierzynski, n),
      "Pula urlopu rodzicielskiego (tyg.)": pool,
      "Część nieprzenoszalna na rodzica (tyg.)": reserved,
      "Maks. dla jednego rodzica (tyg.)": inp.fullPoolException ? pool : pool - reserved,
    },
    totals: { A: sum("A"), B: sum("B"), all: r2(sum("A") + sum("B")), daysA: days("A"), daysB: days("B") },
    deadlines: deadlines.sort((a, b) => (a.date < b.date ? -1 : 1)),
    labels,
  };
}

/* ───────────────────────── Świadczenia w ciąży ───────────────────────── */

export type PregnancyInput = {
  title: Title;
  insuranceStart: string;
  zlaStart: string;
  zlaDays: number;
  kodB: boolean;
  age50: boolean;
  priorInsuranceCounts: boolean; // wcześniejsze ubezpieczenie z przerwą ≤30 dni / inne wyłączenie okresu wyczekiwania
  insuredAtPayer: number;
  base: number;
  dueDate: string;
  contractEnd?: string; // data ustania zatrudnienia/umowy (jeśli planowana)
  contractKind?: "nieokreslony" | "okreslony" | "probny";
  terminationReason?: "brak" | "upadlosc" | "likwidacja" | "smierc_pracodawcy" | "naruszenie_prawa" | "inne";
  debt: number;
  sickDaysUsedThisYear: number;
};

export type BenefitResult = {
  key: string;
  name: string;
  status: "przysluguje" | "nie_przysluguje" | "warunkowo" | "informacja";
  summary: string;
  details: string[];
  amount?: { daily: number; monthly: number; total?: number };
  payer?: string;
};

export function pregnancyBenefits(inp: PregnancyInput, p: Params): BenefitResult[] {
  const C = p.chorobowy;
  const out: BenefitResult[] = [];
  const insured = hasSicknessInsurance(inp.title);
  const payer = whoPays(inp.title, inp.insuredAtPayer, p);
  const payerLabel = payer === "platnik" ? "Płatnik składek (pracodawca/zleceniodawca)" : "ZUS";

  // Zasiłek chorobowy
  if (!insured) {
    out.push({
      key: "chorobowy",
      name: "Zasiłek chorobowy w ciąży",
      status: "nie_przysluguje",
      summary: `${TITLE_LABELS[inp.title]} – brak ubezpieczenia chorobowego, więc zasiłek chorobowy nie przysługuje.`,
      details: [
        inp.title === "zlecenie_bez" || inp.title === "jdg_bez"
          ? "Możesz przystąpić do dobrowolnego ubezpieczenia chorobowego (zgłoszenie ZUS ZUA/ZZA przez płatnika lub samodzielnie). Prawo do zasiłku chorobowego powstanie po 90 dniach, ale prawo do zasiłku macierzyńskiego – od pierwszego dnia ubezpieczenia (bez okresu wyczekiwania)."
          : "Umowa o dzieło nie daje tytułu do ubezpieczenia chorobowego.",
        "Uwaga: zgłoszenie się do ubezpieczenia wyłącznie w celu uzyskania świadczeń może zostać zakwestionowane przez ZUS (umowa/działalność dla pozoru).",
      ],
    });
  } else {
    const wait = isVoluntary(inp.title) ? C.okresWyczekiwaniaDobrowolne : C.okresWyczekiwaniaObowiazkowe;
    const insuredDays = diffDays(inp.insuranceStart, inp.zlaStart);
    const firstPaidDay = inp.priorInsuranceCounts ? inp.zlaStart : insuredDays >= wait ? inp.zlaStart : addDays(inp.insuranceStart, wait);
    const waitingOk = inp.priorInsuranceCounts || insuredDays >= wait;
    const rate = inp.kodB ? p.stawki.chorobowyCiaza : p.stawki.chorobowyStandard;
    const daily = r2((inp.base * rate) / 100 / 30);
    const details: string[] = [];
    details.push(`Okres wyczekiwania: ${wait} dni ${isVoluntary(inp.title) ? "(ubezpieczenie dobrowolne)" : "(ubezpieczenie obowiązkowe)"}. Ubezpieczenie od ${fmtDate(inp.insuranceStart)} – na dzień niezdolności: ${Math.max(insuredDays, 0)} dni.`);
    if (!waitingOk) details.push(`Zasiłek przysługuje dopiero od ${fmtDate(firstPaidDay)} (po upływie okresu wyczekiwania). Wcześniejsze dni niezdolności nie są płatne.`);
    details.push(inp.kodB ? `Kod „B” na e-ZLA (ciąża) → zasiłek ${pct(p.stawki.chorobowyCiaza)} podstawy.` : `Brak kodu „B” → zasiłek ${pct(p.stawki.chorobowyStandard)} podstawy. Poproś lekarza o oznaczenie ciąży kodem B, jeśli niezdolność przypada w ciąży.`);
    let employerDays = 0;
    if (isEmployee(inp.title)) {
      const limit = inp.age50 ? C.wynagrodzenieChorobowe50plus : C.wynagrodzenieChorobowe;
      employerDays = Math.max(0, Math.min(inp.zlaDays, limit - inp.sickDaysUsedThisYear));
      details.push(`Pracownica: pierwsze ${limit} dni niezdolności w roku kalendarzowym opłaca pracodawca jako wynagrodzenie chorobowe (wykorzystano już ${inp.sickDaysUsedThisYear}). W tym zwolnieniu: ${employerDays} dni wynagrodzenia chorobowego, ${Math.max(0, inp.zlaDays - employerDays)} dni zasiłku.`);
    } else details.push("Osoby niebędące pracownikami otrzymują zasiłek od pierwszego dnia niezdolności (po okresie wyczekiwania).");
    details.push(`Okres zasiłkowy w ciąży: maks. ${C.okresZasilkowyCiaza} dni.`);
    if (isSelfEmployed(inp.title) && inp.debt > 0)
      details.push(`Składki do uregulowania: ${zl(inp.debt)}. Zasiłek dla przedsiębiorcy zostanie wypłacony dopiero po uregulowaniu wszystkich należności na dzień powstania prawa. Nieopłacenie składki w terminie może też oznaczać ustanie dobrowolnego ubezpieczenia chorobowego.`);
    details.push(`Wypłaca: ${payerLabel}${payer === "zus" && !isSelfEmployed(inp.title) ? ` (płatnik zgłasza do ubezpieczenia chorobowego nie więcej niż ${p.kwoty.progPlatnikaUbezpieczonych} osób)` : ""}.`);
    const paidDays = Math.max(0, inp.zlaDays - employerDays - (waitingOk ? 0 : Math.max(0, diffDays(inp.zlaStart, firstPaidDay))));
    out.push({
      key: "chorobowy",
      name: "Zasiłek chorobowy w ciąży",
      status: isSelfEmployed(inp.title) && inp.debt > 0 ? "warunkowo" : waitingOk ? "przysluguje" : "warunkowo",
      summary: waitingOk
        ? `Przysługuje: ${rate}% podstawy, ok. ${zl(daily)} dziennie (${zl(r2(daily * 30))} miesięcznie brutto).`
        : `Przysługuje dopiero od ${fmtDate(firstPaidDay)} – nie upłynął okres wyczekiwania.`,
      details,
      amount: { daily, monthly: r2(daily * 30), total: r2(daily * paidDays) },
      payer: payerLabel,
    });
  }

  // Świadczenie rehabilitacyjne
  out.push({
    key: "rehabilitacyjne",
    name: "Świadczenie rehabilitacyjne",
    status: insured ? "informacja" : "nie_przysluguje",
    summary: insured
      ? `Po wyczerpaniu ${C.okresZasilkowyCiaza} dni okresu zasiłkowego, jeśli dalsze leczenie lub rehabilitacja rokują odzyskanie zdolności do pracy – do ${C.rehabilitacyjneMaxMiesiace} mies. W ciąży: ${pct(p.stawki.rehabilitacyjneCiaza)} podstawy.`
      : "Nie przysługuje bez prawa do zasiłku chorobowego.",
    details: insured
      ? [
          `Stawki: ${pct(p.stawki.rehabilitacyjne90dni)} przez pierwsze 90 dni, potem ${pct(p.stawki.rehabilitacyjnePozniej)}; w okresie ciąży ${pct(p.stawki.rehabilitacyjneCiaza)}.`,
          "Wniosek ZUS Np-7 + zaświadczenie lekarza prowadzącego (ZUS N-9) + wywiad zawodowy (N-10) – złóż ok. 6 tygodni przed końcem okresu zasiłkowego. O prawie decyduje lekarz orzecznik ZUS.",
          ...(inp.base > 0 ? [`Szacunkowo w ciąży: ${zl(r2((inp.base * p.stawki.rehabilitacyjneCiaza) / 100))} / mies. brutto.`] : []),
        ]
      : [],
    amount: insured && inp.base > 0 ? { daily: r2((inp.base * p.stawki.rehabilitacyjneCiaza) / 100 / 30), monthly: r2((inp.base * p.stawki.rehabilitacyjneCiaza) / 100) } : undefined,
  });

  // Zasiłek w wysokości zasiłku macierzyńskiego
  const tr = inp.terminationReason ?? "brak";
  const qualifies = isEmployee(inp.title) && ["upadlosc", "likwidacja", "smierc_pracodawcy", "naruszenie_prawa"].includes(tr);
  out.push({
    key: "wys_macierzynskiego",
    name: "Zasiłek w wysokości zasiłku macierzyńskiego",
    status: qualifies ? (tr === "naruszenie_prawa" ? "warunkowo" : "przysluguje") : tr === "brak" ? "informacja" : "nie_przysluguje",
    summary: qualifies
      ? `Przysługuje od dnia następującego po rozwiązaniu umowy do dnia porodu: ${pct(p.stawki.wysokoscMacierzynskiegoPoUtracie)} podstawy (${zl(r2((inp.base * p.stawki.wysokoscMacierzynskiegoPoUtracie) / 100))}/mies.).`
      : tr === "brak"
        ? "Dotyczy pracownic, z którymi w ciąży rozwiązano umowę z powodu upadłości/likwidacji/śmierci pracodawcy lub z naruszeniem prawa."
        : "Rozwiązanie umowy z innej przyczyny nie daje prawa do tego zasiłku.",
    details: qualifies
      ? [
          tr === "naruszenie_prawa" ? "Warunek: naruszenie przepisów przy rozwiązaniu umowy musi być potwierdzone prawomocnym wyrokiem sądu." : "Warunek: nie zapewniono innego zatrudnienia.",
          "Wniosek składasz do ZUS (wraz ze świadectwem pracy i zaświadczeniem lekarskim o ciąży). Zasiłek wypłaca ZUS – po ustaniu ubezpieczenia.",
          ...(inp.contractEnd && inp.dueDate ? [`Szacunkowy okres: ${fmtDate(addDays(inp.contractEnd, 1))} – ${fmtDate(inp.dueDate)} (${Math.max(0, diffDays(inp.contractEnd, inp.dueDate))} dni).`] : []),
        ]
      : [],
  });

  // Ochrona umowy
  if (isEmployee(inp.title)) {
    const d: string[] = [
      "W okresie ciąży i urlopów związanych z rodzicielstwem pracodawca nie może wypowiedzieć ani rozwiązać umowy (poza wyjątkami: wina pracownicy za zgodą związku, upadłość/likwidacja).",
    ];
    if (inp.contractKind === "okreslony" || inp.contractKind === "probny")
      d.push("Umowa na czas określony lub okres próbny dłuższy niż 1 miesiąc, która rozwiązałaby się po upływie 3. miesiąca ciąży, ulega przedłużeniu do dnia porodu – dzięki temu podlegasz ubezpieczeniu w dniu porodu.");
    out.push({ key: "ochrona", name: "Szczególna ochrona stosunku pracy", status: "informacja", summary: "Jako pracownica jesteś chroniona przez Kodeks pracy.", details: d });
  }
  return out;
}

/* ───────────────────────── Ryzyka ───────────────────────── */

export type RiskInput = {
  title: Title;
  insuranceStart?: string;
  dueDate?: string;
  contractEnd?: string;
  contractKind?: "nieokreslony" | "okreslony" | "probny";
  baseHistory?: { month: string; base: number }[];
  pregnancyStart?: string;
  debt?: number;
  voluntaryPaidOnTime?: boolean;
  zlaWithoutB?: boolean;
  workingDuringZla?: boolean;
};

export type Risk = { level: "wysokie" | "srednie" | "niskie"; title: string; text: string; action: string };

export function assessRisks(r: RiskInput, p: Params): Risk[] {
  const out: Risk[] = [];
  if (!hasSicknessInsurance(r.title))
    out.push({ level: "wysokie", title: "Brak ubezpieczenia chorobowego", text: "Bez ubezpieczenia chorobowego na dzień porodu nie nabędziesz prawa do zasiłku macierzyńskiego (przysługuje wtedy świadczenie rodzicielskie 1000\u00a0zł/mies.).", action: "Sprawdź możliwość przystąpienia do dobrowolnego ubezpieczenia chorobowego lub inny tytuł do ubezpieczenia." });
  if (r.insuranceStart && r.dueDate) {
    const days = diffDays(r.insuranceStart, r.dueDate);
    const pregStart = r.pregnancyStart ?? addDays(r.dueDate, -280);
    if (r.insuranceStart > pregStart && (isSelfEmployed(r.title) || r.title === "zlecenie_chorobowe" || days < 240))
      out.push({ level: "srednie", title: "Ubezpieczenie rozpoczęte w trakcie ciąży", text: "ZUS może zbadać, czy umowa lub działalność nie zostały zawarte/podjęte dla pozoru – wyłącznie w celu uzyskania świadczeń. Skutkiem może być decyzja o niepodleganiu ubezpieczeniom i brak prawa do zasiłków.", action: "Zachowaj dowody faktycznego wykonywania pracy/działalności: faktury, korespondencję, ewidencję czasu, umowy z kontrahentami." });
  }
  if (r.baseHistory && r.baseHistory.length >= 2 && r.pregnancyStart) {
    const before = r.baseHistory.filter((b) => b.month < r.pregnancyStart!.slice(0, 7));
    const after = r.baseHistory.filter((b) => b.month >= r.pregnancyStart!.slice(0, 7));
    if (before.length && after.length) {
      const avgB = before.reduce((a, b) => a + b.base, 0) / before.length;
      const maxA = Math.max(...after.map((b) => b.base));
      if (maxA > avgB * 1.5)
        out.push({ level: "wysokie", title: "Wyraźne podwyższenie podstawy składek w ciąży", text: `Podstawa wzrosła z ok. ${zl(r2(avgB))} do ${zl(maxA)}. ZUS może uznać, że podwyższenie miało wyłącznie na celu uzyskanie wyższych świadczeń i ustalić niższą podstawę wymiaru zasiłku.`, action: "Podstawa powinna odpowiadać realnym przychodom. Przygotuj uzasadnienie (np. wzrost obrotów, nowe kontrakty)." });
    }
  }
  if (r.contractEnd && r.dueDate && r.contractEnd < r.dueDate) {
    const protectedExt = r.title === "umowa_o_prace" && (r.contractKind === "okreslony" || r.contractKind === "probny");
    out.push(
      protectedExt
        ? { level: "niskie", title: "Umowa terminowa kończy się przed porodem", text: "Umowa o pracę na czas określony (lub próbna > 1 mies.), która rozwiązałaby się po 3. miesiącu ciąży, z mocy prawa przedłuża się do dnia porodu.", action: "Poinformuj pracodawcę o ciąży (zaświadczenie lekarskie). Po porodzie umowa wygasa – zasiłek macierzyński wypłaci ZUS." }
        : { level: "wysokie", title: "Ustanie ubezpieczenia przed porodem", text: `Umowa/działalność kończy się ${fmtDate(r.contractEnd)}, przed przewidywaną datą porodu (${fmtDate(r.dueDate)}). Jeśli w dniu porodu nie będziesz ubezpieczona – zasiłek macierzyński nie przysługuje.`, action: "Rozważ przedłużenie umowy, kontynuację działalności z dobrowolnym chorobowym lub zawarcie nowej umowy (rzeczywistej, nie dla pozoru)." }
    );
  }
  if (isSelfEmployed(r.title) && (r.debt ?? 0) > 0)
    out.push({ level: "wysokie", title: "Składki do uregulowania", text: `Kwota do uregulowania: ${zl(r.debt!)}. Zasiłek dla przedsiębiorcy wypłacany jest dopiero po uregulowaniu należności na dzień powstania prawa do świadczenia.`, action: "Ureguluj należności lub zawrzyj układ ratalny. Sprawdź stan rozliczeń na PUE/eZUS." });
  if (isVoluntary(r.title) && r.voluntaryPaidOnTime === false)
    out.push({ level: "wysokie", title: "Nieterminowa składka dobrowolna", text: "Nieopłacenie składki na dobrowolne ubezpieczenie chorobowe w terminie może oznaczać ustanie tego ubezpieczenia – a w konsekwencji brak prawa do zasiłków.", action: "Opłacaj składki w terminie. W uzasadnionych przypadkach złóż wniosek o przywrócenie terminu." });
  if (r.zlaWithoutB)
    out.push({ level: "srednie", title: "Zwolnienie w ciąży bez kodu „B”", text: `Bez kodu B zasiłek wynosi ${pct(p.stawki.chorobowyStandard)} zamiast ${pct(p.stawki.chorobowyCiaza)}.`, action: "Poproś lekarza o korektę e-ZLA, jeśli niezdolność przypada w okresie ciąży." });
  if (r.workingDuringZla)
    out.push({ level: "wysokie", title: "Praca zarobkowa w trakcie zwolnienia", text: "Wykonywanie pracy zarobkowej lub wykorzystywanie zwolnienia niezgodnie z celem powoduje utratę prawa do zasiłku za cały okres zwolnienia.", action: "Powstrzymaj się od pracy zarobkowej w czasie e-ZLA (dotyczy też zleceń i działalności)." });
  out.push({ level: "niskie", title: "Termin na złożenie dokumentów", text: `Zasiłek nie przysługuje, jeśli dokumenty złożysz później niż ${p.chorobowy.terminZlozeniaMiesiace} mies. od ustania niezdolności do pracy/okresu zasiłku.`, action: "Złóż wnioski od razu – najlepiej przez PUE/eZUS." });
  return out;
}

/* ───────────────────────── Dokumenty – gdzie i co złożyć ───────────────────────── */

export type DocStep = { doc: string; to: string; when: string; note?: string };

export function documentsFor(title: Title, benefit: "chorobowy" | "macierzynski" | "rodzicielski" | "ojcowski" | "uzupelniajacy" | "adopcja", insuredAtPayer: number, p: Params): { payer: string; steps: DocStep[] } {
  const payer = whoPays(title, insuredAtPayer, p);
  const payerName = payer === "platnik" ? (isEmployee(title) ? "pracodawca" : "zleceniodawca (płatnik)") : "ZUS";
  const s: DocStep[] = [];
  const zusVia = "ZUS – przez PUE/eZUS, pocztą lub w placówce";
  if (benefit === "chorobowy") {
    s.push({ doc: "e-ZLA (z kodem B w ciąży)", to: "wystawia lekarz – trafia automatycznie do ZUS i płatnika", when: "w dniu wizyty" });
    if (isEmployee(title)) {
      s.push({ doc: "Poinformowanie pracodawcy o nieobecności", to: "pracodawca", when: "niezwłocznie, najpóźniej w 2. dniu nieobecności" });
      if (payer === "zus") s.push({ doc: "Z-3 (zaświadczenie płatnika), na kolejne okresy ZAS-12", to: "ZUS (przekazuje pracodawca)", when: "do 7 dni od otrzymania e-ZLA" });
    } else if (title === "zlecenie_chorobowe") {
      s.push({ doc: "Powstrzymanie się od pracy", to: "—", when: "przez cały okres e-ZLA" });
      if (payer === "zus") s.push({ doc: "Z-3a (zaświadczenie płatnika)", to: "ZUS (przekazuje zleceniodawca)", when: "po otrzymaniu e-ZLA" });
    } else if (isSelfEmployed(title)) {
      s.push({ doc: "ZAS-53 – wniosek o zasiłek chorobowy", to: zusVia, when: "po otrzymaniu e-ZLA", note: "Z-3b zlikwidowany od 24.10.2026 r." });
    }
  } else if (benefit === "ojcowski") {
    if (isEmployee(title)) {
      s.push({ doc: "Wniosek o urlop ojcowski", to: "pracodawca", when: `min. ${p.terminy.wniosekOjcowskiDniPrzed} dni przed rozpoczęciem` });
      if (payer === "zus") s.push({ doc: "Z-3 + wniosek ZAM", to: "ZUS (przekazuje pracodawca)", when: "po udzieleniu urlopu" });
    } else s.push({ doc: "ZAM – wniosek o zasiłek macierzyński (część: urlop ojcowski)", to: payer === "zus" ? zusVia : payerName, when: "w okresie do 12 mies. życia dziecka", note: "Formularz ZAO połączono z ZAM od 24.10.2026 r." });
  } else {
    if (isEmployee(title)) {
      const leave = benefit === "adopcja" ? "urlop na warunkach urlopu macierzyńskiego" : benefit === "rodzicielski" ? "urlop rodzicielski" : benefit === "uzupelniajacy" ? "uzupełniający urlop macierzyński" : "urlop macierzyński (może być łącznie z rodzicielskim)";
      s.push({ doc: `Wniosek o ${leave}`, to: "pracodawca", when: benefit === "rodzicielski" ? `${p.terminy.wniosekMacierzynskiPoPorodzieDni} dni po porodzie (bezpośrednio po macierzyńskim) lub ${p.terminy.wniosekRodzicielskiDniPrzed} dni przed rozpoczęciem` : "przed rozpoczęciem urlopu / po porodzie" });
      if (payer === "zus") s.push({ doc: "Z-3 (zaświadczenie płatnika) + wniosek o urlop", to: "ZUS (przekazuje pracodawca)", when: "po udzieleniu urlopu" });
    } else {
      s.push({ doc: "ZAM – wniosek o zasiłek macierzyński", to: payer === "zus" ? zusVia : payerName, when: benefit === "rodzicielski" ? `do ${p.terminy.wniosekMacierzynskiPoPorodzieDni} dni po porodzie, aby zachować ciągłość` : "po porodzie / przyjęciu dziecka", note: "ZUR połączono z ZAM od 24.10.2026 r." });
      if (title === "zlecenie_chorobowe" && payer === "zus") s.push({ doc: "Z-3a (zaświadczenie płatnika)", to: "ZUS (przekazuje zleceniodawca)", when: "po złożeniu ZAM" });
    }
    s.push({ doc: "Skrócony odpis aktu urodzenia (lub dane z rejestru stanu cywilnego)", to: payerName, when: "po rejestracji urodzenia w USC", note: "Odpis zamówisz online – zakładka Wnioski" });
    if (benefit === "uzupelniajacy") s.push({ doc: "Zaświadczenie ze szpitala (tydzień ciąży, masa urodzeniowa, okres hospitalizacji)", to: payerName, when: "wraz z wnioskiem" });
    if (benefit === "adopcja") s.push({ doc: "Zaświadczenie z sądu o wszczęciu postępowania o przysposobienie / postanowienie o umieszczeniu w rodzinie zastępczej", to: payerName, when: "wraz z wnioskiem" });
    s.push({ doc: "Opcjonalnie: zaświadczenie „Za życiem”, zaświadczenie o martwym urodzeniu, oświadczenie o stawce 81,5%", to: payerName, when: `stawka 81,5% – do ${p.terminy.jednolityWniosekDni} dni po porodzie` });
  }
  return { payer: payerName, steps: s };
}
