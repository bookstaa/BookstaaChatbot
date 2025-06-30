const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_API_KEY;

  const gqlQuery = {
    query: `{ shop { name } }`
  };

  try {
    const response = await fetch(`https://${storeDomain}/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
      },
      body: JSON.stringify(gqlQuery)
    });

    const result = await response.json();

    if (result.errors) {
      console.error("🛑 Shopify GraphQL Error:", result.errors);
      return res.status(500).json({ error: 'Shopify API error', details: result.errors });
    }

    return res.status(200).json(result.data);

  } catch (error) {
    console.error("❌ Shopify API Request Failed:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
