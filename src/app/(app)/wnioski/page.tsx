"use client";
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { api, useApp } from "@/components/AppContext";
import { documentsFor, fmtDate, Title, TITLE_LABELS } from "@/lib/engine";

type F = { name: string; label: string; type?: "text" | "date" | "number" | "select" | "textarea"; options?: string[] };
type Spec = { key: string; title: string; to: string; desc: string; fields: F[]; body: (d: Record<string, string>) => string; zusForm?: string };

const SPECS: Spec[] = [
  {
    key: "urlop_macierzynski", title: "Wniosek o urlop macierzyński (i rodzicielski)", to: "Pracodawca", desc: "Jeden wniosek może obejmować urlop macierzyński i bezpośrednio po nim rodzicielski.",
    fields: [
      { name: "start", label: "Początek urlopu macierzyńskiego", type: "date" },
      { name: "dzieci", label: "Liczba dzieci urodzonych przy jednym porodzie", type: "number" },
      { name: "rodzicielski", label: "Urlop rodzicielski bezpośrednio po macierzyńskim", type: "select", options: ["Nie", "Tak – w pełnym wymiarze", "Tak – w części"] },
      { name: "tygodnie", label: "Wymiar urlopu rodzicielskiego (tyg.)", type: "number" },
      { name: "stawka", label: "Stawka zasiłku", type: "select", options: ["100% / 70%", "81,5% za cały okres (wniosek do 21 dni po porodzie)"] },
    ],
    body: (d) => `Proszę o udzielenie urlopu macierzyńskiego od dnia ${fmtDate(d.start)} w wymiarze przysługującym przy urodzeniu ${d.dzieci || 1} dziecka/dzieci przy jednym porodzie.${d.rodzicielski?.startsWith("Tak") ? `\nJednocześnie wnoszę o udzielenie, bezpośrednio po urlopie macierzyńskim, urlopu rodzicielskiego w wymiarze ${d.tygodnie || "—"} tygodni.` : ""}\nWnioskowana stawka zasiłku macierzyńskiego: ${d.stawka || "100% / 70%"}.\nZałączniki: skrócony odpis aktu urodzenia dziecka (lub zaświadczenie lekarskie o przewidywanej dacie porodu).`,
  },
  {
    key: "urlop_rodzicielski", title: "Wniosek o urlop rodzicielski (lub jego część)", to: "Pracodawca", desc: "Składany 21 dni przed rozpoczęciem; do 5 części.",
    fields: [
      { name: "od", label: "Od", type: "date" }, { name: "do", label: "Do", type: "date" },
      { name: "czesc", label: "Która część", type: "select", options: ["1", "2", "3", "4", "5"] },
      { name: "drugi", label: "Drugi rodzic korzysta z urlopu", type: "select", options: ["Nie", "Tak – jednocześnie", "Tak – w innym terminie"] },
    ],
    body: (d) => `Proszę o udzielenie urlopu rodzicielskiego (część ${d.czesc || 1}) w okresie od ${fmtDate(d.od)} do ${fmtDate(d.do)}.\nOświadczenie o korzystaniu z urlopu przez drugiego rodzica: ${d.drugi || "Nie"}.`,
  },
  {
    key: "urlop_ojcowski", title: "Wniosek o urlop ojcowski", to: "Pracodawca", desc: "14 dni, w całości lub w 2 częściach; wniosek 7 dni przed.",
    fields: [{ name: "od", label: "Od", type: "date" }, { name: "dni", label: "Liczba dni (7 lub 14)", type: "number" }, { name: "dziecko", label: "Data urodzenia dziecka", type: "date" }],
    body: (d) => `Proszę o udzielenie urlopu ojcowskiego w wymiarze ${d.dni || 14} dni od dnia ${fmtDate(d.od)}, w związku z urodzeniem dziecka w dniu ${fmtDate(d.dziecko)}.\nZałącznik: skrócony odpis aktu urodzenia dziecka.`,
  },
  {
    key: "urlop_uzupelniajacy", title: "Wniosek o uzupełniający urlop macierzyński", to: "Pracodawca", desc: "Wcześniak lub hospitalizacja noworodka – bezpośrednio po macierzyńskim.",
    fields: [{ name: "tydzien", label: "Tydzień ciąży przy porodzie", type: "number" }, { name: "masa", label: "Masa urodzeniowa (g)", type: "number" }, { name: "szpital", label: "Okres hospitalizacji (od–do)", type: "text" }],
    body: (d) => `Proszę o udzielenie uzupełniającego urlopu macierzyńskiego bezpośrednio po urlopie macierzyńskim.\nDziecko urodziło się w ${d.tydzien || "—"}. tygodniu ciąży, masa urodzeniowa ${d.masa || "—"} g, hospitalizacja: ${d.szpital || "—"}.\nZałącznik: zaświadczenie wydane przez szpital.`,
  },
  {
    key: "praca_rodzicielski", title: "Wniosek o łączenie urlopu rodzicielskiego z pracą", to: "Pracodawca", desc: "Praca do ½ etatu – urlop wydłuża się proporcjonalnie.",
    fields: [{ name: "od", label: "Od", type: "date" }, { name: "wymiar", label: "Wymiar pracy", type: "select", options: ["1/4 etatu", "1/3 etatu", "1/2 etatu"] }],
    body: (d) => `Proszę o umożliwienie mi wykonywania pracy w wymiarze ${d.wymiar || "1/2 etatu"} w trakcie urlopu rodzicielskiego od dnia ${fmtDate(d.od)}. Wniosek składam nie później niż 21 dni przed rozpoczęciem pracy.`,
  },
  {
    key: "ZAM", title: "ZAM – wniosek o zasiłek macierzyński (symulacja)", to: "ZUS (PUE/eZUS)", desc: "Dla osób niebędących pracownikami (zlecenie, działalność). Od 24.10.2026 obejmuje też dawne ZUR i ZAO.", zusForm: "https://www.zus.pl/baza-wiedzy/wzory-formularzy/zasilki",
    fields: [
      { name: "okres", label: "Zasiłek za okres", type: "select", options: ["urlopu macierzyńskiego", "urlopu macierzyńskiego i rodzicielskiego", "urlopu rodzicielskiego", "urlopu ojcowskiego", "urlopu na warunkach urlopu macierzyńskiego"] },
      { name: "od", label: "Od", type: "date" }, { name: "do", label: "Do", type: "date" },
      { name: "rachunek", label: "Numer rachunku bankowego", type: "text" },
      { name: "stawka", label: "Stawka", type: "select", options: ["100% / 70%", "81,5%"] },
    ],
    body: (d) => `Wnoszę o wypłatę zasiłku macierzyńskiego za okres ${d.okres || "urlopu macierzyńskiego"}: ${fmtDate(d.od)} – ${fmtDate(d.do)}.\nStawka: ${d.stawka || "100% / 70%"}. Rachunek: ${d.rachunek || "—"}.`,
  },
  {
    key: "ZAS-53", title: "ZAS-53 – wniosek o zasiłek chorobowy (symulacja)", to: "ZUS (PUE/eZUS)", desc: "Dla przedsiębiorców; Z-3b zlikwidowany.", zusForm: "https://www.zus.pl/baza-wiedzy/wzory-formularzy/zasilki",
    fields: [{ name: "zla", label: "Seria i numer e-ZLA", type: "text" }, { name: "rachunek", label: "Numer rachunku bankowego", type: "text" }, { name: "praca", label: "Czy w okresie zwolnienia wykonujesz pracę zarobkową?", type: "select", options: ["Nie", "Tak"] }],
    body: (d) => `Wnoszę o wypłatę zasiłku chorobowego na podstawie zaświadczenia lekarskiego ${d.zla || "—"}.\nOświadczam, że w okresie niezdolności do pracy ${d.praca === "Tak" ? "WYKONUJĘ" : "nie wykonuję"} pracy zarobkowej. Rachunek: ${d.rachunek || "—"}.`,
  },
  {
    key: "odpis_aktu", title: "Odpis aktu urodzenia (rejestr stanu cywilnego – symulacja)", to: "Urząd Stanu Cywilnego", desc: "Odpis skrócony lub zupełny – potrzebny pracodawcy/ZUS.",
    fields: [{ name: "rodzaj", label: "Rodzaj odpisu", type: "select", options: ["skrócony", "zupełny", "wielojęzyczny"] }, { name: "dziecko", label: "Imię i nazwisko dziecka", type: "text" }, { name: "data", label: "Data urodzenia", type: "date" }, { name: "miejsce", label: "Miejsce urodzenia", type: "text" }, { name: "forma", label: "Forma", type: "select", options: ["elektroniczna (skrzynka)", "papierowa – odbiór w USC"] }],
    body: (d) => `Wnoszę o wydanie odpisu ${d.rodzaj || "skróconego"} aktu urodzenia dziecka ${d.dziecko || "—"}, urodzonego ${fmtDate(d.data)} w ${d.miejsce || "—"}. Forma: ${d.forma || "elektroniczna"}. Cel: przedłożenie pracodawcy/ZUS w sprawie zasiłku macierzyńskiego.`,
  },
];

export default function Wnioski() {
  const { params, profile, session } = useApp();
  const me = profile?.person;
  const [title, setTitle] = useState<Title>("umowa_o_prace");
  const [benefit, setBenefit] = useState<Parameters<typeof documentsFor>[1]>("macierzynski");
  const [insured, setInsured] = useState(50);
  const [spec, setSpec] = useState<Spec>(SPECS[0]);
  const [data, setData] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    if (me) { setTitle(me.title); setInsured(me.platnik?.liczbaUbezpieczonych ?? 0); }
  }, [me]);
  useEffect(() => { api("/api/applications").then((r) => setList(r.items)); }, [sent, session]);
  useEffect(() => {
    const due = me?.ciaza?.przewidywanyPorod || "";
    setData({ start: due, od: due, dzieci: "1", dni: "14", dziecko: due, data: due, czesc: "1", rodzaj: "skrócony" });
    setSent(null);
  }, [spec, me]);

  const docs = useMemo(() => documentsFor(title, benefit, insured, params), [title, benefit, insured, params]);
  const text = spec.body(data);
  const header = me ? `${me.imie} ${me.nazwisko}, PESEL ${me.pesel}` : "Imię i nazwisko, PESEL";
  const recipient = spec.to === "Pracodawca" ? me?.platnik?.nazwa || "Pracodawca" : spec.to;

  async function send() {
    const r = await api("/api/applications", { typ: spec.key, dane: { ...data, tresc: text }, adresat: recipient });
    setSent(r.application);
  }

  return (
    <div>
      <div className="card" data-guide="t-wnioski-lista">
        <h1>Gdzie i jakie dokumenty złożyć?</h1>
        <p className="muted">Zasiłek wypłaca płatnik składek, jeśli zgłasza do ubezpieczenia chorobowego więcej niż {params.kwoty.progPlatnikaUbezpieczonych} osób – w pozostałych przypadkach ZUS. Przedsiębiorcom zawsze wypłaca ZUS.</p>
        <div className="grid g3">
          <div className="field"><label>Twój tytuł ubezpieczenia</label>
            <select className="input" value={title} onChange={(e) => setTitle(e.target.value as Title)}>
              {(["umowa_o_prace", "zlecenie_chorobowe", "jdg_chorobowe"] as Title[]).map((t) => <option key={t} value={t}>{TITLE_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="field"><label>Świadczenie</label>
            <select className="input" value={benefit} onChange={(e) => setBenefit(e.target.value as typeof benefit)}>
              <option value="chorobowy">Zasiłek chorobowy w ciąży</option><option value="macierzynski">Zasiłek macierzyński – urlop macierzyński</option><option value="rodzicielski">Zasiłek macierzyński – urlop rodzicielski</option><option value="ojcowski">Zasiłek macierzyński – urlop ojcowski</option><option value="uzupelniajacy">Uzupełniający urlop macierzyński</option><option value="adopcja">Przyjęcie dziecka na wychowanie</option>
            </select>
          </div>
          {!title.startsWith("jdg") && <div className="field"><label>Liczba ubezpieczonych u płatnika</label><input className="input" type="number" value={insured} onChange={(e) => setInsured(parseInt(e.target.value, 10) || 0)} /></div>}
        </div>
        <div className="alert a-info mt"><Icon name="building" size={18} /><span>Zasiłek ustali i wypłaci: <b>{docs.payer}</b></span></div>
        <div className="steps mt" data-guide="wnioski-lista">
          {docs.steps.map((s, i) => (
            <div key={i} className="step"><div><b>{s.doc}</b><br /><small>Gdzie: {s.to} · Kiedy: {s.when}{s.note ? ` · ${s.note}` : ""}</small></div></div>
          ))}
        </div>
      </div>

      <div className="section-title">Wypełnij wniosek</div>
      <div className="pill-tabs mb" data-guide="t-wnioski-formularze">
        {SPECS.map((s) => <button key={s.key} data-guide={`wniosek-${s.key}`} className={s.key === spec.key ? "on" : ""} onClick={() => setSpec(s)}>{s.title.split(" (")[0].replace("Wniosek o ", "")}</button>)}
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", alignItems: "start" }}>
        <div className="card" data-guide="t-wnioski-formularz">
          <h2>{spec.title}</h2>
          <p className="muted">{spec.desc} Adresat: <b>{recipient}</b>.</p>
          {spec.zusForm && <p><a href={spec.zusForm} target="_blank" rel="noreferrer">Oficjalny wzór formularza na zus.pl ↗</a></p>}
          <div className="grid" style={{ gap: 10 }}>
            {spec.fields.map((f) => (
              <div key={f.name} className="field">
                <label>{f.label}</label>
                {f.type === "select" ? (
                  <select className="input" value={data[f.name] ?? ""} onChange={(e) => setData({ ...data, [f.name]: e.target.value })}>
                    <option value="">— wybierz —</option>{f.options!.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className="input" type={f.type || "text"} value={data[f.name] ?? ""} onChange={(e) => setData({ ...data, [f.name]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="card" data-guide="t-wnioski-podglad">
          <div className="card-head"><h2 style={{ margin: 0 }}>Podgląd</h2><button className="btn btn-outline" data-guide="wnioski-drukuj" onClick={() => window.print()}><Icon name="print" size={16} /> Drukuj</button></div>
          <div className="paper" style={{ fontFamily: "Georgia, serif", fontSize: 14 }}>
            <div style={{ textAlign: "right" }}>{fmtDate(new Date().toISOString().slice(0, 10))}</div>
            <div>{header}</div>
            <div style={{ margin: "12px 0", textAlign: "right" }}><b>{recipient}</b></div>
            <div style={{ textAlign: "center", fontWeight: 700, margin: "10px 0" }}>{spec.title.replace(" (symulacja)", "").toUpperCase()}</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{text}</div>
            <div style={{ marginTop: 24, textAlign: "right" }}>podpis: {me ? "podpis zaufany / mObywatel (symulacja)" : "……………"}</div>
          </div>
          <div className="row mt">
            <button className="btn btn-primary" data-guide="wnioski-wyslij" onClick={send}><Icon name="send" size={18} /> Wyślij do: {recipient}</button>
          </div>
          {sent && <div className="alert a-ok mt"><Icon name="check" size={18} /><span>Wysłano (symulacja). Urzędowe poświadczenie odbioru: <b>{sent.upo}</b>. Status: {sent.status}</span></div>}
        </div>
      </div>

      {list.length > 0 && (
        <div className="card mt">
          <h2>Wysłane w tej sesji</h2>
          <div className="list">
            {list.map((a) => (
              <div key={a.id} className="li"><Icon name="doc" size={20} /><div className="grow"><b>{SPECS.find((s) => s.key === a.typ)?.title ?? a.typ}</b><br /><small>{a.adresat} · {new Date(a.zlozono).toLocaleString("pl-PL")} · {a.upo}</small></div><span className="badge b-ok">{a.status.split(" ")[0]}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
