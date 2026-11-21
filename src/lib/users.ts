import { randomUUID } from "crypto";
import { TITLE_LABELS, addDays, isValidDate, type Title } from "./engine";
import type { Persona, UstaniePowod } from "./mock";
import { Answers, missingQuestions } from "./quiz";
import { clearCookie, readCookie, writeCookie } from "./cookie";

/**
 * Dane użytkowników – trzymane w podpisanych ciasteczkach tej przeglądarki (demo bez bazy danych):
 *  • konto założone w aplikacji (bez pobierania danych z ZUS) – odpowiedzi z ankiety,
 *  • poprawki danych pobranych z ZUS (konta testowe) – tylko zmienione pola, ważne w bieżącej sesji.
 * Dzięki temu dane nie giną między instancjami serwera i nie są widoczne dla innych odwiedzających.
 * W produkcji: baza danych + login.gov.pl.
 */
export type UserAccount = { id: string; createdAt: string; updatedAt: string; answers: Answers };
type Override = { id: string; answers: Answers };

export const ACCOUNT_COOKIE = "pp_account";
export const OVERRIDES_COOKIE = "pp_overrides";
const MAX_AGE = 60 * 60 * 24 * 30;

/* ── Konta z ankiety ── */
export async function getAccount(id: string): Promise<UserAccount | null> {
  if (!id.startsWith("u-")) return null;
  const acc = await readCookie<UserAccount>(ACCOUNT_COOKIE);
  return acc && acc.id === id ? acc : null;
}

export async function saveAccount(answers: Answers, id?: string): Promise<UserAccount> {
  const now = new Date().toISOString();
  const prev = id ? await getAccount(id) : null;
  const acc: UserAccount = prev ? { ...prev, answers, updatedAt: now } : { id: `u-${randomUUID().slice(0, 8)}`, createdAt: now, updatedAt: now, answers };
  await writeCookie(ACCOUNT_COOKIE, acc, MAX_AGE);
  return acc;
}

/* ── Poprawki danych z ZUS ── */
export async function getOverride(id: string): Promise<Answers | null> {
  const ov = await readCookie<Override>(OVERRIDES_COOKIE);
  return ov && ov.id === id ? ov.answers : null;
}
export async function saveOverride(id: string, answers: Answers) {
  if (Object.keys(answers).length) await writeCookie(OVERRIDES_COOKIE, { id, answers } satisfies Override, MAX_AGE);
  else await clearCookie(OVERRIDES_COOKIE);
}

/* ── Walidacja ── */
const POWODY: readonly UstaniePowod[] = ["upadlosc", "likwidacja", "smierc_pracodawcy", "naruszenie_prawa", "inne"];

/** Oczyszczenie odpowiedzi z formularza (typy, zakresy) – nie ufamy danym z przeglądarki. Pomija puste pola. */
export function cleanAnswers(raw: Record<string, unknown>): Answers {
  const str = (v: unknown, max = 80) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
  const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const num = (v: unknown, min: number, max: number) => {
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v.replace(",", ".").replace(/\s/g, "")) : NaN;
    return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
  };
  const oneOf = <T extends string>(v: unknown, list: readonly T[]) => (list.includes(v as T) ? (v as T) : undefined);
  const titles = Object.keys(TITLE_LABELS) as Title[];
  const sytuacja = raw.sytuacja === "przyjecie" ? "adopcja" : raw.sytuacja; // zgodność ze starszymi ankietami
  const a: Answers = {
    imie: str(raw.imie, 40), nazwisko: str(raw.nazwisko, 60),
    plec: oneOf(raw.plec, ["K", "M"] as const),
    pesel: typeof raw.pesel === "string" && /^\d{11}$/.test(raw.pesel.trim()) ? raw.pesel.trim() : undefined,
    sytuacja: oneOf(sytuacja, ["ciaza", "dziecko", "adopcja", "zastepcza", "planujemy"] as const),
    termin: date(raw.termin), dzieckoImie: str(raw.dzieckoImie, 40), dzieckoData: date(raw.dzieckoData), dzieckoUrodzenie: date(raw.dzieckoUrodzenie),
    title: oneOf(raw.title, titles), ubezpieczenieOd: date(raw.ubezpieczenieOd),
    rodzajUmowy: oneOf(raw.rodzajUmowy, ["nieokreslony", "okreslony", "probny"] as const), umowaDo: date(raw.umowaDo),
    ustanie: oneOf(raw.ustanie, ["tak", "nie"] as const), ustanieData: date(raw.ustanieData), ustaniePowod: oneOf(raw.ustaniePowod, POWODY),
    etat: num(raw.etat, 0.05, 1), platnikNazwa: str(raw.platnikNazwa), liczbaUbezpieczonych: num(raw.liczbaUbezpieczonych, 0, 1_000_000),
    zarobki: num(raw.zarobki, 0, 1_000_000), zadluzenie: num(raw.zadluzenie, 0, 10_000_000),
    skladkiTerminowo: raw.skladkiTerminowo === true || raw.skladkiTerminowo === "true" ? true : raw.skladkiTerminowo === false || raw.skladkiTerminowo === "false" ? false : undefined,
  };
  for (const k of Object.keys(a) as (keyof Answers)[]) if (a[k] === undefined) delete a[k];
  return a;
}

/* ── Odpowiedzi ⇄ osoba ── */
const lastMonths = (amount: number) => {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 12 + i, 1));
    return { miesiac: d.toISOString().slice(0, 7), kwota: amount };
  });
};

/**
 * Nakłada odpowiedzi na osobę. Zmienia tylko pola obecne w `a` – dzięki temu ta sama funkcja buduje
 * konto z ankiety (na pustej osobie) i nadpisuje wybrane dane pobrane z ZUS.
 */
export function applyAnswers(base: Persona, a: Answers): Persona {
  const p: Persona = structuredClone(base);
  if (a.imie) p.imie = a.imie;
  if (a.nazwisko) p.nazwisko = a.nazwisko;
  if (a.pesel) p.pesel = a.pesel;
  if (a.plec) p.plec = a.plec;
  if (a.title) {
    p.title = a.title;
    p.tytulOpis = a.title === base.title ? base.tytulOpis : TITLE_LABELS[a.title];
  }
  if (a.ubezpieczenieOd) p.ubezpieczenieOd = a.ubezpieczenieOd;
  if (a.rodzajUmowy) p.rodzajUmowy = a.rodzajUmowy;
  if (a.umowaDo) p.umowaDo = a.umowaDo;
  if (a.etat) p.etat = a.etat;
  const hasPayer = p.title === "umowa_o_prace" || p.title.startsWith("zlecenie");
  if (!hasPayer) p.platnik = undefined;
  else if (!p.platnik) p.platnik = { nazwa: a.platnikNazwa ?? "Pracodawca (wpisany przez Ciebie)", nip: "—", liczbaUbezpieczonych: a.liczbaUbezpieczonych ?? 0 };
  if (p.platnik && a.liczbaUbezpieczonych !== undefined) p.platnik = { ...p.platnik, liczbaUbezpieczonych: a.liczbaUbezpieczonych };
  if (a.zarobki !== undefined) p.przychody = a.zarobki > 0 ? lastMonths(a.zarobki) : [];
  if (a.skladkiTerminowo !== undefined) p.skladkiTerminowo = a.skladkiTerminowo;
  if (a.zadluzenie !== undefined) p.zadluzenie = a.zadluzenie;

  // sytuacja rodzinna
  const syt = a.sytuacja;
  if (syt) {
    if (syt !== "ciaza") p.ciaza = undefined;
    if (syt !== "adopcja" && syt !== "zastepcza") p.przyjecie = undefined;
    if (syt === "planujemy") p.dzieci = [];
  }
  const now = syt ?? (p.przyjecie ? p.przyjecie.rodzaj : p.ciaza ? "ciaza" : p.dzieci.length ? "dziecko" : "planujemy");
  if (now === "ciaza" && a.termin) p.ciaza = { przewidywanyPorod: a.termin, poczatek: addDays(a.termin, -280) };
  if (now === "dziecko" && a.dzieckoData) p.dzieci = [{ imie: a.dzieckoImie ?? p.dzieci[0]?.imie ?? "Dziecko", dataUrodzenia: a.dzieckoData }];
  if (now === "adopcja" || now === "zastepcza") {
    const data = a.dzieckoData ?? p.przyjecie?.data ?? "";
    p.przyjecie = { rodzaj: now, data };
    const ur = a.dzieckoUrodzenie ?? p.dzieci[0]?.dataUrodzenia;
    p.dzieci = ur ? [{ imie: a.dzieckoImie ?? p.dzieci[0]?.imie ?? "Dziecko", dataUrodzenia: ur }] : p.dzieci;
  }

  // ustanie stosunku pracy
  if (a.ustanie === "nie") p.ustanieZatrudnienia = undefined;
  if (a.ustanie === "tak" || a.ustanieData || a.ustaniePowod) {
    const data = a.ustanieData ?? p.ustanieZatrudnienia?.data;
    p.ustanieZatrudnienia = data ? { data, powod: a.ustaniePowod ?? p.ustanieZatrudnienia?.powod ?? "inne" } : p.ustanieZatrudnienia;
  }
  return p;
}

/** Odwrotność: dane osoby w kształcie odpowiedzi (do formularza profilu). */
export function personaToAnswers(p: Persona): Answers {
  const months = p.przychody.slice(-12).map((m) => m.kwota).filter((k) => k > 0);
  const a: Answers = {
    imie: p.imie, nazwisko: p.nazwisko, plec: p.plec,
    pesel: /^\d{11}$/.test(p.pesel) ? p.pesel : undefined,
    sytuacja: p.przyjecie ? p.przyjecie.rodzaj : p.ciaza ? "ciaza" : p.dzieci.length ? "dziecko" : "planujemy",
    termin: p.ciaza?.przewidywanyPorod,
    dzieckoImie: p.dzieci[0]?.imie,
    dzieckoData: p.przyjecie ? p.przyjecie.data || undefined : p.dzieci[0]?.dataUrodzenia,
    dzieckoUrodzenie: p.przyjecie ? p.dzieci[0]?.dataUrodzenia : undefined,
    title: p.title, ubezpieczenieOd: p.ubezpieczenieOd || undefined,
    rodzajUmowy: p.rodzajUmowy, umowaDo: p.umowaDo, etat: p.etat,
    ustanie: p.ustanieZatrudnienia ? "tak" : "nie", ustanieData: p.ustanieZatrudnienia?.data, ustaniePowod: p.ustanieZatrudnienia?.powod,
    liczbaUbezpieczonych: p.platnik?.liczbaUbezpieczonych,
    zarobki: months.length ? Math.round((months.reduce((x, y) => x + y, 0) / months.length) * 100) / 100 : undefined,
    skladkiTerminowo: p.skladkiTerminowo, zadluzenie: p.zadluzenie,
  };
  for (const k of Object.keys(a) as (keyof Answers)[]) if (a[k] === undefined) delete a[k];
  return a;
}

const BLANK: Persona = {
  id: "", imie: "Użytkownik", nazwisko: "", pesel: "—", plec: "K", dataUrodzenia: "", title: "brak",
  tytulOpis: "Nie podano – uzupełnij w ankiecie", ubezpieczenieOd: "", przychody: [], zadluzenie: 0, skladkiTerminowo: true,
  ezla: [], dzieci: [], opisScenariusza: "Konto założone bez pobierania danych z ZUS – dane z ankiety.",
};

/** Osoba z konta założonego w aplikacji – ten sam kształt co dane „z ZUS”. */
export function personaFromAccount(acc: UserAccount): Persona & { wlasne: true; brakujace: string[] } {
  const p = applyAnswers({ ...BLANK, id: acc.id }, acc.answers);
  if (!acc.answers.title) p.tytulOpis = BLANK.tytulOpis;
  return { ...p, wlasne: true, brakujace: missingQuestions(acc.answers).map((q) => q.id) };
}

/** Osoba z ZUS z nałożonymi nadpisaniami użytkownika (lista nadpisanych pól w `nadpisane`). */
export async function personaWithOverrides(p: Persona): Promise<Persona & { nadpisane?: (keyof Answers)[] }> {
  const ov = await getOverride(p.id);
  if (!ov) return p;
  return { ...applyAnswers(p, ov), nadpisane: Object.keys(ov) as (keyof Answers)[] };
}
