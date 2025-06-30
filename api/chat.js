const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message missing in request body' });
  }

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo", // or gpt-4 if available
      messages: [
        {
          role: "system",
          content: "You are Bookstaa's helpful assistant. Be friendly, clear, and helpful. If you don’t know the product, suggest helpful alternatives. Always end with a link to [Bookstaa.com](https://www.bookstaa.com).",
        },
        { role: "user", content: message },
      ],
      temperature: 0.7,
    });

    const reply = response.data.choices[0].message.content;
    res.status(200).json({ reply });
  } catch (error) {
    console.error("❌ OpenAI API Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
