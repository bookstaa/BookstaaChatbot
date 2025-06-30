const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { searchBooks } = require('../lib/smartSearch');

const bookstaaData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../bookstaa-products.json'), 'utf-8')
);

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

  const isGreeting = /\b(hi|hello|hey|namaste|how are you|kya haal|you there|who are you)\b/i.test(normalized);
  const orderIntent = /\b(order status|track order|where is my order|order update)\b/i;
  const hasPriceUnder = normalized.match(/(?:under|below|less than)\s*₹?(\d+)/i);
  const maxPrice = hasPriceUnder ? parseInt(hasPriceUnder[1], 10) : null;

  // ✅ Order tracking
  if (orderIntent.test(normalized)) {
    return res.status(200).json({
      reply: `📦 To track your order, just enter your AWB or tracking number on our [Order Tracking Page](https://www.bookstaa.com/apps/order-tracking).`
    });
  }

  // ✅ Greeting without any meaningful query
  if (isGreeting && !normalized.match(/\b(book|author|track|astrology|science|isbn|title|price|recommend)\b/)) {
    return res.status(200).json({
      reply: `👋 Hello! I’m your friendly assistant from Bookstaa.\n\nI can help you:\n• Find books by title, author or subject\n• Track your order 📦\n• Browse bestsellers and categories\n\nTry: *"Show me Yoga books"* or *"Books by David Frawley"* 🔍`
    });
  }

  // ✅ Smart product search
  try {
    const results = searchBooks(normalized, maxPrice);
    if (results && results.length > 0) {
      const author = results[0].metafields?.author01?.trim();
      const intro = isGreeting
        ? `👋 Welcome back!\n\n📚 Here are some books${author ? ` by **${author}**` : ''} you may like:\n\n`
        : author
          ? `📚 Showing books by **${author}**:\n\n`
          : `📘 Here are some books you might like:\n\n`;

      const cards = results.slice(0, 10).map(p => {
        return `📘 [**${p.title}**](https://www.bookstaa.com/products/${p.handle})\n*by ${p.metafields?.author01 || p.vendor}*\n🗂️ ${p.metafields?.subcategory || ''} | 🏷️ ${p.tags?.join(', ')}\n💬 *${p.metafields?.language || ''}, ${p.metafields?.pages_in_the_book || ''} pages*\n💰 ₹${p.price}`;
      });

      return res.status(200).json({
        reply: `${intro}${cards.join('\n\n')}\n\n🛒 Browse more at [Bookstaa.com](https://www.bookstaa.com)`
      });
    }

    if (maxPrice) {
      return res.status(200).json({
        reply: `🤖 I couldn’t find books under ₹${maxPrice}, but check out [Bookstaa.com](https://www.bookstaa.com) for more options.`
      });
    }
  } catch (err) {
    console.error('Smart search error:', err.message);
  }

  // 🤖 Friendly fallback
  return res.status(200).json({
    reply: `🤖 I couldn’t find anything for that, but I’m still learning!\n\nTry asking:\n• Book by title/author (e.g. *Yoga for Beginners*)\n• Topics like *Astrology*, *History*, *Science*\n• Track order: *"Order Status"*\n\n📚 Visit [Bookstaa.com](https://www.bookstaa.com) to browse all books.`
  });
};
