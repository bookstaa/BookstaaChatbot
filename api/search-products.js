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
    const fuzzy = q.slice(0, 5); // first 5 characters

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
                  variants(first: 5) {
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
      const metafields = {};

      for (const m of product.metafields || []) {
        if (m?.key && m?.value) {
          metafields[m.key] = normalize(m.value);
        }
      }

      const author = metafields['author01'] || '';
      const isbn = metafields['Book-ISBN'] || '';
      const language = metafields['language'] || '';
      const readersCategory = metafields['readers_category'] || '';
      const authorLocation = metafields['author_location'] || '';

      // 🔍 Smart matching logic — in order of priority
      let match = false;

      // 1. Title Match
      if (title.includes(q)) match = true;

      // 2. Author Match
      else if (author.includes(q) || q.split(' ').every(word => author.includes(word))) match = true;

      // 3. Metafield Match (readers_category, ISBN, language, author_location)
      else if (
        (isISBN && isbn.includes(q)) ||
        readersCategory.includes(q) ||
        language.includes(q) ||
        authorLocation.includes(q)
      ) {
        match = true;
      }

      // 4. Tags, vendor, productType, description
      else if (
        tags.some(tag => tag.includes(q)) ||
        vendor.includes(q) ||
        productType.includes(q) ||
        description.includes(q)
      ) {
        match = true;
      }

      // 5. Fuzzy match on title or author
      else if (title.startsWith(fuzzy) || author.startsWith(fuzzy)) {
        match = true;
      }

      // 📦 Get paperback variant only
      const variant = product.variants.edges.find(v =>
        normalize(v.node.title).includes('paperback')
      )?.node;

      if (match && variant) {
        const price = parseFloat(variant.price?.amount || '0');
        const compare = parseFloat(variant.compareAtPrice?.amount || '0');
        const discount = compare > price ? Math.round(((compare - price) / compare) * 100) : 0;

        results.push({
          title: product.title,
          author: author || '',
          price: `₹${price}`,
          image: product.images.edges[0]?.node.url || '',
          url: `https://www.bookstaa.com/products/${product.handle}`,
          discount: discount > 0 ? `${discount}% OFF` : '',
        });
      }
    }

    // 🛑 No results found — show helpful fallback
    if (results.length === 0) {
      return res.status(200).json({
        products: [],
        text: `❓ No match found for **${query}**. Try again with a specific book title, author, or ISBN.\n\n📩 You can also email us at [feedback@bookstaa.com](mailto:feedback@bookstaa.com) to suggest or request a book!`,
      });
    }

    // ✅ Results found
    res.status(200).json({ products: results });

  } catch (err) {
    console.error('❌ search-products fatal error:', err);
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
};
