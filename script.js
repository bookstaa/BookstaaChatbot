console.log("📘 script.js loaded");

async function sendMessage() {
  const input = document.getElementById('user-input');
  const chatBox = document.getElementById('chat-box');
  const typingIndicator = document.getElementById('typing-indicator');
  const userMessage = input.value.trim();
  if (!userMessage) return;

  const userDiv = document.createElement('div');
  userDiv.className = 'user';
  userDiv.textContent = userMessage;
  chatBox.appendChild(userDiv);
  input.value = '';

  chatBox.scrollTop = chatBox.scrollHeight;
  typingIndicator.style.display = 'block';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage })
    });

    const data = await response.json();
    const botReply = data.choices?.[0]?.message?.content || 'No response';

    const botDiv = document.createElement('div');
    botDiv.className = 'bot';
    botDiv.innerHTML = botReply.replace(/\n/g, '<br>');
    chatBox.appendChild(botDiv);
    typingIndicator.style.display = 'none';
    chatBox.scrollTop = chatBox.scrollHeight;
  } catch (error) {
    const errDiv = document.createElement('div');
    errDiv.className = 'bot';
    errDiv.textContent = 'Error: ' + error.message;
    chatBox.appendChild(errDiv);
    typingIndicator.style.display = 'none';
  }
}
