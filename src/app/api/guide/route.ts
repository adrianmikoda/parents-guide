import { aiEnabled, askGuideAI } from "@/lib/ai";
import { PAGES, TARGETS, matchGuide } from "@/lib/guide";
import { currentPersona, json } from "@/lib/session";

/** POST { question, path } → { answer, steps: string[] (id celów), mode: "ai" | "reguly" } */
export async function POST(req: Request) {
  const { question = "", path = "/pulpit" } = (await req.json()) as { question?: string; path?: string };
  const q = String(question).slice(0, 500);
  const me = await currentPersona(req);
  // kontekst konta: dane z ankiety można poprawić w aplikacji, dane „z ZUS” – nie
  const account = !me ? "Nie jestem zalogowany." : "wlasne" in me
    ? "Mam konto założone w aplikacji (dane z ankiety) – dane zmieniam w Moim profilu (profil-zrodlo), brakujące uzupełniam ankietą (konto-uzupelnij)."
    : "Jestem zalogowany kontem z danymi pobranymi z ZUS – mogę je nadpisać w Moim profilu (profil-zrodlo); zmiany nie trafiają do ZUS.";
  if (aiEnabled()) {
    try {
      const r = await askGuideAI(q, String(path), TARGETS, PAGES, account);
      if (r) return json({ ...r, mode: "ai" });
    } catch (e) {
      return json({ ...matchGuide(q), mode: "reguly", error: e instanceof Error ? e.message : "AI niedostępne" });
    }
  }
  return json({ ...matchGuide(q), mode: "reguly" });
}
