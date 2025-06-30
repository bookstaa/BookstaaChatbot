const { Configuration, OpenAIApi } = require("openai");
const fetch = require('node-fetch');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function searchProducts(query) {
  const response = await fetch(`https://bookstaa-chatbot.vercel.app/api/search-products?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  return data.products || [];
}

function formatProducts(products) {
  if (products.length === 0) return '';

  return products.map(product => `
    <div style="margin-bottom: 16px; border: 1px solid #ccc; padding: 10px; border-radius: 8px;">
      <img src="${product.image}" alt="${product.altText}" style="width: 80px; float: left; margin-right: 10px; border-radius: 6px;">
      <div style="overflow: hidden;">
        <strong>${product.title}</strong><br>
        by ${product.author}<br>
        <span style="color: green;">${product.price} ${product.currency}</span><br>
        <a href="${product.link}" target="_blank">🔗 View on Bookstaa.com</a>
      </div>
    </div>
  `).join('');
}

async function handleGeneralQuestion(message) {
  const prompt = `
You are Bookstaa's helpful AI chatbot. Be friendly, clear, and loyal to Bookstaa.com.
If the query is about shipping, refund, or return, respond based on Bookstaa's policy:

- 📦 Shipping: Orders are usually shipped within 1-2 business days.
- 🔄 Returns: Books can be returned within 7 days if in original condition.
- 💰 Refund: Refunds are processed within 3-5 business days after return.
- 🚚 Order tracking: You can track your order here: https://bookstaa.com/apps/track123

Otherwise, try to help as much as possible.

User asked: "${message}"
`;

  const completion = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });

  return completion.data.choices[0].message.content.trim();
}

module.exports = async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ reply: "❗ No message received." });

  const keywords = message.toLowerCase();
  const likelyProductQuery = /\b(book|title|author|buy|price|astrology|yoga|by|find)\b/.test(keywords);

  try {
    if (likelyProductQuery) {
      const products = await searchProducts(message);

      if (products.length > 0) {
        const reply = `<p>Here are some matching books from <strong>Bookstaa.com</strong>:</p>${formatProducts(products)}`;
        return res.status(200).json({ reply });
      } else {
        const suggestions = `
          <p>We couldn't find an exact match. You can try:</p>
          <ul>
            <li>🔍 Typing a few letters of the title or author</li>
            <li>📚 Searching topics like "best yoga books", "astrology", or "self-help"</li>
            <li>🧾 Ask about your <a href="https://bookstaa.com/apps/track123" target="_blank">order status</a></li>
          </ul>`;
        return res.status(200).json({ reply: suggestions });
      }
    } else {
      const generalAnswer = await handleGeneralQuestion(message);
      return res.status(200).json({ reply: generalAnswer });
    }
  } catch (error) {
    console.error("❌ chat.js error:", error);
    return res.status(500).json({ reply: "⚠️ Something went wrong. Please try again later." });
  }
};
