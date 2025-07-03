// 📦 Section 0: Imports & Setup
const fetch = require('node-fetch');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 📦 Section 1: Greeting Detection
const isGreeting = (input) => {
  const greetings = ['hello', 'hi', 'namaste', 'yo', 'hey', 'bookstaa'];
  const norm = input.toLowerCase().replace(/[^a-z0-9\s]/gi, '').trim();
  return greetings.includes(norm);
};

// 📦 Section 2: Hinglish Normalizer
const normalizeHinglish = (str) => {
  const map = {
    'pustak': 'book', 'kitabein': 'books', 'jyotish': 'astrology',
    'vigyan': 'science', 'veda': 'vedas', 'sangeet': 'music',
    'bhasha': 'language', 'prem': 'love', 'gyan': 'knowledge',
    'adhyatma': 'spiritual', 'dharm': 'religion'
  };
  let norm = str.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    norm = norm.replace(new RegExp(`\\b${k}\\b`, 'gi'), v);
  }
  return norm;
};

module.exports = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.length < 1) {
      return res.status(400).json({ error: 'Empty message' });
    }

    const baseURL = req.headers.origin || 'https://bookstaa.com';
    const normMsg = normalizeHinglish(message.toLowerCase().trim());

    // 📦 Section 3: Handle Greeting
    if (isGreeting(normMsg)) {
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
                'You are Bookstaa Chatbot — a friendly assistant for an Indian online bookstore. Greet warmly, suggest user to search by book title, author, ISBN, or category like astrology or yoga. Do not recommend books outside Bookstaa.',
            },
            { role: 'user', content: message },
          ],
          temperature: 0.7,
        }),
      });

      const gptData = await gptRes.json();
      const reply = gptData?.choices?.[0]?.message?.content?.trim() || `Hi there 👋 Welcome to Bookstaa! You can search by book title, author, or category like *yoga*, *astrology*, or *Hindi literature*.`;

      return res.status(200).json({ type: 'text', text: reply });
    }

    // 📦 Section 4: Product Search via API
    const searchRes = await fetch(`${baseURL}/api/search-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: normMsg }),
    });

    const searchData = await searchRes.json();

    // ✅ Products Found
    if (searchData.products?.length > 0) {
      const topProducts = searchData.products.slice(0, 5);
      const summaryTitles = topProducts.map(p => `*${p.title}*`).join(', ');
      const reply = `📚 Based on your interest in **"${message}"**, here are some books you might like: ${summaryTitles}.\nLet me know if you'd like more info on any of them!`;

      return res.status(200).json({
        type: 'products',
        text: reply,
        products: searchData.products,
      });
    }

    // 📦 Section 5: GPT Fallback (no products found)
    const fallbackRes = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are Bookstaa Chatbot. No products were found. Respond politely. Don't mention other stores. Encourage retry with better keywords like title, author, or categories like astrology, yoga, Hindi literature.`,
          },
          { role: 'user', content: message },
        ],
        temperature: 0.8,
      }),
    });

    const fallbackData = await fallbackRes.json();
    let fallbackReply = fallbackData?.choices?.[0]?.message?.content?.trim() || '';

    // 📦 Section 6: Extract Keywords to Retry
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
            content: 'Extract 1-2 keywords for a book query from user input. Return as: astrology, hindi',
          },
          { role: 'user', content: message },
        ],
        temperature: 0.4,
      }),
    });

    const keywordData = await keywordRes.json();
    const keywordStr = keywordData?.choices?.[0]?.message?.content || '';
    const keyword = keywordStr.replace(/[^a-zA-Z0-9, ]/g, '').split(',')[0]?.trim();

    if (keyword && keyword.length > 2) {
      const secondRes = await fetch(`${baseURL}/api/search-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: keyword }),
      });

      const secondData = await secondRes.json();
      if (secondData.products?.length > 0) {
        const retryReply = `🔍 Based on your interest in **"${keyword}"**, here are some books you might like:`;
        return res.status(200).json({
          type: 'products',
          text: retryReply,
          products: secondData.products,
        });
      }
    }

    // 📦 Section 7: Final Fallback
    if (!fallbackReply) {
      fallbackReply = `❓ I couldn’t find anything for **${message}**.

Try searching by:
• Book **title** (e.g. "Bhagavad Gita")
• **Author name** (e.g. "Devdutt Pattanaik")
• **ISBN** or categories like *astrology*, *yoga*, *Hindi literature*

📩 Still need help? Email [feedback@bookstaa.com](mailto:feedback@bookstaa.com) ✉️`;
    }

    return res.status(200).json({ type: 'text', text: fallbackReply });

  } catch (err) {
    console.error('💥 /api/chat error:', err);
    return res.status(500).json({ error: 'Chat failed', details: err.message });
  }
};
