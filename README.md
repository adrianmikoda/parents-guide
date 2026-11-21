# Przewodnik Rodzica – Zasiłkowy Przewodnik Przyszłego Rodzica

Aplikacja webowa (RWD) dla przyszłych rodziców, rodziców małych dzieci, rodziców adopcyjnych i rodzin zastępczych niezawodowych. Pokazuje uprawnienia z ubezpieczenia chorobowego (ZUS) dopasowane do sytuacji użytkownika, liczy zasiłki, planuje urlopy obojga rodziców i przeprowadza przez wnioski. Interfejs jest wzorowany na stylu aplikacji e-administracji (karty dokumentów, kafelki usług, dolna nawigacja na telefonie), ale nie używa godła ani oficjalnych znaków.

> Projekt konkursowy HackNation. Logowanie przez mObywatel, dane z ZUS (KSI/PUE), e-ZLA, zaświadczenie o należnościach do uregulowania i wysyłka wniosków są **symulowane**. Wszystkie osoby są fikcyjne.

## Uruchomienie

```bash
npm install
npm run dev          # http://localhost:3000
# produkcyjnie
npm run build && npm start
```

Opcjonalnie w pliku `.env.local` (zobacz `.env.example`):

| Zmienna | Opis |
|---|---|
| `ADMIN_PIN` | PIN do panelu administracyjnego (domyślnie `1234`) |
| `ANTHROPIC_API_KEY` | włącza funkcje AI (asystent, odczyt skanów PDF). Bez klucza aplikacja działa w trybie regułowym. |
| `CLAUDE_MODEL` | model AI (domyślnie `claude-opus-5-5`) |

## Mapowanie na wymagania wyzwania

| Wymaganie | Gdzie |
|---|---|
| a) świadczenia w ciąży (zasiłek chorobowy, świadczenie rehabilitacyjne, zasiłek w wysokości zasiłku macierzyńskiego, także brak prawa) | `/ciaza` → `POST /api/pregnancy` |
| b) kalkulator dla obojga rodziców (liczba dzieci, „Za życiem”, wcześniak, martwe urodzenie / zgon dziecka) | `/kalkulator` → `POST /api/calculate` |
| c) łączenie urlopu rodzicielskiego z pracą | `/kalkulator`, sekcja 3 (¼, ⅓, ½ etatu) |
| d) symulacja wspólnego korzystania przez oboje rodziców | `/kalkulator` (przejęcie macierzyńskiego, 9 tyg. nieprzenoszalnych, tryb kolejno/jednocześnie, gotowe warianty, porównanie 81,5% z 100%/70%) |
| e), j) adopcja i rodzina zastępcza niezawodowa | `/kalkulator` → „Przysposobienie” / „Rodzina zastępcza” (limity wieku 14 / 7 / 10 lat) |
| f) kalkulator z indywidualną podstawą wymiaru z konkretnej sprawy | `/sprawy` (12 spraw testowych + wgrywanie PDF) → `GET /api/cases/{id}`, `POST /api/documents/parse` |
| g) dokumenty, terminy, sposób złożenia (płatnik czy ZUS) | `/wnioski` → `GET /api/documents` |
| h) zagrożenia i ryzyka | `/ryzyka` + ryzyka wyliczone z danych osoby (pozorność, podwyższenie podstawy, ustanie ubezpieczenia, należności do uregulowania, brak kodu B) |
| i) organizacje charytatywne | `/wsparcie` → `GET /api/support` |
| logowanie mObywatel (symulacja) | `/` → `POST /api/auth/mobywatel` |
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

## Funkcje wspierane przez AI

| Funkcja | AI | Bez AI |
|---|---|---|
| Obliczenia, uprawnienia, terminy, ryzyka | **nie** – deterministyczny silnik reguł (`src/lib/engine.ts`) | – |
| Odczyt danych z wgranego dokumentu | **opcjonalnie** – Claude czyta PDF (także skany), gdy pewność parsera jest niska lub po kliknięciu „Odczytaj ponownie z AI” | parser regułowy (`src/lib/docparse.ts`) na warstwie tekstowej PDF |
| Asystent (pytania i odpowiedzi) | **opcjonalnie** – Claude dostaje aktualne parametry z panelu admina | baza odpowiedzi regułowych |

Wyniki AI są oznaczone w interfejsie (fioletowy znacznik „AI”) i nie wpływają bezpośrednio na wyliczenia – użytkownik zatwierdza odczytane dane.

## Architektura

```
src/lib/params.ts     parametry prawne (stawki, wymiary, terminy) – domyślne + opisy do panelu
src/lib/store.ts      zapis parametrów (data/params.json + historia); w produkcji baza danych
src/lib/engine.ts     silnik reguł: podstawa wymiaru, kalkulator, świadczenia w ciąży, ryzyka, dokumenty
src/lib/docparse.ts   parser dokumentów ZUS (Z-3, Z-3a, ZAM, ZAS-53, ZAS-12, poświadczenie, e-ZLA)
src/lib/mock.ts       symulowane dane ZUS/mObywatel (fikcyjne osoby)
src/lib/cases.ts      wbudowane sprawy testowe z oczekiwanym wynikiem
src/lib/ai.ts         integracja z Claude (opcjonalna)
src/app/api/**        REST API (Next.js Route Handlers)
src/app/(app)/**      ekrany aplikacji
```

Silnik reguł to czyste funkcje bez I/O. Działa w przeglądarce (wynik od razu po zmianie suwaka) i w REST API (np. dla integracji z PUE lub systemami płatników). Wszystkie liczby (np. 20/31/33/35/37 tyg., 41/43, 65/67, 9 tyg., 70%, 81,5%, 21 dni, 13,71%) pochodzą z parametrów edytowalnych w `/admin`.

### Przykład REST

```bash
curl -X POST localhost:3000/api/calculate -H "Content-Type: application/json" \
  -d '{"eventDate":"2027-03-12","children":1,"mother":{"base":7000,"rodzicielskiWeeks":32},"father":{"base":8000,"rodzicielskiWeeks":9,"ojcowski":true}}'
```

## Założenia do weryfikacji z ZUS

- Wymiar uzupełniającego urlopu macierzyńskiego: maks. 15 / 8 / 3 tygodnie oraz próg 14 dni hospitalizacji przy porodzie od 37. tygodnia, liczone wg rozpoczętych tygodni hospitalizacji. Te wartości można zmienić w panelu.
- 9 tygodni urlopu rodzicielskiego nie przechodzi na drugiego rodzica, gdy ten nie jest ubezpieczony. Pełna pula przysługuje tylko w wyjątkach ustawowych (przełącznik w kalkulatorze).
- Kwota netto jest orientacyjna: zaliczka PIT 12%, bez kwoty zmniejszającej.
- Zasiłek za miesiąc = podstawa × stawka, a za okres = stawka dzienna (1/30) × liczba dni.
- Lista organizacji pomocowych wymaga weryfikacji przez ZUS.

## Droga do produkcji

Logowanie przez Węzeł Krajowy / login.gov.pl (OIDC/SAML), integracja z KSI/PUE przez API ZUS, parametry i wnioski w bazie danych z audytem i rolami, e-Doręczenia/PUE zamiast symulowanego UPO, podpis zaufany przy wnioskach.
