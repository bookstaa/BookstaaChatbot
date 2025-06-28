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
        const image = node.images.edges?.[0]?.node?.url || '';
        productListText += `📘 *${node.title}*\n📝 ${node.description?.slice(0, 100)}...\n🖼️ ${image}\n🔗 ${node.onlineStoreUrl}\n\n`;
      }
    } else {
      productListText = `
❌ Sorry, we couldn't find any books matching "${userMessage}" on Bookstaa.com.

📩 You can contact our support team at [support@bookstaa.com](mailto:support@bookstaa.com) for help.

Here are a few popular picks:
- https://www.bookstaa.com/products/ayurveda-and-marma-therapy-energy-points-in-yogic-healing-david-frawley-9788120835603-8120835603
- https://www.bookstaa.com/products/yoga-for-health-healing
- https://www.bookstaa.com/products/bhagavad-gita-new-translation
      `.trim();
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a friendly shopping assistant for Bookstaa.com. Respond with helpful, polite, and relevant answers. Recommend only products that are found on Bookstaa.com.`,
        },
        { role: 'user', content: userMessage },
        {
          role: 'system',
          content: `Here are the matching products based on the query:\n\n${productListText}`,
        }
      ],
      temperature: 0.7,
    });

    const reply = completion.choices?.[0]?.message?.content || "⚠️ No reply from assistant.";
    res.status(200).json({ reply });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
}
