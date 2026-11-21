/**
 * Wbudowane sprawy testowe (syntetyczne, odwzorowujące typowe stany faktyczne
 * z zestawów ZUS). Oryginalne dokumenty ZUS z HackNation można wgrać w zakładce
 * „Sprawy” – parser odczyta z nich dane do kalkulatora.
 */
import { CalcInput, Title } from "./engine";

export function defaultCalcInput(): CalcInput {
  return {
    scenario: "porod",
    eventDate: "2027-03-12",
    children: 1,
    zaZyciem: false,
    childAgeYears: 0,
    odroczenieSzkolne: false,
    premature: { enabled: false, tydzienCiazy: 39, masa: 3400, dniHospitalizacji: 0, who: "matka" },
    stillbirth: false,
    childDeathDay: null,
    mother: { insured: true, base: 7000, rodzicielskiWeeks: 32, workFraction: 0, beforeBirthWeeks: 0, jednolity: false, monthlyWage: 0 },
    father: { insured: true, base: 7000, rodzicielskiWeeks: 9, workFraction: 0, takeOverWeeks: 0, ojcowski: true, monthlyWage: 0 },
    rodzicielskiMode: "kolejno",
    fullPoolException: false,
  };
}

export type CaseDoc = { typ: string; nazwa: string; pola: Record<string, string> };
export type TestCase = {
  id: string;
  tytul: string;
  opis: string;
  kategoria: string;
  tytulUbezpieczenia: Title;
  dokumenty: CaseDoc[];
  rozstrzygniecie: { status: "przyznano" | "odmowa" | "czesciowo"; uzasadnienie: string };
  podstawa: { months: number[]; etat?: number; overrideBase?: number };
  podstawaOjca?: number;
  calc: Partial<Omit<CalcInput, "mother" | "father" | "premature">> & {
    mother?: Partial<CalcInput["mother"]>;
    father?: Partial<CalcInput["father"]>;
    premature?: Partial<NonNullable<CalcInput["premature"]>>;
  };
  oczekiwane: string;
};

export const CASES: TestCase[] = [
  {
    id: "S01",
    tytul: "Pracownica, jedno dziecko, cały urlop matki",
    opis: "Umowa o pracę od 2019 r., pracodawca zgłasza 214 osób. Matka korzysta z macierzyńskiego i rodzicielskiego, ojciec z 9 tyg. i urlopu ojcowskiego.",
    kategoria: "Poród",
    tytulUbezpieczenia: "umowa_o_prace",
    dokumenty: [
      { typ: "Wniosek o urlop", nazwa: "Wniosek o urlop macierzyński i rodzicielski", pola: { "Data porodu": "12.03.2027", "Wymiar": "20 + 32 tyg." } },
      { typ: "Z-3", nazwa: "Zaświadczenie płatnika składek", pola: { "Wynagrodzenie (12 mies.)": "8\u00a0200 – 9\u00a0100\u00a0zł", "Liczba ubezpieczonych": "214" } },
      { typ: "Odpis aktu urodzenia", nazwa: "Skrócony odpis aktu urodzenia", pola: { "Dziecko": "1" } },
    ],
    rozstrzygniecie: { status: "przyznano", uzasadnienie: "Podleganie ubezpieczeniu chorobowemu w dniu porodu. Zasiłek ustala i wypłaca płatnik składek." },
    podstawa: { months: [8200, 8200, 8200, 8650, 8200, 8200, 8200, 8200, 9100, 8200, 8200, 8200], etat: 1 },
    podstawaOjca: 9060.45,
    calc: { eventDate: "2027-03-12", mother: { rodzicielskiWeeks: 32 }, father: { rodzicielskiWeeks: 9, ojcowski: true } },
    oczekiwane: "Matka: 20 tyg. × 100% + 32 tyg. × 70%; Ojciec: 14 dni × 100% + 9 tyg. × 70%.",
  },
  {
    id: "S02",
    tytul: "Stawka 81,5% – wniosek w ciągu 21 dni",
    opis: "Pracownica składa w 10. dniu po porodzie wniosek o zasiłek za macierzyński i rodzicielski w pełnym wymiarze.",
    kategoria: "Poród",
    tytulUbezpieczenia: "umowa_o_prace",
    dokumenty: [
      { typ: "Wniosek", nazwa: "Wniosek o udzielenie urlopu macierzyńskiego i rodzicielskiego w pełnym wymiarze", pola: { "Data złożenia": "10 dni po porodzie" } },
      { typ: "Z-3", nazwa: "Zaświadczenie płatnika składek", pola: { "Podstawa wymiaru": "6\u00a0040,95\u00a0zł" } },
    ],
    rozstrzygniecie: { status: "przyznano", uzasadnienie: "Wniosek złożony w terminie 21 dni – zasiłek 81,5% za cały okres." },
    podstawa: { months: [], overrideBase: 6040.95 },
    calc: { eventDate: "2027-01-20", mother: { jednolity: true, rodzicielskiWeeks: 32 }, father: { insured: false, ojcowski: false, rodzicielskiWeeks: 0 } },
    oczekiwane: "Matka: 52 tyg. × 81,5% (4\u00a0923,37\u00a0zł/mies.).",
  },
  {
    id: "S03",
    tytul: "Działalność założona w ciąży, podwyższona podstawa",
    opis: "Przedsiębiorczyni zgłosiła się do dobrowolnego chorobowego w 3. miesiącu ciąży i po 2 miesiącach podniosła podstawę składek do 14\u00a0800\u00a0zł. Kwota do uregulowania: 412,55\u00a0zł.",
    kategoria: "Ryzyka",
    tytulUbezpieczenia: "jdg_chorobowe",
    dokumenty: [
      { typ: "ZAM", nazwa: "Wniosek o zasiłek macierzyński", pola: { "Tytuł": "działalność gospodarcza" } },
      { typ: "Poświadczenie", nazwa: "Poświadczenie ubezpieczenia chorobowego", pola: { "Od": "01.05.2026", "Podstawy": "5\u00a0652 → 14\u00a0800\u00a0zł" } },
      { typ: "Zaświadczenie", nazwa: "Informacja o należnościach do uregulowania", pola: { "Kwota do uregulowania": "412,55\u00a0zł" } },
    ],
    rozstrzygniecie: { status: "czesciowo", uzasadnienie: "ZUS przeprowadził postępowanie wyjaśniające; podwyższenie uznano za wyłącznie w celu uzyskania wyższych świadczeń – podstawę ustalono na poziomie realnych przychodów. Wypłata po uregulowaniu należności." },
    podstawa: { months: [5652, 5652, 5652, 5652, 5652, 5652, 5652] },
    calc: { eventDate: "2027-02-20", mother: { rodzicielskiWeeks: 32 }, father: { insured: false, ojcowski: false, rodzicielskiWeeks: 0 } },
    oczekiwane: "Podstawa z realnych przychodów: 5\u00a0652 × (1 − 13,71%) = 4\u00a0877,11\u00a0zł.",
  },
  {
    id: "S04",
    tytul: "Umowa zlecenia bez chorobowego",
    opis: "Zleceniobiorczyni nie przystąpiła do dobrowolnego ubezpieczenia chorobowego. Złożyła ZAM po porodzie.",
    kategoria: "Odmowa",
    tytulUbezpieczenia: "zlecenie_bez",
    dokumenty: [
      { typ: "ZAM", nazwa: "Wniosek o zasiłek macierzyński", pola: { "Tytuł": "umowa zlecenia" } },
      { typ: "Zrzut KSI", nazwa: "Okresy ubezpieczenia", pola: { "Chorobowe": "brak" } },
    ],
    rozstrzygniecie: { status: "odmowa", uzasadnienie: "Brak ubezpieczenia chorobowego w dniu porodu – zasiłek macierzyński nie przysługuje." },
    podstawa: { months: Array(12).fill(4300) },
    calc: { eventDate: "2027-04-02", mother: { insured: false, rodzicielskiWeeks: 0 }, father: { insured: false, ojcowski: false, rodzicielskiWeeks: 0 } },
    oczekiwane: "Brak prawa do zasiłku – wskazanie świadczenia rodzicielskiego.",
  },
  {
    id: "S05",
    tytul: "Martwe urodzenie",
    opis: "Pracownica urodziła martwe dziecko. Złożono zaświadczenie o martwym urodzeniu.",
    kategoria: "Sytuacje szczególne",
    tytulUbezpieczenia: "umowa_o_prace",
    dokumenty: [
      { typ: "Zaświadczenie", nazwa: "Karta martwego urodzenia / odpis aktu urodzenia z adnotacją", pola: {} },
      { typ: "Z-3", nazwa: "Zaświadczenie płatnika składek", pola: { "Podstawa": "5\u00a0177,40\u00a0zł" } },
    ],
    rozstrzygniecie: { status: "przyznano", uzasadnienie: "Zasiłek macierzyński za 8 tygodni po porodzie, 100% podstawy." },
    podstawa: { months: [], overrideBase: 5177.4 },
    calc: { eventDate: "2026-10-01", stillbirth: true, mother: { rodzicielskiWeeks: 0 }, father: { ojcowski: false, rodzicielskiWeeks: 0 } },
    oczekiwane: "8 tyg. (56 dni) × 100%.",
  },
  {
    id: "S06",
    tytul: "Wcześniak – 26. tydzień ciąży",
    opis: "Dziecko urodzone w 26. tygodniu, masa 890 g, hospitalizacja 84 dni. Matka korzysta z uzupełniającego urlopu macierzyńskiego.",
    kategoria: "Sytuacje szczególne",
    tytulUbezpieczenia: "umowa_o_prace",
    dokumenty: [
      { typ: "Zaświadczenie szpitala", nazwa: "Zaświadczenie o tygodniu ciąży, masie i hospitalizacji", pola: { "Tydzień": "26", "Masa": "890 g", "Hospitalizacja": "84 dni" } },
      { typ: "Z-3", nazwa: "Zaświadczenie płatnika składek", pola: { "Podstawa": "6\u00a0903,20\u00a0zł" } },
    ],
    rozstrzygniecie: { status: "przyznano", uzasadnienie: "Uzupełniający urlop macierzyński: 12 tyg. hospitalizacji (maks. 15)." },
    podstawa: { months: [], overrideBase: 6903.2 },
    calc: { eventDate: "2026-09-15", premature: { enabled: true, tydzienCiazy: 26, masa: 890, dniHospitalizacji: 84, who: "matka" }, mother: { rodzicielskiWeeks: 32 }, father: { rodzicielskiWeeks: 9 } },
    oczekiwane: "20 tyg. macierzyńskiego + 12 tyg. uzupełniającego (100%) + rodzicielski.",
  },
  {
    id: "S07",
    tytul: "Ojciec przejmuje część macierzyńskiego",
    opis: "Po 14 tyg. matka rezygnuje z dalszej części urlopu macierzyńskiego, którą przejmuje ojciec; ojciec bierze też urlop ojcowski.",
    kategoria: "Oboje rodzice",
    tytulUbezpieczenia: "umowa_o_prace",
    dokumenty: [
      { typ: "Wniosek", nazwa: "Rezygnacja matki z części urlopu macierzyńskiego", pola: {} },
      { typ: "Wniosek", nazwa: "Wniosek ojca o urlop macierzyński (przejęty) i ojcowski", pola: {} },
      { typ: "Z-3", nazwa: "Zaświadczenia płatników matki i ojca", pola: {} },
    ],
    rozstrzygniecie: { status: "przyznano", uzasadnienie: "Ojciec przejął 6 tyg. urlopu macierzyńskiego – płatne 100% jego podstawy." },
    podstawa: { months: [], overrideBase: 5800 },
    podstawaOjca: 9060.45,
    calc: { eventDate: "2027-01-10", mother: { rodzicielskiWeeks: 20 }, father: { takeOverWeeks: 6, rodzicielskiWeeks: 21, ojcowski: true } },
    oczekiwane: "Matka 14 tyg. 100% + 20 tyg. 70%; Ojciec 6 tyg. 100% + 21 tyg. 70% + 14 dni 100%.",
  },
  {
    id: "S08",
    tytul: "Łączenie rodzicielskiego z pracą na ½ etatu",
    opis: "Pracownica łączy cały urlop rodzicielski z pracą w połowie wymiaru czasu pracy.",
    kategoria: "Łączenie z pracą",
    tytulUbezpieczenia: "umowa_o_prace",
    dokumenty: [{ typ: "Wniosek", nazwa: "Wniosek o podjęcie pracy w trakcie urlopu rodzicielskiego (½ etatu)", pola: {} }],
    rozstrzygniecie: { status: "przyznano", uzasadnienie: "Urlop wydłużony proporcjonalnie (32 → 64 tyg.), zasiłek 50% kwoty za okres rodzicielskiego." },
    podstawa: { months: [], overrideBase: 6903.2 },
    calc: { eventDate: "2027-02-01", mother: { rodzicielskiWeeks: 32, workFraction: 0.5, monthlyWage: 8000 }, father: { rodzicielskiWeeks: 0, ojcowski: false } },
    oczekiwane: "Rodzicielski 64 tyg., zasiłek ok. 2\u00a0416\u00a0zł/mies. + wynagrodzenie za ½ etatu.",
  },
  {
    id: "S09",
    tytul: "Adopcja 3-letniego dziecka",
    opis: "Pracownica przyjęła dziecko na wychowanie i wystąpiła do sądu o przysposobienie.",
    kategoria: "Adopcja / rodzina zastępcza",
    tytulUbezpieczenia: "umowa_o_prace",
    dokumenty: [
      { typ: "Zaświadczenie sądu", nazwa: "Zaświadczenie o wszczęciu postępowania o przysposobienie", pola: {} },
      { typ: "Z-3", nazwa: "Zaświadczenie płatnika składek", pola: { "Podstawa": "4\u00a0832,24\u00a0zł" } },
    ],
    rozstrzygniecie: { status: "przyznano", uzasadnienie: "20 tyg. urlopu na warunkach urlopu macierzyńskiego (100%) + rodzicielski." },
    podstawa: { months: Array(12).fill(5600), etat: 0.75 },
    calc: { scenario: "adopcja", eventDate: "2026-11-02", childAgeYears: 3, mother: { rodzicielskiWeeks: 32 }, father: { insured: false, ojcowski: false, rodzicielskiWeeks: 0 } },
    oczekiwane: "20 tyg. × 100% + 32 tyg. × 70%.",
  },
  {
    id: "S10",
    tytul: "Bliźnięta z zaświadczeniem „Za życiem”",
    opis: "Poród bliźniąt; jedno z dzieci ma zaświadczenie „Za życiem”. Wydłużony urlop rodzicielski.",
    kategoria: "Sytuacje szczególne",
    tytulUbezpieczenia: "umowa_o_prace",
    dokumenty: [
      { typ: "Zaświadczenie", nazwa: "Zaświadczenie „Za życiem”", pola: { "Lekarz": "specjalista neonatologii" } },
      { typ: "Z-3", nazwa: "Zaświadczenie płatnika składek", pola: {} },
    ],
    rozstrzygniecie: { status: "przyznano", uzasadnienie: "Macierzyński 31 tyg., rodzicielski 67 tyg. (pula)." },
    podstawa: { months: [], overrideBase: 7500 },
    calc: { eventDate: "2027-05-05", children: 2, zaZyciem: true, mother: { rodzicielskiWeeks: 58 }, father: { rodzicielskiWeeks: 9 } },
    oczekiwane: "31 tyg. macierzyńskiego + 58 tyg. rodzicielskiego (matka) + 9 tyg. (ojciec).",
  },
  {
    id: "S11",
    tytul: "Likwidacja pracodawcy w ciąży",
    opis: "Umowę o pracę rozwiązano w 5. miesiącu ciąży z powodu likwidacji pracodawcy. Brak innego zatrudnienia.",
    kategoria: "Ciąża",
    tytulUbezpieczenia: "umowa_o_prace",
    dokumenty: [
      { typ: "Świadectwo pracy", nazwa: "Świadectwo pracy (likwidacja pracodawcy)", pola: {} },
      { typ: "Wniosek", nazwa: "Wniosek o zasiłek w wysokości zasiłku macierzyńskiego", pola: {} },
    ],
    rozstrzygniecie: { status: "przyznano", uzasadnienie: "Zasiłek w wysokości zasiłku macierzyńskiego do dnia porodu, następnie zasiłek macierzyński – wypłaca ZUS." },
    podstawa: { months: Array(12).fill(6100) },
    calc: { eventDate: "2027-03-01", mother: { rodzicielskiWeeks: 32 }, father: { insured: false, ojcowski: false, rodzicielskiWeeks: 0 } },
    oczekiwane: "Do dnia porodu: zasiłek w wysokości zasiłku macierzyńskiego (100% podstawy) – ten okres liczy zakładka „W ciąży”. Od porodu: zasiłek macierzyński za urlop macierzyński i rodzicielski – to pokazuje wyliczenie poniżej.",
  },
  {
    id: "S12",
    tytul: "Rodzina zastępcza niezawodowa – dziecko 8 lat",
    opis: "Rodzina zastępcza niezawodowa przyjęła 8-letnie dziecko, bez odroczenia obowiązku szkolnego.",
    kategoria: "Adopcja / rodzina zastępcza",
    tytulUbezpieczenia: "umowa_o_prace",
    dokumenty: [{ typ: "Postanowienie sądu", nazwa: "Postanowienie o umieszczeniu w rodzinie zastępczej", pola: { "Wiek dziecka": "8 lat" } }],
    rozstrzygniecie: { status: "odmowa", uzasadnienie: "Dziecko powyżej 7 lat (bez odroczenia obowiązku szkolnego) – zasiłek macierzyński nie przysługuje." },
    podstawa: { months: Array(12).fill(7000) },
    calc: { scenario: "zastepcza", eventDate: "2026-11-15", childAgeYears: 8, mother: { rodzicielskiWeeks: 32 }, father: { insured: false, ojcowski: false, rodzicielskiWeeks: 0 } },
    oczekiwane: "Odmowa – przekroczony wiek dziecka.",
  },
];
