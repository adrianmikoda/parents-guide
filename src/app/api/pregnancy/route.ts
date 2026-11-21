import { assessRisks, pregnancyBenefits, PregnancyInput } from "@/lib/engine";
import { json } from "@/lib/session";
import { getParams } from "@/lib/store";

/** POST PregnancyInput – uprawnienia w czasie ciąży: zasiłek chorobowy, świadczenie rehabilitacyjne, zasiłek w wysokości macierzyńskiego */
export async function POST(req: Request) {
  const inp = (await req.json()) as PregnancyInput;
  const p = getParams();
  return json({
    benefits: pregnancyBenefits(inp, p),
    risks: assessRisks({ title: inp.title, insuranceStart: inp.insuranceStart, dueDate: inp.dueDate, contractEnd: inp.contractEnd, contractKind: inp.contractKind, debt: inp.debt, zlaWithoutB: !inp.kodB }, p),
  });
}
