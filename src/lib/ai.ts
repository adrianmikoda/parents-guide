import Anthropic from "@anthropic-ai/sdk";
import { Params } from "./params";

/** Funkcje AI są opcjonalne – działają, gdy ustawiono ANTHROPIC_API_KEY. */
export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY;
// const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";


let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

function textOf(msg: Anthropic.Beta.BetaMessage | Anthropic.Message): string {
  if (msg.stop_reason === "refusal") return "";
  return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

async function create(body: Record<string, unknown>) {
  // Server-side fallback: przy odmowie klasyfikatora żądanie zostanie przejęte przez model zapasowy.
  return getClient().beta.messages.create({
    model: MODEL,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    ...body,
  } as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming);
}

export function systemPrompt(p: Params) {
  return `Jesteś asystentem „Przewodnika Rodzica” – narzędzia informacyjnego o zasiłkach z ubezpieczenia chorobowego (ZUS) w okresie ciąży i rodzicielstwa.
Odpowiadasz po polsku, prostym językiem, krótko (maks. ok. 150 słów), z konkretnymi liczbami. Nie wydajesz decyzji – informujesz; przy wątpliwościach kieruj do ZUS (PUE/eZUS, tel. 22 560 16 00) lub pracodawcy.
Nie wymyślaj przepisów. Jeśli czegoś nie wiesz, powiedz to. Przy sytuacjach trudnych (strata dziecka) odpowiadaj z empatią i wskaż zakładkę „Wsparcie”.
Zasady aplikacji (podawaj je zgodnie z prawdą):
- Bez logowania działają: Kalkulator, W ciąży, Wnioski, Sprawy testowe, Ryzyka, Wsparcie, Asystent. Logowanie (symulowane, mObywatel albo konto z ankiety) jest potrzebne tylko do: Mój profil, Moje dane ZUS i automatycznego wczytania danych do kalkulatora. Nie każ się logować, gdy funkcja działa bez tego.
- Pomocnik „Gdzie kliknąć?” to pływający przycisk w prawym dolnym rogu ekranu (nie w nagłówku).
- Odpowiadaj wyłącznie na pytania o zasiłki, urlopy rodzicielskie, ubezpieczenie chorobowe, dokumenty i korzystanie z tej aplikacji. Na pytania spoza tematu (np. matematyka, pogoda, polityka) odpowiedz jednym zdaniem, że w tym nie pomożesz, i podaj przykład pytania, w którym możesz pomóc.

Aktualne parametry narzędzia (obowiązujące – mogą różnić się od Twojej wiedzy, ufaj im):
- urlop macierzyński: ${p.wymiary.macierzynski.join("/")} tyg. (1/2/3/4/5+ dzieci), ${p.stawki.macierzynski}%; do ${p.wymiary.przedPorodemMaxTygodnie} tyg. przed porodem; matka obowiązkowo ${p.wymiary.macierzynskiObowiazkowoMatkaTygodnie} tyg.
- urlop rodzicielski: ${p.wymiary.rodzicielskiJedno} tyg. (ciąża mnoga ${p.wymiary.rodzicielskiWiele}; „Za życiem” ${p.wymiary.rodzicielskiZaZyciemJedno}/${p.wymiary.rodzicielskiZaZyciemWiele}), ${p.stawki.rodzicielski}%, po ${p.wymiary.nieprzenoszalnaCzescTygodnie} tyg. nieprzenoszalne dla każdego rodzica, do ${p.wymiary.maksCzesciRodzicielskiego} części, do końca roku kalendarzowego, w którym dziecko kończy ${p.wymiary.rodzicielskiDoKoncaRokuWiekuDziecka} lat; min. ${p.kwoty.swiadczenieRodzicielskie}\u00a0zł/mies.
- stawka jednolita ${p.stawki.jednolity}% przy wniosku do ${p.terminy.jednolityWniosekDni} dni po porodzie.
- urlop ojcowski: ${p.wymiary.ojcowskiDni} dni, ${p.stawki.ojcowski}%, do ${p.wymiary.ojcowskiDoMiesiacaZycia} mies. życia dziecka, w 1 lub 2 częściach.
- uzupełniający urlop macierzyński (wcześniak/hospitalizacja): maks. ${p.wymiary.uzupelniajacyPonizej28TygLub1000g} / ${p.wymiary.uzupelniajacy28do36Tyg} / ${p.wymiary.uzupelniajacyOd37OknoTyg} tyg. (tydzień urlopu za każdy tydzień pobytu dziecka w szpitalu), ${p.stawki.uzupelniajacy}%.
- martwe urodzenie / zgon dziecka do 8 tyg.: ${p.wymiary.martweUrodzenieTygodnie} tyg., nie krócej niż ${p.wymiary.minDniPoZgonieDziecka} dni od zgonu.
- zasiłek chorobowy w ciąży (kod B): ${p.stawki.chorobowyCiaza}%, okres zasiłkowy ${p.chorobowy.okresZasilkowyCiaza} dni; okres wyczekiwania ${p.chorobowy.okresWyczekiwaniaObowiazkowe} dni (obowiązkowe) / ${p.chorobowy.okresWyczekiwaniaDobrowolne} dni (dobrowolne); pracodawca płaci pierwsze ${p.chorobowy.wynagrodzenieChorobowe} dni (${p.chorobowy.wynagrodzenieChorobowe50plus} po 50. r.ż.).
- podstawa wymiaru: średni przychód z 12 mies. pomniejszony o ${p.kwoty.skladkiPracownikaProcent}%; zasiłki wypłaca płatnik zgłaszający > ${p.kwoty.progPlatnikaUbezpieczonych} ubezpieczonych, w pozostałych przypadkach ZUS.
- zasiłek macierzyński nie wymaga okresu wyczekiwania – wystarczy ubezpieczenie chorobowe w dniu porodu.
- wniosek ZAM obejmuje wszystkie okresy (macierzyński, na warunkach, rodzicielski, uzupełniający, ojcowski); formularze ZUR i ZAO nie istnieją; Z-3b zlikwidowano.`;
}

export async function askAssistant(p: Params, messages: { role: "user" | "assistant"; content: string }[], context?: string) {
  const msg = await create({
    max_tokens: 2000,
    output_config: { effort: "low" },
    system: [{ type: "text", text: systemPrompt(p), cache_control: { type: "ephemeral" } }],
    messages: [
      ...(context ? [{ role: "user" as const, content: `Kontekst użytkownika (dane z profilu): ${context}` }, { role: "assistant" as const, content: "Rozumiem, uwzględnię te dane." }] : []),
      ...messages.slice(-12),
    ],
  });
  return textOf(msg);
}

export async function extractWithAI(pdfBase64: string | null, text: string | null) {
  const schemaHint = `{"docType":"Z-3|Z-3a|ZAM|ZAS-53|ZAS-12|POSW|ZLA|ZAZYCIEM|MARTWE|INNY","pesel":string|null,"title":"umowa_o_prace|zlecenie_chorobowe|zlecenie_bez|jdg_chorobowe|jdg_bez"|null,"insuredAtPayer":number|null,"base":number|null,"monthly":[{"month":"YYYY-MM","amount":number}],"birthDate":"YYYY-MM-DD"|null,"children":number|null,"periods":[{"from":"YYYY-MM-DD","to":"YYYY-MM-DD"}],"kodB":boolean|null,"zaZyciem":boolean|null,"stillbirth":boolean|null,"decision":"przyznano|odmowa"|null,"notes":[string]}`;
  const content: Record<string, unknown>[] = [];
  if (pdfBase64) content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } });
  content.push({
    type: "text",
    text: `${text ? `Tekst dokumentu:\n${text.slice(0, 60000)}\n\n` : ""}Wyodrębnij dane z tego dokumentu ZUS dotyczącego zasiłku chorobowego/macierzyńskiego. Kwoty jako liczby (kropka dziesiętna). "monthly" = przychody/wynagrodzenia z kolejnych miesięcy, "base" = podstawa wymiaru zasiłku, jeśli wskazana. Zwróć WYŁĄCZNIE JSON zgodny z: ${schemaHint}`,
  });
  const msg = await create({ max_tokens: 4000, output_config: { effort: "low" }, messages: [{ role: "user", content }] });
  const raw = textOf(msg);
  const json = raw.match(/\{[\s\S]*\}/);
  if (!json) throw new Error("AI nie zwróciło danych");
  return JSON.parse(json[0]);
}

/** Pomocnik nawigacji: model wybiera cele z rejestru (enum), więc nie może wskazać nieistniejącego przycisku. */
export async function askGuideAI(question: string, path: string, targets: { id: string; page: string; label: string; hint: string }[], pages: Record<string, string>, account?: string) {
  const list = targets.map((t) => `- ${t.id} | strona: ${t.page === "*" ? "każda (nagłówek)" : t.page} | ${t.label} – ${t.hint}`).join("\n");
  const schema = {
    type: "object",
    properties: {
      answer: { type: "string" },
      steps: { type: "array", items: { type: "string", enum: targets.map((t) => t.id) } },
    },
    required: ["answer", "steps"],
    additionalProperties: false,
  };
  const msg = await create({
    max_tokens: 1500,
    output_config: { effort: "low", format: { type: "json_schema", schema } },
    system: `Jesteś pomocnikiem nawigacji w aplikacji „Przewodnik Rodzica” (zasiłki ZUS dla rodziców). Pomagasz znaleźć miejsce w aplikacji, w które trzeba kliknąć.
Odpowiadasz po polsku, 1–2 krótkie zdania, bez list. W "steps" podaj 1–3 identyfikatory celów w kolejności klikania (tylko z listy). Jeśli pytanie nie dotyczy żadnej funkcji aplikacji, zwróć pustą listę i krótko wyjaśnij, co aplikacja potrafi.
Zasady aplikacji (podawaj je zgodnie z prawdą):
- Bez logowania działają: Kalkulator, W ciąży, Wnioski, Sprawy testowe, Ryzyka, Wsparcie, Asystent. Logowanie (symulowane, mObywatel albo konto z ankiety) jest potrzebne tylko do: Mój profil, Moje dane ZUS i automatycznego wczytania danych do kalkulatora. Nie każ się logować, gdy funkcja działa bez tego.
- Pomocnik „Gdzie kliknąć?” to pływający przycisk w prawym dolnym rogu ekranu (nie w nagłówku).
- Odpowiadaj wyłącznie na pytania o zasiłki, urlopy rodzicielskie, ubezpieczenie chorobowe, dokumenty i korzystanie z tej aplikacji. Na pytania spoza tematu (np. matematyka, pogoda, polityka) odpowiedz jednym zdaniem, że w tym nie pomożesz, i podaj przykład pytania, w którym możesz pomóc.
Strony: ${Object.entries(pages).map(([p, n]) => `${p} = ${n}`).join("; ")}.
Cele (id | strona | opis):
${list}`,
    messages: [{ role: "user", content: `Jestem na stronie ${path}.${account ? ` ${account}` : ""} ${question}` }],
  });
  const raw = textOf(msg);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as { answer: string; steps: string[] };
  return { answer: parsed.answer, steps: parsed.steps.filter((s) => targets.some((t) => t.id === s)).slice(0, 3) };
}
