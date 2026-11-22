"use client";
import { Fragment, useId } from "react";
import { isValidDate } from "@/lib/engine";
import type { FNode, OfficialForm } from "@/lib/zusforms";

type V = Record<string, string>;
const up = (x?: string) => (x ?? "").toLocaleUpperCase("pl-PL");
const dmy = (x?: string) => (isValidDate(x) ? x.split("-").reverse().join(".") : "");

/* ───────────────────────── Wypełnianie ───────────────────────── */

function Err({ id, msg }: { id: string; msg?: string }) {
  return msg ? <span id={id} className="hint" style={{ color: "var(--err)" }}>{msg}</span> : null;
}

function InField({ n, v, err, set }: { n: FNode & { t: "field" }; v: V; err: V; set: (k: string, x: string) => void }) {
  const id = useId();
  const e = err[n.name];
  const desc = e ? `${id}-e` : n.hint ? `${id}-h` : undefined;
  const common = { id, className: "input", value: v[n.name] ?? "", "aria-invalid": !!e, "aria-describedby": desc };
  return (
    <div className="field">
      {n.label && <label htmlFor={id}>{n.label}{n.optional ? <small className="muted"> (dobrowolne)</small> : null}</label>}
      {n.area ? (
        <textarea {...common} rows={3} onChange={(x) => set(n.name, x.target.value)} />
      ) : (
        <input
          {...common}
          type={n.date || n.dateText ? "date" : "text"}
          inputMode={n.boxes ? "numeric" : undefined}
          maxLength={n.boxes ? n.boxes + 8 : 200}
          aria-label={n.label ? undefined : n.hint}
          onChange={(x) => set(n.name, x.target.value)}
        />
      )}
      {e ? <Err id={`${id}-e`} msg={e} /> : n.hint && <span id={`${id}-h`} className="hint">{n.hint}</span>}
    </div>
  );
}

function InCheck({ name, label, num, v, err, set }: { name: string; label: string; num?: string; v: V; err: V; set: (k: string, x: string) => void }) {
  const id = useId();
  return (
    <div className="zf-in-check">
      <label htmlFor={id} className="row" style={{ alignItems: "flex-start", gap: 8, flexWrap: "nowrap" }}>
        <input id={id} type="checkbox" checked={v[name] === "X"} aria-invalid={!!err[name]} aria-describedby={err[name] ? `${id}-e` : undefined} onChange={(x) => set(name, x.target.checked ? "X" : "")} style={{ marginTop: 4 }} />
        <span>{num && <b>{num} </b>}{label}</span>
      </label>
      <Err id={`${id}-e`} msg={err[name]} />
    </div>
  );
}

function InNodes({ nodes, v, err, set }: { nodes: FNode[]; v: V; err: V; set: (k: string, x: string) => void }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case "h":
            return <div key={i} className="zf-in-h"><b>{n.text}</b>{n.note && <small className="muted">{n.note}</small>}</div>;
          case "p":
            return <p key={i} className={n.small ? "muted" : undefined} style={{ margin: "2px 0", fontWeight: n.bold || n.strong ? 700 : undefined, fontSize: n.small ? 14 : undefined }}>{n.text}</p>;
          case "group":
            return (
              <div key={i} className="field">
                <span style={{ fontWeight: 600 }}>{n.label}</span>
                <div className="grid g2" style={{ gap: 10 }}>{n.fields.map((f) => <InField key={f.name} n={f} v={v} err={err} set={set} />)}</div>
              </div>
            );
          case "table":
            return <InTable key={n.name} n={n} v={v} err={err} set={set} />;
          case "field":
            return <InField key={n.name} n={n} v={v} err={err} set={set} />;
          case "pair":
            return <div key={i} className="grid g2" style={{ gap: 10 }}><InField n={n.a} v={v} err={err} set={set} /><InField n={n.b} v={v} err={err} set={set} /></div>;
          case "period":
            return (
              <div key={n.name} className="field">
                {n.label && <span style={{ fontWeight: 600 }}>{n.label}</span>}
                <div className="grid g2" style={{ gap: 10 }}>
                  <InField n={{ t: "field", name: `${n.name}_od`, label: "od", date: true }} v={v} err={err} set={set} />
                  <InField n={{ t: "field", name: `${n.name}_do`, label: n.openEnd ? "do (jeśli trwa – zostaw puste)" : "do", date: true }} v={v} err={err} set={set} />
                </div>
                <span className="hint">{n.hint}</span>
              </div>
            );
          case "check":
            return (
              <div key={n.name} style={{ marginLeft: (n.level ?? 0) * 22 }}>
                <InCheck name={n.name} label={n.label} num={n.num} v={v} err={err} set={set} />
                {n.children && v[n.name] === "X" && <div className="zf-in-sub"><InNodes nodes={n.children} v={v} err={err} set={set} /></div>}
              </div>
            );
          case "checkrow":
            return (
              <div key={i}>
                {n.label && <span style={{ fontWeight: 600 }}>{n.label}</span>}
                <div className="row" style={{ gap: "4px 16px", alignItems: "flex-start" }}>{n.items.map((c) => <InCheck key={c.name} name={c.name} label={c.label} v={v} err={err} set={set} />)}</div>
              </div>
            );
          case "yesno":
            return (
              <div key={n.name}>
                {n.label && <span id={`${n.name}-l`}>{n.label}</span>}
                <div className="row" role="radiogroup" aria-labelledby={n.label ? `${n.name}-l` : undefined} aria-invalid={!!err[n.name]} style={{ gap: 16 }}>
                  {["TAK", "NIE"].map((o) => (
                    <label key={o} className="row" style={{ gap: 6 }}>
                      <input type="radio" name={`zf-${n.name}`} checked={v[n.name] === o} onChange={() => set(n.name, o)} /> {o}
                    </label>
                  ))}
                  {v[n.name] && <button type="button" className="linkbtn" style={{ fontSize: 14 }} onClick={() => set(n.name, "")}>wyczyść</button>}
                </div>
                <Err id={`${n.name}-e`} msg={err[n.name]} />
                {n.children && v[n.name] === "TAK" && <div className="zf-in-sub"><InNodes nodes={n.children} v={v} err={err} set={set} /></div>}
              </div>
            );
          case "sign":
            return (
              <Fragment key={n.name}>
                <InField n={{ t: "field", name: n.name, label: "Data", date: true }} v={v} err={err} set={set} />
                <p className="muted" style={{ margin: 0, fontSize: 14 }}>{n.label ?? "Podpis"}: przy wysyłce elektronicznej – podpis zaufany / mObywatel (symulacja); na wydruku – podpis odręczny.</p>
              </Fragment>
            );
        }
      })}
    </>
  );
}

function InTable({ n, v, err, set }: { n: FNode & { t: "table" }; v: V; err: V; set: (k: string, x: string) => void }) {
  const errs = Object.keys(err).filter((k) => k.startsWith(`${n.name}_`));
  return (
    <div className="field">
      <div className="zf-tscroll" role="region" aria-label="Tabela – przewiń w poziomie" tabIndex={0}>
        <table className="zf-tin">
          <thead><tr>{n.cols.map((c, ci) => <th key={ci} scope="col">{c.group ? <small className="muted">{c.group}<br /></small> : null}{c.label}</th>)}</tr></thead>
          <tbody>
            {Array.from({ length: n.rows }, (_, ri) => (
              <tr key={ri}>
                {n.cols.map((c, ci) => {
                  const k = `${n.name}_${ri}_${ci}`;
                  return <td key={ci}><input className="input" value={v[k] ?? ""} inputMode={c.num ? "decimal" : undefined} aria-label={`${c.label}, wiersz ${ri + 1}`} aria-invalid={!!err[k]} onChange={(x) => set(k, x.target.value)} /></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {errs.length > 0 && <span className="hint" style={{ color: "var(--err)" }}>{errs.map((k) => { const [, r] = k.split("_"); return `wiersz ${Number(r) + 1}: ${err[k]}`; }).join(" · ")}</span>}
    </div>
  );
}

export function OfficialInputs({ form, values, errors, onChange }: { form: OfficialForm; values: V; errors: V; onChange: (k: string, x: string) => void }) {
  return (
    <div className="grid" style={{ gap: 10 }}>
      {form.filledBy === "platnik" && <div className="alert a-info"><span>Ten dokument wypełnia <b>płatnik składek</b> (pracodawca / zleceniodawca). Możesz go przygotować i przekazać płatnikowi – podpisuje go osoba upoważniona.</span></div>}
      {form.top && <InNodes nodes={form.top} v={values} err={errors} set={onChange} />}
      <InNodes nodes={form.nodes} v={values} err={errors} set={onChange} />
    </div>
  );
}

/* ───────────────────────── Wydruk (układ wzoru ZUS) ───────────────────────── */

function Boxes({ n, value }: { n: number; value: string }) {
  const chars = value.replace(/[\s-]/g, "").replace(/^PL(?=\d{26}$)/i, "").slice(0, n).split("");
  return <span className="zf-boxes" aria-label={value || "puste"}>{Array.from({ length: n }, (_, i) => <span key={i} className="zf-cell">{chars[i] ?? ""}</span>)}</span>;
}
function DateBoxes({ value }: { value?: string }) {
  const s = isValidDate(value) ? value.split("-").reverse().join("") : "";
  return (
    <span className="zf-date">
      <span className="zf-boxes">{Array.from({ length: 8 }, (_, i) => <span key={i} className={`zf-cell${i === 2 || i === 4 ? " zf-sep" : ""}`}>{s[i] ?? ""}</span>)}</span>
      <span className="zf-cap">dd&nbsp;&nbsp;/&nbsp;&nbsp;mm&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;rrrr</span>
    </span>
  );
}
const Box = ({ on }: { on: boolean }) => <span className="zf-x" aria-label={on ? "zaznaczone" : "niezaznaczone"}>{on ? "X" : ""}</span>;
const Hint = ({ text }: { text?: string }) => (text ? <span className="zf-hint">{text}</span> : null);

function PaperValue({ n, v }: { n: FNode & { t: "field" }; v: V }) {
  if (n.boxes) return <Boxes n={n.boxes} value={v[n.name] ?? ""} />;
  if (n.date) return <DateBoxes value={v[n.name]} />;
  if (n.dateText) return <span className="zf-box">{isValidDate(v[n.name]) ? v[n.name].split("-").reverse().join("/") : ""}</span>;
  return <span className={`zf-box${n.area ? " zf-area" : ""}`}>{up(v[n.name])}</span>;
}

function PaperNodes({ nodes, v }: { nodes: FNode[]; v: V }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case "h":
            return <Fragment key={i}><div className="zf-h">{n.text}</div>{n.note && <div className="zf-note">{n.note}</div>}</Fragment>;
          case "p":
            return <p key={i} className={`zf-p${n.bold ? " zf-b" : ""}${n.strong ? " zf-strong" : ""}${n.small ? " zf-small" : ""}`}>{n.text}</p>;
          case "group":
            return (
              <div key={i} className="zf-group">
                <span className="zf-glab">{n.label}</span>
                {n.fields.map((f) => <span key={f.name} className="zf-val"><PaperValue n={f} v={v} /><Hint text={f.hint} /></span>)}
              </div>
            );
          case "table":
            return <PaperTable key={n.name} n={n} v={v} />;
          case "field":
            if (n.paperHidden) return null;
            if (!n.label) return <div key={n.name} className="zf-full"><PaperValue n={n} v={v} /><Hint text={n.hint} /></div>;
            if (n.inline) return <div key={n.name} className="zf-inline"><span>{n.label}</span><span className="zf-inline-v"><PaperValue n={n} v={v} /><Hint text={n.hint} /></span></div>;
            return (
              <div key={n.name} className="zf-row">
                <span className="zf-lab">{n.label}</span>
                <span className="zf-val"><PaperValue n={n} v={v} /><Hint text={n.hint} /></span>
              </div>
            );
          case "pair":
            return (
              <div key={i} className="zf-row zf-pair">
                <span className="zf-lab">{n.a.label}</span>
                <span className="zf-val zf-pairv"><PaperValue n={n.a} v={v} /><span className="zf-lab2">{n.b.label}</span><PaperValue n={n.b} v={v} /></span>
              </div>
            );
          case "period": {
            const od = dmy(v[`${n.name}_od`]), to = dmy(v[`${n.name}_do`]);
            const extra = n.extra && v[n.extra]?.trim() ? `, ${up(v[n.extra])}` : "";
            const text = od && !to && n.openEnd ? `OD ${od}` : od || to ? `${od} – ${to}${extra}` : "";
            if (n.label === "za okres") return <div key={n.name} className="zf-inline zf-zaokres"><span>za okres</span><span className="zf-inline-v"><span className="zf-box">{text}</span><Hint text={n.hint} /></span></div>;
            if (n.label) return <div key={n.name} className="zf-group"><span className="zf-glab">{n.label}</span><span className="zf-val"><span className="zf-box">{text}</span><Hint text={n.hint} /></span></div>;
            return <div key={n.name} className="zf-full"><span className="zf-box zf-area">{text}</span><Hint text={n.hint} /></div>;
          }
          case "check":
            return (
              <Fragment key={n.name}>
                <div className="zf-check" style={{ marginLeft: (n.level ?? 0) * 28 }}>
                  <span className="zf-num">{n.num ?? ""}</span><Box on={v[n.name] === "X"} /><span>{n.label}</span>
                </div>
                {n.children && <div className="zf-sub"><PaperNodes nodes={n.children} v={v} /></div>}
              </Fragment>
            );
          case "checkrow":
            return (
              <div key={i} className={`zf-checkrow${n.items.length > 3 ? " zf-grid3" : ""}`}>
                {n.label && <span className="zf-crlab">{n.label}</span>}
                {n.items.map((c) => <span key={c.name} className="zf-check"><Box on={v[c.name] === "X"} /><span>{c.label}</span></span>)}
              </div>
            );
          case "yesno":
            return (
              <Fragment key={n.name}>
                <div className={n.label ? "zf-yn" : "zf-checkrow"}>
                  {n.label && <span className="zf-ynlab">{n.label}</span>}
                  <span className="zf-ynbox"><span className="zf-check"><Box on={v[n.name] === "TAK"} /><span>TAK</span></span><span className="zf-check"><Box on={v[n.name] === "NIE"} /><span>NIE</span></span></span>
                </div>
                {n.children && <PaperNodes nodes={n.children} v={v} />}
              </Fragment>
            );
          case "sign":
            return (
              <div key={n.name} className="zf-sign">
                <span className="zf-inline"><span>Data</span><DateBoxes value={v[n.name]} /></span>
                <span className="zf-podpis"><span className="zf-line" /><span className="zf-cap">{n.label ?? "Podpis"}</span></span>
              </div>
            );
        }
      })}
    </>
  );
}

function PaperTable({ n, v }: { n: FNode & { t: "table" }; v: V }) {
  // nagłówek dwupoziomowy: kolumny bez grupy zajmują 2 wiersze, grupa – jedną komórkę nad swoimi kolumnami
  const top: { label: string; span: number; group: boolean }[] = [];
  n.cols.forEach((c) => {
    const last = top[top.length - 1];
    if (c.group && last?.group && last.label === c.group) last.span++;
    else top.push({ label: c.group ?? c.label, span: 1, group: !!c.group });
  });
  const hasGroups = n.cols.some((c) => c.group);
  return (
    <div className="zf-tscroll">
      <table className="zf-table">
        <thead>
          <tr>{top.map((t, i) => <th key={i} colSpan={t.span} rowSpan={hasGroups && !t.group ? 2 : 1}>{t.label}</th>)}</tr>
          {hasGroups && <tr>{n.cols.filter((c) => c.group).map((c, i) => <th key={i}>{c.label}</th>)}</tr>}
          {n.numbered && <tr className="zf-colnum">{n.cols.map((_, i) => <th key={i}>{i + 1}</th>)}</tr>}
        </thead>
        <tbody>
          {Array.from({ length: n.rows }, (_, r) => <tr key={r}>{n.cols.map((_, c) => <td key={c}>{up(v[`${n.name}_${r}_${c}`])}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

export function OfficialPaper({ form, values }: { form: OfficialForm; values: V }) {
  const footer = form.footer.map((f, i) => <p key={i} className={`zf-p zf-foot${i === form.footer.length - 1 ? " zf-small" : ""}`}>{f}</p>);
  return (
    <div className="zf-paper" lang="pl">
      <div className="zf-band"><span className="zf-org">ZAKŁAD<br />UBEZPIECZEŃ<br />SPOŁECZNYCH</span><span className="zf-code">{form.code}</span></div>
      <div className="zf-title">{(form.titleLines ?? [form.title]).map((l, i) => <Fragment key={i}>{i > 0 && <br />}<span className={i > 0 ? "zf-title2" : undefined}>{l}</span></Fragment>)}</div>
      {form.top && <div className="zf-top"><PaperNodes nodes={form.top} v={values} /></div>}
      <div className="zf-h">Instrukcja wypełniania</div>
      <p className="zf-p">{form.instruction.intro}</p>
      {form.instruction.items.length > 0 && <ul className="zf-dash">{form.instruction.items.map((x) => <li key={x}>{x}</li>)}</ul>}
      <ol className="zf-ol">{form.instruction.steps.map((x) => <li key={x}>{x.replace(" X", "")}{x.endsWith(" X") && <b> X</b>}</li>)}</ol>
      <PaperNodes nodes={form.nodes} v={values} />
      {form.info.subtitle && footer}

      {/* ZAM: „Informacja” to osobny dokument (nowa strona); ZAS-53: „Pouczenie” jest częścią wniosku */}
      <div className={form.info.subtitle ? "zf-info zf-newdoc" : "zf-info"}>
        {form.info.subtitle && <div className="zf-band"><span className="zf-org">ZAKŁAD<br />UBEZPIECZEŃ<br />SPOŁECZNYCH</span><span className="zf-code">{form.code}</span></div>}
        <div className={form.info.subtitle ? "zf-info-title" : "zf-title"}>{form.info.title}{form.info.subtitle && <><br /><span>{form.info.subtitle}</span></>}</div>
        {form.info.blocks.map((b, i) => (
          <Fragment key={i}>
            {b.h && <div className={b.hi ? "zf-ih" : "zf-ih1"}>{b.h}</div>}
            {b.sec && <div className="zf-ih1">Sekcja: <i>{b.sec}</i></div>}
            {b.hs && <div className="zf-hs">{b.hs}</div>}
            {b.p && <p className={`zf-p${b.b ? " zf-strong" : ""}`}>{b.p}</p>}
            {b.frac && <div className="zf-frac"><span>{b.frac[0]}</span><span>{b.frac[1]}</span></div>}
            {b.bullets && (
              <ul className="zf-dot">
                {b.bullets.map((x, j) =>
                  typeof x === "string" ? <li key={j}>{x}</li> : (
                    <li key={j} className={x.text ? undefined : "zf-nodot"}>
                      {x.text}
                      {x.sub.length > 0 && <ul className="zf-dash">{x.sub.map((s) => <li key={s}>{s}</li>)}</ul>}
                    </li>
                  )
                )}
              </ul>
            )}
          </Fragment>
        ))}
      </div>
      {!form.info.subtitle && footer}
    </div>
  );
}
