// /api/chat.js
const { smartSearch } = require('../utils/smartSearch');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length < 1) {
      return res.status(400).json({ error: 'Empty message' });
    }

    // 🔍 Try smart product search
    const productMatches = smartSearch(message);

    if (productMatches.length > 0) {
      const productCards = productMatches.map(product => ({
        title: product.title,
        author: product.author || '',
        price: product.price || '—',
        image: product.image || '',
        url: product.url || '',
        vendor: product.vendor || '',
      }));

      return res.status(200).json({ type: 'product', products: productCards });
    }

    // 🤖 Fallback to GPT-style reply (limited to Bookstaa context)
    const reply = await getAssistantReply(message);
    return res.status(200).json({ type: 'text', reply });
  } catch (err) {
    console.error('Chatbot error:', err);
    return res.status(500).json({ error: 'Chatbot failure' });
  }
};

// ✨ Custom assistant reply, Bookstaa-limited personality
async function getAssistantReply(userInput) {
  const prompt = `
You are Bookstaa's helpful assistant. Only talk about Bookstaa.com and its book collection.
Never recommend anything outside the store.

User: ${userInput}
Assistant:
`;

  const response = await fetch('https://api.openai.com/v1/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-davinci-003',
      prompt,
      max_tokens: 150,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.text?.trim() || "I'm here to help! Could you please rephrase your question?";
}
