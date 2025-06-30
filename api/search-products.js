const fetch = require('node-fetch');

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_API_KEY = process.env.SHOPIFY_STOREFRONT_TOKEN_KEY;

module.exports = async (req, res) => {
  const { q } = req.query;

  if (!SHOPIFY_DOMAIN || !SHOPIFY_API_KEY) {
    return res.status(500).json({ error: 'Missing Shopify environment variables' });
  }

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing search query' });
  }

  try {
    const query = `
      {
        products(first: 100, query: "${q}") {
          edges {
            node {
              title
              handle
              vendor
              productType
              tags
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
      body: JSON.stringify({ query })
    });

    const data = await response.json();

    if (!data?.data?.products) {
      return res.status(500).json({ error: 'Shopify API error', details: data.errors || [] });
    }

    const searchTerm = q.trim().toLowerCase();

    const products = data.data.products.edges
      .map(edge => edge.node)
      .filter(product => {
        const title = product.title?.toLowerCase() || '';
        const vendor = product.vendor?.toLowerCase() || '';
        const productType = product.productType?.toLowerCase() || '';
        const tags = (product.tags || []).map(tag => tag.toLowerCase());

        return (
          title.includes(searchTerm) ||
          vendor.includes(searchTerm) ||
          productType.includes(searchTerm) ||
          tags.some(tag => tag.includes(searchTerm)) ||
          title.startsWith(searchTerm.slice(0, 4)) // fuzzy match first 4 chars
        );
      })
      .map(product => ({
        title: product.title,
        author: product.vendor,
        link: `https://www.bookstaa.com/products/${product.handle}`,
        image: product.images.edges[0]?.node?.url || '',
        altText: product.images.edges[0]?.node?.altText || product.title,
        price: parseFloat(product.variants.edges[0]?.node?.price.amount || 0).toFixed(0),
        currency: product.variants.edges[0]?.node?.price.currencyCode || 'INR',
        tags: product.tags
      }));

    return res.status(200).json({ products });

  } catch (err) {
    console.error('Search API error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
