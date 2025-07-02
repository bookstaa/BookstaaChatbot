const fetch = require('node-fetch');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Keywords to detect general or greeting queries
const isGreeting = (input) => {
  const greetings = [
    'hello', 'hi', 'namaste', 'how are you', 'how can you help',
    'what can you do', 'who are you', 'kya kar rahe ho', 'yo', 'hey',
    'kaise ho', 'tum kaun ho', 'can you help', 'what is this', 'bookstaa',
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
      const reply = gptData.choices?.[0]?.message?.content?.trim() || `Hi there 👋 I’m your Bookstaa assistant! You can ask me about books by title, author, ISBN, or even ask in Hinglish.`;

      return res.status(200).json({ type: 'text', text: reply });
    }

    // Step 2: Primary product search using original message
    const initialSearchRes = await fetch(`${baseURL}/api/search-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: message }),
    });
    const initialSearchData = await initialSearchRes.json();

    // Step 3: If products found on first try — return products immediately
    if (initialSearchData.products && initialSearchData.products.length > 0) {
      return res.status(200).json({
        type: 'products',
        products: initialSearchData.products,
      });
    }

    // Step 4: Ask GPT for fallback natural language reply
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
    }

    // Step 5: Ask GPT to extract keyword(s)
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

    // Step 6: Secondary product search using cleaned keyword
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
          text: reply,
          products: secondSearchData.products,
        });
      }
    }

    // Step 7: Fallback to GPT reply only
    return res.status(200).json({ type: 'text', text: reply });

  } catch (err) {
    console.error('💥 /api/chat error:', err);
    return res.status(500).json({ error: 'Chat failed', details: err.message });
  }
};
