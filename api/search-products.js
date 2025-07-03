// 📦 Imports & Config
const fetch = require('node-fetch');
const normalize = (str) => str?.toLowerCase().replace(/[^a-z0-9\s]/gi, '').trim() || '';

const BOOKSTAA_JSON_URL = process.env.BOOKSTAA_JSON_URL;

module.exports = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Missing query' });
    }

    const normQuery = normalize(query);
    const fuzzy = normQuery.slice(0, 5);
    const isISBN = /^\d{10,13}$/.test(query.trim());

    // 📦 Fetch full product list from Google Drive
    const jsonRes = await fetch(BOOKSTAA_JSON_URL);
    const products = await jsonRes.json();

    const results = [];

    for (const product of products) {
      // Normalize core fields
      const fields = {
        title: normalize(product.title),
        vendor: normalize(product.vendor),
        productType: normalize(product.productType),
        description: normalize(product.description),
        tags: (product.tags || []).map(normalize).join(' ')
      };

      const metafields = product.metafields || {};
      const metafieldMap = {
        author01: normalize(metafields['author01'] || ''),
        isbn: normalize(metafields['Book-ISBN'] || ''),
        language: normalize(metafields['language'] || ''),
        readers_category: normalize(metafields['readers_category'] || ''),
        author_location: normalize(metafields['author_location'] || '')
      };

      // 🎯 Weighted scoring
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
          else if (key === 'isbn') score += 65;
          else if (key === 'author_location') score += 60;
          else if (key === 'language') score += 50;
          else score += 30;
        }
      }

      // 🔍 Fuzzy bonus
      if ((fields.title || '').startsWith(fuzzy) || (metafieldMap['author01'] || '').startsWith(fuzzy)) {
        score += 15;
      }

      if (score > 0) {
        const price = parseFloat(product.price || '0');
        const compare = parseFloat(product.compareAtPrice || '0');
        const discount = compare > price ? Math.round(((compare - price) / compare) * 100) : 0;

        results.push({
          title: product.title,
          author: metafieldMap['author01'] || '',
          price: `₹${price}`,
          image: product.image || '',
          url: `https://www.bookstaa.com/products/${product.handle}`,
          discount: discount > 0 ? `${discount}% OFF` : '',
          score
        });
      }
    }

    // Sort results by score
    results.sort((a, b) => b.score - a.score);

    if (results.length === 0) {
      return res.status(200).json({
        products: [],
        text: `❓ No match found for **${query}**.\n\nTry searching by:\n• Book **title**, **author**, or **ISBN**\n• Example: *Yoga in Hindi*, *Devdutt Pattanaik*, *9781234567890*\n\n📩 Suggest a book at [feedback@bookstaa.com](mailto:feedback@bookstaa.com)`
      });
    }

    // ✅ Return top 10 results
    return res.status(200).json({ products: results.slice(0, 10) });

  } catch (err) {
    console.error('❌ search-products fatal error:', err);
    return res.status(500).json({ error: 'Search failed', details: err.message });
  }
};
