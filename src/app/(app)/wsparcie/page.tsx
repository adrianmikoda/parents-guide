"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { api } from "@/components/AppContext";

const AREAS: [string, string][] = [["", "Wszystkie"], ["strata", "Śmierć dziecka"], ["poronienie", "Poronienie"], ["wcześniak", "Wcześniak"], ["choroba dziecka", "Ciężka choroba dziecka"], ["za życiem", "„Za życiem”"]];

export default function Wsparcie() {
  const [area, setArea] = useState("");
  const [data, setData] = useState<any>({ orgs: [], links: [] });
  useEffect(() => { api(`/api/support${area ? `?obszar=${encodeURIComponent(area)}` : ""}`).then(setData); }, [area]);
  return (
    <div>
      <div className="card err mb" data-guide="t-wsparcie-trudne">
        <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
          <span style={{ color: "var(--red)" }}><Icon name="heart" size={28} /></span>
          <div style={{ flex: 1 }}>
            <h2>Jesteśmy z Tobą także w trudnych chwilach</h2>
            <p style={{ fontSize: 14 }}>Po urodzeniu martwego dziecka lub śmierci dziecka przysługuje zasiłek macierzyński (8 tygodni po porodzie, nie krócej niż 7 dni od zgonu). Po poronieniu prawo do świadczeń ustala się indywidualnie – zapytaj lekarza i ZUS. Poniżej organizacje o charakterze wyłącznie charytatywnym, które pomagają rodzicom.</p>
            <small>Pilna pomoc psychologiczna: Centrum Wsparcia dla Osób Dorosłych w Kryzysie Psychicznym – 800 70 2222 (całodobowo, bezpłatnie).</small>
          </div>
        </div>
      </div>
      <div className="pill-tabs mb">{AREAS.map(([k, l]) => <button key={k} className={area === k ? "on" : ""} onClick={() => setArea(k)}>{l}</button>)}</div>
      <div className="grid g2" data-guide="t-wsparcie-fundacje">
        {data.orgs.map((o: any) => (
          <div key={o.nazwa} className="card" style={{ margin: 0 }}>
            <h3>{o.nazwa}</h3>
            <p style={{ fontSize: 14 }}>{o.opis}</p>
            <div className="row">{o.obszary.map((a: string) => <span key={a} className="badge b-info">{a}</span>)}</div>
            <a className="btn btn-ghost mt" href={o.www} target="_blank" rel="noreferrer"><Icon name="link" size={16} /> {o.www.replace("https://", "")}</a>
          </div>
        ))}
      </div>
      <div className="section-title">Oficjalne źródła informacji</div>
      <div className="grid g3 tiles" data-guide="t-wsparcie-zrodla">
        {data.links.map((l: any) => (
          <a key={l.url} className="tile" href={l.url} target="_blank" rel="noreferrer">
            <span className="ti"><Icon name="link" /></span><b>{l.nazwa}</b><small className="muted">{l.opis}</small>
          </a>
        ))}
      </div>
      <p className="hint mt">Lista organizacji ma charakter informacyjny – w wersji produkcyjnej utrzymywana przez ZUS w panelu administracyjnym.</p>
    </div>
  );
}
