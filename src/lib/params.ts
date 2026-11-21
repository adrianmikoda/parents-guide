/**
 * Parametry prawne narzędzia. Wszystkie wartości można zmienić w panelu
 * administracyjnym (/admin) bez zmiany kodu – np. po nowelizacji ustawy.
 * Domyślne wartości odpowiadają stanowi prawnemu z materiałów wyzwania (2026 r.).
 */
export type Params = {
  version: number;
  updatedAt: string;
  updatedBy: string;
  stawki: {
    macierzynski: number; // % podstawy – urlop macierzyński
    naWarunkachMacierzynskiego: number;
    uzupelniajacy: number;
    ojcowski: number;
    rodzicielski: number;
    jednolity: number; // wniosek do 21 dni po porodzie
    chorobowyCiaza: number; // kod B
    chorobowyStandard: number;
    rehabilitacyjneCiaza: number;
    rehabilitacyjne90dni: number;
    rehabilitacyjnePozniej: number;
    wysokoscMacierzynskiegoPoUtracie: number;
  };
  wymiary: {
    macierzynski: number[]; // tygodnie wg liczby dzieci: [1,2,3,4,5+]
    naWarunkachMacierzynskiego: number[];
    rodzicielskiJedno: number;
    rodzicielskiWiele: number;
    rodzicielskiZaZyciemJedno: number;
    rodzicielskiZaZyciemWiele: number;
    nieprzenoszalnaCzescTygodnie: number;
    maksCzesciRodzicielskiego: number;
    rodzicielskiDoKoncaRokuWiekuDziecka: number;
    macierzynskiObowiazkowoMatkaTygodnie: number;
    przedPorodemMaxTygodnie: number;
    martweUrodzenieTygodnie: number;
    minDniPoZgonieDziecka: number;
    ojcowskiDni: number;
    ojcowskiMinCzesciDni: number;
    ojcowskiDoMiesiacaZycia: number;
    uzupelniajacyPonizej28TygLub1000g: number;
    uzupelniajacy28do36Tyg: number;
    uzupelniajacyOd37Tyg: number;
    uzupelniajacyMinDniHospitalizacjiOd37: number;
    adopcjaMaxWiekDziecka: number;
    zastepczaMaxWiekDziecka: number;
    zastepczaMaxWiekOdroczenie: number;
    maxUlamekPracyPrzyRodzicielskim: number;
  };
  chorobowy: {
    okresWyczekiwaniaObowiazkowe: number;
    okresWyczekiwaniaDobrowolne: number;
    okresZasilkowyCiaza: number;
    okresZasilkowy: number;
    wynagrodzenieChorobowe: number;
    wynagrodzenieChorobowe50plus: number;
    rehabilitacyjneMaxMiesiace: number;
    terminZlozeniaMiesiace: number;
  };
  kwoty: {
    skladkiPracownikaProcent: number; // 13,71%
    zaliczkaPitProcent: number;
    minimalneWynagrodzenie: number;
    swiadczenieRodzicielskie: number; // minimalna kwota zasiłku za urlop rodzicielski
    progPlatnikaUbezpieczonych: number; // >20 → płatnik wypłaca zasiłki
  };
  terminy: {
    jednolityWniosekDni: number;
    wniosekRodzicielskiDniPrzed: number;
    wniosekOjcowskiDniPrzed: number;
    wniosekMacierzynskiPoPorodzieDni: number;
  };
};

export const DEFAULT_PARAMS: Params = {
  version: 1,
  updatedAt: "2026-11-01T00:00:00.000Z",
  updatedBy: "system",
  stawki: {
    macierzynski: 100,
    naWarunkachMacierzynskiego: 100,
    uzupelniajacy: 100,
    ojcowski: 100,
    rodzicielski: 70,
    jednolity: 81.5,
    chorobowyCiaza: 100,
    chorobowyStandard: 80,
    rehabilitacyjneCiaza: 100,
    rehabilitacyjne90dni: 90,
    rehabilitacyjnePozniej: 75,
    wysokoscMacierzynskiegoPoUtracie: 100,
  },
  wymiary: {
    macierzynski: [20, 31, 33, 35, 37],
    naWarunkachMacierzynskiego: [20, 31, 33, 35, 37],
    rodzicielskiJedno: 41,
    rodzicielskiWiele: 43,
    rodzicielskiZaZyciemJedno: 65,
    rodzicielskiZaZyciemWiele: 67,
    nieprzenoszalnaCzescTygodnie: 9,
    maksCzesciRodzicielskiego: 5,
    rodzicielskiDoKoncaRokuWiekuDziecka: 6,
    macierzynskiObowiazkowoMatkaTygodnie: 14,
    przedPorodemMaxTygodnie: 6,
    martweUrodzenieTygodnie: 8,
    minDniPoZgonieDziecka: 7,
    ojcowskiDni: 14,
    ojcowskiMinCzesciDni: 7,
    ojcowskiDoMiesiacaZycia: 12,
    uzupelniajacyPonizej28TygLub1000g: 15,
    uzupelniajacy28do36Tyg: 8,
    uzupelniajacyOd37Tyg: 3,
    uzupelniajacyMinDniHospitalizacjiOd37: 14,
    adopcjaMaxWiekDziecka: 14,
    zastepczaMaxWiekDziecka: 7,
    zastepczaMaxWiekOdroczenie: 10,
    maxUlamekPracyPrzyRodzicielskim: 0.5,
  },
  chorobowy: {
    okresWyczekiwaniaObowiazkowe: 30,
    okresWyczekiwaniaDobrowolne: 90,
    okresZasilkowyCiaza: 270,
    okresZasilkowy: 182,
    wynagrodzenieChorobowe: 33,
    wynagrodzenieChorobowe50plus: 14,
    rehabilitacyjneMaxMiesiace: 12,
    terminZlozeniaMiesiace: 6,
  },
  kwoty: {
    skladkiPracownikaProcent: 13.71,
    zaliczkaPitProcent: 12,
    minimalneWynagrodzenie: 4806,
    swiadczenieRodzicielskie: 1000,
    progPlatnikaUbezpieczonych: 20,
  },
  terminy: {
    jednolityWniosekDni: 21,
    wniosekRodzicielskiDniPrzed: 21,
    wniosekOjcowskiDniPrzed: 7,
    wniosekMacierzynskiPoPorodzieDni: 21,
  },
};

/** Opisy pól do panelu administracyjnego. */
export const PARAM_LABELS: Record<string, string> = {
  "stawki.macierzynski": "Zasiłek za urlop macierzyński (%)",
  "stawki.naWarunkachMacierzynskiego": "Zasiłek za urlop na warunkach macierzyńskiego (%)",
  "stawki.uzupelniajacy": "Zasiłek za uzupełniający urlop macierzyński (%)",
  "stawki.ojcowski": "Zasiłek za urlop ojcowski (%)",
  "stawki.rodzicielski": "Zasiłek za urlop rodzicielski (%)",
  "stawki.jednolity": "Stawka jednolita – wniosek do 21 dni po porodzie (%)",
  "stawki.chorobowyCiaza": "Zasiłek chorobowy w ciąży – kod B (%)",
  "stawki.chorobowyStandard": "Zasiłek chorobowy – standardowo (%)",
  "stawki.rehabilitacyjneCiaza": "Świadczenie rehabilitacyjne w ciąży (%)",
  "stawki.rehabilitacyjne90dni": "Świadczenie rehabilitacyjne – pierwsze 90 dni (%)",
  "stawki.rehabilitacyjnePozniej": "Świadczenie rehabilitacyjne – po 90 dniach (%)",
  "stawki.wysokoscMacierzynskiegoPoUtracie": "Zasiłek w wysokości zasiłku macierzyńskiego (%)",
  "wymiary.macierzynski": "Urlop macierzyński (tyg.) wg liczby dzieci: 1,2,3,4,5+",
  "wymiary.naWarunkachMacierzynskiego": "Urlop na warunkach macierzyńskiego (tyg.) wg liczby dzieci",
  "wymiary.rodzicielskiJedno": "Urlop rodzicielski – jedno dziecko (tyg.)",
  "wymiary.rodzicielskiWiele": "Urlop rodzicielski – ciąża mnoga (tyg.)",
  "wymiary.rodzicielskiZaZyciemJedno": "Urlop rodzicielski „Za życiem” – jedno dziecko (tyg.)",
  "wymiary.rodzicielskiZaZyciemWiele": "Urlop rodzicielski „Za życiem” – ciąża mnoga (tyg.)",
  "wymiary.nieprzenoszalnaCzescTygodnie": "Nieprzenoszalna część rodzicielskiego dla każdego rodzica (tyg.)",
  "wymiary.maksCzesciRodzicielskiego": "Maksymalna liczba części urlopu rodzicielskiego",
  "wymiary.rodzicielskiDoKoncaRokuWiekuDziecka": "Rodzicielski do końca roku, w którym dziecko kończy (lat)",
  "wymiary.macierzynskiObowiazkowoMatkaTygodnie": "Część macierzyńskiego wykorzystywana obowiązkowo przez matkę (tyg.)",
  "wymiary.przedPorodemMaxTygodnie": "Maks. część macierzyńskiego przed porodem (tyg.)",
  "wymiary.martweUrodzenieTygodnie": "Urlop po martwym urodzeniu / zgonie do 8 tyg. życia (tyg.)",
  "wymiary.minDniPoZgonieDziecka": "Min. okres po zgonie dziecka (dni)",
  "wymiary.ojcowskiDni": "Urlop ojcowski (dni)",
  "wymiary.ojcowskiMinCzesciDni": "Minimalna część urlopu ojcowskiego (dni)",
  "wymiary.ojcowskiDoMiesiacaZycia": "Urlop ojcowski do ukończenia przez dziecko (mies.)",
  "wymiary.uzupelniajacyPonizej28TygLub1000g": "Uzupełniający – poród przed 28 tyg. lub ≤1000 g (maks. tyg.)",
  "wymiary.uzupelniajacy28do36Tyg": "Uzupełniający – poród 28–36 tyg. (maks. tyg.)",
  "wymiary.uzupelniajacyOd37Tyg": "Uzupełniający – poród od 37 tyg. z hospitalizacją (maks. tyg.)",
  "wymiary.uzupelniajacyMinDniHospitalizacjiOd37": "Uzupełniający od 37 tyg. – min. dni hospitalizacji",
  "wymiary.adopcjaMaxWiekDziecka": "Przysposobienie – maks. wiek dziecka (lat)",
  "wymiary.zastepczaMaxWiekDziecka": "Rodzina zastępcza – maks. wiek dziecka (lat)",
  "wymiary.zastepczaMaxWiekOdroczenie": "Rodzina zastępcza – maks. wiek przy odroczeniu obowiązku szkolnego",
  "wymiary.maxUlamekPracyPrzyRodzicielskim": "Maks. wymiar pracy łączonej z rodzicielskim (ułamek etatu)",
  "chorobowy.okresWyczekiwaniaObowiazkowe": "Okres wyczekiwania – ubezpieczenie obowiązkowe (dni)",
  "chorobowy.okresWyczekiwaniaDobrowolne": "Okres wyczekiwania – ubezpieczenie dobrowolne (dni)",
  "chorobowy.okresZasilkowyCiaza": "Okres zasiłkowy w ciąży (dni)",
  "chorobowy.okresZasilkowy": "Okres zasiłkowy standardowy (dni)",
  "chorobowy.wynagrodzenieChorobowe": "Wynagrodzenie chorobowe od pracodawcy (dni w roku)",
  "chorobowy.wynagrodzenieChorobowe50plus": "Wynagrodzenie chorobowe po 50. r.ż. (dni w roku)",
  "chorobowy.rehabilitacyjneMaxMiesiace": "Świadczenie rehabilitacyjne – maks. (mies.)",
  "chorobowy.terminZlozeniaMiesiace": "Termin na złożenie dokumentów o zasiłek (mies.)",
  "kwoty.skladkiPracownikaProcent": "Potrącenie składek społecznych z podstawy (%)",
  "kwoty.zaliczkaPitProcent": "Zaliczka na PIT od zasiłku (%)",
  "kwoty.minimalneWynagrodzenie": "Minimalne wynagrodzenie (zł)",
  "kwoty.swiadczenieRodzicielskie": "Minimalny zasiłek za urlop rodzicielski = świadczenie rodzicielskie (zł/mies.)",
  "kwoty.progPlatnikaUbezpieczonych": "Płatnik wypłaca zasiłki, gdy zgłasza więcej niż (osób)",
  "terminy.jednolityWniosekDni": "Wniosek o stawkę jednolitą – dni od porodu",
  "terminy.wniosekRodzicielskiDniPrzed": "Wniosek o urlop rodzicielski – dni przed rozpoczęciem",
  "terminy.wniosekOjcowskiDniPrzed": "Wniosek o urlop ojcowski – dni przed rozpoczęciem",
  "terminy.wniosekMacierzynskiPoPorodzieDni": "Wniosek o rodzicielski bezpośrednio po macierzyńskim – dni od porodu",
};
