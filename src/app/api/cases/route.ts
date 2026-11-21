import { CASES } from "@/lib/cases";
import { json } from "@/lib/session";

/** GET – lista wbudowanych spraw testowych */
export async function GET() {
  return json({ items: CASES.map(({ id, tytul, opis, kategoria, rozstrzygniecie, tytulUbezpieczenia }) => ({ id, tytul, opis, kategoria, rozstrzygniecie, tytulUbezpieczenia })) });
}
