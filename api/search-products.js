// --- START: Required Modules & Environment Variables ---
const fetch = require('node-fetch');

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_API_KEY = process.env.SHOPIFY_STOREFRONT_API_TOKEN;
// --- END: Required Modules & Environment Variables ---

// --- START: Main Search Endpoint ---
module.exports = async (req, res) => {
  const { q } = req.query;

  if (!SHOPIFY_DOMAIN || !SHOPIFY_API_KEY) {
    return res.status(500).json({ error: 'Missing Shopify environment variables' });
  }

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing search query' });
  }

  const trimmedQuery = q.trim();
  const isISBN = /^\d{10}(\d{3})?$/.test(trimmedQuery); // --- Detect 10 or 13 digit ISBN

  try {
    // --- START: Build GraphQL Query ---
    const query = `
      {
        products(first: 100, query: "${trimmedQuery}") {
          edges {
            node {
              title
              handle
              vendor
              productType
              tags
              description
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 5) {
                edges {
                  node {
                    title
                    price {
                      amount
                      currencyCode
                    }
                    compareAtPrice {
                      amount
                    }
                  }
                }
              }
              metafields(first: 10) {
                edges {
                  node {
                    namespace
                    key
                    value
                  }
                }
              }
            }
          }
        }
      }
    `;
    // --- END: Build GraphQL Query ---

    // --- START: Shopify API Call ---
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
    // --- END: Shopify API Call ---

    const searchTerm = trimmedQuery.toLowerCase();

    // --- START: Product Filtering ---
    const products = data.data.products.edges
      .map(edge => edge.node)
      .filter(product => {
        const title = product.title?.toLowerCase() || '';
        const vendor = product.vendor?.toLowerCase() || '';
        const tags = (product.tags || []).map(tag => tag.toLowerCase());
        const description = product.description?.toLowerCase() || '';

        // Extract metafields
        const metafields = {};
        product.metafields?.edges.forEach(({ node }) => {
          metafields[node.key.toLowerCase()] = node.value?.toLowerCase() || '';
        });

        const authors = metafields['authors'] || '';
        const isbn13 = metafields['isbn 13'] || '';
        const language = metafields['book language'] || '';
        const authorLocation = metafields['author location'] || '';
        const readersCategory = metafields['readers category'] || '';

        return (
          // Priority 1: Title
          title.includes(searchTerm) ||

          // Priority 2: Author Name
          authors.includes(searchTerm) ||

          // Priority 3: Metadata matches
          isbn13.includes(searchTerm) ||
          readersCategory.includes(searchTerm) ||
          language.includes(searchTerm) ||
          authorLocation.includes(searchTerm) ||

          // Priority 4: Tags or Description
          tags.some(tag => tag.includes(searchTerm)) ||
          description.includes(searchTerm) ||

          // Priority 5: Fuzzy match
          title.startsWith(searchTerm.slice(0, 4)) ||
          authors.startsWith(searchTerm.slice(0, 4)) ||

          // Priority 6: ISBN match
          (isISBN && isbn13.includes(trimmedQuery))
        );
      })
      .map(product => {
        // Get first Paperback variant or fallback to first variant
        const variant = product.variants.edges.find(v => 
          v.node.title?.toLowerCase().includes("paperback")
        ) || product.variants.edges[0];

        const price = parseFloat(variant?.node?.price?.amount || 0).toFixed(0);
        const compareAt = parseFloat(variant?.node?.compareAtPrice?.amount || 0).toFixed(0);
        const discount = compareAt && compareAt > price
          ? `${Math.round(((compareAt - price) / compareAt) * 100)}% off`
          : null;

        return {
          title: product.title,
          author: product.vendor,
          image: product.images.edges[0]?.node?.url || '',
          altText: product.images.edges[0]?.node?.altText || product.title,
          price,
          compareAt,
          discount,
          currency: variant?.node?.price?.currencyCode || 'INR',
          link: `https://www.bookstaa.com/products/${product.handle}`,
          tags: product.tags
        };
      });
    // --- END: Product Filtering ---

    if (!products.length) {
      return res.status(200).json({
        products: [],
        message: "No products found. Please try again or email feedback@bookstaa.com"
      });
    }

    return res.status(200).json({ products });

  } catch (err) {
    console.error('Search API error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
// --- END: Main Search Endpoint ---
