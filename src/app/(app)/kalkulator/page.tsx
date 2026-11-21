"use client";
import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import { api, useApp } from "@/components/AppContext";
import { Check, Notes, Num, PeriodsTable, Seg, Slider, Timeline } from "@/components/ui";
import { calculate, CalcInput, computeBase, diffDays, fmtDate, r2, Title, TITLE_LABELS, zl } from "@/lib/engine";
import ShareDialog from "@/components/Share";
import { defaultCalcInput } from "@/lib/cases";

type Loss = "brak" | "martwe" | "zgon";

function BaseHelper({ onApply }: { onApply: (b: number) => void }) {
  const { params } = useApp();
  const [title, setTitle] = useState<Title>("umowa_o_prace");
  const [avg, setAvg] = useState(7000);
  const [etat, setEtat] = useState(1);
  const res = computeBase({ title, months: [avg], etat }, params);
  return (
    <div className="card flat" style={{ background: "var(--bg)" }}>
      <div className="grid g3">
        <div className="field"><label>Tytuł</label>
          <select className="input" value={title} onChange={(e) => setTitle(e.target.value as Title)}>
            {(["umowa_o_prace", "zlecenie_chorobowe", "jdg_chorobowe"] as Title[]).map((t) => <option key={t} value={t}>{TITLE_LABELS[t]}</option>)}
          </select>
        </div>
        <Num label={title === "jdg_chorobowe" ? "Średnia zadeklarowana podstawa składek" : "Średni przychód brutto z 12 mies."} suffix="zł" value={avg} onChange={setAvg} />
        {title === "umowa_o_prace" && <Num label="Wymiar etatu" value={etat} step={0.25} min={0.25} max={1} onChange={setEtat} />}
      </div>
      <ul style={{ margin: "10px 0", paddingLeft: 18, fontSize: 13 }}>{res.steps.map((s, i) => <li key={i}>{s}</li>)}</ul>
      <button className="btn btn-ghost" type="button" onClick={() => onApply(res.base)}>Użyj podstawy {zl(res.base)}</button>
    </div>
  );
}

function Calculator() {
  const { params, profile, session } = useApp();
  const sp = useSearchParams();
  const [inp, setInp] = useState<CalcInput>(defaultCalcInput());
  const [loss, setLoss] = useState<Loss>("brak");
  const [helper, setHelper] = useState<"A" | "B" | null>(null);
  const [caseInfo, setCaseInfo] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const set = (patch: Partial<CalcInput>) => setInp((s) => ({ ...s, ...patch }));
  const setM = (patch: Partial<CalcInput["mother"]>) => setInp((s) => ({ ...s, mother: { ...s.mother, ...patch } }));
  const setF = (patch: Partial<CalcInput["father"]>) => setInp((s) => ({ ...s, father: { ...s.father, ...patch } }));

  // wczytanie sprawy testowej (?case=S01)
  useEffect(() => {
    const id = sp.get("case");
    if (!id) return;
    api(`/api/cases/${id}`).then((r) => {
      if (r.input) {
        setInp(r.input);
        setLoss(r.input.stillbirth ? "martwe" : r.input.childDeathDay != null ? "zgon" : "brak");
        setCaseInfo(`${r.case.id} – ${r.case.tytul}`);
      }
    });
  }, [sp]);

  // wczytanie planu z dokumentu (?base=&date=&children=)
  useEffect(() => {
    const b = sp.get("base");
    if (b) setM({ base: parseFloat(b) });
    const d = sp.get("date");
    if (d) set({ eventDate: d });
    const c = sp.get("children");
    if (c) set({ children: parseInt(c, 10) });
    if (sp.get("zaZyciem") === "1") set({ zaZyciem: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  function fromZus() {
    if (!profile?.person) return;
    const me = profile.person;
    const isMother = me.plec === "K";
    const myBase = profile.base.base;
    const partnerBase = profile.partner?.base ?? 0;
    setInp((s) => ({
      ...s,
      eventDate: me.przyjecie?.data || me.ciaza?.przewidywanyPorod || me.dzieci?.[0]?.dataUrodzenia || s.eventDate,
      scenario: me.przyjecie ? me.przyjecie.rodzaj : "porod",
      childAgeYears: me.przyjecie && me.dzieci?.[0]?.dataUrodzenia
        ? Math.max(0, Math.floor(diffDays(me.dzieci[0].dataUrodzenia, me.przyjecie.data || new Date().toISOString().slice(0, 10)) / 365.25))
        : s.childAgeYears,
      mother: { ...s.mother, base: isMother ? myBase : partnerBase, insured: isMother ? ["umowa_o_prace", "zlecenie_chorobowe", "jdg_chorobowe"].includes(me.title) : !!profile.partner },
      father: { ...s.father, base: isMother ? partnerBase : myBase, insured: isMother ? !!profile.partner : true },
    }));
    setCaseInfo(`Dane z ZUS: ${me.imie} ${me.nazwisko}${profile.partner ? ` + ${profile.partner.imie} ${profile.partner.nazwisko}` : ""}`);
  }

  const effective: CalcInput = useMemo(
    () => ({ ...inp, stillbirth: loss === "martwe", childDeathDay: loss === "zgon" ? (inp.childDeathDay ?? 20) : null }),
    [inp, loss]
  );
  const res = useMemo(() => calculate(effective, params), [effective, params]);
  const alt = useMemo(() => calculate({ ...effective, mother: { ...effective.mother, jednolity: !effective.mother.jednolity } }, params), [effective, params]);

  const W = params.wymiary;
  const adoptive = inp.scenario !== "porod";
  const n = Math.max(1, inp.children);
  const pool = inp.zaZyciem ? (n > 1 ? W.rodzicielskiZaZyciemWiele : W.rodzicielskiZaZyciemJedno) : n > 1 ? W.rodzicielskiWiele : W.rodzicielskiJedno;
  const bothInsured = inp.mother.insured && inp.father.insured;
  const maxOne = inp.fullPoolException ? pool : pool - W.nieprzenoszalnaCzescTygodnie;
  const macWeeks = (adoptive ? W.naWarunkachMacierzynskiego : W.macierzynski)[Math.min(n, 5) - 1];
  const maxTake = adoptive ? macWeeks : macWeeks - inp.mother.beforeBirthWeeks - W.macierzynskiObowiazkowoMatkaTygodnie;
  const net = params.kwoty.zaliczkaPitProcent;
  const L = res.labels;
  const shareText = () => {
    const who = (w: "A" | "B") => L[w];
    const lines = [
      `Przewodnik Rodzica – informacja o przysługujących zasiłkach (wyliczenie orientacyjne, ${fmtDate(new Date().toISOString().slice(0, 10))})`,
      "",
      `Łącznie (brutto): ${zl(res.totals.all)}`,
      `• ${who("A")}: ${zl(res.totals.A)} (${res.totals.daysA} dni)`,
      ...(res.totals.daysB ? [`• ${who("B")}: ${zl(res.totals.B)} (${res.totals.daysB} dni)`] : []),
      "",
      "Okresy:",
      ...res.periods.map((p) => `• ${who(p.who)} – ${p.label}: ${fmtDate(p.start)} – ${fmtDate(p.end)}, ${p.rate}% podstawy, ok. ${zl(p.monthly)} / mies.${p.workFraction ? ` (z pracą ${Math.round(p.workFraction * 100)}% etatu)` : ""}`),
      ...(res.deadlines.length ? ["", "Ważne terminy:", ...res.deadlines.map((d) => `• ${fmtDate(d.date)} – ${d.label}`)] : []),
      "",
      "Wyliczenie ma charakter informacyjny i nie stanowi decyzji ZUS ani pracodawcy.",
    ];
    return lines.join("\n");
  };

  const preset = (k: string) => {
    if (k === "matka") { setM({ rodzicielskiWeeks: maxOne }); setF({ rodzicielskiWeeks: bothInsured ? W.nieprzenoszalnaCzescTygodnie : 0, takeOverWeeks: 0 }); }
    if (k === "rowno") { const h = Math.floor(pool / 2); setM({ rodzicielskiWeeks: h }); setF({ rodzicielskiWeeks: pool - h, takeOverWeeks: 0 }); }
    if (k === "tata") { setM({ rodzicielskiWeeks: W.nieprzenoszalnaCzescTygodnie }); setF({ rodzicielskiWeeks: maxOne, takeOverWeeks: Math.max(0, maxTake) }); }
  };

  async function savePlan() {
    const r = await api("/api/applications", { typ: "plan_urlopow", adresat: "Moje dokumenty (zapis planu)", dane: { input: effective, totals: res.totals } });
    setSaved(r.application?.upo);
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr)", gap: 14 }}>
      <div className="card">
        <div className="card-head">
          <div>
            <h1 style={{ marginBottom: 2 }}>Zintegrowany kalkulator zasiłku macierzyńskiego</h1>
            <small>Okres trwania i wysokość – dla obojga rodziców, z pracą, przy adopcji i w sytuacjach szczególnych. Parametry v{params.version}.</small>
          </div>
          <div className="row">
            {session && <button className="btn btn-primary" data-guide="kalk-zus" onClick={fromZus}>Pobierz dane z ZUS</button>}
            <Link className="btn btn-outline" data-guide="kalk-sprawa" href="/sprawy">Wczytaj sprawę testową</Link>
          </div>
        </div>
        {caseInfo && <div className="alert a-ok"><Icon name="check" size={18} /> Wczytano: {caseInfo}</div>}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", alignItems: "start" }}>
        {/* ───── FORMULARZ ───── */}
        <div>
          <div className="card" data-guide="t-kalk-sytuacja">
            <h2>1. Sytuacja</h2>
            <Seg guide="kalk-sytuacja" value={inp.scenario} onChange={(v) => set({ scenario: v })} options={[["porod", "Urodzenie dziecka"], ["adopcja", "Przysposobienie"], ["zastepcza", "Rodzina zastępcza niezawodowa"]]} />
            <div className="grid g2 mt">
              <div className="field">
                <label>{adoptive ? "Data przyjęcia dziecka" : "Data porodu (przewidywana lub faktyczna)"}</label>
                <input className="input" type="date" value={inp.eventDate} onChange={(e) => set({ eventDate: e.target.value })} />
              </div>
              <Num label={adoptive ? "Liczba przyjętych dzieci" : "Liczba dzieci urodzonych przy jednym porodzie"} value={inp.children} min={1} max={6} onChange={(v) => set({ children: Math.max(1, Math.round(v)) })} />
              {adoptive && <Num label="Wiek dziecka" suffix="lat" value={inp.childAgeYears ?? 0} min={0} max={18} onChange={(v) => set({ childAgeYears: v })} />}
              {inp.scenario === "zastepcza" && <Check checked={!!inp.odroczenieSzkolne} onChange={(v) => set({ odroczenieSzkolne: v })} label="Odroczony obowiązek szkolny" hint={`limit wieku ${W.zastepczaMaxWiekOdroczenie} lat`} />}
            </div>
            <div className="grid mt" style={{ gap: 8 }}>
              <Check checked={inp.zaZyciem} onChange={(v) => set({ zaZyciem: v })} label="Dziecko ma zaświadczenie „Za życiem”" hint={`wydłużony urlop rodzicielski: ${n > 1 ? W.rodzicielskiZaZyciemWiele : W.rodzicielskiZaZyciemJedno} tyg.`} />
              {!adoptive && (
                <>
                  <Check checked={!!inp.premature?.enabled} onChange={(v) => set({ premature: { ...inp.premature!, enabled: v } })} label="Wcześniak lub hospitalizacja noworodka" hint="uzupełniający urlop macierzyński" />
                  {inp.premature?.enabled && (
                    <div className="grid g3" style={{ padding: "4px 4px 8px" }}>
                      <Num label="Tydzień ciąży przy porodzie" value={inp.premature.tydzienCiazy} min={20} max={42} onChange={(v) => set({ premature: { ...inp.premature!, tydzienCiazy: v } })} />
                      <Num label="Masa urodzeniowa" suffix="g" value={inp.premature.masa} onChange={(v) => set({ premature: { ...inp.premature!, masa: v } })} />
                      <Num label="Dni hospitalizacji" value={inp.premature.dniHospitalizacji} onChange={(v) => set({ premature: { ...inp.premature!, dniHospitalizacji: v } })} />
                      <div className="field"><label>Kto korzysta</label>
                        <Seg value={inp.premature.who} onChange={(v) => set({ premature: { ...inp.premature!, who: v } })} options={[["matka", "Matka"], ["ojciec", "Ojciec"]]} />
                      </div>
                    </div>
                  )}
                  <div className="field mt">
                    <label>Sytuacja szczególna</label>
                    <Seg guide="kalk-strata" value={loss} onChange={setLoss} options={[["brak", "Nie dotyczy"], ["martwe", "Martwe urodzenie"], ["zgon", "Zgon dziecka"]]} />
                    {loss === "zgon" && <Num label="Dzień życia dziecka, w którym nastąpił zgon" value={inp.childDeathDay ?? 20} min={0} onChange={(v) => set({ childDeathDay: v })} />}
                    {loss !== "brak" && <small>Bardzo nam przykro. Wsparcie znajdziesz w zakładce <Link href="/wsparcie">Wsparcie</Link>.</small>}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card" data-guide="t-kalk-podstawa">
            <h2>2. Ubezpieczenie i podstawa wymiaru</h2>
            <div className="grid g2">
              {(["A", "B"] as const).map((w) => {
                const par = w === "A" ? inp.mother : inp.father;
                const setP = w === "A" ? setM : setF;
                return (
                  <div key={w} className="grid" style={{ gap: 8 }}>
                    <b>{L[w]}</b>
                    <Check checked={par.insured} onChange={(v) => setP({ insured: v })} label="Podlega ubezpieczeniu chorobowemu" hint={adoptive ? "w dniu przyjęcia dziecka" : "w dniu porodu"} />
                    {par.insured && (
                      <>
                        <Num label="Podstawa wymiaru zasiłku" suffix="zł/mies." value={par.base} onChange={(v) => setP({ base: v })} />
                        <button type="button" className="btn btn-outline" onClick={() => setHelper(helper === w ? null : w)}><Icon name="calc" size={16} /> Oblicz z wynagrodzenia</button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {helper && <div className="mt"><BaseHelper onApply={(b) => { (helper === "A" ? setM : setF)({ base: b }); setHelper(null); }} /></div>}
          </div>

          {loss === "brak" && (
            <div className="card" data-guide="t-kalk-podzial">
              <h2>3. Podział urlopów</h2>
              <div className="row mb" data-guide="kalk-podzial">
                <small>Szybkie warianty:</small>
                <button className="btn btn-outline" style={{ minHeight: 34, padding: "6px 12px" }} onClick={() => preset("matka")}>Większość dla {adoptive ? "opiekuna 1" : "mamy"}</button>
                <button className="btn btn-outline" style={{ minHeight: 34, padding: "6px 12px" }} onClick={() => preset("rowno")}>Po równo</button>
                <button className="btn btn-outline" style={{ minHeight: 34, padding: "6px 12px" }} onClick={() => preset("tata")}>Maksymalnie dla {adoptive ? "opiekuna 2" : "taty"}</button>
              </div>
              {inp.mother.insured && (
                <div className="grid" style={{ gap: 12 }}>
                  <b>{L.A}</b>
                  {!adoptive && <Slider label="Część urlopu macierzyńskiego przed porodem" value={inp.mother.beforeBirthWeeks} min={0} max={W.przedPorodemMaxTygodnie} onChange={(v) => setM({ beforeBirthWeeks: v })} />}
                  <Check checked={inp.mother.jednolity} onChange={(v) => setM({ jednolity: v })} label={`Stawka jednolita ${params.stawki.jednolity}% za cały okres`} hint={`wniosek do ${params.terminy.jednolityWniosekDni} dni po ${adoptive ? "przyjęciu" : "porodzie"}`} />
                  <Slider label="Urlop rodzicielski" value={inp.mother.rodzicielskiWeeks} min={0} max={maxOne} onChange={(v) => setM({ rodzicielskiWeeks: v })} />
                  <div className="grid g2">
                    <div className="field" data-guide="kalk-praca"><label>Praca w trakcie rodzicielskiego</label>
                      <select className="input" value={inp.mother.workFraction} onChange={(e) => setM({ workFraction: parseFloat(e.target.value) })}>
                        <option value={0}>Bez pracy</option><option value={0.25}>¼ etatu</option><option value={1 / 3}>⅓ etatu</option><option value={0.5}>½ etatu</option>
                      </select>
                    </div>
                    {inp.mother.workFraction > 0 && <Num label="Wynagrodzenie za pełny etat" suffix="zł brutto" value={inp.mother.monthlyWage ?? 0} onChange={(v) => setM({ monthlyWage: v })} />}
                  </div>
                </div>
              )}
              {inp.father.insured && (
                <div className="grid mt2" style={{ gap: 12 }}>
                  <b>{L.B}</b>
                  {inp.mother.insured && maxTake > 0 && <Slider label={adoptive ? "Część urlopu na warunkach macierzyńskiego" : "Przejęcie części urlopu macierzyńskiego"} value={inp.father.takeOverWeeks} min={0} max={maxTake} onChange={(v) => setF({ takeOverWeeks: v })} />}
                  {inp.scenario !== "zastepcza" && (
                    <Check checked={inp.father.ojcowski} onChange={(v) => setF({ ojcowski: v })} label={`Urlop ojcowski – ${W.ojcowskiDni} dni (${params.stawki.ojcowski}%)`} hint={`do ukończenia przez dziecko ${W.ojcowskiDoMiesiacaZycia} mies.`} />
                  )}
                  {inp.father.ojcowski && inp.scenario !== "zastepcza" && (
                    <div className="field" data-guide="kalk-ojcowski"><label>Początek urlopu ojcowskiego</label>
                      <input className="input" type="date" value={inp.father.ojcowskiStart || inp.eventDate} onChange={(e) => setF({ ojcowskiStart: e.target.value })} />
                    </div>
                  )}
                  <Slider label="Urlop rodzicielski" value={inp.father.rodzicielskiWeeks} min={0} max={Math.min(maxOne, pool - (inp.mother.insured ? inp.mother.rodzicielskiWeeks : 0))} onChange={(v) => setF({ rodzicielskiWeeks: v })} />
                  <div className="grid g2">
                    <div className="field"><label>Praca w trakcie rodzicielskiego</label>
                      <select className="input" value={inp.father.workFraction} onChange={(e) => setF({ workFraction: parseFloat(e.target.value) })}>
                        <option value={0}>Bez pracy</option><option value={0.25}>¼ etatu</option><option value={1 / 3}>⅓ etatu</option><option value={0.5}>½ etatu</option>
                      </select>
                    </div>
                    {inp.father.workFraction > 0 && <Num label="Wynagrodzenie za pełny etat" suffix="zł brutto" value={inp.father.monthlyWage ?? 0} onChange={(v) => setF({ monthlyWage: v })} />}
                  </div>
                </div>
              )}
              <div className="grid mt2" style={{ gap: 8 }}>
                <div className="field"><label>Urlop rodzicielski rodziców</label>
                  <Seg guide="kalk-tryb" value={inp.rodzicielskiMode} onChange={(v) => set({ rodzicielskiMode: v })} options={[["kolejno", "Kolejno (po sobie)"], ["jednoczesnie", "Jednocześnie"]]} />
                </div>
                <Check checked={inp.fullPoolException} onChange={(v) => set({ fullPoolException: v })} label="Drugi rodzic nie może skorzystać z urlopu (wyjątek ustawowy)" hint="np. zgon, pozbawienie władzy rodzicielskiej – cała pula dla jednego rodzica" />
              </div>
            </div>
          )}
        </div>

        {/* ───── WYNIKI ───── */}
        <div style={{ position: "sticky", top: 74 }}>
          <div className="doccard">
            <div className="lbl">Łączny zasiłek macierzyński (brutto)</div>
            <div className="big">{zl(res.totals.all)}</div>
            <div className="row">
              <div><div className="lbl">{L.A}</div><div className="val">{zl(res.totals.A)}</div><small>{res.totals.daysA} dni</small></div>
              <div><div className="lbl">{L.B}</div><div className="val">{zl(res.totals.B)}</div><small>{res.totals.daysB} dni</small></div>
              <div><div className="lbl">ok. netto (−{net}% PIT)</div><div className="val">{zl(r2(res.totals.all * (1 - net / 100)))}</div></div>
            </div>
          </div>

          <div className="card" data-guide="t-kalk-plan">
            <Notes res={{ errors: res.errors }} />
            {res.ok && (
              <>
                <h2>Plan urlopów</h2>
                <Timeline res={res} />
              </>
            )}
          </div>

          {res.ok && (
            <>
              <div className="card">
                <h2>Szczegóły okresów</h2>
                <PeriodsTable res={res} netPct={net} />
                {(inp.mother.workFraction > 0 && (inp.mother.monthlyWage ?? 0) > 0) && (
                  <div className="alert a-ok mt"><Icon name="coins" size={18} />
                    <span>Dochód {L.A} przy łączeniu z pracą: zasiłek {zl(res.periods.find((p) => p.who === "A" && p.type === "rodzicielski")?.monthly ?? 0)} + wynagrodzenie {zl(r2((inp.mother.monthlyWage ?? 0) * inp.mother.workFraction))} brutto/mies.</span>
                  </div>
                )}
                {(inp.father.workFraction > 0 && (inp.father.monthlyWage ?? 0) > 0) && (
                  <div className="alert a-ok mt"><Icon name="coins" size={18} />
                    <span>Dochód {L.B} przy łączeniu z pracą: zasiłek {zl(res.periods.find((p) => p.who === "B" && p.type === "rodzicielski")?.monthly ?? 0)} + wynagrodzenie {zl(r2((inp.father.monthlyWage ?? 0) * inp.father.workFraction))} brutto/mies.</span>
                  </div>
                )}
              </div>

              {loss === "brak" && inp.mother.insured && (
                <div className="card" data-guide="t-kalk-porownanie">
                  <h2>Porównanie: 100% + {params.stawki.rodzicielski}% czy {params.stawki.jednolity}%?</h2>
                  <div className="grid g2">
                    {[{ r: inp.mother.jednolity ? alt : res, t: `100% / ${params.stawki.rodzicielski}%` }, { r: inp.mother.jednolity ? res : alt, t: `${params.stawki.jednolity}% przez cały okres` }].map((x) => (
                      <div key={x.t} className="stat card flat">
                        <span className="l">{x.t}</span>
                        <span className="v">{zl(x.r.totals.A)}</span>
                        <span className="l">{L.A} · pierwszy miesiąc: {zl(x.r.periods.find((p) => p.who === "A")?.monthly ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                  <small>Przy pełnym wykorzystaniu urlopu łączna kwota jest zbliżona – {params.stawki.jednolity}% daje równe raty, 100% / {params.stawki.rodzicielski}% – więcej na początku.</small>
                </div>
              )}

              <div className="card" data-guide="t-kalk-terminy">
                <h2>Ważne terminy</h2>
                <div className="list">
                  {res.deadlines.map((d, i) => (
                    <div key={i} className="li"><Icon name="calendar" size={20} /><div className="grow">{d.label}</div><b>{fmtDate(d.date)}</b></div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h2>Co warto wiedzieć</h2>
                <Notes res={{ warnings: res.warnings, info: res.info }} />
                <div className="kv mt">
                  {Object.entries(res.limits).map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}
                </div>
              </div>
              <div className="row noprint">
                <Link href="/wnioski" className="btn btn-primary" data-guide="kalk-wnioski"><Icon name="doc" size={18} /> Przygotuj wnioski</Link>
                <button className="btn btn-outline" data-guide="kalk-drukuj" onClick={() => window.print()}><Icon name="print" size={18} /> Drukuj plan</button>
                <button className="btn btn-outline" data-guide="kalk-udostepnij" onClick={() => setSharing(true)}><Icon name="send" size={18} /> Udostępnij</button>
                <button className="btn btn-ghost" data-guide="kalk-zapisz" onClick={savePlan}>Zapisz plan</button>
                {saved && <span className="badge b-ok">Zapisano ({saved})</span>}
              </div>
              {sharing && <ShareDialog title="Przewodnik Rodzica – przysługujące zasiłki" text={shareText()} onClose={() => setSharing(false)} />}
            </>
          )}
          <p className="hint mt">Wyliczenie ma charakter informacyjny i nie stanowi decyzji. Kwoty dzienne zaokrąglono do grosza; zasiłek za pełny miesiąc = 30 × stawka dzienna. Netto – orientacyjnie (zaliczka PIT {net}%, bez kwoty zmniejszającej).</p>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div className="spinner" />}><Calculator /></Suspense>;
}
