const fetch = require("node-fetch");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message missing in request body" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are Bookstaa's helpful assistant. Always give warm and helpful answers. If you don’t find a product, suggest categories or authors. Always end with a link to [Bookstaa.com](https://www.bookstaa.com).",
          },
          { role: "user", content: message },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.choices || !data.choices.length) {
      console.error("⚠️ OpenAI API Error:", data);
      return res.status(500).json({ error: "Failed to generate response" });
    }

    const reply = data.choices[0].message.content;
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("❌ OpenAI Request Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
