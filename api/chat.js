const fetch = require('node-fetch');

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const STORE_API_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN_KEY;

async function fetchMatchingProducts(query) {
  try {
    const response = await fetch(`${process.env.VERCEL_URL}/api/search-products?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

function formatProductCard(product) {
  return `
<div style="border:1px solid #ddd;padding:10px;margin:10px 0;border-radius:8px;display:flex;gap:12px;align-items:center;">
  <img src="${product.image}" alt="${product.altText}" style="width:80px;height:auto;border-radius:4px;" />
  <div>
    <a href="${product.link}" target="_blank" style="font-weight:bold;font-size:16px;color:#1a73e8;text-decoration:none;">
      ${product.title}
    </a>
    <div style="color:#555;margin:4px 0;">by ${product.author}</div>
    <div style="color:#000;font-weight:bold;">₹${product.price}</div>
  </div>
</div>
  `.trim();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message missing in request body' });
  }

  try {
    const matchedProducts = await fetchMatchingProducts(message);

    if (matchedProducts.length > 0) {
      const cards = matchedProducts
        .slice(0, 6)
        .map(formatProductCard)
        .join('\n');
      return res.status(200).json({ reply: `Here are some books you might like:\n${cards}` });
    }

    // No match — fallback to natural reply but still only reference Bookstaa content
    const aiReply = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are Bookstaa's friendly and intelligent chatbot. You help customers find books, authors, or categories from the Bookstaa.com inventory.
Try to match queries to titles, authors, tags, collections, and metadata.
If no match is found, politely suggest customers search by title, author name, or ISBN.
Do not recommend books or authors that are not available on Bookstaa.com.
Always end with: Explore more on https://www.bookstaa.com.`,
          },
          { role: "user", content: message },
        ],
        temperature: 0.5,
      }),
    });

    const result = await aiReply.json();
    const finalText = result?.choices?.[0]?.message?.content || "I'm sorry, I couldn't find anything relevant.";
    return res.status(200).json({ reply: finalText });

  } catch (error) {
    console.error("Error in chat handler:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
