"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { useApp } from "@/components/AppContext";
import { Params } from "@/lib/params";

const GROUPS: [keyof Params, string][] = [["stawki", "Stawki procentowe"], ["wymiary", "Wymiary urlopów i limity"], ["chorobowy", "Zasiłek chorobowy"], ["kwoty", "Kwoty i progi"], ["terminy", "Terminy"]];

export default function Admin() {
  const { reloadParams } = useApp();
  const [pin, setPin] = useState("");
  const [ok, setOk] = useState(false);
  const [pinErr, setPinErr] = useState("");
  const [checking, setChecking] = useState(false);
  const [p, setP] = useState<Params | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ t: string; c: string } | null>(null);
  const [by, setBy] = useState("administrator");

  const load = async () => {
    const r = await fetch("/api/params").then((r) => r.json());
    setP(r.params); setLabels(r.labels); setHistory(r.history);
  };
  useEffect(() => { load(); }, []);

  const setVal = (g: keyof Params, k: string, v: unknown) => setP((s) => (s ? { ...s, [g]: { ...(s[g] as object), [k]: v } } as Params : s));

  async function save(method: "PUT" | "DELETE") {
    const r = await fetch("/api/params", { method, headers: { "Content-Type": "application/json", "x-admin-pin": pin }, body: method === "PUT" ? JSON.stringify({ params: p, by }) : undefined }).then((r) => r.json());
    if (r.error) return setMsg({ t: r.error, c: "a-err" });
    setP(r.params); setHistory(r.history);
    setMsg({ t: `Zapisano wersję ${r.params.version}. Zmiany: ${r.changes.length ? r.changes.join("; ") : "brak"}`, c: "a-ok" });
    reloadParams();
  }

  if (!ok)
    return (
      <div className="card" data-guide="t-admin-pin" style={{ maxWidth: 440, margin: "0 auto" }}>
        <h1 className="icon-title" style={{ fontSize: 24 }}><Icon name="settings" /> Panel administracyjny</h1>
        <p className="muted">Zmiana parametrów prawnych (stawki, wymiary, terminy) bez zmiany kodu – np. po nowelizacji przepisów. PIN ustawia administrator wdrożenia (zmienna ADMIN_PIN).</p>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setPinErr(""); setChecking(true);
          const r = await fetch("/api/params", { method: "POST", headers: { "x-admin-pin": pin } }).catch(() => null);
          setChecking(false);
          if (r?.ok) setOk(true); else setPinErr(r ? "Nieprawidłowy PIN." : "Brak połączenia z serwerem. Spróbuj ponownie.");
        }} className="grid" style={{ gap: 10 }}>
          <label htmlFor="admin-pin" className="lbl2">PIN administratora</label>
          <input id="admin-pin" className="input" type="password" inputMode="numeric" autoComplete="off" value={pin} aria-invalid={!!pinErr} aria-describedby={pinErr ? "admin-pin-err" : undefined} onChange={(e) => { setPin(e.target.value); setPinErr(""); }} />
          {pinErr && <div id="admin-pin-err" className="alert a-err" role="alert"><Icon name="alert" size={18} /><span>{pinErr}</span></div>}
          <button className="btn btn-primary" disabled={checking || !pin}>{checking ? "Sprawdzanie…" : "Wejdź"}</button>
        </form>
      </div>
    );
  if (!p) return <div className="spinner" />;

  return (
    <div>
      <div className="card mb">
        <div className="card-head">
          <div><h1 style={{ margin: 0 }}>Parametry prawne</h1><small>Wersja {p.version} · ostatnia zmiana {new Date(p.updatedAt).toLocaleString("pl-PL")} ({p.updatedBy})</small></div>
          <div className="row">
            <input className="input" style={{ width: 180 }} value={by} onChange={(e) => setBy(e.target.value)} aria-label="Autor zmiany" />
            <button className="btn btn-primary" data-guide="admin-zapisz" onClick={() => save("PUT")}>Zapisz zmiany</button>
            <button className="btn btn-danger" onClick={() => save("DELETE")}>Przywróć domyślne</button>
          </div>
        </div>
        {msg && <div className={`alert ${msg.c}`}>{msg.t}</div>}
        <small>Zmiany obowiązują natychmiast we wszystkich kalkulatorach, w API (/api/calculate) i w asystencie.</small>
      </div>
      {GROUPS.map(([g, title]) => (
        <div key={g} className="card">
          <h2>{title}</h2>
          <div className="grid g2">
            {Object.entries(p[g] as Record<string, unknown>).map(([k, v]) => (
              <div key={k} className="field">
                <label htmlFor={`adm-${g}-${k}`}>{labels[`${g}.${k}`] || k}</label>
                {Array.isArray(v) ? (
                  <input id={`adm-${g}-${k}`} className="input" value={(v as number[]).join(", ")} onChange={(e) => setVal(g, k, e.target.value.split(",").map((x) => parseFloat(x.trim())).filter((x) => !isNaN(x)))} />
                ) : (
                  <input id={`adm-${g}-${k}`} className="input" type="number" step="any" value={v as number} onChange={(e) => setVal(g, k, parseFloat(e.target.value))} />
                )}
                <span className="hint">{g}.{k}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="card">
        <h2>Historia zmian (audyt)</h2>
        {history.length === 0 && <p className="muted">Brak zmian.</p>}
        <div className="list">
          {history.map((h, i) => <div key={i} className="li"><span className="badge b-info">v{h.version}</span><div className="grow"><b>{h.by}</b> · <small>{new Date(h.at).toLocaleString("pl-PL")}</small><br /><small>{h.changes.join("; ") || "bez zmian"}</small></div></div>)}
        </div>
      </div>
    </div>
  );
}
