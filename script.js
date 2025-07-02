// 📤 Send on Enter key (without Shift)
document.getElementById('user-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// 💡 Suggested prompt buttons
document.querySelectorAll('.suggested-prompt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('user-input').value = btn.innerText;
    sendMessage();
  });
});

// 🚀 Main function to handle user input
async function sendMessage() {
  const input = document.getElementById('user-input');
  const message = input.value.trim();
  if (!message) return;

  showUserMessage(message);
  input.value = '';

  showTypingIndicator(true);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    showTypingIndicator(false);

    // 🤖 Show assistant reply if available
    if (data.type === 'products' && data.products?.length) {
      if (data.text) showAssistantMessage(data.text); // ✅ Show GPT intro
      showProductSlider(data.products);
    } 
    else if (data.type === 'text' && data.text) {
      showAssistantMessage(data.text); // ✅ Fallback or greeting
    } 
    else {
      showAssistantMessage(`
❓ I couldn’t find anything related to your query.

Try:
• Searching by **book title**, **author name**, or **ISBN**
• Asking for categories like *astrology*, *yoga*, or *bestsellers*

📩 You can also email us at [feedback@bookstaa.com](mailto:feedback@bookstaa.com) to suggest or request a book!
      `);
    }

  } catch (err) {
    console.error('Chat error:', err);
    showTypingIndicator(false);
    showAssistantMessage('⚠️ Something went wrong. Please try again.');
  }
} // ✅ CLOSING this function — you missed this in your code!

// 💬 Show user message
function showUserMessage(text) {
  const chatBox = document.getElementById('chat-box');
  const msg = document.createElement('div');
  msg.className = 'chat user';
  msg.innerText = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 🤖 Show assistant message
function showAssistantMessage(text) {
  const chatBox = document.getElementById('chat-box');
  const msg = document.createElement('div');
  msg.className = 'chat assistant';
  msg.innerHTML = marked.parse(text); // Markdown support
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 🕐 Typing dots
function showTypingIndicator(show) {
  const chatBox = document.getElementById('chat-box');
  const existing = document.getElementById('typing-indicator');
  if (existing) existing.remove();

  if (show) {
    const typing = document.createElement('div');
    typing.id = 'typing-indicator';
    typing.className = 'chat assistant';
    typing.innerHTML = `<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>`;
    chatBox.appendChild(typing);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// 🛍️ Show horizontal product card slider
function showProductSlider(products) {
  const chatBox = document.getElementById('chat-box');

  // Remove previous sliders
  chatBox.querySelectorAll('.product-slider').forEach(el => el.remove());

  const wrapper = document.createElement('div');
  wrapper.className = 'product-slider';

  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';

    card.innerHTML = `
      <img class="product-img" src="${product.image}" alt="${product.title}" />
      <div class="product-details">
        <div class="product-title" title="${product.title}">
          ${truncateText(product.title, 60)}
        </div>
        <div class="product-author">${product.author || ''}</div>
        <div class="product-price">
          ${product.discount ? `<span class="discount">${product.discount}</span> ` : ''}
          ${product.price}
        </div>
        <a class="buy-now" href="${product.url}" target="_blank">Buy Now</a>
      </div>
    `;

    wrapper.appendChild(card);
  });

  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ✂️ Truncate long text
function truncateText(text, maxLength) {
  return text.length > maxLength ? text.slice(0, maxLength - 1) + '…' : text;
}

// 🌍 Expose globally
window.sendMessage = sendMessage;
