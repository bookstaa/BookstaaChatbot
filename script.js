console.log("📘 script.js loaded");

// --- START: Send Message Handler ---
async function sendMessage() {
  const input = document.getElementById('user-input');
  const chatBox = document.getElementById('chat-box');
  const userMessage = input.value.trim();
  if (!userMessage) return;

  // User message
  const userDiv = document.createElement('div');
  userDiv.className = 'user';
  userDiv.textContent = userMessage;
  chatBox.appendChild(userDiv);
  input.value = '';

  // Typing indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'bot loading';
  loadingDiv.textContent = 'Bookstaa is thinking...';
  chatBox.appendChild(loadingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  // --- START: Search Products First ---
  try {
    const productRes = await fetch(`/api/search-products?q=${encodeURIComponent(userMessage)}`);
    const productData = await productRes.json();

    chatBox.removeChild(loadingDiv); // remove loader

    if (productData.products && productData.products.length > 0) {
      renderProductSlider(productData.products);
      return;
    }
  } catch (err) {
    console.warn('🔍 Product search failed:', err);
    chatBox.removeChild(loadingDiv);
  }
  // --- END: Search Products First ---

  // --- START: Fallback to ChatGPT ---
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
      ❓ I couldn’t find anything for that. You can try:<br>
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
  // --- END: Fallback to ChatGPT ---
}
// --- END: Send Message Handler ---

// --- START: Product Card Slider ---
function renderProductSlider(products) {
  const chatBox = document.getElementById('chat-box');

  const wrapper = document.createElement('div');
  wrapper.className = 'bot';

  const slider = document.createElement('div');
  slider.className = 'product-slider';

  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${product.image}" alt="${product.altText || 'Book cover'}" class="product-img"/>
      <div class="product-details">
        <div class="product-title">${product.title.length > 60 ? product.title.slice(0, 57) + '...' : product.title}</div>
        <div class="product-author">by ${product.author}</div>
        <div class="product-price">₹${product.price}${product.compareAt && product.compareAt > product.price ? ` <s>₹${product.compareAt}</s>` : ''}</div>
        <a href="${product.link}" target="_blank" class="buy-now">Buy Now</a>
      </div>
    `;
    slider.appendChild(card);
  });

  wrapper.appendChild(slider);
  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}
// --- END: Product Card Slider ---
