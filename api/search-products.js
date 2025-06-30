const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { q } = req.query;

  if (!q) return res.status(400).json({ error: 'Query missing' });

  const storeDomain = 'b80e25.myshopify.com'; // ✅ Your real Shopify domain
  const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_API_KEY;

  try {
    console.log("🔍 Search query:", q);
    console.log("🛒 Using domain:", storeDomain);
    console.log("🔑 Token present:", !!storefrontAccessToken);

    const gqlQuery = {
      query: `
        {
          products(first: 10, query: "${q}") {
            edges {
              node {
                id
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
      console.error("🛑 Shopify GraphQL Errors:", result.errors);
      return res.status(500).json({ error: 'Shopify API error', details: result.errors });
    }

    const products = (result.data.products?.edges || []).map(({ node }) => ({
      title: node.title,
      author: node.vendor,
      link: `https://www.bookstaa.com/products/${node.handle}`,
      image: node.images?.edges?.[0]?.node?.originalSrc || '',
      altText: node.images?.edges?.[0]?.node?.altText || '',
      price: node.variants?.edges?.[0]?.node?.price?.amount || '',
      currency: node.variants?.edges?.[0]?.node?.price?.currencyCode || '',
    }));

    res.status(200).json({ products });

  } catch (error) {
    console.error('❌ Product Search Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
