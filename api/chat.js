import { OpenAI } from 'openai';
import fetch from 'node-fetch';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SHOPIFY_DOMAIN = 'www.bookstaa.com';
const STOREFRONT_API_URL = `https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`;
const SHOPIFY_TOKEN = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const userMessage = req.body.message;

  try {
    // Search Shopify products using storefront API
    const shopifyResponse = await fetch(STOREFRONT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN
      },
      body: JSON.stringify({
        query: `
          query Search($term: String!) {
            products(first: 3, query: $term) {
              edges {
                node {
                  id
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
          }
        `,
        variables: {
          term: userMessage
        }
      })
    });

    const raw = await shopifyResponse.text();
    let result;
    try {
      result = JSON.parse(raw);
    } catch (e) {
      console.error("❌ JSON Parse Error:", e.message);
      return res.status(500).json({ error: 'Invalid JSON from Shopify: ' + raw.slice(0, 100) });
    }

    const products = result?.data?.products?.edges || [];
    let productListText = '';

    if (products.length > 0) {
      productListText = `Here are some matching books on Bookstaa:\n\n`;
      for (const { node } of products) {
        const image = node.images.edges?.[0]?.node?.url;
        productListText += `🛍️ *${node.title}*\n${node.description?.slice(0, 120)}...\n${image ? image + '\n' : ''}[Buy Now](${node.onlineStoreUrl})\n\n`;
      }
    } else {
      productListText = `Sorry, no matching products found for "${userMessage}" on Bookstaa.com.\nYou can email us at support@bookstaa.com to request this book or get help.`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // For cost efficiency
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant for Bookstaa.com, a bookstore. Recommend relevant books with links.'
        },
        {
          role: 'user',
          content: userMessage
        },
        {
          role: 'assistant',
          content: productListText
        }
      ]
    });

    res.status(200).json({ choices: completion.choices });

  } catch (err) {
    console.error('❌ Error in /api/chat:', err.message);
    res.status(500).json({ error: err.message });
  }
}
