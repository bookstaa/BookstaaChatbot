import { OpenAI } from 'openai';
import fetch from 'node-fetch';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  try {
    const userMessage = req.body.message;
    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

    // Shopify GraphQL query
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
              priceRange {
                minVariantPrice {
                  amount
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

    const variables = { term: userMessage };

    const shopifyRes = await fetch(`https://${shopifyDomain}/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    const result = await shopifyRes.json();
    const products = result?.data?.products?.edges || [];

    let productListText = '';
    if (products.length > 0) {
      productListText = `Here are some matching books available at Bookstaa.com:\n\n`;
      for (const { node } of products) {
        const image = node.images.edges?.[0]?.node?.url || '';
        const price = node.priceRange?.minVariantPrice?.amount || '';
        const link = node.onlineStoreUrl || '';
        productListText += `📘 *${node.title}* – ₹${price}\n${node.description?.slice(0, 100)}...\n🖼️ ${image}\n🔗 ${link}\n\n`;
      }
    } else {
      productListText = `
❌ Sorry, we couldn't find any books matching "${userMessage}" on Bookstaa.com.

📩 Reach out at [support@bookstaa.com](mailto:support@bookstaa.com) and we’ll help you personally.

Meanwhile, here are a few top suggestions:
1. [Ayurveda and Marma Therapy](https://www.bookstaa.com/products/ayurveda-and-marma-therapy-energy-points-in-yogic-healing-david-frawley-9788120835603-8120835603)
2. [Yoga for Health & Healing](https://www.bookstaa.com/products/yoga-for-health-healing)
3. [Bhagavad Gita: A New Translation](https://www.bookstaa.com/products/bhagavad-gita-new-translation)
      `.trim();
    }

    // Ask OpenAI to prepare a polished reply using the actual product results
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant for Bookstaa.com — an online bookstore. Only recommend books that exist on Bookstaa.com, using the
