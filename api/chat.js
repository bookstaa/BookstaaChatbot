const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid message input' });
  }

  const query = message.trim();

  // 🔧 NEW SECTION: Handle friendly human conversations like greetings
  const isGreeting = /^(hi|hello|hey|how are you|bye|goodbye|thanks?)$/i.test(query);
  if (isGreeting) {
    return res.status(200).json({
      reply: `👋 Hello! I’m your friendly Bookstaa assistant.\n\nAsk me anything about books, categories, or even order updates. You can say things like:\n• "Show me Yoga books"\n• "Best astrology titles"\n• "Track my order"`
    });
  }
  // 🔧 END NEW SECTION

  try {
    // 🔍 Try fuzzy product search via search-products.js
    const searchResponse = await fetch(`${process.env.BASE_URL || 'https://bookstaa-chatbot.vercel.app'}/api/search-products?q=${encodeURIComponent(query)}`);
    const searchData = await searchResponse.json();

    if (searchData && Array.isArray(searchData.products) && searchData.products.length > 0) {
      const cards = searchData.products.map(product => {
        return `
🛍️ [**${product.title}**](${product.link})
*by ${product.author}*
![${product.altText}](${product.image})
💰 **Price:** ₹${product.price} ${product.currency}
        `.trim();
      });

      return res.status(200).json({
        reply: `${cards.join('\n\n')}\n\n🛒 Browse more on [Bookstaa.com](https://www.bookstaa.com)`
      });
    }

  } catch (err) {
    console.error('Search API error:', err.message);
    // Don’t block fallback
  }

  // 🧠 Friendly fallback if no product match
  const fallbackMessage = `
🤖 I couldn't find an exact match for that, but here’s how I can help:
• Search by **book title**, **author name**, or **ISBN**
• Ask for **categories** like “Yoga”, “Astrology”, “Kids books”
• Type **Order Status** or **Track Order** to get delivery help

📚 Explore more books on [Bookstaa.com](https://www.bookstaa.com)
`;

  return res.status(200).json({
    reply: fallbackMessage.trim()
  });
};
