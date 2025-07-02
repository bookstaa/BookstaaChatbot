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
    const q = normalize(query);
    const fuzzy = q.slice(0, 5);

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
                      node { url }
                    }
                  }
                  variants(first: 1) {
                    edges {
                      node {
                        title
                        price { amount }
                        compareAtPrice { amount }
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
    if (!result?.data?.products) {
      console.error('⚠️ Shopify API did not return products:', result);
      return res.status(500).json({ error: 'Shopify API error', details: result });
    }

    const products = result.data.products.edges.map(edge => edge.node);
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
        if (m?.key && m?.value) {
          metafields[m.key] = normalize(m.value);
        }
      }

      const author = metafields['author01'] || '';
      const authorMatch = normalize(author).includes(q) || q.split(' ').every(word => author.includes(word));
      const fuzzyMatch = title.startsWith(fuzzy) || author.startsWith(fuzzy);

      const match =
        title.includes(q) ||
        authorMatch ||
        (isISBN && metafields['Book-ISBN']?.includes(q)) ||
        metafields['language']?.includes(q) ||
        metafields['readers_category']?.includes(q) ||
        metafields['author_location']?.includes(q) ||
        tags.some(tag => tag.includes(q)) ||
        vendor.includes(q) ||
        description.includes(q) ||
        productType.includes(q) ||
        fuzzyMatch;

      const isPaperback = variantTitle.includes('paperback');

      if (match && isPaperback) {
        const price = parseFloat(variant.price?.amount || '0');
        const compare = parseFloat(variant.compareAtPrice?.amount || '0');
        const discount = compare > price ? Math.round(((compare - price) / compare) * 100) : 0;

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

    if (results.length === 0) {
      return res.status(200).json({
        products: [],
        text: `❓ No match found for **${query}**. Try again with a specific book title, author, or ISBN.\n\n📩 You can also email us at [feedback@bookstaa.com](mailto:feedback@bookstaa.com) to suggest or request a book!`,
      });
    }

    res.status(200).json({ products: results });

  } catch (err) {
    console.error('❌ search-products fatal error:', err);
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
};
