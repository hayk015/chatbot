// Serverless API route for Vercel and local Node.js server
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Parse and sanitize API key
  let apiKey = (process.env.GROQ_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (!apiKey) {
    return res.status(500).json({
      error: "GROQ_API_KEY is not configured. Please add your Groq API key in Vercel or your local .env file."
    });
  }

  // Parse and sanitize model name
  let model = (process.env.GROQ_MODEL || "").trim().replace(/^["']|["']$/g, "") || "llama-3.1-8b-instant";

  // Support both single message and conversation history array
  const body = req.body || {};
  let messages = [];

  if (Array.isArray(body.messages) && body.messages.length > 0) {
    messages = body.messages.map(m => ({
      role: m.role === "bot" || m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "")
    }));
  } else if (body.message) {
    messages = [{ role: "user", content: String(body.message) }];
  } else {
    return res.status(400).json({ error: "No message was provided." });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || "Failed to get response from Groq.";
      return res.status(response.status).json({ error: errorMsg });
    }

    const reply = data.choices?.[0]?.message?.content || "No reply generated.";
    return res.status(200).json({
      reply: reply,
      model: data.model || model
    });
  } catch (err) {
    console.error("Chat error:", err);
    return res.status(500).json({ error: "Internal server error connecting to AI provider." });
  }
};
