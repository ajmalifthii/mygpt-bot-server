const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

app.post("/send-message", async (req, res) => {
  const apiKey = req.headers['x-api-key'];

  // 🔐 Check API key
  if (apiKey !== process.env.CUSTOM_GPT_API_KEY) {
    return res.status(403).json({ error: "❌ Unauthorized — invalid API key" });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await openaiRes.json();
    const reply = data.choices?.[0]?.message?.content || "⚠️ No reply generated.";

    return res.json({ reply });
  } catch (err) {
    console.error("❌ GPT API Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
