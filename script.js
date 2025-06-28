console.log("📘 script.js loaded");

async function sendMessage() {
  console.log("✉️ sendMessage() triggered");

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
    console.log("🚀 Sending to backend:", userMessage);

const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: userMessage })
});

const data = await response.json();
const botReply = data.reply || '⚠️ No reply from assistant.';

    const botReply = data?.choices?.[0]?.message?.content || '⚠️ No reply from assistant.';

    const botDiv = document.createElement('div');
    botDiv.className = 'bot';
    botDiv.innerHTML = botReply.replace(/\n/g, "<br>"); // to keep formatting
    chatBox.appendChild(botDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

  } catch (error) {
    console.error("❌ Error in script.js:", error.message);

    const errDiv = document.createElement('div');
    errDiv.className = 'bot';
    errDiv.textContent = '⚠️ Error: ' + error.message;
    chatBox.appendChild(errDiv);
  }
}
