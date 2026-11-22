/**
 * Wnioski pracownika do pracodawcy – treść i załączniki zgodne z rozporządzeniem Ministra Rodziny, Pracy
 * i Polityki Społecznej z dnia 11 marca 2025 r. w sprawie wniosków dotyczących uprawnień pracowników związanych
 * z rodzicielstwem oraz dokumentów dołączanych do takich wniosków (Dz.U. 2025 poz. 322).
 *
 * Rozporządzenie nie określa wzoru graficznego – określa elementy, które wniosek „zawiera”, i dokumenty, które
 * się do niego „dołącza”. Każdy wniosek poniżej ma dokładnie te elementy (w brzmieniu rozporządzenia) i te załączniki,
 * a także stosuje § 21 (tłumaczenie zagranicznego aktu urodzenia), § 22 (dokumenty w aktach osobowych) i § 23 (oryginały).
 */
import { addDays, addMonths, diffDays, fmtDate, isValidDate, weeksByChildren } from "./engine";
import type { Params } from "./params";

export type F = {
  name: string;
  label: string;
  type?: "text" | "date" | "number" | "select" | "textarea";
  options?: string[];
  hint?: string;
  /** pole widoczne tylko, gdy warunek jest spełniony */
  when?: (d: Record<string, string>) => boolean;
};
export type EmpCtx = { due: string; params: Params; children: number; birth?: string };
export type EmpSpec = {
  key: string;
  par: string;
  title: string;
  to: "Pracodawca";
  desc: string;
  fields: F[];
  body: (d: Record<string, string>, c: EmpCtx) => string;
  validate: (d: Record<string, string>, c: EmpCtx) => Record<string, string>;
};

type V = Record<string, string>;
const ROZP = "rozporządzenia Ministra Rodziny, Pracy i Polityki Społecznej z dnia 11 marca 2025 r. (Dz.U. poz. 322)";
const today = () => new Date().toISOString().slice(0, 10);
const v = (x?: string) => (x && x.trim() ? x.trim() : "—");
const dt = (x?: string) => (isValidDate(x) ? fmtDate(x) : "—");
const okres = (d: V, a = "od", b = "do") => `od ${dt(d[a])} do ${dt(d[b])}`;
const int = (x?: string) => (x && /^\d+$/.test(x.trim()) ? Number(x) : NaN);

/* ───────────── Wspólne pola ───────────── */

const NAME = (label = "Imię i nazwisko pracownika"): F => ({ name: "imieNazwisko", label });
const OKRES_F = (label: string): F[] => [
  { name: "od", label: `${label} – od`, type: "date" },
  { name: "do", label: `${label} – do`, type: "date" },
];
const DOK_UR: F = {
  name: "dokUrodzenia",
  label: "Dokument potwierdzający urodzenie dziecka",
  type: "select",
  options: [
    "odpis skrócony aktu urodzenia",
    "zagraniczny – wydany w państwie UE, EFTA (EOG), Szwajcarii lub państwie umowy o zabezpieczeniu społecznym, w języku urzędowym tego państwa",
    "zagraniczny – inny (dołączam tłumaczenie na język polski)",
  ],
  hint: "§ 21: zagraniczny dokument spoza tych państw lub w innym języku dołącza się z tłumaczeniem na język polski.",
};
const AKTA: F = {
  name: "wAktach",
  label: "Dokumenty, które są już w Twoich aktach osobowych (nie dołączasz ich)",
  type: "textarea",
  hint: "§ 22: nie dołącza się dokumentów, które znajdują się w aktach osobowych pracownika. Pole dobrowolne.",
};
const PRZYJETE: F[] = [
  { name: "przyjete", label: "Dziecko przyjęte na wychowanie", type: "select", options: ["Nie – dziecko urodzone", "Tak – przysposobienie (wniosek do sądu opiekuńczego)", "Tak – rodzina zastępcza (z wyjątkiem zawodowej)"] },
  { name: "dataPrzyjecia", label: "Data przyjęcia dziecka (dzieci) na wychowanie", type: "date", when: (d) => !!d.przyjete?.startsWith("Tak") },
  { name: "odroczenie", label: "Wobec dziecka podjęto decyzję o odroczeniu obowiązku szkolnego", type: "select", options: ["Nie", "Tak"], when: (d) => !!d.przyjete?.startsWith("Tak") },
];
const adopted = (d: V) => !!d.przyjete?.startsWith("Tak");

/* ───────────── Załączniki w brzmieniu rozporządzenia ───────────── */

const ODPIS = (d: V) =>
  "odpis skrócony aktu urodzenia dziecka (dzieci) lub zagraniczny dokument potwierdzający urodzenie dziecka (dzieci), wydany przez uprawniony organ dokonujący rejestracji urodzenia w danym kraju, albo kopie tych dokumentów" +
  (d.dokUrodzenia?.startsWith("zagraniczny – inny") ? " – wraz z tłumaczeniem na język polski (§ 21 ust. 1)" : "");
const PRZYJECIE_DOK =
  "oświadczenie pracownika o dacie przyjęcia dziecka (dzieci) na wychowanie oraz kopię wniosku o wszczęcie postępowania w sprawie przysposobienia dziecka (dzieci), zawierającego datę urodzenia dziecka (dzieci), z poświadczeniem sądu opiekuńczego o dacie wystąpienia do sądu lub zaświadczenie sądu opiekuńczego o dacie wystąpienia do sądu o przysposobienie dziecka (dzieci), zawierające datę urodzenia dziecka (dzieci), albo kopię prawomocnego orzeczenia sądu opiekuńczego o umieszczeniu dziecka (dzieci) w rodzinie zastępczej, albo kopię umowy cywilnoprawnej zawartej pomiędzy rodziną zastępczą a starostą";
const ODROCZENIE_DOK = (wniosek = "wniosek dotyczy dziecka") => `kopię prawomocnej decyzji o odroczeniu obowiązku szkolnego, w przypadku gdy ${wniosek}, wobec którego podjęto taką decyzję`;
/** ust. 4 przy wnioskach dotyczących dziecka przyjętego na wychowanie */
const adoptDocs = (d: V, withOdroczenie = true, wniosek?: string) =>
  adopted(d) ? [PRZYJECIE_DOK, ...(withOdroczenie && d.odroczenie === "Tak" ? [ODROCZENIE_DOK(wniosek)] : [])] : [];

/* ───────────── Treść pisma ───────────── */

function letter(o: { par: string; basis: string; intro: string; points: [string, string][]; statements?: string[]; attachments: string[]; d: V }) {
  const lines: string[] = [o.intro, "", `Treść wniosku (${o.par} ${ROZP}; ${o.basis}):`];
  o.points.forEach(([label, value], i) => lines.push(`${i + 1}) ${label}: ${value}`));
  if (o.statements?.length) {
    lines.push("", "Oświadczenia:");
    o.statements.forEach((s) => lines.push(`– ${s}`));
  }
  if (o.attachments.length) {
    lines.push("", "Załączniki:");
    o.attachments.forEach((a, i) => lines.push(`${i + 1}) ${a}`));
  }
  if (o.d.wAktach?.trim()) lines.push("", `Nie dołączam dokumentów, które znajdują się w moich aktach osobowych (§ 22 rozporządzenia): ${o.d.wAktach.trim()}.`);
  if (o.attachments.some((a) => /kopi[ęe]/.test(a))) lines.push("", "Na żądanie pracodawcy przedłożę oryginały dokumentów dołączonych w kopii (§ 23 rozporządzenia).");
  return lines.join("\n");
}

/* ───────────── Walidacja – wspólne reguły ───────────── */

function need(d: V, e: V, names: string[]) {
  for (const n of names) if (!d[n]?.trim()) e[n] ??= "To pole jest wymagane.";
}
function needDate(d: V, e: V, n: string) {
  if (!d[n]) e[n] ??= "Podaj datę.";
  else if (!isValidDate(d[n])) e[n] ??= "Podaj poprawną datę.";
}
function period(d: V, e: V, a = "od", b = "do") {
  needDate(d, e, a);
  needDate(d, e, b);
  if (isValidDate(d[a]) && isValidDate(d[b]) && d[b] < d[a]) e[b] ??= "Data końcowa nie może być wcześniejsza niż początkowa.";
  return isValidDate(d[a]) && isValidDate(d[b]) && d[b] >= d[a] ? diffDays(d[a], d[b]) + 1 : 0;
}
function base(d: V, e: V, extra: string[] = []) {
  need(d, e, ["imieNazwisko", ...extra]);
  if (d.imieNazwisko?.trim() && !/^[\p{L}][\p{L}\p{M} '’.-]*\s+[\p{L}][\p{L}\p{M} '’.-]*$/u.test(d.imieNazwisko.trim())) e.imieNazwisko = "Podaj imię i nazwisko (litery, spacja, myślnik).";
}
function adoptCheck(d: V, e: V) {
  need(d, e, ["przyjete"]);
  if (adopted(d)) {
    needDate(d, e, "dataPrzyjecia");
    if (isValidDate(d.dataPrzyjecia) && d.dataPrzyjecia > today()) e.dataPrzyjecia = "Data przyjęcia nie może być z przyszłości.";
    need(d, e, ["odroczenie"]);
  }
}
const birthOf = (c: EmpCtx) => c.birth || c.due;

/* ───────────── Rodzaj urlopu (ust. 3 – „stosuje się odpowiednio”) ───────────── */

const URLOP: F = { name: "urlop", label: "Wniosek dotyczy", type: "select", options: ["urlopu macierzyńskiego", "urlopu na warunkach urlopu macierzyńskiego", "urlopu rodzicielskiego"] };
const urlopGen = (d: V) => d.urlop || "urlopu macierzyńskiego";
/** okres „wykorzystany przed porodem” dotyczy tylko urlopu macierzyńskiego – przy odpowiednim stosowaniu do innych urlopów element odpada */
const maternity = (d: V) => urlopGen(d) === "urlopu macierzyńskiego";
const dropPrePartum = (pts: [string, string][], d: V) => (maternity(d) ? pts : pts.filter(([l]) => !l.includes("przed porodem")));
const NOM: Record<string, string> = { "urlopu macierzyńskiego": "urlop macierzyński", "urlopu na warunkach urlopu macierzyńskiego": "urlop na warunkach urlopu macierzyńskiego", "urlopu rodzicielskiego": "urlop rodzicielski" };
/** „Przepisy … stosuje się odpowiednio” – podstawienie rodzaju urlopu w brzmieniu elementu wniosku (jedno przejście po tekście). */
const swap = (text: string, d: V) => (urlopGen(d) === "urlopu macierzyńskiego" ? text : text.replace(/urlopu macierzyńskiego|urlop macierzyński/g, (m) => (m.startsWith("urlopu") ? urlopGen(d) : NOM[urlopGen(d)])));

/* ═════════════════════════ Wnioski ═════════════════════════ */

export const EMPLOYER_SPECS: EmpSpec[] = [
  /* § 2 – część urlopu macierzyńskiego przed porodem */
  {
    key: "urlop_macierzynski", par: "§ 2", to: "Pracodawca",
    title: "Wniosek o udzielenie części urlopu macierzyńskiego przed przewidywaną datą porodu",
    desc: "Urlop macierzyński po porodzie przysługuje z mocy prawa – wniosek składasz tylko wtedy, gdy chcesz wykorzystać do 6 tygodni urlopu przed przewidywaną datą porodu. O urlop rodzicielski wnioskujesz osobno (§ 15).",
    fields: [NAME("Imię i nazwisko pracownicy"), { name: "start", label: "Data, od której ma być udzielona część urlopu macierzyńskiego", type: "date", hint: "najwcześniej 6 tygodni przed przewidywaną datą porodu" }, AKTA],
    body: (d) =>
      letter({
        d, par: "§ 2 ust. 1", basis: "art. 180 § 2 Kodeksu pracy",
        intro: "Wnoszę o udzielenie mi części urlopu macierzyńskiego przed przewidywaną datą porodu.",
        points: [["imię i nazwisko pracownicy", v(d.imieNazwisko)], ["wskazanie daty, od której ma być udzielona część urlopu macierzyńskiego", dt(d.start)]],
        attachments: ["kopię zaświadczenia lekarskiego wystawionego na zwykłym druku, określającego przewidywaną datę porodu"],
      }),
    validate: (d, c) => {
      const e: V = {};
      base(d, e);
      needDate(d, e, "start");
      const W = c.params.wymiary;
      if (isValidDate(d.start) && isValidDate(c.due)) {
        if (d.start < addDays(c.due, -W.przedPorodemMaxTygodnie * 7)) e.start = `Przed porodem można wykorzystać najwyżej ${W.przedPorodemMaxTygodnie} tygodni – najwcześniej od ${fmtDate(addDays(c.due, -W.przedPorodemMaxTygodnie * 7))}.`;
        else if (d.start >= c.due) e.start = `Ten wniosek dotyczy urlopu przed przewidywaną datą porodu (${fmtDate(c.due)}).`;
      }
      return e;
    },
  },

  /* § 3 i § 4 – rezygnacja matki z pozostałej części urlopu */
  {
    key: "rezygnacja_macierzynski", par: "§ 3 / § 4", to: "Pracodawca",
    title: "Wniosek w sprawie rezygnacji z pozostałej części urlopu macierzyńskiego i powrotu do pracy",
    desc: "Matka może zrezygnować z reszty urlopu po wykorzystaniu co najmniej 14 tygodni po porodzie (8 tygodni przy orzeczeniu o niezdolności do samodzielnej egzystencji), gdy pozostałą część przejmie ojciec dziecka (lub inny członek najbliższej rodziny – § 4).",
    fields: [
      NAME("Imię i nazwisko pracownicy / pracownika"),
      { name: "rodzaj", label: "Rodzaj rezygnacji", type: "select", options: [
        "z pozostałej części urlopu macierzyńskiego po wykorzystaniu po porodzie co najmniej 14 tygodni (§ 3)",
        "z pozostałej części urlopu macierzyńskiego – pracownica z orzeczeniem o niezdolności do samodzielnej egzystencji, po wykorzystaniu po porodzie co najmniej 8 tygodni (§ 4)",
        "z pozostałej części urlopu na warunkach urlopu macierzyńskiego (§ 3 ust. 3)",
        "z pozostałej części urlopu na warunkach urlopu macierzyńskiego – z orzeczeniem o niezdolności do samodzielnej egzystencji (§ 4 ust. 3)",
      ] },
      { name: "powrot", label: "Termin powrotu do pracy", type: "date" },
      { name: "przejmuje", label: "Kto przejmuje pozostałą część urlopu (dokument dołączany do wniosku)", type: "select", options: [
        "pracownik – ojciec wychowujący dziecko (kopia jego wniosku o pozostałą część urlopu)",
        "ubezpieczony – ojciec dziecka (kopia oświadczenia o przerwaniu działalności zarobkowej)",
        "pracownik – inny członek najbliższej rodziny (tylko § 4)",
        "ubezpieczony – inny członek najbliższej rodziny (tylko § 4)",
      ] },
      AKTA,
    ],
    body: (d) => {
      const p4 = d.rodzaj?.includes("§ 4");
      const warunki = d.rodzaj?.includes("na warunkach");
      const u = warunki ? "urlopu na warunkach urlopu macierzyńskiego" : "urlopu macierzyńskiego";
      const kto = d.przejmuje ?? "";
      const att = kto.startsWith("pracownik")
        ? `kopię wniosku pracownika – ${kto.includes("ojciec") ? "ojca wychowującego dziecko" : "innego członka najbliższej rodziny"} o udzielenie pozostałej części ${u}`
        : `kopię oświadczenia ubezpieczonego – ${kto.includes("ojciec") ? "ojca dziecka" : "innego członka najbliższej rodziny"} o przerwaniu działalności zarobkowej w celu sprawowania opieki nad dzieckiem przez okres odpowiadający okresowi, który pozostał do końca ${u}`;
      return letter({
        d, par: `${p4 ? "§ 4" : "§ 3"} ust. 1${warunki ? " w zw. z ust. 3" : ""}`, basis: "art. 180 § 8 Kodeksu pracy",
        intro: `Rezygnuję z pozostałej części ${u}${p4 ? " (legitymuję się orzeczeniem o niezdolności do samodzielnej egzystencji)" : ""} i wnoszę o umożliwienie powrotu do pracy.`,
        points: [[warunki ? "imię i nazwisko pracownika" : "imię i nazwisko pracownicy", v(d.imieNazwisko)], ["wskazanie terminu powrotu do pracy", dt(d.powrot)]],
        attachments: [kto ? att : "—", ...(p4 ? ["kopię prawomocnego orzeczenia o niezdolności pracownicy do samodzielnej egzystencji"] : [])],
      });
    },
    validate: (d, c) => {
      const e: V = {};
      base(d, e, ["rodzaj", "przejmuje"]);
      needDate(d, e, "powrot");
      const p4 = d.rodzaj?.includes("§ 4");
      if (!p4 && d.przejmuje?.includes("inny członek")) e.przejmuje = "Inny członek najbliższej rodziny może przejąć urlop tylko w przypadku z § 4 (orzeczenie o niezdolności do samodzielnej egzystencji).";
      const b = birthOf(c);
      if (isValidDate(d.powrot) && isValidDate(b) && !d.rodzaj?.includes("na warunkach")) {
        const min = addDays(b, (p4 ? 8 : 14) * 7);
        if (d.powrot < min) e.powrot = `Powrót do pracy możliwy najwcześniej po wykorzystaniu ${p4 ? 8 : 14} tygodni urlopu po porodzie (od ${fmtDate(min)}).`;
      }
      return e;
    },
  },

  /* § 5 – pozostała część urlopu dla ojca / członka rodziny */
  {
    key: "pozostala_czesc", par: "§ 5", to: "Pracodawca",
    title: "Wniosek o udzielenie pozostałej części urlopu macierzyńskiego",
    desc: "Składa ojciec wychowujący dziecko (albo inny członek najbliższej rodziny – przy orzeczeniu matki), gdy matka rezygnuje z pozostałej części urlopu lub zasiłku macierzyńskiego.",
    fields: [
      NAME("Imię i nazwisko pracownika – ojca wychowującego dziecko albo innego członka najbliższej rodziny"),
      URLOP,
      { name: "przypadek", label: "Sytuacja matki dziecka", type: "select", options: [
        "rezygnacja pracownicy z pozostałej części urlopu po wykorzystaniu po porodzie co najmniej 14 tygodni",
        "rezygnacja ubezpieczonej – matki dziecka z pobierania zasiłku macierzyńskiego po wykorzystaniu go za okres co najmniej 14 tygodni po porodzie",
        "rezygnacja pracownicy z orzeczeniem o niezdolności do samodzielnej egzystencji po wykorzystaniu po porodzie co najmniej 8 tygodni",
        "rezygnacja ubezpieczonej – matki dziecka z orzeczeniem o niezdolności do samodzielnej egzystencji po wykorzystaniu zasiłku za okres co najmniej 8 tygodni po porodzie",
      ] },
      { name: "dziecko", label: "Imię i nazwisko oraz data urodzenia dziecka (dzieci)", type: "textarea" },
      { name: "przedPorodem", label: "Okres urlopu macierzyńskiego albo zasiłku macierzyńskiego wykorzystany przed porodem", hint: "np. „od 15.01.2027 do 28.01.2027” albo „nie wykorzystano”", when: maternity },
      ...OKRES_F("Okres, na który ma być udzielona pozostała część urlopu"),
      ...PRZYJETE, DOK_UR, AKTA,
    ],
    body: (d) => {
      const pracownica = d.przypadek?.startsWith("rezygnacja pracownicy");
      return letter({
        d, par: `§ 5 ust. 1${d.urlop && d.urlop !== "urlopu macierzyńskiego" ? " w zw. z ust. 3" : ""}`, basis: "art. 180 § 9 Kodeksu pracy",
        intro: `Wnoszę o udzielenie mi pozostałej części ${urlopGen(d)} w związku z: ${v(d.przypadek)}.`,
        points: dropPrePartum([
          ["imię i nazwisko pracownika – ojca wychowującego dziecko albo pracownika – innego członka najbliższej rodziny", v(d.imieNazwisko)],
          [swap("imię i nazwisko oraz datę urodzenia dziecka (dzieci), na które ma być udzielona pozostała część urlopu macierzyńskiego", d), v(d.dziecko)],
          ["oświadczenie pracownika o okresie urlopu macierzyńskiego albo o okresie pobierania zasiłku macierzyńskiego za okres odpowiadający okresowi części urlopu macierzyńskiego, wykorzystanych przed porodem", v(d.przedPorodem)],
          [swap("wskazanie okresu, na który ma być udzielona pozostała część urlopu macierzyńskiego", d), okres(d)],
        ], d),
        statements: adopted(d) ? [`Dziecko (dzieci) przyjąłem/przyjęłam na wychowanie w dniu ${dt(d.dataPrzyjecia)}.`] : [],
        attachments: [
          ODPIS(d),
          pracownica
            ? swap("oświadczenie pracownicy o zamiarze rezygnacji z pozostałej części urlopu macierzyńskiego", d)
            : swap("oświadczenie ubezpieczonej – matki dziecka o zamiarze rezygnacji z pobierania zasiłku macierzyńskiego za okres odpowiadający okresowi pozostałej części urlopu macierzyńskiego", d),
          ...adoptDocs(d, true, "wniosek o udzielenie części urlopu na warunkach urlopu macierzyńskiego dotyczy dziecka"),
        ],
      });
    },
    validate: (d, c) => {
      const e: V = {};
      base(d, e, ["urlop", "przypadek", "dziecko", "dokUrodzenia", ...(maternity(d) ? ["przedPorodem"] : [])]);
      period(d, e);
      adoptCheck(d, e);
      const eight = d.przypadek?.includes("8 tygodni");
      const b = birthOf(c);
      if (isValidDate(d.od) && isValidDate(b) && d.urlop === "urlopu macierzyńskiego" && d.od < addDays(b, (eight ? 8 : 14) * 7))
        e.od = `Pozostała część urlopu może zacząć się po wykorzystaniu przez matkę ${eight ? 8 : 14} tygodni po porodzie (od ${fmtDate(addDays(b, (eight ? 8 : 14) * 7))}).`;
      return e;
    },
  },

  /* § 6–§ 13 – część urlopu macierzyńskiego w sytuacjach szczególnych */
  {
    key: "czesc_sytuacja", par: "§ 6–§ 13", to: "Pracodawca",
    title: "Wniosek o udzielenie części urlopu macierzyńskiego w sytuacji szczególnej",
    desc: "Pobyt matki w szpitalu, zgon lub porzucenie dziecka przez matkę, matka nieubezpieczona z orzeczeniem o niezdolności do samodzielnej egzystencji albo podejmująca zatrudnienie.",
    fields: [
      NAME("Imię i nazwisko pracownika – ojca wychowującego dziecko albo innego członka najbliższej rodziny"),
      { name: "rola", label: "Składający wniosek", type: "select", options: ["pracownik – ojciec wychowujący dziecko", "inny członek najbliższej rodziny"] },
      URLOP,
      { name: "sytuacja", label: "Sytuacja", type: "select", options: [
        "§ 6 – pracownica przebywająca w szpitalu przerwała urlop macierzyński po wykorzystaniu po porodzie co najmniej 8 tygodni",
        "§ 7 – ubezpieczona – matka dziecka przebywająca w szpitalu przerwała pobieranie zasiłku macierzyńskiego po co najmniej 8 tygodniach po porodzie",
        "§ 8 – zgon pracownicy w czasie urlopu macierzyńskiego albo ubezpieczonej – matki dziecka w czasie pobierania zasiłku macierzyńskiego",
        "§ 9 – porzucenie dziecka przez pracownicę albo ubezpieczoną – matkę dziecka po wykorzystaniu po porodzie co najmniej 8 tygodni",
        "§ 10 – zgon matki dziecka nieobjętej ubezpieczeniem chorobowym albo nieposiadającej tytułu do objęcia takim ubezpieczeniem",
        "§ 11 – porzucenie dziecka przez matkę nieobjętą ubezpieczeniem chorobowym albo nieposiadającą tytułu do objęcia takim ubezpieczeniem",
        "§ 12 – matka nieobjęta ubezpieczeniem (albo bez tytułu do niego), z orzeczeniem o niezdolności do samodzielnej egzystencji, nie może sprawować osobistej opieki",
        "§ 13 – matka nieposiadająca tytułu do ubezpieczenia podjęła zatrudnienie w wymiarze nie niższym niż połowa pełnego wymiaru czasu pracy",
      ] },
      { name: "dataZdarzenia", label: "Data zgonu / porzucenia dziecka", type: "date", when: (d) => /^§ (8|9|10|11) /.test(d.sytuacja ?? "") },
      { name: "przedPorodem", label: "Okres urlopu macierzyńskiego (albo zasiłku macierzyńskiego) wykorzystany przed porodem", hint: "np. „nie wykorzystano”", when: (d) => maternity(d) && /^§ [6-9] /.test(d.sytuacja ?? "") },
      { name: "od", label: "Data, od której ma być udzielona część urlopu", type: "date" },
      { name: "zobowiazanie", label: "Oświadczenie", type: "select", options: ["Zobowiązuję się poinformować pracodawcę (treść zależna od sytuacji – zob. podgląd)"], when: (d) => /^§ (6|7|13) /.test(d.sytuacja ?? "") },
      ...PRZYJETE, DOK_UR, AKTA,
    ],
    body: (d) => {
      const s = Number((d.sytuacja ?? "").match(/^§ (\d+)/)?.[1] ?? 0);
      const NAME_PT: [string, string] = [s === 13 ? "imię i nazwisko pracownika" : "imię i nazwisko pracownika – ojca wychowującego dziecko albo pracownika – innego członka najbliższej rodziny", v(d.imieNazwisko)];
      const przed: [string, string] = [
        s === 6 ? "oświadczenie pracownika o okresie urlopu macierzyńskiego wykorzystanego przed porodem"
          : s === 7 ? "oświadczenie pracownika o okresie pobierania zasiłku macierzyńskiego za okres odpowiadający okresowi części urlopu macierzyńskiego wykorzystanego przed porodem"
          : "oświadczenie pracownika o okresie urlopu macierzyńskiego albo o okresie pobierania zasiłku macierzyńskiego za okres odpowiadający okresowi części urlopu macierzyńskiego, wykorzystanych przed porodem",
        v(d.przedPorodem),
      ];
      const SZPITAL = "szpitala albo innego zakładu leczniczego podmiotu leczniczego wykonującego działalność leczniczą w rodzaju stacjonarne i całodobowe świadczenia zdrowotne";
      let points: [string, string][] = [];
      let atts: string[] = [];
      if (s === 6 || s === 7) {
        const kto = s === 6 ? "pracownicę" : "ubezpieczoną – matkę dziecka";
        points = [
          NAME_PT,
          [s === 6 ? "wskazanie daty, od której ma być udzielona część urlopu macierzyńskiego, odpowiadającej dacie, od której pracownica przerwała urlop macierzyński" : "wskazanie daty, od której ma być udzielona część urlopu macierzyńskiego, odpowiadającej dacie, od której ubezpieczona – matka dziecka przerwała pobieranie zasiłku macierzyńskiego za okres odpowiadający okresowi urlopu macierzyńskiego", dt(d.od)],
          przed,
          [`oświadczenie pracownika, w którym zobowiązuje się on do poinformowania pracodawcy o dacie opuszczenia przez ${kto} ${SZPITAL}`, "zobowiązuję się"],
        ];
        atts = s === 6
          ? [
              "oświadczenie pracownicy, która przebywa w szpitalu albo w innym zakładzie leczniczym podmiotu leczniczego wykonującego działalność leczniczą w rodzaju stacjonarne i całodobowe świadczenia zdrowotne, wskazujące datę, od której przerwała ona urlop macierzyński na okres pobytu w szpitalu albo innym zakładzie leczniczym podmiotu leczniczego wykonującego działalność leczniczą w rodzaju stacjonarne i całodobowe świadczenia zdrowotne, ze względu na stan zdrowia uniemożliwiający jej sprawowanie osobistej opieki nad dzieckiem",
              "zaświadczenie o terminie przyjęcia pracownicy do placówki, o której mowa w pkt 1, wystawione przez tę placówkę",
              ODPIS(d),
            ]
          : [
              "oświadczenie ubezpieczonej – matki dziecka, która przebywa w szpitalu albo w innym zakładzie leczniczym podmiotu leczniczego wykonującego działalność leczniczą w rodzaju stacjonarne i całodobowe świadczenia zdrowotne, wskazujące datę, od której przerwała ona pobieranie zasiłku macierzyńskiego za okres odpowiadający okresowi urlopu macierzyńskiego na okres pobytu w szpitalu albo innym zakładzie leczniczym podmiotu leczniczego wykonującego działalność leczniczą w rodzaju stacjonarne i całodobowe świadczenia zdrowotne, ze względu na stan zdrowia uniemożliwiający jej sprawowanie osobistej opieki nad dzieckiem",
              "zaświadczenie o terminie przyjęcia ubezpieczonej – matki dziecka do placówki, o której mowa w pkt 1, wystawione przez tę placówkę",
              ODPIS(d),
            ];
      } else if (s === 8 || s === 9) {
        points = [
          NAME_PT,
          [s === 8 ? "oświadczenie pracownika o dacie zgonu pracownicy albo ubezpieczonej – matki dziecka" : "oświadczenie pracownika o dacie porzucenia dziecka przez pracownicę albo ubezpieczoną – matkę dziecka", dt(d.dataZdarzenia)],
          przed,
          [s === 8 ? "wskazanie daty, od której ma być udzielona część urlopu macierzyńskiego, przypadającej po dniu zgonu pracownicy albo ubezpieczonej – matki dziecka" : "wskazanie daty, od której ma być udzielona część urlopu macierzyńskiego, przypadającej po dniu porzucenia dziecka, nie wcześniej jednak niż po wykorzystaniu po porodzie co najmniej 8 tygodni urlopu macierzyńskiego (albo zasiłku za okres odpowiadający co najmniej 8 tygodniom urlopu macierzyńskiego)", dt(d.od)],
        ];
        atts = [ODPIS(d)];
      } else if (s === 10 || s === 11) {
        points = [
          NAME_PT,
          [s === 10 ? "oświadczenie pracownika o dniu zgonu matki dziecka" : "oświadczenie pracownika o dniu porzucenia dziecka przez matkę", dt(d.dataZdarzenia)],
          [s === 10 ? "wskazanie daty, od której ma być udzielona część urlopu macierzyńskiego, przypadającej po dniu zgonu matki dziecka" : "wskazanie daty, od której ma być udzielona część urlopu macierzyńskiego, przypadającej po dniu porzucenia dziecka przez matkę", dt(d.od)],
        ];
        atts = [ODPIS(d)];
      } else if (s === 12) {
        points = [NAME_PT, ["wskazanie daty, od której ma być udzielona część urlopu macierzyńskiego", dt(d.od)]];
        atts = [ODPIS(d), "kopię prawomocnego orzeczenia o niezdolności matki dziecka do samodzielnej egzystencji"];
      } else if (s === 13) {
        points = [
          NAME_PT,
          ["wskazanie daty, od której ma być udzielona część urlopu macierzyńskiego, przypadającej w okresie trwania zatrudnienia matki dziecka", dt(d.od)],
          ["oświadczenie pracownika, w którym zobowiązuje się on do poinformowania pracodawcy o ustaniu zatrudnienia matki dziecka w czasie korzystania przez pracownika z urlopu macierzyńskiego", "zobowiązuję się"],
        ];
        atts = [ODPIS(d), "oświadczenie matki dziecka o dacie podjęcia zatrudnienia w wymiarze nie niższym niż połowa pełnego wymiaru czasu pracy"];
      }
      return letter({
        d, par: s ? `§ ${s} ust. 1${d.urlop && d.urlop !== "urlopu macierzyńskiego" ? " w zw. z ust. 3" : ""}` : "§ 6–§ 13", basis: s === 13 ? "art. 180 § 17 Kodeksu pracy" : "art. 180 § 16 Kodeksu pracy",
        intro: `Wnoszę o udzielenie mi części ${urlopGen(d)} w sytuacji: ${v(d.sytuacja?.replace(/^§ \d+ – /, ""))}.`,
        points: dropPrePartum(points, d).map(([l, x]) => [swap(l, d), x]),
        statements: adopted(d) ? [`Dziecko (dzieci) przyjąłem/przyjęłam na wychowanie w dniu ${dt(d.dataPrzyjecia)}.`] : [],
        attachments: [...atts.map((a) => (a.startsWith("odpis skrócony") ? a : swap(a, d))), ...adoptDocs(d)],
      });
    },
    validate: (d, c) => {
      const e: V = {};
      base(d, e, ["urlop", "sytuacja", "rola", "dokUrodzenia"]);
      adoptCheck(d, e);
      needDate(d, e, "od");
      const s = Number((d.sytuacja ?? "").match(/^§ (\d+)/)?.[1] ?? 0);
      if (s === 13 && d.rola?.startsWith("inny")) e.rola = "W sytuacji z § 13 wniosek składa wyłącznie pracownik – ojciec wychowujący dziecko.";
      if ([8, 9, 10, 11].includes(s)) {
        needDate(d, e, "dataZdarzenia");
        if (isValidDate(d.dataZdarzenia) && isValidDate(d.od) && d.od <= d.dataZdarzenia) e.od = "Część urlopu przypada po dniu zgonu / porzucenia dziecka.";
      }
      if ([6, 7, 8, 9].includes(s) && maternity(d)) need(d, e, ["przedPorodem"]);
      if ([6, 7, 13].includes(s)) need(d, e, ["zobowiazanie"]);
      const b = birthOf(c);
      if ([6, 7, 9].includes(s) && isValidDate(d.od) && isValidDate(b) && d.urlop === "urlopu macierzyńskiego" && d.od < addDays(b, 8 * 7))
        e.od = `W tej sytuacji urlop można przejąć po wykorzystaniu przez matkę co najmniej 8 tygodni po porodzie (od ${fmtDate(addDays(b, 56))}).`;
      return e;
    },
  },

  /* § 14 – uzupełniający urlop macierzyński */
  {
    key: "urlop_uzupelniajacy", par: "§ 14", to: "Pracodawca",
    title: "Wniosek o udzielenie uzupełniającego urlopu macierzyńskiego",
    desc: "Wcześniak lub hospitalizacja noworodka. Urlop przypada bezpośrednio po urlopie macierzyńskim, jednorazowo; korzysta z niego tylko jedno z rodziców.",
    fields: [
      NAME("Imię i nazwisko pracownicy albo pracownika – ojca wychowującego dziecko"),
      { name: "koniecMac", label: "Termin zakończenia urlopu macierzyńskiego", type: "date" },
      ...OKRES_F("Okres uzupełniającego urlopu macierzyńskiego"),
      ...PRZYJETE.slice(0, 2), AKTA,
    ],
    body: (d) =>
      letter({
        d, par: `§ 14 ust. 1${adopted(d) ? " w zw. z ust. 3" : ""}`, basis: adopted(d) ? "art. 183 § 3¹ Kodeksu pracy" : "art. 180² § 4 Kodeksu pracy",
        intro: "Wnoszę o udzielenie mi uzupełniającego urlopu macierzyńskiego.",
        points: [
          ["imię i nazwisko pracownicy albo pracownika – ojca wychowującego dziecko", v(d.imieNazwisko)],
          ["termin zakończenia urlopu macierzyńskiego", dt(d.koniecMac)],
          ["wskazanie okresu, na który ma być udzielony uzupełniający urlop macierzyński", okres(d)],
        ],
        statements: [
          "Oświadczam, że drugi z rodziców dziecka nie zamierza korzystać z uzupełniającego urlopu macierzyńskiego ani z zasiłku macierzyńskiego za okres odpowiadający okresowi uzupełniającego urlopu macierzyńskiego.",
          ...(adopted(d) ? [`Dziecko (dzieci) przyjąłem/przyjęłam na wychowanie w dniu ${dt(d.dataPrzyjecia)}.`] : []),
        ],
        attachments: [
          "zaświadczenie, o którym mowa w art. 180² § 5 Kodeksu pracy",
          "oświadczenie pracownicy albo pracownika – ojca wychowującego dziecko o braku zamiaru korzystania z uzupełniającego urlopu macierzyńskiego albo z zasiłku macierzyńskiego za okres odpowiadający okresowi uzupełniającego urlopu macierzyńskiego przez drugiego z rodziców dziecka",
          ...adoptDocs(d, false),
        ],
      }),
    validate: (d, c) => {
      const e: V = {};
      base(d, e);
      needDate(d, e, "koniecMac");
      const days = period(d, e);
      need(d, e, ["przyjete"]);
      if (adopted(d)) needDate(d, e, "dataPrzyjecia");
      if (isValidDate(d.koniecMac) && isValidDate(d.od) && d.od !== addDays(d.koniecMac, 1)) e.od = `Uzupełniający urlop przypada bezpośrednio po urlopie macierzyńskim – od ${fmtDate(addDays(d.koniecMac, 1))}.`;
      if (days && days % 7 !== 0) e.do = "Uzupełniający urlop udziela się w pełnych tygodniach (tydzień za każdy tydzień pobytu dziecka w szpitalu).";
      if (days > c.params.wymiary.uzupelniajacyPonizej28TygLub1000g * 7) e.do = `Uzupełniający urlop trwa najwyżej ${c.params.wymiary.uzupelniajacyPonizej28TygLub1000g} tygodni.`;
      return e;
    },
  },

  /* § 15 – urlop rodzicielski */
  {
    key: "urlop_rodzicielski", par: "§ 15", to: "Pracodawca",
    title: "Wniosek o udzielenie urlopu rodzicielskiego lub jego części",
    desc: "Wniosek składasz co najmniej 21 dni przed rozpoczęciem urlopu (art. 182¹ᵈ § 1 Kp). Urlop można podzielić na maks. 5 części. Wniosek o pełny wymiar bezpośrednio po urlopie macierzyńskim złożony do 21 dni po porodzie – zasiłek 81,5% za cały okres.",
    fields: [
      NAME(),
      { name: "wykorzystany", label: "Okres dotychczas wykorzystanego urlopu rodzicielskiego lub zasiłku macierzyńskiego za okres odpowiadający okresowi urlopu rodzicielskiego", hint: "np. „nie wykorzystano”" },
      { name: "liczbaCzesci", label: "Liczba wykorzystanych części urlopu rodzicielskiego lub liczba wniosków o zasiłek macierzyński za okres odpowiadający części urlopu rodzicielskiego", type: "number" },
      ...OKRES_F("Okres, na który ma być udzielony urlop rodzicielski lub jego część"),
      ...PRZYJETE,
      { name: "drugi", label: "Drugi z rodziców dziecka w okresie objętym wnioskiem", type: "select", options: ["nie zamierza korzystać z urlopu rodzicielskiego ani z zasiłku macierzyńskiego za ten okres", "zamierza korzystać z urlopu rodzicielskiego albo z zasiłku w okresie:"], when: (d) => !adopted(d) },
      { name: "drugiOkres", label: "Okres, w którym drugi z rodziców zamierza korzystać", when: (d) => !adopted(d) && !!d.drugi?.startsWith("zamierza") },
      { name: "zaZyciem", label: "Wniosek dotyczy wymiaru wydłużonego („Za życiem”, art. 182¹ᵃ § 2 Kp)", type: "select", options: ["Nie", "Tak"], when: (d) => !adopted(d) },
      { ...DOK_UR, when: (d) => !adopted(d) }, AKTA,
    ],
    body: (d) =>
      letter({
        d, par: `§ 15 ust. 1${adopted(d) ? " w zw. z ust. 3" : ""}`, basis: adopted(d) ? "art. 183 § 4–4² Kodeksu pracy" : "art. 182¹ᵈ § 1 Kodeksu pracy",
        intro: "Wnoszę o udzielenie mi urlopu rodzicielskiego (jego części).",
        points: [
          ["imię i nazwisko pracownika", v(d.imieNazwisko)],
          ["wskazanie okresu dotychczas wykorzystanego urlopu rodzicielskiego lub zasiłku macierzyńskiego za okres odpowiadający okresowi urlopu rodzicielskiego oraz liczby wykorzystanych części urlopu rodzicielskiego lub liczby wniosków o zasiłek macierzyński za okres odpowiadający części urlopu rodzicielskiego", `${v(d.wykorzystany)}; liczba części / wniosków: ${v(d.liczbaCzesci)}`],
          ["wskazanie okresu, na który ma być udzielony urlop rodzicielski lub ma być udzielona jego część", okres(d)],
        ],
        // ust. 3–4: przy dziecku przyjętym na wychowanie stosuje się tylko ust. 1, a załącznikami są dokumenty z ust. 4
        statements: adopted(d)
          ? [`Dziecko (dzieci) przyjąłem/przyjęłam na wychowanie w dniu ${dt(d.dataPrzyjecia)}.`]
          : [
              d.drugi?.startsWith("zamierza")
                ? `Oświadczam, że drugi z rodziców dziecka zamierza korzystać z urlopu rodzicielskiego albo z zasiłku za okres odpowiadający okresowi urlopu rodzicielskiego w okresie objętym wnioskiem: ${v(d.drugiOkres)}.`
                : "Oświadczam, że drugi z rodziców dziecka nie zamierza korzystać z urlopu rodzicielskiego albo z zasiłku macierzyńskiego za okres odpowiadający okresowi urlopu rodzicielskiego przez okres wskazany we wniosku.",
            ],
        attachments: adopted(d) ? adoptDocs(d) : [
          ODPIS(d),
          "oświadczenie pracownika o braku zamiaru korzystania z urlopu rodzicielskiego albo z zasiłku macierzyńskiego za okres odpowiadający okresowi urlopu rodzicielskiego przez drugiego z rodziców dziecka przez okres wskazany we wniosku albo o okresie, w którym drugi z rodziców dziecka zamierza korzystać z urlopu rodzicielskiego albo z zasiłku za okres odpowiadający okresowi urlopu rodzicielskiego w okresie objętym wnioskiem",
          ...(d.zaZyciem === "Tak" ? ["kopię zaświadczenia, o którym mowa w art. 4 ust. 3 ustawy z dnia 4 listopada 2016 r. o wsparciu kobiet w ciąży i rodzin „Za życiem” (Dz. U. z 2024 r. poz. 1829), w przypadku gdy wniosek o udzielenie urlopu rodzicielskiego lub jego części dotyczy urlopu rodzicielskiego w wymiarze, o którym mowa w art. 182¹ᵃ § 2 Kodeksu pracy"] : []),
        ],
      }),
    validate: (d, c) => {
      const e: V = {};
      base(d, e, ["wykorzystany"]);
      if (!adopted(d)) need(d, e, ["dokUrodzenia", "drugi", "zaZyciem"]);
      adoptCheck(d, e);
      const n = int(d.liczbaCzesci);
      const W = c.params.wymiary;
      if (!(n >= 0 && n < W.maksCzesciRodzicielskiego)) e.liczbaCzesci = `Podaj liczbę od 0 do ${W.maksCzesciRodzicielskiego - 1} – urlop rodzicielski można podzielić najwyżej na ${W.maksCzesciRodzicielskiego} części.`;
      if (!adopted(d) && d.drugi?.startsWith("zamierza")) need(d, e, ["drugiOkres"]);
      const days = period(d, e);
      const multi = c.children > 1;
      const pool = d.zaZyciem === "Tak" ? (multi ? W.rodzicielskiZaZyciemWiele : W.rodzicielskiZaZyciemJedno) : multi ? W.rodzicielskiWiele : W.rodzicielskiJedno;
      if (days > (pool - W.nieprzenoszalnaCzescTygodnie) * 7) e.do = `Jeden rodzic może wykorzystać najwyżej ${pool - W.nieprzenoszalnaCzescTygodnie} tyg. urlopu rodzicielskiego (${W.nieprzenoszalnaCzescTygodnie} tyg. przysługuje wyłącznie drugiemu rodzicowi).`;
      const b = birthOf(c);
      if (isValidDate(d.od) && isValidDate(b) && !adopted(d) && d.od <= b) e.od = "Urlop rodzicielski zaczyna się po urodzeniu dziecka (zwykle dzień po zakończeniu urlopu macierzyńskiego).";
      if (isValidDate(d.do) && isValidDate(b) && !adopted(d) && d.do > `${Number(b.slice(0, 4)) + W.rodzicielskiDoKoncaRokuWiekuDziecka}-12-31`)
        e.do = `Urlop rodzicielski przysługuje do końca roku kalendarzowego, w którym dziecko kończy ${W.rodzicielskiDoKoncaRokuWiekuDziecka} lat.`;
      return e;
    },
  },

  /* § 16 – łączenie urlopu rodzicielskiego z pracą */
  {
    key: "praca_rodzicielski", par: "§ 16", to: "Pracodawca",
    title: "Wniosek o łączenie korzystania z urlopu rodzicielskiego z wykonywaniem pracy",
    desc: "Praca u pracodawcy udzielającego urlopu, w wymiarze nie wyższym niż połowa pełnego wymiaru czasu pracy. Wniosek składasz co najmniej 21 dni przed rozpoczęciem pracy (art. 182¹ᵉ § 2 Kp). Urlop wydłuża się proporcjonalnie.",
    fields: [
      NAME(),
      { name: "wymiar", label: "Wymiar czasu pracy", type: "select", options: ["1/8 etatu", "1/4 etatu", "1/3 etatu", "3/8 etatu", "1/2 etatu"] },
      ...OKRES_F("Okres łączenia urlopu rodzicielskiego (jego części) z pracą"),
      { name: "wydluzenie", label: "Część urlopu rodzicielskiego powstała w wyniku proporcjonalnego wydłużenia", type: "select", options: ["zamierzam łączyć ją z pracą w wymiarze nie wyższym niż połowa pełnego wymiaru czasu pracy", "nie zamierzam łączyć jej z pracą"] },
      { name: "wydluzenieWymiar", label: "Wymiar czasu pracy w części wydłużonej", type: "select", options: ["1/8 etatu", "1/4 etatu", "1/3 etatu", "3/8 etatu", "1/2 etatu"], when: (d) => !!d.wydluzenie?.startsWith("zamierzam") },
    ],
    body: (d) =>
      letter({
        d, par: "§ 16", basis: "art. 182¹ᵉ § 2 Kodeksu pracy",
        intro: "Wnoszę o umożliwienie mi łączenia korzystania z urlopu rodzicielskiego (jego części) z wykonywaniem pracy w wymiarze nie wyższym niż połowa pełnego wymiaru czasu pracy.",
        points: [
          ["imię i nazwisko pracownika", v(d.imieNazwisko)],
          ["określenie wymiaru czasu pracy", v(d.wymiar)],
          ["wskazanie okresu, w którym pracownik zamierza łączyć korzystanie z urlopu rodzicielskiego lub jego części z wykonywaniem pracy w niepełnym wymiarze czasu pracy", okres(d)],
          [
            "oświadczenie pracownika o zamiarze łączenia części urlopu rodzicielskiego powstałej w wyniku proporcjonalnego wydłużenia tego urlopu z pracą w wymiarze nie wyższym niż połowa pełnego wymiaru czasu pracy, z określeniem wymiaru czasu pracy, albo o braku takiego zamiaru",
            d.wydluzenie?.startsWith("zamierzam") ? `zamierzam – wymiar czasu pracy: ${v(d.wydluzenieWymiar)}` : d.wydluzenie ? "nie zamierzam" : "—",
          ],
        ],
        attachments: [],
      }),
    validate: (d) => {
      const e: V = {};
      base(d, e, ["wymiar", "wydluzenie"]);
      if (d.wydluzenie?.startsWith("zamierzam")) need(d, e, ["wydluzenieWymiar"]);
      period(d, e);
      if (isValidDate(d.od) && d.od < addDays(today(), 21)) e.od = `Wniosek składa się co najmniej 21 dni przed rozpoczęciem pracy – najwcześniej od ${fmtDate(addDays(today(), 21))}.`;
      return e;
    },
  },

  /* § 17 – urlop ojcowski */
  {
    key: "urlop_ojcowski", par: "§ 17", to: "Pracodawca",
    title: "Wniosek o udzielenie urlopu ojcowskiego lub jego części",
    desc: "2 tygodnie, jednorazowo albo w 2 częściach po min. tydzień, do ukończenia przez dziecko 12 miesięcy (przy przysposobieniu – 12 miesięcy od uprawomocnienia postanowienia, nie dłużej niż do 14. roku życia). Wniosek składasz co najmniej 7 dni przed rozpoczęciem urlopu.",
    fields: [
      NAME(),
      ...OKRES_F("Okres urlopu ojcowskiego (jego części)"),
      { name: "dataUrDziecka", label: "Data urodzenia dziecka", type: "date", hint: "do sprawdzenia terminu wykorzystania urlopu – nie jest treścią wniosku" },
      { name: "przysposobione", label: "Dziecko przysposobione", type: "select", options: ["Nie", "Tak"] },
      { name: "dataPrawomocnosci", label: "Data uprawomocnienia postanowienia o przysposobieniu", type: "date", when: (d) => d.przysposobione === "Tak" },
      { name: "korzystal", label: "Oświadczenie: czy korzystałeś z urlopu ojcowskiego albo jego części", type: "select", options: ["nie korzystałem z urlopu ojcowskiego", "korzystałem z urlopu ojcowskiego albo jego części w okresie:"] },
      { name: "korzystalOkres", label: "Okres wykorzystanego urlopu ojcowskiego", when: (d) => !!d.korzystal?.startsWith("korzystałem") },
      DOK_UR, AKTA,
    ],
    body: (d) =>
      letter({
        d, par: "§ 17 ust. 1", basis: "art. 182³ § 2 Kodeksu pracy",
        intro: "Wnoszę o udzielenie mi urlopu ojcowskiego (jego części).",
        points: [["imię i nazwisko pracownika", v(d.imieNazwisko)], ["wskazanie okresu, na który ma być udzielony urlop ojcowski albo ma być udzielona jego część", okres(d)]],
        statements: [d.korzystal?.startsWith("korzystałem") ? `Oświadczam, że korzystałem z urlopu ojcowskiego albo jego części w okresie: ${v(d.korzystalOkres)}.` : "Oświadczam, że nie korzystałem z urlopu ojcowskiego."],
        attachments: [
          ODPIS(d),
          ...(d.przysposobione === "Tak" ? ["kopię prawomocnego postanowienia sądu o przysposobieniu dziecka, w przypadku gdy wniosek dotyczy udzielenia urlopu ojcowskiego albo jego części na dziecko przysposobione"] : []),
          "oświadczenie pracownika – ojca, czy korzystał z urlopu ojcowskiego albo jego części",
        ],
      }),
    validate: (d, c) => {
      const e: V = {};
      const W = c.params.wymiary;
      base(d, e, ["korzystal", "dokUrodzenia", "przysposobione"]);
      if (d.korzystal?.startsWith("korzystałem")) need(d, e, ["korzystalOkres"]);
      const days = period(d, e);
      if (days && (days < W.ojcowskiMinCzesciDni || days > W.ojcowskiDni)) e.do = `Urlop ojcowski albo jego część trwa od ${W.ojcowskiMinCzesciDni} do ${W.ojcowskiDni} dni.`;
      if (d.korzystal?.startsWith("korzystałem") && days > W.ojcowskiDni - W.ojcowskiMinCzesciDni) e.do = `Pozostała część urlopu ojcowskiego to ${W.ojcowskiMinCzesciDni} dni (łącznie ${W.ojcowskiDni} dni).`;
      if (d.przysposobione === "Tak") {
        needDate(d, e, "dataPrawomocnosci");
        if (isValidDate(d.dataPrawomocnosci) && isValidDate(d.do) && d.do >= addMonths(d.dataPrawomocnosci, 12)) e.do = "Urlop ojcowski na dziecko przysposobione wykorzystuje się w ciągu 12 miesięcy od uprawomocnienia postanowienia.";
      } else {
        needDate(d, e, "dataUrDziecka");
        if (isValidDate(d.dataUrDziecka) && isValidDate(d.od) && d.od < d.dataUrDziecka) e.od = "Urlop ojcowski zaczyna się najwcześniej w dniu urodzenia dziecka.";
        if (isValidDate(d.dataUrDziecka) && isValidDate(d.do) && d.do >= addMonths(d.dataUrDziecka, W.ojcowskiDoMiesiacaZycia))
          e.do = `Urlop ojcowski wykorzystuje się do ukończenia przez dziecko ${W.ojcowskiDoMiesiacaZycia} miesięcy (do ${fmtDate(addDays(addMonths(d.dataUrDziecka, W.ojcowskiDoMiesiacaZycia), -1))}).`;
      }
      return e;
    },
  },

  /* § 18 – urlop na warunkach urlopu macierzyńskiego */
  {
    key: "urlop_na_warunkach", par: "§ 18", to: "Pracodawca",
    title: "Wniosek o udzielenie urlopu na warunkach urlopu macierzyńskiego",
    desc: "Przyjęcie dziecka na wychowanie i wystąpienie do sądu opiekuńczego o przysposobienie (dziecko do 14 lat) albo rodzina zastępcza, z wyjątkiem zawodowej (do 7 lat, przy odroczeniu obowiązku szkolnego – do 10 lat).",
    fields: [
      NAME(),
      { name: "podstawa", label: "Przyjęcie dziecka na wychowanie", type: "select", options: ["i wystąpienie do sądu opiekuńczego z wnioskiem o wszczęcie postępowania w sprawie przysposobienia", "jako rodzina zastępcza, z wyjątkiem rodziny zastępczej zawodowej"] },
      { name: "dziecko", label: "Imię i nazwisko oraz data urodzenia dziecka (dzieci) przyjętego na wychowanie", type: "textarea" },
      { name: "dzieci", label: "Liczba przyjętych dzieci", type: "number" },
      { name: "dataPrzyjecia", label: "Data przyjęcia dziecka (dzieci) na wychowanie", type: "date" },
      ...OKRES_F("Okres urlopu na warunkach urlopu macierzyńskiego"),
      { name: "odroczenie", label: "Wobec dziecka podjęto decyzję o odroczeniu obowiązku szkolnego", type: "select", options: ["Nie", "Tak"] },
      AKTA,
    ],
    body: (d) =>
      letter({
        d, par: "§ 18 ust. 1", basis: "art. 183 § 6 Kodeksu pracy",
        intro: `Wnoszę o udzielenie mi urlopu na warunkach urlopu macierzyńskiego w związku z przyjęciem dziecka na wychowanie ${v(d.podstawa)}.`,
        points: [
          ["imię i nazwisko pracownika", v(d.imieNazwisko)],
          ["imię i nazwisko oraz datę urodzenia dziecka przyjętego (dzieci przyjętych) na wychowanie albo dziecka przyjętego (dzieci przyjętych) na wychowanie jako rodzina zastępcza, na które ma być udzielony urlop na warunkach urlopu macierzyńskiego", v(d.dziecko)],
          ["wskazanie okresu, na który ma być udzielony urlop na warunkach urlopu macierzyńskiego", okres(d)],
        ],
        statements: [`Dziecko (dzieci) przyjąłem/przyjęłam na wychowanie w dniu ${dt(d.dataPrzyjecia)}.`],
        attachments: [PRZYJECIE_DOK, ...(d.odroczenie === "Tak" ? [ODROCZENIE_DOK()] : [])],
      }),
    validate: (d, c) => {
      const e: V = {};
      base(d, e, ["podstawa", "dziecko", "odroczenie"]);
      needDate(d, e, "dataPrzyjecia");
      const n = int(d.dzieci);
      if (!(n >= 1 && n <= 10)) e.dzieci = "Podaj liczbę przyjętych dzieci.";
      const days = period(d, e);
      const max = weeksByChildren(c.params.wymiary.naWarunkachMacierzynskiego, n || 1) * 7;
      if (days > max) e.do = `Urlop na warunkach urlopu macierzyńskiego trwa najwyżej ${max / 7} tyg. przy liczbie dzieci: ${n || 1}.`;
      if (isValidDate(d.od) && isValidDate(d.dataPrzyjecia) && d.od < d.dataPrzyjecia) e.od = "Urlop zaczyna się najwcześniej w dniu przyjęcia dziecka na wychowanie.";
      return e;
    },
  },

  /* § 19 – urlop wychowawczy */
  {
    key: "urlop_wychowawczy", par: "§ 19", to: "Pracodawca",
    title: "Wniosek o udzielenie urlopu wychowawczego lub jego części",
    desc: "Do 36 miesięcy (w maks. 5 częściach), nie dłużej niż do końca roku, w którym dziecko kończy 6 lat; wniosek co najmniej 21 dni przed rozpoczęciem (art. 186 § 7 Kp). Za urlop wychowawczy nie przysługuje zasiłek z ZUS.",
    fields: [
      NAME(),
      { name: "dziecko", label: "Imię i nazwisko dziecka" },
      ...OKRES_F("Okres urlopu wychowawczego (jego części)"),
      { name: "wykorzystany", label: "Okres urlopu wychowawczego dotychczas wykorzystany na to dziecko", hint: "np. „nie wykorzystano”" },
      { name: "liczbaCzesci", label: "Liczba części urlopu wychowawczego, z których dotychczas skorzystano na to dziecko", type: "number" },
      { name: "drugi", label: "Drugi rodzic albo opiekun dziecka w okresie objętym wnioskiem", type: "select", options: [
        "nie zamierza korzystać z urlopu wychowawczego",
        "zamierza korzystać z urlopu wychowawczego w okresie:",
        "oświadczenie nie jest wymagane – drugiemu rodzicowi ograniczono lub odebrano władzę rodzicielską / ograniczono opiekę albo zwolniono drugiego opiekuna z opieki",
        "zachodzą niedające się usunąć przeszkody do uzyskania informacji od drugiego rodzica lub opiekuna",
      ] },
      { name: "drugiOkres", label: "Okres, w którym drugi rodzic / opiekun zamierza korzystać", when: (d) => !!d.drugi?.startsWith("zamierza") },
      { name: "niepelnosprawnosc", label: "Urlop na dziecko z orzeczeniem o niepełnosprawności (art. 186 § 3 Kp)", type: "select", options: ["Nie", "Tak"] },
      { name: "pelne36", label: "Wnioskujesz o 36 miesięcy (łącznie z dotychczas wykorzystanym) dla jednego rodzica", type: "select", options: [
        "Nie",
        "Tak – zgon drugiego rodzica (art. 186 § 9 pkt 1 Kp)",
        "Tak – drugi rodzic ubezwłasnowolniony / niepełnoletni (rodzice bez ślubu) / ojcostwo ustalone bez władzy rodzicielskiej (art. 186 § 9 pkt 2 Kp)",
        "Tak – pozbawienie, ograniczenie lub zawieszenie władzy rodzicielskiej drugiego rodzica (art. 186 § 9 pkt 3 Kp)",
        "Tak – opieka przyznana jednemu opiekunowi / zwolnienie drugiego opiekuna (art. 186 § 10 Kp)",
      ] },
      AKTA,
    ],
    body: (d) => {
      const st = d.drugi?.startsWith("zamierza")
        ? `Oświadczam, że drugi rodzic albo opiekun dziecka zamierza korzystać z urlopu wychowawczego w okresie objętym wnioskiem: ${v(d.drugiOkres)}.`
        : d.drugi?.startsWith("nie zamierza")
          ? "Oświadczam, że drugi rodzic albo opiekun dziecka nie zamierza korzystać z urlopu wychowawczego przez okres wskazany we wniosku."
          : d.drugi?.startsWith("zachodzą")
            ? "Oświadczam, że zachodzą niedające się usunąć przeszkody do uzyskania informacji od drugiego rodzica lub opiekuna dziecka o braku zamiaru korzystania z urlopu wychowawczego przez okres wskazany we wniosku albo o okresie, w którym drugi rodzic lub opiekun dziecka zamierza korzystać z urlopu wychowawczego w okresie objętym wnioskiem."
            : "";
      const p36 = d.pelne36 ?? "Nie";
      const atts = [
        ...(d.drugi?.startsWith("nie zamierza") || d.drugi?.startsWith("zamierza")
          ? ["oświadczenie pracownika o braku zamiaru korzystania przez drugiego rodzica albo opiekuna dziecka z urlopu wychowawczego przez okres wskazany we wniosku albo o okresie, w którym drugi rodzic albo opiekun dziecka zamierza korzystać z urlopu wychowawczego w okresie objętym wnioskiem"]
          : []),
        ...(d.drugi?.startsWith("oświadczenie nie jest") ? ["kopię prawomocnego orzeczenia sądu o ograniczeniu drugiemu rodzicowi albo pozbawieniu drugiego rodzica władzy rodzicielskiej albo o ograniczeniu opieki drugiemu opiekunowi albo zwolnieniu z opieki drugiego opiekuna dziecka"] : []),
        ...(d.drugi?.startsWith("zachodzą") ? ["dokumenty lub oświadczenie pracownika, że zachodzą niedające się usunąć przeszkody do uzyskania informacji od drugiego rodzica lub opiekuna dziecka"] : []),
        ...(d.niepelnosprawnosc === "Tak" ? ["kopię prawomocnego orzeczenia o niepełnosprawności lub stopniu niepełnosprawności dziecka, na które ma być udzielony urlop wychowawczy, w przypadku, o którym mowa w art. 186 § 3 Kodeksu pracy"] : []),
        ...(p36.includes("pkt 1") ? ["odpis skrócony aktu zgonu drugiego rodzica dziecka w przypadku, o którym mowa w art. 186 § 9 pkt 1 Kodeksu pracy"] : []),
        ...(p36.includes("pkt 2") ? ["kopię prawomocnego orzeczenia sądu o ubezwłasnowolnieniu drugiego rodzica dziecka albo dokument potwierdzający niepełnoletność drugiego rodzica dziecka, gdy rodzice nie są małżeństwem, albo kopię prawomocnego orzeczenia sądu o ustaleniu ojcostwa, w którym sąd nie przyznał ojcu władzy rodzicielskiej, w przypadku, o którym mowa w art. 186 § 9 pkt 2 Kodeksu pracy"] : []),
        ...(p36.includes("pkt 3") ? ["kopię prawomocnego orzeczenia sądu o pozbawieniu drugiego rodzica władzy rodzicielskiej albo o jej ograniczeniu lub zawieszeniu w przypadku, o którym mowa w art. 186 § 9 pkt 3 Kodeksu pracy"] : []),
        ...(p36.includes("§ 10") ? ["kopię prawomocnego orzeczenia sądu o przyznaniu opieki nad dzieckiem jednemu opiekunowi albo zwolnieniu drugiego opiekuna z opieki w przypadku, o którym mowa w art. 186 § 10 zdanie pierwsze Kodeksu pracy"] : []),
      ];
      return letter({
        d, par: "§ 19 ust. 1", basis: "art. 186 § 7 Kodeksu pracy",
        intro: "Wnoszę o udzielenie mi urlopu wychowawczego (jego części).",
        points: [
          ["imię i nazwisko pracownika", v(d.imieNazwisko)],
          ["imię i nazwisko dziecka, na które ma być udzielony urlop wychowawczy albo ma być udzielona jego część", v(d.dziecko)],
          ["wskazanie okresu, na który ma być udzielony urlop wychowawczy albo ma być udzielona jego część na dane dziecko", okres(d)],
          ["wskazanie okresu urlopu wychowawczego, który dotychczas został wykorzystany na dane dziecko", v(d.wykorzystany)],
          ["określenie liczby części urlopu wychowawczego, z których dotychczas skorzystano na dane dziecko", v(d.liczbaCzesci)],
        ],
        statements: st ? [st] : [],
        attachments: atts,
      });
    },
    validate: (d) => {
      const e: V = {};
      base(d, e, ["dziecko", "wykorzystany", "drugi", "niepelnosprawnosc", "pelne36"]);
      if (d.drugi?.startsWith("zamierza")) need(d, e, ["drugiOkres"]);
      const n = int(d.liczbaCzesci);
      if (!(n >= 0 && n <= 4)) e.liczbaCzesci = "Podaj liczbę od 0 do 4 – urlop wychowawczy można podzielić najwyżej na 5 części.";
      period(d, e);
      if (isValidDate(d.od) && isValidDate(d.do) && d.do >= addMonths(d.od, 36)) e.do = "Urlop wychowawczy trwa najwyżej 36 miesięcy.";
      if (isValidDate(d.od) && d.od < addDays(today(), 21)) e.od = `Wniosek składa się co najmniej 21 dni przed rozpoczęciem urlopu – najwcześniej od ${fmtDate(addDays(today(), 21))}.`;
      return e;
    },
  },

  /* § 20 – obniżenie wymiaru czasu pracy */
  {
    key: "obnizenie_wymiaru", par: "§ 20", to: "Pracodawca",
    title: "Wniosek o obniżenie wymiaru czasu pracy pracownika uprawnionego do urlopu wychowawczego",
    desc: "Zamiast urlopu wychowawczego możesz pracować w obniżonym wymiarze, nie niższym niż połowa pełnego wymiaru czasu pracy (art. 186⁷ § 1 Kp). Wniosek składasz co najmniej 21 dni przed rozpoczęciem pracy w obniżonym wymiarze.",
    fields: [
      NAME(),
      { name: "dziecko", label: "Imię i nazwisko dziecka, na które mógłby być udzielony urlop wychowawczy" },
      ...OKRES_F("Okres pracy w obniżonym wymiarze"),
      { name: "wymiar", label: "Wymiar czasu pracy", type: "select", options: ["1/2 etatu", "5/8 etatu", "3/4 etatu", "7/8 etatu"] },
      { name: "dotychczas", label: "Okres, w którym dotychczas pracowałeś w obniżonym wymiarze zamiast urlopu wychowawczego", hint: "np. „nie korzystałem/am”" },
      DOK_UR, AKTA,
    ],
    body: (d) =>
      letter({
        d, par: "§ 20 ust. 1", basis: "art. 186⁷ § 1 Kodeksu pracy",
        intro: "Wnoszę o obniżenie mojego wymiaru czasu pracy w okresie, w którym mógłbym/mogłabym korzystać z urlopu wychowawczego.",
        points: [
          ["imię i nazwisko pracownika", v(d.imieNazwisko)],
          ["imię i nazwisko dziecka, na które mógłby być udzielony urlop wychowawczy", v(d.dziecko)],
          ["wskazanie okresu, przez który pracownik zamierza wykonywać pracę w obniżonym wymiarze czasu pracy", okres(d)],
          ["wskazanie wymiaru czasu pracy, w którym pracownik zamierza wykonywać pracę", v(d.wymiar)],
        ],
        statements: [`Oświadczam, że dotychczas korzystałem/korzystałam z wykonywania pracy w obniżonym wymiarze czasu pracy w okresie, w którym mógłbym/mogłabym korzystać z urlopu wychowawczego: ${v(d.dotychczas)}.`],
        attachments: [ODPIS(d), "oświadczenie o okresie, w którym pracownik dotychczas korzystał z wykonywania pracy w obniżonym wymiarze czasu pracy w okresie, w którym mógłby korzystać z urlopu wychowawczego"],
      }),
    validate: (d) => {
      const e: V = {};
      base(d, e, ["dziecko", "wymiar", "dotychczas", "dokUrodzenia"]);
      period(d, e);
      if (isValidDate(d.od) && d.od < addDays(today(), 21)) e.od = `Wniosek składa się co najmniej 21 dni przed rozpoczęciem pracy w obniżonym wymiarze – najwcześniej od ${fmtDate(addDays(today(), 21))}.`;
      return e;
    },
  },
];
