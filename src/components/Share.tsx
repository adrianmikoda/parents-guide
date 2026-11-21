"use client";
import { useRef, useState } from "react";
import Icon from "./Icon";
import { useDialog } from "./useDialog";

/**
 * Udostępnianie informacji o przysługujących zasiłkach: systemowe „Udostępnij” (telefon), kopiowanie
 * do schowka albo e-mail (np. do partnera, pracodawcy, biura rachunkowego). Tekst można przed wysłaniem poprawić.
 */
export default function ShareDialog({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  const [body, setBody] = useState(text);
  const [status, setStatus] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useDialog(box, onClose);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function share() {
    try { await navigator.share({ title, text: body }); setStatus("Udostępniono."); }
    catch (e) { if ((e as Error).name !== "AbortError") setStatus("Nie udało się udostępnić – skopiuj tekst."); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(body); setStatus("Skopiowano do schowka."); }
    catch { setStatus("Zaznacz tekst i skopiuj go ręcznie (Ctrl+C)."); }
  }
  const mail = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="modal-bg" role="dialog" aria-modal aria-labelledby="share-title" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 640 }} ref={box} tabIndex={-1}>
        <div className="card-head"><h2 id="share-title" style={{ margin: 0 }}>Udostępnij informacje o zasiłkach</h2><button className="guide-x" aria-label="Zamknij" onClick={onClose}><Icon name="x" size={20} /></button></div>
        <p className="muted">Np. partnerowi, pracodawcy albo biuru rachunkowemu. Możesz poprawić tekst przed wysłaniem. Wyliczenie ma charakter informacyjny.</p>
        <textarea className="input" rows={12} value={body} onChange={(e) => setBody(e.target.value)} aria-label="Treść do udostępnienia" style={{ fontSize: 14, fontFamily: "inherit" }} />
        <div className="row mt">
          {canShare && <button className="btn btn-primary" onClick={share}><Icon name="send" size={18} /> Udostępnij…</button>}
          <button className={`btn ${canShare ? "btn-outline" : "btn-primary"}`} onClick={copy}>Kopiuj tekst</button>
          <a className="btn btn-outline" href={mail}>Wyślij e-mailem</a>
          {status && <span className="badge b-ok" role="status">{status}</span>}
        </div>
      </div>
    </div>
  );
}
