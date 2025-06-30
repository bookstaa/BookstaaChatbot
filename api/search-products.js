const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Missing query param `q`' });
  }

  const searchTerm = q.length >= 3 ? `${q.trim()}* OR ${q.slice(0, 3)}*` : `${q.trim()}*`;

  const storefrontDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const apiToken = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

  const storefrontQuery = `
    query($term: String!) {
      products(first: 10, query: $term) {
        edges {
          node {
            title
            handle
            featuredImage {
              url
              altText
            }
            tags
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
            metafields(namespace: "custom", first: 10) {
              edges {
                node {
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

  const response = await fetch(`https://${storefrontDomain}/api/2024-04/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': apiToken,
    },
    body: JSON.stringify({
      query: storefrontQuery,
      variables: { term: searchTerm },
    }),
  });

  const json = await response.json();
  const products = json.data.products.edges.map(({ node }) => {
    const authorField = node.metafields.edges.find(m => m.node.key === 'author');
    return {
      title: node.title,
      image: node.featuredImage?.url || null,
      altText: node.featuredImage?.altText || '',
      handle: node.handle,
      link: `https://${storefrontDomain}/products/${node.handle}`,
      price: node.variants.edges[0].node.price.amount,
      currency: node.variants.edges[0].node.price.currencyCode,
      author: authorField?.node.value || '—',
    };
  });

  if (products.length === 0) {
    return res.json({ products: [], suggestion: true });
  }

  return res.json({ products, suggestion: false });
};

