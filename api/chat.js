const fetch = require('node-fetch');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ✅ Detect greetings
const isGreeting = (input) => {
  const greetings = [
    'hello', 'hi', 'namaste', 'how are you', 'how can you help',
    'what can you do', 'who are you', 'kya kar rahe ho', 'yo', 'hey',
    'kaise ho', 'tum kaun ho', 'can you help', 'what is this', 'bookstaa'
  ];
  const norm = input.toLowerCase();
  return greetings.some(greet => norm.includes(greet));
};

module.exports = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.length < 1) {
      return res.status(400).json({ error: 'Empty message' });
    }

    const baseURL = req.headers.origin || 'https://bookstaa.com';

    // Step 1: If greeting or general query — go straight to ChatGPT
if (isGreeting(message)) {
  try {
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
        temperature: 0.8,
      }),
    });

    const gptData = await gptRes.json();
    const reply = gptData?.choices?.[0]?.message?.content?.trim();

    if (reply) {
      return res.status(200).json({ type: 'text', text: reply });
    } else {
      console.error('⚠️ No reply from GPT:', gptData);
      return res.status(200).json({
        type: 'text',
        text: `Hi there 👋 I’m your Bookstaa assistant! You can ask me about books by title, author, ISBN, or even ask in Hinglish.`,
      });
    }
  } catch (e) {
    console.error('💥 GPT greeting fail:', e);
    return res.status(200).json({
      type: 'text',
      text: `Hi 👋 I’m Bookstaa assistant. How can I help you discover books today?`,
    });
  }
}



    // 2️⃣ PRIMARY SEARCH
    const searchRes = await fetch(`${baseURL}/api/search-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: message })
    });

    const searchData = await searchRes.json();
    if (searchData.products && searchData.products.length > 0) {
      // Optional GPT reply to accompany product cards
      const gptReplyRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are Bookstaa Chatbot — assist users in a concise, reader-friendly tone. Suggest books if found. Keep it short and related to query.'
            },
            { role: 'user', content: message }
          ],
          temperature: 0.6
        })
      });

      const gptReplyData = await gptReplyRes.json();
      const softReply = gptReplyData.choices?.[0]?.message?.content?.trim() || '';

      return res.status(200).json({
        type: 'products',
        text: softReply,
        products: searchData.products
      });
    }

    // 3️⃣ GPT fallback natural language response
    const fallbackGPT = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are Bookstaa Chatbot. Suggest useful book-related replies when no result found. Recommend categories like astrology, yoga, or Hindi literature.'
          },
          { role: 'user', content: message }
        ],
        temperature: 0.8
      })
    });

    const gptData = await fallbackGPT.json();
    let reply = gptData.choices?.[0]?.message?.content?.trim() || '';

    // 4️⃣ Extract keywords to retry product search
    const keywordGPT = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Extract 1-3 keywords from user query for a book search. Return in comma format like: yoga, hindi'
          },
          { role: 'user', content: message }
        ],
        temperature: 0.4
      })
    });

    const keywordData = await keywordGPT.json();
    const keywordStr = keywordData.choices?.[0]?.message?.content || '';
    const cleaned = keywordStr.replace(/[^a-zA-Z0-9, ]/g, '').split(',')[0]?.trim();

    // 5️⃣ SECONDARY SEARCH using keywords
    if (cleaned && cleaned.length > 2) {
      const secondSearch = await fetch(`${baseURL}/api/search-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cleaned })
      });

      const secondData = await secondSearch.json();
      if (secondData.products && secondData.products.length > 0) {
        return res.status(200).json({
          type: 'products',
          text: reply,
          products: secondData.products
        });
      }
    }

    // 6️⃣ Final fallback
    if (!reply) {
      reply = `❓ I couldn’t find anything for **${message}**.

Try searching by:
• Book **title** (e.g. "Bhagavad Gita")
• **Author name** (e.g. "Devdutt Pattanaik")
• **ISBN** or category like *astrology*

Still need help? Email [feedback@bookstaa.com](mailto:feedback@bookstaa.com) ✉️`;
    }

    return res.status(200).json({
      type: 'text',
      text: reply
    });

  } catch (err) {
    console.error('💥 /api/chat error:', err);
    return res.status(500).json({ error: 'Chat failed', details: err.message });
  }
};
