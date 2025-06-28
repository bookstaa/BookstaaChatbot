import { OpenAI } from 'openai';
import fetch from 'node-fetch';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  try {
    const userMessage = req.body.message;
    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

    const query = \`
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
      }
    \`;

    const variables = { term: userMessage };

    const shopifyRes = await fetch(\`https://\${shopifyDomain}/api/2023-10/graphql.json\`, {
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
      productListText = `Here are some books from Bookstaa.com:\n\n`;
      for (const { node } of products) {
        const image = node.images.edges?.[0]?.node?.url || '';
        productListText += \`📘 \${node.title}\n\${node.description?.slice(0, 100)}...\n🖼️ \${image}\n🔗 \${node.onlineStoreUrl}\n\n\`;
      }
    } else {
      productListText = \`❌ Sorry, no results for "\${userMessage}" on Bookstaa.com.\n\n📩 Contact us at support@bookstaa.com\n\nTry broader keywords or check our top categories.\`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for Bookstaa.com. Use the Shopify product data below to respond.' },
        { role: 'user', content: userMessage },
        { role: 'system', content: productListText }
      ],
      temperature: 0.7,
    });

    res.status(200).json(completion);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: { message: error.message } });
  }
}