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

  try {
    // 1. Try fuzzy product search
    const searchResponse = await fetch(`${process.env.BASE_URL || 'https://bookstaa-chatbot.vercel.app'}/api/search-products?q=${encodeURIComponent(query)}`);
    const searchData = await searchResponse.json();

    if (searchData && Array.isArray(searchData.products) && searchData.products.length > 0) {
      // Format product results as card-style output
      const cards = searchData.products.map(product => {
        return `
<div style="border:1px solid #ccc; border-radius:8px; padding:10px; margin-bottom:10px; max-width:320px;">
  <a href="${product.link}" target="_blank" style="text-decoration:none; color:inherit;">
    <img src="${product.image}" alt="${product.altText}" style="width:100%; max-height:180px; object-fit:contain; border-radius:4px;" />
    <h4 style="margin:10px 0 5px 0;">${product.title}</h4>
    <p style="margin:0; font-size:14px; color:#555;">by ${product.author}</p>
    <p style="margin:5px 0; font-weight:bold;">₹${product.price} ${product.currency}</p>
  </a>
</div>
        `;
      });

      return res.status(200).json({
        reply: `
🛍️ Here are some results matching **"${query}"**:

${cards.join('\n')}

🔎 You can also [Track Your Order](https://www.bookstaa.com/pages/track-order)  
Explore more at [Bookstaa.com](https://www.bookstaa.com)
        `.trim()
      });
    }

  } catch (err) {
    console.error('Search API error:', err.message);
    // continue to fallback
  }

  // 2. Fallback response
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
