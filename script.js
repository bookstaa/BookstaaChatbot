// /script.js

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

    if (data.type === 'product' && data.products?.length) {
      showProductCards(data.products);
    } else if (data.type === 'text') {
      showAssistantMessage(data.reply);
    } else {
      showAssistantMessage("❓ I couldn’t find anything for that. Try asking for a **book title**, **author**, or **category**.");
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

// 🤖 Show assistant's reply
function showAssistantMessage(text) {
  const chatBox = document.getElementById('chat-box');
  const msg = document.createElement('div');
  msg.className = 'chat assistant';
  msg.innerText = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 📚 Show product cards
function showProductCards(products) {
  const chatBox = document.getElementById('chat-box');
  const container = document.createElement('div');
  container.className = 'chat product-list';

  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';

    card.innerHTML = `
      <img src="${product.image}" alt="${product.title}" />
      <h4>${product.title}</h4>
      <p>${product.author}</p>
      <p><strong>₹${product.price}</strong></p>
      <a href="${product.url}" target="_blank">View</a>
    `;

    container.appendChild(card);
  });

  chatBox.appendChild(container);
  chatBox.scrollTop = chatBox.scrollHeight;
}
