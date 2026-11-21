import { aiEnabled, askAssistant } from "@/lib/ai";
import { Params } from "@/lib/params";
import { allow, clientKey } from "@/lib/ratelimit";
import { currentPersona, json } from "@/lib/session";
import { getParams } from "@/lib/store";

/** Odpowiedzi regułowe – działają bez AI (fallback). */
function ruleAnswer(q: string, p: Params): string {
  const s = q.toLowerCase();
  const W = p.wymiary;
  if (/martw|poronien|zgon|strat/.test(s))
    return `Bardzo nam przykro. Po urodzeniu martwego dziecka lub zgonie dziecka przed ukończeniem 8 tygodni życia przysługuje zasiłek macierzyński za ${W.martweUrodzenieTygodnie} tygodni po porodzie (nie krócej niż ${W.minDniPoZgonieDziecka} dni od zgonu), w wysokości ${p.stawki.macierzynski}% podstawy. Potrzebne będzie zaświadczenie o martwym urodzeniu lub odpis aktu. W zakładce „Wsparcie” znajdziesz organizacje, które pomagają rodzicom po stracie.`;
  if (/wcześ|wczes|hospitaliz|uzupełn/.test(s))
    return `Przy porodzie przedwczesnym lub hospitalizacji noworodka przysługuje uzupełniający urlop macierzyński: maks. ${W.uzupelniajacyPonizej28TygLub1000g} tyg. (poród przed 28. tyg. lub masa ≤1000 g), ${W.uzupelniajacy28do36Tyg} tyg. (28–36 tyg.), ${W.uzupelniajacyOd37Tyg} tyg. (od 37. tyg. z hospitalizacją). Zasiłek ${p.stawki.uzupelniajacy}%. Urlop jest bezpośrednio po macierzyńskim, jednorazowo. Dokument: zaświadczenie ze szpitala.`;
  if (/81|jednolit|21 dni/.test(s))
    return `Jeśli najpóźniej ${p.terminy.jednolityWniosekDni} dni po porodzie złożysz wniosek o zasiłek za macierzyński i rodzicielski w pełnym wymiarze, dostaniesz ${p.stawki.jednolity}% podstawy za cały okres (zamiast 100% + ${p.stawki.rodzicielski}%). Łącznie wychodzi tyle samo, ale równymi kwotami. ${W.nieprzenoszalnaCzescTygodnie} tygodni drugiego rodzica jest płatne ${p.stawki.rodzicielski}%.`;
  if (/ojcow/.test(s))
    return `Urlop ojcowski: ${W.ojcowskiDni} dni, płatne ${p.stawki.ojcowski}% podstawy, do ukończenia przez dziecko ${W.ojcowskiDoMiesiacaZycia} miesięcy (przy adopcji – 12 mies. od uprawomocnienia, max do 14 lat). Można wziąć jednorazowo lub w 2 częściach po min. ${W.ojcowskiMinCzesciDni} dni. Wniosek – ${p.terminy.wniosekOjcowskiDniPrzed} dni przed.`;
  if (/rodzicielsk|podzia|oboje|partner/.test(s))
    return `Urlop rodzicielski to ${W.rodzicielskiJedno} tyg. (${W.rodzicielskiWiele} przy ciąży mnogiej). Każdy rodzic ma ${W.nieprzenoszalnaCzescTygodnie} tyg. tylko dla siebie – nie można ich przekazać. Możecie korzystać jednocześnie lub naprzemiennie, w maks. ${W.maksCzesciRodzicielskiego} częściach, do końca roku, w którym dziecko kończy 6 lat. Zasiłek: ${p.stawki.rodzicielski}% podstawy, min. ${p.kwoty.swiadczenieRodzicielskie}\u00a0zł/mies. Sprawdź warianty w Kalkulatorze.`;
  if (/prac|etat|łącz|lacz/.test(s))
    return `Urlop rodzicielski możesz łączyć z pracą u swojego pracodawcy w wymiarze do ${W.maxUlamekPracyPrzyRodzicielskim * 100}% etatu. Urlop wydłuża się proporcjonalnie (np. przy ½ etatu – dwa razy), a zasiłek jest proporcjonalnie niższy. Łączna kwota zasiłku się nie zmienia, a dodatkowo dostajesz wynagrodzenie.`;
  if (/adop|zastępcz|zastepcz|przysposob/.test(s))
    return `Przy przyjęciu dziecka na wychowanie przysługuje urlop na warunkach urlopu macierzyńskiego (${W.naWarunkachMacierzynskiego[0]} tyg. przy 1 dziecku, ${p.stawki.naWarunkachMacierzynskiego}%) oraz urlop rodzicielski. Dziecko: do ${W.adopcjaMaxWiekDziecka} lat przy przysposobieniu, do ${W.zastepczaMaxWiekDziecka} lat (lub ${W.zastepczaMaxWiekOdroczenie} przy odroczeniu obowiązku szkolnego) w rodzinie zastępczej niezawodowej.`;
  if (/chorob|l4|zwolnien|zla/.test(s))
    return `Zasiłek chorobowy w ciąży (e-ZLA z kodem B) to ${p.stawki.chorobowyCiaza}% podstawy, maks. ${p.chorobowy.okresZasilkowyCiaza} dni. Przysługuje po okresie wyczekiwania: ${p.chorobowy.okresWyczekiwaniaObowiazkowe} dni (umowa o pracę) lub ${p.chorobowy.okresWyczekiwaniaDobrowolne} dni (dobrowolne – zlecenie, działalność). Pracownicy pierwsze ${p.chorobowy.wynagrodzenieChorobowe} dni w roku płaci pracodawca.`;
  if (/działaln|dzialaln|jdg|firm|zadłuż|zadluz|uregul|należnoś|naleznos/.test(s))
    return `Przedsiębiorczyni musi mieć opłacane dobrowolne ubezpieczenie chorobowe – nieterminowa składka może oznaczać jego ustanie. Zasiłek wypłaca ZUS, ale dopiero po uregulowaniu należności na dzień powstania prawa. Uwaga na wyraźne podwyższanie podstawy w ciąży – ZUS może je zakwestionować. Stan rozliczeń sprawdzisz w zakładce „ZUS”.`;
  if (/ile|kwot|wysoko|podstaw/.test(s))
    return `Podstawa wymiaru to średni przychód z 12 miesięcy pomniejszony o ${p.kwoty.skladkiPracownikaProcent}% (składki). Zasiłek macierzyński: ${p.stawki.macierzynski}% podstawy za urlop macierzyński, ${p.stawki.rodzicielski}% za rodzicielski albo ${p.stawki.jednolity}% za całość. Dokładne kwoty i daty policzysz w Kalkulatorze.`;
  return "Mogę pomóc w sprawach: zasiłek chorobowy w ciąży, urlop i zasiłek macierzyński, rodzicielski, ojcowski, wcześniak, adopcja, łączenie urlopu z pracą, działalność gospodarcza. Zadaj pytanie lub skorzystaj z Kalkulatora. (Tryb bez AI – odpowiedzi regułowe.)";
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { messages?: { role: "user" | "assistant"; content: string }[] };
  // tylko ostatnie wiadomości, przycięte – ogranicza koszt i nadużycia
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!messages.length || messages[0].role !== "user") messages.unshift({ role: "user", content: "Dzień dobry" });
  const p = getParams();
  const last = messages.filter((m) => m.role === "user").at(-1)?.content || "";
  const me = await currentPersona(req);
  if (aiEnabled() && !allow(`assistant:${clientKey(req)}`, 20, 10 * 60_000))
    return json({ answer: `${ruleAnswer(last, p)}\n\n(Przekroczono limit pytań do AI – 20 na 10 minut. Teraz odpowiadam z bazy reguł.)`, mode: "reguly", limited: true });
  if (aiEnabled()) {
    try {
      const ctx = me ? `Tytuł ubezpieczenia: ${me.tytulOpis}; przewidywany poród: ${me.ciaza?.przewidywanyPorod ?? "brak danych"}; płatnik zgłasza ${me.platnik?.liczbaUbezpieczonych ?? "n/d"} ubezpieczonych; należności do uregulowania: ${me.zadluzenie}\u00a0zł.` : undefined;
      const answer = await askAssistant(p, messages, ctx);
      if (answer) return json({ answer, mode: "ai" });
    } catch (e) {
      return json({ answer: ruleAnswer(last, p), mode: "reguly", error: e instanceof Error ? e.message : "AI niedostępne" });
    }
  }
  return json({ answer: ruleAnswer(last, p), mode: "reguly" });
}
