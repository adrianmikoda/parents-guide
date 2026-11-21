"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { useApp } from "@/components/AppContext";
import { A11yButtons } from "@/components/Shell";
import { Check } from "@/components/ui";
import { setGuideEnabled, startTutorial, useGuideEnabled } from "@/components/FloatingGuide";

const ITEMS = [
  ["/profil", "user", "Mój profil – sytuacja rodzinna i poprawki danych"],
  ["/ciaza", "pregnant", "Świadczenia w ciąży"],
  ["/ryzyka", "alert", "Ryzyka i zagrożenia"],
  ["/wsparcie", "heart", "Wsparcie i fundacje"],
  ["/asystent", "infopoint", "Asystent"],
  ["/admin", "settings", "Panel administracyjny"],
];

export default function Wiecej() {
  const { session, logout } = useApp();
  const router = useRouter();
  const guideOn = useGuideEnabled();
  return (
    <div>
    <div className="card mb">
      <h2>Wygląd i dostępność</h2>
      <p className="hint">Powiększenie tekstu, wysoki kontrast oraz motyw jasny lub ciemny.</p>
      <A11yButtons />
      <div className="row mt"><button className="btn btn-outline" onClick={startTutorial}>Uruchom samouczek <span className="chev">›</span></button></div>
      <div className="mt">
        <Check checked={!!guideOn} onChange={setGuideEnabled} label="Pomocnik „Gdzie kliknąć?”" hint="Pływający przycisk: zapytaj, a pomocnik zakreśli na ekranie, co kliknąć." />
      </div>
    </div>
    <div className="card">
      <div className="list">
        {ITEMS.map(([h, i, l]) => (
          <Link key={h} href={h} data-guide={`nav:${h}`} className="li" style={{ textDecoration: "none", color: "inherit", alignItems: "center" }}>
            <span style={{ color: "var(--accent)", display: "inline-flex" }}><Icon name={i} /></span><span className="grow">{l}</span>
            <span style={{ transform: "rotate(180deg)", display: "inline-flex" }}><Icon name="back" size={18} /></span>
          </Link>
        ))}
        {session?.wlasne && (
          <Link href="/nowe-konto?uzupelnij=1" className="li" style={{ textDecoration: "none", color: "inherit", alignItems: "center" }}>
            <span style={{ color: "var(--accent)", display: "inline-flex" }}><Icon name="user" /></span><span className="grow">Uzupełnij lub popraw moje dane</span>
          </Link>
        )}
        {session ? (
          <button className="li" style={{ border: 0, background: "none", cursor: "pointer", textAlign: "left", font: "inherit", color: "var(--red)" }} onClick={async () => { await logout(); router.push("/"); }}>
            <Icon name="logout" /><span className="grow">Wyloguj ({session.imie} {session.nazwisko})</span>
          </button>
        ) : (
          <Link href="/" className="li" style={{ textDecoration: "none" }}><Icon name="user" /><span className="grow">Zaloguj przez mObywatel</span></Link>
        )}
      </div>
    </div>
    </div>
  );
}
