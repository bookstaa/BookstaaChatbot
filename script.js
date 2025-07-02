document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', e => {
  if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
  const input = document.getElementById('user-input');
  const message = input.value.trim();
  if (!message) return;

  showUserMessage(message);
  input.value = '';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();

    if (data.text) showAssistantMessage(data.text); // always show text if present
    if (data.type === 'products' && data.products?.length) {
      showProductSlider(data.products);
    } else if (!data.text) {
      showAssistantMessage("❓ I couldn’t find anything. Try searching by **title**, **author**, or **category**.");
    }
  } catch (err) {
    console.error('Chat error:', err);
    showAssistantMessage('⚠️ Something went wrong. Please try again.');
  }
}

// 💬 Show user's message
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
  msg.innerHTML = marked.parse(text); // Markdown rendering
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 🎞️ Show products in slider format
function showProductSlider(products) {
  const chatBox = document.getElementById('chat-box');
  const wrapper = document.createElement('div');
  wrapper.className = 'chat product-slider-wrapper';

  const slider = document.createElement('div');
  slider.className = 'product-slider';

  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${product.image}" alt="${product.title}" />
      <h4 title="${product.title}">${truncateText(product.title, 50)}</h4>
      <p class="author">${product.author || ''}</p>
      <p class="price">${product.discount ? `<span class="discount">${product.discount}</span>` : ''} ₹${product.price}</p>
      <a href="${product.url}" target="_blank" class="view-btn">View</a>
    `;
    slider.appendChild(card);
  });

  wrapper.appendChild(slider);
  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ✂️ Truncate long title
function truncateText(text, maxLength) {
  return text.length > maxLength ? text.slice(0, maxLength - 1) + '…' : text;
}
