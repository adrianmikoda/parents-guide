"use client";
import { useEffect } from "react";
import { fixNumbers, getLang, norm, t, translate } from "@/lib/i18n";

/** Elements whose content is never translated (code, user input, things marked data-no-i18n). */
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "svg"]);
const ATTRS = ["placeholder", "title", "aria-label", "alt"];

/**
 * Translates the whole page to English in the browser: every text node and the attributes above,
 * now and whenever React changes the DOM (MutationObserver). Runs after hydration, so React's
 * server/client comparison only ever sees Polish. Until the first pass is done the page stays hidden
 * (html.i18n-wait, set by the script in layout.tsx), so Polish never flashes.
 */
export default function I18nRuntime() {
  useEffect(() => {
    const root = document.documentElement;
    if (getLang() !== "en") { root.classList.remove("i18n-wait"); return; }

    // what we wrote last, so our own changes are not translated again
    const doneText = new WeakMap<Node, string>();
    const doneAttr = new WeakMap<Element, Record<string, string>>();

    const skipped = (el: Element | null) => {
      for (let e = el; e; e = e.parentElement) {
        if (SKIP_TAGS.has(e.tagName) || e.hasAttribute("data-no-i18n") || (e as HTMLElement).isContentEditable) return true;
      }
      return false;
    };
    const tr = (v: string) => {
      const out = translate(v) ?? fixNumbers(norm(v));
      return out === norm(v) ? null : out;
    };

    const doText = (n: Text) => {
      const v = n.nodeValue;
      if (!v || doneText.get(n) === v || !/[A-Za-zÀ-ž\d]/.test(v) || skipped(n.parentElement)) return;
      // tekst wielowierszowy (np. treść wniosku z white-space: pre-wrap) – wiersz po wierszu, z zachowaniem podziału
      const multi = v.trim().includes("\n");
      const out = multi ? t(v, "en") : tr(v);
      if (out == null || out === v) return;
      const next = multi ? out : (v.match(/^\s*/)?.[0] ?? "") + out + (v.match(/\s*$/)?.[0] ?? "");
      doneText.set(n, next);
      n.nodeValue = next;
    };
    const doAttr = (el: Element, a: string) => {
      const v = el.getAttribute(a);
      if (!v || doneAttr.get(el)?.[a] === v || skipped(el)) return;
      const out = tr(v);
      if (out == null) return;
      doneAttr.set(el, { ...doneAttr.get(el), [a]: out });
      el.setAttribute(a, out);
    };
    const doTree = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) return doText(node as Text);
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      if (skipped(el)) return;
      for (const a of ATTRS) if (el.hasAttribute(a)) doAttr(el, a);
      el.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(",")).forEach((e) => ATTRS.forEach((a) => e.hasAttribute(a) && doAttr(e, a)));
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) doText(n as Text);
    };

    doTree(document.head.querySelector("title") ?? document.head);
    doTree(document.body);
    root.classList.remove("i18n-wait");

    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "characterData") doText(m.target as Text);
        else if (m.type === "attributes") doAttr(m.target as Element, m.attributeName!);
        else m.addedNodes.forEach(doTree);
      }
    });
    mo.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    return () => mo.disconnect();
  }, []);
  return null;
}
