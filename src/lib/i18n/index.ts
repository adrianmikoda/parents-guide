/**
 * Language switching (EN / PL). The app's source text is Polish; English comes from the dictionary in
 * en.json (Polish text → English), built from every user-visible string in src/. Templates cover text with
 * values inserted at runtime, e.g. "Urlop ojcowski – {0} dni ({1})".
 *
 * The page is translated in the browser: I18nRuntime walks the DOM and swaps text nodes and attributes,
 * so components keep rendering Polish and need no changes. Text that never reaches the DOM as-is
 * (Markdown answers, the share text, AI prompts) goes through t() explicitly.
 */
import { useSyncExternalStore } from "react";
import EN from "./en.json";

export type Lang = "en" | "pl";
export const LANG_KEY = "lang";
export const DEFAULT_LANG: Lang = "en";

/** Current language in the browser (set on <html data-lang> before the first render). */
export function getLang(): Lang {
  if (typeof document === "undefined") return "pl";
  return document.documentElement.dataset.lang === "pl" ? "pl" : "en";
}

export function setLang(lang: Lang) {
  try { localStorage.setItem(LANG_KEY, lang); } catch {}
  location.reload();
}

/**
 * Language for rendering. Server rendering and hydration always use Polish (the DOM translator then
 * swaps the text), so React never sees a mismatch; right after hydration it switches to the real language.
 */
export function useLang(): Lang {
  return useSyncExternalStore(noopSubscribe, getLang, () => "pl");
}
const noopSubscribe = () => () => {};

const DICT = EN.s as Record<string, string>;
const HAS_LETTER = /[A-Za-zÀ-ž]/;
/** One regex group per run of placeholders; adjacent placeholders ("{0}{1}") share a group and are split later. */
type Tpl = { re: RegExp; groups: number[][]; en: string; size: number; generic: boolean };
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TPLS: Tpl[] = (EN.t as [string, string][])
  .map(([pl, en]) => {
    const parts = pl.split(/\{(\d+)\}/);
    let re = "^";
    const groups: number[][] = [];
    parts.forEach((p, i) => {
      if (i % 2) {
        if (i > 1 && parts[i - 1] === "") groups[groups.length - 1].push(Number(p));
        else { groups.push([Number(p)]); re += "([\\s\\S]+?)"; }
      } else re += esc(p);
    });
    const literal = parts.filter((_, i) => i % 2 === 0).join("");
    return { re: new RegExp(re + "$"), groups, en, size: literal.length, generic: !HAS_LETTER.test(literal) };
  })
  // more literal text = more specific pattern, so it is tried first
  .sort((a, b) => b.size - a.size);

/** Uppercase headings (e.g. form titles rendered with toUpperCase()) – looked up case-insensitively. */
let UPPER: Map<string, string> | null = null;
const upperHit = (k: string) => {
  UPPER ??= new Map(Object.entries(DICT).map(([pl, en]) => [pl.toLocaleUpperCase("pl-PL"), en.toUpperCase()]));
  return UPPER.get(k);
};

export const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/** Polish number formats → English: "4 923,37 zł" → "PLN 4,923.37", "81,5%" → "81.5%". */
export function fixNumbers(s: string): string {
  // samodzielna kwota w formacie polskim: "4 923,37" → "4,923.37"
  if (/^-?\d{1,3}(?:[ \u00a0]\d{3})*,\d{2}$/.test(s.trim())) return s.trim().replace(/[ \u00a0]/g, ",").replace(/,(\d{2})$/, ".$1");
  return s
    .replace(/(\d{1,3}(?:[ \u00a0]\d{3})+|\d+)(?:,(\d+))?[ \u00a0]?zł(?![a-ząćęłńóśźż])/g, (_, int: string, dec?: string) =>
      `PLN\u00a0${int.replace(/[ \u00a0]/g, ",")}${dec ? "." + dec : ""}`)
    .replace(/(\d),(\d+)(?=[ \u00a0]?%)/g, "$1.$2");
}

/** Translate one piece of text (one text node, one line). Returns null when there is no translation. */
export function translate(text: string, depth = 0): string | null {
  const k = norm(text);
  if (!k || !HAS_LETTER.test(k)) return null;
  const hit = DICT[k];
  if (hit !== undefined) return hit;
  if (depth > 3) return null;
  if (k === k.toLocaleUpperCase("pl-PL") && k !== k.toLocaleLowerCase("pl-PL")) {
    const up = upperHit(k);
    if (up !== undefined) return up;
  }
  // several sentences joined with " · " (e.g. the steps of the benefit base calculation)
  const joined = k.includes(" · ") ? k.split(" · ") : null;
  const joinedTr = joined?.map((p) => translate(p, depth + 1));
  if (joined && joinedTr!.every((p) => p != null)) return joinedTr!.join(" · ");
  // punctuation-only patterns can split a sentence in several ways – keep the one that translates the most text
  let bestGeneric: { out: string; score: number } | null = null;
  for (const t of TPLS) {
    const m = t.re.exec(k);
    if (!m) continue;
    const vals: Record<number, string> = {};
    t.groups.forEach((slots, gi) => {
      const span = m[gi + 1] ?? "";
      if (slots.length === 1) { vals[slots[0]] = span; return; }
      // adjacent placeholders: take the first split where both halves are known text (or the rest is empty)
      let cut = span.length;
      if (depth < 2 && span.length <= 300) for (let i = span.length; i > 0; i--) {
        const rest = span.slice(i);
        if (translate(span.slice(0, i), depth + 1) != null && (!rest.trim() || translate(rest, depth + 1) != null)) { cut = i; break; }
      }
      vals[slots[0]] = span.slice(0, cut);
      vals[slots[1]] = span.slice(cut);
      slots.slice(2).forEach((n) => (vals[n] = ""));
    });
    let known = 0, score = 0;
    const out = t.en.replace(/\{(\d+)\}/g, (_, n: string) => {
      const v = vals[Number(n)] ?? "";
      if (!v.trim()) return v;
      const lead = v.match(/^\s*/)?.[0] ?? "", trail = v.match(/\s*$/)?.[0] ?? "";
      const tr = translate(v, depth + 1);
      // exact dictionary hits weigh more than text that was itself put together from patterns
      if (tr != null) { known++; score += v.length * (DICT[norm(v)] !== undefined ? 2 : 1); }
      return lead + (tr ?? fixNumbers(v.trim())) + trail;
    });
    // a pattern made only of punctuation ("{0}: {1}", "({0})"), or one with little fixed text matched against
    // a long sentence (e.g. "{0} ust. 1{1}"), counts only if some part of it was translated
    if (!known && (t.generic || (t.size < 10 && k.length > 80))) continue;
    if (!t.generic) return out;
    if (!bestGeneric || score > bestGeneric.score) bestGeneric = { out, score };
  }
  if (bestGeneric) return bestGeneric.out;
  if (joined && joinedTr!.some((p) => p != null)) return joined.map((p, i) => joinedTr![i] ?? fixNumbers(p)).join(" · ");
  return null;
}

const LIST_PREFIX = /^(\s*(?:[-*•–·]|\d+[.)]|#{1,4}|>)\s+)/;

/** Translate a string for display (multi-line text and Markdown are translated line by line). */
export function t(text: string, lang: Lang = getLang()): string {
  if (lang !== "en" || !text) return text;
  if (!text.includes("\n")) return translate(text) ?? fixNumbers(text);
  const whole = DICT[norm(text)];
  if (whole !== undefined) return whole;
  return text
    .split("\n")
    .map((line) => {
      if (!line.trim()) return line;
      const pre = line.match(LIST_PREFIX)?.[0] ?? "";
      const body = line.slice(pre.length);
      return pre + (translate(body) ?? fixNumbers(body));
    })
    .join("\n");
}
