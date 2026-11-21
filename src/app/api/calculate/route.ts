import { calculate, CalcInput } from "@/lib/engine";
import { defaultCalcInput } from "@/lib/cases";
import { json } from "@/lib/session";
import { getParams } from "@/lib/store";

/** POST CalcInput – zintegrowany kalkulator zasiłku macierzyńskiego (oboje rodzice, praca, adopcja, sytuacje szczególne) */
export async function POST(req: Request) {
  const body = (await req.json()) as Partial<CalcInput>;
  const d = defaultCalcInput();
  const input: CalcInput = { ...d, ...body, mother: { ...d.mother, ...body.mother }, father: { ...d.father, ...body.father }, premature: { ...d.premature!, ...body.premature } };
  const params = getParams();
  return json({ input, result: calculate(input, params), paramsVersion: params.version });
}
