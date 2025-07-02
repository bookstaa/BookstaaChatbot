// 📦 Section 0: Imports & Setup
const fetch = require('node-fetch');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 📦 Section 1: Greeting Keywords Logic
const isGreeting = (input) => {
  const greetings = [
    'hello', 'hi', 'namaste', 'how are you', 'how can you help',
    'what can you do', 'who are you', 'kya kar rahe ho', 'yo', 'hey',
    'kaise ho', 'tum kaun ho', 'can you help', 'what is this', 'bookstaa'
  ];
  const norm = input.toLowerCase().replace(/[^a-z0-9\s]/gi, '').trim();
  return greetings.some(greet => norm.includes(greet));
};

module.exports = async (req, res) => {
  try {
    // 📦 Section 2: Basic Validations & Setup
    const { message } = req.body;
    if (!message || message.length < 1) {
      return res.status(400).json({ error: 'Empty message' });
    }

    const baseURL = req.headers.origin || 'https://bookstaa.com';
    const normMsg = message.toLowerCase().trim();

    // 📦 Section 3: Handle Greeting Messages
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
                'You are Bookstaa Chatbot — a helpful, loyal assistant for an Indian bookstore. You help users discover books and answer general queries. You never recommend other websites. Always encourage the user to search by book title, author, or ISBN.',
            },
            { role: 'user', content: message },
          ],
          temperature: 0.7,
        }),
      });

      const gptData = await gptRes.json();
      const reply = gptData?.choices?.[0]?.message?.content?.trim() || `Hi there 👋 I’m your Bookstaa assistant! You can ask me about books by title, author, ISBN, or even in Hinglish.`;

      return res.status(200).json({ type: 'text', text: reply });
    }

    // 📦 Section 4: Search Products Using Shopify
    const searchRes = await fetch(`${baseURL}/api/search-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: message }),
    });

    const searchData = await searchRes.json();

    if (searchData.products?.length > 0) {
      // 📦 Section 5: GPT Intro (with Products Found)
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
              content: 'You are Bookstaa Chatbot — assist users in a concise, reader-friendly tone. Suggest books if found. Keep it short and related to query.',
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

    // 📦 Section 6: GPT Fallback Response (no products found)
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
            content: 'You are Bookstaa Chatbot. Suggest useful book-related replies when no result found. Recommend categories like astrology, yoga, or Hindi literature.',
          },
          { role: 'user', content: message },
        ],
        temperature: 0.8,
      }),
    });

    const fallbackData = await fallbackRes.json();
    let fallbackReply = fallbackData?.choices?.[0]?.message?.content?.trim() || '';

    // 📦 Section 7: GPT Keyword Extraction for Retry
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
            content: 'Extract 1-3 keywords from user query for a book search. Return in comma format like: yoga, hindi',
          },
          { role: 'user', content: message },
        ],
        temperature: 0.4,
      }),
    });

    const keywordData = await keywordRes.json();
    const keywordStr = keywordData.choices?.[0]?.message?.content || '';
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

    // 📦 Section 8: Final fallback if nothing matches
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
    // 📦 Section 9: Catch Unexpected Errors
    console.error('💥 /api/chat error:', err);
    return res.status(500).json({ error: 'Chat failed', details: err.message });
  }
};
