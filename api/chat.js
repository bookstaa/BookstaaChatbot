const fetch = require('node-fetch');

// ✅ Bookstaa Chatbot Handler — Smarter, Intent-Aware, and Human-like with OpenAI fallback
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
    // 📦 Call enhanced product search API
    const searchParams = new URLSearchParams({ q: query });
    if (maxPrice) searchParams.append('maxPrice', maxPrice);

    const response = await fetch(`${process.env.BASE_URL || 'https://bookstaa-chatbot.vercel.app'}/api/search-products?${searchParams}`);
    const data = await response.json();

    if (data && data.products && data.products.length > 0) {
      const cards = data.products.map(p => {
        return `🛍️ [**${p.title}**](${p.link})\n*by ${p.author}*\n![${p.altText}](${p.image})\n💰 **Price:** ₹${p.price} ${p.currency}`;
      });

      return res.status(200).json({
        reply: `${cards.join('\n\n')}\n\n🛒 Browse more on [Bookstaa.com](https://www.bookstaa.com)`
      });
    }

    // 🔁 Fallback: if no result but query is price-specific
    if (maxPrice) {
      return res.status(200).json({
        reply: `🤖 I couldn’t find books under ₹${maxPrice}, but you can try browsing [Bookstaa.com](https://www.bookstaa.com) for a wider range of books.`
      });
    }

    // 🧠 Final fallback — Ask OpenAI to respond as Bookstaa’s assistant
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are Bookstaa’s helpful reading assistant. You ONLY respond based on Bookstaa’s book catalog, store info, order policies, and product data. Always be warm, clear, and helpful. Avoid recommending unavailable items. If a query is vague, ask politely for more info.`
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.7
      })
    });

    const openaiData = await openaiResponse.json();
    const assistantReply = openaiData?.choices?.[0]?.message?.content;

    if (assistantReply) {
      return res.status(200).json({ reply: assistantReply });
    }

  } catch (err) {
    console.error('Search API or OpenAI error:', err.message);
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
