/**
 * SYMULOWANE dane z systemów ZUS (KSI/PUE) i mObywatela.
 * Wszystkie osoby i dane są fikcyjne – służą wyłącznie demonstracji.
 */
import { Title } from "./engine";

export type EZla = { seria: string; od: string; do: string; kod: string; przyczyna: string; lekarz: string; status: string };
export type UstaniePowod = "upadlosc" | "likwidacja" | "smierc_pracodawcy" | "naruszenie_prawa" | "inne";
export type Persona = {
  id: string;
  imie: string;
  nazwisko: string;
  pesel: string;
  plec: "K" | "M";
  dataUrodzenia: string;
  title: Title;
  tytulOpis: string;
  platnik?: { nazwa: string; nip: string; liczbaUbezpieczonych: number };
  ubezpieczenieOd: string;
  rodzajUmowy?: "nieokreslony" | "okreslony" | "probny";
  umowaDo?: string;
  etat?: number;
  przychody: { miesiac: string; kwota: number }[];
  zadluzenie: number;
  skladkiTerminowo: boolean;
  ezla: EZla[];
  ciaza?: { przewidywanyPorod: string; poczatek: string };
  /** przyjęcie dziecka na wychowanie: przysposobienie (adopcja) lub rodzina zastępcza niezawodowa */
  przyjecie?: { rodzaj: "adopcja" | "zastepcza"; data: string };
  /** data ustania stosunku pracy / zakończenia umowy (jeśli nastąpiło lub nastąpi) i jego przyczyna */
  ustanieZatrudnienia?: { data: string; powod: UstaniePowod };
  partnerId?: string;
  dzieci: { imie: string; dataUrodzenia: string }[];
  opisScenariusza: string;
};

const months = (from: string, amounts: number[]) => {
  const [y, m] = from.split("-").map(Number);
  return amounts.map((kwota, i) => {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    return { miesiac: d.toISOString().slice(0, 7), kwota };
  });
};

export const PERSONAS: Persona[] = [
  {
    id: "anna",
    imie: "Anna",
    nazwisko: "Kowalczyk",
    pesel: "93041512340",
    plec: "K",
    dataUrodzenia: "1993-04-15",
    title: "umowa_o_prace",
    tytulOpis: "Pracownik – umowa o pracę na czas nieokreślony, pełny etat",
    platnik: { nazwa: "Przykładowa Spółka Logistyczna S.A.", nip: "5250000015", liczbaUbezpieczonych: 214 },
    ubezpieczenieOd: "2019-03-01",
    rodzajUmowy: "nieokreslony",
    etat: 1,
    przychody: months("2025-11", [8200, 8200, 8200, 8650, 8200, 8200, 8200, 8200, 9100, 8200, 8200, 8200]),
    zadluzenie: 0,
    skladkiTerminowo: true,
    ezla: [
      { seria: "ZY 1234567", od: "2026-10-06", do: "2026-11-30", kod: "B", przyczyna: "Niezdolność do pracy w okresie ciąży", lekarz: "lek. Ewa Przykładowa (ginekolog)", status: "Doręczone płatnikowi" },
    ],
    ciaza: { przewidywanyPorod: "2027-03-12", poczatek: "2026-06-05" },
    partnerId: "piotr",
    dzieci: [],
    opisScenariusza: "Pracownica dużej firmy (>20 ubezpieczonych) – zasiłki wypłaca pracodawca. Planuje podział urlopu z partnerem.",
  },
  {
    id: "piotr",
    imie: "Piotr",
    nazwisko: "Kowalczyk",
    pesel: "91110254319",
    plec: "M",
    dataUrodzenia: "1991-11-02",
    title: "umowa_o_prace",
    tytulOpis: "Pracownik – umowa o pracę, pełny etat",
    platnik: { nazwa: "Mała Pracownia Projektowa s.c.", nip: "5250000021", liczbaUbezpieczonych: 7 },
    ubezpieczenieOd: "2021-09-01",
    rodzajUmowy: "nieokreslony",
    etat: 1,
    przychody: months("2025-11", Array(12).fill(10500)),
    zadluzenie: 0,
    skladkiTerminowo: true,
    ezla: [],
    partnerId: "anna",
    dzieci: [],
    opisScenariusza: "Ojciec – pracodawca zgłasza ≤20 osób, więc zasiłek macierzyński (ojcowski, rodzicielski) wypłaci ZUS.",
  },
  {
    id: "magdalena",
    imie: "Magdalena",
    nazwisko: "Zawadzka",
    pesel: "95072898767",
    plec: "K",
    dataUrodzenia: "1995-07-28",
    title: "jdg_chorobowe",
    tytulOpis: "Pozarolnicza działalność gospodarcza – z dobrowolnym ubezpieczeniem chorobowym",
    ubezpieczenieOd: "2026-05-01",
    przychody: months("2026-05", [5652, 5652, 14800, 14800, 14800, 14800, 14800]),
    zadluzenie: 412.55,
    skladkiTerminowo: false,
    ezla: [
      { seria: "ZY 7654321", od: "2026-11-03", do: "2026-12-01", kod: "B", przyczyna: "Niezdolność do pracy w okresie ciąży", lekarz: "lek. Jan Testowy", status: "Przyjęte w ZUS" },
    ],
    ciaza: { przewidywanyPorod: "2027-02-20", poczatek: "2026-05-16" },
    dzieci: [],
    opisScenariusza: "Działalność od maja 2026 r., podstawa podniesiona w ciąży, składki do uregulowania – wysoka liczba ryzyk.",
  },
  {
    id: "katarzyna",
    imie: "Katarzyna",
    nazwisko: "Lis",
    pesel: "99120311127",
    plec: "K",
    dataUrodzenia: "1999-12-03",
    title: "zlecenie_bez",
    tytulOpis: "Umowa zlecenia – bez dobrowolnego ubezpieczenia chorobowego",
    platnik: { nazwa: "Agencja Eventowa Sp. z o.o.", nip: "5250000038", liczbaUbezpieczonych: 45 },
    ubezpieczenieOd: "2025-02-01",
    umowaDo: "2027-01-31",
    przychody: months("2025-11", Array(12).fill(4300)),
    zadluzenie: 0,
    skladkiTerminowo: true,
    ezla: [{ seria: "ZY 1112223", od: "2026-11-10", do: "2026-11-24", kod: "B", przyczyna: "Niezdolność do pracy w okresie ciąży", lekarz: "lek. Anna Wzorcowa", status: "Brak ubezpieczenia chorobowego" }],
    ciaza: { przewidywanyPorod: "2027-04-02", poczatek: "2026-06-26" },
    dzieci: [],
    opisScenariusza: "Zleceniobiorczyni bez chorobowego, umowa kończy się przed porodem – brak prawa do zasiłków.",
  },
  {
    id: "ewa",
    imie: "Ewa",
    nazwisko: "Nowicka",
    pesel: "88050566668",
    plec: "K",
    dataUrodzenia: "1988-05-05",
    title: "umowa_o_prace",
    tytulOpis: "Pracownik – umowa o pracę, 3/4 etatu",
    platnik: { nazwa: "Szkoła Podstawowa nr 0 (fikcyjna)", nip: "5250000044", liczbaUbezpieczonych: 63 },
    ubezpieczenieOd: "2012-09-01",
    rodzajUmowy: "nieokreslony",
    etat: 0.75,
    przychody: months("2025-11", Array(12).fill(5600)),
    zadluzenie: 0,
    skladkiTerminowo: true,
    ezla: [],
    dzieci: [{ imie: "Zosia (przyjęta)", dataUrodzenia: "2023-08-14" }],
    przyjecie: { rodzaj: "adopcja", data: "2026-10-15" },
    opisScenariusza: "Rodzic adopcyjny – przyjęła 3-letnie dziecko, złożony wniosek o przysposobienie.",
  },
];

export function debtCertificate(p: Persona, onDate: string) {
  return {
    numer: `ZUS/ZNZ/${onDate.replace(/-/g, "")}/${p.pesel.slice(-5)}`,
    naDzien: onDate,
    wystawiono: new Date().toISOString().slice(0, 10),
    zadluzenie: p.zadluzenie,
    struktura: p.zadluzenie
      ? [
          { fundusz: "FUS – ubezpieczenia społeczne", kwota: Math.round(p.zadluzenie * 0.72 * 100) / 100 },
          { fundusz: "NFZ – ubezpieczenie zdrowotne", kwota: Math.round(p.zadluzenie * 0.28 * 100) / 100 },
        ]
      : [],
    tresc: p.zadluzenie
      ? `Płatnik składek posiada należności z tytułu składek do uregulowania w łącznej kwocie ${p.zadluzenie.toFixed(2)}\u00a0zł.`
      : "Płatnik składek nie posiada należności z tytułu składek do uregulowania.",
  };
}

export const ZUS_MESSAGES = [
  { id: 1, data: "2026-11-04", temat: "Potwierdzenie przyjęcia e-ZLA", tresc: "Zaświadczenie lekarskie zostało przyjęte. Zasiłek wypłaci płatnik składek." },
  { id: 2, data: "2026-10-01", temat: "Informacja o stanie konta", tresc: "Aktualne informacje o składkach są dostępne w zakładce Ubezpieczony → Stan konta." },
];
