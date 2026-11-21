import { aiEnabled, extractWithAI } from "@/lib/ai";
import { parseText } from "@/lib/docparse";
import { allow, clientKey } from "@/lib/ratelimit";
import { json } from "@/lib/session";

export const runtime = "nodejs";

/** Limit rozmiaru: funkcje serverless (np. Vercel) przyjmują żądania do ok. 4,5 MB. */
const MAX_UPLOAD_MB = 4;

/**
 * POST multipart (file) – odczyt danych z wgranego dokumentu (PDF/TXT).
 * 1) ekstrakcja tekstu (unpdf) + parser regułowy,
 * 2) AI (Claude) – gdy ?ai=1 albo dokument jest skanem / pewność niska i klucz API jest dostępny.
 */
export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { return json({ error: `Nie udało się odczytać pliku. Maksymalny rozmiar to ${MAX_UPLOAD_MB} MB.` }, 400); }
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "Brak pliku." }, 400);
  if (file.size === 0) return json({ error: "Plik jest pusty." }, 400);
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return json({ error: `Plik jest za duży (limit ${MAX_UPLOAD_MB} MB).` }, 413);
  const name = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  const isTxt = file.type.startsWith("text/") || name.endsWith(".txt");
  if (!isPdf && !isTxt) return json({ error: "Obsługiwane są pliki PDF i TXT." }, 415);

  const forceAI = new URL(req.url).searchParams.get("ai") === "1";
  const buf = new Uint8Array(await file.arrayBuffer());
  if (isPdf && !(buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)) return json({ error: "To nie jest poprawny plik PDF." }, 415);
  let text = "";
  try {
    if (isPdf) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(buf);
      const r = await extractText(pdf, { mergePages: true });
      text = Array.isArray(r.text) ? r.text.join("\n") : r.text;
    } else text = new TextDecoder("utf-8").decode(buf);
  } catch {
    if (!isPdf) return json({ error: "Nie udało się odczytać pliku." }, 400);
    text = "";
  }
  if (!isPdf && !text.trim()) return json({ error: "Plik nie zawiera tekstu." }, 400);

  let result = parseText(text);
  let aiUsed = false;
  let aiError: string | undefined;
  if (aiEnabled() && (forceAI || result.confidence < 0.5)) {
    if (!allow(`parse:${clientKey(req)}`, 10, 10 * 60_000)) {
      aiError = "Przekroczono limit odczytów AI (10 na 10 minut). Uzupełnij dane ręcznie albo spróbuj później.";
    } else {
      try {
        const ai = await extractWithAI(isPdf ? Buffer.from(buf).toString("base64") : null, isPdf ? null : text);
        const found = Object.entries(ai).filter(([k, v]) => k !== "notes" && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0));
        if (found.length) {
          result = {
            ...result,
            ...Object.fromEntries(found),
            monthly: ai.monthly?.length ? ai.monthly : result.monthly,
            notes: [...result.notes, ...(ai.notes || []), "Dane uzupełnione przez AI – zweryfikuj przed użyciem."],
            source: "ai",
            confidence: Math.max(result.confidence, 0.7),
          };
          aiUsed = true;
        } else {
          aiError = "AI nie znalazło w dokumencie danych do zasiłku.";
        }
      } catch (e) {
        aiError = e instanceof Error ? e.message : "Błąd AI";
      }
    }
  }
  return json({ fileName: file.name, size: file.size, textLength: text.length, textPreview: text.slice(0, 1500), result, aiUsed, aiAvailable: aiEnabled(), aiError });
}
