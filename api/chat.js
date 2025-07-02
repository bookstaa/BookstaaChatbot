// /api/chat.js

const fetch = require('node-fetch');

module.exports = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim().length < 1) {
      return res.status(400).json({ error: 'Empty message' });
    }

    console.log('📩 Query:', message);

    // 🔍 1. Call your existing Shopify product search endpoint
    const shopifyRes = await fetch(`${process.env.BASE_URL || 'https://bookstaa-chatbot.vercel.app'}/api/search-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: message }),
    });

    const searchResult = await shopifyRes.json();

    if (searchResult.products?.length > 0) {
      return res.status(200).json({
        type: 'product',
        products: searchResult.products,
      });
    }

    // 🤖 2. Fallback if no products found
    const reply = await getAssistantReply(message);
    return res.status(200).json({ type: 'text', reply });

  } catch (err) {
    console.error('❌ Chat error:', err);
    return res.status(500).json({ error: 'Chatbot failure' });
  }
};

// 🤖 Assistant fallback when no products match
async function getAssistantReply(message) {
  console.log('💬 Assistant fallback triggered for:', message);

  // Customize tone & suggestions
  return `❓ I couldn’t find anything for: **${message}**

You can try:
• Searching by **book title**, **author name**, or **ISBN**
• Asking for **categories** like *astrology*, *Vedic studies*, or *bestsellers*

We're adding new books regularly at [Bookstaa.com](https://bookstaa.com) 📚`;
}
