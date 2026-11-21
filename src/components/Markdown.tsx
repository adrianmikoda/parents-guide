import { Fragment, ReactNode } from "react";

/**
 * Lekki renderer Markdown dla odpowiedzi asystenta (bez zewnętrznych zależności i bez innerHTML).
 * Obsługuje: nagłówki (#–####), akapity, listy punktowane i numerowane, linię poziomą (---),
 * **pogrubienie**, *kursywę* / _kursywę_, `kod` oraz linki [tekst](https://…).
 */

const INLINE = /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)|\*[^*\s\n][^*\n]*?\*|_[^_\s\n][^_\n]*?_)/g;

/** Twarde spacje w kwotach z odpowiedzi AI: „1 000 zł” nie rozdziela się między wiersze. */
const nb = (t: string) => t.replace(/(\d) (?=zł|tys\.|mln)/g, "$1\u00a0").replace(/(\d) (?=\d{3}(?!\d))/g, "$1\u00a0");

function inline(text: string, key = ""): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    const t = m[0];
    const at = m.index ?? 0;
    if (at > last) out.push(nb(text.slice(last, at)));
    const k = `${key}-${i++}`;
    if (t.startsWith("**") || t.startsWith("__")) out.push(<strong key={k}>{inline(t.slice(2, -2), k)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={k}>{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) {
      const [, label, href] = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/) || [];
      out.push(<a key={k} href={href} target="_blank" rel="noopener noreferrer">{label}</a>);
    } else out.push(<em key={k}>{inline(t.slice(1, -1), k)}</em>);
    last = at + t.length;
  }
  if (last < text.length) out.push(nb(text.slice(last)));
  return out;
}

type Block =
  | { t: "h"; level: number; text: string }
  | { t: "p"; lines: string[] }
  | { t: "ul" | "ol"; items: string[] }
  | { t: "hr" };

function parse(src: string): Block[] {
  const blocks: Block[] = [];
  let cur = null as Block | null;
  const flush = () => { if (cur) blocks.push(cur); cur = null; };
  for (const raw of src.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    let m: RegExpMatchArray | null;
    if (!line.trim()) { flush(); continue; }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flush(); blocks.push({ t: "hr" }); continue; }
    if ((m = line.match(/^\s*(#{1,4})\s+(.*)$/))) { flush(); blocks.push({ t: "h", level: m[1].length, text: m[2] }); continue; }
    if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) {
      if (cur?.t !== "ul") { flush(); cur = { t: "ul", items: [] }; }
      cur.items.push(m[1]);
      continue;
    }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      if (cur?.t !== "ol") { flush(); cur = { t: "ol", items: [] }; }
      cur.items.push(m[1]);
      continue;
    }
    // kontynuacja punktu listy (wcięta linia)
    if ((cur?.t === "ul" || cur?.t === "ol") && /^\s{2,}\S/.test(raw)) { cur.items[cur.items.length - 1] += " " + line.trim(); continue; }
    if (cur?.t !== "p") { flush(); cur = { t: "p", lines: [] }; }
    cur.lines.push(line.trim());
  }
  flush();
  return blocks;
}

export default function Markdown({ text, className = "md" }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {parse(text).map((b, i) => {
        const k = String(i);
        switch (b.t) {
          case "h": {
            const H = (b.level <= 2 ? "h3" : "h4") as "h3" | "h4";
            return <H key={k}>{inline(b.text, k)}</H>;
          }
          case "ul": return <ul key={k}>{b.items.map((it, j) => <li key={j}>{inline(it, `${k}.${j}`)}</li>)}</ul>;
          case "ol": return <ol key={k}>{b.items.map((it, j) => <li key={j}>{inline(it, `${k}.${j}`)}</li>)}</ol>;
          case "hr": return <hr key={k} />;
          default:
            return <p key={k}>{b.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l, `${k}.${j}`)}</Fragment>)}</p>;
        }
      })}
    </div>
  );
}
