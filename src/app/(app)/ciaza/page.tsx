"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { useApp } from "@/components/AppContext";
import { Check, Num, Status } from "@/components/ui";
import { assessRisks, PregnancyInput, pregnancyBenefits, Title, TITLE_LABELS, zl } from "@/lib/engine";

const init: PregnancyInput = {
  title: "umowa_o_prace",
  insuranceStart: "2024-01-01",
  zlaStart: new Date().toISOString().slice(0, 10),
  zlaDays: 30,
  kodB: true,
  age50: false,
  priorInsuranceCounts: false,
  insuredAtPayer: 50,
  base: 6000,
  dueDate: "2027-04-15",
  contractKind: "nieokreslony",
  terminationReason: "brak",
  debt: 0,
  sickDaysUsedThisYear: 0,
};

export default function Ciaza() {
  const { params, profile } = useApp();
  const [inp, setInp] = useState<PregnancyInput>(init);
  const set = (p: Partial<PregnancyInput>) => setInp((s) => ({ ...s, ...p }));

  function fromZus() {
    const me = profile?.person;
    if (!me) return;
    const z = me.ezla[0];
    set({
      title: me.title,
      insuranceStart: me.ubezpieczenieOd,
      insuredAtPayer: me.platnik?.liczbaUbezpieczonych ?? 0,
      base: profile.base.base,
      dueDate: me.ciaza?.przewidywanyPorod ?? inp.dueDate,
      contractKind: me.rodzajUmowy,
      contractEnd: me.ustanieZatrudnienia?.data ?? me.umowaDo,
      ...(me.ustanieZatrudnienia ? { terminationReason: me.ustanieZatrudnienia.powod } : {}),
      debt: me.zadluzenie,
      ...(z ? { zlaStart: z.od, zlaDays: Math.round((+new Date(z.do) - +new Date(z.od)) / 864e5) + 1, kodB: z.kod === "B" } : {}),
    });
  }
  useEffect(() => { if (profile?.person) fromZus(); /* eslint-disable-next-line */ }, [profile]);

  const benefits = useMemo(() => pregnancyBenefits(inp, params), [inp, params]);
  const risks = useMemo(() => assessRisks({ title: inp.title, insuranceStart: inp.insuranceStart, dueDate: inp.dueDate, contractEnd: inp.contractEnd, contractKind: inp.contractKind, debt: inp.debt, zlaWithoutB: !inp.kodB }, params).filter((r) => r.level !== "niskie"), [inp, params]);
  const emp = inp.title === "umowa_o_prace";

  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", alignItems: "start" }}>
      <div>
        <div className="card" data-guide="t-ciaza-dane">
          <div className="card-head">
            <h1 style={{ margin: 0 }}>Świadczenia w czasie ciąży</h1>
            {profile && <button className="btn btn-ghost" data-guide="ciaza-zus" onClick={fromZus}><Icon name="building" size={18} /> Dane z ZUS i e-ZLA</button>}
          </div>
          <p className="muted">Zasiłek chorobowy, świadczenie rehabilitacyjne i zasiłek w wysokości zasiłku macierzyńskiego – także informacja, gdy prawo nie przysługuje.</p>
          <div className="grid" style={{ gap: 12 }}>
            <div className="field"><label>Tytuł ubezpieczenia</label>
              <select className="input" value={inp.title} onChange={(e) => set({ title: e.target.value as Title })}>
                {Object.entries(TITLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="grid g2">
              <div className="field"><label>Ubezpieczenie chorobowe od</label><input className="input" type="date" value={inp.insuranceStart} onChange={(e) => set({ insuranceStart: e.target.value })} /></div>
              <div className="field"><label>Przewidywana data porodu</label><input className="input" type="date" value={inp.dueDate} onChange={(e) => set({ dueDate: e.target.value })} /></div>
              <div className="field"><label>Początek zwolnienia (e-ZLA)</label><input className="input" type="date" value={inp.zlaStart} onChange={(e) => set({ zlaStart: e.target.value })} /></div>
              <Num label="Długość zwolnienia" suffix="dni" value={inp.zlaDays} onChange={(v) => set({ zlaDays: v })} />
              <Num label="Podstawa wymiaru zasiłku" suffix="zł" value={inp.base} onChange={(v) => set({ base: v })} hint="przychód po potrąceniu 13,71%" />
              {inp.title !== "jdg_chorobowe" && inp.title !== "jdg_bez" && <Num label="Płatnik zgłasza do ubezp. chorobowego" suffix="osób" value={inp.insuredAtPayer} onChange={(v) => set({ insuredAtPayer: v })} hint={`> ${params.kwoty.progPlatnikaUbezpieczonych} → zasiłek wypłaca płatnik`} />}
              {emp && <Num label="Dni choroby wykorzystane w tym roku" value={inp.sickDaysUsedThisYear} onChange={(v) => set({ sickDaysUsedThisYear: v })} />}
              {(inp.title === "jdg_chorobowe" || inp.title === "jdg_bez") && <Num label="Składki do uregulowania" suffix="zł" value={inp.debt} onChange={(v) => set({ debt: v })} />}
            </div>
            <Check checked={inp.kodB} onChange={(v) => set({ kodB: v })} label="Na e-ZLA jest kod „B” (ciąża)" />
            <Check checked={inp.priorInsuranceCounts} onChange={(v) => set({ priorInsuranceCounts: v })} label="Wcześniejsze ubezpieczenie z przerwą do 30 dni / inne wyłączenie okresu wyczekiwania" hint="np. absolwent do 90 dni od ukończenia szkoły, 10 lat ubezpieczenia obowiązkowego" />
            {emp && <Check checked={inp.age50} onChange={(v) => set({ age50: v })} label="Ukończone 50 lat" />}
            {emp && (
              <div className="grid g2">
                <div className="field"><label>Rodzaj umowy o pracę</label>
                  <select className="input" value={inp.contractKind} onChange={(e) => set({ contractKind: e.target.value as PregnancyInput["contractKind"] })}>
                    <option value="nieokreslony">Na czas nieokreślony</option><option value="okreslony">Na czas określony</option><option value="probny">Na okres próbny</option>
                  </select>
                </div>
                <div className="field"><label>Rozwiązanie umowy w ciąży</label>
                  <select className="input" value={inp.terminationReason} onChange={(e) => set({ terminationReason: e.target.value as PregnancyInput["terminationReason"] })}>
                    <option value="brak">Nie dotyczy</option><option value="upadlosc">Upadłość pracodawcy</option><option value="likwidacja">Likwidacja pracodawcy</option><option value="smierc_pracodawcy">Śmierć pracodawcy</option><option value="naruszenie_prawa">Z naruszeniem prawa (wyrok sądu)</option><option value="inne">Inna przyczyna</option>
                  </select>
                </div>
                {inp.terminationReason !== "brak" && <div className="field"><label>Data rozwiązania umowy</label><input className="input" type="date" value={inp.contractEnd ?? ""} onChange={(e) => set({ contractEnd: e.target.value })} /></div>}
              </div>
            )}
            {!emp && <div className="field"><label>Data zakończenia umowy / działalności (jeśli planowana)</label><input className="input" type="date" value={inp.contractEnd ?? ""} onChange={(e) => set({ contractEnd: e.target.value || undefined })} /></div>}
          </div>
        </div>
      </div>

      <div data-guide="t-ciaza-swiadczenie">
        {benefits.map((b) => (
          <div key={b.key} className="card">
            <div className="card-head"><h2 style={{ margin: 0 }}>{b.name}</h2><Status s={b.status} /></div>
            <p><b>{b.summary}</b></p>
            {b.amount && b.status !== "nie_przysluguje" && (
              <div className="grid g3 mb">
                <div className="stat"><span className="v">{zl(b.amount.daily)}</span><span className="l">dziennie brutto</span></div>
                <div className="stat"><span className="v">{zl(b.amount.monthly)}</span><span className="l">miesięcznie brutto</span></div>
                {b.amount.total != null && <div className="stat"><span className="v">{zl(b.amount.total)}</span><span className="l">za to zwolnienie (zasiłek)</span></div>}
              </div>
            )}
            <ul style={{ paddingLeft: 18, margin: 0, fontSize: 14 }}>{b.details.map((d, i) => <li key={i} style={{ marginBottom: 4 }}>{d}</li>)}</ul>
          </div>
        ))}
        {risks.length > 0 && (
          <div className="card" data-guide="t-ciaza-ryzyka">
            <h2>Ryzyka w Twojej sytuacji</h2>
            {risks.map((r, i) => <div key={i} className={`alert ${r.level === "wysokie" ? "a-err" : "a-warn"}`}><Icon name="alert" size={18} /><span><b>{r.title}.</b> {r.text}</span></div>)}
          </div>
        )}
        <div className="row">
          <Link className="btn btn-primary" href="/wnioski">Jakie dokumenty złożyć?</Link>
          <Link className="btn btn-outline" href="/kalkulator">Policz zasiłek macierzyński</Link>
        </div>
      </div>
    </div>
  );
}
