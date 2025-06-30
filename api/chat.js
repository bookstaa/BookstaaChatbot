const fetch = require('node-fetch');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_API_KEY = process.env.SHOPIFY_STOREFRONT_API_KEY;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    // 🔍 Step 1: Try product search first
    const productRes = await fetch(
      `https://${req.headers.host}/api/search-products?q=${encodeURIComponent(message)}`
    );
    const productData = await productRes.json();

    if (productData.products && productData.products.length > 0) {
      const cardsHtml = productData.products.map(product => `
        <div class="product-card">
          <img src="${product.image}" alt="${product.altText || 'Book cover'}" class="product-img"/>
          <div class="product-details">
            <a href="${product.link}" target="_blank" class="product-title">${product.title}</a>
            <div class="product-author">by ${product.author}</div>
            <div class="product-price">${product.currency} ${product.price}</div>
          </div>
        </div>
      `).join('');
      return res.status(200).json({ reply: cardsHtml });
    }

    // 📦 Step 2: Handle known keywords (order, tracking, refund, etc.)
    const lower = message.toLowerCase();
    if (lower.includes("order") || lower.includes("track") || lower.includes("shipping") || lower.includes("refund")) {
      const fallback = `
        🧾 If you're looking to track your order or view shipping/refund policy, please visit:<br>
        <a href="https://www.bookstaa.com/pages/track-order" target="_blank">📦 Track Your Order</a><br>
        <a href="https://www.bookstaa.com/pages/shipping-policy" target="_blank">🚚 Shipping Policy</a><br>
        <a href="https://www.bookstaa.com/pages/refund-policy" target="_blank">💸 Refund Policy</a><br><br>
        Explore more on <a href="https://www.bookstaa.com" target="_blank">Bookstaa.com</a>
      `;
      return res.status(200).json({ reply: fallback });
    }

    // 💬 Step 3: Fallback to ChatGPT for natural queries
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `
You are Bookstaa's friendly and intelligent chatbot. You help customers find books, authors, or categories from the Bookstaa.com inventory. 
First, try to match user queries to the store’s product titles, authors, tags, and collections using Shopify access.
If no exact match, suggest related categories based on product tags or first 3–5 characters. 
NEVER recommend books or authors not available on Bookstaa. 
Always guide users to search by book title, author name, genre, or ISBN.
Always end with: "Explore more on https://www.bookstaa.com"
            `.trim()
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    return res.status(200).json({
      reply: (reply || `❓ I couldn’t find anything. You can try:
- Searching by title (e.g., “Yoga for Beginners”)
- Author name (e.g., “David Frawley”)
- Or [Track Your Order](https://www.bookstaa.com/pages/track-order)<br><br>
Explore more on https://www.bookstaa.com`)
    });

  } catch (err) {
    console.error('❌ Chatbot error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
