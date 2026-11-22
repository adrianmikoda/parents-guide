# Przewodnik Rodzica – plan filmu prezentacyjnego (2:00)

> **Cel:** w dwie minuty przekonać komisję HackNation (wyzwanie ZUS), że aplikacja spełnia wyzwanie, i zostać zapamiętanym.
> **Pomysł na film:** film jest zbudowany jak akt prawny – **pięć paragrafów = pięć kryteriów oceny** – a prowadzi go **to samo światło punktowe, którym aplikacja pokazuje, gdzie kliknąć**.
>
> Źródła faktów: `INSTRUCTION.md`, `README.md`, `DESIGN.md`, `src/lib/mock.ts`, `src/app/globals.css`. Kwoty i daty na ekranie pochodzą wyłącznie z `/api/calculate` – ten plan żadnych nie podaje.

---

## 1. Metryka

| | |
|---|---|
| Długość | **2:00** (3600 klatek @ 30 fps) |
| Format | 1920×1080, 16:9, H.264 MP4; napisy PL wypalone + osobny `.srt` |
| Głośność | −14 LUFS zintegrowane, true peak −1 dBTP |
| Muzyka | 120 BPM → 1 bit = 15 klatek, 1 takt = 2 s; każda zmiana sceny wypada na bit |
| Narzędzia | Remotion (React) + zrzuty z Playwright; bez ręcznego montażu |
| Odbiorca | komisja konkursowa: ogląda raz, zwykle na projektorze lub laptopie, czasem bez dźwięku |

## 2. Koncepcja

1. **Paragrafy = kryteria.** Po identyfikacji idzie pięć rozdziałów. Każdy otwiera karta z numerem paragrafu i wagą: § 1 Związek z wyzwaniem (25%) · § 2 Pomysł (20%) · § 3 Oryginalność (15%) · § 4 Kompletność projektu i user experience (25%) · § 5 Potencjał wdrożeniowy (15%). Komisja dostaje gotową mapę oceny, a „§” to słownictwo urzędu, nie ozdobnik.
2. **Jeden świat: światło punktowe.** Efekt `.guide-spot` z „Gdzie kliknąć?” (przyciemnienie z otworem zaciskającym się na elemencie) jest językiem przejść całego filmu. Otwiera film pytaniem „gdzie kliknąć?”, wskazuje kolejne funkcje i na końcu zaciska się na logo. Najbardziej oryginalna funkcja aplikacji staje się podpisem filmu.
3. **Jedna rodzina jako wątek.** Anna i Piotr Kowalczyk (konta testowe, termin porodu 12.03.2027). Anna pracuje w dużej firmie, więc zasiłek wypłaca pracodawca; Piotr w firmie do 20 osób, więc wypłaca ZUS. Wszystko pokazujemy na ich sprawie, a Piotr pyta pomocnika o urlop ojcowski. Pozostałe konta (Magdalena, Katarzyna, Ewa) pojawiają się w szybkim montażu „teczek”.
4. **Linia kryteriów.** U góry kadru biegnie cienka (4 px) linia, jak zielona linia pod nagłówkiem aplikacji. Jest podzielona 25/20/15/25/15, jak segmenty osi czasu w kalkulatorze, i wypełnia się z każdym paragrafem; w finale dochodzi do 100%.
5. **Urzędowe motywy, reklamowy ruch.** Pieczątka, kratki formularza, paragraf, przypis, teczka sprawy i UPO podane w rytmie reklamy: najazdy kamery, cięcia na bit, zoom przez przycisk, przyspieszenia, zalania kolorem.

**Dlaczego to działa na komisję**
- Komisja ocenia według tych pięciu kryteriów. Film mówi jej językiem i przy każdym pokazuje dowód w działającej aplikacji.
- Najmocniejsze wyróżniki (pomocnik, samouczek, kalkulator) dostają najwięcej czasu: o ich długości decyduje siła funkcji, nie waga kryterium.
- Uczciwość buduje zaufanie: wszystko, co symulowane, jest podpisane w przypisie, nic nie udaje ZUS.

---

## 3. Styl „urzędowy, ale piękny” (design.md)

### Akty i pola

| Akt | Sceny | Mówi | Pole |
|---|---|---|---|
| 1 Pytanie | hook | „Przepisy są rozproszone. Gdzie kliknąć?” | ciemna zieleń |
| 2 Porządek | ident, karty § 1–§ 5 | „Pięć kryteriów, jedna aplikacja” | zieleń |
| 3 Dowód | treść § 1–§ 5 | „Tak to działa” | papier |
| 4 Odpowiedź | finał | „Mniej szukania, więcej rodzicielstwa” | ciemna zieleń |

| Pole | Tło | Tusz | Akcent danych | Inne dane | Tusz drugorzędny |
|---|---|---|---|---|---|
| ciemna zieleń | `#00431f` | `#ffffff` | `#f7b32b` (tekst OK, kontrast 6,3:1) | `#00672f` | biel 75% |
| zieleń | `#00672f` | `#ffffff` | `#f7b32b` (tylko duże cyfry, 3,8:1) | `#00431f` | biel 80% |
| papier | `#f5f7f6` | `#1a1f1c` | `#f7b32b` **tylko jako wypełnienie lub marker pod tuszem**, nigdy jako tekst | `#dfe5e1` | `#3f4a44` |

Pozostałe barwy z aplikacji, tylko tam, gdzie pokazujemy jej elementy: granat `#1b3769` (tata na osi czasu, pieczątka), limonka `#a8c62b` (część etatu, kreskowanie), fiolet `#6b3fc4` (znacznik „AI”).

### Typografia
- **Lato** (jak aplikacja), grubości 900 / 700 / 400.
- Pięć stopni przy 1080p: display **220** · liczba **120** · tytuł **68** · etykieta **34** (wersaliki, +0,06em) · przypis **28**.
- Display: światło −0,03em, interlinia 0,95. Tytuł mieści się w dwóch liniach łamanych ręcznie. Kwoty pisane cyframi tabelarycznymi.

### Tło z tematu: kratki formularza
Siatka pól na litery jak w drukach ZUS: komórka 44×56 px, linia 1 px, tusz 12% na papierze lub biel 10% na zieleni. Pojawia się **tylko na scenach typograficznych** (hook, ident, karty, plansze z hasłem). Sceny z aplikacją mają płaskie tło. Kratki niosą zwrot: w hooku zapełniają się chaotycznie literami, w finale są puste i równe.

### Układ
- Jedna lewa krawędź tytułów, x = 160, we wszystkich scenach.
- Przypis to jedna linia w lewym dolnym rogu (x = 160, 64 px od dołu), rozmiar 28.
- Okno aplikacji (Stage) zajmuje 0,80–0,86 szerokości kadru; pod nim zostaje pas na napisy.
- Linia kryteriów leży przy górnej krawędzi i ma 4 px. Kolory segmentów:

  | Segment | Na papierze | Na zieleni |
  |---|---|---|
  | zrobiony | zieleń | biel |
  | bieżący | amber | amber |
  | kolejne | `#dfe5e1` | biel 30% |

### Słownik urzędowych motywów
- **Pieczątka:** prostokątna ramka 4 px, Lato 900 wersalikami, tusz granatowy `#1b3769`, obrót −6° do −9°, lekko poszarpane krawędzie (`roughenEdges()` z `@remotion/effects`). Wchodzi w 6 klatek (skala 1,12→1), po niej mikro-wstrząs kadru 2 px przez 3 klatki.
- **§:** tylko na kartach rozdziałów.
- **Przypis:** „Symulacja · dane fikcyjne · podstawa: Dz.U. 2025 poz. 322”, zawsze tam, gdzie widać makietę ZUS lub mObywatel.
- **Teczka sprawy:** karta jak `.card` w aplikacji (górna krawędź 3 px w zieleni, kwadratowe rogi), z sygnaturą w nadtytule („KONTO TESTOWE · ANNA K.”).

### Czego unikamy
- Logotypu ZUS, logo mObywatel, godła, flagi UE i zdjęć z zus.pl (reguła z `DESIGN.md`; godło chroni dodatkowo ustawa). ZUS i mObywatel padają wyłącznie jako nazwy.
- Zdjęć stockowych ludzi, poświat, gradientów, cząsteczek, „szklanych” kart i logo w rogu.
- Pierścieni przy kliknięciu (kursor tylko lekko „przysiada”) i sprężynujących elementów interfejsu.
- Jednakowego wejścia wszystkich elementów („fade + wjazd z dołu”) oraz tekstu, który rusza się w trakcie czytania.
- Kwot wpisanych ręcznie: każda liczba na ekranie pochodzi z danych.

### Reguły świadomie wyłączone
- **Dwie grubości pisma → trzy (400/700/900),** bo tak wygląda aplikacja. Grubość 400 tylko w przypisach i napisach.
- **„Bez HUD-ów” → zostaje linia kryteriów,** bo to element marki (linia pod nagłówkiem) i niesie informację.
- **„Pole zmienia się tylko z nowym aktem” → karty § przeplatają się z papierem,** bo każdy paragraf to nowe kryterium.

---

## 4. Oś czasu w skrócie

| # | Scena | Czas | Klatki | Waga | Co widać |
|---|---|---|---|---|---|
| 0 | Hook „Zanim urodzi się dziecko…” | 0:00–0:10 | 0–299 | – | chaos formularzy → światło na „Gdzie kliknąć?” |
| 1 | Ident, tytuł, linia kryteriów | 0:10–0:14 | 300–419 | – | znak rodziny, nazwa, 5 segmentów |
| K1 | Karta § 1 | 0:14–0:15,5 | 420–464 | 25% | |
| 2 | **§ 1 Związek z wyzwaniem** | 0:15,5–0:32 | 465–959 | 25% | mObywatel → pulpit → teczki 5 kont → lista a–j |
| K2 | Karta § 2 | 0:32–0:33,5 | 960–1004 | 20% | |
| 3 | **§ 2 Pomysł** | 0:33,5–0:54 | 1005–1619 | 20% | jeden kalkulator → plan urlopów → ½ etatu → 81,5% kontra 100/70 → ostrzeżenie |
| K3 | Karta § 3 | 0:54–0:55,5 | 1620–1664 | 15% | |
| 4 | **§ 3 Oryginalność** | 0:55,5–1:18 | 1665–2339 | 15% | „Gdzie kliknąć?” → samouczek → formularze 1:1 → PDF |
| K4 | Karta § 4 | 1:18–1:19,5 | 2340–2384 | 25% | |
| 5 | **§ 4 Kompletność i UX** | 1:19,5–1:38 | 2385–2939 | 25% | RWD → dostępność → walidacja i UPO → prosty język |
| K5 | Karta § 5 | 1:38–1:39,5 | 2940–2984 | 15% | |
| 6 | **§ 5 Potencjał wdrożeniowy** | 1:39,5–1:52 | 2985–3359 | 15% | silnik reguł → `/admin` 70→60 → droga do produkcji |
| 7 | Finał | 1:52–2:00 | 3360–3599 | 100% | pieczątki pięciu kryteriów → światło na logo → hasło |

- Wszystkie granice scen są wielokrotnością 15 klatek, czyli wypadają na bit przy 120 BPM.
- § 3 dostaje 22,5 s przy wadze 15%, bo to tu są funkcje, które komisja zapamięta.
- Podane czasy są docelowe. Ostateczne ustawimy według nagranego lektora: każda akcja na ekranie startuje na słowie, które ją nazywa.

---

## 5. Scenariusz ujęcie po ujęciu

### Scena 0 – Hook „Zanim urodzi się dziecko…” (0:00–0:10) · ciemna zieleń

| Czas | Obraz i ruch kamery | Lektor | Dźwięk |
|---|---|---|---|
| 0:00,0–0:01,5 | Ciemność. W ciszy pada jedno uderzenie pieczątki (0:00,2). Kratki formularza rysują się od lewej, litery wskakują w nie jedna po drugiej: „ZASIŁEK”. Kamera stoi. | „Zanim urodzi się dziecko…” | pieczątka, maszyna do pisania |
| 0:01,5–0:06,0 | Narastający montaż, cięcia co 6–12 klatek na bit. Kartki z kodami ZAS-53, Z-3, Z-3a, ZAM, ZAS-12 wjeżdżają pod kątem i tworzą stos. Między nimi błyskają hasła: „100%”, „81,5%”, „70%”, „9 tygodni”, „§ 2 … § 20”, „≤ 20 ubezpieczonych”, „pracodawca czy ZUS?”, „termin?”. Kamera: ciągły najazd 1,0→1,15 z obrotem 2°→0°, rozmycie ruchu na wjazdach. | „…rodzą się pytania. Ile dostaniemy? Kto i kiedy zostaje z dzieckiem? Co złożyć…” | kartka ×6, riser, tykające pizzicato |
| 0:06,0–0:08,5 | **Stop.** Kadr przygasa o 40% na 3 klatki. Światło punktowe (efekt z aplikacji) zaciska się z całego kadru na jeden punkt w prawym dolnym rogu: przycisk „Gdzie kliknąć?”. | „…i gdzie kliknąć?” (ciszej, bliżej mikrofonu) | muzyka urywa się; „ding”, gdy światło staje |
| 0:08,5–0:10,0 | Kursor wjeżdża i klika. **Zoom przez przycisk:** przycisk rośnie do 250% kadru w 10 klatkach (`Easing.in(Easing.poly(4))`), a jego zieleń staje się tłem identu. | – | klik, whoosh, niskie „boom” przy zalaniu kadru; od 0:10,0 wchodzi pełny bit |

Materiał: w całości Remotion. Typografia i kartki to komponenty; przycisk jest przebudowany z CSS `.guide-fab`.

### Scena 1 – Ident i tytuł (0:10–0:14) · zieleń

| Czas | Obraz i ruch kamery | Lektor | Dźwięk |
|---|---|---|---|
| 0:10,0–0:11,5 | **Ident:** znak rodziny z aplikacji (`FamilyMark` w kwadratowym kafelku). Mężczyzna i kobieta wchodzą z boków, dziecko pojawia się między nimi i łapie ich za ręce: jeden ruch, sprężyna bez odbicia, 18 klatek. | „Przewodnik Rodzica.” | jeden ciepły akord na złapaniu za ręce |
| 0:11,5–0:13,0 | Obok znaku pojawia się „Przewodnik / Rodzica” (display, słowo po słowie, rozmycie 6→0 px, odstęp 2 klatki). Pod spodem: „Zasiłki, urlopy i wnioski dla obojga rodziców – w jednym miejscu.” Nadtytuł: „HACKNATION · WYZWANIE ZUS”. | „Zasiłki dla rodziców – w jednym miejscu.” | – |
| 0:13,0–0:14,0 | Pod tytułem wyrasta pasek z pięciu segmentów (szerokości 25/20/15/25/15, podpisy „§ 1 · 25%” … „§ 5 · 15%”). Potem odjeżdża na górną krawędź kadru i staje się linią kryteriów 4 px. | – | krótki whoosh |

Klatka 380 to miniatura filmu.

### Karty paragrafów K1–K5 (po 1,5 s) · zieleń + kratki

Układ jest wspólny dla wszystkich kart, od lewej krawędzi x = 160:
1. Nadtytuł „KRYTERIUM n Z 5”.
2. „§ n” (display) uderza jak pieczątka.
3. Nazwa kryterium wchodzi słowo po słowie.
4. Waga liczy się od 0 w 12 klatkach (liczba 120, amber), a odpowiedni segment linii kryteriów się wypełnia.

Dźwięk: pieczątka i 3–4 tyknięcia licznika. Lektor milczy, widz dostaje oddech.

Wyjście z każdej karty jest inne i ma przyczynę w treści:

| Karta | Wyjście | Dlaczego |
|---|---|---|
| K1 → § 1 | irys otwiera się ze znaku „§” na ekran logowania | start pokazu |
| K2 → § 2 | poziomy rzut (whip, 6 klatek) | kierunek osi czasu w kalkulatorze |
| K3 → § 3 | światło punktowe zaciska się na „§ 3” i otwiera na aplikacji | § 3 to pomocnik |
| K4 → § 4 | zalanie kolorem (12 klatek) | zapowiedź motywów i kontrastu |
| K5 → § 5 | karta „drukuje się” linia po linii w schemat architektury | § 5 to technika |

### Scena 2 – § 1 Związek z wyzwaniem (0:15,5–0:32) · papier

| Czas | Obraz i ruch kamery | Lektor | Dźwięk |
|---|---|---|---|
| 0:15,5–0:20,5 | Okno aplikacji w perspektywie (obrót 12°) prostuje się przy pierwszym kliknięciu. Strona startowa → „Zaloguj się do ZUS” → „Zaloguj z mObywatel” → kod QR z odliczaniem (najazd 1,0→1,35 na kod) → symulacja skanu → „Pobieranie danych z ZUS…” (przyspieszenie ×3) → „Gotowe”. Przypis: „Logowanie i dane z ZUS – makieta konkursowa · osoby fikcyjne”. | „Anna loguje się przez mObywatel – dane z ZUS wczytują się same.” | kliknięcia, migawka przy skanie, tyknięcia postępu, „ding” na „Gotowe” |
| 0:20,5–0:24,0 | Cięcie na kliknięciu: pulpit „Dzień dobry, Anna” wchodzi lekko powiększony i osiada. Panorama z „Twoje najbliższe kroki” na „Na co uważać”, potem twarde cięcie na zbliżenie jednej daty. Opcjonalnie 1 s na e-ZLA z kodem B w „Moje dane ZUS”. | „Panel pokazuje jej najbliższe kroki i ryzyka.” | klik |
| 0:24,0–0:28,0 | **Teczki pięciu kont testowych** przekładane jak w archiwum, ok. 0,8 s każda: Anna (duża firma, wypłaca pracodawca), Piotr (firma ≤ 20 osób, wypłaca ZUS), Magdalena (działalność, składki do uregulowania), Katarzyna (zlecenie bez chorobowego, brak prawa do zasiłku), Ewa (adopcja 3-latka). Wynik w każdej teczce to dokładny tekst z aplikacji. | „Ciąża, adopcja, rodzina zastępcza – także wtedy, gdy zasiłek się nie należy.” | kartka ×5 |
| 0:28,0–0:32,0 | Teczki zjeżdżają w lewo. Po prawej pojawia się lista wymagań jak urzędowa lista kontrolna: a) ciąża … j) rodzina zastępcza. Kratki zmieniają się z ☐ na ☑ co ósemkę (7–8 klatek), na końcu pada „a–j + wszystkie wymagane symulacje”. | „Każdy punkt wyzwania ma tu swoje miejsce.” | tyknięcie ×10, krótka pieczątka na końcu |

Materiał: zrzuty 2× (strona startowa, QR, pobieranie, gotowe, pulpit). Teczki i lista powstają w Remotion.

### Scena 3 – § 2 Pomysł (0:33,5–0:54) · papier

| Czas | Obraz i ruch kamery | Lektor | Dźwięk |
|---|---|---|---|
| 0:33,5–0:36,5 | Papier z kratkami. „Jeden kalkulator.” (display, słowa przechodzą z szarości w tusz), pod spodem „zamiast osobnych narzędzi”. Okno z `/kalkulator` wjeżdża z prawej (rozmycie 6 px w połowie ruchu). | „Zamiast osobnych kalkulatorów – jeden.” | whoosh |
| 0:36,5–0:44,0 | **Bohater filmu: „Plan urlopów” Anny i Piotra**, przebudowany w Remotion z prawdziwych danych. Kamera wjeżdża w oś czasu, aż wypełni kadr. Segmenty rosną od lewej, każdy na bit: mama w zieleni `#00672f`, tata w granacie `#1b3769`, 9 tygodni nieprzenoszalnych jako obrys. Nad segmentami kwoty miesięczne liczą się w górę; akcent dostaje tylko kwota, o której mówi lektor. | „Wynik? Plan urlopów na osi czasu: kto, kiedy i ile dostaje co miesiąc.” | tyknięcie na segment, miękkie „lądowanie” pod kwotą |
| 0:44,0–0:48,0 | Kursor włącza „praca na ½ etatu”. Segment w limonce z kreskowaniem rozciąga się w prawo, a kwota miesięczna przewija się w dół jak licznik. | „Praca na pół etatu? Urlop się wydłuża, zasiłek maleje proporcjonalnie.” | przełącznik, przewijanie cyfr |
| 0:48,0–0:51,0 | Porównanie „100% + 70% czy 81,5%?”: dwa paski sumy rosną równocześnie. Wyższy dostaje akcent i różnicę „+ [kwota z API]”. | „Który wariant się opłaca? Widać od razu.” | „ding” na wyniku |
| 0:51,0–0:54,0 | Przekładka kartki na konto Katarzyny. Karta ostrzeżenia (styl `.card.warn`) ląduje z lewej, słowa „przed porodem” podkreśla marker w kolorze amber. | „A gdy grozi utrata prawa do zasiłku – ostrzega, zanim będzie za późno.” | kartka, głuche tąpnięcie |

Materiał:
- Oś czasu i porównanie to komponenty Remotion zasilane danymi z `/api/calculate`.
- Tło to zrzut kalkulatora 2×.
- Treść ostrzeżenia jest skopiowana 1:1 z `/ryzyka`.

### Scena 4 – § 3 Oryginalność (0:55,5–1:18) · papier

| Czas | Obraz i ruch kamery | Lektor | Dźwięk |
|---|---|---|---|
| 0:55,5–0:59,0 | Pulpit Piotra. Najazd na pływający przycisk „Gdzie kliknąć?”, klik, panel się wysuwa. Pytanie wpisuje się w ludzkim tempie: **„gdzie złożę wniosek o urlop ojcowski?”** → Enter → odpowiedź ze znacznikiem „bez AI” (krótkie, twarde zbliżenie na znacznik). | „Nie wiesz, gdzie kliknąć? Zapytaj zwykłym językiem.” | klik, klawiatura, Enter |
| 0:59,0–1:03,0 | Światło zaciska się na „Wnioski” w menu, a kamera płynie za nim w lewo. Kursor klika i przy kliknięciu następuje cięcie: `/wnioski` wchodzi lekko powiększone, a światło zaciska się na właściwym wniosku. | „Pomocnik zakreśla miejsce na ekranie i prowadzi – nawet między stronami.” | klik, „ding” przy trafieniu |
| 1:03,0–1:07,0 | Okno „Pokazać, jak korzystać z aplikacji?” → „Tak” → przyspieszony samouczek (×4). Światło przeskakuje po czterech elementach co bit, licznik pokazuje „punkt 1/5 → 5/5 na tej stronie”. Z prawej wjeżdża telefon (obrót 10°) z tym samym samouczkiem wskazującym „Więcej” w dolnym menu. | „A samouczek sam przeprowadzi przez każdą zakładkę.” | tyknięcie przy każdym skoku |
| 1:07,0–1:12,0 | Wniosek ZAS-53: pola wypełniają się z profilu, PESEL wskakuje w kratki litera po literze. „Podgląd wydruku”: arkusz wjeżdża na ekran i dostaje pieczątkę „1:1”. Przypis: „ZAM · ZAS-53 · Z-3 · Z-3a · ZAS-12 – wzory ZUS 2026 · wnioski do pracodawcy: Dz.U. 2025 poz. 322, § 2–§ 20”. | „Formularze ZUS jeden do jednego. Wnioski do pracodawcy – prosto z rozporządzenia.” | maszyna do pisania, kartka, pieczątka |
| 1:12,0–1:18,0 | `/sprawy`: plik PDF (Z-3) wpada w pole wgrywania, linia skanu przechodzi przez dokument, odczytane pola przelatują do wyliczenia, a kwota się przelicza. Na koniec „Udostępnij wyliczenie” i link skopiowany (etykieta na ekranie, bez lektora). | „Wgrywasz PDF – i wyliczenie od razu się odświeża.” | kartka, migawka, przewijanie cyfr, „ding”, przełącznik |

Materiał:
- Zrzuty 2× każdego stanu.
- Światło punktowe to port 1:1 gradientu z `globals.css` (`.guide-spot`, krzywa `cubic-bezier(.2,.7,.2,1)`, 0,8 s = 24 klatki).
- Kursor i wpisywany tekst są nakładane w Remotion na zrzut pustego pola.

### Scena 5 – § 4 Kompletność projektu i user experience (1:19,5–1:38) · papier

| Czas | Obraz i ruch kamery | Lektor | Dźwięk |
|---|---|---|---|
| 1:19,5–1:24,0 | **Okno komputera zmienia się w telefon** (12 klatek, poziome rozmycie 12→0): boczne menu składa się w dolną nawigację. Telefon powoli orbituje (3–5° na sekundę), a kursor-kciuk stuka kolejno w Pulpit, Kalkulator, Wnioski i Więcej. | „Na komputerze i na telefonie.” | miękkie stuknięcia |
| 1:24,0–1:29,0 | Trzy przełączniki w nagłówku, każdy jako zalanie całej aplikacji kolorem (12 klatek): jasny → ciemny → wysoki kontrast (żółty na czarnym) → większy tekst. Potem klawisz Tab przeskakuje fokusem po trzech elementach. Etykiety: „Tryb ciemny”, „Wysoki kontrast”, „Większy tekst”, „Klawiatura”. | „Większy tekst, wysoki kontrast, tryb ciemny, obsługa klawiatury.” | przełącznik ×3, Tab ×3 |
| 1:29,0–1:34,5 | Formularz: błędna cyfra PESEL daje komunikat z ikoną, po poprawce pojawia się zielony znacznik, a przy dacie podpowiedź terminu. „Wyślij” → pasek postępu → UPO → **pieczątka „ZŁOŻONO · UPO”** (granat, −8°) z małą etykietą „symulacja”. | „Formularze same podpowiadają dane i pilnują terminów, a wysyłkę potwierdza UPO.” | klawiatura, miękki sygnał błędu, klik, pieczątka |
| 1:34,5–1:38,0 | Papier z kratkami. Słowo „zadłużenie” zostaje przekreślone i zastąpione przez „należności do uregulowania”. Pod spodem cicha linia: „osobna, łagodna ścieżka po stracie dziecka”. Muzyka przycicha. | „Prostym, życzliwym językiem – także w trudnych chwilach.” | muzyka −6 dB, bez perkusji |

Materiał:
- Telefon: zrzuty 390×844 @3×.
- Motywy: zrzuty tej samej strony w czterech trybach, z identycznym kadrem. Zalanie kolorem to przejście maską między nimi.

### Scena 6 – § 5 Potencjał wdrożeniowy (1:39,5–1:52) · papier

| Czas | Obraz i ruch kamery | Lektor | Dźwięk |
|---|---|---|---|
| 1:39,5–1:43,5 | Schemat w stylu urzędowego diagramu: cienkie linie tuszu, kwadratowe pola. Ścieżka: Interfejs (RWD) → REST API → Silnik reguł `engine.ts` ← Parametry prawne `/admin`. Fioletowy znacznik „AI” jest połączony przerywaną linią tylko z: Asystent, odczyt PDF, „Gdzie kliknąć?”. Strzałka od AI do silnika jest przekreślona. Hasło: **„AI nigdy nie liczy zasiłku.”** Linie rysują się po kolei. | „Pod spodem – deterministyczny silnik reguł. AI nigdy nie liczy zasiłku.” | ciche tyknięcia rysowania |
| 1:43,5–1:48,0 | `/admin`: PIN wskakuje w 4 kratki → tabela parametrów → „Zasiłek za urlop rodzicielski (%)” przewija się z 70 na 60 → „Zapisz” → w historii zmian pojawia się nowy wiersz. Twarde cięcie na sprawę S01 w `/sprawy`: kwota się przelicza. Na koniec „Przywróć domyślne”. | „Zmiana przepisów? Administrator zmienia parametr – bez programisty.” | klawiatura, klik, przewijanie cyfr, „ding” |
| 1:48,0–1:52,0 | Trasa z trzema przystankami, narysowana jak oś czasu: „mObywatel (makieta) → Węzeł Krajowy”, „dane testowe → API KSI/PUE”, „symulowane UPO → PUE / e-Doręczenia + podpis zaufany”. Lewe słowa się przekreślają, prawe lądują na swoich miejscach. | „REST API i gotowa droga do produkcji.” | klik ×3 |

Materiał: schemat i trasa powstają w Remotion; `/admin` i S01 to zrzuty 2×. **Po zrobieniu zrzutów przywrócić parametry domyślne.**

### Scena 7 – Finał (1:52–2:00) · ciemna zieleń

| Czas | Obraz i ruch kamery | Lektor | Dźwięk |
|---|---|---|---|
| 1:52,0–1:55,5 | Puste, równe kratki: porządek jako odbicie chaosu z otwarcia. Karta z pięcioma wierszami, od „§ 1 Związek z wyzwaniem – 25%” do „§ 5 Potencjał wdrożeniowy – 15%”. Każdy wiersz dostaje pieczątkę ✓ na bit, coraz szybciej, a linia kryteriów dochodzi do 100%. | „Pięć kryteriów. Jeden przewodnik.” | pieczątka ×5 w rytmie, narastanie |
| 1:55,5–2:00,0 | Światło punktowe zaciska się na znaku rodziny; ident się domyka i dziecko znów łapie rodziców za ręce. Na ekranie „Przewodnik Rodzica” i hasło **„Mniej szukania. Więcej rodzicielstwa.”** Pod spodem (rozmiar przypisu): „Sprawdź sami: konta testowe na stronie startowej · [link do wersji demo]”. Przypis: „Projekt konkursowy HackNation · nie jest serwisem ZUS · dane fikcyjne”. Ostatni kadr stoi co najmniej 2 s. | „Przewodnik Rodzica. Mniej szukania – więcej rodzicielstwa.” | akord końcowy, ostatnia miękka pieczątka |

---

## 6. Tekst lektora (nagrany: ElevenLabs, głos „Magdalena”, ok. 210 słów)

Głos ciepły i pewny, 30–45 lat, bez reklamowej egzaltacji. Tempo ok. 2,2 słowa na sekundę. Nagrywać zdaniami, jeden plik na zdanie.
Wymowa: ZUS [zus], UPO [u-pe-o], e-ZLA [e-zet-el-a], PDF [pe-de-ef], REST API [rest a-pe-i], AI [a-i]. Raz przyjętą wymowę trzymać do końca.

| Start | Tekst |
|---|---|
| 0:00,3 | Zanim urodzi się dziecko… rodzą się pytania. |
| 0:03,7 | Ile dostaniemy? Kto zostaje z dzieckiem? Co złożyć… |
| 0:08,0 | …i gdzie kliknąć? |
| 0:10,3 | Przewodnik Rodzica. Zasiłki dla rodziców – w jednym miejscu. |
| 0:15,8 | Anna loguje się przez mObywatel – dane z ZUS wczytują się same. |
| 0:20,8 | Panel pokazuje jej najbliższe kroki i ryzyka. |
| 0:24,5 | Ciąża, adopcja, rodzina zastępcza – także gdy zasiłek się nie należy. |
| 0:29,2 | Każdy punkt wyzwania ma tu swoje miejsce. |
| 0:33,7 | Zamiast osobnych kalkulatorów – jeden. |
| 0:37,6 | Wynik? Plan urlopów na osi czasu: kto, kiedy i ile dostaje co miesiąc. |
| 0:44,0 | Pół etatu? Urlop się wydłuża, zasiłek proporcjonalnie maleje. |
| 0:48,3 | Który wariant wybrać? Widać od razu. |
| 0:51,3 | A gdy grozi utrata zasiłku – ostrzega z wyprzedzeniem. |
| 0:55,8 | Nie wiesz, gdzie kliknąć? Zapytaj zwykłym językiem. |
| 0:59,5 | Pomocnik zakreśla, gdzie kliknąć – nawet na innej stronie. |
| 1:03,4 | A samouczek sam przeprowadzi przez każdą zakładkę. |
| 1:07,3 | Wnioski do pracodawcy prosto z rozporządzenia, formularze ZUS – jeden do jednego. |
| 1:12,6 | Wgrywasz PDF – i wyliczenie od razu się odświeża. |
| 1:16,0 | A wynikiem dzielisz się jednym linkiem. |
| 1:19,6 | Na komputerze i na telefonie – ten sam kalkulator, wnioski i pomocnik. |
| 1:24,3 | Tryb ciemny, wysoki kontrast, większy tekst, obsługa klawiatury. |
| 1:29,3 | Formularze podpowiadają dane i pilnują terminów, a wysyłkę potwierdza UPO. |
| 1:34,8 | Prostym, życzliwym językiem – także w trudnych chwilach. |
| 1:39,1 | Pod spodem – deterministyczny silnik reguł. Sztuczna inteligencja nie liczy zasiłku. |
| 1:45,0 | Nowe przepisy? Zmienia się parametr – nie kod. |
| 1:48,7 | REST API i gotowa droga do produkcji. |
| 1:52,3 | Pięć kryteriów. Jeden przewodnik. |
| 1:55,6 | Przewodnik Rodzica. Mniej szukania – więcej rodzicielstwa. |

Hasła zapasowe: „Przepisy po ludzku.” · „Ty zajmij się dzieckiem. Resztę poprowadzimy.”

---

## 7. Dźwięk

### Muzyka
Charakter „nowoczesny urzędowy”: fortepian, pizzicato smyczków, miękki puls syntezatora i lekka perkusja (rimshot, shaker); w finale pełne smyczki. Bez ukulele i klaskania.
Źródło: Pixabay Music, YouTube Audio Library albo ElevenLabs Music (jeśli jest klucz). Licencję sprawdzić przy każdym utworze i zapisać w `CREDITS.md`.

| Czas | Muzyka |
|---|---|
| 0:00–0:06 | napięcie: tykające pizzicato i riser, bez perkusji |
| 0:06–0:10 | **cisza** (tylko „ding”, klik i whoosh); na 0:10,0 drop i główny temat |
| 0:33,5 | wchodzi pełniejsza perkusja: energia kalkulatora |
| 0:55,5 | przerzedzenie, żeby było miejsce na klawiaturę i „ding” pomocnika |
| 1:19,5 | pełny aranż |
| 1:34,5 | przyciszenie o 6 dB, bez perkusji (trudne chwile) |
| 1:39,5 | budowanie pod drogę do produkcji |
| 1:52 | pieczątki na bitach, smyczki |
| 1:58 | akord końcowy wybrzmiewa do 2:00 |

Jeśli utwór nie ma dokładnie 120 BPM, bity liczymy z jego tempa (`Math.round(i * fps * 60 / bpm)`) i przesuwamy granice scen na najbliższy bit.

### Efekty dźwiękowe

| Efekt | Gdzie | Źródło |
|---|---|---|
| Pieczątka (głuche tąpnięcie) | otwarcie 0:00,2, karty § ×5, „1:1”, „ZŁOŻONO · UPO”, finał ×6 | Pixabay SFX / freesound (CC0) lub ElevenLabs SFX („rubber stamp hitting paper on a wooden desk, single thud”) |
| Maszyna do pisania / klawiatura | kratki w hooku, pytanie w „Gdzie kliknąć?”, PESEL, PIN | Pixabay / freesound (CC0) |
| Przewracanie kartki | stos formularzy, teczki, PDF | `remotion.media/page-turn.wav` |
| Whoosh / whip | wyjścia z kart, zoom przez przycisk, przenosiny okna | `remotion.media/whoosh.wav`, `whip.wav` |
| Kliknięcie myszy | każde widoczne kliknięcie | `remotion.media/mouse-click.wav` |
| Przełącznik | ½ etatu, motywy, kopiowanie linku | `remotion.media/switch.wav` |
| Ding | światło trafia w cel, „Gotowe”, wynik porównania | `remotion.media/ding.wav` |
| Migawka | skan QR, odczyt PDF | `remotion.media/shutter-modern.wav` |
| Tyknięcia | liczniki kwot, lista a–j, kroki samouczka | krótki „tick” (soundcn lub własny) |
| Riser + sub-boom | 0:02–0:06 narastanie, 0:09,8 zalanie kadru | Pixabay / freesound (CC0) |

Nie używamy memowych dźwięków z biblioteki Remotion (vine-boom, bruh itd.). Licencję każdego pliku z `remotion.media` sprawdzić na jego stronie w dokumentacji Remotion.

### Miks
- Lektor ok. −16 LUFS (krótkookresowo).
- Muzyka pod lektorem ściszana o 10–12 dB (ducking).
- Efekty zawsze cichsze niż głos.
- Całość normalizowana do −14 LUFS.

### Napisy
- Biały pasek z zieloną lewą krawędzią 6 px, jak `.guide-bar` w aplikacji.
- Lato 700, 34 px, maksymalnie dwie linie po ok. 42 znaki, w pasie pod oknem aplikacji.
- Ukryte na kartach § i wtedy, gdy te same słowa są już na ekranie jako typografia.

---

## 8. Kryterium → dowód w filmie

| Kryterium | Waga | Czas | Ujęcia | Co komisja ma zapamiętać | Gdzie sprawdzi sama |
|---|---|---|---|---|---|
| Związek z wyzwaniem | 25% | 16,5 s | scena 2 | Każdy punkt a–j i każda wymagana symulacja jest w aplikacji. | tabela wymagań w `INSTRUCTION.md` |
| Pomysł | 20% | 20,5 s | scena 3 | Jeden kalkulator, wynik jako plan na osi czasu, ostrzega zawczasu. | `/kalkulator` |
| Oryginalność | 15% | 22,5 s | scena 4 | Pomocnik zakreśla miejsce na ekranie; samouczek; formularze 1:1. | przycisk „Gdzie kliknąć?” |
| Kompletność i UX | 25% | 18,5 s | scena 5 | Telefon, dostępność, walidacja, UPO, życzliwy język. | tryb urządzenia, nagłówek |
| Potencjał wdrożeniowy | 15% | 12,5 s | scena 6 | AI nie liczy, parametry zmienia admin, jest droga do produkcji. | `/admin` (PIN 1234), README |

---

## 9. Produkcja krok po kroku (zainstalowane skille)

1. **Zrzuty ekranu** (`playwright-recording`)
   - Wersja produkcyjna aplikacji: `npm run build && npm start`, żeby w rogu nie było znaczka narzędzi deweloperskich Next.js.
   - Playwright: viewport 1920×1080 z `deviceScaleFactor: 2`, co daje PNG 3840×2160 i ostre zbliżenia do 2×. Telefon: 390×844 @3×.
   - Logowanie przyciskami „Konta testowe (symulacja)”. W ujęciach bez samouczka zaznaczyć w localStorage, że już był proponowany.
   - Ok. 35 stanów: strona startowa, QR, pobieranie, gotowe, pulpit Anny i Piotra, kalkulator (bazowy, ½ etatu, porównanie), ryzyka Katarzyny, panel pomocnika (pusty i z odpowiedzią), `/wnioski`, okno samouczka i jego kroki, ZAS-53 (formularz i wydruk), `/sprawy` przed i po PDF, udostępnianie, telefon ×4, cztery motywy, walidacja, UPO, `/admin` przed i po, S01 przed i po.
   - Nagrania wideo służą tylko jako wzorzec tempa, nie do montażu.
2. **Dane** (zero liczb z głowy)
   - `POST /api/calculate` dla Anny i Piotra: wariant bazowy, ½ etatu, 81,5% i 100/70.
   - Wyniki zapisać w `public/data/*.json`. Oś czasu i porównanie czytają tylko te pliki.
3. **Projekt Remotion** (`remotion-create`, `remotion-markup`, `synthetic-ui-demo`, `video-design`)
   - Folder obok repozytorium, np. `C:\Users\AEEEE\przewodnik-wideo\`, żeby repo konkursowe zostało czyste. Gotowy MP4 trafia do `demo-video/`.
   - Kompozycja `PrzewodnikRodzica`: 1920×1080, 30 fps, 3600 klatek. Każdy paragraf jako osobna, połączona kompozycja do podglądu.
   - Komponenty:
     - `Stage` i `Cursor` (z `~/.claude/skills/synthetic-ui-demo/components/`);
     - `Spotlight` (port `.guide-spot`);
     - `FormGrid` (kratki);
     - `ChapterCard`, `CriteriaRule`, `Stamp`;
     - `PlanUrlopow` (przebudowa `.tl-*`), `PhoneFrame`;
     - `CountUp` (cyfry tabelaryczne), `Strike` (przekreślenia), `Captions`.
   - Lato przez `@remotion/google-fonts` z podzbiorem `latin-ext` (polskie znaki).
   - Sekcja 3 tego planu staje się plikiem `design.md` projektu.
4. **Dźwięk** (`elevenlabs` albo nagranie, `remotion-captions`, efekty z `remotion-markup/sfx.md`)
   - Najpierw lektor: jeden plik na zdanie, potem transkrypcja whisper.cpp ze znacznikami słów. Każdą akcję na ekranie przypinamy do słowa, które ją nazywa.
   - Potem muzyka na siatce bitów i efekty.
5. **Przegląd** (`remotion-studio`, `video-design`)
   - Podgląd w Remotion Studio i arkusz kontaktowy (jedna ustabilizowana klatka na scenę).
   - Najwyżej trzy rundy poprawek, w kolejności: tekst → timing → detal.
   - Test bez dźwięku: czy obraz sam opowiada historię?
   - Kontrola: tekst ≥ 28 px, kontrast, brak „tików” z listy w sekcji 3, każda liczba pochodzi z danych.
6. **Render** (`remotion-render`, `ffmpeg`)
   - Render: `npx remotion render PrzewodnikRodzica out/przewodnik-rodzica.mp4 --crf=18`.
   - Normalizacja głośności: `npx remotion ffmpeg -i out/przewodnik-rodzica.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -b:a 192k out/final.mp4`.
   - Miniatura z klatki 380. Wersja z napisami i bez, plus `.srt`.

---

## 10. Do sprawdzenia przed nagraniem lektora

- [ ] Kwoty, daty i nazwy okresów Anny i Piotra pochodzą z `/api/calculate`, nie z tego planu.
- [ ] Teksty wyników pięciu kont i alertów ryzyk są skopiowane 1:1 z aplikacji.
- [ ] Pomocnik odpowiada „bez AI” na „gdzie złożę wniosek o urlop ojcowski?” i trafia we właściwy element.
- [ ] Jeśli pokazujemy liczbę spraw testowych, wszystkie 12 w `/sprawy` daje oczekiwany wynik.
- [ ] Po zrzutach `/admin` kliknięto „Przywróć domyślne”.
- [ ] Licencja Remotion sprawdzona skillem `remotion-license` (darmowa dla osób prywatnych i małych zespołów; przy renderze `--license-key=free-license`).
- [ ] Licencje muzyki i efektów zapisane w `CREDITS.md`.
- [ ] Nigdzie nie ma logotypów ZUS ani mObywatel ani godła. Przypis „symulacja · dane fikcyjne” stoi wszędzie tam, gdzie widać makietę.

## 11. Decyzje (22.11.2026)

1. **Lektor i muzyka – później.** Animacja jest gotowa z samymi efektami dźwiękowymi; rytm (120 BPM, granice scen co 15 klatek) i czasy z sekcji 6 zostawiają miejsce na ścieżkę.
2. **Plik obok, nie zamiast:** `demo-video/przewodnik-rodzica-film.mp4`. Stare `przewodnik-rodzica-promo.mp4` zostaje jako kopia zapasowa; nowy zastąpi je dopiero, jeśli okaże się lepszy.
3. **Plansza końcowa bez linku** – tak jak w poprzednim promo: „PRZEWODNIK RODZICA · HACKNATION 2026” i stopka „Next.js · React · REST API · Claude AI | Dane i logowanie symulowane, osoby fikcyjne. Projekt nie jest serwisem ZUS.”
4. **Źródło animacji:** projekt Remotion `C:\Users\AEEEE\przewodnik-wideo\` (poza repozytorium konkursowym). Opis w jego `README.md`.
