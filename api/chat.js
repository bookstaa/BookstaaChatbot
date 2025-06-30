const fetch = require("node-fetch");

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message missing or invalid' });
  }

  const systemPrompt = `
You are Bookstaa's friendly and intelligent chatbot. You help customers discover books, authors, topics, or categories from Bookstaa.com. Before replying, first try to match the query with actual store data using the following methods:

- Search by product title, author, or tag (even partial match, 3+ characters)
- Search by ISBN
- Match metadata like categories or genres if available
- Suggest books from similar collections if no exact match is found

If the user asks about:
- Order tracking or order status: Ask for their order number or AWB
- Shipping/refund/cancellation policy: Provide helpful static info or redirect to the correct page

Do not recommend authors or books that are not available in Bookstaa's store. Never hallucinate products. If no match is found, offer a friendly fallback with suggestions on what to search (e.g., title, author, ISBN, order status, etc.).

Always end by suggesting: 'Explore more on https://www.bookstaa.com'
`.trim();

  try {
    // First try product search
    const productSearchRes = await fetch(`https://bookstaa-chatbot.vercel.app/api/search-products?q=${encodeURIComponent(message)}`);
    const productSearchData = await productSearchRes.json();

    if (productSearchData && productSearchData.products && productSearchData.products.length > 0) {
      const productCards = productSearchData.products.slice(0, 5).map(product => {
        return `📘 *${product.title}*\nAuthor: ${product.author}\nPrice: ₹${product.price}\n[View on Bookstaa](${product.link})\n`;
      }).join('\n');

      return res.status(200).json({
        reply: `Here are some books we found for you:\n\n${productCards}\nExplore more at [Bookstaa.com](https://www.bookstaa.com)`
      });
    }

    // Fallback to OpenAI Chat Completion
    const openAIRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7
      })
    });

    const openAIData = await openAIRes.json();

    if (openAIData && openAIData.choices && openAIData.choices.length > 0) {
      const assistantReply = openAIData.choices[0].message.content;
      return res.status(200).json({ reply: assistantReply });
    } else {
      throw new Error("No reply from OpenAI");
    }

  } catch (err) {
    console.error("🔥 Chatbot error:", err);
    return res.status(500).json({
      error: "Bookstaa Assistant ran into a hiccup. Please try again shortly."
    });
  }
};
