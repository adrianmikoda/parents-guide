# Instrukcja dla mentora – jak przetestować Przewodnik Rodzica w 10 minut

> Wszystko poniżej jest w kolejności, w jakiej warto to robić. Jeśli masz tylko 3 minuty – zrób kroki **1, 2 i 3**.
> Logowanie, dane z ZUS, e-ZLA i wysyłka wniosków są **symulowane**. Osoby są fikcyjne.

---

## 1. Uruchomienie (ok. 1 min)

Wymagania: Node.js 20+.

```bash
npm install
npm run dev          # → http://localhost:3000
```

| Co | Wartość |
|---|---|
| Adres | http://localhost:3000 |
| PIN panelu admina (`/admin`) | `1234` |
| Klucz AI | **niepotrzebny** – bez `ANTHROPIC_API_KEY` wszystko działa w trybie regułowym. Obliczenia nigdy nie korzystają z AI. |

---

## 2. Najszybsza ścieżka: sprawdzenie wyliczeń na sprawach testowych (ok. 3 min)

1. Na stronie startowej, w sekcji **„Konta testowe (symulacja)”**, kliknij dowolną osobę, np. **Anna Kowalczyk** (od razu się zalogujesz).
   *Jeśli nie chcesz się logować, wybierz „Kontynuuj bez logowania”.*
2. Wejdź w menu **Sprawy testowe** (`/sprawy`).
3. Kliknij kafelek sprawy → poniżej pojawi się: dokumenty, rozstrzygnięcie ZUS, **„Wyliczenie narzędzia”** (podstawa z krokami, okresy, kwoty).
4. Porównaj z tabelą poniżej. Przycisk **„Otwórz w kalkulatorze”** przenosi sprawę do kalkulatora, gdzie można zmieniać parametry.

### Oczekiwane wyniki (zweryfikowane ręcznie, 22.11.2026)

| Sprawa | Sytuacja | Podstawa | Kluczowe wartości | Suma brutto |
|---|---|---|---|---|
| S01 | UoP, 1 dziecko, ojciec 9 tyg. + ojcowski | 7 172,86 zł | matka 140 dni × 100% + 224 dni × 70%; ojciec 14 dni × 100% + 63 dni × 70% | **88 511,99 zł** |
| S02 | Stawka 81,5% | 6 040,95 zł | 4 923,37 zł/mies. przez 52 tyg. | **59 736,04 zł** |
| S03 | Działalność, podwyższona podstawa | 4 877,11 zł | podstawa z realnych przychodów (5 652 × 86,29%) | **48 251,00 zł** |
| S04 | Zlecenie bez chorobowego | – | **odmowa**, wskazanie świadczenia rodzicielskiego | 0 |
| S05 | Martwe urodzenie | 5 177,40 zł | 56 dni × 100% | **9 664,48 zł** |
| S06 | Wcześniak 26 tyg., 890 g, 84 dni w szpitalu | 6 903,20 zł | + uzupełniający 84 dni (12 tyg., limit 15) | **100 993,27 zł** |
| S07 | Ojciec przejmuje 6 tyg. macierzyńskiego | 5 800 / 9 060,45 zł | matka 98 dni, ojciec 42 dni × 100% swojej podstawy | **85 882,93 zł** |
| S08 | Rodzicielski + praca na ½ etatu | 6 903,20 zł | rodzicielski wydłużony 32 → 64 tyg., 2 416,12 zł/mies. | **68 297,32 zł** |
| S09 | Adopcja 3-latka | 4 832,24 zł | 20 tyg. × 100% + 32 tyg. × 70% | **47 805,80 zł** |
| S10 | Bliźnięta + „Za życiem” | 7 500 zł | macierzyński 31 tyg., pula rodzicielskiego 67 tyg. (58 + 9) | **139 825,00 zł** |
| S11 | Likwidacja pracodawcy w ciąży | 5 263,69 zł | od porodu 20 + 32 tyg. (okres przed porodem: zakładka „W ciąży”) | **52 076,08 zł** |
| S12 | Rodzina zastępcza, dziecko 8 lat | – | **odmowa**: limit 7 lat | 0 |

**Jak liczy narzędzie (do ręcznego sprawdzenia):**
- podstawa = średnia przychodu z 12 mies. × (1 − 13,71%); dla pracownika nie mniej niż płaca minimalna po potrąceniu składek
- kwota miesięczna = podstawa × stawka (100% / 70% / 81,5%)
- stawka dzienna = kwota miesięczna ÷ 30 (zaokr. do grosza); kwota za okres = stawka dzienna × liczba dni
- minimum: kwota netto (po 12% PIT) nie niższa niż 1000 zł (dotyczy wszystkich okresów poza ojcowskim)

---

## 3. Wgranie własnego dokumentu PDF (ok. 1 min)

1. `/sprawy` → pole **„Wgraj dokument ze zestawu (PDF)”** → wybierz PDF z zestawu ZUS (Z-3, Z-3a, ZAM, ZAS-53, ZAS-12, poświadczenie, e-ZLA).
2. Narzędzie rozpozna typ dokumentu, pokaże poziom pewności i odczytane dane (tytuł, podstawa, przychody, data porodu).
3. Popraw pola, jeśli trzeba. Komunikat pokaże, **czy osoba podlega ubezpieczeniu chorobowemu**, jaka jest podstawa i **kto wypłaci zasiłek (płatnik czy ZUS)**.
4. **„Przelicz zasiłek w kalkulatorze”** przenosi te dane do kalkulatora.

> Przy skanach bez warstwy tekstowej parser regułowy nie odczyta danych. Wtedy wpisz je ręcznie albo, jeśli jest klucz AI, użyj **„Odczytaj ponownie z AI”** (wynik oznaczony fioletowym znacznikiem „AI”).

---

## 4. Kalkulator (`/kalkulator`) – co warto przeklikać (ok. 2 min)

| Wymaganie (a–j) | Co ustawić |
|---|---|
| b) liczba dzieci, „Za życiem” | liczba dzieci = 2, zaznacz „Za życiem” → pula rośnie do 67 tyg. |
| b) sytuacje szczególne | „Sytuacja szczególna” → Martwe urodzenie / Zgon dziecka (podaj dzień życia) |
| b) wcześniak | włącz uzupełniający urlop macierzyński (tydzień ciąży, masa, dni hospitalizacji) |
| c) praca + rodzicielski | ustaw ułamek etatu ¼ / ⅓ / ½ → urlop się wydłuża, zasiłek proporcjonalnie maleje, łączna suma bez zmian |
| d) oboje rodzice | przejęcie macierzyńskiego przez ojca, tryb kolejno / jednocześnie, 9 tyg. nieprzenoszalnych, porównanie 81,5% z 100% + 70% |
| e, j) adopcja / rodzina zastępcza | „Sytuacja” → Przysposobienie (limit 14 lat) / Rodzina zastępcza niezawodowa (7 lat, 10 przy odroczeniu obowiązku szkolnego) |
| dane z ZUS | po zalogowaniu: przycisk **„Pobierz dane z ZUS”** |

Ciekawe przypadki brzegowe, które narzędzie poprawnie obsługuje:
- przejęcie przez ojca więcej niż 6 tyg. → ostrzeżenie (matka musi wykorzystać 14 tyg. po porodzie)
- „Sytuacja szczególna matki” (szpital / niezdolność do samodzielnej egzystencji → po 8 tyg.; zgon / porzucenie dziecka → od razu) → ojciec przejmuje wcześniej
- uzupełniający urlop przy 0 dniach hospitalizacji → ostrzeżenie (urlop wynika z okresu pobytu w szpitalu); poród po 37. tyg. i pobyt zaczęty po 28. dniu → brak prawa
- matka nieubezpieczona → ojciec dostaje rodzicielski maks. 32 tyg. (9 tyg. przepada) + ojcowski
- ojcowski rozpoczęty po 12. miesiącu życia dziecka → ostrzeżenie, okres niewliczony do sumy
- bardzo niska podstawa → kwota podniesiona do minimum (1 136,37 zł brutto = 1000 zł netto)

---

## 5. Pozostałe ekrany (po 15–30 s każdy)

| Ekran | Ścieżka | Na co spojrzeć |
|---|---|---|
| W ciąży | `/ciaza` | zasiłek chorobowy (kod B → 100%, okres wyczekiwania 30/90 dni, 33 dni wynagrodzenia chorobowego), świadczenie rehabilitacyjne, zasiłek w wysokości macierzyńskiego |
| Ryzyka | `/ryzyka` | zaloguj się jako **Magdalena Zawadzka** – pozorność, podwyższona podstawa, składki do uregulowania |
| Wnioski | `/wnioski` | gdzie złożyć dokumenty (płatnik czy ZUS); **ZAM, ZAS-53, Z-3, Z-3a i ZAS-12 odwzorowane 1:1 ze wzorów ZUS** (opis zgodności: README → „Zgodność formularzy”) (te same sekcje, etykiety, pola wyboru, oświadczenia, „Informacja” / „Pouczenie”; podgląd = wydruk); wnioski do pracodawcy z treścią i załącznikami wg rozporządzenia Dz.U. 2025 poz. 322 (§ 2–§ 20, w tym sytuacje szczególne i urlop wychowawczy), odpis aktu urodzenia, symulowana wysyłka z UPO |
| Moje dane ZUS | `/zus` | e-ZLA, zaświadczenie o należnościach na wybrany dzień, pytanie do ZUS (PUE/eZUS) |
| Wsparcie | `/wsparcie` | organizacje pomocowe wg sytuacji + linki ZUS / MRPiPS / PIP |
| Asystent | `/asystent` | pytania prostym językiem (AI albo odpowiedzi z reguł) |
| Pomocnik | pływający przycisk | zapytaj „gdzie złożę wniosek o urlop ojcowski?” – zakreśli miejsce na ekranie |

**Konta testowe – który scenariusz pokazuje co:**

| Osoba | Scenariusz |
|---|---|
| Anna Kowalczyk | UoP, duża firma → wypłaca pracodawca |
| Piotr Kowalczyk | ojciec, firma ≤20 osób → wypłaca ZUS |
| Magdalena Zawadzka | działalność, dużo ryzyk |
| Katarzyna Lis | zlecenie bez chorobowego → brak prawa |
| Ewa Nowicka | adopcja 3-latka |

---

## 6. Panel administracyjny – zmiana przepisów bez kodu (ok. 1 min)

1. `/admin` → PIN `1234`.
2. Zmień np. „Zasiłek za urlop rodzicielski (%)” z 70 na 60 → **Zapisz zmiany**.
3. Wróć do `/sprawy` → S01: kwoty rodzicielskiego przeliczą się od razu (wersja parametrów rośnie, jest historia zmian).
4. **Na koniec kliknij „Przywróć domyślne”**, bo zmiana zapisuje się w `data/params.json` i zostaje dla kolejnych testów.

---

## 7. Gdzie jest AI, a gdzie nie

| Funkcja | AI? |
|---|---|
| Obliczenia, uprawnienia, terminy, ryzyka | **Nie**, deterministyczny silnik reguł (`src/lib/engine.ts`) |
| Odczyt PDF | opcjonalnie (gdy pewność parsera jest niska lub na żądanie) |
| Asystent, pomocnik „gdzie kliknąć” | opcjonalnie; bez klucza działają odpowiedzi z reguł |

---

## 8. Założenia do weryfikacji przez ZUS (świadome uproszczenia)

- Uzupełniający urlop macierzyński wg „Informacji” do ZAM: tydzień urlopu za każdy (rozpoczęty) tydzień pobytu dziecka w szpitalu – do upływu 15. tyg. po porodzie (przed 28. tyg. lub ≤1000 g), 8. tyg. (28–36 tyg., >1000 g); od 37. tyg. – pobyt min. 2 kolejne dni, pierwszy między 5. a 28. dniem po porodzie, liczony od 5. dnia do upływu 8. tyg. Dzień porodu = dzień 0.
- 9 tyg. rodzicielskiego nie przechodzi na drugiego rodzica, gdy ten nie jest ubezpieczony (pełna pula tylko przy wyjątku ustawowym – przełącznik w kalkulatorze).
- Kwota netto orientacyjna (12% PIT, bez kwoty zmniejszającej).
- Każdy dzień zasiłku = 1/30 kwoty miesięcznej.

Wszystkie te wartości można zmienić w `/admin`.

---

## 9. Gdy coś nie działa

| Objaw | Rozwiązanie |
|---|---|
| Port 3000 zajęty | `npx next dev -p 3001` |
| Kwoty inne niż w tabeli z pkt 2 | ktoś zmienił parametry → `/admin` → „Przywróć domyślne” |
| PDF „brak warstwy tekstowej” | skan – wpisz dane ręcznie lub ustaw `ANTHROPIC_API_KEY` w `.env.local` |
| Wylogowało mnie | sesja trwa 4 h, zaloguj się ponownie kontem testowym |

Kod: logika obliczeń w [src/lib/engine.ts](src/lib/engine.ts), parametry prawne w [src/lib/params.ts](src/lib/params.ts), sprawy testowe w [src/lib/cases.ts](src/lib/cases.ts), REST API w [src/app/api/](src/app/api/). Pełny opis w [README.md](README.md).
