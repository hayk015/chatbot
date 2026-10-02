// Runs on Vercel's server, NOT in the browser.
// The API key is read from an environment variable, never written in code.
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(500).json({ error: "API key is not set on the server." });
  }

  // Which LLM to use: set GROQ_MODEL in Vercel, or fall back to the default below.
  const model = (process.env.GROQ_MODEL || "").trim() || "llama-3.1-8b-instant";

  const { message } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 300,
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || "AI request failed" });
    }
    return res.status(200).json({ reply: data.choices[0].message.content, model: data.model || model });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};
