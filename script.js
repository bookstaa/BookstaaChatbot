async function sendMessage() {
  const input = document.getElementById("user-input");
  const message = input.value;
  if (!message) return;

  const chatLog = document.getElementById("chat-log");
  chatLog.innerHTML += `<div><b>You:</b> ${message}</div>`;
  input.value = "";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_OPENAI_API_KEY"
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: `User asked: ${message}. Recommend book from this list: ${JSON.stringify(bookList)}` }]
    })
  });

  const data = await response.json();
  const reply = data.choices[0].message.content;
  chatLog.innerHTML += `<div><b>Bot:</b> ${reply}</div>`;
}
const bookList = [
  {
    title: "Shri Ramcharitmanas",
    publisher: "Gita Press",
    price: "₹295",
    tags: ["Ram", "Ramcharitmanas", "Tulsidas"],
    url: "https://bookstaa.com/products/shri-ramcharitmanas"
  },
  {
    title: "Valmiki Ramayan",
    publisher: "Motilal Banarsidass",
    price: "₹695",
    tags: ["Ram", "Ramayan", "Valmiki"],
    url: "https://bookstaa.com/products/valmiki-ramayan"
  }
];
