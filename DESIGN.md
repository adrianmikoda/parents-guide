# DESIGN.md: Przewodnik Rodzica visual redesign

This redesign gives the app the look of the zus.pl portal and the PUE/eZUS panel, updated for 2026. The current mObywatel-style blue and red theme in `src/app/globals.css` is replaced by a green theme drawn from the reference screenshots. All existing class names stay the same, so the change happens mainly in CSS and in the shell in `src/app/(app)/layout.tsx`.

> **Branding rule:** the app looks *inspired by* ZUS and must not pretend to be ZUS. Do **not** use the ZUS logotype, the full name "Zakład Ubezpieczeń Społecznych" as our brand, the BIP mark, the EU flag, or photos from zus.pl. Our brand stays **Przewodnik Rodzica**, and the "demo / projekt konkursowy" note stays visible in the footer and on the login screen. ZUS may be named only as the institution the user deals with (for example "Pobierz dane z ZUS" or "Złóż w ZUS").

---

## 1. What we take from the reference

| From zus.pl (new portal) | From PUE/eZUS (old panel) | What we change |
|---|---|---|
| Deep green as the main colour, on a white background | Boxed widgets with a green header bar | Widgets become soft cards with a thin green top accent instead of a solid lime header |
| Amber "Zaloguj" call to action | "Pokaż »" link in the bottom-right corner of each widget | Card footer action: `Pokaż →` as a text button |
| Large, bold headlines (Lato) | Left menu: title + subtitle + icon per item | The sidebar keeps the two-line items, with the icon moved to the left and a green bar marking the active item |
| A row of tiles along the bottom edge (eZUS, PKD 2025, mZUS…), with a solid green tile for the active one | Tabs in the top right (Ogólny / Ubezpieczony / Płatnik) | Tabs become a segmented control (`.pill-tabs`) |
| Navy square accessibility buttons | Status line "Jesteś zalogowany jako: …" with a "Wyloguj" button | Compact user chip in the top bar |
| Thin green rules between text blocks | Counters ("Liczba niepotwierdzonych zleceń: 1") | `.stat` and `.badge` counters |

What we leave behind: lime gradients, bevels, 11px text, fixed-width tables, carousel arrows, stock photos.

---

## 2. Design tokens

Replace the `:root` block in `globals.css`. The old variable names (`--blue`, `--blue-50`…) are kept as aliases so existing pages don't break. Migrate them to the new names gradually.

```css
:root {
  /* brand */
  --green-900: #00431f;
  --green-700: #00672f;   /* primary: buttons, links, active nav (white text 7.0:1) */
  --green-600: #007a38;   /* hover on dark surfaces */
  --green-500: #009a46;   /* accents, focus ring, progress */
  --green-100: #dcefe2;
  --green-50:  #eef7f1;   /* active nav background, info tint */
  --lime:      #a8c62b;   /* small accents only (PUE heritage), never text */

  --navy-800:  #1b3769;   /* accessibility buttons, secondary emphasis */
  --navy-50:   #eaeff8;

  --amber-400: #f7b32b;   /* main CTA (dark text on top) */
  --amber-500: #e9a10e;   /* CTA hover */

  /* states */
  --ok: #00672f;   --ok-50: #e6f4ec;
  --warn: #8a5300; --warn-50: #fdf2e2;
  --err: #c0262d;  --err-50: #fdecee;
  --ai: #6b3fc4;   --ai-50: #f1ebfc;   /* the "AI" badge keeps its purple */

  /* neutrals */
  --ink:   #1a1f1c;
  --ink-2: #3f4a44;
  --ink-3: #66716b;
  --line:  #dfe5e1;
  --bg:    #f5f7f6;
  --card:  #ffffff;

  /* shape */
  --radius-sm: 0;          /* square, like zus.pl */
  --radius: 0;
  --radius-lg: 0;
  --shadow: 0 1px 2px rgba(0, 40, 20, .06), 0 2px 8px rgba(0, 40, 20, .04);
  --shadow-hover: 0 6px 20px rgba(0, 40, 20, .10);
  --focus: 0 0 0 3px rgba(0, 154, 70, .35);

  --font: var(--font-lato), system-ui, "Segoe UI", Roboto, sans-serif;

  /* legacy aliases */
  --blue: var(--green-700);
  --blue-dark: var(--green-900);
  --blue-50: var(--green-50);
  --blue-100: var(--green-100);
  --red: var(--err);
  --green: var(--ok);
  --amber: var(--warn);
  --amber-50: var(--warn-50);
  --red-50: var(--err-50);
}
```

Also set `themeColor` in `src/app/layout.tsx` to `#00672f`.

> **Update — implemented tokens.** The code (`src/app/globals.css`) uses semantic tokens instead of the palette names above: `--surface`, `--surface-2` (grey tiles), `--brand`/`--on-brand` (fills), `--accent` (text and icons), `--tint`, `--line-strong`, plus state pairs (`--ok`/`--ok-bg` …). Each is defined four times:
>
> | Mode | How it is chosen | Key values |
> |---|---|---|
> | Light | default | white page, `#f2f3f2` tiles, green `#00672f` |
> | Dark | system setting, or `data-theme="dark"` from the header button | `#0f1311` page, green fills `#007a38`, accent text `#5ccb8b` |
> | High contrast, light | `data-contrast="high"` | black on white, 2px black borders, underlined links, yellow + black focus ring |
> | High contrast, dark | high contrast + dark | white and yellow `#ffd400` on black |
>
> Choices are saved in `localStorage` and applied by a small script in `layout.tsx` before the first paint. All corners are square (`--radius*: 0`); only the spinner stays round.

### Contrast checks (WCAG AA)
- White on `--green-700`: 7.0:1 ✔
- `--ink` on `--amber-400`: about 9:1 ✔ (**never** white on amber)
- `--green-700` on `--green-50` (active nav): about 6.5:1 ✔
- `--ink-3` on white: about 5:1 ✔ (the lowest grey allowed for text)

---

## 3. Typography

zus.pl uses **Lato**, and so do we. Load it with `next/font` so there is no layout shift:

```ts
// src/app/layout.tsx
import { Lato } from "next/font/google";
const lato = Lato({ subsets: ["latin", "latin-ext"], weight: ["400", "700", "900"], variable: "--font-lato" });
// <html lang="pl" className={lato.variable}>
```

`latin-ext` is required for Polish characters (ą, ę, ł, ń, ś, ź, ż).

| Role | Size / line height | Weight | Notes |
|---|---|---|---|
| Display (pulpit hero) | 36/44 desktop, 28/34 mobile | 900 | e.g. "Sprawdź, co Ci przysługuje" |
| h1 (page title) | 26/32 | 700 | |
| h2 (card title) | 18/24 | 700 | |
| h3 | 16/22 | 700 | |
| Body | 16/24 | 400 | was 15px; zus.pl uses large body text, and it reads better |
| Small / meta | 13/18 | 400 | `--ink-3` |
| Overline (`.section-title`) | 12/16 | 700, uppercase, +0.06em | `--green-700` |

Amounts in the calculator use `font-variant-numeric: tabular-nums`.

---

## 4. Layout and shell

### Desktop (≥ 861px)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [■ Przewodnik Rodzica]      Kontakt  PL▾  [🦻][♿]  [👤 Krzysztof ▾] [Zadaj pytanie] │  ← header 72px, white
├──────────────────────────────────────────────────────────────────────┤  ← 4px green rule (--green-700)
│ MENU          │  Panel ogólny                         [Ogólny|Rodzic|Płatnik] │
│ ▌Panel ogólny │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  Ciąża        │  │ Wiadomości   │ │ Skrzynka     │ │ Rodzina 800+ │ │
│  Kalkulator   │  │ …            │ │ …            │ │ …            │ │
│  Wnioski      │  │      Pokaż → │ │      Pokaż → │ │      Pokaż → │ │
│  Moje dane ZUS│  └──────────────┘ └──────────────┘ └──────────────┘ │
│  …            │                                                     │
└───────────────┴─────────────────────────────────────────────────────┘
```

- **Header (`.topbar`)**: white, 72px tall, with a `4px solid var(--green-700)` bottom border (this replaces the current `.flag` stripe, which is a mObywatel motif and is removed). Left: our own brand mark, a square green tile with a pram or heart icon from `Icon.tsx`, followed by "Przewodnik / Rodzica" set in two lines with weight 700 and `--green-700`, mirroring the stacked wordmark of zus.pl without copying it. Right: accessibility buttons, the user chip, and the primary CTA.
- **Accessibility buttons**: 44×44px square, `--navy-800` background, white icon. Three actions (also on `/wiecej` for phones): light/dark theme, larger text (switches `html { font-size }` between 100%, 112.5% and 125%) and high contrast (`data-contrast="high"`, which sets borders to `--ink` and removes shadows). Persist both in `localStorage`.
- **Sidebar (`.side`)**: 280px wide, white, `MENU` overline at the top. Each `.navlink` has two lines (title, plus a subtitle in `--ink-3` at 13px), just like the PUE menu ("Dokumenty i wiadomości / Korespondencja z ZUS"). Active item: `--green-50` background, `--green-700` text, and a 4px left bar in `--green-700`. Hover: `--bg`.
- **Content**: max width 1200px, 32px padding, 24px gap between cards.

### Mobile (≤ 860px)
- Header shrinks to 56px: brand mark + page title + avatar. The accessibility buttons move into `/wiecej`.
- `.bottomnav`: 5 items, active item in `--green-700` with a `--green-50` pill behind the icon (the same pattern as today, recoloured).
- Cards stack in one column with 16px gutters.

---

## 5. Components

### 5.1 Widget card (`.card`): the PUE box, modernised
```
┌─────────────────────────────────┐  ← 3px top border --green-700
│ ⓘ Wiadomości              (2)  │  ← h2 + .badge counter
│ Wiadomości dotyczące zdarzeń    │
│ biznesowych…                    │
│ ─────────────────────────────── │  ← 1px --line
│                        Pokaż →  │  ← .card-foot, link in --green-700, 700
└─────────────────────────────────┘
```
- `border: 1px solid var(--line); border-top: 3px solid var(--green-700); border-radius: var(--radius); padding: 20px;`
- Variants: `.card.flat` (no top accent, used inside forms) and `.card.warn` / `.card.err` (top accent in the state colour, used in `/ryzyka`).
- Empty state, as in PUE ("Brak nieprzeczytanych wiadomości"): `--ink-3`, italic is not allowed, with a small icon on the left.

### 5.2 Service tiles (`.tile`): the zus.pl bottom row
- Square grey fields (`--surface-2`) joined edge to edge with 1px dividers (`.grid.tiles`), minimum height 200px. Large green line icon (48px) at the top-left, title at weight 700 and 19px near the bottom, and a green `›` chevron in the bottom-right, exactly as the zus.pl service row. Hover darkens the field and underlines the title.
- Hover: lift with `--shadow-hover`, and the title turns `--green-700`.
- `.tile.featured` (one per grid, for example "Kalkulator zasiłku" on `/pulpit`): solid `--green-700` background, white text and white icon. This mirrors the active "PKD 2025" tile.
- `/pulpit` grid: 4 columns on desktop, 2 on mobile.

### 5.3 Buttons (`.btn`)
| Class | Look | Used for |
|---|---|---|
| `.btn-primary` | `--green-700` fill, white text, hover `--green-900` | Main action on a page ("Oblicz", "Wyślij wniosek") |
| `.btn-cta` *(new)* | `--amber-400` fill, `--ink` text, hover `--amber-500` | At most **one** per screen: "Zaloguj przez mObywatel", "Pobierz dane z ZUS" |
| `.btn-outline` | 2px `--navy-800` border, navy text, white fill | Secondary actions; mirrors "Zarejestruj w PUE/eZUS" |
| `.btn-ghost` | Text in `--green-700`, `--green-50` on hover | Tertiary actions |
| `.btn-danger` | `--err` | Destructive actions in `/admin` |

All buttons: 44px minimum height, `--radius-sm`, weight 700, a trailing chevron `›` on navigational buttons (zus.pl style), and `box-shadow: var(--focus)` on `:focus-visible`.

### 5.4 Segmented tabs (`.pill-tabs`): the PUE profile tabs
Container with a `--bg` background, `--radius-sm`, and 4px padding. Active tab: white, `--green-700` text, `--shadow`. On the PUE panel the active tab was shown in green; we keep that only as text colour.

### 5.5 Badges and alerts
- `.badge`: 12px, weight 700, pill shape, tinted background with matching text: `b-ok` green, `b-warn` amber, `b-no` red, `b-info` navy, `b-ai` purple (unchanged so AI output stays recognisable).
- `.alert`: 4px left border in the state colour, tinted background, icon. Matches the thin green rules between paragraphs on zus.pl.

### 5.6 Forms (`.field`, `.input`)
48px inputs, 1px `--line` border that turns `--green-700` with `--focus` when focused, label above the input (weight 700, 14px), hint below (`--ink-3`, 13px). Errors: `--err` border and a message with an icon. Never rely on colour alone.

### 5.7 Calculator timeline (`.tl-*`)
Segment colours: mother `--green-700`, father `--navy-800`, shared or working part-time `--lime` with a diagonal hatch, non-transferable 9 weeks shown as an outlined segment. Legend sits above the track and wraps on mobile.

### 5.8 Stat (`.stat`)
Large number (28px, 900, `--green-700`, tabular figures), with a label underneath. Used for "Liczba niepotwierdzonych zleceń", the benefit amount and the number of days.

---

## 6. Page-level notes

| Route | Layout notes |
|---|---|
| `/` (login) | Split screen: on the left a display headline ("Wszystko o zasiłkach dla rodziców w jednym miejscu"), a bullet list with thin green separators, and the amber CTA "Zaloguj przez mObywatel (demo)"; on the right an illustration (abstract green/navy shapes like the corner of the podcast banner; **no stock photo of people**). Stacked on mobile. |
| `/pulpit` | "Panel ogólny" built from widget cards (5.1): Wiadomości, Skrzynka (wnioski i UPO), Terminy, Ryzyka, plus a row of service tiles (5.2) under the h1. Profile tabs `Rodzic / Drugi rodzic / Płatnik` as `.pill-tabs`. |
| `/kalkulator` | Numbered `.steps` with green circles; the result panel is sticky on desktop with a `.stat` and the timeline. |
| `/zus` | Card per data source (Profil, e-ZLA, Do uregulowania) with a "Symulacja" `.badge b-info`. |
| `/wnioski` | List of `.doccard` entries: form code as an overline (e.g. `ZAS-53`), title, "Składasz do: płatnika / ZUS", status badge, `Pokaż →`. |
| `/ryzyka` | `.card.warn` / `.card.err` variants, sorted by severity. |
| `/wsparcie` | Tiles that open external links, with an ↗ icon and the domain in `--ink-3`. |
| `/admin` | Dense tables (`.tablewrap`), zebra rows in `--bg`, sticky header. |

---

## 7. Motion, icons, imagery
- Transitions of 120–160ms ease-out on hover, focus and tab changes only. Respect `prefers-reduced-motion`.
- Icons: keep `src/components/Icon.tsx` (outline icons, 1.75px stroke, 20/24px). Icon colour follows the text colour.
- Imagery: flat illustrations in brand colours, or none. No carousels.

## 8. Accessibility checklist
- [ ] Every text/background pair passes AA (see §2)
- [ ] 44×44px minimum touch targets
- [ ] Visible `:focus-visible` ring on every interactive element
- [ ] Text-size and high-contrast toggles work and persist
- [ ] `lang="pl"`, landmarks (`header`, `nav`, `main`), skip link "Przejdź do treści"
- [ ] Status is never shown by colour alone (icon + text)

## 9. Implementation order
1. Tokens + Lato (§2, §3): the whole app recolours through the aliases.
2. Shell: header, accessibility buttons, sidebar items with subtitles, removal of `.flag`.
3. Cards with top accent + card footer `Pokaż →`; tiles with the `featured` variant.
4. Buttons: add `.btn-cta`, restyle the rest.
5. Page-level passes (§6), starting with `/` and `/pulpit`.
6. Replace remaining `--blue*` usages with `--green-*` and remove the aliases.
