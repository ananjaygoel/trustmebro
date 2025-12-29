import type { Context } from "@netlify/functions";

/**
 * TrustMeBro Q&A Function
 * 
 * A lightweight serverless function that answers reader questions about articles
 * using the article content + Groq API (Llama 3.3 70B)
 * 
 * Rate limited: 10 questions per IP per hour (prevents abuse)
 */

// Simple in-memory rate limiter (resets on cold start, but good enough for abuse prevention)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // questions per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in ms

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

export default async (req: Request, context: Context) => {
  const headers = {
    "Access-Control-Allow-Origin": "https://trustmebro.pro",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }), 
      { status: 405, headers }
    );
  }

  // Rate limiting
  const clientIP = context.ip || req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(clientIP)) {
    return new Response(
      JSON.stringify({ 
        error: "Too many questions! Please wait a bit before asking more.",
        retryAfter: 3600 
      }), 
      { status: 429, headers }
    );
  }

  try {
    const body = await req.json();
    const { question, articleTitle, articleContent, articleSlug } = body;

    // Validate inputs
    if (!question || typeof question !== "string" || question.length < 5) {
      return new Response(
        JSON.stringify({ error: "Please ask a valid question (at least 5 characters)" }), 
        { status: 400, headers }
      );
    }

    if (question.length > 500) {
      return new Response(
        JSON.stringify({ error: "Question too long (max 500 characters)" }), 
        { status: 400, headers }
      );
    }

    if (!articleContent || typeof articleContent !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing article content" }), 
        { status: 400, headers }
      );
    }

    // Get Groq API key from environment
    const GROQ_API_KEY = Netlify.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      console.error("GROQ_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Q&A service not configured" }), 
        { status: 500, headers }
      );
    }

    // Build the prompt
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

    // Call Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Groq API error:", data.error);
      
      // Handle rate limiting gracefully
      if (data.error.message?.includes("rate limit")) {
        return new Response(
          JSON.stringify({ 
            error: "Our AI is taking a quick break. Please try again in a moment!",
            answer: null 
          }), 
          { status: 503, headers }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Couldn't generate an answer right now" }), 
        { status: 500, headers }
      );
    }

    const answer = data.choices?.[0]?.message?.content;
    
    if (!answer) {
      return new Response(
        JSON.stringify({ error: "No answer generated" }), 
        { status: 500, headers }
      );
    }

    return new Response(
      JSON.stringify({ 
        answer: answer.trim(),
        questionAsked: question,
        articleSlug 
      }), 
      { status: 200, headers }
    );

  } catch (error) {
    console.error("Ask function error:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again!" }), 
      { status: 500, headers }
    );
  }
};
