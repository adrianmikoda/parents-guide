"use client";
import Icon from "./Icon";
import { CalcResult, Period, diffDays, fmtDate, zl } from "@/lib/engine";

export function Check({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <label className={`check ${checked ? "on" : ""}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span><b style={{ fontSize: 14 }}>{label}</b>{hint && <><br /><small>{hint}</small></>}</span>
    </label>
  );
}

export function Seg<T extends string>({ value, options, onChange, guide }: { value: T; options: [T, string][]; onChange: (v: T) => void; guide?: string }) {
  return (
    <div className="seg" role="tablist" data-guide={guide}>
      {options.map(([v, l]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} className={value === v ? "on" : ""} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

export function Num({ label, value, onChange, step = 1, min, max, suffix, hint }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string; hint?: string }) {
  return (
    <div className="field">
      <label>{label}{suffix ? ` (${suffix})` : ""}</label>
      <input className="input" type="number" inputMode="decimal" value={Number.isFinite(value) ? value : 0} step={step} min={min} max={max} onChange={(e) => onChange(parseFloat(e.target.value.replace(",", ".")) || 0)} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Slider({ label, value, onChange, min, max, unit = "tyg." }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; unit?: string }) {
  return (
    <div className="field">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <label>{label}</label>
        <b style={{ color: "var(--blue)" }}>{value} {unit}</b>
      </div>
      <input type="range" min={min} max={Math.max(min, max)} value={Math.min(value, max)} onChange={(e) => onChange(parseInt(e.target.value, 10))} />
      <div className="row" style={{ justifyContent: "space-between" }}><small>{min}</small><small>{max}</small></div>
    </div>
  );
}

export const Status = ({ s }: { s: string }) => {
  const map: Record<string, [string, string]> = {
    przysluguje: ["b-ok", "Przysługuje"],
    przyznano: ["b-ok", "Przyznano"],
    nie_przysluguje: ["b-no", "Nie przysługuje"],
    odmowa: ["b-no", "Odmowa"],
    warunkowo: ["b-warn", "Warunkowo"],
    czesciowo: ["b-warn", "Częściowo"],
    informacja: ["b-info", "Informacja"],
    wysokie: ["b-no", "Ryzyko wysokie"],
    srednie: ["b-warn", "Ryzyko średnie"],
    niskie: ["b-info", "Do zapamiętania"],
  };
  const [c, l] = map[s] || ["b-info", s];
  return <span className={`badge ${c}`}>{l}</span>;
};

export function AiBadge({ on = true }: { on?: boolean }) {
  return <span className="badge b-ai" title="Funkcja wspierana przez AI"><Icon name="sparkles" size={13} /> {on ? "AI" : "AI (opcjonalnie)"}</span>;
}

const CLS: Record<Period["type"], string> = { macierzynski: "c-mac", warunki: "c-war", uzupelniajacy: "c-uzu", rodzicielski: "c-rodz", ojcowski: "c-ojc" };

/** Czy etykieta segmentu jest ucięta (albo ukryta)? Wtedy po najechaniu pokazujemy pełną nazwę nad segmentem. */
function markTruncated(e: React.SyntheticEvent<HTMLDivElement>) {
  const lab = e.currentTarget.querySelector<HTMLElement>(".tl-label");
  e.currentTarget.dataset.trunc = !lab || lab.scrollWidth > lab.clientWidth + 1 ? "1" : "0";
}

export function Timeline({ res }: { res: CalcResult }) {
  if (!res.periods.length) return null;
  const start = res.periods.map((p) => p.start).sort()[0];
  const end = res.periods.map((p) => p.end).sort().at(-1)!;
  const total = Math.max(1, diffDays(start, end) + 1);
  const rows: ("A" | "B")[] = ["A", "B"];
  return (
    <div>
      <div className="tl">
        {rows.map((w) => {
          const ps = res.periods.filter((p) => p.who === w);
          if (!ps.length) return null;
          return (
            <div className="tl-row" key={w}>
              <span className="who">{res.labels[w]}</span>
              <div className="tl-track">
                {ps.map((p, i) => {
                  // pozycja z faktycznych dat (nie z liczby dni zasiłku – przy pracy na części etatu okres jest dłuższy);
                  // przycięcie do osi, żeby żaden pasek nie wychodził poza wspólną skalę
                  const left = Math.min(100, Math.max(0, (diffDays(start, p.start) / total) * 100));
                  const span = ((diffDays(p.start, p.end) + 1) / total) * 100;
                  const width = Math.max(0.8, Math.min(span, 100 - left));
                  const name = p.label.replace("Urlop ", "");
                  // dymek przy krawędziach osi wyrównujemy do krawędzi, żeby nie wychodził poza kartę
                  const edge = left < 12 ? "start" : left + width > 88 ? "end" : "mid";
                  return (
                    <div key={i} className={`tl-seg ${p.workFraction > 0 ? "c-praca" : CLS[p.type]}`} style={{ left: `${left}%`, width: `${width}%` }}
                      data-full={name} data-edge={edge} tabIndex={0} aria-label={`${p.label}: ${fmtDate(p.start)} – ${fmtDate(p.end)}`}
                      onMouseEnter={markTruncated} onFocus={markTruncated}>
                      {width > 7 && <span className="tl-label">{name}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="tl-axis"><span>{fmtDate(start)}</span><span>{fmtDate(end)}</span></div>
      <div className="legend mt">
        <span><i className="c-mac" />Macierzyński</span>
        <span><i className="c-war" />Na warunkach macierzyńskiego</span>
        <span><i className="c-uzu" />Uzupełniający</span>
        <span><i className="c-rodz" />Rodzicielski</span>
        <span><i className="c-praca" />Rodzicielski + praca</span>
        <span><i className="c-ojc" />Ojcowski</span>
      </div>
    </div>
  );
}

export function PeriodsTable({ res, netPct }: { res: CalcResult; netPct: number }) {
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr><th>Kto</th><th>Okres</th><th>Od – do</th><th className="num">Dni</th><th className="num">Stawka</th><th className="num">Miesięcznie brutto</th><th className="num">ok. netto</th><th className="num">Razem brutto</th></tr>
        </thead>
        <tbody>
          {res.periods.map((p, i) => (
            <tr key={i}>
              <td>{res.labels[p.who]}</td>
              <td>{p.label}{p.workFraction > 0 && <><br /><small>praca {Math.round(p.workFraction * 100)}% etatu</small></>}{p.minApplied && <><br /><small>kwota minimalna</small></>}</td>
              <td>{fmtDate(p.start)} – {fmtDate(p.end)}</td>
              <td className="num">{p.days}</td>
              <td className="num">{p.rate}%</td>
              <td className="num">{zl(p.monthly)}</td>
              <td className="num">{zl(p.monthly * (1 - netPct / 100))}</td>
              <td className="num"><b>{zl(p.total)}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Notes({ res }: { res: { errors?: string[]; warnings?: string[]; info?: string[] } }) {
  return (
    <>
      {res.errors?.map((e, i) => <div key={"e" + i} className="alert a-err"><Icon name="x" size={18} /><span>{e}</span></div>)}
      {res.warnings?.map((e, i) => <div key={"w" + i} className="alert a-warn"><Icon name="alert" size={18} /><span>{e}</span></div>)}
      {res.info?.map((e, i) => <div key={"i" + i} className="alert a-info"><Icon name="info" size={18} /><span>{e}</span></div>)}
    </>
  );
}
