// === chat.js ===

import { OpenAI } from 'openai';
import fetch from 'node-fetch';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  try {
    const userMessage = req.body.message;
    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

    const query = `
      query Search($term: String!) {
        products(first: 5, query: $term) {
          edges {
            node {
              title
              description
              onlineStoreUrl
              images(first: 1) {
                edges {
                  node {
                    url
                  }
                }
              }
            }
          }
        }
        shop {
          name
        }
      }
    `;

    const variables = { term: `title:${userMessage}* OR description:${userMessage}*` };

    const shopifyRes = await fetch(`https://${shopifyDomain}/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    const result = await shopifyRes.json();
    const products = result.data?.products?.edges || [];

    let productListText = '';
    if (products.length > 0) {
      productListText = `Here are some books available at Bookstaa.com:<br/><br/>`;
      for (const { node } of products) {
        const image = node.images.edges?.[0]?.node?.url || '';
        productListText += `
          <strong>${node.title}</strong><br/>
          🖼️ <img src="${image}" alt="${node.title}" style="max-width:150px;"><br/>
          🔗 <a href="${node.onlineStoreUrl}" target="_blank">View Book</a><br/><br/>
        `;
      }
    } else {
      productListText = `
❌ We couldn't find books that exactly match "${userMessage}".<br/><br/>
📩 You can email us at <a href="mailto:support@bookstaa.com">support@bookstaa.com</a> for help.<br/><br/>
Meanwhile, here are some suggestions:<br/>
- <a href="https://www.bookstaa.com/products/yoga-for-health-healing" target="_blank">Yoga for Health & Healing</a><br/>
- <a href="https://www.bookstaa.com/products/ayurveda-and-marma-therapy-energy-points-in-yogic-healing-david-frawley-9788120835603-8120835603" target="_blank">Ayurveda and Marma Therapy</a><br/>
- <a href="https://www.bookstaa.com/products/bhagavad-gita-new-translation" target="_blank">Bhagavad Gita: New Translation</a><br/><br/>
Let me know if you'd like more suggestions.`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are Bookstaa.com's AI shopping assistant, powered by ChatGPT. Only recommend books that are found in the product list below.

✅ If books are available, reply with clickable links and book cover images (HTML format).
❌ If not, respond politely and suggest related books or contact options.
Product List:
${productListText}`,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.7,
    });

    const reply = completion.choices?.[0]?.message?.content || '⚠️ No reply from assistant.';
    res.status(200).json({ reply });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
}


// === script.js ===

console.log('📘 script.js loaded');

async function sendMessage() {
  const userInput = document.getElementById('user-input').value.trim();
  if (!userInput) return;

  const chatBox = document.getElementById('chat-box');
  const userDiv = document.createElement('div');
  userDiv.className = 'user';
  userDiv.textContent = userInput;
  chatBox.appendChild(userDiv);

  document.getElementById('user-input').value = '';

  const botDiv = document.createElement('div');
  botDiv.className = 'bot';
  botDiv.innerHTML = '⌛ Typing...';
  chatBox.appendChild(botDiv);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userInput }),
    });

    const data = await response.json();
    botDiv.innerHTML = data.reply || '⚠️ No reply from assistant.';
  } catch (error) {
    console.error('❌ Error:', error);
    botDiv.innerHTML = '❌ Error: ' + error.message;
  }

  chatBox.scrollTop = chatBox.scrollHeight;
}

window.sendMessage = sendMessage;
