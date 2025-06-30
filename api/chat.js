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
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are Bookstaa's helpful assistant. Always be warm, honest, and loyal to Bookstaa.com. If a user asks for a book, provide helpful alternatives if not found. Always end with a friendly CTA or link to [Bookstaa.com](https://www.bookstaa.com).`,
        },
        { role: "user", content: message },
      ],
      temperature: 0.7,
    });

    const reply = response.data.choices[0].message.content;
    res.status(200).json({ reply });
  } catch (error) {
    console.error("❌ OpenAI API Error:", error?.response?.data || error.message || error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
