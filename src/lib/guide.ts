/**
 * Pomocnik nawigacji: rejestr miejsc w aplikacji, które można wskazać użytkownikowi.
 * Każdy cel to element z atrybutem data-guide="<id>" na stronie `page`.
 * page "*" = element dostępny na każdej stronie (np. przyciski dostępności w nagłówku);
 * gdy nie jest widoczny (telefon), pomocnik przechodzi do `fallbackPage`.
 */
export type GuideTarget = { id: string; page: string; label: string; hint: string; keywords: string[]; fallbackPage?: string };

export const PAGES: Record<string, string> = {
  "/pulpit": "Panel ogólny",
  "/kalkulator": "Kalkulator",
  "/ciaza": "W ciąży",
  "/wnioski": "Wnioski i dokumenty",
  "/zus": "Moje dane ZUS",
  "/profil": "Mój profil",
  "/sprawy": "Sprawy testowe",
  "/ryzyka": "Ryzyka",
  "/wsparcie": "Wsparcie",
  "/asystent": "Asystent",
  "/admin": "Panel administracyjny",
  "/wiecej": "Więcej",
  "/": "Logowanie",
};

const W = (key: string, label: string, kw: string[]): GuideTarget => ({
  id: `wniosek-${key}`, page: "/wnioski", label: `Wniosek: ${label}`, hint: `Otwiera formularz „${label}” z podglądem i wysyłką.`, keywords: kw,
});

export const TARGETS: GuideTarget[] = [
  // całe strony
  { id: "page:/pulpit", page: "/pulpit", label: "Panel ogólny", hint: "Najbliższe kroki, ryzyka i kafelki usług.", keywords: ["pulpit", "start", "glowna", "panel"] },
  { id: "page:/ryzyka", page: "/ryzyka", label: "Ryzyka i zagrożenia", hint: "Co może obniżyć lub odebrać zasiłek.", keywords: ["ryzyk", "zagroz", "pozorn", "strac zasilek", "odmow"] },
  { id: "page:/wsparcie", page: "/wsparcie", label: "Wsparcie i fundacje", hint: "Organizacje pomocowe i oficjalne źródła.", keywords: ["wsparc", "fundacj", "pomoc", "strata", "poronien", "hospicj", "zrodl", "mrpips", "pip"] },
  { id: "asystent-czlowiek", page: "/asystent", label: "Połącz z człowiekiem", hint: "Przekazanie rozmowy konsultantowi ZUS, telefon lub wiadomość.", keywords: ["czlowiek", "konsultant", "porozmawiac z", "zadzwon", "telefon", "infolini", "kontakt z zus", "zywa osoba"] },
  { id: "page:/asystent", page: "/asystent", label: "Asystent", hint: "Pytania o przepisy i zasiłki.", keywords: ["asystent", "pytanie o przepis"] },
  { id: "page:/wnioski", page: "/wnioski", label: "Wnioski i dokumenty", hint: "Lista dokumentów i terminów, formularze wniosków.", keywords: ["wnioski", "formularz"] },
  { id: "page:/zus", page: "/zus", label: "Moje dane ZUS", hint: "Ubezpieczenie, e-ZLA, należności do uregulowania, pytania do ZUS.", keywords: ["moje dane", "dane zus"] },
  { id: "guide-fab", page: "*", label: "Pomocnik „Gdzie kliknąć?”", hint: "Zapytaj, a pomocnik zakreśli miejsce na ekranie.", keywords: ["pomocnik"] },
  { id: "konto-uzupelnij", page: "/pulpit", label: "Uzupełnij brakujące dane", hint: "Ankieta z brakującymi informacjami (konto bez danych z ZUS).", keywords: ["uzupelnij dane", "brakujace dane", "ankiet"] },
  { id: "page:/profil", page: "/profil", label: "Mój profil", hint: "Twoje dane: sytuacja rodzinna, praca, poprawki danych z ZUS.", keywords: ["profil", "moje dane osobowe"] },
  { id: "profil-zrodlo", page: "/profil", label: "Poprawianie danych w profilu", hint: "Nadpisz dane pobrane z ZUS albo popraw dane z ankiety; każde pole z ZUS przywrócisz jednym kliknięciem.", keywords: ["nadpis", "popraw dane", "zmien dane", "bledne dane", "dane z zus sa", "nieaktualne", "przywroc dane"] },
  { id: "profil-sytuacja", page: "/profil", label: "Sytuacja rodzinna w profilu", hint: "Ciąża, urodzone dziecko, adopcja albo rodzina zastępcza – z datami.", keywords: ["sytuacja rodzinna", "moja sytuacja", "jestem rodzina zastepcza", "adoptujemy", "adoptowac", "przyjelismy dziecko", "data przyjecia"] },
  { id: "profil-termin", page: "/profil", label: "Planowana data porodu", hint: "Zmień termin porodu – przeliczą się urlopy i terminy wniosków.", keywords: ["data porodu", "termin porodu", "planowana data", "przewidywana data", "zmienil sie termin"] },
  { id: "profil-ustanie", page: "/profil", label: "Ustanie stosunku pracy", hint: "Data i przyczyna zakończenia pracy lub umowy (np. upadłość, likwidacja).", keywords: ["ustanie", "ustal stosunek", "rozwiazanie umowy", "koniec umowy", "konczy mi sie umowa", "stracilam prace", "stracilem prace", "upadlosc", "likwidac", "zwolnili mnie"] },
  { id: "zus-tab-zaswiadczenia", page: "/zus", label: "Zaświadczenia", hint: "Wniosek o zaświadczenie z ZUS lub prośba do pracodawcy (np. Z-3).", keywords: ["zaswiadcz", "wystapic o", "potrzebuje potwierdzenia", "niezaleganiu", "okresach ubezpieczenia"] },
  { id: "kalk-udostepnij", page: "/kalkulator", label: "Udostępnij wyliczenie", hint: "Wyślij podsumowanie zasiłków partnerowi lub pracodawcy – telefonem, e-mailem albo skopiuj.", keywords: ["udostepn", "wyslij partnerowi", "podziel sie", "wyslij mailem", "pokazac pracodawcy", "przeslac"] },
  { id: "page:/ciaza", page: "/ciaza", label: "Świadczenia w ciąży", hint: "Zasiłek chorobowy w ciąży, świadczenie rehabilitacyjne, utrata pracy.", keywords: ["ciaz", "l4", "zwolnien", "chorobow", "rehabilit", "kod b"] },

  // kalkulator
  { id: "kalk-zus", page: "/kalkulator", label: "Pobierz dane z ZUS", hint: "Wypełnia kalkulator danymi z Twojego konta.", keywords: ["pobierz dane", "dane z zus", "uzupelnij automatycz", "wczytaj dane"] },
  { id: "kalk-sprawa", page: "/kalkulator", label: "Wczytaj sprawę testową", hint: "Przykładowe sprawy do sprawdzenia kalkulatora.", keywords: ["sprawa testow", "przyklad"] },
  { id: "kalk-sytuacja", page: "/kalkulator", label: "Sytuacja: urodzenie, przysposobienie, rodzina zastępcza", hint: "Wybór rodzaju zdarzenia.", keywords: ["adopc", "przysposob", "zastepcz", "rodzaj sytuacj"] },
  { id: "kalk-strata", page: "/kalkulator", label: "Sytuacja szczególna (martwe urodzenie, zgon dziecka)", hint: "Wylicza zasiłek po stracie dziecka.", keywords: ["martwe", "zgon", "smierc"] },
  { id: "kalk-podzial", page: "/kalkulator", label: "Gotowe warianty podziału urlopu", hint: "Większość dla matki, po równo, maksymalnie dla ojca.", keywords: ["podzial", "podziel", "po rowno", "dla taty", "dla ojca", "wariant", "partner", "oboje"] },
  { id: "kalk-praca", page: "/kalkulator", label: "Praca w trakcie urlopu rodzicielskiego", hint: "Łączenie urlopu z pracą (¼, ⅓, ½ etatu).", keywords: ["praca w trakcie", "pol etatu", "czesc etatu", "laczenie", "polaczyc", "wrocic do pracy", "praca na rodzicielskim"] },
  { id: "kalk-ojcowski", page: "/kalkulator", label: "Początek urlopu ojcowskiego", hint: "Kiedy tata bierze 2 tygodnie urlopu ojcowskiego.", keywords: ["ojcowsk", "tata", "ojciec"] },
  { id: "kalk-tryb", page: "/kalkulator", label: "Rodzicielski: jednocześnie czy kolejno", hint: "Czy rodzice korzystają naraz, czy po sobie.", keywords: ["jednoczesnie", "kolejno", "naprzemien", "razem"] },
  { id: "kalk-zapisz", page: "/kalkulator", label: "Zapisz plan", hint: "Zapisuje wyliczony plan urlopów.", keywords: ["zapisz", "zachowaj plan"] },
  { id: "kalk-drukuj", page: "/kalkulator", label: "Drukuj plan", hint: "Wydruk lub PDF planu.", keywords: ["drukuj plan", "pdf planu", "wydruk planu"] },
  { id: "kalk-wnioski", page: "/kalkulator", label: "Przejdź do wniosków", hint: "Po wyliczeniu – jakie dokumenty złożyć.", keywords: [] },
  { id: "page:/kalkulator", page: "/kalkulator", label: "Kalkulator zasiłku", hint: "Ile i jak długo dostaniecie zasiłek, plan urlopów obojga rodziców.", keywords: ["kalkulator", "ile dostane", "ile wynosi", "wysokosc", "policz", "oblicz", "81,5", "macierzynsk", "rodzicielsk", "kwota"] },

  // wnioski
  W("urlop_macierzynski", "urlop macierzyński", ["wniosek o urlop macierzyn", "urlop macierzyn"]),
  W("urlop_rodzicielski", "urlop rodzicielski", ["wniosek o urlop rodzicielsk", "urlop rodzicielsk"]),
  W("urlop_ojcowski", "urlop ojcowski", ["wniosek o urlop ojcowsk", "urlop ojcowsk"]),
  W("urlop_uzupelniajacy", "uzupełniający urlop macierzyński", ["uzupelniajac", "wczesniak", "hospitalizac"]),
  W("praca_rodzicielski", "łączenie urlopu rodzicielskiego z pracą", ["wniosek o laczenie", "wniosek o prace"]),
  W("ZAM", "ZAM", ["zam", "zasilek macierzynski wniosek", "wniosek o zasilek"]),
  W("ZAS-53", "ZAS-53", ["zas-53", "zas 53", "zas53", "dzialalnosc", "jdg", "przedsiebior", "zlecen"]),
  W("odpis_aktu", "odpis aktu urodzenia", ["odpis", "akt urodzenia", "usc"]),
  { id: "wnioski-wyslij", page: "/wnioski", label: "Wyślij wniosek", hint: "Wysyła wniosek i pokazuje UPO (symulacja).", keywords: ["wyslij", "zloz wniosek", "upo", "wyslac"] },
  { id: "wnioski-drukuj", page: "/wnioski", label: "Drukuj wniosek", hint: "Wydruk wypełnionego wniosku.", keywords: ["drukuj wniosek", "wydrukowac wniosek"] },
  { id: "wnioski-lista", page: "/wnioski", label: "Lista dokumentów i terminów", hint: "Jakie dokumenty, gdzie (płatnik czy ZUS) i do kiedy.", keywords: ["jakie dokumenty", "termin", "gdzie zlozyc", "platnik", "do kiedy", "checklist"] },

  // dane ZUS
  { id: "zus-tab-dane", page: "/zus", label: "Ubezpieczenie (dane z ZUS)", hint: "Okresy ubezpieczenia i podstawy wymiaru.", keywords: ["ubezpieczen", "podstaw", "okresy", "skladk"] },
  { id: "zus-tab-ezla", page: "/zus", label: "e-ZLA", hint: "Zwolnienia lekarskie.", keywords: ["e-zla", "ezla", "zwolnienia lekarskie"] },
  { id: "zus-tab-dlug", page: "/zus", label: "Do uregulowania", hint: "Zaświadczenie o stanie rozliczeń na dany dzień.", keywords: ["zadluz", "dlug", "zaleg", "rozliczen", "uregul", "naleznos"] },
  { id: "zus-tab-pytanie", page: "/zus", label: "Zadaj pytanie ZUS", hint: "Wiadomość do ZUS (symulacja e-wizyty).", keywords: ["zapytaj zus", "pytanie do zus", "e-wizyt", "kontakt z zus", "napisz do zus"] },
  { id: "zus-pue", page: "/zus", label: "Otwórz PUE/eZUS", hint: "Prawdziwy portal ZUS w nowej karcie.", keywords: ["pue", "ezus", "portal zus"] },

  // sprawy
  { id: "sprawy-upload", page: "/sprawy", label: "Wgraj dokument PDF", hint: "Odczyt danych z wniosku lub zaświadczenia.", keywords: ["wgraj", "pdf", "upload", "dokument", "skan", "z-3"] },
  { id: "sprawy-kategorie", page: "/sprawy", label: "Kategorie spraw testowych", hint: "Filtrowanie przykładowych spraw.", keywords: ["sprawy testowe", "kategori"] },

  // ciąża
  { id: "ciaza-zus", page: "/ciaza", label: "Uzupełnij danymi z ZUS", hint: "Wczytuje Twoje dane do sprawdzenia świadczeń w ciąży.", keywords: [] },

  // admin
  { id: "admin-zapisz", page: "/admin", label: "Zapisz parametry", hint: "Zapis zmian parametrów prawnych.", keywords: ["parametr", "admin", "stawk", "zmien kwote"] },

  // wygląd i dostępność
  { id: "lang", page: "*", fallbackPage: "/wiecej", label: "Język: EN / PL", hint: "Przełącza język strony (angielski albo polski).", keywords: ["jezyk", "po polsku", "po angielsku", "polski", "angielski"] },
  { id: "a11y-theme", page: "*", fallbackPage: "/wiecej", label: "Motyw jasny / ciemny", hint: "Przełącza tryb ciemny.", keywords: ["ciemn", "motyw", "dark", "jasn", "tryb nocny"] },
  { id: "a11y-contrast", page: "*", fallbackPage: "/wiecej", label: "Wysoki kontrast", hint: "Czerń na bieli lub żółć na czerni.", keywords: ["kontrast", "slabo widze", "niedowid"] },
  { id: "a11y-text", page: "*", fallbackPage: "/wiecej", label: "Powiększ tekst", hint: "Trzy rozmiary tekstu.", keywords: ["powieksz", "wieksze litery", "czcionk", "rozmiar tekstu", "maly tekst"] },
  { id: "login", page: "/", label: "Logowanie przez mObywatel", hint: "Konta testowe (symulacja).", keywords: ["zalog", "logowan", "mobywatel", "konto"] },
];

/** Słowa kluczowe dla pytań po angielsku (tryb bez AI, wersja EN). */
const EN_KEYWORDS: Record<string, string[]> = {
  "page:/pulpit": ["dashboard", "home", "overview", "start page"],
  "page:/ryzyka": ["risk", "threat", "sham", "lose benefit", "refus"],
  "page:/wsparcie": ["support", "foundation", "charity", "help organi", "loss", "miscarriage", "hospice", "official source"],
  "asystent-czlowiek": ["human", "person", "consultant", "talk to", "call", "phone", "hotline", "contact zus"],
  "page:/asystent": ["assistant", "question about the rules", "chat"],
  "page:/wnioski": ["applications", "forms", "documents"],
  "page:/zus": ["my zus data", "zus data", "my data"],
  "guide-fab": ["helper", "where do i click"],
  "konto-uzupelnij": ["complete my data", "missing data", "survey"],
  "page:/profil": ["profile", "personal data"],
  "profil-zrodlo": ["override", "correct data", "change data", "wrong data", "outdated", "restore data", "fix my data"],
  "profil-sytuacja": ["family situation", "my situation", "foster", "adopting", "we took in"],
  "profil-termin": ["due date", "date of birth", "planned date", "expected date", "date changed"],
  "profil-ustanie": ["end of employment", "contract ends", "lost my job", "fired", "dismissed", "bankrupt", "liquidat", "terminated"],
  "zus-tab-zaswiadczenia": ["certificate", "confirmation", "no arrears", "insurance periods"],
  "kalk-udostepnij": ["share", "send to partner", "send by email", "show my employer"],
  "page:/ciaza": ["pregnan", "sick leave", "sick note", "sickness", "rehabilitation", "code b"],
  "kalk-zus": ["fetch data", "data from zus", "fill in automatic", "load data", "import data"],
  "kalk-sprawa": ["test case", "example", "sample case"],
  "kalk-sytuacja": ["adopt", "foster", "type of situation"],
  "kalk-strata": ["stillbirth", "death", "died", "lost the baby"],
  "kalk-podzial": ["split", "share the leave", "equally", "for dad", "for the father", "option", "partner", "both parents"],
  "kalk-praca": ["work during", "half-time", "half time", "part-time", "part time", "combine", "return to work", "back to work", "work on parental"],
  "kalk-ojcowski": ["paternity", "dad", "father"],
  "kalk-tryb": ["at the same time", "one after the other", "alternate", "together"],
  "kalk-zapisz": ["save", "keep the plan"],
  "kalk-drukuj": ["print the plan", "pdf of the plan", "print plan"],
  "page:/kalkulator": ["calculator", "how much", "amount", "calculate", "81.5", "maternity", "parental", "benefit amount"],
  "wniosek-urlop_macierzynski": ["maternity leave application", "apply for maternity leave", "maternity leave"],
  "wniosek-urlop_rodzicielski": ["parental leave application", "apply for parental leave", "parental leave"],
  "wniosek-urlop_ojcowski": ["paternity leave application", "apply for paternity leave", "paternity leave"],
  "wniosek-urlop_uzupelniajacy": ["supplementary", "premature", "hospitalis", "hospitaliz"],
  "wniosek-praca_rodzicielski": ["combining application", "work application", "combine parental leave with work"],
  "wniosek-ZAM": ["maternity benefit application", "benefit application", "apply for the benefit"],
  "wniosek-ZAS-53": ["business", "self-employed", "sole trader", "contract of mandate", "freelanc"],
  "wniosek-odpis_aktu": ["birth certificate", "copy of the certificate", "civil registry"],
  "wnioski-wyslij": ["send", "submit the application", "submit"],
  "wnioski-drukuj": ["print the application", "print application"],
  "wnioski-lista": ["which documents", "deadline", "where to submit", "where do i submit", "payer", "by when", "checklist"],
  "zus-tab-dane": ["insurance", "benefit base", "periods", "contribution"],
  "zus-tab-ezla": ["e-zla", "ezla", "sick notes", "medical certificate"],
  "zus-tab-dlug": ["debt", "arrears", "amounts due", "owe", "settlement", "settle"],
  "zus-tab-pytanie": ["ask zus", "question to zus", "e-visit", "write to zus", "message zus"],
  "zus-pue": ["pue", "ezus", "zus portal"],
  "sprawy-upload": ["upload", "pdf", "document", "scan"],
  "sprawy-kategorie": ["test cases", "categor"],
  "admin-zapisz": ["parameter", "admin", "rates", "change amount"],
  "a11y-theme": ["dark", "theme", "light mode", "night mode", "dark mode"],
  "a11y-contrast": ["contrast", "poor eyesight", "visually impaired", "can't see well"],
  "a11y-text": ["enlarge", "bigger text", "larger text", "font", "text size", "small text", "zoom"],
  "lang": ["language", "polish", "english", "in polish", "in english"],
  "login": ["log in", "login", "sign in", "mobywatel", "account"],
};
for (const t of TARGETS) t.keywords.push(...(EN_KEYWORDS[t.id] ?? []));

export const TARGET_IDS = TARGETS.map((t) => t.id);
export const targetById = (id: string) => TARGETS.find((t) => t.id === id);

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");

/** Dopasowanie regułowe (bez AI): najlepiej punktowany cel; dłuższe frazy ważą więcej. */
export function matchGuide(question: string): { answer: string; steps: string[] } {
  const q = norm(question);
  let best: { t: GuideTarget; score: number } | null = null;
  for (const t of TARGETS) {
    let score = 0;
    for (const k of t.keywords) if (q.includes(norm(k))) score += 1 + k.length / 10;
    if (norm(t.label).length > 3 && q.includes(norm(t.label))) score += 3;
    if (score > 0 && (!best || score > best.score)) best = { t, score };
  }
  if (!best) return { answer: "Nie znalazłem takiej funkcji. Spróbuj np.: „gdzie złożyć wniosek o urlop ojcowski”, „jak włączyć tryb ciemny”, „gdzie sprawdzę należności do uregulowania”.", steps: [] };
  const t = best.t;
  const where = t.page === "*" ? "w nagłówku (na telefonie – w zakładce „Więcej”)" : `na stronie „${PAGES[t.page] ?? t.page}”`;
  return { answer: `**${t.label}** – ${t.hint} Znajdziesz to ${where}. Zaznaczam, gdzie kliknąć.`, steps: [t.id] };
}
