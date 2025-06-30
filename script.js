console.log("📘 script.js loaded");

async function sendMessage() {
  const input = document.getElementById('user-input');
  const chatBox = document.getElementById('chat-box');
  const userMessage = input.value.trim();
  if (!userMessage) return;

  // Show user message in chat
  const userDiv = document.createElement('div');
  userDiv.className = 'user';
  userDiv.textContent = userMessage;
  chatBox.appendChild(userDiv);
  input.value = '';

  // Show typing indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'bot loading';
  loadingDiv.textContent = 'Bookstaa is thinking...';
  chatBox.appendChild(loadingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Try searching for products first
  try {
    const productRes = await fetch(`/api/search-products?q=${encodeURIComponent(userMessage)}`);
    const productData = await productRes.json();

    chatBox.removeChild(loadingDiv); // remove loader

    if (productData.products && productData.products.length > 0) {
      renderProductCards(productData.products);
      return; // Skip GPT fallback
    }
  } catch (err) {
    console.warn('🔍 Product search failed:', err);
    chatBox.removeChild(loadingDiv); // remove loader
  }

  // If no products found, use ChatGPT fallback
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage })
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Invalid response from chatbot');
    }

    const data = await response.json();
    const botReply = data.reply || `
      ❓ I couldn’t find anything for that. You can try:
      • Searching by category (e.g. “Yoga”, “Astrology”)<br>
      • Author name (e.g. “David Frawley”)<br>
      • [Track Your Order](https://www.bookstaa.com/pages/track-order)
    `;

    const botDiv = document.createElement('div');
    botDiv.className = 'bot';
    botDiv.innerHTML = botReply.replace(/\n/g, "<br>");
    chatBox.appendChild(botDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

  } catch (error) {
    chatBox.removeChild(loadingDiv);
    const errDiv = document.createElement('div');
    errDiv.className = 'bot';
    errDiv.innerHTML = `❌ Sorry, there was an error responding.<br><br>Try asking differently or <a href="https://www.bookstaa.com/pages/contact-us" target="_blank">contact support</a>.`;
    chatBox.appendChild(errDiv);
  }
}

// Render matching products as cards
function renderProductCards(products) {
  const chatBox = document.getElementById('chat-box');
  products.forEach(product => {
    const botDiv = document.createElement('div');
    botDiv.className = 'bot';
    botDiv.innerHTML = `
      <div class="product-card">
        <img src="${product.image}" alt="${product.altText || 'Book cover'}" class="product-img"/>
        <div class="product-details">
          <a href="${product.link}" target="_blank" class="product-title">${product.title}</a>
          <div class="product-author">by ${product.author}</div>
          <div class="product-price">${product.currency} ${product.price}</div>
        </div>
      </div>
    `;
    chatBox.appendChild(botDiv);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
}
