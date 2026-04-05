function json(body, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=UTF-8");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function cleanLine(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        Allow: "POST, OPTIONS",
      },
    });
  }

  if (request.method !== "POST") {
    return json(
      { error: "Method not allowed" },
      { status: 405, headers: { Allow: "POST, OPTIONS" } }
    );
  }

  try {
    const body = await request.json();
    const name = cleanLine(body.name).slice(0, 80);
    const email = cleanLine(body.email).slice(0, 200);
    const subject = cleanLine(body.subject).slice(0, 80);
    const message = String(body.message || "").trim().slice(0, 5000);
    const botField = String(body.botField || "").trim();

    if (botField) {
      return json({ ok: true });
    }

    if (name.length < 2) {
      return json({ error: "Please enter your name." }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!subject) {
      return json({ error: "Please choose a subject." }, { status: 400 });
    }

    if (message.length < 10) {
      return json({ error: "Please add a longer message." }, { status: 400 });
    }

    if (!env.DB) {
      console.error("D1 binding DB is not configured");
      return json({ error: "Contact form is not configured yet." }, { status: 500 });
    }

    await env.DB.prepare(
      `INSERT INTO contact_submissions (name, email, subject, message, source)
       VALUES (?, ?, ?, ?, 'contact')`
    )
      .bind(name, email, subject, message)
      .run();

    return json({ ok: true });
  } catch (error) {
    console.error("Contact function error:", error);
    return json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
