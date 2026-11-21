"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import Icon from "./Icon";
import { useDialog } from "./useDialog";
import Markdown from "./Markdown";
import { api } from "./AppContext";
import { PAGES, targetById } from "@/lib/guide";

/* ── Włączanie / wyłączanie pomocnika (opcjonalny, zapamiętywany w przeglądarce) ── */
const PREF = "guide-off";
const EVT = "guide-pref";
export function setGuideEnabled(on: boolean) {
  try { localStorage.setItem(PREF, on ? "0" : "1"); } catch {}
  window.dispatchEvent(new Event(EVT));
}
export function useGuideEnabled() {
  const [on, setOn] = useState<boolean | null>(null); // null = jeszcze nie wiadomo (SSR)
  useEffect(() => {
    const read = () => { try { setOn(localStorage.getItem(PREF) !== "1"); } catch { setOn(true); } };
    read();
    window.addEventListener(EVT, read);
    return () => window.removeEventListener(EVT, read);
  }, []);
  return on;
}

/* ── Samouczek: proponowany po zalogowaniu / założeniu konta ── */
const OFFER = "pp-offer-tutorial";
const TUTORIAL_EVT = "guide-tutorial";
/** Zaznacz, że po przejściu do aplikacji trzeba zapytać o samouczek. */
export function offerTutorial() { try { sessionStorage.setItem(OFFER, "1"); } catch {} }
/** Uruchom samouczek od razu (np. z „Więcej”). */
export function startTutorial() { window.dispatchEvent(new Event(TUTORIAL_EVT)); }

/**
 * Samouczek: dla każdej zakładki menu najpierw prosimy o kliknięcie jej w menu („go” – wymaga kliknięcia),
 * a na otwartej stronie zakreślamy po kolei najważniejsze miejsca z wyjaśnieniem („info” – przycisk Dalej,
 * bez klikania). Elementy niedostępne (np. bez zalogowania) są pomijane automatycznie.
 */
type TStep = { id: string; text: string; go?: true; section: string };
const go = (page: string, section: string): TStep => ({ id: `page:${page}`, go: true, section, text: `Kliknij w menu zakładkę „${section}”.` });
const TUTORIAL: TStep[] = [
  go("/pulpit", "Panel ogólny"),
  { section: "Panel ogólny", id: "konto-uzupelnij", text: "Brakuje części Twoich danych – kliknij tu, aby odpowiedzieć tylko na brakujące pytania. Bez nich wyliczenia są przybliżone." },
  { section: "Panel ogólny", id: "t-pulpit-karta", text: "Karta Twojej sytuacji: forma ubezpieczenia, termin porodu, szacowana podstawa zasiłku i kto go wypłaci – pracodawca czy ZUS." },
  { section: "Panel ogólny", id: "t-pulpit-kroki", text: "Najbliższe kroki z datami: kiedy najwcześniej zacząć urlop i do kiedy złożyć wnioski." },
  { section: "Panel ogólny", id: "t-pulpit-ryzyka", text: "Najważniejsze ryzyka wykryte w Twoich danych – co może obniżyć lub odebrać zasiłek." },
  { section: "Panel ogólny", id: "t-pulpit-uslugi", text: "Kafelki prowadzą do wszystkich usług aplikacji." },

  go("/kalkulator", "Kalkulator"),
  { section: "Kalkulator", id: "t-kalk-sytuacja", text: "1. Sytuacja: urodzenie, przysposobienie lub rodzina zastępcza, liczba dzieci, wcześniak i sytuacje szczególne." },
  { section: "Kalkulator", id: "t-kalk-podstawa", text: "2. Podstawa wymiaru – od niej liczony jest zasiłek. Pobierz dane z ZUS albo wpisz zarobki z ostatnich 12 miesięcy." },
  { section: "Kalkulator", id: "t-kalk-podzial", text: "3. Podział urlopów między rodziców: gotowe warianty, praca na części etatu i urlop ojcowski." },
  { section: "Kalkulator", id: "t-kalk-plan", text: "Wynik: plan urlopów na osi czasu – kto, kiedy i ile dostaje miesięcznie. Jeśli nazwa na pasku jest ucięta („…”), najedź na niego kursorem (lub dotknij go) – nad paskiem pojawi się pełna nazwa." },
  { section: "Kalkulator", id: "t-kalk-porownanie", text: "Porównanie: 100% + 70% czy 81,5% za cały okres – łącznie tyle samo, różni się rozkład w czasie." },
  { section: "Kalkulator", id: "t-kalk-terminy", text: "Ważne terminy – m.in. 21 dni po porodzie na wniosek o 81,5%." },
  { section: "Kalkulator", id: "kalk-udostepnij", text: "Udostępnij wyliczenie partnerowi, pracodawcy lub biuru rachunkowemu – przez telefon, e-mailem albo kopiując tekst. Możesz go poprawić przed wysłaniem." },

  go("/ciaza", "W ciąży"),
  { section: "W ciąży", id: "t-ciaza-dane", text: "Wpisz formę ubezpieczenia, datę porodu i początek zwolnienia – albo pobierz je z ZUS." },
  { section: "W ciąży", id: "t-ciaza-swiadczenie", text: "Każde świadczenie (zasiłek chorobowy w ciąży, rehabilitacyjne, przy utracie pracy) z oceną, czy przysługuje, i wyliczeniem." },
  { section: "W ciąży", id: "t-ciaza-ryzyka", text: "Ryzyka w Twojej sytuacji, np. umowa kończąca się przed porodem." },

  go("/wnioski", "Wnioski i dokumenty"),
  { section: "Wnioski i dokumenty", id: "t-wnioski-lista", text: "Wybierz formę ubezpieczenia i świadczenie – zobaczysz, kto wypłaci zasiłek i jakie dokumenty złożyć, z terminami." },
  { section: "Wnioski i dokumenty", id: "t-wnioski-formularze", text: "Gotowe wnioski: urlop macierzyński, rodzicielski, ojcowski, ZAM, ZAS-53 i odpis aktu urodzenia." },
  { section: "Wnioski i dokumenty", id: "t-wnioski-formularz", text: "Wypełniasz tylko potrzebne pola – reszta pochodzi z Twoich danych." },
  { section: "Wnioski i dokumenty", id: "t-wnioski-podglad", text: "Podgląd gotowego dokumentu: wydrukuj go albo wyślij (symulacja z potwierdzeniem UPO)." },

  go("/profil", "Mój profil"),
  { section: "Mój profil", id: "profil-zrodlo", text: "Twoje dane w jednym miejscu. Dane pobrane z ZUS możesz nadpisać, gdy się nie zgadzają lub zmieniły – pole oznaczone „zmienione” ma pierwszeństwo, a „przywróć z ZUS” cofa poprawkę." },
  { section: "Mój profil", id: "profil-sytuacja", text: "Sytuacja rodzinna: ciąża z planowaną datą porodu, urodzone dziecko, adopcja albo rodzina zastępcza niezawodowa. Przy przyjęciu dziecka podaj datę przyjęcia i datę urodzenia – sprawdzimy limit wieku (14 lat przy adopcji, 7 lub 10 w rodzinie zastępczej)." },
  { section: "Mój profil", id: "profil-ustanie", text: "Data i przyczyna ustania stosunku pracy. Od niej zależy prawo do zasiłków – np. przy upadłości lub likwidacji pracodawcy w czasie ciąży zasiłek macierzyński może przysługiwać mimo końca zatrudnienia." },
  { section: "Mój profil", id: "profil-zapisz", text: "Zapisz zmiany – od razu skorzystają z nich kalkulator, wnioski, ryzyka i zakładka „W ciąży”. Poprawki nie są wysyłane do ZUS." },

  go("/zus", "Moje dane ZUS"),
  { section: "Moje dane ZUS", id: "t-zus-login", text: "Aby zobaczyć swoje dane, zaloguj się przez mObywatel (symulacja) albo załóż konto." },
  { section: "Moje dane ZUS", id: "t-zus-zakladki", text: "Zakładki: ubezpieczenie i podstawy, zwolnienia e-ZLA, zaświadczenie o należnościach do uregulowania i pytanie do ZUS." },
  { section: "Moje dane ZUS", id: "t-zus-dane", text: "Dane ubezpieczonego: forma i okres ubezpieczenia, płatnik i podstawa wymiaru zasiłku." },
  { section: "Moje dane ZUS", id: "zus-tab-zaswiadczenia", text: "Zaświadczenia: wystąp do ZUS (np. o okresach ubezpieczenia, wypłaconych zasiłkach, niezaleganiu w składkach) albo poproś pracodawcę o zaświadczenie o zarobkach Z-3." },
  { section: "Moje dane ZUS", id: "zus-pue", text: "Link do prawdziwego portalu PUE/eZUS – tam złożysz dokumenty online." },

  go("/ryzyka", "Ryzyka"),
  { section: "Ryzyka", id: "t-ryzyka-twoje", text: "Ryzyka wykryte w Twoich danych, z tym, co możesz zrobić." },
  { section: "Ryzyka", id: "t-ryzyka-ogolne", text: "Najczęstsze zagrożenia, np. umowa „dla pozoru” czy spóźnione składki – każde z radą, jak się zabezpieczyć." },
  { section: "Ryzyka", id: "t-ryzyka-ochrona", text: "Ochrona pracownic i pracowników w ciąży i na urlopach według Kodeksu pracy." },

  go("/wsparcie", "Wsparcie"),
  { section: "Wsparcie", id: "t-wsparcie-trudne", text: "Pomoc w trudnych sytuacjach, np. po stracie dziecka." },
  { section: "Wsparcie", id: "t-wsparcie-fundacje", text: "Fundacje i organizacje – można je filtrować według sytuacji." },
  { section: "Wsparcie", id: "t-wsparcie-zrodla", text: "Oficjalne źródła: ZUS, ministerstwo rodziny i Państwowa Inspekcja Pracy." },

  go("/asystent", "Asystent"),
  { section: "Asystent", id: "t-asystent-podpowiedzi", text: "Gotowe pytania – kliknij, aby szybko zapytać." },
  { section: "Asystent", id: "t-asystent-pole", text: "Albo napisz własne pytanie o przepisy, np. „czy mogę pracować na rodzicielskim?”." },
  { section: "Asystent", id: "asystent-czlowiek", text: "Wolisz porozmawiać z człowiekiem? Tu przekażesz rozmowę konsultantowi ZUS, zadzwonisz albo napiszesz wiadomość." },

  go("/admin", "Panel administracyjny"),
  { section: "Panel administracyjny", id: "t-admin-pin", text: "Panel dla administratora: zmiana stawek, kwot i terminów po nowelizacji przepisów. Chroniony PIN-em – zwykle nie musisz tu zaglądać." },

  { section: "Na koniec", id: "a11y-theme", text: "Wygląd: tu włączysz tryb ciemny. Obok – wysoki kontrast i większy tekst." },
  { section: "Na koniec", id: "guide-fab", text: "Zgubisz się? Kliknij tu i zapytaj – pomocnik zakreśli, gdzie kliknąć." },
];
const SECTIONS = [...new Set(TUTORIAL.map((t) => t.section))];

/* ── Szukanie widocznego elementu ── */
function findVisible(ids: string[]): HTMLElement | null {
  for (const id of ids) {
    const els = document.querySelectorAll<HTMLElement>(`[data-guide="${CSS.escape(id)}"]`);
    for (const el of els) if (el.getClientRects().length && !el.closest(".guide-panel, .guide-bar, .guide-modal")) return el;
  }
  return null;
}

type Step = { ids: string[]; caption: string; nav: boolean; page: string | null; done?: boolean };
/** Co zaznaczyć dla danego celu na bieżącej stronie: sam element albo link w menu do jego strony. */
function resolve(id: string, path: string, notFoundOnPage: boolean): Step {
  // samo zakreślenie zakładki menu (samouczek); na telefonie część zakładek jest w „Więcej”
  if (id.startsWith("t-")) return { ids: [id], caption: "", nav: false, page: null };
  if (id.startsWith("nav:")) return { ids: [id, "nav:/wiecej"], caption: PAGES[id.slice(4)] ?? id, nav: false, page: null };
  const t = targetById(id);
  if (!t) return { ids: [], caption: "", nav: false, page: null, done: true };
  const navTo = (page: string, why: string): Step => ({
    ids: [`nav:${page}`, ...(path !== "/wiecej" ? ["nav:/wiecej"] : [])],
    caption: why, nav: true, page,
  });
  if (id.startsWith("page:")) return path === t.page ? { ids: [], caption: "", nav: false, page: null, done: true } : navTo(t.page, `Otwórz „${PAGES[t.page] ?? t.label}”`);
  if (t.page === "*") {
    if (notFoundOnPage && t.fallbackPage && path !== t.fallbackPage) return navTo(t.fallbackPage, `Otwórz „${PAGES[t.fallbackPage]}”`);
    return { ids: [t.id], caption: t.label, nav: false, page: null };
  }
  if (path !== t.page) return navTo(t.page, `Najpierw otwórz „${PAGES[t.page] ?? t.page}”`);
  return { ids: [t.id], caption: t.label, nav: false, page: t.page };
}

/* ── Okrąg jak w Windows: idealne koło zaciska się na elemencie, a tło stopniowo ciemnieje ──
   Jedna pełnoekranowa warstwa z gradientem radialnym (światło punktowe z miękką krawędzią, bez linii).
   Animowane są zarejestrowane właściwości CSS (--gr promień, --ga krycie tła), a pozycję
   aktualizujemy bezpośrednio w stylu elementu w requestAnimationFrame – bez renderów Reacta. */
/** Elementy, które same są „rzeczą” do pokazania – zaznaczamy cały ich obrys. */
const WHOLE = "button, input, select, textarea, a.btn, .btn, .tile, .badge, .persona, .seg, .pill-tabs > button";
type Box = { l: number; t: number; r: number; b: number };

/**
 * Obszar, którego dotyczy podświetlenie. Kontenery bywają dużo szersze niż to, co w nich widać
 * (wiersz menu na całą szerokość, wiersz przycisków z pustym miejscem po prawej) – wtedy środek
 * światła trafiałby w pustkę. Liczymy więc obrys faktycznej treści: tekstu, ikon, pól i przycisków.
 */
function targetBox(el: HTMLElement): Box {
  const e = el.getBoundingClientRect();
  const box: Box = { l: e.left, t: e.top, r: e.right, b: e.bottom };
  if (el.matches(WHOLE)) return box;
  const c: Box = { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
  const add = (x: DOMRect) => { if (x.width < 1 || x.height < 1) return; c.l = Math.min(c.l, x.left); c.t = Math.min(c.t, x.top); c.r = Math.max(c.r, x.right); c.b = Math.max(c.b, x.bottom); };
  const range = document.createRange();
  const walk = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) {
      if (n.textContent?.trim()) { range.selectNodeContents(n); for (const r of range.getClientRects()) add(r); }
      return;
    }
    if (!(n instanceof Element)) return;
    const st = getComputedStyle(n);
    if (st.display === "none" || st.visibility === "hidden") return;
    if (n.matches(WHOLE) || n.matches("svg, img, video, canvas, iframe, hr, .tl-track, .doccard, .chat")) { add(n.getBoundingClientRect()); return; }
    for (const ch of n.childNodes) walk(ch);
  };
  for (const ch of el.childNodes) walk(ch);
  if (!Number.isFinite(c.l)) return box;
  // treść wyraźnie mniejsza niż kontener → zawężamy (z małym marginesem), w przeciwnym razie cały kontener
  const narrower = c.r - c.l < (box.r - box.l) * 0.85 || c.b - c.t < (box.b - box.t) * 0.85;
  if (!narrower) return box;
  const pad = 6;
  return { l: Math.max(box.l, c.l - pad), t: Math.max(box.t, c.t - pad), r: Math.min(box.r, c.r + pad), b: Math.min(box.b, c.b + pad) };
}

function GuideOverlay({ el, onLost }: { el: HTMLElement; onLost: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let raf = 0, last = "";
    let rel = { sz: "", l: 0, t: 0, r: 0, b: 0 };
    const place = (first: boolean) => {
      // obrys treści liczymy raz (i ponownie tylko po zmianie rozmiaru elementu), potem tylko przesuwamy –
      // przejście po DOM w każdej klatce powodowałoby przycinanie animacji
      const e = el.getBoundingClientRect();
      const sz = `${Math.round(e.width)}x${Math.round(e.height)}`;
      if (sz !== rel.sz) { const t = targetBox(el); rel = { sz, l: t.l - e.left, t: t.t - e.top, r: t.r - e.left, b: t.b - e.top }; }
      const b = { l: e.left + rel.l, t: e.top + rel.t, r: e.left + rel.r, b: e.top + rel.b };
      const key = `${b.l.toFixed(1)},${b.t.toFixed(1)},${b.r.toFixed(1)},${b.b.toFixed(1)}`;
      if (key === last) return;
      last = key;
      const w = b.r - b.l, h = b.b - b.t;
      const cx = b.l + w / 2, cy = b.t + h / 2;
      const r = Math.max(28, Math.hypot(w / 2, h / 2) + 10); // koło opisane na obszarze + margines
      node.style.setProperty("--gx", `${cx}px`);
      node.style.setProperty("--gy", `${cy}px`);
      node.style.setProperty("--gr1", `${r}px`);
      if (first) {
        const W = window.innerWidth, H = window.innerHeight;
        const far = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
        node.style.setProperty("--gr0", `${Math.max(r * 1.5, far * 1.05)}px`);
        node.classList.add("run"); // start animacji dopiero z poprawnymi wartościami
      }
    };
    place(true);
    const tick = () => {
      if (!el.isConnected) { onLost(); return; }
      place(false);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [el, onLost]);
  // Portal do <html>, poza <body>: przy „większym tekście” body ma CSS zoom, a współrzędne z getBoundingClientRect
  // są już w pikselach ekranu – warstwa wewnątrz body przesunęłaby się o współczynnik powiększenia.
  return createPortal(<div ref={ref} className="guide-spot" aria-hidden />, document.documentElement);
}

type Msg = { role: "user" | "assistant"; content: string };
const SUGG = ["Gdzie złożę wniosek o urlop ojcowski?", "Jak włączyć tryb ciemny?", "Gdzie sprawdzę należności do uregulowania w ZUS?", "Jak podzielić urlop z partnerem?"];

export default function FloatingGuide() {
  const enabled = useGuideEnabled();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "Cześć! Powiedz, co chcesz zrobić, a **zakreślę**, gdzie kliknąć." }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("");
  const [plan, setPlan] = useState<{ steps: string[]; idx: number; texts?: string[]; go?: boolean[]; sections?: string[] } | null>(null);
  const [offer, setOffer] = useState(false);
  const offerBox = useRef<HTMLDivElement>(null);
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [drawKey, setDrawKey] = useState(0);
  const [missing, setMissing] = useState(false);
  const [notOnPage, setNotOnPage] = useState(false);
  const [retry, setRetry] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  const stepId = plan ? plan.steps[plan.idx] : null;
  /** krok samouczka z objaśnieniem (nie wymaga kliknięcia) */
  const tutorialInfo = !!plan?.texts && !plan.go?.[plan.idx];
  const step = useMemo(() => (stepId ? resolve(stepId, path, notOnPage) : null), [stepId, path, notOnPage]);

  const stop = useCallback(() => { setPlan(null); setEl(null); setMissing(false); setNotOnPage(false); }, []);
  const next = useCallback(() => {
    setEl(null); setMissing(false); setNotOnPage(false);
    setPlan((p) => (p && p.idx + 1 < p.steps.length ? { ...p, idx: p.idx + 1 } : null));
  }, []);

  /** indeks poprzedniego objaśnienia w samouczku (albo -1) */
  /** strona, na której leży objaśnienie j: z kroku „kliknij zakładkę” tej samej sekcji (sekcja bez takiego kroku = dowolna strona) */
  const pageOfStep = (p: NonNullable<typeof plan>, j: number) => {
    for (let k = j; k >= 0; k--) if (p.go?.[k] && p.sections?.[k] === p.sections?.[j]) return p.steps[k].slice("page:".length);
    return null;
  };
  /** poprzednie objaśnienie, z pominięciem kroków „kliknij zakładkę” i punktów niewidocznych na bieżącej stronie
   *  (te i tak zostałyby automatycznie pominięte, więc „Wstecz” nic by nie zmieniło) */
  const prevInfo = (p: NonNullable<typeof plan>) => {
    let j = p.idx - 1;
    while (j >= 0) {
      if (!p.go?.[j]) {
        const pg = pageOfStep(p, j);
        const here = !pg || pg === path;
        if (!here || typeof document === "undefined" || findVisible(resolve(p.steps[j], path, false).ids)) return j;
      }
      j--;
    }
    return -1;
  };
  const back = () => {
    if (!plan) return;
    const j = prevInfo(plan);
    if (j < 0) return;
    const page = pageOfStep(plan, j);
    setEl(null); setMissing(false); setNotOnPage(false);
    if (page && page !== path) router.push(page);
    setPlan({ ...plan, idx: j });
  };

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs, busy, open]);

  const runTutorial = useCallback(() => {
    setOffer(false);
    try { sessionStorage.removeItem(OFFER); } catch {}
    setGuideEnabled(true);
    setOpen(false);
    setEl(null); setMissing(false); setNotOnPage(false);
    setPlan({ steps: TUTORIAL.map((t) => t.id), texts: TUTORIAL.map((t) => t.text), go: TUTORIAL.map((t) => !!t.go), sections: TUTORIAL.map((t) => t.section), idx: 0 });
  }, []);
  useEffect(() => {
    try { if (sessionStorage.getItem(OFFER) === "1") setOffer(true); } catch {}
  }, [path]);
  useEffect(() => {
    window.addEventListener(TUTORIAL_EVT, runTutorial);
    return () => window.removeEventListener(TUTORIAL_EVT, runTutorial);
  }, [runTutorial]);
  const declineTutorial = () => { setOffer(false); try { sessionStorage.removeItem(OFFER); } catch {} };
  useDialog(offerBox, declineTutorial, offer && !plan);

  // Krok wykonany przez samo przejście na stronę (cel = cała strona)
  useEffect(() => { if (step?.done) next(); }, [step, next]);

  // Szukanie elementu (strony doczytują dane, więc próbujemy przez kilka sekund)
  useEffect(() => {
    if (!step || step.done) return;
    setEl(null); setMissing(false);
    let settle = 0;
    const t0 = Date.now();
    const id = setInterval(() => {
      const found = findVisible(step.ids);
      if (found) {
        clearInterval(id);
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        found.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
        // start dopiero po zakończeniu płynnego przewijania (pozycja stała przez kilka klatek)
        let prev = "", still = 0;
        const t1 = Date.now();
        const wait = () => {
          const b = found.getBoundingClientRect();
          const k = `${Math.round(b.x)},${Math.round(b.y)}`;
          still = k === prev ? still + 1 : 0;
          prev = k;
          if (still >= 4 || Date.now() - t1 > 1200) { setEl(found); setDrawKey((n) => n + 1); }
          else settle = requestAnimationFrame(wait);
        };
        settle = requestAnimationFrame(wait);
      } else if (Date.now() - t0 > (tutorialInfo ? 2500 : 3500)) {
        clearInterval(id);
        const t = stepId ? targetById(stepId) : null;
        if (t?.page === "*" && t.fallbackPage && !notOnPage) setNotOnPage(true); // np. przyciski ukryte na telefonie
        else if (tutorialInfo) next(); // np. sekcja widoczna dopiero po zalogowaniu
        else setMissing(true);
      }
    }, 200);
    return () => { clearInterval(id); cancelAnimationFrame(settle); };
  }, [step, stepId, notOnPage, retry, tutorialInfo, next]);

  const onLost = useCallback(() => { setEl(null); setRetry((n) => n + 1); }, []);

  // Kliknięcie zaznaczonego elementu = przejście do następnego kroku
  useEffect(() => {
    if (!el || !step) return;
    const onClick = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) return;
      if (tutorialInfo) return; // objaśnienie – dalej tylko przyciskiem
      if (step.nav) { setEl(null); return; } // zmiana strony sama przeliczy krok
      setTimeout(next, 150);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") stop(); };
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onClick, true); document.removeEventListener("keydown", onKey); };
  }, [el, step, next, stop, tutorialInfo]);

  async function ask(q: string) {
    q = q.trim();
    if (!q || busy) return;
    stop();
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setText("");
    setBusy(true);
    let r: { answer?: string; steps?: string[]; mode?: string } = {};
    try { r = await api("/api/guide", { question: q, path }); } catch {}
    setBusy(false);
    setMode(r.mode ?? "");
    setMsgs((m) => [...m, { role: "assistant", content: r.answer || "Nie udało się połączyć z pomocnikiem. Spróbuj ponownie." }]);
    const steps = (r.steps ?? []).filter((s) => targetById(s));
    if (steps.length) {
      setPlan({ steps, idx: 0 });
      setTimeout(() => setOpen(false), 900); // panel nie zasłania zaznaczenia
    }
  }

  const total = plan?.steps.length ?? 0;
  /** pozycja objaśnienia wśród punktów tej strony + ile zostało */
  const pagePoints = (() => {
    if (!plan?.texts || !tutorialInfo) return null;
    const sec = plan.sections?.[plan.idx];
    const all = plan.steps.map((id, i) => ({ id, i })).filter(({ i }) => plan.sections?.[i] === sec && !plan.go?.[i]);
    const avail = all.filter(({ id, i }) => i === plan.idx || (typeof document !== "undefined" && !!findVisible(resolve(id, path, false).ids)));
    const pos = avail.findIndex(({ i }) => i === plan.idx) + 1;
    return { pos, of: avail.length, left: avail.length - pos };
  })();
  const tutorial = !!plan?.texts;
  const explain = plan?.texts?.[plan.idx];
  const showFab = !!enabled && path !== "/asystent";
  if (!showFab && !plan && !offer) return null;
  return (
    <div className="guide-ui">
      {plan && el && <GuideOverlay key={drawKey} el={el} onLost={onLost} />}

      {plan && step && !step.done && (!tutorialInfo || el) && (
        <div className={`guide-bar${tutorial ? " guide-bar--tutorial" : ""}`} role="status" aria-live="polite">
          <span className="guide-bar-step">{tutorial ? `${plan.sections?.[plan.idx]} · strona ${SECTIONS.indexOf(plan.sections?.[plan.idx] ?? "") + 1}/${SECTIONS.length}` : total > 1 ? `Krok ${plan.idx + 1}/${total}` : "Wskazówka"}</span>
          {pagePoints && pagePoints.of > 0 && <span className="guide-bar-points" aria-label={`Punkt ${pagePoints.pos} z ${pagePoints.of} na tej stronie`}><b>{pagePoints.pos}/{pagePoints.of}</b> {pagePoints.left ? `· zostało ${pagePoints.left}` : "· ostatni tutaj"}</span>}
          <span className="guide-bar-text">
            {missing
              ? step.nav ? <>Nie widzę linku do tej strony.</> : <>Nie widzę tego elementu – może wymaga zalogowania lub wcześniejszego wyboru.</>
              : explain ? <>{explain}</>
              : <>{step.nav ? step.caption : <>Kliknij zakreślone: <b>{step.caption}</b></>}</>}
          </span>
          {/* przyciski zawsze w osobnym wierszu: Wstecz po lewej, Zakończ i Dalej po prawej */}
          <div className="guide-bar-actions">
            {missing && step.nav && step.page && <button className="btn btn-primary" onClick={() => router.push(step.page!)}>Przejdź</button>}
            {tutorial && prevInfo(plan) >= 0 && <button className="btn btn-ghost" onClick={back}>‹ Wstecz</button>}
            <span className="guide-bar-gap" />
            <button className="btn btn-ghost" onClick={stop}>{tutorial && plan.idx + 1 === total ? "Gotowe" : "Zakończ"}</button>
            {total > 1 && plan.idx + 1 < total && (!tutorial || tutorialInfo) && <button className={`btn ${tutorial ? "btn-primary" : "btn-ghost"}`} onClick={next}>Dalej ›</button>}
          </div>
        </div>
      )}

      {offer && !plan && (
        <div className="modal-bg guide-modal" role="dialog" aria-modal aria-labelledby="tut-title" onClick={(e) => { if (e.target === e.currentTarget) declineTutorial(); }}>
          <div className="modal" ref={offerBox} tabIndex={-1}>
            <h2 id="tut-title">Pokazać, jak korzystać z aplikacji?</h2>
            <p className="muted">Samouczek przeprowadzi Cię po wszystkich zakładkach menu: klikniesz każdą z nich, a na miejscu zakreślimy i wyjaśnimy najważniejsze elementy. Na koniec pokażemy ustawienia wyglądu i pomocnika. Możesz go przerwać w każdej chwili.</p>
            <div className="row mt" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={declineTutorial}>Nie, dziękuję</button>
              <button className="btn btn-cta tutorial-start" autoFocus onClick={runTutorial}><Icon name="infopoint" size={20} /> Pokaż samouczek <span className="chev">›</span></button>
            </div>
            <p className="hint mt">Samouczek uruchomisz też później w „Więcej” albo w pomocniku „Gdzie kliknąć?”.</p>
          </div>
        </div>
      )}

      {open && showFab && (
        <section className="guide-panel" role="dialog" aria-label="Pomocnik – gdzie kliknąć">
          <header className="guide-head">
            <b>Gdzie kliknąć?</b>
            {mode && <span className={`badge ${mode === "ai" ? "b-ai" : "b-info"}`}>{mode === "ai" ? "AI" : "bez AI"}</span>}
            <span style={{ flex: 1 }} />
            <button className="guide-x" onClick={runTutorial}>Samouczek</button>
            <button className="guide-x" title="Wyłącz pomocnika (włączysz go w „Więcej”)" onClick={() => { stop(); setGuideEnabled(false); }}>Wyłącz</button>
            <button className="guide-x" aria-label="Zwiń" onClick={() => setOpen(false)}><Icon name="x" size={18} /></button>
          </header>
          <div className="guide-msgs">
            {msgs.map((m, i) => (
              <div key={i} className={`bubble ${m.role === "user" ? "me" : "bot"}`}>{m.role === "user" ? m.content : <Markdown text={m.content} />}</div>
            ))}
            {busy && <div className="bubble bot"><span className="dots"><i /><i /><i /></span></div>}
            <div ref={endRef} />
          </div>
          {msgs.length < 3 && <div className="guide-sugg">{SUGG.map((s) => <button key={s} onClick={() => ask(s)}>{s}</button>)}</div>}
          <form className="guide-form" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Np. gdzie złożyć wniosek ZAM?" aria-label="Czego szukasz?" autoFocus />
            <button className="btn btn-primary" disabled={busy} aria-label="Wyślij"><Icon name="send" size={18} /></button>
          </form>
        </section>
      )}

      {!open && showFab && (
        <button className="guide-fab" data-guide="guide-fab" onClick={() => setOpen(true)} aria-label="Pomocnik – pokaż, gdzie kliknąć">
          <Icon name="search" size={22} stroke={2.2} /><span>Gdzie kliknąć?</span>
        </button>
      )}
    </div>
  );
}
