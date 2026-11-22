# Przewodnik Rodzica

**Zasiłkowy przewodnik przyszłego rodzica.** Aplikacja webowa (RWD) dla przyszłych rodziców, rodziców małych dzieci, rodziców adopcyjnych i rodzin zastępczych. Pokazuje uprawnienia z ubezpieczenia chorobowego dopasowane do sytuacji użytkownika, liczy zasiłki dla obojga rodziców, pomaga zaplanować urlopy i przeprowadza przez wnioski.

> [!IMPORTANT]
> **Projekt konkursowy HackNation – to nie jest serwis ZUS.**
> Logowanie do ZUS i przez mObywatel, dane z systemów ZUS (KSI/PUE), e-ZLA, zaświadczenie o należnościach do uregulowania i wysyłka wniosków są **symulowane** (makiety). Wszystkie osoby i dane są fikcyjne. Aplikacja nie łączy się z żadnym systemem ZUS ani z aplikacją mObywatel – nie wpisuj w niej prawdziwych danych.

---

## Spis treści

1. [Problem](#problem)
2. [Rozwiązanie](#rozwiązanie)
3. [Funkcje](#funkcje)
4. [Konta testowe](#konta-testowe)
5. [Szybki start](#szybki-start)
6. [Konfiguracja](#konfiguracja)
7. [Architektura](#architektura)
8. [REST API](#rest-api)
9. [Funkcje AI](#funkcje-ai)
10. [Przechowywanie danych](#przechowywanie-danych)
11. [Dostępność i wygląd](#dostępność-i-wygląd)
12. [Mapowanie na wymagania wyzwania](#mapowanie-na-wymagania-wyzwania)
13. [Zgodność formularzy z wzorami ZUS](#zgodność-formularzy-z-wzorami-zus)
14. [Założenia do weryfikacji z ZUS](#założenia-do-weryfikacji-z-zus)
15. [Droga do produkcji](#droga-do-produkcji)

---

## Problem

Przyszli rodzice, w tym rodzice adopcyjni i rodziny zastępcze, muszą sami odnaleźć się w rozproszonych i skomplikowanych przepisach o zasiłkach z ubezpieczenia chorobowego. Nie wiedzą, jakie świadczenia im przysługują w ciąży i po porodzie, ile wyniesie zasiłek, jak podzielić urlop między oboje rodziców ani jakie dokumenty i gdzie złożyć. Przez to często tracą pieniądze, przegapiają terminy albo nie zauważają ryzyk, np. nieopłaconych składek przy własnej działalności czy zakwestionowania podstawy wymiaru przez ZUS.

## Rozwiązanie

Po zalogowaniu przez mObywatel (symulacja) aplikacja pobiera dane z ZUS albo pozwala uzupełnić je w krótkiej ankiecie. Na tej podstawie pokazuje świadczenia dopasowane do sytuacji rodzica i liczy zasiłek macierzyński i rodzicielski dla obojga rodziców. Symuluje podział urlopu i łączenie go z pracą na część etatu, podpowiada, jakie dokumenty i w jakim terminie złożyć oraz czy do pracodawcy, czy do ZUS. Ostrzega też przed ryzykami, a AI odpowiada na pytania prostym językiem i odczytuje dokumenty w PDF.

---

## Funkcje

| Ekran | Ścieżka | Co robi |
|---|---|---|
| **Logowanie** | `/` | Przycisk „Zaloguj się do ZUS” otwiera makietę logowania: „Zaloguj z mObywatel” pokazuje kod QR z odliczaniem ważności i symulacją zeskanowania, a login i hasło są tylko makietą. Na stronie są też: „Załóż konto” (bez danych z ZUS), szybkie logowanie na konta testowe i tryb bez logowania. |
| **Załóż konto** | `/nowe-konto` | Ankieta krok po kroku (rola, etap rodzicielstwa, terminy, zatrudnienie). Pytania można pominąć i uzupełnić później. |
| **Panel ogólny** | `/pulpit` | Podsumowanie sytuacji, najbliższe terminy, skróty do usług. |
| **Kalkulator** | `/kalkulator` | Zasiłek macierzyński i rodzicielski dla obojga rodziców, w tym: liczba dzieci, „Za życiem”, wcześniak, martwe urodzenie / zgon dziecka, przejęcie urlopu, 9 tygodni nieprzenoszalnych, praca na ¼ / ⅓ / ½ etatu, porównanie 81,5% z 100% / 70%, adopcja i rodzina zastępcza. |
| **W ciąży** | `/ciaza` | Zasiłek chorobowy w ciąży, świadczenie rehabilitacyjne, zasiłek w wysokości zasiłku macierzyńskiego, a także sytuacje bez prawa do świadczeń. |
| **Wnioski i dokumenty** | `/wnioski` | Jakie dokumenty, gdzie (płatnik czy ZUS) i kiedy złożyć. Formularze ZUS odwzorowane 1:1 ze wzorów (ZAM, ZAS-53, Z-3, Z-3a, ZAS-12 – zob. [Zgodność formularzy](#zgodność-formularzy-z-wzorami-zus)), wnioski do pracodawcy zgodne z rozporządzeniem Dz.U. 2025 poz. 322 (§ 2–§ 20: urlopy macierzyński, rodzicielski, ojcowski, uzupełniający, na warunkach macierzyńskiego, sytuacje szczególne, praca na rodzicielskim, urlop wychowawczy) oraz odpis aktu urodzenia – z podglądem wydruku i symulowaną wysyłką (UPO). |
| **Moje dane ZUS** | `/zus` | Ubezpieczenie i podstawy wymiaru, podgląd e-ZLA, zaświadczenie o należnościach do uregulowania na wybrany dzień, zaświadczenia, pytanie do ZUS. |
| **Mój profil** | `/profil` | Podgląd i poprawianie danych. Przy danych z ZUS zmienione pola są oznaczone i można przywrócić wartość z ZUS. |
| **Sprawy testowe** | `/sprawy` | 12 wbudowanych spraw z oczekiwanym wynikiem oraz wgrywanie dokumentów PDF (Z-3, Z-3a, ZAM, ZAS-53, ZAS-12, poświadczenia, e-ZLA). |
| **Ryzyka** | `/ryzyka` | Ryzyka ogólne i wyliczone z danych osoby: pozorność zatrudnienia, podwyższenie podstawy w ciąży, ustanie ubezpieczenia, należności do uregulowania, brak kodu B. |
| **Wsparcie** | `/wsparcie` | Organizacje pomocowe z filtrowaniem według sytuacji oraz oficjalne źródła (ZUS, MRPiPS, PIP). |
| **Asystent** | `/asystent` | Pytania i odpowiedzi w prostym języku (AI albo odpowiedzi z reguł). |
| **Panel administracyjny** | `/admin` | Edycja parametrów prawnych (stawki, wymiary, terminy) z wersjonowaniem i historią zmian. Wymaga PIN-u. |
| **Więcej** | `/wiecej` | Ustawienia wyglądu i pozostałe skróty, przydatne zwłaszcza na telefonie. |

Na każdej stronie jest też **Pomocnik** (pływający przycisk). Po pytaniu „gdzie złożę wniosek o urlop ojcowski?” zakreśla na ekranie, gdzie kliknąć, i oferuje samouczek po pierwszym zalogowaniu.

---

## Konta testowe

Dostępne na stronie logowania (szybkie logowanie albo po symulacji zeskanowania kodu QR). Wszystkie osoby są fikcyjne.

| Osoba | Scenariusz |
|---|---|
| **Anna Kowalczyk** | Umowa o pracę w dużej firmie (>20 ubezpieczonych), więc zasiłki wypłaca pracodawca. Planuje podział urlopu z partnerem. |
| **Piotr Kowalczyk** | Ojciec. Pracodawca zgłasza ≤20 osób, więc zasiłek (ojcowski, rodzicielski) wypłaca ZUS. |
| **Magdalena Zawadzka** | Działalność od maja 2026 r., podstawa podniesiona w ciąży, składki do uregulowania. Dużo ryzyk. |
| **Katarzyna Lis** | Umowa zlecenia bez chorobowego, umowa kończy się przed porodem. Brak prawa do zasiłków. |
| **Ewa Nowicka** | Rodzic adopcyjny. Przyjęła 3-letnie dziecko, złożyła wniosek o przysposobienie. |

---

## Szybki start

Wymagania: **Node.js 20+** i npm.

```bash
npm install
npm run dev            # http://localhost:3000
```

Wersja produkcyjna:

```bash
npm run build
npm start
```

| Polecenie | Opis |
|---|---|
| `npm run dev` | serwer deweloperski (Turbopack) z przeładowaniem na żywo |
| `npm run build` | build produkcyjny |
| `npm start` | uruchomienie buildu produkcyjnego |
| `npx tsc --noEmit` | sprawdzenie typów TypeScript |

---

## Konfiguracja

Zmienne środowiskowe ustaw w pliku `.env.local` (wzór w `.env.example`) albo w ustawieniach hostingu.

| Zmienna | Domyślnie | Opis |
|---|---|---|
| `ADMIN_PIN` | `1234` | PIN do panelu `/admin` (sprawdzany przez serwer). **Zmień go przy publicznym wdrożeniu.** |
| `SESSION_SECRET` | wyprowadzony z `ADMIN_PIN` | Klucz podpisu ciasteczek sesji i kont. **Przy publicznym wdrożeniu ustaw długi, losowy ciąg znaków.** |
| `ANTHROPIC_API_KEY` | – | Włącza funkcje AI (asystent, pomocnik, odczyt skanów PDF). Bez klucza aplikacja działa w trybie regułowym. |
| `CLAUDE_MODEL` | `claude-sonnet-5-5` | Model AI. |

---

## Architektura

**Stos:** Next.js 15 (App Router, Turbopack), React 19, TypeScript, czysty CSS (bez frameworka UI), `unpdf` (tekst z PDF), `@anthropic-ai/sdk` (opcjonalne AI).

```
src/
├── app/
│   ├── page.tsx                logowanie (makieta ZUS / mObywatel + QR, konta testowe)
│   ├── nowe-konto/             ankieta zakładania konta bez danych z ZUS
│   ├── (app)/                  ekrany po zalogowaniu (wspólny layout z menu)
│   │   ├── pulpit/  kalkulator/  ciaza/  wnioski/  zus/  profil/
│   │   └── sprawy/  ryzyka/  wsparcie/  asystent/  admin/  wiecej/
│   ├── api/                    REST API (Next.js Route Handlers)
│   ├── globals.css             cały system wizualny (tokeny, komponenty, motywy)
│   ├── layout.tsx              <html>, ustawienia wyglądu przed pierwszym renderem
│   └── icon.svg                ikona karty przeglądarki
├── components/
│   ├── Shell.tsx               nagłówek, menu, logo, przyciski dostępności
│   ├── AppContext.tsx          sesja, parametry, helper api()
│   ├── FloatingGuide.tsx       pomocnik „gdzie kliknąć” + samouczek
│   ├── OfficialForm.tsx        formularze ZUS: pola do wypełnienia + wydruk w układzie wzoru
│   └── Icon.tsx  Markdown.tsx  Share.tsx  ui.tsx
└── lib/
    ├── params.ts               parametry prawne (stawki, wymiary, terminy) + opisy do panelu
    ├── store.ts                zapis parametrów (data/params.json + historia)
    ├── engine.ts               silnik reguł: podstawa, kalkulator, ciąża, ryzyka, dokumenty
    ├── docparse.ts             parser dokumentów ZUS (Z-3, Z-3a, ZAM, ZAS-53, ZAS-12, e-ZLA…)
    ├── zusforms.ts             wzory ZAM i ZAS-53 (treść 1:1) + walidacja
    ├── zusforms-platnik.ts     wzory Z-3, Z-3a, ZAS-12 (treść 1:1) + walidacja
    ├── wnioski-pracodawca.ts   wnioski do pracodawcy wg Dz.U. 2025 poz. 322 (§ 2–§ 20) + walidacja
    ├── mock.ts                 symulowane dane ZUS / mObywatel (fikcyjne osoby)
    ├── cases.ts                wbudowane sprawy testowe z oczekiwanym wynikiem
    ├── quiz.ts                 pytania ankiety (wspólne dla klienta i serwera)
    ├── users.ts                konta z ankiety + poprawki danych z ZUS
    ├── session.ts              symulowana sesja (podpisane ciasteczko pp_session)
    ├── cookie.ts               podpisane ciasteczka (HMAC)
    ├── apps-client.ts          lista wysłanych wniosków w przeglądarce
    ├── guide.ts                rejestr miejsc dla pomocnika (atrybuty data-guide)
    ├── support.ts              organizacje pomocowe i oficjalne źródła
    └── ai.ts                   integracja z Claude (opcjonalna)
```

---

## REST API

| Metoda | Ścieżka | Opis |
|---|---|---|
| `GET` | `/api/auth/mobywatel` | lista kont testowych + bieżąca sesja |
| `POST` | `/api/auth/mobywatel` | `{ personaId }`, symulowane logowanie |
| `DELETE` | `/api/auth/mobywatel` | wylogowanie |
| `GET / POST / PUT` | `/api/accounts` | konto z ankiety: odczyt, założenie, uzupełnienie |
| `GET / PUT / DELETE` | `/api/profile` | dane profilu, zapis poprawek, przywrócenie danych z ZUS |
| `POST` | `/api/calculate` | kalkulator zasiłku (oboje rodzice, praca, adopcja, sytuacje szczególne) |
| `POST` | `/api/base` | podstawa wymiaru zasiłku z krokami wyliczenia |
| `POST` | `/api/pregnancy` | świadczenia w czasie ciąży |
| `GET` | `/api/documents?title=&benefit=&insured=` | jakie dokumenty, gdzie i kiedy złożyć |
| `POST` | `/api/documents/parse` | odczyt danych z PDF (parser regułowy, opcjonalnie AI) |
| `GET / POST` | `/api/applications` | wnioski złożone w sesji, symulowana wysyłka z UPO |
| `GET` | `/api/cases`, `/api/cases/{id}` | sprawy testowe, sprawa z wyliczeniem |
| `GET` | `/api/zus/profile` | symulowane dane z KSI/PUE |
| `GET` | `/api/zus/ezla` | symulowany podgląd e-ZLA |
| `GET` | `/api/zus/debt?date=YYYY-MM-DD` | symulowane zaświadczenie o należnościach do uregulowania |
| `GET` | `/api/support?obszar=` | organizacje pomocowe i oficjalne źródła |
| `POST` | `/api/assistant` | asystent (AI lub reguły) |
| `POST` | `/api/guide` | pomocnik: `{ question, path }`, zwraca `{ answer, steps, mode }` |
| `GET / PUT / DELETE` | `/api/params` | parametry prawne, zapis (PIN), przywrócenie domyślnych |

---

## Funkcje AI

| Funkcja | Z AI | Bez AI |
|---|---|---|
| Obliczenia, uprawnienia, terminy, ryzyka | **nie**, zawsze deterministyczny silnik reguł (`engine.ts`) | – |
| Odczyt danych z wgranego dokumentu | **opcjonalnie**: Claude czyta PDF (także skany), gdy pewność parsera jest niska lub po kliknięciu „Odczytaj ponownie z AI” | parser regułowy (`docparse.ts`) na warstwie tekstowej PDF |
| Asystent | **opcjonalnie**: Claude dostaje aktualne parametry z panelu i kontekst profilu | baza odpowiedzi regułowych |
| Pomocnik „gdzie kliknąć” | **opcjonalnie**: rozumie pytania swobodnie sformułowane | dopasowanie słów kluczowych (`guide.ts`) |

Wyniki AI są oznaczone w interfejsie fioletowym znacznikiem „AI” i nie trafiają bezpośrednio do wyliczeń: użytkownik zatwierdza odczytane dane.

---

## Przechowywanie danych

| Dane | Gdzie | Uwagi |
|---|---|---|
| Parametry prawne + historia | `data/params.json`, `data/params-history.json` | edytowane w `/admin` |
| Sesja | podpisane ciasteczko `pp_session` | 4 godziny, podpis HMAC – wartości nie da się podmienić |
| Konto z ankiety | podpisane ciasteczko `pp_account` | tylko w tej przeglądarce, usuwane przy wylogowaniu |
| Poprawki danych z ZUS | podpisane ciasteczko `pp_overrides` | tylko pola różne od ZUS, tylko w bieżącej sesji |
| Wysłane wnioski, zapisany plan | `sessionStorage` przeglądarki | lista „Wysłane w tej sesji”; serwer tylko wystawia UPO |
| Szkice formularzy (ankieta, wnioski) | `sessionStorage` przeglądarki | przetrwają odświeżenie strony |
| Ustawienia wyglądu | `localStorage` przeglądarki | |

Dane użytkowników nie są przechowywane na serwerze, więc działają tak samo na hostingu serverless (np. Vercel, wiele instancji) i nie są widoczne dla innych odwiedzających. Katalog `data/` (parametry z panelu admina) tworzy się sam przy pierwszym zapisie; **na hostingu tylko do odczytu** parametry trzymane są w pamięci serwera i wracają do domyślnych po ponownym wdrożeniu.

---

## Dostępność i wygląd

- **Przyciski w nagłówku:** powiększenie tekstu (3 stopnie), wysoki kontrast, motyw jasny / ciemny. Ustawienia są nakładane przed pierwszym renderem, bez mignięcia.
- **RWD:** boczne menu na komputerze, dolna nawigacja i przycisk wstecz na telefonie.
- Link „Przejdź do treści”, etykiety pól, role ARIA w oknach dialogowych i paskach postępu, obsługa klawiatury (Esc zamyka okna).
- **Wygląd** wzorowany na portalach e-administracji (zielona kolorystyka, kafelki usług, karty). Opis systemu wizualnego jest w [`DESIGN.md`](DESIGN.md). Aplikacja **nie używa** logotypu ZUS, godła ani innych oficjalnych znaków. Własny znak to minimalistyczny piktogram rodziny.
- **Język:** prosty, z eufemizmami tam, gdzie temat jest drażliwy (np. „należności do uregulowania” zamiast „zadłużenie”).

---

## Mapowanie na wymagania wyzwania

| Wymaganie | Gdzie |
|---|---|
| a) świadczenia w ciąży (zasiłek chorobowy, świadczenie rehabilitacyjne, zasiłek w wysokości zasiłku macierzyńskiego, także brak prawa) | `/ciaza` → `POST /api/pregnancy` |
| b) kalkulator dla obojga rodziców (liczba dzieci, „Za życiem”, wcześniak, martwe urodzenie / zgon dziecka) | `/kalkulator` → `POST /api/calculate` |
| c) łączenie urlopu rodzicielskiego z pracą | `/kalkulator`, sekcja 3 (¼, ⅓, ½ etatu) |
| d) symulacja wspólnego korzystania przez oboje rodziców | `/kalkulator` (przejęcie macierzyńskiego, 9 tyg. nieprzenoszalnych, tryb kolejno / jednocześnie, gotowe warianty, porównanie 81,5% z 100% / 70%) |
| e), j) adopcja i rodzina zastępcza niezawodowa | `/kalkulator` → „Przysposobienie” / „Rodzina zastępcza” (limity wieku 14 / 7 / 10 lat) |
| f) kalkulator z indywidualną podstawą wymiaru z konkretnej sprawy | `/sprawy` (12 spraw testowych + wgrywanie PDF) → `GET /api/cases/{id}`, `POST /api/documents/parse` |
| g) dokumenty, terminy, sposób złożenia (płatnik czy ZUS) | `/wnioski` → `GET /api/documents` |
| h) zagrożenia i ryzyka | `/ryzyka` + ryzyka wyliczone z danych osoby (pozorność, podwyższenie podstawy, ustanie ubezpieczenia, należności do uregulowania, brak kodu B) |
| i) organizacje charytatywne | `/wsparcie` → `GET /api/support` |
| logowanie mObywatel (symulacja) | `/` → „Zaloguj się do ZUS” → „Zaloguj z mObywatel” (QR) → `POST /api/auth/mobywatel` |
| pobranie danych z ZUS (symulacja) | `/zus`, przycisk „Pobierz dane z ZUS” w kalkulatorze → `GET /api/zus/profile` |
| należności do uregulowania na dzień powstania prawa | `/zus` → Do uregulowania → `GET /api/zus/debt?date=` |
| podgląd e-ZLA | `/zus` → e-ZLA → `GET /api/zus/ezla` |
| PUE/eZUS (pytanie, dane konta) | `/zus` → Zadaj pytanie |
| wnioski o urlopy i świadczenia + wysyłka | `/wnioski` (ZAM, ZAS-53, Z-3, Z-3a, ZAS-12 w układzie wzorów ZUS; wnioski do pracodawcy wg Dz.U. 2025 poz. 322) → `POST /api/applications` (UPO) |
| odpis aktu urodzenia | `/wnioski` → Odpis aktu urodzenia |
| przekierowania do ZUS / MRPiPS / PIP | `/wsparcie` → Oficjalne źródła |
| panel administracyjny parametrów | `/admin` → `GET/PUT/DELETE /api/params` (wersjonowanie + historia zmian) |
| upload / wybór wniosków do testów | `/sprawy` |
| RWD | cały interfejs: boczne menu na komputerze, dolna nawigacja na telefonie |

---

## Zgodność formularzy z wzorami ZUS

Formularze, które wypełnia ubezpieczony albo płatnik składek, odwzorowują wzory ZUS z 2026 r. Jeden opis formularza (`src/lib/zusforms.ts`, `src/lib/zusforms-platnik.ts`) służy zarówno do wypełniania na ekranie, jak i do wydruku – teksty na ekranie i na papierze nie mogą się rozjechać.

| Formularz | Kto wypełnia | Wzór (nr zamówienia druku) | Kiedy |
|---|---|---|---|
| **ZAM** – Wniosek o zasiłek macierzyński | ubezpieczony | 2965/26, Informacja 2993/26 | wszystkie okresy: macierzyński / na warunkach, rodzicielski, uzupełniający, ojcowski |
| **ZAS-53** – Wniosek o zasiłek chorobowy | ubezpieczony | 2869/26 | działalność, osoby współpracujące, duchowni, marynarze, niezdolność po ustaniu ubezpieczenia |
| **Z-3** – Zaświadczenie płatnika składek | płatnik (pracodawca) | 2924/26 | pracownik, gdy zasiłek ustala ZUS |
| **Z-3a** – Zaświadczenie płatnika składek | płatnik (np. zleceniodawca) | 2929/26 | ubezpieczeni z innych tytułów (bez działalności, duchownych, marynarzy) |
| **ZAS-12** – Zaświadczenie płatnika składek | płatnik | 2923/26 | zasiłek chorobowy / opiekuńczy za dalszy okres |

### Co odwzorowano 1:1

- **Układ i treść:** kolejność sekcji i pól, etykiety, podpowiedzi pod polami, pola wyboru, pytania TAK/NIE, oświadczenia, „Instrukcja wypełniania”, „Pouczenie” / „Informacja do wniosku”, klauzula RODO i pouczenie o art. 63 ustawy zasiłkowej.
- **Tabele w Z-3 i Z-3a:** nagłówki (także grupy kolumn), numeracja kolumn i liczba wierszy jak na wzorze.
- **Tekst dosłownie** – łącznie z błędami wzoru, np. „sytemu” (ZAS-12), „jeżeli nadano numeru PESEL” (Z-3a), „wykazane sekcji” (Z-3). Poprawiono tylko błędy powstałe przy odczycie tekstu z PDF (np. „niedłużej” → „nie dłużej”, „profi lu” → „profilu”).
- **Wydruk:** kratki na PESEL, NIP, REGON, rachunek i daty (dd/mm/rrrr), znak X w polach wyboru, wartości WIELKIMI LITERAMI (zgodnie z instrukcją wzoru), „Informacja” do ZAM na osobnej stronie.
- **Wypełnianie z profilu:** dane osoby, płatnika, daty urlopu, e-ZLA, a w Z-3 / Z-3a – przychody z 12 miesięcy. Adresu ani miejsca urodzenia aplikacja nie zgaduje.

### Świadome różnice

- Logo ZUS nie jest grafiką – nagłówek odtworzono tekstem i kolorem.
- Podział na strony wyznacza przeglądarka; nie ma numeracji „Strona x z y” ani stopki „Skład: Poligrafia ZUS…”.
- Pola „okres (od–do)” na ekranie to dwa pola daty, a seria i numer e-ZLA – osobne pole; na wydruku wszystko trafia do jednego pola, jak na wzorze.
- Podpis: odręczny na wydruku, przy wysyłce elektronicznej – symulowany podpis zaufany.

### Walidacja

Sprawdzane są zasady wynikające z treści wzorów i przepisów, m.in.:

- PESEL, NIP i REGON (cyfra kontrolna) oraz reguła „podaj, jeśli nie ma nadanego …” (np. bez PESEL – data urodzenia i dokument tożsamości);
- polski kod pocztowy 00-000, rachunek 26 cyfr;
- okresy: kolejność dat, wymiar urlopu macierzyńskiego wg liczby dzieci, maks. 6 tyg. przed porodem, rodzicielski w maks. 5 częściach do końca roku, w którym dziecko kończy 6 lat, ojcowski 7–14 dni w maks. 2 częściach do 12. miesiąca życia;
- stawka 81,5% tylko przy wniosku do 21 dni po porodzie i tylko razem z urlopem rodzicielskim;
- uzupełniający urlop macierzyński: zaznaczona okoliczność urodzenia i okres pobytu w szpitalu (od 37. tyg. – min. 2 dni, pierwszy między 5. a 28. dniem po porodzie);
- pola „Jeśli TAK …” wymagane po zaznaczeniu TAK, wykluczające się odpowiedzi (np. „do 20” / „powyżej 20 ubezpieczonych”, „NIE” w pkt 6 Z-3);
- tabele: rok RRRR, miesiąc 1–12, kwartał 1–4, liczba dni, kwoty, procent potrąconej składki 0–100.

### Czego nie ma i dlaczego

- **ZUR i ZAO** – takie formularze nie istnieją; zakres wniosku ZAM obejmuje wszystkie okresy zasiłku macierzyńskiego.
- **Z-3b** – nie jest używany: „Informacja” do ZAM wymienia tylko Z-3 i Z-3a, a osoba prowadząca działalność nie składa zaświadczenia płatnika (ZAS-53 / ZAM bez Z-3).
- **e-ZLA** – wystawia lekarz; aplikacja tylko je odczytuje.
- **Wnioski do pracodawcy** – to nie są formularze ZUS i nie mają urzędowego wzoru graficznego; ich treść i załączniki określa rozporządzenie (zob. niżej).

### Wnioski do pracodawcy – zgodność z Dz.U. 2025 poz. 322

Rozporządzenie MRPiPS z 11 marca 2025 r. w sprawie wniosków dotyczących uprawnień pracowników związanych z rodzicielstwem nie ustala wyglądu wniosku – ustala, co wniosek **zawiera** i jakie dokumenty się do niego **dołącza**. Aplikacja tworzy dla każdego paragrafu osobny wniosek (`src/lib/wnioski-pracodawca.ts`):

| § | Wniosek | Podstawa w Kodeksie pracy |
|---|---|---|
| 2 | część urlopu macierzyńskiego przed przewidywaną datą porodu | art. 180 § 2 |
| 3, 4 | rezygnacja z pozostałej części urlopu macierzyńskiego (na warunkach) i powrót do pracy – po 14 tyg. albo po 8 tyg. przy orzeczeniu o niezdolności do samodzielnej egzystencji | art. 180 § 8 |
| 5 | pozostała część urlopu macierzyńskiego / na warunkach / rodzicielskiego dla ojca lub innego członka najbliższej rodziny | art. 180 § 9 |
| 6–13 | część urlopu w sytuacji szczególnej: pobyt matki w szpitalu (§ 6, § 7), zgon (§ 8, § 10), porzucenie dziecka (§ 9, § 11), matka nieubezpieczona z orzeczeniem (§ 12), matka bez tytułu do ubezpieczenia podejmuje zatrudnienie (§ 13) | art. 180 § 16, § 17 |
| 14 | uzupełniający urlop macierzyński | art. 180² § 4, art. 183 § 3¹ |
| 15 | urlop rodzicielski lub jego część | art. 182¹ᵈ § 1, art. 183 § 4–4² |
| 16 | łączenie urlopu rodzicielskiego z pracą | art. 182¹ᵉ § 2 |
| 17 | urlop ojcowski lub jego część | art. 182³ § 2 |
| 18 | urlop na warunkach urlopu macierzyńskiego | art. 183 § 6 |
| 19 | urlop wychowawczy lub jego część | art. 186 § 7 |
| 20 | obniżenie wymiaru czasu pracy zamiast urlopu wychowawczego | art. 186⁷ § 1 |

Jak zapewniono zgodność:

- **Treść wniosku** to ponumerowane elementy z „ust. 1” danego paragrafu, w brzmieniu rozporządzenia (np. „wskazanie okresu, na który ma być udzielony urlop rodzicielski lub ma być udzielona jego część: …”), z wartościami wpisanymi przez pracownika.
- **Załączniki** są wymienione w brzmieniu rozporządzenia i zależą od sytuacji: np. kopia zaświadczenia „Za życiem” tylko przy wydłużonym urlopie rodzicielskim, kopia postanowienia o przysposobieniu tylko przy dziecku przysposobionym, dokumenty z „ust. 4” (przyjęcie dziecka na wychowanie, odroczenie obowiązku szkolnego) tylko przy dziecku przyjętym na wychowanie.
- **Oświadczenia**, które rozporządzenie wymaga dołączyć (np. o zamiarach drugiego rodzica, o korzystaniu z urlopu ojcowskiego), są wpisane w treść pisma.
- **„Stosuje się odpowiednio” (ust. 3):** wnioski z § 5–§ 13 można złożyć także dla urlopu na warunkach urlopu macierzyńskiego i urlopu rodzicielskiego – nazwy urlopu w treści zmieniają się automatycznie, a element o urlopie „wykorzystanym przed porodem” (dotyczy tylko urlopu macierzyńskiego) jest wtedy pomijany. Przy § 15 dla dziecka przyjętego na wychowanie stosuje się tylko ust. 1, więc załącznikami są wyłącznie dokumenty z ust. 4.
- **§ 21–§ 23:** zagraniczny dokument urodzenia spoza UE/EFTA/Szwajcarii/państw umów o zabezpieczeniu społecznym (lub nie w ich języku urzędowym) dostaje dopisek o tłumaczeniu na język polski; dokumenty z akt osobowych można wskazać i nie są wtedy dołączane; przy kopiach pismo zawiera zobowiązanie do okazania oryginałów na żądanie pracodawcy.
- **Walidacja** pilnuje warunków z rozporządzenia i Kodeksu pracy: np. 6 tyg. przed porodem (§ 2), powrót do pracy najwcześniej po 14 / 8 tyg. (§ 3, § 4), przejęcie po 8 tyg. w sytuacjach z § 6, § 7, § 9, data przejęcia po dniu zgonu / porzucenia (§ 8–§ 11), w § 13 wnioskuje tylko ojciec, uzupełniający urlop bezpośrednio po macierzyńskim i w pełnych tygodniach, urlop rodzicielski w maks. 5 częściach i w granicach puli, urlop ojcowski 7–14 dni do 12. miesiąca życia (przy przysposobieniu – 12 mies. od uprawomocnienia), urlop wychowawczy do 36 mies., wnioski składane co najmniej 21 dni wcześniej tam, gdzie wymaga tego Kodeks pracy.

### Gdy ZUS zmieni wzór

Treść każdego formularza jest w jednym miejscu (`ZAM`, `ZAS53` w `zusforms.ts`; `Z3`, `Z3A`, `ZAS12` w `zusforms-platnik.ts`). Zmiana etykiety lub dodanie pola to edycja tej listy – ekran, wydruk i walidacja korzystają z niej automatycznie. Numer zamówienia druku w komentarzu na górze pliku wskazuje wersję wzoru, z którą porównano formularz.

---

## Założenia do weryfikacji z ZUS

- Uzupełniający urlop macierzyński liczony wg „Informacji” do ZAM: tydzień urlopu za każdy tydzień pobytu dziecka w szpitalu – do upływu 15. tyg. po porodzie (przed 28. tyg. ciąży lub ≤1000 g), do upływu 8. tyg. (28–36 tyg., >1000 g); od 37. tyg. – pobyt min. 2 kolejne dni, pierwszy między 5. a 28. dniem po porodzie, liczony od 5. dnia do upływu 8. tyg. Założenia aplikacji: niepełny tydzień liczy się jako pełny, dzień porodu = dzień 0. Wartości można zmienić w panelu.
- 9 tygodni urlopu rodzicielskiego nie przechodzi na drugiego rodzica, gdy ten nie jest ubezpieczony. Pełna pula przysługuje tylko w wyjątkach ustawowych (przełącznik w kalkulatorze).
- Kwota netto jest orientacyjna: zaliczka PIT 12%, bez kwoty zmniejszającej.
- Zasiłek za miesiąc = podstawa × stawka. Zasiłek za okres = stawka dzienna (1/30) × liczba dni.
- Lista organizacji pomocowych wymaga weryfikacji przez ZUS.

---

## Droga do produkcji

- **Logowanie:** Węzeł Krajowy / login.gov.pl (OIDC/SAML) zamiast makiety mObywatel.
- **Dane:** integracja z KSI/PUE przez API ZUS zamiast `mock.ts`.
- **Przechowywanie:** baza danych z audytem i rolami (np. Azure AD / Keycloak) zamiast plików JSON.
- **Wnioski:** e-Doręczenia / PUE i podpis zaufany zamiast symulowanego UPO.
- **Treści:** weryfikacja parametrów, założeń i listy organizacji przez ZUS.

---

<sub>Projekt przygotowany na konkurs HackNation. Nie jest powiązany z Zakładem Ubezpieczeń Społecznych ani z aplikacją mObywatel. Wszystkie dane osobowe w aplikacji są fikcyjne.</sub>
