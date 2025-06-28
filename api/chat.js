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
              priceRange {
                minVariantPrice {
                  amount
                }
              }
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

    if (!shopifyRes.ok) {
      const errorText = await shopifyRes.text();
      throw new Error(`Shopify API error (${shopifyRes.status}): ${errorText}`);
    }

    let result;
    try {
      result = await shopifyRes.json();
    } catch (err) {
      const raw = await shopifyRes.text();
      throw new Error(`Invalid JSON from Shopify: ${raw}`);
    }

    const products = result.data?.products?.edges || [];

    let productListText = '';
    if (products.length > 0) {
      productListText += `Here are some books available at Bookstaa.com:\n\n`;
      for (const { node } of products) {
        const image = node.images.edges?.[0]?.node?.url;
        const price = node.priceRange?.minVariantPrice?.amount || 'N/A';
        productListText += `📘 *${node.title}* – ₹${price}\n${node.description?.slice(0, 100)}...\n${image ? `🖼️ ${image}\n` : ''}🔗 [View Book](${node.onlineStoreUrl})\n\n`;
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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a chatbot assistant for Bookstaa.com. Only recommend products from the list below. If nothing matches, politely say so and suggest similar items or contact options.\n\n${productListText}`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.7
    });

res.status(200).json({
  reply: completion.choices?.[0]?.message?.content || '⚠️ No reply from assistant.'
});

  } catch (error) {
    console.error('❌ Error in API:', error.message);
    res.status(500).json({ error: { message: error.message } });
  }
}
