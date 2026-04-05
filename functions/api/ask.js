const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const rateLimitMap = new Map();

function json(body, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=UTF-8");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count += 1;
  return true;
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

  const clientIP =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "unknown";

  if (!checkRateLimit(clientIP)) {
    return json(
      {
        error: "Too many questions! Please wait a bit before asking more.",
        retryAfter: 3600,
      },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
  }

  try {
    const body = await request.json();
    const question = String(body.question || "").trim();
    const articleTitle = String(body.articleTitle || "").trim();
    const articleContent = String(body.articleContent || "");
    const articleSlug = String(body.articleSlug || "").trim();

    if (question.length < 5) {
      return json(
        { error: "Please ask a valid question (at least 5 characters)" },
        { status: 400 }
      );
    }

    if (question.length > 500) {
      return json({ error: "Question too long (max 500 characters)" }, { status: 400 });
    }

    if (!articleContent) {
      return json({ error: "Missing article content" }, { status: 400 });
    }

    if (!env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY not configured");
      return json({ error: "Q&A service not configured" }, { status: 500 });
    }

    const systemPrompt = `You are a helpful, friendly assistant for the news site TrustMeBro.
Your job is to answer reader questions about articles in a conversational, easy-to-understand way.

Guidelines:
- Be concise but complete (2-4 sentences usually)
- Use natural, friendly language
- If the answer isn't in the article, say so honestly
- If the question is off-topic or inappropriate, politely redirect
- Never make up facts not in the article
- Add helpful context when appropriate`;

    const userPrompt = `Article Title: ${articleTitle || "Untitled"}

Article Content:
${articleContent.slice(0, 3000)}

---

Reader's Question: ${question}

Please answer this question based on the article above. Be helpful and conversational.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error("Groq API error:", data.error || data);

      if (data.error?.message?.includes("rate limit")) {
        return json(
          {
            error: "Our AI is taking a quick break. Please try again in a moment!",
            answer: null,
          },
          { status: 503 }
        );
      }

      return json({ error: "Couldn't generate an answer right now" }, { status: 500 });
    }

    const answer = data.choices?.[0]?.message?.content;
    if (!answer) {
      return json({ error: "No answer generated" }, { status: 500 });
    }

    return json({
      answer: answer.trim(),
      questionAsked: question,
      articleSlug,
    });
  } catch (error) {
    console.error("Ask function error:", error);
    return json({ error: "Something went wrong. Please try again!" }, { status: 500 });
  }
}
