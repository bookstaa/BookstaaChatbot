// 📦 Imports & Config
const fetch = require('node-fetch');

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_STOREFRONT_API_TOKEN = process.env.SHOPIFY_STOREFRONT_API_TOKEN;
const gql = String.raw;

const normalize = (str) => str?.toLowerCase().replace(/[^a-z0-9\s]/gi, '').trim() || '';

module.exports = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Missing query' });
    }

    const normQuery = normalize(query);
    const fuzzy = normQuery.slice(0, 5);
    const isISBN = /^\d{10,13}$/.test(query.trim());

    // 📦 Fetch products
    const shopifyRes = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`, {
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
                    edges { node { url } }
                  }
                  variants(first: 10) {
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

    const json = await shopifyRes.json();
    if (!json?.data?.products) {
      console.error('⚠️ Shopify API returned invalid data:', json);
      return res.status(500).json({ error: 'Shopify API error', details: json });
    }

    const products = json.data.products.edges.map(edge => edge.node);
    const results = [];

    for (const product of products) {
      // Normalize all main fields
      const fields = {
        title: normalize(product.title),
        vendor: normalize(product.vendor),
        productType: normalize(product.productType),
        description: normalize(product.description),
        tags: (product.tags || []).map(normalize).join(' ')
      };

      // Collect and normalize metafields
      const metafieldMap = {};
      for (const m of product.metafields || []) {
        if (m?.key && m?.value) {
          metafieldMap[m.key] = normalize(m.value);
        }
      }

      // 🎯 Smart weighted scoring
      let score = 0;

      for (const field in fields) {
        const value = fields[field];
        if (typeof value === 'string' && value.includes(normQuery)) {
          if (field === 'title') score += 100;
          else if (field === 'vendor') score += 50;
          else if (field === 'tags') score += 40;
          else if (field === 'description') score += 20;
          else score += 10;
        }
      }

      for (const [key, value] of Object.entries(metafieldMap)) {
        if (value.includes(normQuery)) {
          if (key === 'author01') score += 80;
          else if (key === 'readers_category') score += 70;
          else if (key === 'Book-ISBN') score += 65;
          else if (key === 'author_location') score += 60;
          else if (key === 'language') score += 50;
          else score += 30;
        }
      }

      // Bonus for fuzzy match
      if ((fields.title || '').startsWith(fuzzy) || (metafieldMap['author01'] || '').startsWith(fuzzy)) {
        score += 15;
      }

      if (score > 0) {
        const variant = product.variants.edges.find(v =>
          normalize(v.node.title).includes('paperback')
        )?.node || product.variants.edges[0]?.node;

        const price = parseFloat(variant?.price?.amount || '0');
        const compare = parseFloat(variant?.compareAtPrice?.amount || '0');
        const discount = compare > price ? Math.round(((compare - price) / compare) * 100) : 0;

        results.push({
          title: product.title,
          author: metafieldMap['author01'] || '',
          price: `₹${price}`,
          image: product.images?.edges?.[0]?.node?.url || '',
          url: `https://www.bookstaa.com/products/${product.handle}`,
          discount: discount > 0 ? `${discount}% OFF` : '',
          score
        });
      }
    }

    // Sort & Respond
    results.sort((a, b) => b.score - a.score);

    if (results.length === 0) {
      return res.status(200).json({
        products: [],
        text: `❓ No match found for **${query}**.\n\nTry searching by:\n• Book **title**, **author**, or **ISBN**\n• Example: *Yoga in Hindi*, *Devdutt Pattanaik*, *9781234567890*\n\n📩 Suggest a book at [feedback@bookstaa.com](mailto:feedback@bookstaa.com)`
      });
    }

    return res.status(200).json({ products: results.slice(0, 6) }); // Return top 6

  } catch (err) {
    console.error('❌ search-products fatal error:', err);
    return res.status(500).json({ error: 'Search failed', details: err.message });
  }
};
