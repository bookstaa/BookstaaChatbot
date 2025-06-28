console.log("📘 script.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  window.sendMessage = async function () {
    const input = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const userMessage = input.value.trim();
    if (!userMessage) return;

    const userDiv = document.createElement('div');
    userDiv.className = 'user';
    userDiv.textContent = userMessage;
    chatBox.appendChild(userDiv);
    input.value = '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });

const data = await response.json();
const botReply = data.reply || '⚠️ No reply from assistant.';

      const botDiv = document.createElement('div');
      botDiv.className = 'bot';
      botDiv.innerHTML = reply.replace(/\n/g, "<br>");
      chatBox.appendChild(botDiv);
      chatBox.scrollTop = chatBox.scrollHeight;
    } catch (error) {
      const errDiv = document.createElement('div');
      errDiv.className = 'bot';
      errDiv.textContent = '⚠️ ' + error.message;
      chatBox.appendChild(errDiv);
    }
  };
});
