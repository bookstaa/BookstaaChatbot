import { OpenAI } from 'openai';
import fetch from 'node-fetch';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SHOP_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const userMessage = req.body.message || '';
  const keywordMatch = userMessage.toLowerCase().match(/\b(?:book|books|buy|get|under|price|\d+)\b/g) || [];
  const queryText = userMessage.replace(/[^a-zA-Z0-9\s]/g, '').split(' ').slice(0, 8).join(' ');

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
    const shopifyRes = await fetch(`https://${SHOP_DOMAIN}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(shopifyQuery)
    });

    const shopifyData = await shopifyRes.json();
    const products = shopifyData?.data?.products?.edges || [];

    if (products.length > 0) {
      productReply = products.map(({ node }) => {
        const img = node.images.edges[0]?.node.url || '';
        return `📘 *${node.title}*  
💰 ₹${node.priceRange.minVariantPrice.amount}  
🖼️ ![Cover](${img})  
🔗 [View on Bookstaa](https://${SHOP_DOMAIN}/products/${node.handle})`;
      }).join('\n\n');
    } else {
      productReply = `Sorry, I couldn’t find exact matches on Bookstaa.com for that query.  
You may [browse all books](https://${SHOP_DOMAIN}/collections/all) or [contact us](https://${SHOP_DOMAIN}/pages/contact-us) for help.`;
    }
  } catch (err) {
    productReply = `There was an error fetching results from our store. Please try again later or [contact support](https://${SHOP_DOMAIN}/pages/contact-us).`;
  }

  const completion = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a helpful assistant for Bookstaa.com. Recommend books with product links when possible.' },
      { role: 'user', content: userMessage },
      { role: 'assistant', content: productReply }
    ],
    model: 'gpt-4'
  });

  res.status(200).json({ choices: completion.choices });
}
