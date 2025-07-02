// 📤 Send on button click
document.getElementById('send-button').addEventListener('click', sendMessage);

// 📤 Send on Enter (without Shift)
document.getElementById('user-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// 💡 Quick prompt buttons
document.querySelectorAll('.suggested-prompt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('user-input').value = btn.innerText;
    sendMessage();
  });
});

// 🚀 Send message to /api/chat
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

    if (data.text) showAssistantMessage(data.text);

    if (data.type === 'products' && data.products?.length) {
      showProductSlider(data.products);
    } else if (!data.text) {
      showAssistantMessage("❓ I couldn’t find anything. Try searching by **title**, **author**, or **category**.");
    }

  } catch (err) {
    console.error('Chat error:', err);
    showTypingIndicator(false);
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

// 🤖 Show assistant reply
function showAssistantMessage(text) {
  const chatBox = document.getElementById('chat-box');
  const msg = document.createElement('div');
  msg.className = 'chat assistant';
  msg.innerHTML = marked.parse(text); // markdown support
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 🕐 Typing dots indicator
function showTypingIndicator(show) {
  const chatBox = document.getElementById('chat-box');
  const existing = document.getElementById('typing-indicator');
  if (existing) existing.remove();

  if (show) {
    const typing = document.createElement('div');
    typing.id = 'typing-indicator';
    typing.className = 'chat assistant';
    typing.innerHTML = `<span class="typing-
