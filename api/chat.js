// /api/chat.js

const { smartSearch } = require('../utils/smartSearch');

module.exports = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length < 1) {
      return res.status(400).json({ error: 'Empty message' });
    }

    // 🔍 Try smart product search
    const productMatches = smartSearch(message);

    if (productMatches.length > 0) {
      const productCards = productMatches.map(product => ({
        title: product.title,
        author: product.author || '',
        price: product.price || '—',
        image: product.image || '',
        url: product.url || '',
        vendor: product.vendor || '',
      }));

      return res.status(200).json({ type: 'product', products: productCards });
    }

    // 🤖 Fallback response (no GPT for now)
    const reply = await getAssistantReply(message);
    return res.status(200).json({ type: 'text', reply });

  } catch (err) {
    console.error('Chatbot error:', err);
    return res.status(500).json({ error: 'Chatbot failure' });
  }
};

// 🧠 TEMP fallback (GPT-free)
async function getAssistantReply(userInput) {
  console.log('Assistant fallback triggered for:', userInput);
  return `Hi there! You asked about: "${userInput}". Please try using a **book title**, **author name**, or **category** available on Bookstaa.com. 📚`;
}
