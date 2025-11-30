import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const store = getStore("vibes");
  
  // Handle CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing slug" }), { 
      status: 400, 
      headers 
    });
  }

  // GET - fetch current vibes
  if (req.method === "GET") {
    try {
      const data = await store.get(slug, { type: "json" });
      const vibes = data || { fire: 0, cap: 0, skull: 0, goat: 0 };
      return new Response(JSON.stringify(vibes), { headers });
    } catch {
      return new Response(JSON.stringify({ fire: 0, cap: 0, skull: 0, goat: 0 }), { headers });
    }
  }

  // POST - add a vibe
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const reaction = body.reaction;

      if (!["fire", "cap", "skull", "goat"].includes(reaction)) {
        return new Response(JSON.stringify({ error: "Invalid reaction" }), { 
          status: 400, 
          headers 
        });
      }

      // Get current vibes
      let vibes = { fire: 0, cap: 0, skull: 0, goat: 0 };
      try {
        const existing = await store.get(slug, { type: "json" });
        if (existing) vibes = existing;
      } catch {}

      // Increment the reaction
      vibes[reaction as keyof typeof vibes]++;

      // Save back
      await store.setJSON(slug, vibes);

      return new Response(JSON.stringify(vibes), { headers });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Failed to save vibe" }), { 
        status: 500, 
        headers 
      });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { 
    status: 405, 
    headers 
  });
};
