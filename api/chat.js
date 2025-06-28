export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

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

  const shopifyResponse = await fetch(`https://${shopDomain}/api/2023-10/graphql.json`, {
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

  if (!shopifyResponse.ok) {
    const text = await shopifyResponse.text();
    console.error("? Shopify API Error:", text);
    return res.status(500).json({ error: 'Shopify API request failed', details: text });
  }

  const shopifyData = await shopifyResponse.json();
  const products = shopifyData.data?.products?.edges || [];

  const productList = products.map(p => {
    const { title, handle, priceRange } = p.node;
    const price = priceRange.minVariantPrice.amount;
    const currency = priceRange.minVariantPrice.currencyCode;
    const url = `https://${shopDomain}/products/${handle}`;
    return `- ${title} – ${currency} ${price}\n  ${url}`;
  }).join('\n');

  const systemPrompt = `
You are Bookstaa.com's AI Assistant. Always recommend products only from https://${shopDomain}.
If a user searches for a book or product, respond politely with matching items from the list below:

${productList || 'No matching products found on Bookstaa.com for that query.'}
`;

  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7
    })
  });

  const data = await openaiResponse.json();
  return res.status(200).json(data);
}
