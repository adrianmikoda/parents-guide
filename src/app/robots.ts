import type { MetadataRoute } from "next";

/** Demo konkursowe – nie indeksujemy panelu administracyjnego ani API. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }] };
}
