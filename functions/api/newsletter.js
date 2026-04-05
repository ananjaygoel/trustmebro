import { EmailMessage } from "cloudflare:email";

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

function buildRawEmail({ fromName, fromEmail, toEmail, subject, text }) {
  return [
    `From: ${cleanLine(fromName)} <${cleanLine(fromEmail)}>`,
    `To: ${cleanLine(toEmail)}`,
    `Subject: ${cleanLine(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    text.replace(/\r?\n/g, "\r\n"),
  ].join("\r\n");
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
    const email = cleanLine(body.email).slice(0, 200);
    const botField = String(body.botField || "").trim();

    if (botField) {
      return json({ ok: true, message: "✅ you're in! welcome to the squad" });
    }

    if (!isValidEmail(email)) {
      return json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!env.DB) {
      console.error("D1 binding DB is not configured");
      return json({ error: "Newsletter signup is not configured yet." }, { status: 500 });
    }

    const result = await env.DB.prepare(
      `INSERT INTO newsletter_subscriptions (email, source)
       VALUES (?, 'footer')
       ON CONFLICT(email) DO NOTHING`
    )
      .bind(email)
      .run();

    const isNewSubscription = Boolean(result.meta && result.meta.changes > 0);
    const toEmail = cleanLine(env.NEWSLETTER_TO_EMAIL || env.CONTACT_TO_EMAIL || "hello@trustmebro.pro");
    const fromEmail = cleanLine(env.CONTACT_FROM_EMAIL || "noreply@trustmebro.pro");

    if (isNewSubscription && env.NOTIFICATIONS_EMAIL?.send) {
      const raw = buildRawEmail({
        fromName: "TrustMeBro Newsletter",
        fromEmail,
        toEmail,
        subject: "[TrustMeBro] New newsletter signup",
        text: `New newsletter subscriber: ${email}`,
      });

      try {
        await env.NOTIFICATIONS_EMAIL.send(new EmailMessage(fromEmail, toEmail, raw));
      } catch (error) {
        console.error("Newsletter notification email failed:", error);
      }
    }

    return json({
      ok: true,
      message: isNewSubscription
        ? "✅ you're in! welcome to the squad"
        : "✅ you're already subscribed, no cap",
    });
  } catch (error) {
    console.error("Newsletter function error:", error);
    return json({ error: "Something went wrong, try again?" }, { status: 500 });
  }
}
