"use client";
import Link from "next/link";
import Icon from "@/components/Icon";
import { useApp } from "@/components/AppContext";
import { Status } from "@/components/ui";
import { MISSING_LABELS } from "@/lib/quiz";
import { addDays, diffDays, fmtDate, hasSicknessInsurance, zl } from "@/lib/engine";

const TILES = [
  ["/kalkulator", "calc", "Kalkulator zasiłku", "Okres i wysokość dla obojga rodziców"],
  ["/ciaza", "pregnant", "Świadczenia w ciąży", "Zasiłek chorobowy, rehabilitacyjne, utrata pracy"],
  ["/wnioski", "doc", "Wnioski", "Urlopy, ZAM, odpis aktu urodzenia"],
  ["/zus", "building", "Moje dane z ZUS", "Ubezpieczenie, e-ZLA, należności do uregulowania, PUE"],
  ["/sprawy", "folder", "Sprawy testowe", "Wgraj wniosek PDF lub wybierz przykład"],
  ["/ryzyka", "alert", "Ryzyka", "Co może obniżyć lub odebrać zasiłek"],
  ["/wsparcie", "heart", "Wsparcie", "Sytuacje trudne, fundacje, linki"],
  ["/asystent", "infopoint", "Asystent", "Zadaj pytanie o swoje uprawnienia"],
];

export default function Pulpit() {
  const { session, profile, loading } = useApp();
  const me = profile?.person;
  const today = new Date().toISOString().slice(0, 10);
  const due = me?.ciaza?.przewidywanyPorod;
  const week = me?.ciaza ? Math.floor(diffDays(me.ciaza.poczatek, today) / 7) + 2 : null;
  const insured = me ? hasSicknessInsurance(me.title) : false;

  const steps = due
    ? [
        { d: today, t: "Sprawdź dane w ZUS i ryzyka", href: "/zus" },
        { d: addDays(due, -42), t: "Najwcześniejszy start urlopu macierzyńskiego (6 tyg. przed porodem)", href: "/kalkulator" },
        { d: due, t: "Przewidywana data porodu – zarejestruj urodzenie w USC", href: "/wnioski" },
        { d: addDays(due, 21), t: "Ostatni dzień na wniosek o 81,5% / rodzicielski bezpośrednio po macierzyńskim", href: "/wnioski" },
        { d: addDays(due, 365), t: "Ostatni moment na urlop ojcowski (12 mies.)", href: "/kalkulator" },
      ]
    : [];

  return (
    <div>
      <h1 className="display">{me ? `Dzień dobry, ${me.imie}` : "Sprawdź, co Ci przysługuje"}</h1>
      <p className="muted" style={{ fontSize: 17, maxWidth: 680, marginBottom: 24 }}>
        Zasiłki z ubezpieczenia chorobowego w ciąży i rodzicielstwie: uprawnienia, wysokość, urlopy obojga rodziców i wnioski w jednym miejscu.
      </p>
      {!loading && !session && (
        <div className="card info mb">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <h2 style={{ marginBottom: 2 }}>Zaloguj się, aby zobaczyć swoje uprawnienia</h2>
              <small>Po zalogowaniu przez mObywatel (symulacja) pobierzemy dane o ubezpieczeniu, podstawie wymiaru i e-ZLA.</small>
            </div>
            <Link href="/" className="btn btn-cta">Zaloguj przez mObywatel <span className="chev">›</span></Link>
          </div>
        </div>
      )}

      {profile?.wlasne && profile.brakujace?.length > 0 && (
        <div className="card warn mb">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 320px" }}>
              <h2 style={{ marginBottom: 4 }}>Uzupełnij swoje dane</h2>
              <small>Konto założone bez danych z ZUS. Brakuje kilku informacji – bez nich wyliczenia i terminy są przybliżone.</small>
              <div className="missing-chips">{profile.brakujace.map((id: string) => <span key={id} className="badge b-warn">{MISSING_LABELS[id] ?? id}</span>)}</div>
            </div>
            <Link href="/nowe-konto?uzupelnij=1" className="btn btn-primary" data-guide="konto-uzupelnij">Odpowiedz na {profile.brakujace.length} {profile.brakujace.length === 1 ? "pytanie" : profile.brakujace.length < 5 ? "pytania" : "pytań"} <span className="chev">›</span></Link>
          </div>
        </div>
      )}

      {profile?.person && !(profile.wlasne && profile.brakujace?.length) && (
        <div className="card flat mb row" style={{ justifyContent: "space-between" }}>
          <small>
            {profile.wlasne ? "Twoje dane pochodzą z ankiety, nie z ZUS." : "Dane pobrane z ZUS (symulacja)."}
            {profile.nadpisane?.length > 0 && ` Poprawione przez Ciebie pola: ${profile.nadpisane.length}.`}
          </small>
          <Link href="/profil" className="more">Mój profil – popraw dane <span aria-hidden>→</span></Link>
        </div>
      )}

      {me && (
        <>
          <div className="doccard" data-guide="t-pulpit-karta">
            <div className="row" style={{ justifyContent: "space-between", marginTop: 0 }}>
              <span className="chip"><Icon name="baby" size={14} /> Karta Przyszłego Rodzica</span>
              <span className="chip">{insured ? "✓ Ubezpieczenie chorobowe" : "✕ Brak ubezpieczenia chorobowego"}</span>
            </div>
            <div className="row" style={{ marginTop: 18 }}>
              <div><div className="lbl">Imię i nazwisko</div><div className="big" style={{ fontSize: 22 }}>{me.imie} {me.nazwisko}</div></div>
            </div>
            <div className="row">
              {due && <div><div className="lbl">Przewidywany poród</div><div className="val">{fmtDate(due)}</div></div>}
              {week != null && <div><div className="lbl">Tydzień ciąży</div><div className="val">{week}.</div></div>}
              <div><div className="lbl">Tytuł ubezpieczenia</div><div className="val" style={{ fontSize: 14 }}>{profile.person.tytulLabel}</div></div>
              <div><div className="lbl">Podstawa wymiaru (szac.)</div><div className="val">{zl(profile.base.base)}</div></div>
              <div><div className="lbl">Zasiłek wypłaca</div><div className="val">{profile.payer ? (profile.payer.wyplacaZasilki === "platnik" ? "Pracodawca / płatnik" : "ZUS") : "ZUS"}</div></div>
            </div>
          </div>

          <div className="grid g2 mt">
            <div className="card" data-guide="t-pulpit-kroki">
              <div className="card-head"><h2 style={{ margin: 0 }}>Twoje najbliższe kroki</h2><Icon name="calendar" /></div>
              {steps.length ? (
                <div className="list">
                  {steps.map((s, i) => (
                    <Link key={i} href={s.href} className="li" style={{ textDecoration: "none", color: "inherit" }}>
                      <span className="badge b-info" style={{ minWidth: 92, justifyContent: "center" }}>{fmtDate(s.d)}</span>
                      <span className="grow">{s.t}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="muted">Brak danych o ciąży. {me.dzieci.length ? `Dziecko: ${me.dzieci[0].imie}, ur. ${fmtDate(me.dzieci[0].dataUrodzenia)} – sprawdź kalkulator adopcyjny.` : "Wpisz przewidywaną datę porodu w kalkulatorze."}</p>
              )}
              <div className="card-foot"><Link href="/kalkulator">Pokaż plan urlopów <span aria-hidden>→</span></Link></div>
            </div>
            <div className="card" data-guide="t-pulpit-ryzyka">
              <div className="card-head"><h2 style={{ margin: 0 }}>Na co uważać</h2><Icon name="alert" /></div>
              <div className="list">
                {profile.risks.filter((r: any) => r.level !== "niskie").slice(0, 3).map((r: any, i: number) => (
                  <div key={i} className="li"><Status s={r.level} /><div className="grow"><b style={{ fontSize: 14 }}>{r.title}</b><br /><small>{r.action}</small></div></div>
                ))}
                {!profile.risks.filter((r: any) => r.level !== "niskie").length && <div className="alert a-ok"><Icon name="check" size={18} /> Nie wykryto istotnych ryzyk w Twoich danych.</div>}
              </div>
              <div className="card-foot"><Link href="/ryzyka">Pokaż wszystkie <span aria-hidden>→</span></Link></div>
            </div>
          </div>
        </>
      )}

      <div className="section-title">Usługi</div>
      <div className="grid g4 tiles" data-guide="t-pulpit-uslugi">
        {TILES.map(([href, icon, t, d], i) => (
          <Link key={href} href={href} className={`tile ${i === 0 ? "featured" : ""}`}>
            <span className="ti"><Icon name={icon} /></span>
            <b>{t}</b>
            <small className="muted">{d}</small>
          </Link>
        ))}
      </div>

      <div className="section-title">Najczęstsze sytuacje</div>
      <div className="grid g3">
        {[
          ["Pracuję na etacie i spodziewam się dziecka", "/kalkulator?case=S01"],
          ["Chcę dostawać równe 81,5% przez cały rok", "/kalkulator?case=S02"],
          ["Prowadzę działalność gospodarczą", "/kalkulator?case=S03"],
          ["Urodził się wcześniak", "/kalkulator?case=S06"],
          ["Chcemy podzielić się opieką", "/kalkulator?case=S07"],
          ["Chcę wrócić do pracy na pół etatu", "/kalkulator?case=S08"],
        ].map(([t, h]) => (
          <Link key={h} href={h} className="card flat" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 12, margin: 0, fontWeight: 700 }}>
            <span style={{ color: "var(--green-700)", display: "inline-flex" }}><Icon name="info" size={20} /></span> <span style={{ flex: 1 }}>{t}</span> <span style={{ transform: "rotate(180deg)", display: "inline-flex", color: "var(--green-700)" }}><Icon name="back" size={18} /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
