const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid message input' });
  }

  let query = message.trim().toLowerCase();

  // 🎯 INTENT NORMALIZATION & HUMAN-LIKE UNDERSTANDING
  const intentMap = {
    // Greetings
    'hello': 'hello', 'hi': 'hello', 'hey': 'hello', 'namaste': 'hello',
    'hello there': 'hello', 'how are you': 'hello', 'kya haal hai': 'hello', 'kaise ho': 'hello',

    // Order Tracking
    'track order': 'track-order', 'order status': 'track-order', 'where is my order': 'track-order',
    'order update': 'track-order', 'parcel status': 'track-order',

    // Categories - general
    'children books': 'children', 'kids books': 'children',
    'vedic books': 'vedic', 'yoga books': 'yoga', 'ayurveda books': 'ayurveda',
    'philosophy books': 'philosophy', 'darshan': 'philosophy',
    'natya shastra': 'natya', 'natyashastra': 'natya', 'natya': 'natya',
    'astrology books': 'astrology', 'jyotish': 'astrology',

    // Direct questions
    'what books do you have': 'list-books',
    'show me books': 'list-books', 'browse books': 'list-books',
    'recommend a book': 'recommend', 'suggest a book': 'recommend',

    // Small talk
    'who are you': 'about', 'what is bookstaa': 'about', 'tell me about you': 'about'
  };

  if (intentMap[query]) query = intentMap[query];

  // 🤖 Respond to greetings
  if (query === 'hello') {
    return res.status(200).json({
      reply: `👋 Hi! I’m your reading assistant at Bookstaa.

You can ask me to:
• Show books by title, author, or category
• Track your order 📦
• Recommend a good read 📚

Try asking:
• *"Best astrology books"*
• *"Books on Patanjali Yoga"*
• *"Where is my order"*`
    });
  }

  // 📦 Respond to order tracking intent
  if (query === 'track-order') {
    return res.status(200).json({
      reply: `📦 To track your order, please enter your AWB (tracking number) from Delhivery.

Use our tracking tool here: [Track Order](https://www.bookstaa.com/pages/track-order)`
    });
  }

  // 🧠 Respond to general inquiry about Bookstaa
  if (query === 'about') {
    return res.status(200).json({
      reply: `📚 Bookstaa is your one-stop bookstore featuring a curated selection of Indian knowledge systems — from Vedic wisdom and Yoga to Astrology, Ayurveda, Philosophy, Sanskrit literature and more.

We bring books from top publishers like Motilal Banarsidass & V&S Publishers to readers worldwide.`
    });
  }

  // 📚 If user wants to browse books or recommendations
  if (query === 'list-books' || query === 'recommend') {
    query = 'books'; // broad fallback to show some books
  }

  try {
    // 🔍 Search books using Shopify API endpoint
    const searchResponse = await fetch(`${process.env.BASE_URL || 'https://bookstaa-chatbot.vercel.app'}/api/search-products?q=${encodeURIComponent(query)}`);
    const searchData = await searchResponse.json();

    if (searchData && Array.isArray(searchData.products) && searchData.products.length > 0) {
      const cards = searchData.products.map(product => {
        return `
🛍️ [**${product.title}**](${product.link})
*by ${product.author}*
![${product.altText}](${product.image})
💰 **Price:** ₹${product.price} ${product.currency}`.trim();
      });

      return res.status(200).json({
        reply: `${cards.join('\n\n')}
\n🛒 Browse more at [Bookstaa.com](https://www.bookstaa.com)`
      });
    }

  } catch (err) {
    console.error('Search API error:', err.message);
    // Continue to fallback
  }

  // 🤷‍♂️ Fallback if nothing matched
  return res.status(200).json({
    reply: `🤖 I couldn’t find anything for that, but I’m still learning!

Here’s what you can try:
• Search by **book title**, **author name**, or **ISBN**
• Ask about categories like "Yoga", "Philosophy", "Astrology"
• Type **Order Status** to track your delivery

🔍 Or explore more books at [Bookstaa.com](https://www.bookstaa.com)`
  });
};
