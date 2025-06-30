const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_API_KEY;

  const query = {
    query: `{
      shop {
        name
      }
    }`
  };

  try {
    const response = await fetch(`https://${domain}/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token,
      },
      body: JSON.stringify(query)
    });

    const data = await response.json();

    if (data.errors) {
      return res.status(500).json({ error: "Shopify API error", details: data.errors });
    }

    return res.status(200).json(data.data);

  } catch (err) {
    return res.status(500).json({ error: "Internal server error", message: err.message });
  }
};
