// /api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

  // Step 1: Search products from Shopify
  const shopifyQuery = `
    query SearchProducts($search: String!) {
      products(first: 5, query: $search) {
        edges {
          node {
            title
            handle
            description
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
  `;

  const shopifyResponse = await fetch(`https://${shopDomain}/api/2024-04/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Storefront-Access-Token': storefrontToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: shopifyQuery,
      variables: { search: message }
    })
  });

  const shopifyData = await shopifyResponse.json();
  const products = shopifyData.data?.products?.edges || [];

  const productList = products.map(p => {
    const { title, handle, priceRange } = p.node;
    const price = priceRange.minVariantPrice.amount;
    const currency = priceRange.minVariantPrice.currencyCode;
    const url = `https://${shopDomain}/products/${handle}`;
    return `- ${title} – ${currency} ${price}\n  ${url}`;
  }).join('\n');

  const openaiSystemPrompt = `
You are a helpful assistant for Bookstaa.com, an online bookstore and product store. Recommend products only from this store.
If the user is looking for something, suggest these matching items:

${productList || 'Sorry, no products found for this query.'}
`;

  // Step 2: Use OpenAI to form a natural response
  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: openaiSystemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7
    })
  });

  const data = await openaiResponse.json();
  return res.status(200).json(data);
}
