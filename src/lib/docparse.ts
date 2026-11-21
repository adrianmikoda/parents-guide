/**
 * Regułowy parser tekstu dokumentów ZUS (Z-3, Z-3a, ZAM, ZAS-53, poświadczenia, e-ZLA).
 * Działa bez AI. Gdy tekstu nie da się odczytać (skan) lub pewność jest niska,
 * API może użyć ekstrakcji AI (Claude) – patrz /api/documents/parse.
 */
export type Extracted = {
  docType: string;
  docTypeLabel: string;
  confidence: number;
  pesel?: string;
  title?: "umowa_o_prace" | "zlecenie_chorobowe" | "jdg_chorobowe" | "zlecenie_bez" | "jdg_bez";
  insuredAtPayer?: number;
  base?: number;
  monthly: { month: string; amount: number }[];
  birthDate?: string;
  children?: number;
  periods: { from: string; to: string }[];
  kodB?: boolean;
  zaZyciem?: boolean;
  stillbirth?: boolean;
  decision?: "przyznano" | "odmowa";
  dates: string[];
  notes: string[];
  source: "reguly" | "ai";
};

const TYPES: [RegExp, string, string][] = [
  [/Z-?3a\b/i, "Z-3a", "Zaświadczenie płatnika składek (zleceniobiorca)"],
  [/Z-?3b\b/i, "Z-3b", "Zaświadczenie płatnika (przedsiębiorca) – formularz zlikwidowany"],
  [/ZAS-?12\b/i, "ZAS-12", "Zaświadczenie płatnika na dalszy okres"],
  [/ZAS-?53\b/i, "ZAS-53", "Wniosek o zasiłek chorobowy"],
  [/\bZ-?3\b|ZAŚWIADCZENIE PŁATNIKA SKŁADEK/i, "Z-3", "Zaświadczenie płatnika składek (pracownik)"],
  [/\bZUR\b/i, "ZUR", "Wniosek o zasiłek za okres urlopu rodzicielskiego (połączony z ZAM)"],
  [/\bZAO\b/i, "ZAO", "Wniosek o zasiłek za okres urlopu ojcowskiego (połączony z ZAM)"],
  [/\bZAM\b|WNIOSEK O ZASIŁEK MACIERZYŃSKI/i, "ZAM", "Wniosek o zasiłek macierzyński"],
  [/poświadczeni\w* ubezpieczenia/i, "POSW", "Poświadczenie ubezpieczenia chorobowego"],
  [/e-?ZLA|ZUS ZLA|zaświadczenie lekarskie/i, "ZLA", "Zaświadczenie lekarskie e-ZLA"],
  [/za życiem/i, "ZAZYCIEM", "Zaświadczenie „Za życiem”"],
  [/martw\w+ urodz/i, "MARTWE", "Dokument o martwym urodzeniu"],
];

const toISO = (d: string) => {
  const m = d.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const n = d.match(/(\d{4})-(\d{2})-(\d{2})/);
  return n ? n[0] : undefined;
};
const num = (s: string) => parseFloat(s.replace(/[\s\u00a0]/g, "").replace(",", "."));
const AMOUNT = /(\d{1,3}(?:[ \u00a0]\d{3})+|\d+)[,.]\d{2}/;
const DATE = /\b\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g;

export function parseText(text: string): Extracted {
  const t = text.replace(/\r/g, "");
  const flat = t.replace(/\s+/g, " ");
  let docType = "NIEZNANY";
  let docTypeLabel = "Nie rozpoznano typu dokumentu";
  let confidence = 0.2;
  for (const [re, code, label] of TYPES) {
    if (re.test(flat)) {
      docType = code;
      docTypeLabel = label;
      confidence = 0.6;
      break;
    }
  }
  const notes: string[] = [];
  const out: Extracted = { docType, docTypeLabel, confidence, monthly: [], periods: [], dates: [], notes, source: "reguly" };

  const pesel = flat.match(/\b\d{11}\b/);
  if (pesel) out.pesel = pesel[0];

  out.dates = Array.from(new Set((flat.match(DATE) || []).map((d) => toISO(d)!).filter(Boolean)));

  const bd = flat.match(/(dat\w* (porodu|urodzenia dziecka|przyjęcia dziecka)|dziecko urodzi\w*)[^0-9]{0,40}(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4}|\d{4}-\d{2}-\d{2})/i);
  if (bd) out.birthDate = toISO(bd[3]);

  const base = flat.match(new RegExp("podstaw\\w* wymiaru( zasiłku)?[^0-9]{0,60}" + AMOUNT.source, "i"));
  if (base) out.base = num(base[0].match(AMOUNT)![0]);

  const cnt = flat.match(/liczb\w* (osób )?(zgłoszonych do ubezpieczenia chorobowego|ubezpieczonych)[^0-9]{0,60}(\d{1,6})/i);
  if (cnt) out.insuredAtPayer = parseInt(cnt[3], 10);
  else if (/(powyżej|więcej niż) 20/i.test(flat)) out.insuredAtPayer = 21;
  else if (/(nie więcej niż|do) 20 (ubezpieczonych|osób)/i.test(flat)) out.insuredAtPayer = 20;

  // wiersze wynagrodzeń: "MM.YYYY ... 1 234,56" lub "MM/YYYY"
  // miesiąc nie może być częścią pełnej daty (dd.mm.rrrr), a kwota nie może być początkiem kolejnej daty
  const rowRe = new RegExp("(?<![\\d.\\-/])(0[1-9]|1[0-2])[./-](20\\d{2})\\b[^0-9]{0,30}((?:\\d{1,3}(?:[ \\u00a0]\\d{3})+|\\d+)[,.]\\d{2})(?![.\\-/]?\\d)", "g");
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = rowRe.exec(flat))) {
    const key = `${m[2]}-${m[1]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const amount = num(m[3]);
    if (amount > 0 && amount < 200000) out.monthly.push({ month: key, amount });
  }
  out.monthly.sort((a, b) => (a.month < b.month ? -1 : 1));

  const perRe = /od\s*(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4}|\d{4}-\d{2}-\d{2})\s*(r\.)?\s*do\s*(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4}|\d{4}-\d{2}-\d{2})/gi;
  while ((m = perRe.exec(flat))) out.periods.push({ from: toISO(m[1])!, to: toISO(m[3])! });

  const ch = flat.match(/liczb\w* (urodzonych )?dzieci[^0-9]{0,30}(\d)/i);
  if (ch) out.children = parseInt(ch[2], 10);
  else if (/bliźni/i.test(flat)) out.children = 2;

  if (/kod\w*[^.]{0,20}\bB\b/.test(flat)) out.kodB = true;
  if (/za życiem/i.test(flat)) out.zaZyciem = true;
  if (/martw\w+ urodz/i.test(flat)) out.stillbirth = true;

  if (/umow\w* zleceni/i.test(flat)) out.title = /dobrowoln\w* ubezpieczeni\w* chorobow/i.test(flat) ? "zlecenie_chorobowe" : "zlecenie_bez";
  else if (/działalnoś\w* gospodarcz/i.test(flat)) out.title = /dobrowoln\w* ubezpieczeni\w* chorobow|podlega ubezpieczeniu chorobowemu/i.test(flat) ? "jdg_chorobowe" : "jdg_bez";
  else if (/umow\w* o pracę|pracowni[kc]/i.test(flat)) out.title = "umowa_o_prace";
  if (docType === "Z-3") out.title = out.title ?? "umowa_o_prace";
  if (docType === "Z-3a") out.title = out.title ?? "zlecenie_chorobowe";
  if (/nie podlega\w* ubezpieczeniu chorobowemu/i.test(flat)) {
    notes.push("Dokument wskazuje na brak ubezpieczenia chorobowego.");
    out.decision = "odmowa";
  }
  if (/odm\w+ (prawa|przyznania|wypłaty)/i.test(flat)) out.decision = "odmowa";
  else if (/przyzna\w+|wypłac\w+ zasiłek/i.test(flat) && !out.decision) out.decision = "przyznano";

  const found = [out.pesel, out.base, out.monthly.length, out.birthDate, out.insuredAtPayer].filter(Boolean).length;
  out.confidence = Math.min(0.95, confidence + found * 0.07);
  if (!flat.trim()) {
    out.confidence = 0;
    notes.push("Brak warstwy tekstowej (prawdopodobnie skan) – użyj ekstrakcji AI albo wprowadź dane ręcznie.");
  }
  if (!out.base && out.monthly.length) notes.push("Podstawa wymiaru nie została wprost wskazana – zostanie wyliczona ze średniej wynagrodzeń.");
  return out;
}
