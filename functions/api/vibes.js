const ZERO_VIBES = {
  fire: 0,
  cap: 0,
  skull: 0,
  goat: 0,
};

function json(body, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=UTF-8");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function normalizeSlug(value) {
  return String(value || "").trim().slice(0, 200);
}

async function getVibes(db, slug) {
  const row = await db
    .prepare("SELECT fire, cap, skull, goat FROM article_vibes WHERE slug = ?")
    .bind(slug)
    .first();

  return row || ZERO_VIBES;
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        Allow: "GET, POST, OPTIONS",
      },
    });
  }

  if (!env.DB) {
    console.error("D1 binding DB is not configured");
    return json({ error: "Reactions are not configured" }, { status: 500 });
  }

  const url = new URL(request.url);
  const slug = normalizeSlug(url.searchParams.get("slug"));

  if (!slug) {
    return json({ error: "Missing slug" }, { status: 400 });
  }

  if (request.method === "GET") {
    try {
      return json(await getVibes(env.DB, slug));
    } catch (error) {
      console.error("Failed to load vibes:", error);
      return json(ZERO_VIBES);
    }
  }

  if (request.method === "POST") {
    try {
      const body = await request.json();
      const reaction = String(body.reaction || "").trim();

      if (!["fire", "cap", "skull", "goat"].includes(reaction)) {
        return json({ error: "Invalid reaction" }, { status: 400 });
      }

      const increments = {
        fire: reaction === "fire" ? 1 : 0,
        cap: reaction === "cap" ? 1 : 0,
        skull: reaction === "skull" ? 1 : 0,
        goat: reaction === "goat" ? 1 : 0,
      };

      await env.DB.prepare(
        `INSERT INTO article_vibes (slug, fire, cap, skull, goat, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(slug) DO UPDATE SET
           fire = fire + excluded.fire,
           cap = cap + excluded.cap,
           skull = skull + excluded.skull,
           goat = goat + excluded.goat,
           updated_at = CURRENT_TIMESTAMP`
      )
        .bind(
          slug,
          increments.fire,
          increments.cap,
          increments.skull,
          increments.goat
        )
        .run();

      return json(await getVibes(env.DB, slug));
    } catch (error) {
      console.error("Failed to save vibe:", error);
      return json({ error: "Failed to save vibe" }, { status: 500 });
    }
  }

  return json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "GET, POST, OPTIONS" } }
  );
}
