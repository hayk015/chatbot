// Serverless API route for Vercel and local Node.js server
let cachedWorkingModel = null;

async function getAvailableChatModel(apiKey) {
  if (cachedWorkingModel) return cachedWorkingModel;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    if (!res.ok) return null;
    const json = await res.json();
    const models = (json.data || []).map(m => m.id);
    
    // Prioritize popular English models over alphabetical fallback (like allam)
    const preferred = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
    const foundPreferred = preferred.find(p => models.includes(p));
    if (foundPreferred) {
      cachedWorkingModel = foundPreferred;
      return cachedWorkingModel;
    }

    // Filter for text chat models (exclude whisper, speech, guard rails, arabic allam)
    const chatModels = models.filter(id => 
      !id.includes("whisper") && 
      !id.includes("guard") && 
      !id.includes("orpheus") &&
      !id.includes("safeguard") &&
      !id.includes("allam")
    );

    if (chatModels.length > 0) {
      cachedWorkingModel = chatModels[0];
      return cachedWorkingModel;
    }
  } catch (e) {
    console.error("Failed to fetch available models:", e);
  }
  return null;
}

module.exports = async function handler(req, res) {
  // CORS
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
      error: "GROQ_API_KEY is not configured. Please add your Groq API key in Vercel or your local .env.local file."
    });
  }

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

  // Desired model from request body, environment variable, or fallback
  let rawModel = (body.model || process.env.GROQ_MODEL || "").trim().replace(/^["']|["']$/g, "").toLowerCase();
  
  // Normalize common typos (e.g. "3.1 -8b", "llama 3.1 8b", "3.1-8b")
  let model;
  if (!rawModel || rawModel.includes("allam")) {
    model = cachedWorkingModel || "llama-3.1-8b-instant";
  } else if (rawModel.includes("8b") || rawModel.includes("3.1")) {
    model = "llama-3.1-8b-instant";
  } else if (rawModel.includes("70b") || rawModel.includes("3.3")) {
    model = "llama-3.3-70b-versatile";
  } else if (rawModel.includes("120b")) {
    model = "openai/gpt-oss-120b";
  } else if (rawModel.includes("20b")) {
    model = "openai/gpt-oss-20b";
  } else {
    model = rawModel;
  }

  async function callGroq(targetModel) {
    return await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });
  }

  try {
    let response = await callGroq(model);
    let data = await response.json();

    // If model does not exist or user has no access, auto-discover an active model
    if (!response.ok && data.error?.message?.includes("does not exist or you do not have access")) {
      console.log(`Model ${model} unavailable. Discovering available models...`);
      const fallbackModel = await getAvailableChatModel(apiKey);
      if (fallbackModel && fallbackModel !== model) {
        console.log(`Retrying with discovered model: ${fallbackModel}`);
        model = fallbackModel;
        response = await callGroq(model);
        data = await response.json();
      }
    }

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
