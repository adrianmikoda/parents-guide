"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { useDialog } from "@/components/useDialog";
import { api } from "@/components/AppContext";
import { AiBadge } from "@/components/ui";
import Markdown from "@/components/Markdown";
import { getLang, t } from "@/lib/i18n";
import Link from "next/link";

type M = { role: "user" | "assistant"; content: string };
const SUGG = ["Ile dostanę przy stawce 81,5%?", "Jak podzielić urlop rodzicielski z partnerem?", "Urodził się wcześniak – co mi przysługuje?", "Prowadzę firmę i mam kwotę do uregulowania w ZUS", "Czy mogę pracować na pół etatu na rodzicielskim?", "Urlop ojcowski – do kiedy?"];

/** Fragment odpowiedzi do animacji pisania – domyka niezamknięte ** i `, żeby nie migały znaczniki Markdown. */
function partial(text: string, n: number) {
  let s = text.slice(0, n);
  if ((s.match(/\*\*/g)?.length ?? 0) % 2) s += "**";
  if ((s.match(/`/g)?.length ?? 0) % 2) s += "`";
  return s;
}

export default function Asystent() {
  const [msgs, setMsgs] = useState<M[]>([{ role: "assistant", content: "Dzień dobry! Jestem asystentem **Przewodnika Rodzica**. Zapytaj o zasiłek chorobowy w ciąży, macierzyński, rodzicielski, ojcowski, adopcję lub sytuacje szczególne." }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<string>("");
  const [typing, setTyping] = useState<number | null>(null); // indeks animowanej wiadomości
  const [shown, setShown] = useState(0);
  const end = useRef<HTMLDivElement>(null);
  const [human, setHuman] = useState(false);
  const humanBox = useRef<HTMLDivElement>(null);
  useDialog(humanBox, () => setHuman(false), human); // okno „Połącz z człowiekiem”
  const [ticket, setTicket] = useState<string | null>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs.length, busy]);

  // Animacja pisania: ok. 2 s niezależnie od długości odpowiedzi, przewijanie razem z tekstem.
  useEffect(() => {
    if (typing == null) return;
    const full = msgs[typing]?.content ?? "";
    const step = Math.max(2, Math.ceil(full.length / 120));
    const id = setInterval(() => {
      setShown((n) => Math.min(full.length, n + step));
      end.current?.scrollIntoView({ block: "end" });
    }, 16);
    return () => clearInterval(id);
  }, [typing, msgs]);
  useEffect(() => {
    if (typing != null && shown >= (msgs[typing]?.content.length ?? 0)) setTyping(null);
  }, [shown, typing, msgs]);

  async function ask(q: string) {
    if (!q.trim() || busy || typing != null) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next);
    setText("");
    setBusy(true);
    let answer = "Nie udało się uzyskać odpowiedzi. Spróbuj ponownie za chwilę.";
    try {
      const r = await api("/api/assistant", { messages: next.slice(1), lang: getLang() });
      setMode(r.mode);
      if (r.answer) answer = r.answer;
    } catch {
      setMode("");
    } finally {
      setBusy(false);
    }
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setMsgs([...next, { role: "assistant", content: t(answer) }]);
    if (!reduce) { setShown(0); setTyping(next.length); }
  }

  /** Przekazanie rozmowy konsultantowi – symulacja (w produkcji: kolejka konsultantów / e-wizyta ZUS). */
  function handoff() {
    const nr = ticket ?? `KON-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicket(nr);
    setHuman(false);
    const asked = msgs.filter((m) => m.role === "user").length;
    const text = `**Przekazano rozmowę konsultantowi** (symulacja)

Numer zgłoszenia: **${nr}**. ${asked ? `Konsultant zobaczy całą rozmowę (${asked} ${asked === 1 ? "pytanie" : asked < 5 ? "pytania" : "pytań"}) i` : "Konsultant"} odpowie w PUE/eZUS, zwykle w ciągu 1 dnia roboczego.

W pilnej sprawie zadzwoń do Centrum Obsługi Telefonicznej ZUS: **22 560 16 00** (pn.–pt. 7:00–18:00).`;
    const next = [...msgs, { role: "assistant" as const, content: t(text) }];
    setMsgs(next);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { setShown(0); setTyping(next.length - 1); }
  }

  const skip = () => { if (typing != null) { setShown(msgs[typing].content.length); setTyping(null); } };
  const locked = busy || typing != null;

  return (
    <div className="card" style={{ maxWidth: 820, margin: "0 auto" }}>
      <div className="card-head">
        <h2 style={{ margin: 0 }}>Asystent Przewodnika Rodzica</h2>
        <div className="row">
          <button type="button" className="btn btn-outline" data-guide="asystent-czlowiek" disabled={locked} onClick={() => setHuman(true)}><Icon name="users" size={18} /> Połącz z człowiekiem</button>
          <AiBadge on={false} />{mode && <span className={`badge ${mode === "ai" ? "b-ai" : "b-info"}`}>{mode === "ai" ? "odpowiedź AI (Claude)" : "tryb regułowy"}</span>}</div>
      </div>
      <p className="hint">Asystent korzysta z aktualnych parametrów narzędzia. Przy włączonym AI odpowiada model Claude; bez klucza – baza odpowiedzi regułowych. Odpowiedzi mają charakter informacyjny.</p>
      <div className="chat mt" style={{ minHeight: 280 }}>
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="bubble me">{m.content}</div>
          ) : (
            <div key={i} className="bubble bot" aria-busy={i === typing} onClick={i === typing ? skip : undefined} title={i === typing ? "Kliknij, aby pokazać całą odpowiedź" : undefined}>
              <Markdown text={i === typing ? partial(m.content, shown) : m.content} />
              {i === typing && <span className="caret" aria-hidden />}
            </div>
          ),
        )}
        {busy && <div className="bubble bot" aria-label="Asystent pisze"><span className="dots"><i /><i /><i /></span></div>}
        <div ref={end} />
      </div>
      <div className="pill-tabs mt" data-guide="t-asystent-podpowiedzi">{SUGG.map((s) => <button key={s} disabled={locked} onClick={() => ask(s)}>{s}</button>)}</div>
      <form className="row mt" data-guide="t-asystent-pole" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
        <input className="input" style={{ flex: 1 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Napisz pytanie…" aria-label="Pytanie" />
        <button className="btn btn-primary" disabled={locked}><Icon name="send" size={18} /> Wyślij</button>
      </form>

      {human && (
        <div className="modal-bg" role="dialog" aria-modal aria-labelledby="human-title" onClick={(e) => { if (e.target === e.currentTarget) setHuman(false); }}>
          <div className="modal" ref={humanBox} tabIndex={-1}>
            <div className="card-head"><h2 id="human-title" style={{ margin: 0 }}>Połącz z człowiekiem</h2><button className="guide-x" aria-label="Zamknij" onClick={() => setHuman(false)}><Icon name="x" size={20} /></button></div>
            <p className="muted">Wybierz, jak chcesz porozmawiać z konsultantem ZUS.</p>
            <div className="list">
              <div className="li" style={{ alignItems: "center" }}>
                <span style={{ color: "var(--accent)", display: "inline-flex" }}><Icon name="chat" /></span>
                <div className="grow"><b>Przekaż tę rozmowę konsultantowi</b><br /><small>Konsultant zobaczy Twoje pytania i odpowie w PUE/eZUS (symulacja).</small></div>
                <button className="btn btn-primary" autoFocus onClick={handoff}>{ticket ? "Dołącz do zgłoszenia" : "Przekaż"}</button>
              </div>
              <div className="li" style={{ alignItems: "center" }}>
                <span style={{ color: "var(--accent)", display: "inline-flex" }}><Icon name="users" /></span>
                <div className="grow"><b>Zadzwoń: 22 560 16 00</b><br /><small>Centrum Obsługi Telefonicznej ZUS, pn.–pt. 7:00–18:00.</small></div>
                <a className="btn btn-outline" href="tel:+48225601600">Zadzwoń</a>
              </div>
              <div className="li" style={{ alignItems: "center" }}>
                <span style={{ color: "var(--accent)", display: "inline-flex" }}><Icon name="send" /></span>
                <div className="grow"><b>Napisz wiadomość do ZUS</b><br /><small>Otworzy formularz „Zadaj pytanie” w zakładce „Moje dane ZUS” (symulacja).</small></div>
                <Link className="btn btn-outline" href="/zus?tab=pytanie">Napisz</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
