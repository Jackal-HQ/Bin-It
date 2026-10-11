import type { MetadataRoute } from "next";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://bin-it-psi.vercel.app")
).replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The dashboard is a staff tool and the API is not a crawl target.
      disallow: ["/api/", "/dashboard"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
