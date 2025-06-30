const fetch = require('node-fetch');

// Helper: Detect if user is asking about an order
function isOrderQuery(message) {
  return /(?:track|order|status|#bkst)/i.test(message);
}

// Helper: Search Shopify via internal endpoint
async function fetchProducts(query) {
  const res = await fetch(`https://bookstaa-chatbot.vercel.app/api/search-products?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  return data.products || [];
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message missing in request body' });

  const isTracking = isOrderQuery(message);
  if (isTracking) {
    return res.status(200).json({
      reply: `📦 It looks like you're asking about your order. You can track it instantly [here](https://www.bookstaa.com/pages/track-order). Just enter your AWB or Order Number like **#BKST12345AA**. For further help, email [support@bookstaa.com](mailto:support@bookstaa.com).`
    });
  }

  // Try fetching matching products
  const matchedProducts = await fetchProducts(message);

  if (matchedProducts.length > 0) {
    const productCards = matchedProducts.slice(0, 6).map(product => {
      return `
🛍️ [**${product.title}**](${product.link})  
by ${product.author} — ₹${product.price}
![${product.altText}](${product.image})
`;
    }).join('\n\n');

    return res.status(200).json({
      reply: `Here are some books that might interest you:\n\n${productCards}\n\nExplore more on [Bookstaa.com](https://www.bookstaa.com).`
    });
  }

  // Fallback to ChatGPT if nothing matches
  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are Bookstaa.com's AI assistant. Be friendly, concise, and helpful. If no product is found, suggest categories, authors, or links to explore. Stay loyal to Bookstaa and always end with [Bookstaa.com](https://www.bookstaa.com)."
          },
          { role: "user", content: message }
        ],
        temperature: 0.7,
      })
    });

    const openaiData = await openaiRes.json();
    const reply = openaiData.choices?.[0]?.message?.content || "I'm sorry, I couldn't find anything helpful.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("❌ OpenAI API error:", err);
    return res.status(500).json({ error: 'OpenAI request failed' });
  }
};
