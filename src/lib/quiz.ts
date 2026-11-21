/**
 * Ankieta „Załóż konto bez pobierania danych z ZUS”.
 * Wspólna dla klienta (kolejność, warunki, etykiety) i serwera (wyliczanie brakujących danych).
 */
import type { Title } from "./engine";

export type Answers = {
  imie?: string;
  nazwisko?: string;
  plec?: "K" | "M";
  pesel?: string;
  sytuacja?: "ciaza" | "dziecko" | "adopcja" | "zastepcza" | "planujemy";
  termin?: string;          // planowana (przewidywana) data porodu
  dzieckoImie?: string;
  dzieckoData?: string;     // data urodzenia dziecka albo data przyjęcia na wychowanie (adopcja / rodzina zastępcza)
  dzieckoUrodzenie?: string; // data urodzenia przyjmowanego dziecka (limity wieku)
  ustanie?: "tak" | "nie";  // czy stosunek pracy / umowa ustała lub ustanie
  ustanieData?: string;
  ustaniePowod?: "upadlosc" | "likwidacja" | "smierc_pracodawcy" | "naruszenie_prawa" | "inne";
  title?: Title;
  ubezpieczenieOd?: string;
  rodzajUmowy?: "nieokreslony" | "okreslony" | "probny";
  umowaDo?: string;
  etat?: number;
  platnikNazwa?: string;
  liczbaUbezpieczonych?: number;
  zarobki?: number;         // średnio brutto / podstawa składek miesięcznie
  skladkiTerminowo?: boolean;
  zadluzenie?: number;
};

export type QKind = "name" | "choice" | "date" | "number" | "text";
export type Question = {
  id: string;
  /** pola odpowiedzi, które wypełnia pytanie */
  fields: (keyof Answers)[];
  title: string;
  help?: string;
  kind: QKind;
  options?: { value: string; label: string; hint?: string }[];
  /** pole, którego dotyczy kind number/date/text */
  field?: keyof Answers;
  suffix?: string;
  placeholder?: string;
  required?: boolean;
  when?: (a: Answers) => boolean;
};

const employee = (a: Answers) => a.title === "umowa_o_prace";
const selfEmployed = (a: Answers) => a.title === "jdg_chorobowe" || a.title === "jdg_bez";
const voluntary = (a: Answers) => a.title === "zlecenie_chorobowe" || a.title === "jdg_chorobowe";
/** ma umowę lub działalność (z chorobowym albo bez) */
const insured = (a: Answers) => !!a.title && !["brak", "dzielo"].includes(a.title);
/** ma ubezpieczenie chorobowe */
const sickInsured = (a: Answers) => a.title === "umowa_o_prace" || voluntary(a);

export const QUESTIONS: Question[] = [
  { id: "imie", fields: ["imie", "nazwisko"], kind: "name", required: true, title: "Jak masz na imię?", help: "Imię i nazwisko pojawią się na Twoich wnioskach." },
  { id: "plec", fields: ["plec"], kind: "choice", field: "plec", title: "Kim jesteś w tej sytuacji?", help: "Od tego zależy, które urlopy pokażemy jako Twoje (np. macierzyński czy ojcowski).",
    options: [{ value: "K", label: "Mamą / przyszłą mamą" }, { value: "M", label: "Tatą / przyszłym tatą" }] },
  { id: "sytuacja", fields: ["sytuacja"], kind: "choice", field: "sytuacja", title: "Na jakim etapie jesteście?",
    options: [
      { value: "ciaza", label: "Spodziewamy się dziecka", hint: "ciąża" },
      { value: "dziecko", label: "Dziecko już się urodziło" },
      { value: "adopcja", label: "Przysposabiamy dziecko", hint: "adopcja" },
      { value: "zastepcza", label: "Jesteśmy rodziną zastępczą", hint: "niezawodową" },
      { value: "planujemy", label: "Dopiero planujemy" },
    ] },
  { id: "termin", fields: ["termin"], kind: "date", field: "termin", title: "Jaka jest planowana data porodu?", help: "Znajdziesz ją w karcie ciąży lub zaświadczeniu lekarskim. Na jej podstawie policzymy terminy urlopów i wniosków.", when: (a) => a.sytuacja === "ciaza" },
  { id: "dziecko", fields: ["dzieckoData"], kind: "date", field: "dzieckoData", title: "Kiedy dziecko się urodziło?", help: "Od tej daty liczą się urlopy i terminy wniosków.", when: (a) => a.sytuacja === "dziecko" },
  { id: "przyjecie", fields: ["dzieckoData"], kind: "date", field: "dzieckoData", title: "Kiedy dziecko zostało (zostanie) przyjęte na wychowanie?", help: "Przy adopcji – data przyjęcia dziecka na wychowanie w związku z wnioskiem o przysposobienie; w rodzinie zastępczej – data umieszczenia dziecka. Od niej liczą się urlopy.", when: (a) => a.sytuacja === "adopcja" || a.sytuacja === "zastepcza" },
  { id: "urodzenieDziecka", fields: ["dzieckoUrodzenie"], kind: "date", field: "dzieckoUrodzenie", title: "Kiedy urodziło się przyjmowane dziecko?", help: "Urlop na warunkach macierzyńskiego przysługuje do 14. roku życia dziecka przy przysposobieniu, a w rodzinie zastępczej do 7 lat (10 – przy odroczonym obowiązku szkolnym).", when: (a) => a.sytuacja === "adopcja" || a.sytuacja === "zastepcza" },
  { id: "title", fields: ["title"], kind: "choice", field: "title", title: "Na jakiej podstawie pracujesz?", help: "To decyduje, czy masz ubezpieczenie chorobowe – a więc prawo do zasiłku macierzyńskiego.",
    options: [
      { value: "umowa_o_prace", label: "Umowa o pracę" },
      { value: "zlecenie_chorobowe", label: "Umowa zlecenia", hint: "opłacam dobrowolne chorobowe" },
      { value: "zlecenie_bez", label: "Umowa zlecenia", hint: "bez chorobowego" },
      { value: "jdg_chorobowe", label: "Własna działalność", hint: "opłacam dobrowolne chorobowe" },
      { value: "jdg_bez", label: "Własna działalność", hint: "bez chorobowego" },
      { value: "dzielo", label: "Umowa o dzieło" },
      { value: "brak", label: "Obecnie nie pracuję" },
    ] },
  { id: "ubezpieczenieOd", fields: ["ubezpieczenieOd"], kind: "date", field: "ubezpieczenieOd", title: "Od kiedy masz to ubezpieczenie?", help: "Data rozpoczęcia pracy, zlecenia lub zgłoszenia do dobrowolnego chorobowego.", when: sickInsured },
  { id: "umowaOd", fields: ["ubezpieczenieOd"], kind: "date", field: "ubezpieczenieOd", title: "Od kiedy trwa Twoja umowa lub działalność?", help: "Data rozpoczęcia zlecenia lub działalności. Przyda się, jeśli zdecydujesz się dołączyć do dobrowolnego ubezpieczenia chorobowego.", when: (a) => insured(a) && !sickInsured(a) },
  { id: "rodzajUmowy", fields: ["rodzajUmowy"], kind: "choice", field: "rodzajUmowy", title: "Jaka to umowa o pracę?", when: employee,
    options: [{ value: "nieokreslony", label: "Na czas nieokreślony" }, { value: "okreslony", label: "Na czas określony" }, { value: "probny", label: "Na okres próbny" }] },
  { id: "umowaDo", fields: ["umowaDo"], kind: "date", field: "umowaDo", title: "Do kiedy trwa umowa?", help: "Umowa, która skończyłaby się po 3. miesiącu ciąży, przedłuża się do dnia porodu.", when: (a) => employee(a) && (a.rodzajUmowy === "okreslony" || a.rodzajUmowy === "probny") },
  { id: "ustanie", fields: ["ustanie"], kind: "choice", field: "ustanie", title: "Czy Twoja praca lub umowa skończyła się albo skończy się wcześniej?", help: "Np. umowa wygasa, pracodawca ogłosił upadłość albo likwidację. Od daty ustania stosunku pracy zależy prawo do zasiłków.", when: (a) => insured(a) && !selfEmployed(a),
    options: [{ value: "nie", label: "Nie – pracuję dalej" }, { value: "tak", label: "Tak", hint: "podam datę" }] },
  { id: "ustanieData", fields: ["ustanieData"], kind: "date", field: "ustanieData", title: "Jaka jest data ustania stosunku pracy?", help: "Ostatni dzień zatrudnienia (lub umowy zlecenia).", when: (a) => a.ustanie === "tak" },
  { id: "ustaniePowod", fields: ["ustaniePowod"], kind: "choice", field: "ustaniePowod", title: "Z jakiego powodu?", help: "Przy upadłości lub likwidacji pracodawcy w czasie ciąży zasiłek macierzyński może przysługiwać mimo ustania ubezpieczenia.", when: (a) => a.ustanie === "tak",
    options: [{ value: "upadlosc", label: "Upadłość pracodawcy" }, { value: "likwidacja", label: "Likwidacja pracodawcy" }, { value: "smierc_pracodawcy", label: "Śmierć pracodawcy" }, { value: "naruszenie_prawa", label: "Rozwiązanie z naruszeniem prawa", hint: "potwierdzone wyrokiem" }, { value: "inne", label: "Inny powód", hint: "np. koniec umowy" }] },
  { id: "etat", fields: ["etat"], kind: "choice", field: "etat", title: "Na jaki wymiar etatu?", when: employee,
    options: [{ value: "1", label: "Pełny etat" }, { value: "0.75", label: "¾ etatu" }, { value: "0.5", label: "½ etatu" }, { value: "0.25", label: "¼ etatu" }] },
  { id: "platnik", fields: ["liczbaUbezpieczonych"], kind: "number", field: "liczbaUbezpieczonych", suffix: "osób", title: "Ile osób zatrudnia Twój pracodawca lub zleceniodawca?", help: "Jeśli zgłasza do ubezpieczenia chorobowego więcej niż 20 osób, zasiłek wypłaca on – w przeciwnym razie ZUS.", when: (a) => employee(a) || a.title === "zlecenie_chorobowe" },
  { id: "zarobki", fields: ["zarobki"], kind: "number", field: "zarobki", suffix: "zł / mies.", placeholder: "np. 6500",
    title: "Ile średnio zarabiasz miesięcznie brutto?", help: "Przyjmiemy tę kwotę dla ostatnich 12 miesięcy. Na tej podstawie liczymy wysokość zasiłku.", when: (a) => insured(a) && !selfEmployed(a) },
  { id: "podstawa", fields: ["zarobki"], kind: "number", field: "zarobki", suffix: "zł / mies.", placeholder: "np. 5203,35",
    title: "Od jakiej kwoty płacisz składki (podstawa wymiaru)?", help: "Kwota z deklaracji DRA. Zasiłek liczymy od średniej podstawy z 12 miesięcy.", when: (a) => selfEmployed(a) && a.title === "jdg_chorobowe" },
  { id: "skladki", fields: ["skladkiTerminowo"], kind: "choice", field: "skladkiTerminowo", title: "Czy płacisz składki w terminie?", help: "Spóźniona składka może przerwać dobrowolne ubezpieczenie chorobowe.", when: voluntary,
    options: [{ value: "true", label: "Tak, zawsze w terminie" }, { value: "false", label: "Zdarzyło mi się spóźnić" }] },
  { id: "zadluzenie", fields: ["zadluzenie"], kind: "number", field: "zadluzenie", suffix: "zł", placeholder: "0", title: "Czy masz składki ZUS do uregulowania? Jeśli tak – ile?", help: "Przedsiębiorcy dostają zasiłek dopiero po uregulowaniu należności. Wpisz 0, jeśli nie masz.", when: selfEmployed },
  { id: "pesel", fields: ["pesel"], kind: "text", field: "pesel", placeholder: "11 cyfr", title: "Jaki jest Twój PESEL?", help: "Tylko do wydruku wniosków. Wersja demonstracyjna – możesz pominąć." },
];

export const activeQuestions = (a: Answers) => QUESTIONS.filter((q) => !q.when || q.when(a));

/** Pytanie uznajemy za odpowiedziane, gdy główne pole ma wartość. */
export function answered(q: Question, a: Answers) {
  const key = q.kind === "name" ? "imie" : q.field ?? q.fields[0];
  const v = a[key];
  if (q.kind === "name") return !!a.imie?.trim() && !!a.nazwisko?.trim();
  return v !== undefined && v !== null && v !== "";
}

export const missingQuestions = (a: Answers) => activeQuestions(a).filter((q) => !answered(q, a));
/** Krótkie etykiety brakujących danych (np. na pulpicie). */
export const MISSING_LABELS: Record<string, string> = {
  plec: "rola (mama / tata)", sytuacja: "etap rodzicielstwa", termin: "planowana data porodu", dziecko: "data urodzenia dziecka",
  przyjecie: "data przyjęcia dziecka", urodzenieDziecka: "data urodzenia przyjętego dziecka", ustanie: "czy praca się kończy", ustanieData: "data ustania stosunku pracy", ustaniePowod: "przyczyna ustania zatrudnienia",
  title: "forma zatrudnienia", ubezpieczenieOd: "początek ubezpieczenia", umowaOd: "początek umowy lub działalności", rodzajUmowy: "rodzaj umowy", umowaDo: "koniec umowy",
  etat: "wymiar etatu", platnik: "wielkość pracodawcy", zarobki: "zarobki", podstawa: "podstawa składek", skladki: "terminowość składek",
  zadluzenie: "należności do uregulowania", pesel: "PESEL",
};

/* ── Walidacja (wspólna dla ankiety, profilu i API) ── */

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const NAME = /^[\p{L}][\p{L}\p{M} '’.-]*$/u;
const today = () => new Date().toISOString().slice(0, 10);
const shift = (iso: string, days: number) => new Date(new Date(iso + "T12:00:00Z").getTime() + days * 86400000).toISOString().slice(0, 10);
const validIso = (v: unknown): v is string => typeof v === "string" && ISO.test(v) && !Number.isNaN(Date.parse(v + "T12:00:00Z")) && new Date(v + "T12:00:00Z").toISOString().startsWith(v);
const years = (from: string, to: string) => (new Date(to + "T12:00:00Z").getTime() - new Date(from + "T12:00:00Z").getTime()) / (365.25 * 86400000);
const fmt = (iso: string) => iso.split("-").reverse().join(".");

/** Suma kontrolna numeru PESEL. */
export function peselValid(p: string) {
  if (!/^\d{11}$/.test(p)) return false;
  const w = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const sum = w.reduce((s, x, i) => s + x * Number(p[i]), 0);
  return (10 - (sum % 10)) % 10 === Number(p[10]);
}

export const LIMITS = { imie: 40, nazwisko: 60 } as const;

/**
 * Sprawdza zakresy i spójność odpowiedzi. Zwraca komunikaty dla pól z błędem ({} – wszystko w porządku).
 * Pola puste są pomijane (można je uzupełnić później).
 */
export function validateAnswers(raw: Record<string, unknown>): Partial<Record<keyof Answers, string>> {
  const a = raw as Answers;
  const e: Partial<Record<keyof Answers, string>> = {};
  const now = today();
  const has = (k: keyof Answers) => raw[k] !== undefined && raw[k] !== null && raw[k] !== "";

  for (const k of ["imie", "nazwisko"] as const) {
    if (!has(k)) continue;
    const v = String(raw[k]).trim();
    if (v.length > LIMITS[k]) e[k] = `${k === "imie" ? "Imię" : "Nazwisko"} może mieć najwyżej ${LIMITS[k]} znaków.`;
    else if (!NAME.test(v)) e[k] = `${k === "imie" ? "Imię" : "Nazwisko"} może zawierać tylko litery, spacje, apostrof i myślnik.`;
  }
  if (has("pesel") && !peselValid(String(raw.pesel).trim())) e.pesel = "Ten PESEL jest niepoprawny – sprawdź cyfry (11 cyfr z poprawną sumą kontrolną).";

  for (const k of ["termin", "dzieckoData", "dzieckoUrodzenie", "ubezpieczenieOd", "umowaDo", "ustanieData"] as const)
    if (has(k) && !validIso(raw[k])) e[k] = "Podaj poprawną datę.";

  const ok = (k: keyof Answers) => has(k) && !e[k];
  if (ok("termin") && a.sytuacja !== "dziecko") {
    if (a.termin! < shift(now, -14)) e.termin = "Planowana data porodu minęła ponad 2 tygodnie temu. Jeśli dziecko już się urodziło, wybierz „Dziecko już się urodziło”.";
    else if (a.termin! > shift(now, 300)) e.termin = "Planowana data porodu może przypadać najpóźniej ok. 300 dni od dziś.";
  }
  const taking = a.sytuacja === "adopcja" || a.sytuacja === "zastepcza";
  if (ok("dzieckoData")) {
    if (a.sytuacja === "dziecko") {
      if (a.dzieckoData! > now) e.dzieckoData = "Data urodzenia nie może być z przyszłości. Jeśli czekacie na poród, wybierz „Spodziewamy się dziecka”.";
      else if (years(a.dzieckoData!, now) > 18) e.dzieckoData = "Dziecko ma ponad 18 lat – sprawdź datę.";
    } else if (taking) {
      if (a.dzieckoData! > shift(now, 365)) e.dzieckoData = "Data przyjęcia może przypadać najpóźniej za rok.";
      else if (years(a.dzieckoData!, now) > 14) e.dzieckoData = "Data przyjęcia jest sprzed ponad 14 lat – sprawdź datę.";
    }
  }
  if (ok("dzieckoUrodzenie")) {
    if (a.dzieckoUrodzenie! > now) e.dzieckoUrodzenie = "Data urodzenia nie może być z przyszłości.";
    else if (ok("dzieckoData") && taking) {
      if (a.dzieckoUrodzenie! > a.dzieckoData!) e.dzieckoUrodzenie = "Dziecko musi urodzić się przed dniem przyjęcia na wychowanie.";
      else {
        const age = years(a.dzieckoUrodzenie!, a.dzieckoData!);
        const max = a.sytuacja === "adopcja" ? 14 : 10;
        if (age >= max)
          e.dzieckoUrodzenie = a.sytuacja === "adopcja"
            ? "Urlop na warunkach macierzyńskiego przy przysposobieniu przysługuje, gdy dziecko w dniu przyjęcia nie ukończyło 14 lat."
            : "W rodzinie zastępczej urlop przysługuje, gdy dziecko w dniu przyjęcia nie ukończyło 7 lat (10 – przy odroczonym obowiązku szkolnym).";
      }
    }
  }
  if (ok("ubezpieczenieOd")) {
    if (a.ubezpieczenieOd! < "1950-01-01") e.ubezpieczenieOd = "Sprawdź datę rozpoczęcia ubezpieczenia.";
    else if (a.ubezpieczenieOd! > shift(now, 365)) e.ubezpieczenieOd = "Data rozpoczęcia może przypadać najpóźniej za rok.";
    else {
      const event = a.sytuacja === "ciaza" ? a.termin : a.sytuacja === "dziecko" || taking ? a.dzieckoData : undefined;
      if (event && validIso(event) && a.ubezpieczenieOd! > event)
        e.ubezpieczenieOd = `Ubezpieczenie zaczyna się po dniu ${a.sytuacja === "ciaza" ? "planowanego porodu" : a.sytuacja === "dziecko" ? "urodzenia dziecka" : "przyjęcia dziecka"} (${fmt(event)}) – w tym dniu nie będzie ubezpieczenia, więc zasiłek macierzyński nie przysługuje. Sprawdź datę.`;
    }
  }
  if (ok("umowaDo") && ok("ubezpieczenieOd") && a.umowaDo! < a.ubezpieczenieOd!) e.umowaDo = "Umowa nie może kończyć się przed jej rozpoczęciem.";
  if (ok("ustanieData") && ok("ubezpieczenieOd") && a.ustanieData! < a.ubezpieczenieOd!) e.ustanieData = "Data ustania nie może być wcześniejsza niż początek ubezpieczenia.";

  const num = (k: keyof Answers) => (has(k) ? Number(String(raw[k]).replace(",", ".").replace(/\s/g, "")) : undefined);
  const liczba = num("liczbaUbezpieczonych");
  if (liczba !== undefined && (!Number.isInteger(liczba) || liczba < 1 || liczba > 1_000_000)) e.liczbaUbezpieczonych = "Podaj liczbę całkowitą, co najmniej 1.";
  const zarobki = num("zarobki");
  if (zarobki !== undefined && (!Number.isFinite(zarobki) || zarobki <= 0 || zarobki > 1_000_000)) e.zarobki = "Podaj kwotę większą od zera.";
  const dlug = num("zadluzenie");
  if (dlug !== undefined && (!Number.isFinite(dlug) || dlug < 0 || dlug > 10_000_000)) e.zadluzenie = "Podaj kwotę 0 lub większą.";
  return e;
}
