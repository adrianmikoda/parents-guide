import { CASES, defaultCalcInput } from "@/lib/cases";
import { calculate, CalcInput, computeBase } from "@/lib/engine";
import { json } from "@/lib/session";
import { getParams } from "@/lib/store";

/** GET – sprawa testowa z wyliczeniem podstawy i zasiłku */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = CASES.find((x) => x.id === id);
  if (!c) return json({ error: "Nie znaleziono sprawy" }, 404);
  const p = getParams();
  const base = computeBase({ title: c.tytulUbezpieczenia, ...c.podstawa }, p);
  const d = defaultCalcInput();
  const input: CalcInput = {
    ...d,
    ...c.calc,
    mother: { ...d.mother, base: base.base, ...c.calc.mother },
    father: { ...d.father, base: c.podstawaOjca ?? base.base, ...c.calc.father },
    premature: { ...d.premature!, ...c.calc.premature },
  };
  return json({ case: c, base, input, result: calculate(input, p) });
}
