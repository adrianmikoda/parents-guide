export type Org = { nazwa: string; opis: string; obszary: string[]; www: string; telefon?: string };

/** Organizacje o charakterze charytatywnym/pożytku publicznego. Lista do weryfikacji i rozbudowy w panelu admina. */
export const ORGS: Org[] = [
  { nazwa: "Fundacja Rodzić po Ludzku", opis: "Informacja i wsparcie dla rodziców, także po stracie dziecka i poronieniu; prawa pacjenta w opiece okołoporodowej.", obszary: ["poronienie", "strata", "poród"], www: "https://rodzicpoludzku.pl" },
  { nazwa: "Fundacja „Wcześniak – Rodzice – Rodzicom”", opis: "Wsparcie rodziców wcześniaków: poradniki, grupy wsparcia, pomoc po wypisie ze szpitala.", obszary: ["wcześniak"], www: "https://wczesniak.pl" },
  { nazwa: "Fundacja Koliber", opis: "Pomoc rodzinom wcześniaków i dzieci chorych w szpitalach, wyposażenie oddziałów neonatologicznych.", obszary: ["wcześniak", "choroba dziecka"], www: "https://fundacjakoliber.org" },
  { nazwa: "Fundacja Gajusz – Hospicjum Perinatalne", opis: "Opieka perinatalna i paliatywna dla rodzin z diagnozą nieuleczalnej choroby dziecka w okresie prenatalnym.", obszary: ["choroba dziecka", "za życiem", "strata"], www: "https://gajusz.org.pl" },
  { nazwa: "Warszawskie Hospicjum dla Dzieci", opis: "Hospicjum perinatalne i domowe, wsparcie psychologiczne dla rodzin w żałobie.", obszary: ["choroba dziecka", "za życiem", "strata"], www: "https://hospicjum.waw.pl" },
  { nazwa: "Fundacja Hospicyjna", opis: "Wsparcie w żałobie, telefon zaufania dla osób w żałobie, programy dla dzieci i dorosłych.", obszary: ["strata"], www: "https://hospicja.pl" },
  { nazwa: "Fundacja Dzieciom „Zdążyć z Pomocą”", opis: "Subkonta i pomoc finansowa dla dzieci chorych i z niepełnosprawnościami.", obszary: ["choroba dziecka", "za życiem", "wcześniak"], www: "https://www.dzieciom.pl" },
];

export const LINKS = [
  { nazwa: "ZUS – zasiłek macierzyński", url: "https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski", opis: "Zasady, wnioski, kalkulatory ZUS" },
  { nazwa: "ZUS – wzory formularzy (zasiłki)", url: "https://www.zus.pl/baza-wiedzy/wzory-formularzy/zasilki", opis: "ZAM, ZAS-53, Z-3, Z-3a" },
  { nazwa: "PUE/eZUS", url: "https://www.zus.pl/portal/logowanie.npi", opis: "Platforma Usług Elektronicznych" },
  { nazwa: "MRPiPS – urlop rodzicielski", url: "https://www.gov.pl/web/rodzina/urlop-rodzicielski", opis: "Informacje Ministerstwa Rodziny, Pracy i Polityki Społecznej" },
  { nazwa: "PIP – rodzicielstwo", url: "https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo", opis: "Porady prawne Państwowej Inspekcji Pracy" },
  { nazwa: "Rejestr stanu cywilnego – odpis aktu", url: "https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego", opis: "Odpis zupełny lub skrócony aktu urodzenia" },
];
