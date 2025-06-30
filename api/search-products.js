const fetch = require('node-fetch');

const SHOPIFY_DOMAIN = 'b80e25.myshopify.com';
const SHOPIFY_API_KEY = process.env.SHOPIFY_STOREFRONT_TOKEN_KEY;

module.exports = async (req, res) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing search query' });
  }

  try {
    const searchQuery = q.trim().toLowerCase();

    const graphqlQuery = `
      {
        products(first: 100, query: "${searchQuery}") {
          edges {
            node {
              id
              title
              productType
              vendor
              tags
              handle
              images(first: 1) {
                edges {
                  node {
                    url
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
    `;

    const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_API_KEY,
      },
      body: JSON.stringify({ query: graphqlQuery })
    });

    const result = await response.json();

    if (!result.data || !result.data.products) {
      return res.status(500).json({ error: 'Shopify API error', details: result.errors || [] });
    }

    const edges = result.data.products.edges || [];
    const products = edges
      .map(edge => edge.node)
      .filter(product => {
        const title = product.title.toLowerCase();
        const vendor = product.vendor.toLowerCase();
        const productType = product.productType?.toLowerCase() || '';
        const tags = product.tags.map(tag => tag.toLowerCase());

        return (
          title.includes(searchQuery) ||
          vendor.includes(searchQuery) ||
          productType.includes(searchQuery) ||
          tags.some(tag => tag.includes(searchQuery)) ||
          title.startsWith(searchQuery.slice(0, 4))
        );
      })
      .map(product => ({
        title: product.title,
        author: product.vendor,
        link: `https://www.bookstaa.com/products/${product.handle}`,
        image: product.images.edges[0]?.node?.url || '',
        altText: product.images.edges[0]?.node?.altText || product.title,
        price: parseFloat(product.variants.edges[0]?.node?.price.amount || 0).toFixed(2),
        currency: product.variants.edges[0]?.node?.price.currencyCode || 'INR',
        tags: product.tags
      }));

    return res.status(200).json({ products });

  } catch (error) {
    console.error('Search error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
