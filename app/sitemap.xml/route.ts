export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const updated = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${origin}/</loc><lastmod>${updated}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>${origin}/biblioteca/index.html</loc><lastmod>${updated}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>${origin}/privacidad</loc><lastmod>${updated}</lastmod><changefreq>yearly</changefreq><priority>0.5</priority></url>
</urlset>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
