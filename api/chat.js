const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid message input' });
  }

  const query = message.trim().toLowerCase();

  // ✨ Section: Handle friendly greetings
  const greetings = ['hi', 'hello', 'hey', 'namaste', 'hello there', 'hi there'];
  if (greetings.some(g => query.includes(g))) {
    return res.status(200).json({
      reply: `👋 Hello! I’m your friendly reading assistant from Bookstaa.\n\nI’m here to help you find books, authors, topics — or even track your orders.\n\nTry asking:\n• *"Show me Yoga books"* 🧘‍♂️\n• *"Track my order"* 📦\n• *"Best astrology books"* 🔮`
    });
  }

  // 📦 Section: Handle order tracking queries
  const orderKeywords = ['track order', 'order status', 'where is my order', 'track my parcel'];
  if (orderKeywords.some(k => query.includes(k))) {
    return res.status(200).json({
      reply: `📦 To track your order, please enter your AWB number from Delhivery.\n\nUse our tracking tool at [Bookstaa Order Tracking](https://www.bookstaa.com/pages/track-order).\n\nNeed help? Just let me know!`
    });
  }

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
        reply: `${cards.join('\n\n')}\n\n🛒 Explore more at [Bookstaa.com](https://www.bookstaa.com)`
      });
    }

  } catch (err) {
    console.error('Search API error:', err.message);
    // Do not block fallback
  }

  // 🧠 Friendly fallback if no product match
  return res.status(200).json({
    reply: `
🤖 I couldn't find an exact match for that, but I’m here to help!

Here’s what you can try:
• Search by **book title**, **author name**, or **ISBN**
• Ask for topics like “Yoga”, “Astrology”, or “Children’s books”
• Type **Order Status** or **Track Order** to get delivery updates

🔍 Or just explore more books at [Bookstaa.com](https://www.bookstaa.com) — there’s something for everyone!
    `.trim()
  });
};
