import { OpenAI } from 'openai';
import fetch from 'node-fetch';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ⚠️ Do not change this — Shopify API only works with .myshopify.com
const API_DOMAIN = 'b80e25.myshopify.com';
const PUBLIC_DOMAIN = 'www.bookstaa.com';
const SHOPIFY_TOKEN = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const userMessage = req.body.message || '';
  const queryText = userMessage.replace(/[^a-zA-Z0-9\\s]/g, '').split(' ').slice(0, 10).join(' ');

  const shopifyQuery = {
    query: `
      {
        products(first: 5, query: "${queryText}") {
          edges {
            node {
              title
              handle
              images(first: 1) {
                edges {
                  node {
                    url
                  }
                }
              }
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    `
  };

  let productReply = '';

  try {
    try {
  const testRes = await fetch(`https://b80e25.myshopify.com/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_API_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: "{ shop { name } }" })
  });

  const text = await testRes.text(); // NOTE: using .text(), not .json()
  console.log("✅ Raw response from Shopify:", text);

  // Try parsing JSON
  const parsed = JSON.parse(text);
  productReply = `Your store name is: ${parsed.data.shop.name}`;
} catch (err) {
  productReply = `❌ Shopify fetch error: ${err.message}`;
}


    const products = shopifyData?.data?.products?.edges || [];

    if (products.length > 0) {
      productReply = products.map(({ node }) => {
        const title = node.title;
        const price = node.priceRange.minVariantPrice.amount;
        const currency = node.priceRange.minVariantPrice.currencyCode;
        const image = node.images.edges[0]?.node.url || '';
        const link = `https://${PUBLIC_DOMAIN}/products/${node.handle}`;
        return `📘 *${title}*\n💰 ₹${price} (${currency})\n🖼️ ![Cover](${image})\n🔗 [View on Bookstaa](${link})`;
      }).join('\n\n');
    } else {
      productReply = `Sorry, I couldn’t find exact matches on Bookstaa.com.\n\n👉 [Browse all books](https://${PUBLIC_DOMAIN}/collections/all)\n📩 [Contact us](https://${PUBLIC_DOMAIN}/pages/contact-us) if you need help.`;
    }
  } catch (error) {
    productReply = `❌ There was a problem accessing our store. Please try again later or [contact us](https://${PUBLIC_DOMAIN}/pages/contact-us).`;
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are a helpful Bookstaa.com assistant. Recommend books with links and prices.' },
      { role: 'user', content: userMessage },
      { role: 'assistant', content: productReply },
    ],
  });

  res.status(200).json({ choices: completion.choices });
}
