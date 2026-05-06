import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

function ok(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: JSON_HEADERS });
}

function extractScore(html: string): number | null {
  // 1. __NEXT_DATA__ blob — Reclame Aqui é Next.js
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>({.+?})<\/script>/s);
  if (nextDataMatch) {
    try {
      const json = JSON.parse(nextDataMatch[1]);
      // Caminha pelo objeto procurando campos de nota
      const str = JSON.stringify(json);
      const m1 = str.match(/"score"\s*:\s*([\d.]+)/);
      if (m1) return parseFloat(m1[1]);
      const m2 = str.match(/"averageScore"\s*:\s*([\d.]+)/);
      if (m2) return parseFloat(m2[1]);
      const m3 = str.match(/"ratingValue"\s*:\s*"?([\d.]+)"?/);
      if (m3) return parseFloat(m3[1]);
    } catch { /* ignorar */ }
  }

  // 2. JSON-LD structured data
  const ldMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  if (ldMatch) {
    for (const block of ldMatch) {
      const inner = block.replace(/<\/?script[^>]*>/gi, "");
      const rv = inner.match(/"ratingValue"\s*:\s*"?([\d.,]+)"?/);
      if (rv) return parseFloat(rv[1].replace(",", "."));
    }
  }

  // 3. Texto da página: "nota média nos últimos N meses é X.X/10"
  const m3 = html.match(/nota\s+m[eé]dia\s+nos\s+[uú]ltimos\s+\d+\s+meses\s+[eé]\s+([\d]+[.,][\d]+)\s*\/\s*10/i);
  if (m3) return parseFloat(m3[1].replace(",", "."));

  // 4. Qualquer "X.X / 10" na página
  const m4 = html.match(/\b([0-9](?:[.,][0-9])?)\s*\/\s*10\b/);
  if (m4) return parseFloat(m4[1].replace(",", "."));

  return null;
}

function extractReputation(html: string): string | null {
  const m = html.match(/"(Ótimo|Bom|Regular|Ruim|N[aã]o\s+recomendad[ao])"/i);
  return m ? m[1] : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  let slug = "";
  try {
    const body = await req.json();
    slug = (body?.slug ?? "").trim();
    // Aceita URL completa e extrai o slug
    const urlMatch = slug.match(/reclameaqui\.com\.br\/empresa\/([^/?#\s]+)/);
    if (urlMatch) slug = urlMatch[1];
  } catch {
    return ok({ score: null, reputation: null, error: "JSON inválido no body." });
  }

  if (!slug) return ok({ score: null, reputation: null, error: "Parâmetro 'slug' é obrigatório." });

  const targetUrl = `https://www.reclameaqui.com.br/empresa/${slug}/`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return ok({ score: null, reputation: null, error: `Reclame Aqui retornou HTTP ${res.status}. Verifique o slug.`, url: targetUrl });
    }

    const html = await res.text();
    const score = extractScore(html);
    const reputation = extractReputation(html);

    return ok({ score, reputation, url: targetUrl });
  } catch (err) {
    return ok({ score: null, reputation: null, error: (err as Error).message });
  }
});
