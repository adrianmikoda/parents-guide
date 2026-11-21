"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { api, useApp } from "@/components/AppContext";
import { loadApps, sendApp } from "@/lib/apps-client";
import { fmtDate, zl } from "@/lib/engine";

export default function Zus() {
  const { profile, session, loading } = useApp();
  const [tab, setTab] = useState("dane");
  const [focusAsk, setFocusAsk] = useState(false);
  // link z innej strony (np. Asystent → „Napisz wiadomość do ZUS”): /zus?tab=pytanie otwiera od razu formularz
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && ["dane", "ezla", "dlug", "zaswiadczenia", "pytanie"].includes(t)) { setTab(t); if (t === "pytanie") setFocusAsk(true); }
  }, []);
  const [ezla, setEzla] = useState<any[]>([]);
  const [debtDate, setDebtDate] = useState("");
  const [debt, setDebt] = useState<any>(null);
  const [q, setQ] = useState({ temat: "Zasiłek macierzyński", tresc: "" });
  const [qSent, setQSent] = useState<any>(null);
  const [cert, setCert] = useState({ rodzaj: "okresy", cel: "pracodawca", dostawa: "pue" });
  const [certs, setCerts] = useState<any[]>([]);
  const [certSent, setCertSent] = useState<any>(null);
  const who = session?.id ?? "";
  const loadCerts = () => setCerts(loadApps(who).filter((a) => a.typ === "zaswiadczenie"));

  useEffect(() => {
    if (!session) return;
    api("/api/zus/ezla").then((r) => setEzla(r.items || []));
    loadCerts();
    setDebtDate(profile?.person?.ciaza?.przewidywanyPorod || new Date().toISOString().slice(0, 10));
  }, [session, profile]);

  if (loading) return <div className="spinner" />;
  if (!session || !profile?.person)
    return (
      <div className="card" data-guide="t-zus-login" style={{ textAlign: "center", padding: 40 }}>
        <Icon name="building" size={40} />
        <h2 className="mt">Połącz się z PUE/eZUS</h2>
        <p className="muted">Zaloguj się przez mObywatel (symulacja), aby pobrać dane o ubezpieczeniu, e-ZLA i rozliczeniach.</p>
        <Link href="/" className="btn btn-primary">Zaloguj przez mObywatel</Link>
      </div>
    );

  const me = profile.person;
  return (
    <div>
      <div className="card mb">
        <div className="card-head">
          <div><h1 style={{ margin: 0 }}>PUE/eZUS – Twoje konto</h1><small>Źródło: {profile.source} · pobrano {new Date(profile.fetchedAt).toLocaleString("pl-PL")}</small></div>
          <a className="btn btn-outline" data-guide="zus-pue" href="https://www.zus.pl/portal/logowanie.npi" target="_blank" rel="noreferrer"><Icon name="link" size={16} /> Prawdziwe PUE/eZUS ↗</a>
        </div>
        <div className="pill-tabs" data-guide="t-zus-zakladki">
          {[["dane", "Ubezpieczenie"], ["ezla", `e-ZLA (${ezla.length})`], ["dlug", "Do uregulowania"], ["zaswiadczenia", "Zaświadczenia"], ["pytanie", "Zadaj pytanie"]].map(([k, l]) => <button key={k} data-guide={`zus-tab-${k}`} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}
        </div>
      </div>

      {tab === "dane" && (
        <div className="grid g2" style={{ alignItems: "start" }}>
          <div className="card" data-guide="t-zus-dane" style={{ margin: 0 }}>
            <h2>Dane ubezpieczonego</h2>
            <dl className="kv">
              <dt>Imię i nazwisko</dt><dd>{me.imie} {me.nazwisko}</dd>
              <dt>PESEL</dt><dd>{me.pesel}</dd>
              <dt>Tytuł ubezpieczenia</dt><dd>{me.tytulOpis}</dd>
              <dt>Ubezpieczenie chorobowe</dt><dd>{["umowa_o_prace", "zlecenie_chorobowe", "jdg_chorobowe"].includes(me.title) ? <span className="badge b-ok">Podlega od {fmtDate(me.ubezpieczenieOd)}</span> : <span className="badge b-no">Nie podlega</span>}</dd>
              {me.platnik && <><dt>Płatnik składek</dt><dd>{me.platnik.nazwa} (NIP {me.platnik.nip})</dd>
                <dt>Ubezpieczonych u płatnika</dt><dd>{me.platnik.liczbaUbezpieczonych} → zasiłki wypłaca: {profile.payer.wyplacaZasilki === "platnik" ? "płatnik" : "ZUS"}</dd></>}
              {me.umowaDo && <><dt>Umowa do</dt><dd>{fmtDate(me.umowaDo)}</dd></>}
              <dt>Składki opłacane terminowo</dt><dd>{me.skladkiTerminowo ? "Tak" : <span className="badge b-warn">Nie – sprawdź</span>}</dd>
            </dl>
            <div className="alert a-info mt"><Icon name="coins" size={18} /><span>Szacowana podstawa wymiaru zasiłku: <b>{zl(profile.base.base)}</b><br /><small>{profile.base.steps.join(" · ")}</small></span></div>
            <Link href="/kalkulator" className="btn btn-primary mt">Użyj w kalkulatorze</Link>
          </div>
          <div className="card" style={{ margin: 0 }}>
            <h2>{me.title.startsWith("jdg") ? "Zadeklarowane podstawy składek" : "Przychody (podstawa składek)"}</h2>
            <div className="tablewrap"><table><thead><tr><th>Miesiąc</th><th className="num">Kwota</th></tr></thead>
              <tbody>{me.przychody.map((m: any) => <tr key={m.miesiac}><td>{m.miesiac}</td><td className="num">{zl(m.kwota)}</td></tr>)}</tbody></table></div>
          </div>
        </div>
      )}

      {tab === "ezla" && (
        <div className="card">
          <h2>Zaświadczenia lekarskie e-ZLA</h2>
          {ezla.length === 0 && <p className="muted">Brak zaświadczeń lekarskich.</p>}
          <div className="list">
            {ezla.map((z) => (
              <div key={z.seria} className="li">
                <span className="ti" style={{ background: "var(--tint)", color: "var(--accent)", padding: 8, display: "grid" }}><Icon name="doc" size={20} /></span>
                <div className="grow">
                  <b>{z.seria}</b> <span className={`badge ${z.kod === "B" ? "b-ok" : "b-warn"}`}>kod {z.kod || "—"}</span><br />
                  <small>{fmtDate(z.od)} – {fmtDate(z.do)} ({z.dni} dni) · {z.przyczyna} · {z.lekarz}</small><br />
                  <small>Status: {z.status}</small>
                </div>
              </div>
            ))}
          </div>
          <Link href="/ciaza" className="btn btn-ghost mt">Sprawdź prawo do zasiłku chorobowego</Link>
        </div>
      )}

      {tab === "dlug" && (
        <div className="card">
          <h2>Zaświadczenie o stanie rozliczeń (symulacja)</h2>
          <p className="muted">Dla przedsiębiorców kluczowe są należności do uregulowania na dzień powstania prawa do zasiłku – zasiłek zostanie wypłacony dopiero po ich uregulowaniu.</p>
          <div className="row">
            <div className="field"><label htmlFor="zus-debt-date">Na dzień</label><input id="zus-debt-date" className="input" type="date" value={debtDate} onChange={(e) => setDebtDate(e.target.value)} /></div>
            <button className="btn btn-primary" style={{ alignSelf: "flex-end" }} onClick={async () => setDebt(await api(`/api/zus/debt?date=${debtDate}`))}>Wystaw zaświadczenie</button>
          </div>
          {debt && (
            <div className="mt paper">
              <div className="row" style={{ justifyContent: "space-between" }}><b>ZAŚWIADCZENIE nr {debt.numer}</b><small>wystawiono {fmtDate(debt.wystawiono)}</small></div>
              <p className="mt">Zakład Ubezpieczeń Społecznych (symulacja) zaświadcza, że {debt.osoba} (PESEL {debt.pesel}) według stanu na dzień <b>{fmtDate(debt.naDzien)}</b>:</p>
              <p><b>{debt.tresc}</b></p>
              {debt.struktura.length > 0 && <div className="tablewrap"><table><tbody>{debt.struktura.map((s: any) => <tr key={s.fundusz}><td>{s.fundusz}</td><td className="num">{zl(s.kwota)}</td></tr>)}</tbody></table></div>}
              <div className={`alert ${debt.zadluzenie ? "a-err" : "a-ok"} mt`}><Icon name={debt.zadluzenie ? "alert" : "check"} size={18} /><span>{debt.zadluzenie ? `Zasiłek zostanie wypłacony po uregulowaniu ${zl(debt.zadluzenie)}. Możesz zawrzeć układ ratalny.` : "Brak należności do uregulowania – nic nie wstrzymuje wypłaty zasiłku."}</span></div>
            </div>
          )}
        </div>
      )}

      {tab === "zaswiadczenia" && (() => {
        // kto wydaje: ZUS albo płatnik składek (zaświadczenie o zarobkach); zasiłki wypłaca pracodawca, gdy zgłasza > 20 osób
        const payerPays = profile.payer?.wyplacaZasilki === "platnik";
        const RODZAJE: { k: string; l: string; d: string; od: string; when?: boolean }[] = [
          { k: "okresy", l: "O okresach podlegania ubezpieczeniom", d: "Potwierdza, od kiedy i z jakiego tytułu masz ubezpieczenie (np. chorobowe).", od: "ZUS (PUE/eZUS)" },
          { k: "zasilki", l: "O wysokości wypłaconych zasiłków", d: "Np. do ośrodka pomocy społecznej, gminy lub banku.", od: payerPays ? "Płatnik składek (pracodawca)" : "ZUS (PUE/eZUS)" },
          { k: "niezaleganie", l: "O niezaleganiu w opłacaniu składek", d: "Dla przedsiębiorców – m.in. warunek wypłaty zasiłku.", od: "ZUS (PUE/eZUS)", when: me.title.startsWith("jdg") },
          { k: "Z-3", l: "O zarobkach do zasiłku (Z-3 / Z-3a)", d: "Wypełnia płatnik składek – potrzebne, gdy zasiłek wypłaca ZUS.", od: "Płatnik składek (pracodawca)", when: !!profile.payer },
          { k: "zatrudnienie", l: "O zatrudnieniu i wynagrodzeniu", d: "Od pracodawcy – np. do banku lub urzędu.", od: "Płatnik składek (pracodawca)", when: me.title === "umowa_o_prace" },
        ].filter((r) => r.when !== false);
        const sel = RODZAJE.find((r) => r.k === cert.rodzaj) ?? RODZAJE[0];
        const CELE: [string, string][] = [["pracodawca", "Dla pracodawcy"], ["ops", "Do ośrodka pomocy społecznej / gminy (świadczenia rodzinne)"], ["bank", "Do banku"], ["sad", "Do sądu"], ["zus", "Do wniosku o zasiłek w ZUS"], ["inny", "Inny cel"]];
        const DOSTAWA: [string, string][] = [["pue", "Elektronicznie – w PUE/eZUS"], ["poczta", "Pocztą na adres korespondencyjny"], ["placowka", "Odbiór w placówce"]];
        return (
          <div className="grid g2" style={{ alignItems: "start" }}>
            <div className="card" style={{ margin: 0 }} data-guide="t-zus-zaswiadczenia">
              <h2>Wystąp o zaświadczenie</h2>
              <div className="grid" style={{ gap: 12 }}>
                <div className="field"><label htmlFor="cert-r">Rodzaj zaświadczenia</label>
                  <select id="cert-r" className="input" value={sel.k} onChange={(e) => { setCert({ ...cert, rodzaj: e.target.value }); setCertSent(null); }}>
                    {RODZAJE.map((r) => <option key={r.k} value={r.k}>{r.l}</option>)}
                  </select>
                  <span className="hint">{sel.d} Wydaje: <b>{sel.od}</b>.</span>
                </div>
                <div className="field"><label htmlFor="cert-c">Cel</label>
                  <select id="cert-c" className="input" value={cert.cel} onChange={(e) => setCert({ ...cert, cel: e.target.value })}>{CELE.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                </div>
                <div className="field"><label htmlFor="cert-d">Sposób odbioru</label>
                  <select id="cert-d" className="input" value={cert.dostawa} onChange={(e) => setCert({ ...cert, dostawa: e.target.value })}>{DOSTAWA.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                </div>
                <button className="btn btn-primary" data-guide="zus-zaswiadczenie-wyslij" onClick={async () => {
                  try {
                    setCertSent(await sendApp(who, { typ: "zaswiadczenie", adresat: sel.od, dane: { rodzaj: sel.l, cel: CELE.find(([k]) => k === cert.cel)?.[1], odbior: DOSTAWA.find(([k]) => k === cert.dostawa)?.[1] } }));
                  } catch { setCertSent({ status: "Nie udało się wysłać – spróbuj ponownie", id: "—", upo: "" }); }
                  loadCerts();
                }}><Icon name="send" size={18} /> {sel.od.startsWith("ZUS") ? "Złóż wniosek do ZUS" : "Wyślij prośbę do pracodawcy"}</button>
                {certSent && <div className="alert a-ok"><Icon name="check" size={18} /><span>{certSent.status}. Nr sprawy: <b>{certSent.id}</b> · {certSent.upo}</span></div>}
              </div>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <h2>Twoje wnioski o zaświadczenia</h2>
              {certs.length ? (
                <div className="list">{certs.map((c) => <div key={c.id} className="li"><Icon name="doc" size={20} /><div className="grow"><b>{c.dane.rodzaj}</b><br /><small>{c.adresat} · {c.dane.cel} · {c.dane.odbior}</small><br /><small>{new Date(c.zlozono).toLocaleString("pl-PL")} · {c.status}</small></div></div>)}</div>
              ) : <p className="empty"><Icon name="info" size={18} /> Nie składano jeszcze wniosków w tej sesji.</p>}
              <p className="hint mt">Wersja demonstracyjna: wnioski nie trafiają do ZUS ani do pracodawcy. Prawdziwe zaświadczenie zamówisz w PUE/eZUS.</p>
            </div>
          </div>
        );
      })()}

      {tab === "pytanie" && (
        <div className="card">
          <h2>Zapytaj ZUS (symulacja e-wizyty / wiadomości PUE)</h2>
          <div className="grid" style={{ gap: 10 }}>
            <div className="field"><label htmlFor="zus-pytanie-temat">Temat</label>
              <select id="zus-pytanie-temat" className="input" value={q.temat} onChange={(e) => setQ({ ...q, temat: e.target.value })}>
                {["Zasiłek macierzyński", "Zasiłek chorobowy w ciąży", "Podstawa wymiaru", "Należności do uregulowania / układ ratalny", "Weryfikacja danych na koncie", "Inne"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="zus-pytanie-tresc">Treść</label><textarea id="zus-pytanie-tresc" className="input" rows={5} autoFocus={focusAsk} ref={(el) => { if (el && focusAsk) { el.scrollIntoView({ block: "center" }); setFocusAsk(false); } }} value={q.tresc} onChange={(e) => setQ({ ...q, tresc: e.target.value })} placeholder="Opisz swoją wątpliwość…" /></div>
            <button className="btn btn-primary" disabled={!q.tresc.trim()} onClick={async () => { try { setQSent(await sendApp(who, { typ: "pytanie_pue", dane: q })); } catch { setQSent({ status: "Nie udało się wysłać – spróbuj ponownie", id: "—" }); } }}><Icon name="send" size={18} /> Wyślij</button>
            {qSent && <div className="alert a-ok"><Icon name="check" size={18} /><span>{qSent.status}. Nr sprawy: {qSent.id}</span></div>}
          </div>
          <h3 className="mt2">Wiadomości z ZUS</h3>
          <div className="list">{profile.messages.map((m: any) => <div key={m.id} className="li"><Icon name="chat" size={20} /><div className="grow"><b>{m.temat}</b><br /><small>{fmtDate(m.data)} · {m.tresc}</small></div></div>)}</div>
          <p className="hint mt">Centrum Obsługi Telefonicznej ZUS: 22 560 16 00</p>
        </div>
      )}
    </div>
  );
}
