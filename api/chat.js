// 📦 Section 0: Imports & Setup
const fetch = require('node-fetch');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 📦 Section 1: Greeting Detection
const isGreeting = (input) => {
  const greetings = [
    'hello', 'hi', 'namaste', 'how are you', 'how can you help',
    'what can you do', 'who are you', 'kya kar rahe ho', 'yo', 'hey',
    'kaise ho', 'tum kaun ho', 'can you help', 'what is this', 'bookstaa'
  ];
  const norm = input.toLowerCase().replace(/[^a-z0-9\s]/gi, '').trim();
  return greetings.some(g => norm.includes(g));
};

// 📦 Section 2: Hinglish Normalizer (basic map)
const normalizeHinglish = (str) => {
  const map = {
    'pustak': 'book',
    'kitabein': 'books',
    'jyotish': 'astrology',
    'vigyan': 'science',
    'veda': 'vedas',
    'sangeet': 'music',
    'bhasha': 'language',
    'prem': 'love',
    'gyan': 'knowledge',
    'adhyatma': 'spiritual',
    'dharm': 'religion'
  };
  const norm = str.toLowerCase();
  let replaced = norm;
  for (const [k, v] of Object.entries(map)) {
    replaced = replaced.replace(new RegExp(`\\b${k}\\b`, 'gi'), v);
  }
  return replaced;
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

    // 📦 Section 4: Search Products via Shopify API
    const searchRes = await fetch(`${baseURL}/api/search-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: normMsg }),
    });

    const searchData = await searchRes.json();

    if (searchData.products?.length > 0) {
      const gptReplyRes = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: 'You are Bookstaa Chatbot. Respond short, polite, and helpful. Suggest books relevant to query and available in Bookstaa inventory only.',
            },
            { role: 'user', content: message },
          ],
          temperature: 0.6,
        }),
      });

      const gptReplyData = await gptReplyRes.json();
      const reply = gptReplyData?.choices?.[0]?.message?.content?.trim() || '';

      return res.status(200).json({
        type: 'products',
        text: reply,
        products: searchData.products,
      });
    }

    // 📦 Section 5: GPT Fallback (if no results from Bookstaa inventory)
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
            content: `You are Bookstaa Chatbot. When no product is found, respond with:
- Polite tone
- Do not recommend books not sold on Bookstaa
- Encourage retry with better keywords
- Mention example genres: astrology, yoga, Hindi literature`,
          },
          { role: 'user', content: message },
        ],
        temperature: 0.8,
      }),
    });

    const fallbackData = await fallbackRes.json();
    let fallbackReply = fallbackData?.choices?.[0]?.message?.content?.trim() || '';

    // 📦 Section 6: GPT Keyword Retry Extraction
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
            content: 'Extract 1-2 keywords for a book query from user input. Return as comma-separated string like: vedas, astrology',
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
        return res.status(200).json({
          type: 'products',
          text: fallbackReply,
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
• **ISBN** or category like *astrology*

📩 Still need help? Email [feedback@bookstaa.com](mailto:feedback@bookstaa.com) ✉️`;
    }

    return res.status(200).json({ type: 'text', text: fallbackReply });

  } catch (err) {
    console.error('💥 /api/chat error:', err);
    return res.status(500).json({ error: 'Chat failed', details: err.message });
  }
};
