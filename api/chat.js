import { OpenAI } from 'openai';
import fetch from 'node-fetch';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  try {
    const userMessage = req.body.message;
    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

    // Shopify product search via Storefront API
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
    const products = result.data?.products?.edges || [];

    let productListText = '';
    if (products.length > 0) {
      productListText = `Here are some books available at Bookstaa.com:\n\n`;
      for (const { node } of products) {
        const image = node.images.edges?.[0]?.node?.url;
        productListText += `📘 *${node.title}*\n${node.description?.slice(0, 120)}...\n${image ? image + '\n' : ''}[View Book](${node.onlineStoreUrl})\n\n`;
      }
    } else {
      productListText = `
❌ Sorry, we couldn't find any books matching "${userMessage}" on Bookstaa.com.

📩 You can reach out to [support@bookstaa.com](mailto:support@bookstaa.com) for personalized help.

Here are some top picks you might like:

1. [Ayurveda and Marma Therapy](https://www.bookstaa.com/products/ayurveda-and-marma-therapy-energy-points-in-yogic-healing-david-frawley-9788120835603-8120835603)
2. [Yoga for Health & Healing](https://www.bookstaa.com/products/yoga-for-health-healing)
3. [Bhagavad Gita: A New Translation](https://www.bookstaa.com/products/bhagavad-gita-new-translation)

Let me know if you'd like more suggestions!
      `.trim();
    }

    // Final assistant reply via OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant for Bookstaa.com — an online bookstore. Only recommend books that exist on Bookstaa.com. Use the product list below to respond to the user's query.`,
        },
        {
          role: 'user',
          content: userMessage,
        },
        {
          role: 'assistant',
          content: productListText,
        }
      ],
      temperature: 0.7,
    });

    res.status(200).json(completion);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
}
