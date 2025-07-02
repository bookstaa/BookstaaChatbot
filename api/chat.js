const fetch = require('node-fetch');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

module.exports = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.length < 1) {
      return res.status(400).json({ error: 'Empty message' });
    }

    // Step 1: Try to fetch products using search API
    const searchRes = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/search-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: message }),
    });

    const searchData = await searchRes.json();

    // Step 2: If products found → return product results
    if (searchData.products && searchData.products.length > 0) {
      return res.status(200).json({ type: 'products', products: searchData.products });
    }

    // Step 3: Fallback — Use ChatGPT to analyze intent
    const prompt = `
You are Bookstaa Chatbot — a helpful, friendly assistant for an Indian bookstore.

Respond to the user message below. You do NOT have product search results, so your job is to:

1. Understand what the user may be looking for (intent)
2. Suggest helpful categories or search tips
3. Encourage the user to type more specific words (like book title, author, or subject)
4. Sound smart, natural, and loyal to Bookstaa (NEVER recommend other websites)

Message from user: "${message}"

Now craft a helpful reply using a conversational tone.
`;

    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.8,
      }),
    });

    const gptData = await gptRes.json();
    const reply = gptData.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(200).json({
        type: 'text',
        text: `❓ I couldn’t find anything for: **${message}**

You can try:
• Searching by **book title**, **author name**, or **ISBN**
• Asking for **categories** like *astrology*, *Vedic studies*, or *bestsellers*

We're adding new books regularly at [Bookstaa.com](https://bookstaa.com) 📚`,
      });
    }

    // Step 4: Return ChatGPT fallback reply
    return res.status(200).json({ type: 'text', text: reply });
  } catch (err) {
    console.error('💥 /api/chat error:', err);
    return res.status(500).json({ error: 'Chat failed', details: err.message });
  }
};
