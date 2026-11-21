import { aiEnabled, extractWithAI } from "@/lib/ai";
import { parseText } from "@/lib/docparse";
import { json } from "@/lib/session";

export const runtime = "nodejs";

/**
 * POST multipart (file) – odczyt danych z wgranego dokumentu (PDF/TXT).
 * 1) ekstrakcja tekstu (unpdf) + parser regułowy,
 * 2) AI (Claude) – gdy ?ai=1 albo dokument jest skanem / pewność niska i klucz API jest dostępny.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "Brak pliku" }, 400);
  if (file.size > 15 * 1024 * 1024) return json({ error: "Plik większy niż 15 MB" }, 413);
  const forceAI = new URL(req.url).searchParams.get("ai") === "1";
  const buf = new Uint8Array(await file.arrayBuffer());
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  let text = "";
  try {
    if (isPdf) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(buf);
      const r = await extractText(pdf, { mergePages: true });
      text = Array.isArray(r.text) ? r.text.join("\n") : r.text;
    } else text = new TextDecoder("utf-8").decode(buf);
  } catch (e) {
    text = "";
  }
  let result = parseText(text);
  let aiUsed = false;
  let aiError: string | undefined;
  if (aiEnabled() && (forceAI || result.confidence < 0.5)) {
    try {
      const ai = await extractWithAI(isPdf ? Buffer.from(buf).toString("base64") : null, isPdf ? null : text);
      result = {
        ...result,
        ...Object.fromEntries(Object.entries(ai).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0))),
        monthly: ai.monthly?.length ? ai.monthly : result.monthly,
        notes: [...result.notes, ...(ai.notes || []), "Dane uzupełnione przez AI – zweryfikuj przed użyciem."],
        source: "ai",
        confidence: Math.max(result.confidence, 0.8),
      };
      aiUsed = true;
    } catch (e) {
      aiError = e instanceof Error ? e.message : "Błąd AI";
    }
  }
  return json({ fileName: file.name, size: file.size, textLength: text.length, textPreview: text.slice(0, 1500), result, aiUsed, aiAvailable: aiEnabled(), aiError });
}
