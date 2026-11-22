/**
 * Formularze ZUS odwzorowane 1:1 (układ, kolejność, etykiety, podpowiedzi, oświadczenia i pouczenia)
 * na podstawie wzorów: ZAM (zam. nr 2965/26, Informacja – zam. nr 2993/26) i ZAS-53 (zam. nr 2869/26).
 * Ten sam opis służy do wypełniania w aplikacji i do wydruku – teksty nie są parafrazowane.
 */
import { addDays, addMonths, diffDays, isValidDate, weeksByChildren } from "./engine";
import type { Params } from "./params";

export type FNode =
  | { t: "h"; text: string; note?: string }
  /** bold – oświadczenie między liniami; strong – zwykłe pogrubienie (np. „Dane dziecka/dzieci:”) */
  | { t: "p"; text: string; bold?: boolean; strong?: boolean; small?: boolean }
  /** pole tekstowe; boxes – liczba kratek (PESEL 11, NIP 10, REGON 14, rachunek 26); date – kratki dd/mm/rrrr */
  | { t: "field"; name: string; label?: string; hint?: string; boxes?: number; date?: boolean; dateText?: boolean; area?: boolean; inline?: boolean; optional?: boolean; paperHidden?: boolean }
  /** dwa pola (np. „Numer domu” + „Numer lokalu”) w jednym wierszu */
  | { t: "pair"; a: FNode & { t: "field" }; b: FNode & { t: "field" } }
  /** okres od–do: wartości `${name}_od`, `${name}_do` */
  | { t: "period"; name: string; hint: string; extra?: string; label?: string; openEnd?: boolean }
  | { t: "check"; name: string; label: string; num?: string; level?: number; children?: FNode[] }
  | { t: "checkrow"; items: { name: string; label: string }[]; label?: string }
  /** label – pytanie w jednym wierszu z polami TAK / NIE */
  | { t: "yesno"; name: string; label?: string; children?: FNode[] }
  /** tabela; wartości `${name}_${wiersz}_${kolumna}`; group – nagłówek nad kilkoma kolumnami */
  | { t: "table"; name: string; cols: { label: string; group?: string; num?: boolean }[]; rows: number; numbered?: boolean }
  | { t: "group"; label: string; fields: (FNode & { t: "field" })[] }
  | { t: "sign"; name: string; label?: string };

export type InfoBlock = {
  h?: string; hi?: boolean; sec?: string; hs?: string; p?: string; b?: boolean; frac?: [string, string];
  bullets?: (string | { text: string; sub: string[] })[];
};

export type OfficialForm = {
  code: string;
  title: string;
  /** tytuł w kilku wierszach, jak na wzorze */
  titleLines?: string[];
  /** kto wypełnia: osoba ubezpieczona albo płatnik składek */
  filledBy: "ubezpieczony" | "platnik";
  /** pola wyboru pod tytułem (np. „wniosek pierwszorazowy”) */
  top?: FNode[];
  instruction: { intro: string; items: string[]; steps: string[] };
  nodes: FNode[];
  footer: string[];
  /** pouczenie / informacja dołączona do wzoru */
  info: { title: string; subtitle?: string; blocks: InfoBlock[] };
};

export const RODO =
  "Informacje, o których mowa w art. 13 ust. 1 i 2 Rozporządzenia Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. w sprawie ochrony osób fizycznych w związku z przetwarzaniem danych osobowych i w sprawie swobodnego przepływu takich danych oraz uchylenia dyrektywy 95/46/WE (RODO), są dostępne w centrali lub terenowych jednostkach organizacyjnych ZUS oraz na stronie internetowej ZUS pod adresem: https://bip.zus.pl/rodo";
export const ART63 =
  "Zgodnie z art. 63 ustawy z dnia 25 czerwca 1999 r. o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa zarówno ubezpieczony, jak i płatnik składek mogą wystąpić do Zakładu Ubezpieczeń Społecznych z wnioskiem o wydanie decyzji w sprawie ustalenia prawa do zasiłku.";
export const ROZP =
  "rozporządzeniu Ministra Rodziny, Pracy i Polityki Społecznej z 27 września 2026 r. w sprawie zakresu informacji o okolicznościach mających wpływ na prawo do zasiłków z ubezpieczenia społecznego w razie choroby i macierzyństwa lub ich wysokość oraz dokumentów niezbędnych do przyznania i wypłaty zasiłków";

const NO_PESEL = "Podaj, jeśli nie masz nadanego numeru PESEL";
const yourData = (phoneHint: string): FNode[] => [
  { t: "h", text: "Twoje dane" },
  { t: "field", name: "pesel", label: "PESEL", boxes: 11 },
  { t: "field", name: "dataUr", label: "Data urodzenia", date: true, hint: NO_PESEL },
  { t: "field", name: "dokument", label: "Rodzaj, seria i numer dokumentu potwierdzającego tożsamość", hint: NO_PESEL },
  { t: "field", name: "imie", label: "Imię" },
  { t: "field", name: "nazwisko", label: "Nazwisko" },
  { t: "field", name: "ulica", label: "Ulica" },
  { t: "pair", a: { t: "field", name: "nrDomu", label: "Numer domu" }, b: { t: "field", name: "nrLokalu", label: "Numer lokalu" } },
  { t: "pair", a: { t: "field", name: "kod", label: "Kod pocztowy" }, b: { t: "field", name: "miejscowosc", label: "Miejscowość" } },
  { t: "field", name: "panstwo", label: "Nazwa państwa", hint: "Podaj, jeśli Twój adres jest inny niż polski" },
  { t: "field", name: "telefon", label: "Numer telefonu", hint: phoneHint, optional: true },
];
const payerData = (note?: string): FNode[] => [
  { t: "h", text: "Dane płatnika składek", note },
  { t: "field", name: "pNip", label: "NIP", boxes: 10 },
  { t: "field", name: "pRegon", label: "REGON", boxes: 14, hint: "Podaj, jeśli nie ma nadanego NIP" },
  { t: "field", name: "pPesel", label: "PESEL", boxes: 11, hint: "Podaj, jeśli nie ma nadanego NIP, REGON" },
  { t: "field", name: "pDokument", label: "Rodzaj, seria i numer dokumentu potwierdzającego tożsamość", hint: "Podaj, jeśli nie ma nadanego NIP, REGON, PESEL" },
  { t: "field", name: "pNazwa", label: "Nazwa albo imię i nazwisko" },
];
const childData = (k: string): FNode[] => [
  { t: "p", text: "Dane dziecka/dzieci:", strong: true },
  { t: "field", name: `dziecko${k}`, area: true, hint: "Podaj dane dziecka/dzieci: imię i nazwisko oraz datę i miejsce urodzenia" },
  {
    t: "check", name: `zaZyciem${k}`, label: "Oświadczam, że dziecko/dzieci",
    children: [
      { t: "field", name: `zaZyciemImiona${k}`, inline: true, hint: "Podaj imię/imiona dziecka/dzieci" },
      { t: "p", text: "posiada/posiadają zaświadczenie, o którym mowa w art. 4 ust. 3 ustawy z dnia 4 listopada 2016 r. o wspieraniu kobiet w ciąży i rodzin „Za życiem”" },
    ],
  },
];

export const PODSTAWA =
  "Podstawa prawna: ustawa z dnia 25 czerwca 1999 r. o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa, ustawa z dnia 30 października 2002 r. o ubezpieczeniu społecznym z tytułu wypadków przy pracy i chorób zawodowych oraz rozporządzenie Ministra Rodziny, Pracy i Polityki Społecznej z 27 września 2026 r. w sprawie zakresu informacji o okolicznościach mających wpływ na prawo do zasiłków z ubezpieczenia społecznego w razie choroby i macierzyństwa lub ich wysokość oraz dokumentów niezbędnych do przyznania i wypłaty zasiłków.";

/* ───────────────────────── ZAM ───────────────────────── */

export const ZAM: OfficialForm = {
  code: "ZAM",
  title: "Wniosek o zasiłek macierzyński",
  titleLines: ["Wniosek", "o zasiłek macierzyński"],
  filledBy: "ubezpieczony",
  instruction: {
    intro: "Wypełnij ten wniosek, jeżeli ubiegasz się o zasiłek macierzyński za okres:",
    items: ["urlopu macierzyńskiego lub urlopu na warunkach urlopu macierzyńskiego,", "urlopu rodzicielskiego,", "uzupełniającego urlopu macierzyńskiego,", "urlopu ojcowskiego."],
    steps: ["Wypełnij WIELKIMI LITERAMI", "Pola wyboru zaznacz znakiem X", "Wypełnij kolorem czarnym lub niebieskim (nie ołówkiem)"],
  },
  nodes: [
    ...yourData("Jeśli podasz nam tę informację, ułatwi nam to kontakt w Twojej sprawie. To jest pole dobrowolne"),
    ...payerData(),
    { t: "h", text: "Rachunek bankowy" },
    { t: "field", name: "rachunek", boxes: 26, optional: true, hint: "Podaj, jeśli chcesz otrzymywać wypłatę zasiłku na rachunek bankowy. To pole jest dobrowolne. Jeśli nie wypełnisz tego pola, zasiłek wypłacimy Ci przekazem pocztowym na podany wyżej adres" },
    { t: "h", text: "Zakres wniosku" },
    { t: "p", text: "Wnioskuję o zasiłek macierzyński za okres:" },
    { t: "check", name: "zMac", label: "urlopu macierzyńskiego" },
    { t: "check", name: "zWar", label: "urlopu na warunkach urlopu macierzyńskiego" },
    { t: "period", name: "okMac", hint: "Podaj okres (od–do)" },
    { t: "check", name: "zRodz", label: "urlopu rodzicielskiego", children: [{ t: "period", name: "okRodz", hint: "Podaj okres (od–do)" }] },
    { t: "field", name: "czescRodz", label: "Podaj, która to część urlopu rodzicielskiego", inline: true },
    { t: "check", name: "zUzup", label: "uzupełniającego urlopu macierzyńskiego", children: [{ t: "period", name: "okUzup", hint: "Podaj okres (od–do)" }] },
    { t: "check", name: "zOjc", label: "urlopu ojcowskiego", children: [{ t: "period", name: "okOjc", hint: "Podaj okres (od–do)" }] },
    { t: "field", name: "czescOjc", label: "Podaj, która to część urlopu ojcowskiego", inline: true },
    { t: "field", name: "koniecMac", label: "Podaj datę zakończenia okresu pobierania zasiłku macierzyńskiego za okres urlopu macierzyńskiego / urlopu na warunkach urlopu macierzyńskiego", date: true },
    { t: "check", name: "pelnyWymiar", label: "Informuję, że zamierzam skorzystać z pełnego wymiaru urlopu macierzyńskiego / urlopu na warunkach urlopu macierzyńskiego i urlopu rodzicielskiego z tytułu sprawowania opieki nad dzieckiem i co najmniej jeden dzień urlopu rodzicielskiego przypadać będzie w pierwszym roku życia dziecka" },
    { t: "h", text: "Informacje o ubezpieczeniu" },
    { t: "p", text: "Jeśli prowadzisz pozarolniczą działalność gospodarczą albo jesteś osobą współpracującą z osobą prowadzącą pozarolniczą działalność, jesteś duchownym albo marynarzem, to podaj, czy jesteś objęty ubezpieczeniem w razie choroby i macierzyństwa." },
    { t: "yesno", name: "ubezpDobrowolne" },
    { t: "h", text: "Wnioskuję o zasiłek macierzyński w związku z:" },
    { t: "check", name: "p1", num: "1.", label: "urodzeniem dziecka/dzieci" },
    { t: "check", name: "p1adop", label: "przyjęciem na wychowanie dziecka/dzieci i wystąpieniem do sądu opiekuńczego w sprawie jego przysposobienia" },
    { t: "check", name: "p1zast", label: "przyjęciem na wychowanie dziecka/dzieci w ramach rodziny zastępczej, z wyjątkiem rodziny zastępczej zawodowej" },
    { t: "field", name: "p1data", date: true, hint: "Podaj datę przyjęcia na wychowanie dziecka/dzieci" },
    ...childData("1"),
    { t: "check", name: "p2", num: "2.", label: "przewidywaną datą porodu", children: [{ t: "field", name: "p2data", date: true, inline: true, hint: "Podaj datę" }] },
    {
      t: "check", name: "p3", num: "3.", label: "urodzeniem dziecka/dzieci po ustaniu zatrudnienia; mój pracodawca:",
      children: [
        { t: "check", name: "p3upadlosc", label: "ogłosił upadłość", level: 1 },
        { t: "check", name: "p3likwidacja", label: "ogłosił likwidację", level: 1 },
        { t: "check", name: "p3naruszenie", label: "rozwiązał ze mną umowę o pracę z naruszeniem przepisów prawa, stwierdzonym prawomocnym orzeczeniem sądu", level: 1 },
        { t: "check", name: "p3zmarl", label: "zmarł", level: 1 },
        ...childData("3"),
      ],
    },
    {
      t: "check", name: "p4", num: "4.", label: "urodzeniem dziecka i jego pobytem w szpitalu (uzupełniający urlop macierzyński)",
      children: [
        { t: "check", name: "p4a", label: "urodzenie dziecka przed ukończeniem 28 tygodnia ciąży", level: 1 },
        { t: "check", name: "p4b", label: "masa urodzeniowa dziecka nie większa niż 1000 g", level: 1 },
        { t: "check", name: "p4c", label: "urodzenie dziecka po ukończeniu 28. tygodnia ciąży i przed ukończeniem 37 tygodnia ciąży i z masą urodzeniową większą niż 1000 g", level: 1 },
        { t: "check", name: "p4d", label: "urodzenie dziecka po ukończeniu 37 tygodnia ciąży i pobyt dziecka w szpitalu co najmniej 2 kolejne dni przy czym pierwszy z tych dni przypadał w okresie od 5 do 28 dnia po porodzie", level: 1 },
        { t: "p", text: "Okres pobytu dziecka w szpitalu" },
        { t: "period", name: "p4szpital", hint: "Podaj okres (od–do)" },
        { t: "p", text: "Dane dziecka/dzieci:", strong: true },
        { t: "field", name: "dziecko4", area: true, hint: "Podaj dane dziecka/dzieci: imię i nazwisko oraz datę i miejsce urodzenia" },
      ],
    },
    {
      t: "check", name: "p5", num: "5.", label: "sytuacją matki dziecka/dzieci:",
      children: [
        { t: "check", name: "p5skrocenie", label: "skróceniem przez matkę okresu wypłaty zasiłku macierzyńskiego po wykorzystaniu co najmniej 14 tygodni po porodzie", level: 1 },
        { t: "check", name: "p5szpital", label: "przerwaniem na wniosek matki okresu wypłaty zasiłku macierzyńskiego z powodu jej pobytu w szpitalu po wykorzystaniu zasiłku macierzyńskiego w wymiarze co najmniej 8 tygodni po porodzie; o wypisaniu matki ze szpitala zobowiązuję się poinformować płatnika zasiłku", level: 1 },
        { t: "check", name: "p5orzeczenie", label: "przerwaniem przez matkę okresu wypłaty zasiłku macierzyńskiego z powodu posiadania orzeczenia o niezdolności do samodzielnej egzystencji lub o niepełnosprawności w stopniu znacznym po wykorzystaniu co najmniej 8 tygodni zasiłku macierzyńskiego po porodzie", level: 1 },
        { t: "check", name: "p5praca", label: "podjęciem pracy przez matkę w wymiarze nie niższym niż połowa pełnego etatu; o ustaniu zatrudnienia matki zobowiązuję się poinformować płatnika zasiłku", level: 1 },
        { t: "check", name: "p5porzucenie", label: "porzuceniem dziecka/dzieci przez matkę", level: 1 },
        { t: "check", name: "p5smierc", label: "śmiercią matki", level: 1 },
        { t: "field", name: "p5data", date: true, hint: "Podaj datę" },
        ...childData("5"),
        { t: "p", text: "Dane matki dziecka/dzieci:", strong: true },
        { t: "field", name: "p5matka", area: true, hint: "Podaj dane matki: imię i nazwisko oraz PESEL, a jeśli nie ma nadanego numeru PESEL, podaj serię i numer dokumentu tożsamości i datę urodzenia" },
      ],
    },
    {
      t: "check", name: "p6", num: "6.", label: "wypisaniem ze szpitala:",
      children: [
        { t: "checkrow", items: [{ name: "p6mnie", label: "mnie" }, { name: "p6dziecka", label: "dziecka" }] },
        { t: "field", name: "p6data", date: true, hint: "Podaj datę" },
      ],
    },
    { t: "h", text: "Oświadczenie" },
    { t: "p", text: "Wypełnij, jeśli ubiegasz się o zasiłek macierzyński za okres urlopu ojcowskiego.", small: true },
    { t: "p", text: "Pobierałem z innego tytułu zasiłek macierzyński za okres ustalony przepisami Kodeksu pracy jako okres urlopu ojcowskiego" },
    { t: "yesno", name: "ojcInny", children: [{ t: "field", name: "ojcInnyOpis", label: "Jeśli TAK", hint: "Podaj tytuł i okres pobierania" }] },
    { t: "h", text: "Informacja" },
    { t: "p", text: "Wypełnij, jeśli ubiegasz się o zasiłek macierzyński za okres urlopu rodzicielskiego. Wypełnij również, jeśli ubiegasz się o zasiłek macierzyński za okres uzupełniającego urlopu macierzyńskiego.", small: true },
    { t: "p", text: "Drugi rodzic dziecka/dzieci będzie korzystał z zasiłku macierzyńskiego za okres urlopu rodzicielskiego / uzupełniającego urlopu macierzyńskiego" },
    { t: "yesno", name: "drugiRodzic", children: [{ t: "field", name: "drugiRodzicOkres", label: "Jeśli TAK", hint: "Podaj okres od–do" }] },
    { t: "h", text: "Dane drugiego rodzica / członka rodziny" },
    { t: "field", name: "dPesel", label: "PESEL", boxes: 11 },
    { t: "field", name: "dDataUr", label: "Data urodzenia", date: true, hint: "Podaj, jeśli nie ma nadanego numeru PESEL" },
    { t: "field", name: "dDokument", label: "Rodzaj, seria i numer dokumentu potwierdzającego tożsamość", hint: "Podaj, jeśli nie ma nadanego numeru PESEL" },
    { t: "field", name: "dImie", label: "Imię" },
    { t: "field", name: "dNazwisko", label: "Nazwisko" },
    { t: "p", text: "Oświadczam, że dane zawarte we wniosku podałem zgodnie z prawdą. Jeżeli ulegną one zmianie, zobowiązuję się poinformować o tym płatnika zasiłku.", bold: true },
    { t: "sign", name: "dataWniosku" },
  ],
  footer: [ART63, RODO],
  info: {
    title: "INFORMACJA",
    subtitle: "do wniosku o zasiłek macierzyński",
    blocks: [
      { h: "I. Z jakich powodów możesz ubiegać się o zasiłek macierzyński" },
      {
        p: "Zasiłek macierzyński przysługuje Ci, jeżeli w okresie ubezpieczenia chorobowego lub urlopu wychowawczego:",
        bullets: [
          "urodziłaś/urodziło Ci się dziecko (lub dzieci),",
          {
            text: "przyjmiesz dziecko na wychowanie:",
            sub: [
              "do 14 lat i wystąpisz do sądu opiekuńczego z wnioskiem o wszczęcie postępowania w sprawie jego przysposobienia,",
              "przyjmiesz na wychowanie dziecko w ramach rodziny zastępczej, z wyjątkiem rodziny zastępczej zawodowej w wieku do 7 roku życia, a w przypadku dziecka, wobec którego podjęto decyzję o odroczeniu obowiązku szkolnego, do 10 roku życia.",
            ],
          },
        ],
      },
      { h: "II. Przez jaki okres możesz pobierać zasiłek macierzyński" },
      {
        p: "Zasiłek macierzyński przysługuje za okresy, które odpowiadają okresom:",
        bullets: [
          {
            text: "urlopu macierzyńskiego albo urlopu na warunkach urlopu macierzyńskiego:",
            sub: [
              "20 tygodni (140 dni) – jeśli urodziło Ci się jedno dziecko / przyjąłeś jedno dziecko na wychowanie,",
              "31 tygodni (217 dni) – jeśli urodziło Ci się dwoje dzieci podczas jednego porodu / przyjąłeś dwoje dzieci na wychowanie,",
              "33 tygodni (231 dni) – jeśli urodziło Ci się troje dzieci podczas jednego porodu / przyjąłeś troje dzieci na wychowanie,",
              "35 tygodni (245 dni) – jeśli urodziło Ci się czworo dzieci podczas jednego porodu / przyjąłeś czworo dzieci na wychowanie,",
              "37 tygodni (259 dni) – jeśli urodziło Ci się pięcioro i więcej dzieci podczas jednego porodu / przyjąłeś pięcioro i więcej dzieci na wychowanie.",
            ],
          },
        ],
      },
      { p: "Możesz wykorzystać przed porodem do 6 tygodni urlopu macierzyńskiego i zasiłku macierzyńskiego. Wtedy po porodzie skorzystasz z pozostałego urlopu." },
      {
        bullets: [
          {
            text: "urlopu rodzicielskiego:",
            sub: [
              "41 tygodni, jeśli urodziło Ci się jedno dziecko / przyjąłeś jedno dziecko na wychowanie,",
              "43 tygodni, jeśli urodziło Ci się dwoje lub więcej dzieci przy jednym porodzie / przyjąłeś równocześnie dwoje lub więcej dzieci na wychowanie.",
            ],
          },
        ],
      },
      {
        p: "Jeżeli Twoje dziecko posiada zaświadczenie, o którym mowa w art. 4 ust. 3 ustawy z dnia 4 listopada 2016 r. o wsparciu kobiet w ciąży i rodzin „Za życiem”, zasiłek macierzyński za okres urlopu rodzicielskiego przysługuje w wymiarze do:",
        bullets: [
          {
            text: "",
            sub: [
              "65 tygodni, jeśli urodziło Ci się jedno dziecko / przyjąłeś jedno dziecko na wychowanie",
              "67 tygodni, jeśli urodziło Ci się dwoje lub więcej dzieci przy jednym porodzie / przyjąłeś równocześnie dwoje lub więcej dzieci na wychowanie.",
            ],
          },
        ],
      },
      { p: "Z zasiłku macierzyńskiego za okres urlopu rodzicielskiego możesz skorzystać jednorazowo albo może być on podzielony maksymalnie na 5 dowolnych części. Ostatnia część urlopu może przypadać najpóźniej do końca roku, w którym dziecko skończy 6 lat, a w przypadku dziecka przyjętego na wychowanie – do ukończenia przez nie odpowiednio 7, 10 albo 14 roku życia." },
      { p: "Ze wskazanego wymiaru urlopu rodzicielskiego każdemu z pracowników – rodziców dziecka – przysługuje wyłączne prawo do 9 tygodni urlopu rodzicielskiego. Tego prawa nie można przenieść na drugiego z rodziców. Skorzystanie z urlopu rodzicielskiego w wymiarze co najmniej 9 tygodni oznacza wykorzystanie przez pracownika – rodzica dziecka urlopu z wymienionej części urlopu." },
      {
        bullets: [
          {
            text: "urlopu ojcowskiego – 2 tygodnie, nie dłużej jednak niż do:",
            sub: [
              "ukończenia przez dziecko 12 miesiąca życia – w przypadku, gdy ubezpieczonemu urodziło się dziecko, albo",
              "upływu 12 miesięcy od dnia uprawomocnienia się postanowienia orzekającego przysposobienie dziecka i nie dłużej niż do ukończenia przez dziecko 14 roku życia – w razie przysposobienia dziecka przez ubezpieczonego.",
            ],
          },
        ],
      },
      { p: "Z zasiłku macierzyńskiego za okres urlopu ojcowskiego możesz skorzystać jednorazowo lub nie więcej niż w dwóch częściach, z których każda nie może być krótsza niż tydzień." },
      {
        bullets: [
          {
            text: "uzupełniającego urlopu macierzyńskiego:",
            sub: [],
          },
        ],
      },
      {
        p: "wymiar zasiłku macierzyńskiego za okres ustalony przepisami Kodeksu pracy jako okres uzupełniającego urlopu macierzyńskiego zależy od: tygodnia ciąży, w którym urodzi się dziecko, jego masy urodzeniowej oraz okresu pobytu dziecka w szpitalu.",
        bullets: [
          {
            text: "",
            sub: [
              "urodzenie dziecka przed ukończeniem 28 tygodnia ciąży – tydzień uzupełniającego urlopu macierzyńskiego za każdy tydzień pobytu dziecka w szpitalu do upływu 15 tygodnia po porodzie,",
              "urodzenie dziecka z masą urodzeniową nie większą niż 1000 g – tydzień uzupełniającego urlopu macierzyńskiego za każdy tydzień pobytu dziecka w szpitalu do upływu 15 tygodnia po porodzie,",
              "urodzenie dziecka po ukończeniu 28 tygodnia ciąży i przed ukończeniem 37 tygodnia ciąży i z masą urodzeniową większą niż 1000 g – tydzień uzupełniającego urlopu macierzyńskiego za każdy tydzień pobytu dziecka w szpitalu do upływu 8 tygodnia po porodzie,",
              "urodzenie dziecka po ukończeniu 37 tygodnia ciąży i jego pobyt w szpitalu, pod warunkiem że pobyt dziecka w szpitalu po porodzie będzie wynosił co najmniej 2 kolejne dni, przy czym pierwszy z tych dni będzie przypadał w okresie od 5 do 28 dnia po porodzie – tydzień uzupełniającego urlopu macierzyńskiego za każdy tydzień pobytu dziecka w szpitalu w okresie od 5 dnia do upływu 8 tygodnia po porodzie.",
            ],
          },
        ],
      },
      { p: "Zasiłek macierzyński za okres uzupełniającego urlopu macierzyńskiego przysługuje zarówno matce, jak i ojcu dziecka. Musi przypadać bezpośrednio po wykorzystaniu urlopu macierzyńskiego i jest udzielany jednorazowo. Nie podlega dzieleniu na części i nie można go podzielić między rodzicami." },
      { h: "III. Wysokość zasiłku macierzyńskiego" },
      { p: "Zasiłek macierzyński za okres ustalony przepisami Kodeksu pracy jako okres urlopu macierzyńskiego, urlopu na warunkach urlopu macierzyńskiego, uzupełniającego urlopu macierzyńskiego oraz urlopu ojcowskiego, przysługuje w wysokości 100% podstawy wymiaru zasiłku." },
      { p: "Zasiłek macierzyński za okres ustalony przepisami Kodeksu pracy jako okres urlopu rodzicielskiego przysługuje w wysokości 70% podstawy wymiaru zasiłku." },
      { p: "Ubezpieczonej, która nie później niż 21 dni po porodzie złoży wniosek o wypłacenie jej zasiłku macierzyńskiego za okres odpowiadający okresowi urlopu macierzyńskiego i urlopu rodzicielskiego w pełnym wymiarze, zasiłek macierzyński przysługuje w wysokości 81,5% podstawy wymiaru za cały okres udzielonych jej urlopów." },
      { p: "Zasiłek macierzyński za okres urlopu rodzicielskiego w części przysługującej wyłącznie drugiemu rodzicowi dziecka, o której mowa w art. 182¹ᵃ § 4 Kodeksu pracy (w wymiarze 9 tygodni) wynosi 70% podstawy wymiaru zasiłku." },
      { h: "IV. Jakie złożyć dokumenty" },
      { h: "Jeśli zasiłek wypłaca ZUS", hi: true },
      { p: "Dodatkowo niezbędne jest zaświadczenie płatnika składek wystawione na druku:", bullets: [{ text: "", sub: ["Z-3 – jeśli jesteś pracownikiem,", "Z-3a – jeśli jesteś ubezpieczony z innego tytułu."] }] },
      { p: "Jeśli prowadzisz pozarolniczą działalność gospodarczą albo jesteś osobą współpracującą z osobą prowadzącą pozarolniczą działalność, jesteś duchownym albo marynarzem, nie jest wymagane dodatkowo złożenie w ZUS zaświadczenia płatnika składek." },
      { p: `Do wniosku o zasiłek macierzyński dołącz dokumenty określone w ${ROZP}.` },
      { p: ART63 },
    ],
  },
};

/* ───────────────────────── ZAS-53 ───────────────────────── */

export const ZAS53: OfficialForm = {
  code: "ZAS-53",
  title: "Wniosek o zasiłek chorobowy",
  filledBy: "ubezpieczony",
  instruction: {
    intro: "Wypełnij ten wniosek i przekaż go do nas, jeśli:",
    items: [
      "prowadzisz pozarolniczą działalność,",
      "współpracujesz z osobą prowadzącą działalność,",
      "współpracujesz z osobą, która korzysta z ulgi na start, o której mowa w art. 18 ust. 1 ustawy z 6 marca 2018 r. – Prawo przedsiębiorców",
      "jesteś duchownym,",
      "jesteś marynarzem,",
      "jesteś niezdolny do pracy z powodu choroby po ustaniu zatrudnienia/ubezpieczenia.",
    ],
    steps: ["Wypełnij WIELKIMI LITERAMI", "Pola wyboru zaznacz znakiem X", "Wypełnij kolorem czarnym lub niebieskim (nie ołówkiem)", "Zanim wypełnisz wniosek, zapoznaj się z Pouczeniem"],
  },
  nodes: [
    ...yourData("Jeśli podasz nam tę informację, ułatwi nam to kontakt w Twojej sprawie. To pole jest dobrowolne"),
    ...payerData("Podaj dane płatnika, który opłaca lub opłacał za Ciebie składki na ubezpieczenie, z którego tytułu wnioskujesz teraz o zasiłek chorobowy"),
    { t: "h", text: "Rachunek bankowy" },
    { t: "field", name: "rachunek", boxes: 26, optional: true, hint: "Podaj, jeśli chcesz otrzymywać wypłatę zasiłku chorobowego na rachunek bankowy. To pole jest dobrowolne. Jeśli nie wypełnisz tego pola, zasiłek chorobowy wypłacimy Ci przekazem pocztowym na podany wyżej adres" },
    { t: "h", text: "Składam wniosek o przyznanie zasiłku chorobowego" },
    { t: "period", name: "okres", hint: "Podaj datę lub daty (od–do) oraz jeśli znasz – serię i numer zaświadczenia lekarskiego", extra: "zla" },
    { t: "field", name: "zla", label: "Seria i numer zaświadczenia lekarskiego (jeśli znasz)", optional: true, paperHidden: true },
    { t: "h", text: "Wniosek dotyczy okresu niezdolności do pracy z powodu choroby przypadającego:" },
    { t: "check", name: "wOkresie", label: "w okresie ubezpieczenia chorobowego/wypadkowego" },
    { t: "check", name: "poUstaniu", label: "po ustaniu tytułu ubezpieczenia chorobowego/wypadkowego", children: [{ t: "field", name: "dataUstania", date: true, inline: true, hint: "Podaj datę ustania tytułu ubezpieczenia" }] },
    { t: "h", text: "Czy wniosek dotyczy niezdolności do pracy z powodu:" },
    { t: "checkrow", items: [{ name: "chZawodowa", label: "choroby zawodowej" }, { name: "wypPraca", label: "wypadku przy pracy" }, { name: "wypDroga", label: "wypadku w drodze do pracy lub z pracy" }] },
    { t: "yesno", name: "wypadek", children: [{ t: "field", name: "wypadekDok", hint: "Jeśli TAK, to podaj rodzaj dokumentu potwierdzającego (decyzja / protokół / karta wypadku), numer oraz datę jego sporządzenia" }] },
    { t: "p", text: "Jeżeli jesteś marynarzem podaj, czy za okres niezdolności do pracy, za który ubiegasz się o zasiłek chorobowy przysługuje Ci wynagrodzenie za pracę, o którym mowa w art. 75 pkt. 2 ustawy z dnia 5 sierpnia 2015 r. o pracy na morzu", bold: true },
    { t: "yesno", name: "marynarz" },
    { t: "p", text: "Oświadczam, że dane zawarte we wniosku podałem zgodnie z prawdą. Jeżeli ulegną one zmianie, zobowiązuję się poinformować o tym ZUS.", bold: true },
    { t: "sign", name: "dataWniosku" },
  ],
  footer: [RODO],
  info: {
    title: "Pouczenie",
    blocks: [
      {
        p: "Aby otrzymać zasiłek chorobowy, musisz w ZUS złożyć wniosek o zasiłek. Wnioskiem o zasiłek jest:",
        bullets: [
          "jeśli otrzymałeś pierwsze zaświadczenie lekarskie – wniosek o zasiłek chorobowy (druk ZAS-53),",
          { text: "jeśli otrzymałeś kolejne zaświadczenie lekarskie za okres nieprzerwanej niezdolności do pracy:", sub: ["wniosek o zasiłek chorobowy (druk ZAS-53), albo", "wydruk zaświadczenia lekarskiego e-ZLA, jeśli otrzymałeś go od lekarza."] },
        ],
      },
      { p: "Jeśli otrzymałeś zaświadczenie lekarskie wystawione na formularzu wydrukowanym z systemu teleinformatycznego (zaświadczenie lekarskie wystawione w trybie alternatywnym) i lekarz nie wprowadził go do systemu (nie widzisz go na swoim profilu na portalu PUE/eZUS) łącznie z ZAS-53 przekaż do ZUS również otrzymane od lekarza zaświadczenie lekarskie." },
      { p: `Do wniosku o zasiłek chorobowy dołącz dokumenty określone w ${ROZP}. Wypłaty świadczeń z tytułu wypadku przy pracy albo wypadku w drodze do pracy lub z pracy ZUS dokonuje po wcześniejszym uznaniu zdarzenia za taki wypadek, dlatego też ubezpieczony do wniosku powinien dołączyć niezbędne dokumenty. W przypadku choroby zawodowej ubezpieczony powinien dołączyć decyzję o stwierdzeniu choroby zawodowej i zaświadczenie lekarza, które stwierdza, że niezdolność do pracy jest spowodowana chorobą zawodową.` },
      { h: "Wysokość zasiłku chorobowego", hi: true },
      {
        p: "Zasiłek chorobowy przysługuje w wysokości:",
        bullets: [
          "80% podstawy wymiaru zasiłku,",
          {
            text: "100% podstawy wymiaru, gdy niezdolność do pracy:",
            sub: [
              "przypada w okresie ciąży,",
              "powstała wskutek poddania się niezbędnym badaniom lekarskim dla kandydatów na dawców komórek, tkanek i narządów oraz zabiegowi pobrania komórek, tkanek, narządów,",
              "powstała wskutek wypadku w drodze do pracy lub z pracy,",
              "powstała wskutek wypadku przy pracy lub choroby zawodowej.",
            ],
          },
        ],
      },
      { h: "Okres pobierania", hi: true },
      { p: "Zasiłek chorobowy przysługuje przez okres do 182 dni, a jeżeli niezdolność spowodowana została gruźlicą lub przypada na okres ciąży – do 270 dni. Do okresu tego wlicza się okresy nieprzerwanej niezdolności do pracy oraz okresy poprzedniej niezdolności do pracy, jeżeli przerwa pomiędzy ustaniem poprzedniej a powstaniem ponownej niezdolności do pracy nie przekraczała 60 dni. Do jednego okresu zasiłkowego nie wlicza się okresów niezdolności do pracy przypadających przed przerwą nie dłuższą niż 60 dni, jeśli po przerwie niezdolność do pracy wystąpiła w trakcie ciąży." },
      { p: "Za okres niezdolności do pracy przypadający po ustaniu ubezpieczenia zasiłek chorobowy przysługuje nie dłużej niż przez 91 dni. Nie dotyczy to niezdolności do pracy powstałej wskutek poddania się niezbędnym badaniom lekarskim przewidzianym dla kandydatów na dawców komórek, tkanek i narządów oraz zabiegowi pobrania komórek, tkanek i narządów oraz niezdolności spowodowanej gruźlicą lub występującej w trakcie ciąży." },
      { p: "Łączny okres wypłaty zasiłku chorobowego w trakcie ubezpieczenia i po ustaniu ubezpieczenia nie może być dłuższy niż 182 dni, a jeśli niezdolność spowodowana została gruźlicą lub przypada w okresie ciąży – nie dłużej niż 270 dni." },
      { h: "Po jakim czasie przysługuje prawo do zasiłku chorobowego", hi: true },
      { p: "Osoby podlegające ubezpieczeniu chorobowemu obowiązkowo nabywają prawo do zasiłku chorobowego z ubezpieczenia chorobowego po upływie 30 dni nieprzerwanego ubezpieczenia chorobowego, a osoby podlegające ubezpieczeniu chorobowemu dobrowolnie – po upływie 90 dni nieprzerwanego ubezpieczenia chorobowego." },
      { p: "Do 30- i 90-dniowego okresu ubezpieczenia chorobowego wlicza się poprzednie okresy ubezpieczenia chorobowego, jeżeli przerwa między nimi nie przekroczyła 30 dni lub była spowodowana urlopem bezpłatnym, urlopem wychowawczym albo odbywaniem czynnej służby wojskowej przez żołnierza niezawodowego." },
      {
        p: "Od pierwszego dnia ubezpieczenia chorobowego prawo do zasiłku chorobowego przysługuje, jeśli osoba ubezpieczona:",
        bullets: [
          "jest absolwentem szkoły lub studiów wyższych lub osobą, która zakończyła kształcenie w szkole doktorskiej, i do ubezpieczenia chorobowego została zgłoszona w ciągu 90 dni od dnia ukończenia szkoły lub uzyskania dyplomu ukończenia studiów wyższych, zakończenia kształcenia w szkole doktorskiej,",
          "podlega ubezpieczeniu chorobowemu obowiązkowo i posiada co najmniej 10-letni okres obowiązkowego ubezpieczenia chorobowego (w tym również ubezpieczenia społecznego przed dniem 1 stycznia 1999 r.),",
          "była posłem lub senatorem i do ubezpieczenia chorobowego została zgłoszona w ciągu 90 dni od dnia ukończenia kadencji.",
        ],
      },
      { p: "Od pierwszego dnia ubezpieczenia prawo do zasiłku chorobowego przysługuje również, jeśli niezdolność do pracy z powodu choroby jest spowodowana wypadkiem przy pracy, wypadkiem w drodze do pracy lub z pracy lub chorobą zawodową." },
      { p: "Aby udokumentować, że prawo do zasiłku chorobowego przysługuje od pierwszego dnia ubezpieczenia, ubezpieczony powinien dostarczyć odpowiednie dokumenty np.: dyplom ukończenia studiów, świadectwa pracy, decyzję o stwierdzeniu choroby zawodowej, dokumenty, które potwierdzają, że niezdolność do pracy spowodowana jest wypadkiem przy pracy, wypadkiem w drodze do lub z pracy." },
      { h: "Okoliczności, które pozbawiają prawa do zasiłku chorobowego", hi: true },
      {
        p: "Zasiłek chorobowy nie przysługuje:",
        bullets: [
          "za okres niezdolności do pracy, który przypada w okresie wyczekiwania na prawo do zasiłku,",
          "za okresy, w których ubezpieczony zachowuje prawo do wynagrodzenia na podstawie przepisów o wynagradzaniu,",
          "w okresie urlopu bezpłatnego lub urlopu wychowawczego,",
          "za okres urlopu opiekuńczego przysługującego z Kodeksu pracy,",
          "w okresie tymczasowego aresztowania lub odbywania kary pozbawienia wolności, z wyjątkiem przypadków, w których prawo do zasiłku wynika z ubezpieczenia chorobowego osób wykonujących odpłatnie pracę na podstawie skierowania do pracy w czasie odbywania kary pozbawienia wolności lub tymczasowego aresztowania,",
          "za cały okres orzeczonej niezdolności do pracy, jeżeli niezdolność do pracy spowodowana została w wyniku umyślnego przestępstwa lub wykroczenia, co zostało stwierdzone prawomocnym orzeczeniem sądu,",
          "za okres pierwszych pięciu dni, jeżeli niezdolność do pracy została spowodowana nadużyciem alkoholu,",
          "za okres objęty zaświadczeniem lekarskim, w przypadku wykonywania w czasie zwolnienia lekarskiego pracy zarobkowej lub podjęcia aktywności niezgodnej z celem zwolnienia od pracy,",
          "za okres, w którym zaświadczenie lekarskie straciło ważność wskutek kontroli prawidłowości orzekania i wystawiania zaświadczeń lekarskich.",
        ],
      },
      { h: "Dodatkowe okoliczności, które pozbawiają prawa do zasiłku chorobowego z tytułu wypadku przy pracy bądź choroby zawodowej", hi: true },
      {
        p: "Zasiłek chorobowy z tytułu wypadku przy pracy lub choroby zawodowej nie przysługuje ponadto w przypadku, gdy:",
        bullets: [
          "wyłączną przyczyną wypadku było udowodnione naruszenie przez ubezpieczonego przepisów dotyczących ochrony życia i zdrowia, spowodowane przez niego umyślnie lub wskutek rażącego niedbalstwa,",
          "ubezpieczony, będąc w stanie nietrzeźwości albo pod wpływem środków odurzających lub substancji psychotropowych, przyczynił się w znacznym stopniu do spowodowania wypadku,",
          "ubezpieczony odmówił bez uzasadnionej przyczyny poddania się badaniu w celu ustalenia zawartości w organizmie alkoholu, środków odurzających lub substancji psychotropowych albo przez swoje zachowanie uniemożliwił przeprowadzenie takiego badania.",
        ],
      },
      { h: "Okoliczności, które pozbawiają prawa do zasiłku chorobowego za okres po ustaniu ubezpieczenia", hi: true },
      {
        p: "Zasiłek chorobowy za okres po ustaniu tytułu ubezpieczenia nie przysługuje osobie, która:",
        bullets: [
          "ma ustalone prawo do emerytury lub renty z tytułu niezdolności do pracy niezależnie od systemu ubezpieczenia/zaopatrzenia, na podstawie którego prawo do emerytury lub renty zostało ustalone,",
          "kontynuuje działalność zarobkową lub podjęła działalność zarobkową, która stanowi tytuł do objęcia obowiązkowo lub dobrowolnie ubezpieczeniem chorobowym albo zapewnia prawo do świadczeń za okres niezdolności do pracy z powodu choroby,",
          "jest uprawniona do zasiłku dla bezrobotnych, zasiłku przedemerytalnego lub świadczenia przedemerytalnego, nauczycielskiego świadczenia kompensacyjnego, rodzicielskiego świadczenia uzupełniającego,",
          "podlega obowiązkowo ubezpieczeniu społecznemu rolników.",
        ],
      },
      { p: ART63 },
      { p: PODSTAWA, b: true },
    ],
  },
};

/* ───────────────────────── Walidacja ───────────────────────── */

type V = Record<string, string>;
const on = (d: V, k: string) => d[k] === "X";
const has = (d: V, k: string) => !!d[k]?.trim();
export const digits = (x?: string) => (x ?? "").replace(/[\s-]/g, "");

export function peselOk(p: string) {
  if (!/^\d{11}$/.test(p)) return false;
  const w = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const s = w.reduce((a, x, i) => a + x * Number(p[i]), 0);
  return (10 - (s % 10)) % 10 === Number(p[10]);
}
export function nipOk(n: string) {
  if (!/^\d{10}$/.test(n)) return false;
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const s = w.reduce((a, x, i) => a + x * Number(n[i]), 0) % 11;
  return s !== 10 && s === Number(n[9]);
}
export function regonOk(r: string): boolean {
  if (/^\d{9}$/.test(r)) {
    const w = [8, 9, 2, 3, 4, 5, 6, 7];
    return (w.reduce((a, x, i) => a + x * Number(r[i]), 0) % 11) % 10 === Number(r[8]);
  }
  if (/^\d{14}$/.test(r)) {
    const w = [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8];
    return regonOk(r.slice(0, 9)) && (w.reduce((a, x, i) => a + x * Number(r[i]), 0) % 11) % 10 === Number(r[13]);
  }
  return false;
}

export function person(d: V, e: V, today: string) {
  const pesel = digits(d.pesel);
  if (pesel) {
    if (!peselOk(pesel)) e.pesel = "Numer PESEL ma 11 cyfr i poprawną cyfrę kontrolną.";
  } else {
    if (!isValidDate(d.dataUr)) e.dataUr = "Bez numeru PESEL podaj datę urodzenia.";
    else if (d.dataUr > today) e.dataUr = "Data urodzenia nie może być z przyszłości.";
    if (!has(d, "dokument")) e.dokument = "Bez numeru PESEL podaj rodzaj, serię i numer dokumentu tożsamości.";
  }
  for (const k of ["imie", "nazwisko", "nrDomu", "miejscowosc"]) if (!has(d, k)) e[k] = "To pole jest wymagane.";
  if (!has(d, "kod")) e.kod = "To pole jest wymagane.";
  else if (!has(d, "panstwo") && !/^\d{2}-\d{3}$/.test(d.kod.trim())) e.kod = "Polski kod pocztowy ma postać 00-000.";
  if (has(d, "telefon") && !/^\+?[\d\s-]{9,15}$/.test(d.telefon.trim())) e.telefon = "Podaj numer telefonu (9–15 cyfr).";
}
export function payer(d: V, e: V) {
  const nip = digits(d.pNip), regon = digits(d.pRegon), pesel = digits(d.pPesel);
  if (nip && !nipOk(nip)) e.pNip = "NIP ma 10 cyfr i poprawną cyfrę kontrolną.";
  if (regon && !regonOk(regon)) e.pRegon = "REGON ma 9 lub 14 cyfr i poprawną cyfrę kontrolną.";
  if (pesel && !peselOk(pesel)) e.pPesel = "Numer PESEL ma 11 cyfr i poprawną cyfrę kontrolną.";
  if (!nip && !regon && !pesel && !has(d, "pDokument")) e.pNip = "Podaj NIP płatnika (albo REGON, PESEL lub dokument tożsamości, jeśli nie ma NIP).";
  if (!has(d, "pNazwa")) e.pNazwa = "To pole jest wymagane.";
}
export function account(d: V, e: V) {
  const a = digits(d.rachunek).replace(/^PL/i, "");
  if (a && !/^\d{26}$/.test(a)) e.rachunek = "Numer rachunku ma 26 cyfr.";
}
export function period(d: V, e: V, k: string, label = "okres") {
  const od = d[`${k}_od`], to = d[`${k}_do`];
  if (!isValidDate(od)) e[`${k}_od`] = `Podaj początek (${label}).`;
  if (!isValidDate(to)) e[`${k}_do`] = `Podaj koniec (${label}).`;
  else if (isValidDate(od) && to < od) e[`${k}_do`] = "Data końcowa nie może być wcześniejsza niż początkowa.";
  return isValidDate(od) && isValidDate(to) && to >= od ? diffDays(od, to) + 1 : 0;
}
export function sign(d: V, e: V, today: string) {
  if (!isValidDate(d.dataWniosku)) e.dataWniosku = "Podaj datę złożenia wniosku.";
  else if (d.dataWniosku > today) e.dataWniosku = "Data wniosku nie może być z przyszłości.";
}

export type ZamCtx = { params: Params; children: number; birth?: string; selfEmployed: boolean; today: string };

export function validateZAM(d: V, c: ZamCtx): V {
  const e: V = {};
  const W = c.params.wymiary;
  person(d, e, c.today);
  payer(d, e);
  account(d, e);

  // Zakres wniosku
  const any = ["zMac", "zWar", "zRodz", "zUzup", "zOjc"].some((k) => on(d, k));
  if (!any) e.zMac = "Zaznacz co najmniej jeden okres, za który wnioskujesz o zasiłek.";
  if (on(d, "zMac") && on(d, "zWar")) e.zWar = "Zaznacz urlop macierzyński albo urlop na warunkach urlopu macierzyńskiego.";
  const birth = isValidDate(d.p2data) ? d.p2data : c.birth;
  if (on(d, "zMac") || on(d, "zWar")) {
    const days = period(d, e, "okMac");
    const max = weeksByChildren(on(d, "zWar") ? W.naWarunkachMacierzynskiego : W.macierzynski, c.children) * 7;
    if (days > max) e.okMac_do = `Okres przekracza wymiar ${max / 7} tyg. (${max} dni) przy liczbie dzieci: ${c.children}.`;
    if (on(d, "zMac") && isValidDate(d.okMac_od) && isValidDate(birth) && d.okMac_od < addDays(birth, -W.przedPorodemMaxTygodnie * 7))
      e.okMac_od = `Przed porodem można wykorzystać najwyżej ${W.przedPorodemMaxTygodnie} tygodni.`;
  }
  if (on(d, "zRodz")) {
    period(d, e, "okRodz");
    const n = Number(d.czescRodz);
    if (!(Number.isInteger(n) && n >= 1 && n <= W.maksCzesciRodzicielskiego)) e.czescRodz = `Podaj numer części: 1–${W.maksCzesciRodzicielskiego}.`;
    if (isValidDate(birth) && isValidDate(d.okRodz_do) && d.okRodz_do > `${Number(birth.slice(0, 4)) + W.rodzicielskiDoKoncaRokuWiekuDziecka}-12-31`)
      e.okRodz_do = `Urlop rodzicielski trwa najpóźniej do końca roku, w którym dziecko kończy ${W.rodzicielskiDoKoncaRokuWiekuDziecka} lat.`;
  }
  if (on(d, "zUzup")) {
    period(d, e, "okUzup");
    if (!on(d, "p4")) e.p4 = "Przy uzupełniającym urlopie macierzyńskim zaznacz punkt 4 i podaj okres pobytu dziecka w szpitalu.";
  }
  if (on(d, "zOjc")) {
    const days = period(d, e, "okOjc");
    const n = Number(d.czescOjc);
    if (!(n === 1 || n === 2)) e.czescOjc = "Urlop ojcowski można podzielić najwyżej na 2 części – podaj 1 albo 2.";
    if (days && (days < W.ojcowskiMinCzesciDni || days > W.ojcowskiDni)) e.okOjc_do = `Część urlopu ojcowskiego trwa od ${W.ojcowskiMinCzesciDni} do ${W.ojcowskiDni} dni.`;
    if (isValidDate(birth) && isValidDate(d.okOjc_do) && !on(d, "p1adop") && d.okOjc_do >= addMonths(birth, W.ojcowskiDoMiesiacaZycia))
      e.okOjc_do = `Urlop ojcowski przysługuje do ukończenia przez dziecko ${W.ojcowskiDoMiesiacaZycia} miesięcy.`;
    if (!d.ojcInny) e.ojcInny = "Wnioskując o zasiłek za okres urlopu ojcowskiego, wypełnij Oświadczenie (TAK albo NIE).";
  }
  if (has(d, "koniecMac") && !isValidDate(d.koniecMac)) e.koniecMac = "Podaj poprawną datę.";
  if (on(d, "pelnyWymiar")) {
    if (!(on(d, "zMac") || on(d, "zWar")) || !on(d, "zRodz")) e.pelnyWymiar = "Informacja o pełnym wymiarze dotyczy wniosku o zasiłek za urlop macierzyński (na warunkach) i rodzicielski.";
    else if (isValidDate(birth) && c.today > addDays(birth, c.params.terminy.jednolityWniosekDni))
      e.pelnyWymiar = `Wniosek o zasiłek w wysokości 81,5% składa się nie później niż ${c.params.terminy.jednolityWniosekDni} dni po porodzie (termin: ${addDays(birth, c.params.terminy.jednolityWniosekDni).split("-").reverse().join(".")}).`;
  }

  // Informacje o ubezpieczeniu
  if (c.selfEmployed && !d.ubezpDobrowolne) e.ubezpDobrowolne = "Prowadząc działalność, zaznacz TAK albo NIE.";

  // W związku z
  const reasons = ["p1", "p1adop", "p1zast", "p2", "p3", "p4", "p5", "p6"];
  if (!reasons.some((k) => on(d, k))) e.p1 = "Zaznacz, w związku z czym wnioskujesz o zasiłek (punkty 1–6).";
  const p1group = ["p1", "p1adop", "p1zast"].filter((k) => on(d, k));
  if (p1group.length > 1) e.p1adop = "W punkcie 1 zaznacz jedną możliwość.";
  if (on(d, "p1adop") || on(d, "p1zast")) {
    if (!isValidDate(d.p1data)) e.p1data = "Podaj datę przyjęcia na wychowanie dziecka/dzieci.";
    else if (d.p1data > c.today) e.p1data = "Data przyjęcia nie może być z przyszłości.";
  }
  const childReq = (on: boolean, k: string) => { if (on && !has(d, `dziecko${k}`)) e[`dziecko${k}`] = "Podaj imię i nazwisko oraz datę i miejsce urodzenia dziecka/dzieci."; };
  childReq(p1group.length > 0, "1");
  childReq(on(d, "p3"), "3");
  childReq(on(d, "p4"), "4");
  childReq(on(d, "p5"), "5");
  for (const k of ["1", "3", "5"]) if (on(d, `zaZyciem${k}`) && !has(d, `zaZyciemImiona${k}`)) e[`zaZyciemImiona${k}`] = "Podaj imię/imiona dziecka/dzieci.";
  if (on(d, "p2") && !isValidDate(d.p2data)) e.p2data = "Podaj przewidywaną datę porodu.";
  if (on(d, "p3") && !["p3upadlosc", "p3likwidacja", "p3naruszenie", "p3zmarl"].some((k) => on(d, k))) e.p3upadlosc = "Zaznacz, co dotyczyło pracodawcy.";
  if (on(d, "p4")) {
    if (!["p4a", "p4b", "p4c", "p4d"].some((k) => on(d, k))) e.p4a = "Zaznacz okoliczność urodzenia dziecka.";
    const days = period(d, e, "p4szpital", "pobyt w szpitalu");
    if (on(d, "p4d") && days && days < W.uzupelniajacyOd37MinKolejnychDni) e.p4szpital_do = `Pobyt w szpitalu musi trwać co najmniej ${W.uzupelniajacyOd37MinKolejnychDni} kolejne dni.`;
    if (on(d, "p4d") && isValidDate(birth) && isValidDate(d.p4szpital_od)) {
      const first = Math.max(diffDays(birth, d.p4szpital_od), W.uzupelniajacyOd37PierwszyDzienOd);
      if (first > W.uzupelniajacyOd37PierwszyDzienDo) e.p4szpital_od = `Pierwszy z dni pobytu musi przypadać między ${W.uzupelniajacyOd37PierwszyDzienOd}. a ${W.uzupelniajacyOd37PierwszyDzienDo}. dniem po porodzie.`;
    }
    if ((on(d, "p4a") || on(d, "p4b")) && on(d, "p4c")) e.p4c = "Ta okoliczność wyklucza poprzednie (poród przed 28. tyg. lub masa do 1000 g).";
  }
  if (on(d, "p5")) {
    const s = ["p5skrocenie", "p5szpital", "p5orzeczenie", "p5praca", "p5porzucenie", "p5smierc"].filter((k) => on(d, k));
    if (!s.length) e.p5skrocenie = "Zaznacz sytuację matki dziecka.";
    if (!isValidDate(d.p5data)) e.p5data = "Podaj datę.";
    if (!has(d, "p5matka")) e.p5matka = "Podaj dane matki: imię i nazwisko oraz PESEL (albo dokument i datę urodzenia).";
  }
  if (on(d, "p6")) {
    if (!on(d, "p6mnie") && !on(d, "p6dziecka")) e.p6mnie = "Zaznacz, kogo wypisano ze szpitala.";
    if (!isValidDate(d.p6data)) e.p6data = "Podaj datę wypisu.";
  }

  // Oświadczenie / Informacja
  if (d.ojcInny === "TAK" && !has(d, "ojcInnyOpis")) e.ojcInnyOpis = "Podaj tytuł i okres pobierania.";
  if ((on(d, "zRodz") || on(d, "zUzup")) && !d.drugiRodzic) e.drugiRodzic = "Wnioskując o zasiłek za urlop rodzicielski lub uzupełniający, wypełnij Informację (TAK albo NIE).";
  if (d.drugiRodzic === "TAK") {
    if (!has(d, "drugiRodzicOkres")) e.drugiRodzicOkres = "Podaj okres od–do.";
    if (on(d, "zUzup")) e.drugiRodzic = "Uzupełniającego urlopu macierzyńskiego nie można podzielić między rodzicami.";
  }
  const second = d.drugiRodzic === "TAK" || on(d, "p5");
  const dp = digits(d.dPesel);
  if (dp && !peselOk(dp)) e.dPesel = "Numer PESEL ma 11 cyfr i poprawną cyfrę kontrolną.";
  if (second) {
    if (!dp && (!isValidDate(d.dDataUr) || !has(d, "dDokument"))) e.dPesel = "Podaj PESEL drugiego rodzica (albo datę urodzenia i dokument tożsamości).";
    if (!has(d, "dImie")) e.dImie = "To pole jest wymagane.";
    if (!has(d, "dNazwisko")) e.dNazwisko = "To pole jest wymagane.";
  }
  sign(d, e, c.today);
  return e;
}

export function validateZAS53(d: V, c: { today: string; params: Params }): V {
  const e: V = {};
  person(d, e, c.today);
  payer(d, e);
  account(d, e);
  period(d, e, "okres", "niezdolność do pracy");
  if (has(d, "zla") && !/^[A-Z]{2,3}\s?\d{6,8}$/i.test(d.zla.trim())) e.zla = "Seria (2–3 litery) i numer (6–8 cyfr) zaświadczenia, np. ZZ 1234567.";
  if (!on(d, "wOkresie") && !on(d, "poUstaniu")) e.wOkresie = "Zaznacz, kiedy przypada niezdolność do pracy.";
  if (on(d, "wOkresie") && on(d, "poUstaniu")) e.poUstaniu = "Zaznacz jedną możliwość.";
  if (on(d, "poUstaniu")) {
    if (!isValidDate(d.dataUstania)) e.dataUstania = "Podaj datę ustania tytułu ubezpieczenia.";
    else if (isValidDate(d.okres_od) && d.dataUstania >= d.okres_od) e.dataUstania = "Niezdolność „po ustaniu” zaczyna się po dacie ustania tytułu ubezpieczenia.";
  }
  if (!d.wypadek) e.wypadek = "Zaznacz TAK albo NIE.";
  if (d.wypadek === "TAK") {
    if (!["chZawodowa", "wypPraca", "wypDroga"].some((k) => on(d, k))) e.chZawodowa = "Zaznacz przyczynę: choroba zawodowa, wypadek przy pracy albo w drodze do/z pracy.";
    if (!has(d, "wypadekDok")) e.wypadekDok = "Podaj rodzaj dokumentu, numer oraz datę jego sporządzenia.";
  }
  if (d.wypadek === "NIE" && ["chZawodowa", "wypPraca", "wypDroga"].some((k) => on(d, k))) e.wypadek = "Zaznaczono przyczynę – wybierz TAK.";
  sign(d, e, c.today);
  return e;
}

/** Krótkie streszczenie wypełnionego formularza (do listy wysłanych i UPO). */
export function summary(form: OfficialForm, d: V) {
  const fmt = (x?: string) => (isValidDate(x) ? x.split("-").reverse().join(".") : "—");
  if (form.code === "ZAM") {
    const okresy = [
      ["zMac", "urlop macierzyński", "okMac"], ["zWar", "urlop na warunkach urlopu macierzyńskiego", "okMac"], ["zRodz", "urlop rodzicielski", "okRodz"],
      ["zUzup", "uzupełniający urlop macierzyński", "okUzup"], ["zOjc", "urlop ojcowski", "okOjc"],
    ].filter(([k]) => on(d, k)).map(([, l, p]) => `${l}: ${fmt(d[`${p}_od`])} – ${fmt(d[`${p}_do`])}`);
    return `ZAM – zasiłek macierzyński za okres: ${okresy.join("; ") || "—"}.`;
  }
  return `ZAS-53 – zasiłek chorobowy: ${fmt(d.okres_od)} – ${fmt(d.okres_do)}${has(d, "zla") ? `, e-ZLA ${d.zla.toUpperCase()}` : ""}.`;
}
