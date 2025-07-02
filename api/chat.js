// --- START: Imports & Setup ---
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { searchBooks } = require('../lib/smartSearch'); // Your custom product matcher

const bookstaaData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../bookstaa-products.json'), 'utf-8')
);
// --- END: Imports & Setup ---

// --- START: Main Handler ---
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

  // --- START: Intent Detection ---
  const isGreeting = /\b(hi|hello|hey|namaste|namaskar|you there|how are you|kaise ho|kya haal|who are you)\b/i.test(normalized);
  const orderIntent = /\b(order status|track order|where is my order|order update|mera order|mera parcel)\b/i;
  const hasPriceUnder = normalized.match(/(?:under|below|less than)\s*₹?(\d+)/i);
  const maxPrice = hasPriceUnder ? parseInt(hasPriceUnder[1], 10) : null;
  // --- END: Intent Detection ---

  // --- START: Order Support ---
  if (orderIntent.test(normalized)) {
    return res.status(200).json({
      reply: `📦 To track your Bookstaa order, please visit our [Order Tracking Page](https://www.bookstaa.com/apps/order-tracking).\n\nYou'll need your *Order ID* and *phone number*.`
    });
  }
  // --- END: Order Support ---

  // --- START: Greeting / Welcome ---
  if (isGreeting && !normalized.match(/\b(book|author|track|astrology|science|isbn|title|price|recommend)\b/)) {
    return res.status(200).json({
      reply: `👋 Hello! Welcome to Bookstaa.\n\nI can help you:\n• Find books by title, author or ISBN\n• Track your order 📦\n• Discover books on Astrology, Yoga, History, and more\n\nTry: *"Show me Gita books"* or *"Books by Osho"* 🔍`
    });
  }
  // --- END: Greeting / Welcome ---

  // --- START: Smart Product Search ---
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
        return `📘 [**${p.title}**](https://www.bookstaa.com/products/${p.handle})\n*by ${p.metafields?.author01 || p.vendor}*\n🏷️ ${p.tags?.join(', ')}\n💬 ${p.metafields?.language || ''}, ${p.metafields?.pages_in_the_book || ''} pages\n💰 ₹${p.price}`;
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
  // --- END: Smart Product Search ---

  // --- START: Fallback Reply ---
  return res.status(200).json({
    reply: `🤖 I couldn’t find anything for that — I'm still learning!\n\nYou can try:\n• 📚 *"Books on Yoga or Astrology"*\n• ✍️ *"Books by Swami Sivananda"*\n• 🔍 *"Search by ISBN: 978..."*\n• 📦 *"Track order"*\n\nIf you need help, email us at [feedback@bookstaa.com](mailto:feedback@bookstaa.com)`
  });
  // --- END: Fallback Reply ---
};
// --- END: Main Handler ---
