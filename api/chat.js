const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message input' });
    }

    // Step 1: Try fetching matching products
    const searchRes = await fetch(`${process.env.PUBLIC_SITE_URL}/api/search-products?q=${encodeURIComponent(message)}`);
    const productData = await searchRes.json();

    if (productData.products && productData.products.length > 0) {
      const productCards = productData.products.slice(0, 6).map(product => {
        return `
<div style="border:1px solid #ccc; border-radius:8px; padding:12px; margin:8px 0; display:flex; align-items:center; font-family:sans-serif;">
  <img src="${product.image}" alt="${product.altText}" style="width:60px; height:auto; margin-right:12px; border-radius:4px;" />
  <div>
    <div style="font-weight:600;">${product.title}</div>
    <div style="font-size:14px; color:#555;">by ${product.author}</div>
    <div style="color:#222; font-weight:bold; margin:4px 0;">₹${product.price}</div>
    <a href="${product.link}" target="_blank" style="color:#007aff; font-size:14px;">View on Bookstaa</a>
  </div>
</div>`;
      }).join('\n');

      return res.status(200).json({
        reply: `<div>Here are some products that match your query:</div>${productCards}<div style="margin-top:10px;">Explore more at <a href="https://www.bookstaa.com" target="_blank">Bookstaa.com</a></div>`
      });
    }

    // Step 2: Fallback to ChatGPT if no products found
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are Bookstaa's helpful assistant. Only recommend books or authors available on Bookstaa.com, based on product metadata. If no match is found, suggest the user try searching by title, author, or ISBN. Never recommend products not in Bookstaa's inventory.`
          },
          { role: 'user', content: message }
        ],
        temperature: 0.7
      })
    });

    const result = await chatResponse.json();
    const reply = result.choices?.[0]?.message?.content || 'Sorry, I could not find a matching product.';

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Chatbot error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
