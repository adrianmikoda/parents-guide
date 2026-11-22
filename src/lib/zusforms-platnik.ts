/**
 * Zaświadczenia płatnika składek odwzorowane 1:1 ze wzorów ZUS:
 * Z-3 (zam. nr 2924/26), Z-3a (zam. nr 2929/26), ZAS-12 (zam. nr 2923/26).
 * Wypełnia je płatnik składek (pracodawca / zleceniodawca) – w aplikacji można przygotować wzór i przekazać płatnikowi.
 * Teksty (także oczywiste literówki ze wzoru, np. „sytemu”) przepisano bez zmian.
 */
import { isValidDate } from "./engine";
import { account, ART63, digits, FNode, OfficialForm, payer, peselOk, period, PODSTAWA, RODO, ROZP, sign } from "./zusforms";

type V = Record<string, string>;
const RODO_BEZ_DWUKROPKA = RODO.replace("pod adresem: https", "pod adresem https");
const OSWIADCZENIE = "Oświadczam, że dane zawarte w zaświadczeniu podałem zgodnie z prawdą. Jeżeli ulegną one zmianie, zobowiązuję się poinformować o tym ZUS.";
const PODPIS = "Podpis osoby upoważnionej do wystawienia zaświadczenia, numer telefonu";
const OKRES_ZLA = "Podaj okres zwolnienia (daty od–do) oraz – jeśli znasz – serię i numer zaświadczenia lekarskiego";
const OKRES = "Podaj okres (daty od–do)";
const KROKI = ["Wypełnij WIELKIMI LITERAMI", "Pola wyboru zaznacz znakiem X", "Wypełnij kolorem czarnym lub niebieskim (nie ołówkiem)", "Zanim wypełnisz zaświadczenie, zapoznaj się z Pouczeniem"];
const OKRES_60 =
  "Do jednego okresu zasiłkowego wlicza się wszystkie okresy nieprzerwanej niezdolności do pracy oraz okresy przedzielone przerwą, o ile przerwa pomiędzy ustaniem poprzedniej a powstaniem ponownej niezdolności do pracy nie przekraczała 60 dni. Do jednego okresu zasiłkowego nie wlicza się okresów niezdolności do pracy przypadających przed przerwą nie dłuższą niż 60 dni, jeśli po przerwie niezdolność do pracy wystąpiła w trakcie ciąży.";
const LICZBA_UBEZP =
  "Liczbę ubezpieczonych ustala się według stanu na dzień 30 listopada poprzedniego roku kalendarzowego. Jeśli na ten dzień nie zgłaszałeś nikogo do ubezpieczenia chorobowego, liczbę ubezpieczonych ustala się według stanu na pierwszy miesiąc, w którym dokonałeś takiego zgłoszenia.";

/* ── wspólne sekcje ── */
const payerFull = (h: [string, string, string]): FNode[] => [
  { t: "h", text: "Dane płatnika składek" },
  { t: "field", name: "pNip", label: "NIP", boxes: 10 },
  { t: "field", name: "pRegon", label: "REGON", boxes: 14, hint: h[0] },
  { t: "field", name: "pPesel", label: "PESEL", boxes: 11, hint: h[1] },
  { t: "field", name: "pDokument", label: "Rodzaj, seria i numer dokumentu potwierdzającego tożsamość", hint: h[2] },
  { t: "field", name: "pNazwa", label: "Nazwa albo imię i nazwisko" },
  { t: "field", name: "pUlica", label: "Ulica" },
  { t: "pair", a: { t: "field", name: "pNrDomu", label: "Numer domu" }, b: { t: "field", name: "pNrLokalu", label: "Numer lokalu" } },
  { t: "pair", a: { t: "field", name: "pKod", label: "Kod pocztowy" }, b: { t: "field", name: "pMiejscowosc", label: "Miejscowość" } },
  { t: "field", name: "pPanstwo", label: "Nazwa państwa", hint: "Podaj, jeśli Twój adres jest inny niż polski" },
  { t: "field", name: "pTelefon", label: "Numer telefonu", hint: "Jeśli podasz nam tę informację, ułatwi nam to kontakt w Twojej sprawie. To pole jest dobrowolne", optional: true },
];
const insured: FNode[] = [
  { t: "h", text: "Dane osoby ubezpieczonej" },
  { t: "field", name: "pesel", label: "PESEL", boxes: 11 },
  { t: "field", name: "dataUr", label: "Data urodzenia", date: true, hint: "Podaj, jeśli nie ma nadanego numeru PESEL" },
  { t: "field", name: "dokument", label: "Rodzaj, seria i numer dokumentu potwierdzającego tożsamość", hint: "Podaj, jeśli nie ma nadanego numeru PESEL" },
  { t: "field", name: "imie", label: "Imię" },
  { t: "field", name: "nazwisko", label: "Nazwisko" },
  { t: "field", name: "ulica", label: "Ulica" },
  { t: "pair", a: { t: "field", name: "nrDomu", label: "Numer domu" }, b: { t: "field", name: "nrLokalu", label: "Numer lokalu" } },
  { t: "pair", a: { t: "field", name: "kod", label: "Kod pocztowy" }, b: { t: "field", name: "miejscowosc", label: "Miejscowość" } },
  { t: "field", name: "panstwo", label: "Nazwa państwa", hint: "Podaj, jeśli adres jest inny niż polski" },
];
const benefit = (name: string, label: string, hint: string, zla = false): FNode => ({
  t: "check", name, label,
  children: [
    { t: "period", name: `ok_${name}`, label: "za okres", hint, extra: zla ? `zla_${name}` : undefined },
    ...(zla ? [{ t: "field", name: `zla_${name}`, label: "Seria i numer zaświadczenia lekarskiego (jeśli znasz)", optional: true, paperHidden: true } as FNode] : []),
  ],
});
const cause = (docHint: string): FNode[] => [
  { t: "p", text: "4. Czy niezdolność do pracy powstała z powodu:" },
  { t: "checkrow", items: [{ name: "chZawodowa", label: "choroby zawodowej" }, { name: "wypPraca", label: "wypadku przy pracy" }, { name: "wypDroga", label: "wypadku w drodze do pracy lub z pracy" }] },
  { t: "yesno", name: "wypadek", children: [{ t: "field", name: "wypadekDok", hint: docHint }] },
  { t: "p", text: "5. Czy w okresie niezdolności do pracy z powodu choroby, sprawowania opieki lub macierzyństwa" },
  {
    t: "checkrow",
    items: [
      { name: "u5bezplatny", label: "korzysta z urlopu bezpłatnego" },
      { name: "u5areszt", label: "przebywa w areszcie tymczasowym" },
      { name: "u5opiekunczy", label: "korzysta z urlopu opiekuńczego przysługującego z Kodeksu pracy" },
      { name: "u5wychowawczy", label: "korzysta z urlopu wychowawczego" },
      { name: "u5kara", label: "odbywa karę pozbawienia wolności" },
      { name: "u5smierc", label: "ma usprawiedliwioną nieobecność w pracy, o której mowa w art. 63² § 8 Kodeksu pracy (śmierć pracodawcy)" },
    ],
  },
  { t: "yesno", name: "pkt5", children: [{ t: "field", name: "pkt5Okresy", hint: "Jeśli TAK, podaj okresy od–do" }] },
];
const liczba: FNode[] = [
  { t: "h", text: "Pozostałe informacje" },
  { t: "checkrow", label: "Czy zgłosiłeś do ubezpieczenia chorobowego", items: [{ name: "do20", label: "do 20 ubezpieczonych" }, { name: "pow20", label: "powyżej 20 ubezpieczonych" }] },
];
const ending: FNode[] = [
  { t: "h", text: "Uwagi" },
  { t: "field", name: "uwagi", area: true, optional: true },
  { t: "p", text: OSWIADCZENIE, bold: true },
];
const dniCols = (kto: string) => [
  { label: "przepracował", group: `Liczba dni, które ${kto}:`, num: true },
  { label: "był obowiązany przepracować", group: `Liczba dni, które ${kto}:`, num: true },
];
const zlaBullets = (kto: string) => [
  "w terminie 7 dni od dnia otrzymania zaświadczenia lekarskiego na profilu PUE/eZUS,",
  `w terminie 7 dni od dnia, w którym otrzymałeś od ${kto} zaświadczenie wystawione przez lekarza na formularzu wydrukowanym z systemu teleinformatycznego (zaświadczenie lekarskie wystawione w trybie alternatywnym).`,
];

/* ───────────────────────── Z-3 ───────────────────────── */

export const Z3: OfficialForm = {
  code: "Z-3",
  title: "Zaświadczenie płatnika składek",
  filledBy: "platnik",
  top: [
    { t: "check", name: "pierwszorazowy", label: "wniosek pierwszorazowy" },
    { t: "check", name: "kontynuacja", label: "wniosek o kontynuację świadczenia" },
  ],
  instruction: {
    intro: "Wypełnij to zaświadczenie i przekaż je do nas, jeśli mamy ustalić Twojemu pracownikowi prawo do zasiłku chorobowego, zasiłku opiekuńczego, zasiłku macierzyńskiego, zasiłku w wysokości zasiłku macierzyńskiego, zasiłku wyrównawczego lub świadczenia rehabilitacyjnego.",
    items: [],
    steps: KROKI,
  },
  nodes: [
    ...payerFull(["Podaj, jeśli nie podałeś NIP", "Podaj, jeśli nie masz nadanego NIP i REGON", "Podaj, jeśli nie masz nadanego NIP, REGON i PESEL"]),
    ...insured,
    { t: "h", text: "Rachunek bankowy pracownika" },
    { t: "field", name: "rachunek", boxes: 26, optional: true, hint: "Podaj, jeśli Twój pracownik chce otrzymywać wypłatę zasiłku na rachunek bankowy. To pole jest dobrowolne. Jeśli nie wypełnisz tego pola, zasiłek wypłacimy pracownikowi przekazem pocztowym na jego podany wyżej adres" },
    { t: "h", text: "Pracownik występuje o:" },
    benefit("zChor", "zasiłek chorobowy", OKRES_ZLA, true),
    benefit("zOpiek", "zasiłek opiekuńczy", OKRES_ZLA, true),
    benefit("zMac", "zasiłek macierzyński", OKRES),
    benefit("zWysMac", "zasiłek w wysokości zasiłku macierzyńskiego", OKRES),
    benefit("zWyr", "zasiłek wyrównawczy", OKRES),
    benefit("zRehab", "świadczenie rehabilitacyjne", OKRES),
    { t: "h", text: "Informacje o pracowniku" },
    { t: "period", name: "zatr", label: "1. Jest zatrudniony", openEnd: true, hint: "Podaj datę, od kiedy jest zatrudniony lub okres zatrudnienia od–do" },
    {
      t: "group", label: "w wymiarze czasu pracy",
      fields: [
        { t: "field", name: "wymiar", hint: "Podaj wymiar czasu pracy" },
        { t: "field", name: "wymiarOd", dateText: true, hint: "Podaj datę, od kiedy jest zatrudniony w tym wymiarze (dd/mm/rrrr)" },
      ],
    },
    { t: "yesno", name: "tymczasowa", label: "2. Czy jest zatrudniony na podstawie umowy o pracę tymczasową" },
    { t: "yesno", name: "zaGranica", label: "3. Czy wykonuje pracę za granicą" },
    ...cause("Jeśli TAK, to podaj rodzaj dokumentu potwierdzającego (decyzja / protokół / karta wypadku), numer oraz datę jego sporządzenia"),
    { t: "p", text: "6. Pracownikowi udzielono (wypełnij, jeśli pracownik występuje o zasiłek macierzyński)" },
    {
      t: "checkrow",
      items: [
        { name: "u6mac", label: "urlopu macierzyńskiego" },
        { name: "u6rodz", label: "urlopu rodzicielskiego" },
        { name: "u6war", label: "urlopu na warunkach urlopu macierzyńskiego" },
        { name: "u6uzup", label: "uzupełniającego urlopu macierzyńskiego" },
        { name: "u6ojc", label: "urlopu ojcowskiego" },
        { name: "u6nie", label: "NIE (wniosek dotyczy zasiłku macierzyńskiego po ustaniu zatrudnienia)" },
      ],
    },
    { t: "field", name: "u6opis", hint: "Podaj okres od–do, datę złożenia wniosku oraz stawkę procentową zasiłku macierzyńskiego, jeśli wypłacałeś zasiłek" },
    { t: "p", text: "Dane dziecka/dzieci:", strong: true },
    { t: "field", name: "dzieci", area: true, hint: "Podaj dane dziecka/dzieci: imię i nazwisko, PESEL oraz datę i miejsce urodzenia" },
    { t: "p", text: "Dane drugiego rodzica albo członka rodziny:", strong: true },
    { t: "field", name: "drugi", area: true, hint: "Podaj imię i nazwisko, PESEL albo serię i numer dokumentu stwierdzającego tożsamość i datę urodzenia, jeżeli nie nadano numeru PESEL" },
    { t: "yesno", name: "pracaRodz", label: "7. Czy pracownik w czasie urlopu rodzicielskiego wykonuje pracę u swojego pracodawcy", children: [{ t: "field", name: "pracaRodzOpis", hint: "Jeśli TAK, podaj okres od–do oraz wymiar czasu pracy" }] },
    { t: "h", text: "Informacje o wypłaconych świadczeniach" },
    { t: "yesno", name: "wyn92", label: "1. Czy wypłaciłeś wynagrodzenie za okresy orzeczonej niezdolności do pracy w danym roku kalendarzowym na podstawie art. 92 Kodeksu pracy", children: [{ t: "field", name: "wyn92Opis", hint: "Jeśli TAK, podaj okresy od–do oraz kod literowy. Podaj także okresy wynagrodzenia wypłaconego w poprzednim roku kalendarzowym" }] },
    { t: "yesno", name: "wypZas", label: "2. Czy wypłaciłeś zasiłek chorobowy", children: [{ t: "field", name: "wypZasOpis", hint: "Jeśli TAK, podaj okresy od–do oraz kod literowy. Podaj okresy wliczone do jednego okresu zasiłkowego lub mające wpływ na okres, z którego wynagrodzenie jest uwzględniane w podstawie wymiaru zasiłku." }] },
    ...liczba,
    { t: "h", text: "Informacje o składnikach wynagrodzenia" },
    { t: "p", text: "1. Składniki wynagrodzenia za okresy miesięczne" },
    {
      t: "table", name: "tMies", rows: 12, numbered: true,
      cols: [
        { label: "Rok", num: true }, { label: "Miesiąc", num: true }, ...dniCols("pracownik"),
        { label: "Przyczyna nieprzepracowania całego miesiąca" },
        { label: "Stałe wynagrodzenie zasadnicze i inne składniki stałe w pełnej miesięcznej wysokości określonej w umowie o pracę brutto", num: true },
        { label: "wynagrodzenie zasadnicze i inne składniki pomniejszone proporcjonalnie", group: "Zmienne wynagrodzenie miesięczne brutto", num: true },
        { label: "premie i inne składniki przyjmowane w kwocie faktycznej", group: "Zmienne wynagrodzenie miesięczne brutto", num: true },
        { label: "Procent potrąconej składki", num: true },
      ],
    },
    { t: "p", text: "2. Składniki wynagrodzenia za okresy kwartalne" },
    { t: "table", name: "tKw", rows: 5, numbered: true, cols: [{ label: "Rok", num: true }, { label: "Kwartał", num: true }, { label: "Kwota", num: true }, ...dniCols("pracownik"), { label: "Przyczyna nieprzepracowania całego kwartału" }, { label: "Procent potrąconej składki", num: true }] },
    { t: "p", text: "3. Składniki wynagrodzenia za okresy roczne" },
    { t: "table", name: "tRok", rows: 4, numbered: true, cols: [{ label: "Rok", num: true }, { label: "Kwota", num: true }, ...dniCols("pracownik"), { label: "Przyczyna nieprzepracowania całego roku" }, { label: "Procent potrąconej składki", num: true }] },
    { t: "p", text: "4. Składniki wynagrodzenia za inne okresy" },
    { t: "table", name: "tInne", rows: 4, numbered: true, cols: [{ label: "Okres" }, { label: "Kwota", num: true }, ...dniCols("pracownik"), { label: "Przyczyna nieprzepracowania danego okresu" }, { label: "Procent potrąconej składki", num: true }] },
    { t: "p", text: "5. Czy z pracownikiem jest zawarta umowa zlecenia, umowa agencyjna lub inna umowa o świadczenie usług, do której zgodnie z Kodeksem cywilnym stosuje się przepisy dotyczące zlecenia, albo umowa o dzieło lub inna umowa lub czy przysługuje pracownikowi składnik wynagrodzenia przyznany do określonego terminu?" },
    { t: "yesno", name: "inneUmowy", children: [{ t: "field", name: "inneUmowyOpis", hint: "Jeśli TAK, podaj datę, do której zawarta jest umowa zlecenia (lub inna) – podaj datę, do której składnik przysługuje oraz podaj kwotę wynagrodzenia z tych tytułów za poszczególne miesiące" }] },
    ...ending,
    { t: "sign", name: "dataWniosku", label: PODPIS },
  ],
  footer: [RODO_BEZ_DWUKROPKA],
  info: {
    title: "Pouczenie",
    blocks: [
      { p: `Do zaświadczenia płatnika składek (druk Z-3) dołącz otrzymane od pracownika dokumenty określone w ${ROZP}.` },
      { h: "Czy składasz zaświadczenie Z-3 przy zmianie rodzaju pobieranego przez pracownika zasiłku", hi: true },
      { p: "Zaświadczenie Z-3 złóż ponownie, jeśli zmieni się rodzaj pobieranego przez pracownika zasiłku. Nie dotyczy to świadczenia rehabilitacyjnego, jeżeli zaświadczenie Z-3 złożyłeś do ustalenia prawa do zasiłku chorobowego." },
      { h: "Kiedy składasz zaświadczenie Z-3, jeśli Twój pracownik jest chory lub opiekuje się chorym członkiem rodziny", hi: true },
      { p: "Aby ZUS ustalił prawo do zasiłku Twojemu pracownikowi, musi otrzymać wniosek o zasiłek." },
      {
        p: "W czasie trwania zatrudnienia Ty składasz do ZUS wniosek o zasiłek w imieniu pracownika. Wnioskiem tym – w przypadku pierwszego zaświadczenia lekarskiego – jest zaświadczenie Z-3. Jeśli ZUS ma ustalić prawo do zasiłku za dalszy nieprzerwany okres choroby lub sprawowania opieki, wnioskiem jest:",
        bullets: ["zaświadczenie płatnika składek Z-3 wypełnione do pkt 1 oraz pkt 5 sekcji Informacje o pracowniku, albo", "zaświadczenie płatnika składek ZAS-12."],
      },
      { p: "Zaświadczenie Z-3/ZAS-12 złóż:", bullets: zlaBullets("pracownika") },
      { p: "Jeśli Twój pracownik otrzymał zaświadczenie lekarskie wystawione w trybie alternatywnym i lekarz nie wprowadził go do systemu (nie widzisz go na swoim profilu na PUE/eZUS) łącznie z Z-3 lub ZAS-12 przekaż do ZUS również otrzymane od pracownika zaświadczenie lekarskie." },
      { sec: "Informacje o pracowniku" },
      { hs: "Do pkt 1" },
      { p: "Wpisz datę początku i końca zatrudnienia (dzień, miesiąc, rok). Jeśli zatrudnienie trwa, wpisz tylko datę początkową." },
      { p: "Jeśli w trakcie zatrudnienia pracownik miał zmieniany wymiar czasu pracy, w pozycji „podaj wymiar czasu pracy” podaj wymiar czasu pracy obowiązujący pracownika w miesiącu, w którym zachorował. W pozycji „podaj datę od kiedy” podaj datę, od której pracownik pracuje w aktualnym wymiarze czasu pracy." },
      { hs: "Do pkt 4" },
      { p: "Jeśli niezdolność do pracy jest spowodowana wypadkiem przy pracy albo wypadkiem w drodze do pracy lub z pracy, do wniosku o zasiłek chorobowy powinien być dołączony protokół lub karta wypadku." },
      { p: "W przypadku choroby zawodowej dołącz decyzję o stwierdzeniu choroby zawodowej i zaświadczenie lekarza, które stwierdza, że niezdolność do pracy pracownika jest spowodowana chorobą zawodową." },
      { hs: "Do pkt 6" },
      { p: "Jeśli pracownik ubiega się o zasiłek macierzyński, wpisz okres udzielonego urlopu macierzyńskiego, urlopu na warunkach urlopu macierzyńskiego, urlopu uzupełniającego, urlopu rodzicielskiego lub urlopu ojcowskiego." },
      { p: "Jeżeli urlop rodzicielski / urlop ojcowski udzielany jest w więcej niż jednej części, wpisz okresy urlopów udzielonych w tych częściach oraz datę złożenia wniosków o poszczególne części urlopu rodzicielskiego / urlopu ojcowskiego." },
      { p: "Wpisz imię i nazwisko dziecka, numer PESEL dziecka, datę i miejsce urodzenia dziecka." },
      { p: "Podaj imię i nazwisko rodzica albo członka rodziny dziecka wraz z numerem PESEL albo serią i numerem dokumentu stwierdzającego tożsamość i datę urodzenia, jeżeli nie nadano numeru PESEL – jeżeli są niezbędne do rozpatrzenia wniosku o zasiłek macierzyński." },
      { sec: "Informacje o wypłaconych świadczeniach" },
      { p: OKRES_60 },
      { p: "Jeśli umowa o pracę z pracownicą została przedłużona do dnia porodu i byłbyś zobowiązany do wypłaty zasiłku macierzyńskiego tylko za jeden dzień, wypłaty zasiłku za cały okres dokonuje ZUS." },
      { sec: "Pozostałe informacje" },
      { p: LICZBA_UBEZP },
      { sec: "Informacje o składnikach wynagrodzenia" },
      { hs: "Informacje ogólne" },
      { p: "W tabelach podaj kwoty składników wynagrodzenia niepomniejszone o składki na ubezpieczenia społeczne." },
      { p: "Podaj wyłącznie składniki wynagrodzenia uwzględniane przy obliczaniu podstawy wymiaru zasiłku. Nie wykazuj takich składników wynagrodzenia, do których pracownik zachowuje prawo za okres pobierania zasiłku i które są mu wypłacane za okres pobierania zasiłku, oraz składników wynagrodzenia, na których przyznanie i wypłatę pobieranie zasiłków nie ma żadnego wpływu, takich jak m.in.: jednorazowe zasiłki na zagospodarowanie, wartość szczepień ochronnych finansowanych przez pracodawcę, wartość badań mammograficznych lub innych nieodpłatnych badań, nagrody za ukończenie przez pracownika szkoły (studiów), sfinansowanie lub dofinansowanie przez pracodawcę kosztów wynajmu mieszkania przez pracownika, dopłata pracodawcy do dodatkowego ubezpieczenia pracownika z tytułu różnych ryzyk, bony lub wypłaty w gotówce przyznawane w jednakowej wysokości lub według jednakowego wskaźnika procentowego w stosunku do płacy pracownika określonej w umowie o pracę wszystkim pracownikom lub grupom pracowników z okazji uroczystych dni, świąt, rocznicy powstania firmy itp. Jeśli zasiłek przysługuje za okres po ustaniu zatrudnienia, podaj wszystkie składniki wynagrodzenia, które stanowiły podstawę wymiaru składek na ubezpieczenie chorobowe pracownika, także te, do których pracownik zachowywał prawo za okres pobierania zasiłku oraz na których przyznanie i wypłatę pobieranie zasiłków nie miało wpływu." },
      { p: "Wynagrodzenie za urlop wypoczynkowy traktuje się na równi z wynagrodzeniem za pracę." },
      { p: "Składniki wynagrodzenia, które przysługują do określonego terminu, uwzględnia się w podstawie wymiaru zasiłku, który przysługuje tylko do tego terminu. W związku z tym w tabelach nie podawaj składników przyznanych do określonego terminu, jeżeli zasiłek przysługuje za okres po upływie tego terminu. Jeżeli okres, do którego składnik jest przyznany, nie upłynął przed rozpoczęciem niezdolności do pracy, podaj w pkt 5 okres, do którego składnik wynagrodzenia przysługuje, oraz jego kwotę." },
      { hs: "Do pkt 1 (tabele Składniki wynagrodzenia za okresy miesięczne)" },
      { p: "Podaj wynagrodzenie wypłacone pracownikowi za okres 12 miesięcy kalendarzowych poprzedzających miesiąc, w którym powstała nieprzerwana niezdolność do pracy. Jeśli pracownik przed okresem tej nieprzerwanej niezdolności do pracy pobierał zasiłek albo wynagrodzenie chorobowe oraz przerwa między okresami pobierania zasiłku / wynagrodzenia chorobowego była krótsza niż 1 miesiąc kalendarzowy, podaj wynagrodzenie za okres poprzedzający miesiąc, w którym powstała najwcześniejsza z niezdolności do pracy. W razie zmiany wymiaru czasu pracy w okresie 12 miesięcy kalendarzowych poprzedzających powstanie niezdolności do pracy albo w miesiącu, w którym powstała niezdolność do pracy, podaj wynagrodzenie tylko za pełne kalendarzowe miesiące po zmianie wymiaru czasu pracy. Wynagrodzenie określone dla nowego wymiaru czasu pracy podaj również, jeśli pomiędzy okresami pobierania zasiłków zarówno tego samego rodzaju, jak i innego rodzaju nie było przerwy albo przerwa była krótsza niż 1 miesiąc kalendarzowy." },
      { p: "Jeżeli pracownik otrzymuje wynagrodzenie zasadnicze lub inne składniki miesięczne w stałej wysokości, w tym wynagrodzenie godzinowe, w kolumnie 6 tabeli podaj je w pełnej kwocie określonej w umowie o pracę lub innym akcie nawiązującym stosunek pracy." },
      { p: "W przypadku pracownika tymczasowego podaj kwotę ustaloną odpowiednio do okresu umowy o pracę tymczasową." },
      { p: "W przypadku pracownika, który wykonuje pracę za granicą, kwoty, które są podstawą wymiaru składki na ubezpieczenie chorobowe, wykaż bez uzupełnienia." },
      { p: "Jeżeli w miesiącu, z którego wynagrodzenie jest uwzględniane przy ustalaniu podstawy wymiaru zasiłku, przychód pracownika przekroczył roczną podstawę wymiaru składek na ubezpieczenia emerytalne i rentowe, oblicz średni wskaźnik potrąconej pracownikowi za ten miesiąc składki na ubezpieczenia społeczne w następujący sposób:", frac: ["kwota potrąconej składki × 100", "przychód stanowiący podstawę wymiaru składek"] },
      {
        p: "Jeżeli pracownik otrzymuje wynagrodzenie zmienne:",
        bullets: [
          "w kolumnie 7 tabeli podaj wynagrodzenie zasadnicze i inne składniki wynagrodzenia, które są pomniejszane proporcjonalnie za okres pobierania zasiłku i w związku z tym w podstawie wymiaru zasiłku będą uwzględnione po uprzednim uzupełnieniu przez ZUS,",
          "w kolumnie 8 tabeli podaj składniki wynagrodzenia, które są zmniejszane za okres pobierania zasiłku w inny sposób niż proporcjonalnie i w związku z tym w podstawie wymiaru zasiłku będą uwzględnione w kwocie faktycznie wypłaconej bez uzupełniania, np. wynagrodzenie za pracę w godzinach nadliczbowych wraz z dopłatami.",
        ],
      },
      { hs: "Do pkt 2, 3, 4 (tabele Składniki wynagrodzeń za okresy kwartalne, roczne oraz inne okresy)" },
      { p: "W tabelach zamieszczonych w pkt 2, 3, 4 kolumny dotyczące liczby dni, które pracownik przepracował lub był obowiązany przepracować, wypełnij tylko wtedy, gdy składnik wynagrodzenia odpowiednio kwartalny, roczny lub za inne okresy jest składnikiem pomniejszanym proporcjonalnie za okresy pobierania zasiłku." },
      { hs: "Do pkt 5 (dane o wynagrodzeniu z tytułu wykonywania umowy zlecenia, umowy agencyjnej lub innej umowy o świadczenie usług oraz o składnikach wynagrodzenia, które przysługują pracownikowi do określonego terminu)" },
      { p: "Jeżeli pracownikowi przysługuje składnik wynagrodzenia do określonego terminu i termin ten nie upłynął przed rozpoczęciem niezdolności do pracy, podaj datę, do której składnik wynagrodzenia przysługuje, oraz kwoty wypłacone pracownikowi za poszczególne miesiące, z których wynagrodzenie jest przyjmowane do ustalenia podstawy wymiaru zasiłku." },
      { p: "Wynagrodzenie osoby wykonującej pracę na podstawie umowy agencyjnej, umowy zlecenia lub innej umowy o świadczenie usług, do której zgodnie z Kodeksem cywilnym stosuje się przepisy dotyczące zlecenia, albo umowy o dzieło, jeżeli umowę taką zawarła z pracodawcą, z którym pozostaje w stosunku pracy, lub jeżeli w ramach takiej umowy wykonuje pracę na rzecz pracodawcy, z którym pozostaje w stosunku pracy uwzględnia się w podstawie wymiaru świadczeń w razie choroby i macierzyństwa. Podaj okres, na jaki umowa została zawarta, oraz przychód osiągnięty z tytułu wykonywania tej umowy w rozbiciu na poszczególne miesiące, z których wynagrodzenie jest przyjmowane do ustalenia podstawy wymiaru zasiłku." },
      { sec: "Uwagi" },
      { p: "Podstawy wymiaru zasiłku nie ustala się na nowo, jeżeli między okresami pobierania zasiłków tego samego rodzaju, jak i innego rodzaju nie było przerwy albo przerwa była krótsza niż 1 miesiąc kalendarzowy. Jeżeli w związku z tym w tabelach podałeś wynagrodzenie pracownika z innego okresu niż 12 miesięcy kalendarzowych poprzedzających powstanie niezdolności do pracy, w sekcji Uwagi podaj dodatkowo poprzedni okres / poprzednie okresy pobierania zasiłku lub wynagrodzenia za okres choroby, jeżeli nie zostały wykazane sekcji Informacje o wypłaconych świadczeniach." },
      { p: "W przypadku gdy wynagrodzenie pracownika, które stanowi podstawę wymiaru zasiłku wraz ze składnikami przysługującymi za okres pobierania zasiłku jest na poziomie minimalnego wynagrodzenia za pracę, w sekcji Uwagi podaj miesięczne kwoty składników wynagrodzenia, do których pracownik zachowuje prawo za okres niezdolności do pracy." },
      { p: "Jeśli w okresie 12 miesięcy kalendarzowych poprzedzających powstanie niezdolności do pracy albo w miesiącu, w którym powstała niezdolność do pracy, zmienił się wymiar czasu pracy, w sekcji Uwagi podaj poprzedni wymiar czasu pracy, a w tabeli w pkt 1 podaj wynagrodzenie ustalone dla nowego wymiaru czasu pracy." },
      { p: "Poinformuj ZUS o okolicznościach mających wpływ na prawo, wysokość i podstawę wymiaru zasiłku, które uległy zmianie w stosunku do podanych wcześniej, w szczególności o ustaniu zatrudnienia albo o podjęciu przez pracownika korzystającego z urlopu rodzicielskiego pracy w wymiarze nie wyższym niż połowa etatu." },
      { p: ART63 },
      { p: PODSTAWA, b: true },
    ],
  },
};

/* ───────────────────────── Z-3a ───────────────────────── */

export const Z3A: OfficialForm = {
  code: "Z-3a",
  title: "Zaświadczenie płatnika składek",
  filledBy: "platnik",
  top: [
    { t: "check", name: "pierwszorazowy", label: "pierwszy wniosek o świadczenie" },
    { t: "check", name: "kontynuacja", label: "wniosek o kontynuację świadczenia" },
  ],
  instruction: {
    intro: "Wypełnij to zaświadczenie i przekaż je do nas, jeśli osobie niebędącej pracownikiem z wyłączeniem osób prowadzących pozarolniczą działalność, współpracujących z tymi osobami, duchownego oraz marynarza, mamy ustalić prawo do zasiłku chorobowego, zasiłku opiekuńczego, zasiłku macierzyńskiego lub świadczenia rehabilitacyjnego.",
    items: [],
    steps: KROKI,
  },
  nodes: [
    ...payerFull(["Podaj, jeśli nie podałeś NIP", "Podaj, jeśli nie masz nadanego NIP i REGON", "Podaj, jeśli nie masz nadanego NIP, REGON i PESEL"]),
    ...insured,
    { t: "h", text: "Rachunek bankowy" },
    { t: "field", name: "rachunek", boxes: 26, optional: true, hint: "Podaj, jeśli Twój ubezpieczony chce otrzymywać wypłatę zasiłku na rachunek bankowy. To pole jest dobrowolne. Jeśli nie wypełnisz tego pola, zasiłek wypłacimy ubezpieczonemu przekazem pocztowym na jego podany wyżej adres" },
    { t: "h", text: "Ubezpieczony występuje o:" },
    benefit("zChor", "zasiłek chorobowy", OKRES_ZLA, true),
    benefit("zOpiek", "zasiłek opiekuńczy", OKRES_ZLA, true),
    benefit("zMac", "zasiłek macierzyński", OKRES),
    benefit("zRehab", "świadczenie rehabilitacyjne", OKRES),
    { t: "field", name: "wniosekMacData", label: "Wniosek o zasiłek macierzyński złożył w dniu", date: true, inline: true, hint: "Podaj datę złożenia wniosku o zasiłek macierzyński" },
    { t: "field", name: "stawka", label: "Jeśli wypłacałeś zasiłek macierzyński, podaj stawkę procentową wypłaconego zasiłku.", inline: true },
    { t: "p", text: "Dane dziecka/dzieci:", strong: true },
    { t: "field", name: "dzieci", area: true, hint: "Podaj dane dziecka/dzieci: imię i nazwisko, PESEL oraz datę i miejsce urodzenia" },
    { t: "h", text: "Dane drugiego rodzica albo członka rodziny" },
    { t: "field", name: "drugi", area: true, hint: "Podaj imię i nazwisko, PESEL albo serię i numer dokumentu stwierdzającego tożsamość i datę urodzenia, jeżeli nadano numeru PESEL" },
    { t: "h", text: "Informacje o ubezpieczeniu" },
    { t: "p", text: "Czy jest objęty ubezpieczeniem:" },
    { t: "yesno", name: "ubChor", label: "w razie choroby i macierzyństwa (ubezpieczenie chorobowe)" },
    { t: "yesno", name: "ubWyp", label: "z tytułu wypadków przy pracy i chorób zawodowych (ubezpieczenie wypadkowe)" },
    ...[
      "jako członek rolniczej spółdzielni produkcyjnej lub spółdzielni kółek rolniczych",
      "jako osoba wykonująca pracę na podstawie umowy agencyjnej lub umowy zlecenia albo innej umowy o świadczeniu usług, do której zgodnie z Kodeksem cywilnym stosuje się przepisy dotyczące zlecenia lub jako osoba współpracująca",
      "jako osoba wykonująca umowę o pracę nakładczą",
      "jako osoba wykonująca odpłatnie pracę na podstawie skierowania do pracy w czasie odbywania kary pozbawienia wolności albo tymczasowego aresztowania",
      "jako poseł lub senator pobierający uposażenie",
      "jako osoba pobierająca stypendium sportowe",
      "jako słuchacz Krajowej Szkoły Administracji Publicznej pobierający stypendium",
      "jako osoba pobierająca stypendium w okresie odbywania szkolenia, stażu lub przygotowania zawodowego dorosłych, na które została skierowana przez powiatowy urząd pracy lub inny podmiot kierujący, albo osoba pobierająca stypendium na podstawie przepisów o promocji zatrudnienia i instytucjach rynku pracy w okresie odbywania studiów podyplomowych",
      "jako osoba odbywająca służbę zastępczą",
      "jako osoba sprawująca opiekę nad dzieckiem na podstawie umowy uaktywniającej w rozumieniu ustawy z dnia 4 lutego 2011 r. o opiece nad dzieckiem do lat 3",
      "jako doktorant, który otrzymuje stypendium doktoranckie",
    ].map((label, i): FNode => ({ t: "check", name: `tytul${i + 1}`, num: `${i + 1})`, label })),
    { t: "h", text: "Informacje o ubezpieczonym" },
    { t: "period", name: "podlChor", label: "1. Ubezpieczeniu chorobowemu podlega", openEnd: true, hint: "Podaj datę, od kiedy podlega, lub okres podlegania od–do" },
    { t: "period", name: "podlWyp", label: "2. Ubezpieczeniu wypadkowemu podlega", openEnd: true, hint: "Podaj datę, od kiedy podlega, lub okres podlegania od–do" },
    { t: "yesno", name: "ustal", label: "3. Czy tytuł ubezpieczenia ustał", children: [{ t: "field", name: "dataUstania", date: true, hint: "Jeśli TAK, podaj datę ustania" }] },
    ...cause("Jeśli TAK, to podaj rodzaj dokumentu potwierdzającego (decyzja / karta wypadku), numer oraz datę jego sporządzenia"),
    { t: "h", text: "Informacje o wypłaconych świadczeniach" },
    { t: "yesno", name: "wyn92", label: "1. Czy wypłaciłeś wynagrodzenie za okresy orzeczonej niezdolności do pracy w danym roku kalendarzowym na podstawie art. 92 Kodeksu pracy (dotyczy osoby wykonującej pracę nakładczą oraz osoby odbywającej służbę zastępczą)", children: [{ t: "field", name: "wyn92Opis", hint: "Jeśli TAK, podaj okresy od–do oraz kod literowy. Podaj także okresy wynagrodzenia wypłaconego w poprzednim roku wliczane do jednego okresu zasiłkowego" }] },
    { t: "yesno", name: "wypZas", label: "2. Czy wypłaciłeś zasiłek chorobowy", children: [{ t: "field", name: "wypZasOpis", hint: "Jeśli TAK, podaj okresy od–do oraz kod literowy. Podaj okresy wliczone do jednego okresu zasiłkowego" }] },
    { t: "yesno", name: "uposaz", label: "3. Czy wypłaciłeś uposażenie / stypendium / inne świadczenie za okresy orzeczonej niezdolności do pracy (dotyczy tylko osób, o których mowa w pkt 5–8 sekcji Informacje o ubezpieczeniu)", children: [{ t: "field", name: "uposazOpis", hint: "Jeśli TAK, podaj okresy od–do oraz kod literowy. Podaj okresy wliczone do jednego okresu zasiłkowego w danym roku kalendarzowym oraz w poprzednim roku kalendarzowym," }] },
    ...liczba,
    { t: "h", text: "Informacje o przychodzie" },
    { t: "p", text: "Przychód stanowiący podstawę wymiaru składek" },
    { t: "table", name: "tPrzych", rows: 12, cols: [{ label: "Rok", num: true }, { label: "Miesiąc", num: true }, ...dniCols("ubezpieczony"), { label: "Podstawa wymiaru składek", num: true }] },
    ...ending,
    { t: "sign", name: "dataWniosku", label: `${PODPIS}.` },
  ],
  footer: [RODO],
  info: {
    title: "Pouczenie",
    blocks: [
      { p: `Do zaświadczenia płatnika składek (druk Z-3a) dołącz otrzymane od ubezpieczonego dokumenty określone w ${ROZP}.` },
      { h: "Czy składasz zaświadczenie Z-3a przy zmianie rodzaju pobieranego przez ubezpieczonego zasiłku", hi: true },
      { p: "Zaświadczenie Z-3a złóż ponownie, jeśli zmieni się rodzaj pobieranego przez ubezpieczonego zasiłku. Nie dotyczy to świadczenia rehabilitacyjnego, jeżeli zaświadczenie Z-3a złożyłeś do ustalenia prawa do zasiłku chorobowego." },
      { h: "Kiedy składasz zaświadczenie Z-3a, jeśli Twój ubezpieczony jest chory lub opiekuje się chorym członkiem rodziny", hi: true },
      { p: "Aby ZUS ustalił prawo do zasiłku Twojemu ubezpieczonemu, musi otrzymać wniosek o zasiłek." },
      {
        p: "W czasie trwania ubezpieczenia Ty składasz do ZUS wniosek o zasiłek w imieniu ubezpieczonego. Wnioskiem tym jest – w przypadku pierwszego zwolnienia lekarskiego – zaświadczenie Z-3a. Jeśli ZUS ma ustalić prawo do zasiłku za dalszy nieprzerwany okres choroby lub sprawowania opieki, wnioskiem jest:",
        bullets: ["zaświadczenie Z-3a wypełnione do sekcji Informacje o ubezpieczonym albo", "zaświadczenie ZAS-12."],
      },
      { p: "Zaświadczenie Z-3a/ZAS-12 złóż:", bullets: zlaBullets("ubezpieczonego") },
      { p: "Jeśli Twój ubezpieczony otrzymał zaświadczenie lekarskie wystawione w trybie alternatywnym i lekarz nie wprowadził go do systemu (nie widzisz go na swoim profilu na PUE/eZUS), łącznie z Z-3a lub ZAS-12 przekaż do ZUS również otrzymane od ubezpieczonego zaświadczenie lekarskie." },
      { sec: "Ubezpieczony występuje o:" },
      { p: "Wpisz imię i nazwisko dziecka, numer PESEL dziecka, datę i miejsce urodzenia dziecka." },
      { p: "Podaj imię i nazwisko rodzica albo członka rodziny dziecka wraz z numerem PESEL albo serią i numerem dokumentu stwierdzającego tożsamość i datę urodzenia, jeżeli nie nadano numeru PESEL – jeżeli są niezbędne do rozpatrzenia wniosku o zasiłek macierzyński." },
      { sec: "Informacje o ubezpieczeniu" },
      { hs: "Do pkt 1 i 2" },
      { p: "Wpisz datę początku i końca trwania ubezpieczenia (dzień, miesiąc, rok). Gdy ubezpieczenie trwa, wpisz tylko datę początkową." },
      { hs: "Do pkt 3" },
      { p: "Podaj, czy tytuł ubezpieczenia ustał, czy trwa nadal; jeżeli ustał, wpisz datę ustania tytułu ubezpieczenia." },
      { hs: "Do pkt 4" },
      { p: "Jeśli niezdolność do pracy jest spowodowana wypadkiem przy pracy, wypadkiem w drodze do pracy lub z pracy, do wniosku o zasiłek chorobowy powinna być dołączona karta wypadku." },
      { p: "W przypadku choroby zawodowej dołącz decyzję o stwierdzeniu choroby zawodowej i zaświadczenie lekarza, które stwierdza, że niezdolność do pracy pracownika jest spowodowana chorobą zawodową." },
      { sec: "Informacje o wypłaconych świadczeniach" },
      { p: OKRES_60 },
      { sec: "Pozostałe informacje" },
      { p: LICZBA_UBEZP },
      { sec: "Informacje o przychodzie" },
      { p: "W tabeli w części dotyczącej przychodu stanowiącego podstawę wymiaru składek podaj kwoty niepomniejszone o składki na ubezpieczenia społeczne." },
      { hs: "Wyjaśnienia dotyczące podstawy wymiaru zasiłku ubezpieczonych, o których mowa w sekcji: Informacje o ubezpieczeniu w pkt 1–4 i 10–11" },
      { p: "Podstawę wymiaru zasiłku stanowi przychód przyjęty do podstawy wymiaru składek na ubezpieczenie chorobowe albo odpowiednio ubezpieczenie wypadkowe, po odliczeniu kwoty odpowiadającej 13,71% podstawy wymiaru składek, za okres 12 miesięcy kalendarzowych poprzedzających miesiąc, w którym powstała niezdolność do pracy." },
      { p: "Jeżeli wypłaciłeś ubezpieczonemu składniki przychodu za okresy dłuższe niż miesiąc (np. za okresy kwartalne, roczne lub inne), w sekcji Uwagi podaj poszczególne kwoty i okresy, za które zostały wypłacone." },
      { p: "W przypadku członków rolniczych spółdzielni produkcyjnych lub spółdzielni kółek rolniczych wyrównanie dniówek obrachunkowych wypłacane raz w roku potraktuj jako składnik roczny i wykaż je w sekcji Uwagi." },
      { p: "Jeśli ubezpieczony nie przepracował części miesiąca, za który przychód jest podany w tabeli, w sekcji Uwagi podaj przyczynę nieprzepracowania całego miesiąca." },
      { p: "Podstawy wymiaru zasiłku nie ustala się na nowo, jeżeli między okresami pobierania zasiłków zarówno tego samego rodzaju, jak i innego rodzaju nie było przerwy albo przerwa była krótsza niż 1 miesiąc kalendarzowy. Jeżeli w związku z tym w tabeli podałeś przychód z innego okresu niż 12 miesięcy kalendarzowych poprzedzających miesiąc, w którym powstała niezdolność do pracy, w sekcji Uwagi podaj poprzedni okres / poprzednie okresy pobierania zasiłku lub wynagrodzenia za okres choroby, pod warunkiem że nie został wykazany / zostały wykazane w sekcji Informacje o wypłaconych świadczeniach." },
      { hs: "Wyjaśnienie dotyczące ubezpieczonych, o których mowa w sekcji Informacje o ubezpieczeniu w pkt 5–8" },
      { p: "Podstawę wymiaru zasiłku chorobowego i świadczenia rehabilitacyjnego przysługującego po ustaniu ubezpieczenia wypadkowego stanowi przychód przyjęty do podstawy wymiaru składek na ubezpieczenie wypadkowe za okres 12 miesięcy poprzedzających datę powstania nieprzerwanej niezdolności do pracy, po odliczeniu kwoty odpowiadającej 11,26% podstawy wymiaru składki na to ubezpieczenie." },
      { hs: "Wyjaśnienie dotyczące ubezpieczonych, o których mowa w sekcji Informacje o ubezpieczeniu w pkt 9" },
      { p: "Podstawę wymiaru zasiłku dla osoby odbywającej służbę zastępczą stanowi kwota świadczenia pieniężnego określona w przepisach o służbie zastępczej za miesiąc, w którym powstała niezdolność do pracy, po odliczeniu 13,71% tej kwoty." },
      { p: "Poinformuj ZUS o okolicznościach mających wpływ na prawo, wysokość i podstawę wymiaru zasiłku, które uległy zmianie w stosunku do podanych wcześniej, w szczególności o ustaniu ubezpieczenia." },
      { p: ART63 },
      { p: PODSTAWA, b: true },
    ],
  },
};

/* ───────────────────────── ZAS-12 ───────────────────────── */

export const ZAS12: OfficialForm = {
  code: "ZAS-12",
  title: "Zaświadczenie płatnika składek",
  titleLines: ["Zaświadczenie płatnika składek", "Dotyczy: ustalenia prawa do zasiłku chorobowego lub opiekuńczego za dalszy okres"],
  filledBy: "platnik",
  instruction: {
    intro: "Wypełnij to zaświadczenie i przekaż je do nas, jeśli mamy ustalić Twojemu pracownikowi/ubezpieczonemu prawo do zasiłku chorobowego lub opiekuńczego z tytułu sprawowania opieki nad chorym członkiem rodziny za dalszy okres jego nieprzerwanej niezdolności do pracy / sprawowania opieki.",
    items: [],
    steps: KROKI,
  },
  nodes: [
    ...payerFull(["Podaj, jeśli nie masz nadanego NIP", "Podaj, jeśli nie masz nadanego NIP, REGON", "Podaj, jeśli nie masz nadanego NIP, REGON, numeru PESEL"]),
    ...insured,
    { t: "h", text: "Rachunek bankowy" },
    { t: "field", name: "rachunek", boxes: 26, optional: true, hint: "Podaj, jeśli Twój pracownik/ubezpieczony chce otrzymywać wypłatę zasiłku na rachunek bankowy. To pole jest dobrowolne. Jeśli nie wypełnisz tego pola, zasiłek wypłacimy pracownikowi/ubezpieczonemu przekazem pocztowym na jego podany wyżej adres" },
    { t: "h", text: "Ubezpieczony wnioskuje o:" },
    benefit("zChor", "zasiłek chorobowy", OKRES_ZLA, true),
    benefit("zOpiek", "zasiłek opiekuńczy", OKRES_ZLA, true),
    { t: "h", text: "Informacje o zatrudnieniu/ubezpieczeniu" },
    { t: "yesno", name: "trwa", label: "1. Zatrudnienie / tytuł ubezpieczenia trwa nadal:" },
    { t: "field", name: "ustal", label: "2. Zatrudnienie / tytuł ubezpieczenia ustał z dniem:", date: true, inline: true },
    { t: "field", name: "ustalChor", label: "3. Tytuł ubezpieczenia trwa nadal, ale ubezpieczenie chorobowe ustało/ustanie z dniem:", date: true, inline: true },
    { t: "p", text: OSWIADCZENIE, bold: true },
    { t: "sign", name: "dataWniosku", label: PODPIS },
  ],
  footer: [RODO_BEZ_DWUKROPKA],
  info: {
    title: "Pouczenie",
    blocks: [
      { p: "Aby ZUS ustalił prawo do zasiłku chorobowego lub opiekuńczego Twojemu pracownikowi/ubezpieczonemu, musi otrzymać wniosek o zasiłek." },
      { p: "W czasie trwania zatrudnienia/ubezpieczenia składasz do ZUS wniosek o zasiłek w imieniu pracownika/ubezpieczonego. Wnioskiem tym – w przypadku pierwszego zaświadczenia lekarskiego – jest zaświadczenie płatnika składek (druk Z-3, gdy dotyczy pracownika, lub Z-3a, gdy dotyczy osoby ubezpieczonej z innego tytułu)." },
      {
        p: "Jeśli ZUS ma ustalić prawo do zasiłku za dalszy nieprzerwany okres choroby lub sprawowania opieki, wnioskiem jest zaświadczenie płatnika składek; skorzystaj z druku:",
        bullets: [
          "Z-3, gdy wniosek dotyczy pracownika – wypełnione do pkt 1 i pkt 5 sekcji Informacja o pracowniku,",
          "Z-3a, gdy wniosek dotyczy osoby ubezpieczonej z innego tytułu – wypełnione do sekcji Informacja o ubezpieczonym, albo",
          "ZAS-12.",
        ],
      },
      {
        p: "Zaświadczenie Z-3/Z-3a/ZAS-12 złóż:",
        bullets: [
          "w terminie 7 dni od dnia otrzymania zaświadczenia lekarskiego na profilu PUE/eZUS,",
          "w terminie 7 dni od dnia, w którym otrzymałeś od pracownika/ubezpieczonego zaświadczenie wystawione przez lekarza na formularzu wydrukowanym z sytemu teleinformatycznego (zaświadczenie lekarskie wystawione w trybie alternatywnym).",
        ],
      },
      { p: "Jeśli Twój pracownik/ubezpieczony otrzymał zaświadczenie lekarskie wystawione w trybie alternatywnym i lekarz nie wprowadził go do systemu (nie widzisz go na swoim profilu na portalu PUE/eZUS), łącznie z Z-3/Z-3a lub ZAS-12 przekaż do ZUS również otrzymane od pracownika/ubezpieczonego zaświadczenie lekarskie." },
      { p: "Poinformuj ZUS o okolicznościach mających wpływ na prawo, wysokość i podstawę wymiaru zasiłku, które uległy zmianie." },
      { p: ART63 },
      { p: PODSTAWA, b: true },
    ],
  },
};

/* ───────────────────────── Walidacja ───────────────────────── */

const on = (d: V, k: string) => d[k] === "X";
const has = (d: V, k: string) => !!d[k]?.trim();

function insuredPerson(d: V, e: V, today: string) {
  const p = digits(d.pesel);
  if (p) {
    if (!peselOk(p)) e.pesel = "Numer PESEL ma 11 cyfr i poprawną cyfrę kontrolną.";
  } else {
    if (!isValidDate(d.dataUr)) e.dataUr = "Bez numeru PESEL podaj datę urodzenia ubezpieczonego.";
    else if (d.dataUr > today) e.dataUr = "Data urodzenia nie może być z przyszłości.";
    if (!has(d, "dokument")) e.dokument = "Bez numeru PESEL podaj rodzaj, serię i numer dokumentu tożsamości.";
  }
  for (const k of ["imie", "nazwisko"]) if (!has(d, k)) e[k] = "To pole jest wymagane.";
}
function payerAddress(d: V, e: V) {
  for (const k of ["pNrDomu", "pMiejscowosc"]) if (!has(d, k)) e[k] = "To pole jest wymagane.";
  if (!has(d, "pKod")) e.pKod = "To pole jest wymagane.";
  else if (!has(d, "pPanstwo") && !/^\d{2}-\d{3}$/.test(d.pKod.trim())) e.pKod = "Polski kod pocztowy ma postać 00-000.";
}
function benefits(d: V, e: V, keys: string[]) {
  const chosen = keys.filter((k) => on(d, k));
  if (!chosen.length) e[keys[0]] = "Zaznacz, o jakie świadczenie występuje ubezpieczony.";
  for (const k of chosen) {
    period(d, e, `ok_${k}`);
    if (has(d, `zla_${k}`) && !/^[A-Z]{2,3}\s?\d{6,8}$/i.test(d[`zla_${k}`].trim())) e[`zla_${k}`] = "Seria (2–3 litery) i numer (6–8 cyfr), np. ZZ 1234567.";
  }
}
function openPeriod(d: V, e: V, k: string) {
  if (!isValidDate(d[`${k}_od`])) e[`${k}_od`] = "Podaj datę początkową.";
  else if (isValidDate(d[`${k}_do`]) && d[`${k}_do`] < d[`${k}_od`]) e[`${k}_do`] = "Data końcowa nie może być wcześniejsza niż początkowa.";
}
function yes(d: V, e: V, k: string, detail?: string, msg = "Zaznacz TAK albo NIE.") {
  if (!d[k]) e[k] = msg;
  else if (d[k] === "TAK" && detail && !has(d, detail)) e[detail] = "Uzupełnij informacje (pole „Jeśli TAK”).";
}
function causeChecks(d: V, e: V) {
  const any = ["chZawodowa", "wypPraca", "wypDroga"].some((k) => on(d, k));
  yes(d, e, "wypadek", "wypadekDok");
  if (d.wypadek === "TAK" && !any) e.chZawodowa = "Zaznacz przyczynę niezdolności do pracy.";
  if (d.wypadek === "NIE" && any) e.wypadek = "Zaznaczono przyczynę – wybierz TAK.";
  const any5 = ["u5bezplatny", "u5areszt", "u5opiekunczy", "u5wychowawczy", "u5kara", "u5smierc"].some((k) => on(d, k));
  yes(d, e, "pkt5", "pkt5Okresy");
  if (d.pkt5 === "TAK" && !any5) e.u5bezplatny = "Zaznacz, której sytuacji dotyczy odpowiedź TAK.";
  if (d.pkt5 === "NIE" && any5) e.pkt5 = "Zaznaczono sytuację – wybierz TAK.";
}
function count(d: V, e: V) {
  if (on(d, "do20") === on(d, "pow20")) e.do20 = "Zaznacz jedną odpowiedź: do 20 albo powyżej 20 ubezpieczonych.";
}
/** Komórki tabeli: rok RRRR, miesiąc 1–12, kwartał 1–4, kwoty i liczby dni ≥ 0, procent 0–100. */
function table(d: V, e: V, name: string, cols: string[], rows: number) {
  let filled = 0;
  for (let r = 0; r < rows; r++) {
    const cell = (c: number) => (d[`${name}_${r}_${c}`] ?? "").trim();
    if (!cols.some((_, c) => cell(c))) continue;
    filled++;
    cols.forEach((col, c) => {
      const v = cell(c), key = `${name}_${r}_${c}`;
      if (!v) return;
      const n = Number(v.replace(/\s/g, "").replace(",", "."));
      if (col === "rok" && !/^(19|20)\d{2}$/.test(v)) e[key] = "Rok: RRRR.";
      else if (col === "miesiac" && !(Number.isInteger(n) && n >= 1 && n <= 12)) e[key] = "Miesiąc: 1–12.";
      else if (col === "kwartal" && !(Number.isInteger(n) && n >= 1 && n <= 4)) e[key] = "Kwartał: 1–4.";
      else if (col === "dni" && !(Number.isInteger(n) && n >= 0 && n <= 366)) e[key] = "Liczba dni: 0–366.";
      else if (col === "kwota" && !(Number.isFinite(n) && n >= 0)) e[key] = "Kwota w zł, np. 5200,00.";
      else if (col === "procent" && !(Number.isFinite(n) && n >= 0 && n <= 100)) e[key] = "Procent: 0–100, np. 13,71.";
    });
  }
  return filled;
}

export function validateZ3(d: V, c: { today: string }): V {
  const e: V = {};
  if (on(d, "pierwszorazowy") === on(d, "kontynuacja")) e.pierwszorazowy = "Zaznacz: wniosek pierwszorazowy albo o kontynuację świadczenia.";
  payer(d, e); payerAddress(d, e); insuredPerson(d, e, c.today); account(d, e);
  benefits(d, e, ["zChor", "zOpiek", "zMac", "zWysMac", "zWyr", "zRehab"]);
  openPeriod(d, e, "zatr");
  if (!has(d, "wymiar")) e.wymiar = "Podaj wymiar czasu pracy, np. 1/1 etatu.";
  if (has(d, "wymiarOd") && !isValidDate(d.wymiarOd)) e.wymiarOd = "Podaj poprawną datę.";
  yes(d, e, "tymczasowa"); yes(d, e, "zaGranica");
  causeChecks(d, e);
  const u6 = ["u6mac", "u6rodz", "u6war", "u6uzup", "u6ojc", "u6nie"].filter((k) => on(d, k));
  if (on(d, "zMac")) {
    if (!u6.length) e.u6mac = "Przy zasiłku macierzyńskim zaznacz udzielony urlop (pkt 6).";
    if (!has(d, "u6opis")) e.u6opis = "Podaj okres od–do, datę złożenia wniosku (i stawkę, jeśli wypłacałeś zasiłek).";
    if (!has(d, "dzieci")) e.dzieci = "Podaj dane dziecka/dzieci.";
  }
  if (on(d, "u6nie") && u6.length > 1) e.u6nie = "„NIE” wyklucza zaznaczenie urlopów.";
  if (d.pracaRodz === "TAK" && !has(d, "pracaRodzOpis")) e.pracaRodzOpis = "Podaj okres od–do oraz wymiar czasu pracy.";
  if (on(d, "u6rodz") && !d.pracaRodz) e.pracaRodz = "Przy urlopie rodzicielskim zaznacz TAK albo NIE.";
  yes(d, e, "wyn92", "wyn92Opis"); yes(d, e, "wypZas", "wypZasOpis");
  count(d, e);
  const rows = table(d, e, "tMies", ["rok", "miesiac", "dni", "dni", "", "kwota", "kwota", "kwota", "procent"], 12);
  if (!rows && !on(d, "kontynuacja")) e.tMies_0_0 = "Podaj wynagrodzenie co najmniej za jeden miesiąc (tabela 1).";
  table(d, e, "tKw", ["rok", "kwartal", "kwota", "dni", "dni", "", "procent"], 5);
  table(d, e, "tRok", ["rok", "kwota", "dni", "dni", "", "procent"], 4);
  table(d, e, "tInne", ["", "kwota", "dni", "dni", "", "procent"], 4);
  yes(d, e, "inneUmowy", "inneUmowyOpis");
  sign(d, e, c.today);
  return e;
}

export function validateZ3a(d: V, c: { today: string }): V {
  const e: V = {};
  if (on(d, "pierwszorazowy") === on(d, "kontynuacja")) e.pierwszorazowy = "Zaznacz: pierwszy wniosek albo o kontynuację świadczenia.";
  payer(d, e); payerAddress(d, e); insuredPerson(d, e, c.today); account(d, e);
  benefits(d, e, ["zChor", "zOpiek", "zMac", "zRehab"]);
  if (on(d, "zMac")) {
    if (!isValidDate(d.wniosekMacData)) e.wniosekMacData = "Podaj datę złożenia wniosku o zasiłek macierzyński.";
    if (!has(d, "dzieci")) e.dzieci = "Podaj dane dziecka/dzieci.";
  }
  if (has(d, "stawka") && !/^(100|81[,.]5|70)\s?%?$/.test(d.stawka.trim())) e.stawka = "Stawka zasiłku macierzyńskiego: 100%, 81,5% albo 70%.";
  yes(d, e, "ubChor"); yes(d, e, "ubWyp");
  if (d.ubChor === "NIE" && on(d, "zChor")) e.ubChor = "Bez ubezpieczenia chorobowego zasiłek chorobowy nie przysługuje.";
  const tyt = Array.from({ length: 11 }, (_, i) => `tytul${i + 1}`).filter((k) => on(d, k));
  if (tyt.length !== 1) e.tytul1 = "Zaznacz jeden tytuł ubezpieczenia (pkt 1–11).";
  openPeriod(d, e, "podlChor");
  if (d.ubWyp === "TAK") openPeriod(d, e, "podlWyp");
  if (!d.ustal) e.ustal = "Zaznacz TAK albo NIE.";
  else if (d.ustal === "TAK" && !isValidDate(d.dataUstania)) e.dataUstania = "Podaj datę ustania tytułu ubezpieczenia.";
  causeChecks(d, e);
  yes(d, e, "wyn92", "wyn92Opis"); yes(d, e, "wypZas", "wypZasOpis"); yes(d, e, "uposaz", "uposazOpis");
  count(d, e);
  const rows = table(d, e, "tPrzych", ["rok", "miesiac", "dni", "dni", "kwota"], 12);
  if (!rows && !on(d, "kontynuacja")) e.tPrzych_0_0 = "Podaj przychód co najmniej za jeden miesiąc.";
  sign(d, e, c.today);
  return e;
}

export function validateZAS12(d: V, c: { today: string }): V {
  const e: V = {};
  payer(d, e); payerAddress(d, e); insuredPerson(d, e, c.today); account(d, e);
  benefits(d, e, ["zChor", "zOpiek"]);
  if (!d.trwa) e.trwa = "Zaznacz TAK albo NIE.";
  if (d.trwa === "NIE" && !isValidDate(d.ustal)) e.ustal = "Podaj datę ustania zatrudnienia / tytułu ubezpieczenia.";
  if (d.trwa === "TAK" && has(d, "ustal")) e.ustal = "Zatrudnienie trwa nadal – nie podawaj daty ustania (pkt 2).";
  if (has(d, "ustalChor") && !isValidDate(d.ustalChor)) e.ustalChor = "Podaj poprawną datę.";
  if (has(d, "ustalChor") && d.trwa === "NIE") e.ustalChor = "Pkt 3 dotyczy sytuacji, gdy tytuł ubezpieczenia trwa nadal.";
  sign(d, e, c.today);
  return e;
}

export function summaryPayer(code: string, d: V) {
  const fmt = (x?: string) => (isValidDate(x) ? x.split("-").reverse().join(".") : "—");
  const names: Record<string, string> = { zChor: "zasiłek chorobowy", zOpiek: "zasiłek opiekuńczy", zMac: "zasiłek macierzyński", zWysMac: "zasiłek w wysokości zasiłku macierzyńskiego", zWyr: "zasiłek wyrównawczy", zRehab: "świadczenie rehabilitacyjne" };
  const list = Object.keys(names).filter((k) => on(d, k)).map((k) => `${names[k]}: ${fmt(d[`ok_${k}_od`])} – ${fmt(d[`ok_${k}_do`])}`);
  return `${code} – zaświadczenie płatnika składek: ${list.join("; ") || "—"}.`;
}
