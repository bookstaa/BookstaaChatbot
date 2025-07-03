// 📜 Section 0: Keyboard & Suggested Prompts
document.getElementById('user-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

document.querySelectorAll('.suggested-prompt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('user-input').value = btn.innerText;
    sendMessage();
  });
});

// 🚀 Section 1: Main Chat Handler
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

    // 🤖 Section 2: If GPT text + products
    if (data.type === 'products' && data.products?.length) {
      if (data.text) showAssistantMessage(data.text);
      showProductSlider(data.products);
    }

    // 🧠 Section 3: GPT text-only replies (greetings, fallback, etc.)
    else if (data.type === 'text' && data.text) {
      showAssistantMessage(data.text);
    }

    // ❓ Section 4: Total fallback — nothing returned
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
}

// 💬 Section 5: Show User Message
function showUserMessage(text) {
  const chatBox = document.getElementById('chat-box');
  const msg = document.createElement('div');
  msg.className = 'chat user';
  msg.innerText = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 🤖 Section 6: Show Assistant Message (with Markdown)
function showAssistantMessage(text) {
  const chatBox = document.getElementById('chat-box');
  const msg = document.createElement('div');
  msg.className = 'chat assistant';
  msg.innerHTML = marked.parse(text); // Markdown support
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 🕐 Section 7: Typing Dots
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

function renderProductCards(products) {
  const chatBox = document.querySelector('.chat-box');

  const container = document.createElement('div');
  container.className = 'product-slider';

  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';

    card.innerHTML = `
      <a href="${product.url}" target="_blank" rel="noopener noreferrer">
        <img src="${product.image}" alt="${product.title}" class="product-image" />
        <div class="product-info">
          <h4 class="product-title">${product.title}</h4>
          <p class="product-author">${product.author ? `by ${product.author}` : ''}</p>
          <p class="product-price">${product.price}</p>
          ${product.discount ? `<p class="product-discount">${product.discount}</p>` : ''}
        </div>
      </a>
    `;

    container.appendChild(card);
  });

  chatBox.appendChild(container);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ✂️ Section 9: Text Truncator for Titles
function truncateText(text, maxLength) {
  return text.length > maxLength ? text.slice(0, maxLength - 1) + '…' : text;
}

// 🌐 Section 10: Expose to Global Scope
window.sendMessage = sendMessage;
