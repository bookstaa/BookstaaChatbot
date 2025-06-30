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

  // 1. Try to fetch products from your search API
  try {
    const searchResponse = await fetch(`${process.env.BASE_URL || 'https://bookstaa-chatbot.vercel.app'}/api/search-products?q=${encodeURIComponent(query)}`);
    const searchData = await searchResponse.json();

    if (searchData && Array.isArray(searchData.products) && searchData.products.length > 0) {
      const cards = searchData.products.map(product => {
        return `🛒 [${product.title}](${product.link})\n*by ${product.author}*\n![${product.altText}](${product.image})\n**Price:** ₹${product.price}`;
      });

      return res.status(200).json({
        reply: `${cards.join('\n\n')}\n\nExplore more on [Bookstaa.com](https://www.bookstaa.com)`
      });
    }
  } catch (err) {
    console.error('Search error:', err.message);
    // Don't return error, proceed to fallback
  }

  // 2. If no product match, fallback to friendly GPT-like message
  const fallbackMessage = `
❓ I couldn’t find anything for that. You can try:
• Searching by **book title**, **author name**, or **ISBN**
• Asking for **categories** like “Yoga”, “Astrology”, “Kids books”
• Typing **Order Status** or **Track Order** to get help with deliveries

🔎 You can also [Track Your Order](https://www.bookstaa.com/pages/track-order)

Explore more books on [Bookstaa.com](https://www.bookstaa.com)
`;

  return res.status(200).json({
    reply: fallbackMessage.trim()
  });
};
