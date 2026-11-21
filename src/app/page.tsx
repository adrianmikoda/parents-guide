"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import { A11yButtons, Brand, Logo } from "@/components/Shell";
import { offerTutorial } from "@/components/FloatingGuide";
import { api, useApp } from "@/components/AppContext";

function FakeQR({ seed = 7, large = false }: { seed?: number; large?: boolean }) {
  const n = 25;
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const cells: [number, number][] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const finder = (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8);
    if (!finder && rnd() > 0.55) cells.push([x, y]);
  }
  const F = ({ x, y }: { x: number; y: number }) => (
    <g>
      <rect x={x} y={y} width={7} height={7} fill="#1a1f1c" />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill="#1a1f1c" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className={large ? "qr qr-lg" : "qr"} shapeRendering="crispEdges" aria-label="Kod QR (symulacja)">
      <rect width={n} height={n} fill="#fff" />
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#1a1f1c" />)}
      <F x={0} y={0} /><F x={n - 7} y={0} /><F x={0} y={n - 7} />
    </svg>
  );
}

type Acc = { id: string; imie: string; nazwisko: string; pesel: string; opis: string };

function PersonaList({ accounts, onPick }: { accounts: Acc[]; onPick: (a: Acc) => void }) {
  return (
    <div className="grid" style={{ gap: 8 }}>
      {accounts.map((a) => (
        <button key={a.id} className="persona" onClick={() => onPick(a)}>
          <span className="avatar">{a.imie[0]}{a.nazwisko[0]}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <b>{a.imie} {a.nazwisko}</b> <small>PESEL {a.pesel}</small>
            <br /><small>{a.opis}</small>
          </span>
          <span style={{ transform: "rotate(180deg)", display: "inline-flex", color: "var(--ink-3)" }}><Icon name="back" size={18} /></span>
        </button>
      ))}
    </div>
  );
}

function MockNotice() {
  return (
    <div className="mock-notice" role="note">
      <Icon name="alert" size={18} />
      <span><b>To nie jest prawdziwe logowanie do ZUS.</b> Ten ekran to makieta przygotowana wyłącznie na potrzeby konkursu HackNation. Nie wpisuj tu prawdziwych danych. Nic nie jest wysyłane do ZUS ani do mObywatel.</span>
    </div>
  );
}

const QR_TTL = 120;

function ZusLoginModal({ accounts, onClose, onPick }: { accounts: Acc[]; onClose: () => void; onPick: (a: Acc) => void }) {
  const [view, setView] = useState<"form" | "qr">("form");
  const [formErr, setFormErr] = useState("");
  const [seed, setSeed] = useState(11);
  const [left, setLeft] = useState(QR_TTL);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (view !== "qr") return;
    const t = setInterval(() => setLeft((l) => (l <= 1 ? 0 : l - 1)), 1000);
    return () => clearInterval(t);
  }, [view]);

  // kod wygasł → nowy kod
  useEffect(() => {
    if (left === 0) { setSeed((s) => s + 13); setScanned(false); setLeft(QR_TTL); }
  }, [left]);

  function openQr() { setView("qr"); setLeft(QR_TTL); setSeed((s) => s + 13); setScanned(false); }

  return (
    <div className="modal-bg" role="dialog" aria-modal aria-labelledby="zl-title" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal zus-login">
        <div className="zl-top">
          <span className="badge b-warn">MAKIETA · HackNation</span>
          <button className="zl-x" onClick={onClose} aria-label="Zamknij"><Icon name="x" size={20} /></button>
        </div>

        {view === "form" ? (
          <>
            <h2 id="zl-title" style={{ marginTop: 8 }}>Logowanie do ZUS</h2>
            <p className="muted" style={{ marginTop: 0 }}>Symulacja ekranu logowania do Platformy Usług Elektronicznych.</p>
            <MockNotice />

            <button className="btn btn-primary btn-block mt" onClick={openQr} autoFocus>
              <Icon name="shield" size={20} /> Zaloguj z mObywatel
            </button>
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              <button className="btn btn-outline" style={{ flex: "1 1 160px" }} disabled title="Niedostępne w makiecie">Profil Zaufany</button>
              <button className="btn btn-outline" style={{ flex: "1 1 160px" }} disabled title="Niedostępne w makiecie">Bankowość elektroniczna</button>
            </div>

            <div className="or-sep"><span>lub login i hasło</span></div>

            <form
              className="grid"
              style={{ gap: 12 }}
              onSubmit={(e) => { e.preventDefault(); setFormErr("W makiecie logowanie loginem i hasłem nie działa. Użyj „Zaloguj z mObywatel” albo wybierz konto testowe."); }}
            >
              <div className="field">
                <label htmlFor="zl-login">Login, PESEL lub e-mail</label>
                <input id="zl-login" className="input" autoComplete="off" placeholder="np. jan.kowalski" />
              </div>
              <div className="field">
                <label htmlFor="zl-pass">Hasło</label>
                <input id="zl-pass" type="password" className="input" autoComplete="off" />
              </div>
              {formErr && <div className="alert a-err" role="alert"><Icon name="alert" size={18} /> <span>{formErr}</span></div>}
              <div className="row" style={{ justifyContent: "space-between" }}>
                <button type="button" className="btn btn-ghost" style={{ paddingLeft: 0 }} disabled>Nie pamiętam hasła</button>
                <button type="submit" className="btn btn-cta">Zaloguj <span className="chev">›</span></button>
              </div>
            </form>
          </>
        ) : (
          <>
            <button className="btn btn-ghost" style={{ paddingLeft: 0, minHeight: 36 }} onClick={() => setView("form")}><Icon name="back" size={18} /> Inne metody logowania</button>
            <h2 id="zl-title" style={{ marginTop: 4 }}>Zaloguj z mObywatel</h2>
            <MockNotice />
            <div className="zl-qr mt">
              <div className="zl-qr-code">
                <div className={scanned ? "qr-wrap scanned" : "qr-wrap"}>
                  <FakeQR seed={seed} large />
                  {scanned && <div className="qr-ok"><Icon name="check" size={44} /></div>}
                </div>
                <small>Kod ważny jeszcze <b>{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</b></small>
                <button className="btn btn-ghost" style={{ minHeight: 32, padding: "4px 8px", fontSize: 14 }} onClick={openQr}>Odśwież kod</button>
              </div>
              <div className="steps" style={{ fontSize: 14.5 }}>
                <div className="step"><span>Otwórz aplikację <b>mObywatel</b> w telefonie</span></div>
                <div className="step"><span>Wybierz <b>„Zeskanuj kod QR”</b> i nakieruj aparat na kod</span></div>
                <div className="step"><span>Potwierdź w telefonie udostępnienie danych</span></div>
              </div>
            </div>

            <div className="sim-box mt2">
              {!scanned ? (
                <>
                  <b>Nie masz pod ręką telefonu? To tylko makieta.</b>
                  <br /><small>Zasymuluj zeskanowanie kodu i wybierz, jako kto chcesz się zalogować.</small>
                  <div className="mt"><button className="btn btn-primary" onClick={() => setScanned(true)}>Symuluj zeskanowanie kodu <span className="chev">›</span></button></div>
                </>
              ) : (
                <>
                  <b>Kod zeskanowany (symulacja)</b>
                  <br /><small>Wybierz konto testowe, którego logowanie „potwierdzasz” w telefonie:</small>
                  <div className="mt"><PersonaList accounts={accounts} onPick={onPick} /></div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Login() {
  const router = useRouter();
  const { refresh, session } = useApp();
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [step, setStep] = useState<null | { acc: Acc; phase: number }>(null);
  const [zusOpen, setZusOpen] = useState(false);

  useEffect(() => { api("/api/auth/mobywatel").then((r) => setAccounts(r.accounts)); }, []);

  async function login(acc: Acc) {
    setZusOpen(false);
    setStep({ acc, phase: 0 });
    await new Promise((r) => setTimeout(r, 1200));
    setStep({ acc, phase: 1 });
    await api("/api/auth/mobywatel", { personaId: acc.id });
    await new Promise((r) => setTimeout(r, 900));
    setStep({ acc, phase: 2 });
    await refresh();
    offerTutorial();
    router.push("/pulpit");
  }

  return (
    <div className="login-wrap">
      <a href="#tresc" className="skip">Przejdź do treści</a>
      <header className="header">
        <div className="header-in">
          <Brand />
          <div className="spacer" />
          <A11yButtons />
        </div>
      </header>
      <main className="login-main" id="tresc">
      <div className="login">
        <div>
          <h1 className="display">Wszystko o zasiłkach dla rodziców w jednym miejscu</h1>
          <p style={{ fontSize: 17, color: "var(--ink-2)" }}>Sprawdź, jakie świadczenia Ci przysługują, policz zasiłek macierzyński dla siebie i partnera, zaplanuj urlopy i złóż wnioski.</p>
          <ul className="feature-list">
            {[["calc", "Kalkulator zasiłku", "oboje rodzice, praca na części etatu, adopcja"], ["pregnant", "Świadczenia w ciąży", "zasiłek chorobowy, świadczenie rehabilitacyjne"], ["doc", "Wnioski", "gdzie i kiedy złożyć dokumenty"], ["heart", "Wsparcie", "sytuacje trudne, fundacje"]].map(([i, t, d]) => (
              <li key={t}>
                <Icon name={i} size={22} />
                <div><b>{t}</b><br /><small>{d}</small></div>
              </li>
            ))}
          </ul>
          <div className="alert a-info"><Icon name="info" size={18} /> <span>Wersja demonstracyjna (HackNation). Logowanie przez mObywatel i dane z ZUS są <b>symulowane</b>, osoby są fikcyjne. Aplikacja nie jest serwisem ZUS.</span></div>
          <div className="row mt">
            <Link href="/pulpit" className="btn btn-outline">Kontynuuj bez logowania <span className="chev">›</span></Link>
            {session && <Link href="/pulpit" className="btn btn-ghost">Wróć do pulpitu ({session.imie})</Link>}
          </div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <h2>Zaloguj się</h2>
          <p className="muted">Zaloguj się do ZUS przez mObywatel, aby pobrać swoje dane, albo załóż konto i uzupełnij je sam.</p>
          <div className="login-actions">
            <button className="btn btn-cta btn-block" onClick={() => setZusOpen(true)}>
              <Icon name="user" size={20} /> Zaloguj się do ZUS <span className="chev">›</span>
            </button>
            <Link href="/nowe-konto" className="btn btn-outline btn-block" data-guide="nowe-konto">Załóż konto <span className="chev">›</span></Link>
          </div>
          <small style={{ display: "block", marginTop: 8 }}>Załóż konto, jeśli nie chcesz pobierać danych z ZUS. Odpowiesz na kilka pytań, a czego nie wiesz, uzupełnisz później.</small>
          <div className="mt"><MockNotice /></div>

          <div className="or-sep"><span>albo szybkie logowanie</span></div>
          <div className="lbl2">Konta testowe (symulacja)</div>
          <p className="hint" style={{ margin: "4px 0 10px" }}>Fikcyjne osoby z przykładowymi danymi z ZUS. Kliknij, aby od razu się zalogować.</p>
          <div data-guide="login"><PersonaList accounts={accounts} onPick={login} /></div>
        </div>
      </div>
      </main>

      {zusOpen && !step && <ZusLoginModal accounts={accounts} onClose={() => setZusOpen(false)} onPick={login} />}

      {step && (
        <div className="modal-bg" role="dialog" aria-modal>
          <div className="modal" style={{ textAlign: "center" }}>
            <Logo size={52} />
            <h2 className="mt">{["Potwierdź logowanie w aplikacji mObywatel", "Pobieranie danych z ZUS…", "Gotowe"][step.phase]}</h2>
            <p className="muted">{step.acc.imie} {step.acc.nazwisko}</p>
            <div style={{ display: "grid", placeItems: "center", margin: "16px 0" }}>
              {step.phase < 2 ? <div className="spinner" /> : <span className="badge b-ok"><Icon name="check" size={14} /> Zalogowano</span>}
            </div>
            <small>{["Oczekiwanie na potwierdzenie w telefonie (symulacja)", "Okresy ubezpieczenia, podstawy wymiaru, e-ZLA, rozliczenia (symulacja)", "Przekierowanie do pulpitu"][step.phase]}</small>
          </div>
        </div>
      )}
    </div>
  );
}
