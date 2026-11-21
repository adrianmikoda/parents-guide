"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import { A11yButtons, Brand } from "@/components/Shell";
import { api, useApp } from "@/components/AppContext";
import { offerTutorial } from "@/components/FloatingGuide";
import { Answers, LIMITS, Question, activeQuestions, answered, validateAnswers } from "@/lib/quiz";
import { fmtDate } from "@/lib/engine";

function display(q: Question, a: Answers): string | null {
  if (!answered(q, a)) return null;
  if (q.kind === "name") return `${a.imie} ${a.nazwisko}`;
  const v = a[q.field!];
  if (q.kind === "choice") return q.options?.find((o) => o.value === String(v))?.label ?? String(v);
  if (q.kind === "date") return fmtDate(String(v));
  if (q.kind === "number") return `${Number(v).toLocaleString("pl-PL")}\u00a0${(q.suffix ?? "").replace(/ /g, "\u00a0")}`.trim();
  return String(v);
}

function Quiz() {
  const router = useRouter();
  const sp = useSearchParams();
  const fill = sp.get("uzupelnij") === "1";
  const { refresh, session } = useApp();
  const [a, setA] = useState<Answers>({});
  const [loaded, setLoaded] = useState(!fill);
  const [answeredAtStart, setAnsweredAtStart] = useState<Set<string>>(new Set());
  const [cur, setCur] = useState<string | null>(null); // id bieżącego pytania; null = podsumowanie
  const [hist, setHist] = useState<string[]>([]);
  const [editing, setEditing] = useState(false); // poprawka z podsumowania → wróć do podsumowania
  const [draft, setDraft] = useState<string>("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const [maxPos, setMaxPos] = useState(0);
  const DRAFT = "pp_quiz_draft";
  const restored = useRef(false);

  // Tryb „uzupełnij”: wczytaj dotychczasowe odpowiedzi, pytaj tylko o brakujące
  useEffect(() => {
    if (!fill) {
      try {
        const d = JSON.parse(sessionStorage.getItem(DRAFT) || "null");
        if (d && typeof d === "object" && d.a) { setA(d.a); setHist(Array.isArray(d.hist) ? d.hist : []); setCur(d.cur === undefined ? "imie" : d.cur); restored.current = true; return; }
      } catch { /* brak szkicu */ }
      restored.current = true;
      setCur("imie");
      return;
    }
    api("/api/accounts").then((r) => {
      if (!r.account) { router.replace("/nowe-konto"); return; }
      const ans: Answers = r.account.answers;
      setA(ans);
      setAnsweredAtStart(new Set(activeQuestions(ans).filter((q) => answered(q, ans)).map((q) => q.id)));
      setLoaded(true);
      setCur(r.account.missing[0] ?? null);
    });
  }, [fill, router]);

  // W trybie „uzupełnij” pytamy o braki; pytanie wybrane do poprawy („Zmień”) też należy do listy
  const inScope = (id: string, c = cur) => !fill || !answeredAtStart.has(id) || id === c || hist.includes(id);
  const list = useMemo(() => activeQuestions(a).filter((q) => inScope(q.id)), // eslint-disable-next-line react-hooks/exhaustive-deps
    [a, fill, answeredAtStart, cur, hist]);
  const q = list.find((x) => x.id === cur) ?? null;
  const pos = q ? list.indexOf(q) : list.length;

  // zapis szkicu przy każdej zmianie (tylko przy zakładaniu konta)
  useEffect(() => {
    if (fill || !restored.current) return;
    try { sessionStorage.setItem(DRAFT, JSON.stringify({ a, cur, hist })); } catch { /* brak pamięci przeglądarki */ }
  }, [a, cur, hist, fill]);
  useEffect(() => { setMaxPos((m) => Math.max(m, pos)); }, [pos]);

  // Wartość robocza pola dla bieżącego pytania; fokus na pole albo na treść pytania
  useEffect(() => {
    setErr("");
    if (!q) return;
    if (q.kind === "choice" || q.kind === "name") { setTimeout(() => (q.kind === "name" ? document.getElementById("imie")?.focus() : headRef.current?.focus()), 30); return; }
    const v = a[q.field!];
    setDraft(v === undefined || v === null ? "" : String(v));
    setTimeout(() => inputRef.current?.focus(), 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur]);

  const goNext = (ans: Answers) => {
    const l = activeQuestions(ans).filter((x) => inScope(x.id));
    const i = l.findIndex((x) => x.id === cur);
    setHist((h) => (cur ? [...h, cur] : h));
    if (editing) {
      // po poprawce: tylko nowe pytania, które się pojawiły (np. po zmianie formy zatrudnienia), potem podsumowanie
      const seen = new Set([...hist, cur]);
      const nxt = l.slice(i + 1).find((x) => !answered(x, ans) && !seen.has(x.id));
      setCur(nxt?.id ?? null);
      if (!nxt) setEditing(false);
      return;
    }
    setCur(l[i + 1]?.id ?? null);
  };
  const back = () => { const h = [...hist]; const prev = h.pop(); setHist(h); setCur(prev ?? cur); };
  const set = (patch: Partial<Answers>) => { const n = { ...a, ...patch }; setA(n); return n; };

  function submitField(skip = false) {
    if (!q) return;
    if (skip) { const n = { ...a }; for (const f of q.fields) delete n[f]; setA(n); goNext(n); return; }
    if (q.kind === "name") {
      if (!a.imie?.trim() || !a.nazwisko?.trim()) { setErr("Podaj imię i nazwisko."); focusFirst(); return; }
      const e = validateAnswers({ imie: a.imie, nazwisko: a.nazwisko });
      if (e.imie || e.nazwisko) { setErr((e.imie ?? e.nazwisko)!); document.getElementById(e.imie ? "imie" : "nazwisko")?.focus(); return; }
      goNext({ ...a, imie: a.imie.trim(), nazwisko: a.nazwisko.trim() }); return;
    }
    const raw = draft.trim();
    if (!raw) { setErr("Wpisz odpowiedź albo wybierz „Nie wiem – pomiń”."); return; }
    let v: string | number = raw;
    if (q.kind === "number") {
      const n = Number(raw.replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(n) || n < 0) { setErr("Wpisz liczbę, np. 6500."); focusFirst(); return; }
      v = n;
    }
    if (q.kind === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) { setErr("Wybierz datę."); focusFirst(); return; }
    if (q.id === "pesel" && !/^\d{11}$/.test(raw)) { setErr("PESEL ma 11 cyfr."); focusFirst(); return; }
    const e = validateAnswers({ ...a, [q.field!]: v });
    if (e[q.field!]) { setErr(e[q.field!]!); focusFirst(); return; }
    goNext(set({ [q.field!]: v } as Partial<Answers>));
  }

  function focusFirst() { setTimeout(() => (inputRef.current ?? document.getElementById("imie"))?.focus(), 0); }

  function choose(value: string) {
    if (!q) return;
    let v: unknown = value;
    if (q.field === "etat") v = Number(value);
    if (q.field === "skladkiTerminowo") v = value === "true";
    goNext(set({ [q.field!]: v } as Partial<Answers>));
  }

  async function save() {
    setSaving(true); setErr("");
    try {
      const r = await api("/api/accounts", { answers: a }, fill ? "PUT" : "POST");
      if (r.error) { setErr(r.error); setSaving(false); return; }
      try { sessionStorage.removeItem(DRAFT); } catch { /* brak */ }
      await refresh();
      if (!fill) offerTutorial();
      router.push("/pulpit");
    } catch { setErr("Nie udało się zapisać. Spróbuj ponownie."); setSaving(false); }
  }

  const all = activeQuestions(a);
  const missing = all.filter((x) => !answered(x, a));
  // postęp nie cofa się, gdy po odpowiedzi pojawiają się kolejne pytania
  const progress = Math.round((Math.min(Math.max(pos, maxPos), list.length) / Math.max(1, list.length)) * 100);

  return (
    <div className="login-wrap">
      <header className="header"><div className="header-in"><Brand /><div className="spacer" /><A11yButtons /></div></header>
      <main className="login-main" id="tresc">
        <div className="quiz">
          <div className="quiz-top">
            <span className="section-title" style={{ margin: 0 }}>{fill ? "Uzupełnij dane" : "Nowe konto – bez pobierania danych z ZUS"}</span>
            <span className="muted">{q ? `Pytanie ${pos + 1}` : "Podsumowanie"}</span>
          </div>
          <div className="quiz-bar" role="progressbar" aria-label="Postęp ankiety" aria-valuenow={q ? progress : 100} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${q ? progress : 100}%` }} /></div>

          {!loaded ? <div className="card"><div className="spinner" /></div> : q ? (
            <form key={q.id} className="card quiz-card" onSubmit={(e) => { e.preventDefault(); submitField(); }}>
              <h1 className="quiz-q" ref={headRef} tabIndex={-1}>{q.title}</h1>
              {q.help && <p className="muted quiz-help">{q.help}</p>}

              {q.kind === "name" && (
                <div className="grid g2 mt">
                  <div className="field"><label htmlFor="imie">Imię</label><input id="imie" className="input" autoComplete="given-name" maxLength={LIMITS.imie} aria-invalid={!!err && !a.imie?.trim()} aria-describedby={err ? "quiz-err" : undefined} value={a.imie ?? ""} onChange={(e) => { setErr(""); set({ imie: e.target.value }); }} /></div>
                  <div className="field"><label htmlFor="nazwisko">Nazwisko</label><input id="nazwisko" className="input" autoComplete="family-name" maxLength={LIMITS.nazwisko} aria-invalid={!!err && !!a.imie?.trim()} aria-describedby={err ? "quiz-err" : undefined} value={a.nazwisko ?? ""} onChange={(e) => { setErr(""); set({ nazwisko: e.target.value }); }} /></div>
                </div>
              )}

              {q.kind === "choice" && (
                <div className="quiz-options mt" role="radiogroup" aria-label={q.title}
                  onKeyDown={(e) => {
                    const btns = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]"));
                    const i = btns.indexOf(document.activeElement as HTMLButtonElement);
                    const next = e.key === "ArrowDown" || e.key === "ArrowRight" ? i + 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? btns.length - 1 : null;
                    if (next === null || !btns.length) return;
                    e.preventDefault();
                    btns[(next + btns.length) % btns.length].focus();
                  }}>
                  {q.options!.map((o, i) => {
                    const on = String(a[q.field!] ?? "") === o.value;
                    const anyOn = q.options!.some((x) => String(a[q.field!] ?? "") === x.value);
                    return (
                      <button key={o.value + (o.hint ?? "")} type="button" role="radio" aria-checked={on} tabIndex={on || (!anyOn && i === 0) ? 0 : -1} className={on ? "on" : ""} onClick={() => choose(o.value)}>
                        <b>{o.label}</b>{o.hint && <small>{o.hint}</small>}
                      </button>
                    );
                  })}
                </div>
              )}

              {(q.kind === "date" || q.kind === "number" || q.kind === "text") && (
                <div className="field mt quiz-input">
                  <div className="row" style={{ flexWrap: "nowrap" }}>
                    <input ref={inputRef} className="input" aria-label={q.title} aria-invalid={!!err} aria-describedby={err ? "quiz-err" : undefined}
                      type={q.kind === "date" ? "date" : "text"} inputMode={q.kind === "number" || q.id === "pesel" ? "numeric" : undefined}
                      placeholder={q.placeholder} value={draft} onChange={(e) => { setErr(""); setDraft(e.target.value); }} />
                    {q.suffix && <span className="muted" style={{ whiteSpace: "nowrap" }}>{q.suffix}</span>}
                  </div>
                </div>
              )}

              {err && <div id="quiz-err" className="alert a-err mt" role="alert"><Icon name="alert" size={18} /><span>{err}</span></div>}

              <div className="quiz-actions">
                {hist.length > 0 ? <button type="button" className="btn btn-ghost" onClick={back}>‹ Wstecz</button> : <Link href={fill ? "/pulpit" : "/"} className="btn btn-ghost" onClick={() => { try { sessionStorage.removeItem(DRAFT); } catch { /* brak */ } }}>‹ Anuluj</Link>}
                <span style={{ flex: 1 }} />
                {!q.required && <button type="button" className="btn btn-outline" onClick={() => submitField(true)}>Nie wiem – pomiń</button>}
                {q.kind !== "choice" && <button className="btn btn-primary">Dalej <span className="chev">›</span></button>}
              </div>
            </form>
          ) : (
            <div className="card quiz-card">
              <h1 className="quiz-q">{fill ? "Sprawdź i zapisz" : "Sprawdź swoje odpowiedzi"}</h1>
              <p className="muted quiz-help">{missing.length ? `Brakuje ${missing.length} ${missing.length === 1 ? "informacji" : "informacji"}. Możesz je uzupełnić później – przypomnimy na pulpicie. Bez nich część wyliczeń będzie przybliżona.` : "Masz wszystko, czego potrzebujemy do wyliczeń."}</p>
              <dl className="quiz-summary">
                {all.map((x) => {
                  const d = display(x, a);
                  return (
                    <div key={x.id}>
                      <dt>{x.title}</dt>
                      <dd>{d ?? <span className="badge b-warn">Brak – uzupełnisz później</span>}
                        <button type="button" className="linkbtn" onClick={() => { setEditing(true); setCur(x.id); }}>Zmień</button>
                      </dd>
                    </div>
                  );
                })}
              </dl>
              {err && <div className="alert a-err mt" role="alert"><Icon name="alert" size={18} /><span>{err}</span></div>}
              <div className="alert a-info mt"><Icon name="info" size={18} /><span>Wersja demonstracyjna: dane zapisujemy tylko w tej przeglądarce (podpisane ciasteczko), aby wyliczyć zasiłek. Nie są przesyłane do ZUS. Po wylogowaniu konto zostanie usunięte.</span></div>
              <div className="quiz-actions">
                {list.length > 0 && <button type="button" className="btn btn-ghost" onClick={back}>‹ Wstecz</button>}
                <span style={{ flex: 1 }} />
                <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Zapisywanie…" : fill ? "Zapisz dane" : "Załóż konto"} <span className="chev">›</span></button>
              </div>
            </div>
          )}
          {!fill && session && <p className="muted mt" style={{ textAlign: "center" }}>Jesteś zalogowany jako {session.imie}. Założenie nowego konta przełączy Cię na nie.</p>}
        </div>
      </main>
    </div>
  );
}

export default function NoweKonto() {
  return <Suspense><Quiz /></Suspense>;
}
