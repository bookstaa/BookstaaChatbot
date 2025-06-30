const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { searchBooks } = require('../lib/smartSearch');

// ✅ Load enriched product data at startup
const bookstaaData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../bookstaa-products.json'), 'utf-8')
);

// ✅ Bookstaa Chatbot Handler — Smarter, Intent-Aware, and Human-like
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid message input' });
  }

  const query = message.trim();
  const normalized = query.toLowerCase();

  // ✅ GREETING INTENT DETECTION
  const isGreeting = /\b(hi|hello|hey|namaste|how are you|kya haal|hello there)\b/i.test(normalized);
  if (isGreeting) {
    return res.status(200).json({
      reply: `👋 Hello! I’m your friendly reading assistant from Bookstaa.\n\nI’m here to help you find books, authors, topics — or even track your orders.\n\nTry asking:\n• *\"Show me Yoga books\"* 🧘‍♂️\n• *\"Track my order\"* 📦\n• *\"Best astrology books\"* 🔮`
    });
  }

  // ✅ INTENT: ORDER TRACKING
  const orderIntent = /\b(order status|track order|where is my order|order update)\b/i;
  if (orderIntent.test(normalized)) {
    return res.status(200).json({
      reply: `📦 To track your order, just enter your AWB or tracking number on our [Order Tracking Page](https://www.bookstaa.com/apps/order-tracking).`
    });
  }

  // ✅ Extract keywords for fuzzy matching
  const hasPriceUnder = normalized.match(/(?:under|below|less than)\s*₹?(\d+)/i);
  const maxPrice = hasPriceUnder ? parseInt(hasPriceUnder[1], 10) : null;

  try {
    // ✅ Use smart fuzzy search from local product JSON
    const results = searchBooks(normalized, maxPrice);
    const matchedAuthor = results.length > 0 && results[0].metafields?.author01;
const uniqueAuthor = matchedAuthor ? results[0].metafields.author01 : null;


    if (results && results.length > 0) {
      const cards = results.slice(0, 10).map(p => {
        return `📘 [**${p.title}**](https://www.bookstaa.com/products/${p.handle})\n*by ${p.metafields?.author01 || p.vendor}*\n🗂️ ${p.metafields?.subcategory || ''} | 🏷️ ${p.tags?.join(', ')}\n💬 *${p.metafields?.language || ''}, ${p.metafields?.pages_in_the_book || ''} pages*\n💰 ₹${p.price}`;
      });

     let intro = '';
if (uniqueAuthor) {
  intro = `📚 Showing books by **${uniqueAuthor}**:\n\n`;
} else {
  intro = `📘 Here are some books you might like:\n\n`;
}

return res.status(200).json({
  reply: `${intro}${cards.join('\n\n')}\n\n🛒 Browse more at [Bookstaa.com](https://www.bookstaa.com)`
});

    }

    if (maxPrice) {
      return res.status(200).json({
        reply: `🤖 I couldn’t find books under ₹${maxPrice}, but you can try browsing [Bookstaa.com](https://www.bookstaa.com) for a wider range of books.`
      });
    }
  } catch (err) {
    console.error('Smart search error:', err.message);
  }

  // 🤖 Friendly fallback if nothing matched
  const fallbackReply = `
🤖 I couldn’t find anything for that, but I’m still learning!

Here’s what you can try:
• Search by **book title**, **author name**, or **ISBN**
• Ask about categories like \"Yoga\", \"Philosophy\", \"Astrology\"
• Type **Order Status** to track your delivery

🔍 Or explore more books at [Bookstaa.com](https://www.bookstaa.com)`;

  return res.status(200).json({ reply: fallbackReply });
};
