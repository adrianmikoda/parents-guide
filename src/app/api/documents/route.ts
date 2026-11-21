import { documentsFor, Title } from "@/lib/engine";
import { json } from "@/lib/session";
import { getParams } from "@/lib/store";

/** GET ?title=&benefit=&insured= – jakie dokumenty, gdzie i kiedy złożyć */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  const title = (u.get("title") || "umowa_o_prace") as Title;
  const benefit = (u.get("benefit") || "macierzynski") as Parameters<typeof documentsFor>[1];
  const insured = parseInt(u.get("insured") || "0", 10);
  return json(documentsFor(title, benefit, insured, getParams()));
}
