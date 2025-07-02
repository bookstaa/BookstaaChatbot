const fetch = require('node-fetch');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

module.exports = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.length < 1) {
      return res.status(400).json({ error: 'Empty message' });
    }

    // Step 1: Try to fetch products using search API
    const baseURL = req.headers.origin || 'https://bookstaa.com';

    const searchRes = await fetch(`${baseURL}/api/search-products`, {
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
    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are Bookstaa Chatbot — a helpful, loyal assistant for an Indian bookstore. You help users discover books based on their queries and intent. You never recommend other websites. Always encourage the user to search by book title, author, or ISBN.',
          },
          { role: 'user', content: message },
        ],
        temperature: 0.8,
      }),
    });

    const gptData = await gptRes.json();
    console.log('🧠 GPT fallback response:', JSON.stringify(gptData, null, 2));

    let reply = '';
    try {
      reply = gptData.choices?.[0]?.message?.content?.trim();
    } catch (e) {
      console.error('🛑 GPT reply extraction failed:', e);
    }

    if (!reply) {
      reply = `❓ I couldn’t find anything for: **${message}**

You can try:
• Searching by **book title**, **author name**, or **ISBN**
• Asking for **categories** like *astrology*, *Vedic studies*, or *bestsellers*

We're adding new books regularly at [Bookstaa.com](https://bookstaa.com) 📚`;
      return res.status(200).json({ type: 'text', text: reply });
    }

    // ✅ Step 4: Ask ChatGPT to extract clean keywords from user message
    const keywordRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Extract 1 to 3 short keywords from the user’s query that could help search books from a bookstore catalog. Return them as a comma-separated list. Example: "Yoga books in Hindi" → "yoga, hindi"',
          },
          { role: 'user', content: message },
        ],
        temperature: 0.5,
      }),
    });

    const keywordData = await keywordRes.json();
    const keywordStr = keywordData.choices?.[0]?.message?.content || '';
    const cleanedQuery = keywordStr.replace(/[^a-zA-Z0-9, ]/g, '').split(',')[0]?.trim();

    console.log('🔎 Extracted keyword(s):', keywordStr);

    // ✅ Step 5: Try another product search using extracted keywords
    if (cleanedQuery && cleanedQuery.length > 2) {
      const secondSearchRes = await fetch(`${baseURL}/api/search-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cleanedQuery }),
      });

      const secondSearchData = await secondSearchRes.json();

      if (secondSearchData.products && secondSearchData.products.length > 0) {
        return res.status(200).json({
          type: 'products',
          products: secondSearchData.products,
          text: reply,
        });
      }
    }

    // Final fallback — return GPT reply only
    return res.status(200).json({ type: 'text', text: reply });

  } catch (err) {
    console.error('💥 /api/chat error:', err);
    return res.status(500).json({ error: 'Chat failed', details: err.message });
  }
};
