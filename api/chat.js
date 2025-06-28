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
    const products = result.data?.products?.edges || [];

    let productListText = '';
    if (products.length > 0) {
      productListText = `Here are some books available at Bookstaa.com:\n\n`;
      for (const { node } of products) {
        const image = node.images.edges?.[0]?.node?.url;
        const price = node.priceRange?.minVariantPrice?.amount;
        productListText += `📘 *${node.title}* – ₹${price}\n${node.description?.slice(0, 100)}...\n🖼️ ${image}\n🔗 ${node.onlineStoreUrl}\n\n`;
      }
    } else {
      productListText = `
❌ Sorry, we couldn't find any books matching "${userMessage}" on Bookstaa.com.

📩 You can reach out to [support@bookstaa.com](mailto:support@bookstaa.com) for help.

Here are a few hand-picked recommendations:
1. [Ayurveda and Marma Therapy](https://www.bookstaa.com/products/ayurveda-and-marma-therapy-energy-points-in-yogic-healing-david-frawley-9788120835603-8120835603)
2. [Yoga for Health & Healing](https://www.bookstaa.com/products/yoga-for-health-healing)
3. [Bhagavad Gita: A New Translation](https://www.bookstaa.com/products/bhagavad-gita-new-translation)
      `.trim();
    }

    // Compose final assistant response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant for Bookstaa.com — an online bookstore. Respond only with real books from Bookstaa.com. Use the product list below to assist.`,
        },
        {
          role: 'user',
          content: userMessage,
        },
        {
          role: 'system',
          content: productListText,
        },
      ],
      temperature: 0.7,
    });

    const reply = completion.choices?.[0]?.message?.content || '⚠️ No reply from assistant.';
    res.status(200).json({ reply });
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: { message: error.message } });
  }
}
