"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "./Icon";
import { useApp } from "./AppContext";
import FloatingGuide, { setGuideEnabled, useGuideEnabled } from "./FloatingGuide";

const NAV = [
  { href: "/pulpit", label: "Panel ogólny", sub: "Twoje sprawy i terminy", icon: "home" },
  { href: "/kalkulator", label: "Kalkulator", sub: "Zasiłek dla obojga rodziców", icon: "calc" },
  { href: "/ciaza", label: "W ciąży", sub: "Świadczenia przed porodem", icon: "pregnant" },
  { href: "/wnioski", label: "Wnioski i dokumenty", sub: "Urlopy, ZAM, terminy", icon: "doc" },
  { href: "/profil", label: "Mój profil", sub: "Sytuacja rodzinna, praca, poprawki danych", icon: "user" },
  { href: "/zus", label: "Moje dane ZUS", sub: "Ubezpieczenie, e-ZLA, rozliczenia", icon: "building" },
  { href: "/ryzyka", label: "Ryzyka", sub: "Co może obniżyć zasiłek", icon: "alert" },
  { href: "/wsparcie", label: "Wsparcie", sub: "Fundacje, oficjalne źródła", icon: "heart" },
  { href: "/asystent", label: "Asystent", sub: "Zadaj pytanie", icon: "infopoint" },
];
const BOTTOM = [
  { href: "/pulpit", label: "Pulpit", icon: "home" },
  { href: "/kalkulator", label: "Kalkulator", icon: "calc" },
  { href: "/wnioski", label: "Wnioski", icon: "doc" },
  { href: "/zus", label: "ZUS", icon: "building" },
  { href: "/wiecej", label: "Więcej", icon: "menu" },
];
const TITLES: Record<string, string> = {
  "/pulpit": "Panel ogólny",
  "/kalkulator": "Kalkulator zasiłku",
  "/ciaza": "Świadczenia w ciąży",
  "/wnioski": "Wnioski i dokumenty",
  "/zus": "Moje dane z ZUS",
  "/profil": "Mój profil",
  "/sprawy": "Sprawy testowe i dokumenty",
  "/ryzyka": "Ryzyka i zagrożenia",
  "/wsparcie": "Wsparcie i informacje",
  "/asystent": "Asystent",
  "/admin": "Panel administracyjny",
  "/wiecej": "Więcej",
};
// Strony, które nie mają własnego nagłówka h1
const WITH_PAGEHEAD = ["/sprawy", "/ryzyka", "/wsparcie", "/asystent", "/wiecej"];

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <span className="brand-logo" style={{ width: size, height: size }} aria-hidden>
      <FamilyMark size={size * 0.8} />
    </span>
  );
}

/** Znak aplikacji: minimalistyczny piktogram rodziny – mężczyzna, dziecko trzymane za ręce, kobieta w sukience. */
export function FamilyMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      {/* mężczyzna */}
      <circle cx="5" cy="4.8" r="2.3" />
      <path d="M2.6 10.4a2.4 2.4 0 0 1 4.8 0V15.6H2.6Z" />
      <rect x="2.6" y="15" width="2.1" height="6" rx="1.05" />
      <rect x="5.3" y="15" width="2.1" height="6" rx="1.05" />
      {/* kobieta */}
      <circle cx="19" cy="4.8" r="2.3" />
      <path d="M17.7 8.2h2.6a1 1 0 0 1 .97.76L23 15.8a.8.8 0 0 1-.78 1H15.78a.8.8 0 0 1-.78-1L16.73 8.96A1 1 0 0 1 17.7 8.2Z" />
      <rect x="17.2" y="16" width="1.8" height="5" rx=".9" />
      <rect x="19" y="16" width="1.8" height="5" rx=".9" />
      {/* dziecko */}
      <circle cx="12" cy="11.4" r="1.7" />
      <path d="M10.3 15.2a1.7 1.7 0 0 1 3.4 0V21h-3.4Z" />
      {/* ręce */}
      <path d="M7 10.6 10.6 14.6M17 10.6 13.4 14.6" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
    </svg>
  );
}

export function Brand() {
  return (
    <Link href="/pulpit" className="brand" aria-label="Przewodnik Rodzica – strona główna">
      <Logo />
      <span className="brand-name"><span>Przewodnik</span><span>Rodzica</span></span>
    </Link>
  );
}

function store(k: string, v?: string) {
  try {
    if (v === undefined) return localStorage.getItem(k);
    localStorage.setItem(k, v);
  } catch {}
  return null;
}

/**
 * Ustawienia wyglądu zapisywane w przeglądarce i nakładane na <html> jako data-*.
 * Skrypt w layout.tsx nakłada je przed pierwszym renderem (bez mignięcia).
 */
const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
};

/** Przyciski dostępności: większy tekst (3 stopnie), wysoki kontrast i motyw jasny/ciemny. */
export function A11yButtons() {
  const [text, setText] = useState(0);
  const [contrast, setContrast] = useState(false);
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setText(Number(store("a11y-text") ?? 0) || 0);
    setContrast(store("a11y-contrast") === "1");
    setDark(isDark());
    // zmiana motywu systemu, gdy użytkownik nie wybrał go ręcznie
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = () => { if (!document.documentElement.dataset.theme) setDark(mq.matches); };
    mq?.addEventListener("change", onChange);
    return () => mq?.removeEventListener("change", onChange);
  }, []);
  const el = () => document.documentElement;
  const setTextLevel = (n: number) => { setText(n); store("a11y-text", String(n)); if (n) el().dataset.text = String(n); else delete el().dataset.text; };
  const toggleContrast = () => { const on = !contrast; setContrast(on); store("a11y-contrast", on ? "1" : "0"); if (on) el().dataset.contrast = "high"; else delete el().dataset.contrast; };
  const toggleTheme = () => { const d = !dark; setDark(d); store("theme", d ? "dark" : "light"); el().dataset.theme = d ? "dark" : "light"; };
  return (
    <div className="a11y" role="group" aria-label="Ustawienia wyglądu">
      <button type="button" data-guide="a11y-text" aria-pressed={text > 0} title="Powiększ tekst" aria-label={`Rozmiar tekstu: ${[100, 112, 125][text]}%`} onClick={() => setTextLevel((text + 1) % 3)}>
        A<span style={{ fontSize: 11 }}>+</span>
      </button>
      <button type="button" data-guide="a11y-contrast" aria-pressed={contrast} title="Wysoki kontrast" aria-label="Wysoki kontrast" onClick={toggleContrast}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></svg>
      </button>
      <button type="button" data-guide="a11y-theme" aria-pressed={dark} title={dark ? "Motyw jasny" : "Motyw ciemny"} aria-label="Motyw ciemny" onClick={toggleTheme}>
        {dark ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
        )}
      </button>
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { session, logout } = useApp();
  const guideOn = useGuideEnabled();
  const title = TITLES[path] ?? "Przewodnik Rodzica";
  const doLogout = async () => { await logout(); router.push("/"); };
  const active = (h: string) => path === h || path.startsWith(h + "/");
  // dolny pasek: strony spoza paska należą do zakładki „Więcej”
  const bottomActive = (h: string) => (h === "/wiecej" ? active(h) || !BOTTOM.some((b) => b.href !== "/wiecej" && active(b.href)) : active(h));
  useEffect(() => { document.title = TITLES[path] ? `${TITLES[path]} – Przewodnik Rodzica` : "Przewodnik Rodzica – zasiłki z ubezpieczenia chorobowego"; }, [path]);
  return (
    <div className="shell">
      <a href="#tresc" className="skip">Przejdź do treści</a>
      <header className="header">
        <div className="header-in">
          <button className="back" aria-label="Wstecz" onClick={() => router.back()}><Icon name="back" /></button>
          <Brand />
          <div className="mtitle">{title}</div>
          <div className="spacer" />
          <Link href="/wsparcie" className="hlink">Kontakt</Link>
          <A11yButtons />
          {session ? (
            <>
              <Link href="/profil" className="userchip" title="Mój profil">
                <span className="avatar">{session.imie[0]}{session.nazwisko[0]}</span>
                <span className="uname">{session.imie} {session.nazwisko[0]}.</span>
              </Link>
              <button className="btn btn-ghost hdr-logout" onClick={doLogout}><Icon name="logout" size={18} /> Wyloguj</button>
            </>
          ) : (
            <Link href="/" data-guide="nav:/" className="btn btn-cta cta-top">Zaloguj <span className="chev">›</span></Link>
          )}
          {session && <Link href="/asystent" className="btn btn-outline cta-top">Zadaj pytanie <span className="chev">›</span></Link>}
        </div>
      </header>
      <div className="body">
        <aside className="side" aria-label="Nawigacja">
          <div className="overline">Menu</div>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} data-guide={`nav:${n.href}`} className={`navlink ${active(n.href) ? "active" : ""}`} aria-current={active(n.href) ? "page" : undefined}>
              <Icon name={n.icon} size={22} />
              <span className="nt"><b>{n.label}</b><small>{n.sub}</small></span>
            </Link>
          ))}
          <div className="sep" />
          <Link href="/admin" data-guide="nav:/admin" className={`navlink ${active("/admin") ? "active" : ""}`} aria-current={active("/admin") ? "page" : undefined}>
            <Icon name="settings" size={22} /><span className="nt"><b>Panel administracyjny</b><small>Parametry prawne</small></span>
          </Link>
          <div style={{ flex: 1 }} />
          {/* przyklejone do dołu menu – widoczne także, gdy menu jest dłuższe niż ekran */}
          <div className="side-foot">
            {session ? (
              <button className="navlink" style={{ border: 0, borderLeft: "4px solid transparent", background: "none", cursor: "pointer", textAlign: "left", width: "100%" }} onClick={doLogout}>
                <Icon name="logout" size={22} /><span className="nt"><b>Wyloguj</b><small>{session.imie} {session.nazwisko}</small></span>
              </button>
            ) : (
              <Link href="/" data-guide="nav:/" className="navlink"><Icon name="user" size={22} /><span className="nt"><b>Zaloguj</b><small>przez mObywatel (symulacja)</small></span></Link>
            )}
          </div>
        </aside>
        <div className="main">
          <main id="tresc">
            {WITH_PAGEHEAD.includes(path) && <div className="pagehead"><h1>{title}</h1></div>}
            <div className="content">{children}</div>
          </main>
          <footer className="footer">Przewodnik Rodzica · wersja demonstracyjna (HackNation). Logowanie i dane z ZUS są symulowane, osoby są fikcyjne. Aplikacja nie jest serwisem ZUS.{guideOn === false && <> · <button className="linkbtn" onClick={() => setGuideEnabled(true)}>Włącz pomocnika „Gdzie kliknąć?”</button></>}</footer>
        </div>
      </div>
      <FloatingGuide />
      <nav className="bottomnav" aria-label="Nawigacja dolna">
        {BOTTOM.map((n) => (
          <Link key={n.href} href={n.href} data-guide={`nav:${n.href}`} className={bottomActive(n.href) ? "active" : ""} aria-current={bottomActive(n.href) ? "page" : undefined}>
            <span className="ic"><Icon name={n.icon} size={22} /></span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
