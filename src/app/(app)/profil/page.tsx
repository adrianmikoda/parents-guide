"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { api, useApp } from "@/components/AppContext";
import { Answers, QUESTIONS } from "@/lib/quiz";
import { TITLE_LABELS, diffDays, fmtDate } from "@/lib/engine";
import type { Params } from "@/lib/params";

type Key = keyof Answers;
type Field = { key: Key; label: string; type: "text" | "date" | "number" | "select" | "bool"; options?: [string, string][]; suffix?: string; hint?: string; when?: (a: Answers) => boolean; guide?: string };

const opts = (field: Key): [string, string][] =>
  (QUESTIONS.find((q) => q.field === field)?.options ?? []).map((o) => [o.value, o.hint ? `${o.label} (${o.hint})` : o.label]);
const employee = (a: Answers) => a.title === "umowa_o_prace";
const hasJob = (a: Answers) => !!a.title && !["brak", "dzielo", "jdg_chorobowe", "jdg_bez"].includes(a.title);
const selfEmp = (a: Answers) => a.title === "jdg_chorobowe" || a.title === "jdg_bez";
const taking = (a: Answers) => a.sytuacja === "adopcja" || a.sytuacja === "zastepcza";

const GROUPS: { title: string; guide?: string; fields: Field[] }[] = [
  { title: "Dane osobowe", fields: [
    { key: "imie", label: "Imię", type: "text" },
    { key: "nazwisko", label: "Nazwisko", type: "text" },
    { key: "pesel", label: "PESEL", type: "text", hint: "11 cyfr" },
    { key: "plec", label: "Rola", type: "select", options: [["K", "Mama / przyszła mama"], ["M", "Tata / przyszły tata"]] },
  ] },
  { title: "Sytuacja rodzinna", guide: "profil-sytuacja", fields: [
    { key: "sytuacja", label: "Etap", type: "select", options: opts("sytuacja") },
    { key: "termin", label: "Planowana data porodu", type: "date", when: (a) => a.sytuacja === "ciaza", guide: "profil-termin", hint: "z karty ciąży lub zaświadczenia lekarskiego" },
    { key: "dzieckoData", label: "Data urodzenia dziecka", type: "date", when: (a) => a.sytuacja === "dziecko" },
    { key: "dzieckoData", label: "Data przyjęcia dziecka na wychowanie", type: "date", when: taking, hint: "przy adopcji – w związku z wnioskiem o przysposobienie; w rodzinie zastępczej – data umieszczenia" },
    { key: "dzieckoUrodzenie", label: "Data urodzenia przyjętego dziecka", type: "date", when: taking },
  ] },
  { title: "Zatrudnienie i ubezpieczenie", fields: [
    { key: "title", label: "Forma zatrudnienia", type: "select", options: (Object.keys(TITLE_LABELS) as (keyof typeof TITLE_LABELS)[]).map((k) => [k, TITLE_LABELS[k]]) },
    { key: "ubezpieczenieOd", label: "Ubezpieczenie od", type: "date" },
    { key: "rodzajUmowy", label: "Rodzaj umowy o pracę", type: "select", options: opts("rodzajUmowy"), when: employee },
    { key: "umowaDo", label: "Umowa do", type: "date", when: (a) => employee(a) && a.rodzajUmowy !== "nieokreslony" },
    { key: "etat", label: "Wymiar etatu", type: "select", options: opts("etat"), when: employee },
    { key: "liczbaUbezpieczonych", label: "Liczba ubezpieczonych u płatnika", type: "number", suffix: "osób", when: hasJob, hint: "powyżej 20 – zasiłek wypłaca pracodawca" },
    { key: "zarobki", label: "Średni przychód / podstawa składek", type: "number", suffix: "zł / mies.", hint: "nadpisanie zastępuje przychody z 12 miesięcy tą kwotą" },
    { key: "skladkiTerminowo", label: "Składki opłacane w terminie", type: "bool", when: (a) => a.title === "zlecenie_chorobowe" || a.title === "jdg_chorobowe" },
    { key: "zadluzenie", label: "Należności do uregulowania w ZUS", type: "number", suffix: "zł", when: selfEmp },
  ] },
  { title: "Ustanie stosunku pracy", guide: "profil-ustanie", fields: [
    { key: "ustanie", label: "Czy praca lub umowa skończyła się / skończy?", type: "select", options: [["nie", "Nie"], ["tak", "Tak"]] },
    { key: "ustanieData", label: "Data ustania stosunku pracy", type: "date", when: (a) => a.ustanie === "tak", hint: "ostatni dzień zatrudnienia" },
    { key: "ustaniePowod", label: "Przyczyna", type: "select", options: opts("ustaniePowod"), when: (a) => a.ustanie === "tak" },
  ] },
];

function show(f: Field, v: unknown) {
  if (v === undefined || v === null || v === "") return "—";
  if (f.type === "date") return fmtDate(String(v));
  if (f.type === "bool") return v ? "Tak" : "Nie";
  if (f.type === "select") return f.options?.find(([k]) => k === String(v))?.[1] ?? String(v);
  // twarde spacje: jednostka („zł / mies.”) nie przeskakuje do nowej linii
  if (f.type === "number") return `${Number(v).toLocaleString("pl-PL")}\u00a0${(f.suffix ?? "").replace(/ /g, "\u00a0")}`.trim();
  return String(v);
}

/** Wiek dziecka w dniu przyjęcia i czy mieści się w limicie urlopu na warunkach macierzyńskiego. */
function ageInfo(a: Answers, W: Params["wymiary"]) {
  if (!taking(a) || !a.dzieckoData || !a.dzieckoUrodzenie) return null;
  const years = Math.floor(diffDays(a.dzieckoUrodzenie, a.dzieckoData) / 365.25);
  const limit = a.sytuacja === "adopcja" ? W.adopcjaMaxWiekDziecka : W.zastepczaMaxWiekDziecka;
  return { years, limit, ok: years < limit };
}

export default function Profil() {
  const { session, loading, refresh, params } = useApp();
  const [data, setData] = useState<{ zrodlo: "zus" | "wlasne"; answers: Answers; zus?: Answers; nadpisane?: string[]; brakujace?: string[] } | null>(null);
  const [form, setForm] = useState<Answers>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    const r = await api("/api/profile");
    if (r.error) { setData(null); return; }
    setData(r); setForm(r.answers);
  };
  useEffect(() => { if (session) load(); }, [session]);

  const dirty = useMemo(() => data && JSON.stringify(form) !== JSON.stringify(data.answers), [form, data]);
  const set = (k: Key, v: unknown) => { setMsg(null); setForm((f) => { const n = { ...f } as Record<string, unknown>; if (v === "" || v === undefined) delete n[k]; else n[k] = v; return n as Answers; }); };

  async function save() {
    setBusy(true);
    const r = await api("/api/profile", { answers: form }, "PUT");
    setBusy(false);
    if (r.error) { setMsg({ ok: false, text: r.error }); return; }
    await load(); await refresh();
    setMsg({ ok: true, text: "Zapisano. Kalkulator, wnioski i ryzyka korzystają teraz z tych danych." });
  }
  async function restore(keys?: string[]) {
    setBusy(true);
    await api("/api/profile", { keys }, "DELETE");
    setBusy(false);
    await load(); await refresh();
    setMsg({ ok: true, text: keys ? "Przywrócono dane z ZUS dla tego pola." : "Przywrócono wszystkie dane z ZUS." });
  }

  if (loading) return <div className="spinner" />;
  if (!session)
    return (
      <div className="card" style={{ textAlign: "center", padding: 40 }}>
        <Icon name="user" size={40} />
        <h2 className="mt">Zaloguj się, aby zobaczyć profil</h2>
        <p className="muted">Profil zawiera dane pobrane z ZUS albo wpisane przez Ciebie – możesz je tu poprawić.</p>
        <div className="row" style={{ justifyContent: "center" }}><Link href="/" className="btn btn-primary">Zaloguj się</Link><Link href="/nowe-konto" className="btn btn-outline">Załóż konto bez ZUS</Link></div>
      </div>
    );
  if (!data) return <div className="spinner" />;

  const zus = data.zrodlo === "zus";
  const over = new Set(data.nadpisane ?? []);
  const age = ageInfo(form, params.wymiary);

  return (
    <div>
      <div className="card mb" data-guide="profil-zrodlo">
        <div className="card-head">
          <div>
            <h1 style={{ margin: 0 }}>Mój profil</h1>
            <small>{zus ? "Dane pobrane z ZUS (symulacja). Jeśli coś się nie zgadza albo zmieniło – popraw to tutaj." : "Dane wpisane przez Ciebie w ankiecie – możesz je w każdej chwili zmienić."}</small>
          </div>
          {zus && over.size > 0 && <button className="btn btn-ghost" disabled={busy} onClick={() => restore()}>Przywróć wszystkie dane z ZUS</button>}
        </div>
        <div className="legend">
          {zus ? <><span><span className="badge b-info">z ZUS</span> dane z systemu ZUS</span><span><span className="badge b-warn">zmienione</span> poprawione przez Ciebie – mają pierwszeństwo przed ZUS</span></>
               : <span><span className="badge b-ok">wpisane przez Ciebie</span> dane z ankiety</span>}
        </div>
        {zus && <div className="alert a-info mt"><Icon name="info" size={18} /><span>Twoje zmiany nie są wysyłane do ZUS – służą do wyliczeń w aplikacji. Jeśli dane w ZUS są błędne, <Link href="/zus?tab=pytanie">napisz do ZUS</Link>.</span></div>}
      </div>

      <div className="grid g2" style={{ alignItems: "start" }}>
        {GROUPS.map((g) => {
          const fields = g.fields.filter((f) => !f.when || f.when(form));
          return (
            <section key={g.title} className="card" style={{ margin: 0 }} data-guide={g.guide}>
              <h2>{g.title}</h2>
              <div className="grid" style={{ gap: 14 }}>
                {fields.map((f) => {
                  const id = `p-${f.key}-${f.label.length}`;
                  const v = form[f.key];
                  const changed = zus && over.has(f.key);
                  return (
                    <div key={id} className="field" data-guide={f.guide}>
                      <div className="row" style={{ justifyContent: "space-between", gap: 6 }}>
                        <label htmlFor={id}>{f.label}</label>
                        {zus ? (changed ? <span className="row" style={{ gap: 6 }}><span className="badge b-warn">zmienione</span><button type="button" className="linkbtn" style={{ fontSize: 13 }} disabled={busy} onClick={() => restore([f.key])} title={`W ZUS: ${show(f, data.zus?.[f.key])}`}>przywróć z ZUS ({show(f, data.zus?.[f.key])})</button></span>
                                     : <span className="badge b-info">z ZUS</span>)
                             : <span className="badge b-ok">wpisane przez Ciebie</span>}
                      </div>
                      {f.type === "select" || f.type === "bool" ? (
                        <select id={id} className="input" value={v === undefined ? "" : String(v)} onChange={(e) => set(f.key, f.type === "bool" ? (e.target.value === "" ? undefined : e.target.value === "true") : f.key === "etat" ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value)}>
                          {f.key === "plec"
                            ? v === undefined && <option value="" disabled hidden>Wybierz rolę</option>
                            : <option value="">— nie podano —</option>}
                          {(f.type === "bool" ? [["true", "Tak"], ["false", "Nie"]] as [string, string][] : f.options ?? []).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                      ) : (
                        <div className="row" style={{ flexWrap: "nowrap" }}>
                          <input id={id} className="input" type={f.type === "date" ? "date" : "text"} inputMode={f.type === "number" || f.key === "pesel" ? "numeric" : undefined}
                            value={v === undefined ? "" : String(v)}
                            onChange={(e) => set(f.key, f.type === "number" ? (e.target.value.trim() === "" ? undefined : Number(e.target.value.replace(",", ".").replace(/\s/g, "")) || 0) : e.target.value)} />
                          {f.suffix && <span className="muted" style={{ whiteSpace: "nowrap" }}>{f.suffix}</span>}
                        </div>
                      )}
                      {f.hint && <span className="hint">{f.hint}</span>}
                    </div>
                  );
                })}
                {g.title === "Sytuacja rodzinna" && age && (
                  <div className={`alert ${age.ok ? "a-ok" : "a-err"}`}><Icon name={age.ok ? "check" : "alert"} size={18} />
                    <span>Dziecko w dniu przyjęcia: {age.years} {age.years === 1 ? "rok" : age.years < 5 && age.years > 1 ? "lata" : "lat"}. Limit dla {form.sytuacja === "adopcja" ? "przysposobienia" : "rodziny zastępczej"}: {age.limit} lat{form.sytuacja === "zastepcza" ? " (10 – przy odroczonym obowiązku szkolnym)" : ""} – {age.ok ? "urlop na warunkach macierzyńskiego przysługuje." : "urlop na warunkach macierzyńskiego może nie przysługiwać."}</span>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="profile-save noprint">
        {msg && <span className={`badge ${msg.ok ? "b-ok" : "b-no"}`} role="status">{msg.text}</span>}
        <span style={{ flex: 1 }} />
        <button className="btn btn-ghost" disabled={!dirty || busy} onClick={() => { setForm(data.answers); setMsg(null); }}>Cofnij zmiany</button>
        <button className="btn btn-primary" data-guide="profil-zapisz" disabled={!dirty || busy} onClick={save}>{busy ? "Zapisywanie…" : "Zapisz zmiany"}</button>
      </div>
    </div>
  );
}
