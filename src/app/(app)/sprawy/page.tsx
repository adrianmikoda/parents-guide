"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { api, useApp } from "@/components/AppContext";
import { AiBadge, Notes, PeriodsTable, Status, Timeline } from "@/components/ui";
import { computeBase, Title, TITLE_LABELS, zl } from "@/lib/engine";

function Upload() {
  const { params } = useApp();
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [edit, setEdit] = useState<any>(null);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const MAX_MB = 4;

  async function send(f: File, ai = false) {
    setErr("");
    if (f.size === 0) { setErr("Plik jest pusty – wybierz inny dokument."); return; }
    if (f.size > MAX_MB * 1024 * 1024) { setErr(`Plik jest za duży (${(f.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB). Limit to ${MAX_MB} MB – zmniejsz plik lub zeskanuj mniej stron.`); return; }
    if (!/\.(pdf|txt)$/i.test(f.name) && !["application/pdf", "text/plain"].includes(f.type)) { setErr("Obsługiwane są pliki PDF i TXT."); return; }
    setBusy(true);
    setFile(f);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const resp = await fetch(`/api/documents/parse${ai ? "?ai=1" : ""}`, { method: "POST", body: fd });
      const r = await resp.json().catch(() => ({ error: resp.status === 413 ? `Plik jest za duży (limit ${MAX_MB} MB).` : "Serwer zwrócił nieoczekiwaną odpowiedź." }));
      if (!resp.ok || r.error) { setErr(r.error || "Nie udało się przeanalizować dokumentu."); setRes(null); return; }
      setRes(r);
      const x = r.result || {};
      setEdit({ title: x.title || "", base: x.base || 0, monthly: (x.monthly || []).map((m: any) => m.amount).join("; "), birthDate: x.birthDate || "", children: x.children || 1, insuredAtPayer: x.insuredAtPayer ?? "", zaZyciem: !!x.zaZyciem });
    } catch {
      setErr("Brak połączenia z serwerem. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  const months = edit ? String(edit.monthly).split(/[;\n]/).map((s: string) => parseFloat(s.replace(/\s/g, "").replace(",", "."))).filter((n: number) => n > 0) : [];
  const base = edit?.title ? computeBase({ title: edit.title as Title, months, overrideBase: edit.base > 0 ? edit.base : undefined }, params) : null;
  const ins = ["umowa_o_prace", "zlecenie_chorobowe", "jdg_chorobowe"].includes(edit?.title);

  return (
    <div className="card">
      <div className="card-head"><h2 style={{ margin: 0 }}>Wgraj dokument ze zestawu (PDF)</h2><AiBadge on={false} /></div>
      <p className="muted">Z-3, Z-3a, ZAM, ZAS-53, ZAS-12, poświadczenie ubezpieczenia, e-ZLA, zaświadczenie „Za życiem”. Dane odczyta parser regułowy; dla skanów i nietypowych układów – opcjonalnie AI.</p>
      <div
        className={`drop ${over ? "over" : ""}`}
        data-guide="sprawy-upload"
        role="button"
        tabIndex={0}
        aria-label="Wybierz plik PDF lub TXT do analizy"
        aria-describedby="drop-hint"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ref.current?.click(); } }}
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) send(f); }}
      >
        <Icon name="upload" size={30} />
        <div><b>Przeciągnij plik lub kliknij, aby wybrać</b></div>
        <small id="drop-hint">PDF lub TXT, do {MAX_MB} MB · plik jest przetwarzany tylko na potrzeby wyliczenia{" "}{res?.aiAvailable !== false ? "· przy skanach treść może zostać przekazana do modelu AI (Claude, Anthropic)" : ""}</small>
        <input ref={ref} type="file" accept=".pdf,.txt,application/pdf,text/plain" hidden tabIndex={-1} onChange={(e) => { const x = e.target.files?.[0]; e.target.value = ""; if (x) send(x); }} />
      </div>
      {busy && <div className="row mt" role="status"><div className="spinner" /> Analiza dokumentu…</div>}
      {err && !busy && <div className="alert a-err mt" role="alert"><Icon name="alert" size={18} /><span>{err}</span></div>}
      {res && !busy && (
        <div className="mt">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div><b>{res.fileName}</b> · {res.result.docTypeLabel} <span className="badge b-info">pewność {Math.round(res.result.confidence * 100)}%</span> {res.aiUsed && <AiBadge />}</div>
            {res.aiAvailable && file && <button className="btn btn-ghost" onClick={() => send(file, true)}><Icon name="sparkles" size={16} /> Odczytaj ponownie z AI</button>}
          </div>
          {res.aiError && <div className="alert a-warn mt"><Icon name="alert" size={18} />AI: {res.aiError}</div>}
          {!res.aiAvailable && res.result.confidence < 0.5 && <div className="alert a-info mt"><Icon name="info" size={18} />Ekstrakcja AI jest wyłączona (brak klucza ANTHROPIC_API_KEY) – uzupełnij dane ręcznie.</div>}
          {res.result.notes?.map((n: string, i: number) => <div key={i} className="alert a-info mt"><Icon name="info" size={18} />{n}</div>)}
          <h3 className="mt">Odczytane dane – sprawdź i popraw</h3>
          <div className="grid g3">
            <div className="field"><label htmlFor="up-title">Tytuł ubezpieczenia</label>
              <select id="up-title" className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })}><option value="">— wybierz —</option>{Object.entries(TITLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </div>
            <div className="field"><label htmlFor="up-base">Podstawa wymiaru z dokumentu (zł)</label><input id="up-base" className="input" type="number" min={0} value={edit.base} onChange={(e) => setEdit({ ...edit, base: Math.max(0, parseFloat(e.target.value) || 0) })} /></div>
            <div className="field"><label htmlFor="up-ins">Liczba ubezpieczonych u płatnika</label><input id="up-ins" className="input" type="number" min={1} value={edit.insuredAtPayer} onChange={(e) => setEdit({ ...edit, insuredAtPayer: e.target.value })} /></div>
            <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="up-months">Przychody z kolejnych miesięcy (oddziel średnikiem)</label><input id="up-months" className="input" value={edit.monthly} onChange={(e) => setEdit({ ...edit, monthly: e.target.value })} /></div>
            <div className="field"><label htmlFor="up-date">Data porodu</label><input id="up-date" className="input" type="date" value={edit.birthDate} onChange={(e) => setEdit({ ...edit, birthDate: e.target.value })} /></div>
            <div className="field"><label htmlFor="up-children">Liczba dzieci</label><input id="up-children" className="input" type="number" min={1} max={6} value={edit.children} onChange={(e) => setEdit({ ...edit, children: Math.min(6, Math.max(1, parseInt(e.target.value, 10) || 1)) })} /></div>
          </div>
          {!edit.title ? (
            <div className="alert a-warn mt"><Icon name="alert" size={18} /><span>Nie rozpoznano tytułu ubezpieczenia ani danych do zasiłku. Wybierz tytuł i uzupełnij dane ręcznie.</span></div>
          ) : (
          <div className={`alert ${ins ? "a-ok" : "a-err"} mt`}>
            <Icon name={ins ? "check" : "x"} size={18} />
            <span>{ins ? <>Osoba <b>podlega ubezpieczeniu chorobowemu</b> ({TITLE_LABELS[edit.title as Title]}). Podstawa wymiaru: <b>{zl(base!.base)}</b>.</> : <>Brak ubezpieczenia chorobowego – zasiłki nie przysługują.</>}
              {ins && edit.insuredAtPayer !== "" && <> Zasiłek wypłaci: <b>{Number(edit.insuredAtPayer) > params.kwoty.progPlatnikaUbezpieczonych && !String(edit.title).startsWith("jdg") ? "płatnik składek" : "ZUS"}</b>.</>}
              {ins && <><br /><small>{base!.steps.join(" · ")}</small></>}
            </span>
          </div>
          )}
          {ins && <Link className="btn btn-primary mt" href={`/kalkulator?base=${base!.base}${edit.birthDate ? `&date=${edit.birthDate}` : ""}&children=${edit.children}${edit.zaZyciem ? "&zaZyciem=1" : ""}`}><Icon name="calc" size={18} /> Przelicz zasiłek w kalkulatorze</Link>}
          <details className="mt"><summary>Podgląd odczytanego tekstu ({res.textLength} znaków)</summary><pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "var(--bg)", padding: 10, borderRadius: 10, maxHeight: 260, overflow: "auto" }}>{res.textPreview || "(brak warstwy tekstowej)"}</pre></details>
        </div>
      )}
    </div>
  );
}

export default function Sprawy() {
  const { params } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [cat, setCat] = useState("Wszystkie");
  const [stat, setStat] = useState("wszystkie");
  const [sel, setSel] = useState<any>(null);
  useEffect(() => { api("/api/cases").then((r) => setItems(r.items)); }, []);
  useEffect(() => { if (sel?.case) api(`/api/cases/${sel.case.id}`).then(setSel); /* odśwież po zmianie parametrów */ // eslint-disable-next-line
  }, [params.version]);
  const cats = ["Wszystkie", ...Array.from(new Set(items.map((i) => i.kategoria)))];

  return (
    <div>
      <Upload />
      <div className="section-title">Wbudowane sprawy testowe ({items.length})</div>
      <div className="pill-tabs mb" data-guide="sprawy-kategorie" role="group" aria-label="Kategoria">{cats.map((c) => <button key={c} aria-pressed={c === cat} className={c === cat ? "on" : ""} onClick={() => { setCat(c); setSel(null); }}>{c}</button>)}</div>
      <div className="pill-tabs mb" role="group" aria-label="Rozstrzygnięcie">
        {[["wszystkie", "Każde rozstrzygnięcie"], ["przyznano", "Przyznano"], ["czesciowo", "Częściowo"], ["odmowa", "Odmowa"]].map(([k, l]) => <button key={k} aria-pressed={k === stat} className={k === stat ? "on" : ""} onClick={() => { setStat(k); setSel(null); }}>{l}</button>)}
      </div>
      <div className="grid g3 tiles">
        {items.filter((i) => (cat === "Wszystkie" || i.kategoria === cat) && (stat === "wszystkie" || i.rozstrzygniecie.status === stat)).map((c) => (
          <button key={c.id} className="tile" onClick={async () => { setSel(await api(`/api/cases/${c.id}`)); setTimeout(() => document.getElementById("detail")?.scrollIntoView({ behavior: "smooth" }), 50); }}>
            <div className="row" style={{ justifyContent: "space-between" }}><span className="badge b-info">{c.id}</span><Status s={c.rozstrzygniecie.status} /></div>
            <b>{c.tytul}</b>
            <small className="muted">{c.opis}</small>
          </button>
        ))}
      </div>

      {sel?.case && (
        <div id="detail" className="mt2">
          <div className="card">
            <div className="card-head"><h2 style={{ margin: 0 }}>{sel.case.id}: {sel.case.tytul}</h2><Status s={sel.case.rozstrzygniecie.status} /></div>
            <p>{sel.case.opis}</p>
            <div className="grid g2">
              <div>
                <h3>Dokumenty w sprawie</h3>
                <div className="list">{sel.case.dokumenty.map((d: any, i: number) => <div key={i} className="li"><Icon name="doc" size={20} /><div className="grow"><b>{d.typ}</b> – {d.nazwa}<br /><small>{Object.entries(d.pola).map(([k, v]) => `${k}: ${v}`).join(" · ")}</small></div></div>)}</div>
              </div>
              <div>
                <h3>Rozstrzygnięcie ZUS</h3>
                <p>{sel.case.rozstrzygniecie.uzasadnienie}</p>
                <h3>Podstawa wymiaru</h3>
                <ul style={{ paddingLeft: 18, fontSize: 14 }}>{sel.base.steps.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                <div className="alert a-info"><Icon name="check" size={18} /><span>Oczekiwany wynik: {sel.case.oczekiwane}</span></div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <h2 style={{ margin: 0 }}>Wyliczenie narzędzia</h2>
              <div className="row"><span className="badge b-ok">Razem: {zl(sel.result.totals.all)}</span><Link className="btn btn-primary" href={`/kalkulator?case=${sel.case.id}`}>Otwórz w kalkulatorze</Link></div>
            </div>
            <Notes res={{ errors: sel.result.errors }} />
            {sel.result.ok && <><Timeline res={sel.result} /><div className="mt"><PeriodsTable res={sel.result} netPct={params.kwoty.zaliczkaPitProcent} /></div></>}
            <div className="mt"><Notes res={{ warnings: sel.result.warnings, info: sel.result.info }} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
