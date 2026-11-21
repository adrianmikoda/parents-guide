import { BaseInput, computeBase } from "@/lib/engine";
import { json } from "@/lib/session";
import { getParams } from "@/lib/store";

/** POST BaseInput – wyliczenie podstawy wymiaru zasiłku (z krokami) */
export async function POST(req: Request) {
  const inp = (await req.json()) as BaseInput;
  return json(computeBase(inp, getParams()));
}
