const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === '') {
    return res.status(400).json({ error: 'Missing query (q) parameter' });
  }

  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN; // e.g., 'b80e25.myshopify.com'
  const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_API_TOKEN; // your secure token

  const gqlQuery = {
    query: `
      {
        products(first: 10, query: "${q}") {
          edges {
            node {
              title
              handle
              vendor
              tags
              images(first: 1) {
                edges {
                  node {
                    originalSrc
                    altText
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    price {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    `
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

    const edges = result.data?.products?.edges || [];

    if (edges.length === 0) {
      return res.status(200).json({ products: [], message: "No products found" });
    }

    const products = edges.map(({ node }) => ({
      title: node.title,
      author: node.vendor || 'Bookstaa',
      link: `https://www.bookstaa.com/products/${node.handle}`,
      image: node.images?.edges?.[0]?.node?.originalSrc || '',
      altText: node.images?.edges?.[0]?.node?.altText || '',
      price: node.variants?.edges?.[0]?.node?.price?.amount || '',
      currency: node.variants?.edges?.[0]?.node?.price?.currencyCode || '',
      tags: node.tags || []
    }));

    res.status(200).json({ products });

  } catch (error) {
    console.error("❌ Product Search Failed:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
