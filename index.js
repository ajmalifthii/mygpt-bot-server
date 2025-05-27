const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", async (req, res) => {
  try {
    const messageEntry = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const from = messageEntry?.from;
    const userMessage = messageEntry?.text?.body;

    if (from && userMessage) {
      console.log(`📩 Message from ${from}: ${userMessage}`);

      // 🌐 Call OpenAI GPT
      const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      const gptData = await gptRes.json();
      console.log("🧠 GPT Response:", JSON.stringify(gptData, null, 2));

      const replyText = gptData?.choices?.[0]?.message?.content ??
                        gptData?.error?.message ??
                        "🤖 Sorry, I had a moment. Try again?";

      // 📤 Send message back via WhatsApp
      const whatsappRes = await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: from,
          text: { body: replyText },
        }),
      });

      const whatsappData = await whatsappRes.json();
      console.log("📤 WhatsApp API response:", JSON.stringify(whatsappData, null, 2));

      if (whatsappData?.error) {
        console.error("❌ WhatsApp send error:", whatsappData.error.message);
      } else {
        console.log(`✅ Replied to ${from}: ${replyText}`);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error handling webhook:", err);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server live on port ${PORT}`);
});
