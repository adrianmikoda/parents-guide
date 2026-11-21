import { json } from "@/lib/session";
import { LINKS, ORGS } from "@/lib/support";

/** GET ?obszar= – organizacje pomocowe (charytatywne) i oficjalne źródła informacji */
export async function GET(req: Request) {
  const obszar = new URL(req.url).searchParams.get("obszar");
  return json({ orgs: obszar ? ORGS.filter((o) => o.obszary.includes(obszar)) : ORGS, links: LINKS });
}
