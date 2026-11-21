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
13. [Założenia do weryfikacji z ZUS](#założenia-do-weryfikacji-z-zus)
14. [Droga do produkcji](#droga-do-produkcji)

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
| **Wnioski i dokumenty** | `/wnioski` | Jakie dokumenty, gdzie (płatnik czy ZUS) i kiedy złożyć. Formularze wniosków o urlop macierzyński, rodzicielski, ojcowski i uzupełniający, o pracę na rodzicielskim, ZAM, ZAS-53 i odpis aktu urodzenia, z podglądem i symulowaną wysyłką (UPO). |
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
│   └── Icon.tsx  Markdown.tsx  Share.tsx  ui.tsx
└── lib/
    ├── params.ts               parametry prawne (stawki, wymiary, terminy) + opisy do panelu
    ├── store.ts                zapis parametrów (data/params.json + historia)
    ├── engine.ts               silnik reguł: podstawa, kalkulator, ciąża, ryzyka, dokumenty
    ├── docparse.ts             parser dokumentów ZUS (Z-3, Z-3a, ZAM, ZAS-53, ZAS-12, e-ZLA…)
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
| wnioski o urlopy i świadczenia + wysyłka | `/wnioski` (urlop macierzyński, rodzicielski, ojcowski, uzupełniający, praca na rodzicielskim, ZAM, ZAS-53) → `POST /api/applications` (UPO) |
| odpis aktu urodzenia | `/wnioski` → Odpis aktu urodzenia |
| przekierowania do ZUS / MRPiPS / PIP | `/wsparcie` → Oficjalne źródła |
| panel administracyjny parametrów | `/admin` → `GET/PUT/DELETE /api/params` (wersjonowanie + historia zmian) |
| upload / wybór wniosków do testów | `/sprawy` |
| RWD | cały interfejs: boczne menu na komputerze, dolna nawigacja na telefonie |

---

## Założenia do weryfikacji z ZUS

- Wymiar uzupełniającego urlopu macierzyńskiego: maks. 15 / 8 / 3 tygodnie oraz próg 14 dni hospitalizacji przy porodzie od 37. tygodnia, liczone według rozpoczętych tygodni hospitalizacji. Wartości można zmienić w panelu.
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
