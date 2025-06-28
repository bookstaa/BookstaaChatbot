import { OpenAI } from 'openai';
import fetch from 'node-fetch';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const API_DOMAIN = 'b80e25.myshopify.com';
const PUBLIC_DOMAIN = 'www.bookstaa.com';
const SHOPIFY_TOKEN = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const userMessage = req.body.message || '';
  let productReply = '';

  try {
    // Minimal query to test if Shopify access is working
    const shopifyRes = await fetch(`https://${API_DOMAIN}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `{ shop { name } }`
      })
    });

    const text = await shopifyRes.text();
    console.log("✅ Shopify Raw Response:", text);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new Error(`Invalid JSON from Shopify: ${text.slice(0, 100)}...`);
    }

    productReply = `Your store name is: ${parsed.data.shop.name}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for Bookstaa.com' },
        { role: 'user', content: userMessage },
        { role: 'assistant', content: productReply }
      ]
    });

    res.status(200).json({ choices: completion.choices });

  } catch (err) {
    console.error("❌ Error in /api/chat:", err.message);
    res.status(500).json({ error: err.message });
  }
}
