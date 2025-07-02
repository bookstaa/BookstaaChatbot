const fetch = require('node-fetch');

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_STOREFRONT_API_TOKEN = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

const gql = String.raw;

function normalize(str) {
  return str?.toLowerCase().replace(/[^a-z0-9\s]/gi, '').trim();
}

module.exports = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Missing query' });
    }

    const isISBN = /^\d{10}(\d{3})?$/.test(query.trim());

    const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_API_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: gql`
          {
            products(first: 100) {
              edges {
                node {
                  id
                  title
                  handle
                  vendor
                  productType
                  description
                  tags
                  images(first: 1) {
                    edges {
                      node {
                        url
                      }
                    }
                  }
                  variants(first: 1) {
                    edges {
                      node {
                        title
                        price {
                          amount
                        }
                        compareAtPrice {
                          amount
                        }
                      }
                    }
                  }
                  metafields(identifiers: [
                    { namespace: "Books", key: "author01" },
                    { namespace: "Books", key: "Book-ISBN" },
                    { namespace: "Books", key: "language" },
                    { namespace: "books", key: "readers_category" },
                    { namespace: "Books", key: "author_location" }
                  ]) {
                    key
                    value
                  }
                }
              }
            }
          }
        `,
      }),
    });

    const result = await response.json();

    if (!result || !result.data || !result.data.products) {
      console.error('⚠️ Shopify API did not return products:', JSON.stringify(result));
      return res.status(500).json({ error: 'Shopify API error', details: result });
    }

    const products = result.data.products.edges.map(edge => edge.node);
    const q = normalize(query);
    const results = [];

    for (const product of products) {
      const title = normalize(product.title);
      const description = normalize(product.description);
      const vendor = normalize(product.vendor);
      const productType = normalize(product.productType);
      const tags = product.tags.map(normalize);
      const variant = product.variants.edges[0]?.node || {};
      const variantTitle = normalize(variant.title);

      const metafields = {};
      for (const m of product.metafields || []) {
        if (m && m.key && m.value) {
          metafields[m.key] = normalize(m.value);
        }
      }

      // Author match logic
      const author = metafields['author01'] || '';
      const authorWords = author.split(' ');
      const qWords = q.split(' ');

      const exactAuthorMatch = normalize(author) === q;
      const partialAuthorMatch = qWords.every(qw => author.includes(qw)) && qWords.length > 1;

      const matches =
        title.includes(q) ||
        title.startsWith(q.slice(0, 5)) ||
        (isISBN && metafields['Book-ISBN']?.includes(q)) ||
        exactAuthorMatch ||
        partialAuthorMatch ||
        metafields['language']?.includes(q) ||
        metafields['readers_category']?.includes(q) ||
        metafields['author_location']?.includes(q) ||
        tags.some(tag => tag.includes(q)) ||
        vendor.includes(q) ||
        description.includes(q) ||
        productType.includes(q);

      if (matches) {
        const price = variant.price?.amount || 'N/A';
        const compare = variant.compareAtPrice?.amount || '';
        const discount =
          price && compare && Number(compare) > Number(price)
            ? Math.round(((compare - price) / compare) * 100)
            : 0;

        results.push({
          title: product.title,
          author: metafields['author01'] || '',
          price: `₹${price}`,
          image: product.images.edges[0]?.node.url || '',
          url: `https://www.bookstaa.com/products/${product.handle}`,
          discount: discount > 0 ? `${discount}% OFF` : '',
        });
      }
    }

    res.status(200).json({ products: results });
  } catch (err) {
    console.error('❌ search-products fatal error:', err);
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
};
