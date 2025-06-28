console.log("📘 script.js loaded");

async function sendMessage() {
  const input = document.getElementById('user-input');
  const chatBox = document.getElementById('chat-box');
  const userMessage = input.value.trim();
  if (!userMessage) return;

  // Show user's message in the chat
  const userDiv = document.createElement('div');
  userDiv.className = 'user';
  userDiv.textContent = userMessage;
  chatBox.appendChild(userDiv);
  input.value = '';
  chatBox.scrollTop = chatBox.scrollHeight;

  // Show typing indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'bot loading';
  loadingDiv.textContent = '💬 Thinking...';
  chatBox.appendChild(loadingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage })
    });

    const data = await response.json();
    const botReply = data.reply || '⚠️ No reply from assistant.';

    // Remove loading and display actual reply
    loadingDiv.remove();

    const botDiv = document.createElement('div');
    botDiv.className = 'bot';
    botDiv.innerHTML = botReply.replace(/\n/g, "<br>");
    chatBox.appendChild(botDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  } catch (error) {
    loadingDiv.remove();

    const errDiv = document.createElement('div');
    errDiv.className = 'bot';
    errDiv.textContent = '❌ Error: ' + error.message;
    chatBox.appendChild(errDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}
