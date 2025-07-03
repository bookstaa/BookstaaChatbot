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
    const queryTokens = normQuery.split(' ').filter(Boolean);

    // 🔁 Step 1: Synonym Mapping
    const synonymMap = {
      kids: ['children', 'child', 'young readers', 'youth'],
      children: ['kids', 'child', 'young'],
      sandhu: ['jatinder sandhu', 'jatinder pal singh sandhu'],
      jatinder: ['sandhu', 'jatinder pal singh sandhu'],
      beginner: ['introductory', 'starter', 'basic'],
      astrology: ['jyotish', 'jyotisha', 'vedic astrology'],
      sanskrit: ['vedic'],
      yoga: ['meditation', 'asanas'],
      hindi: ['devanagari']
    };

    const expandedTokens = [...queryTokens];
    queryTokens.forEach(token => {
      if (synonymMap[token]) {
        expandedTokens.push(...synonymMap[token].map(normalize));
      }
    });

    // 📦 Fetch full product list from JSON (Google Drive)
    const jsonRes = await fetch(BOOKSTAA_JSON_URL);
    const products = await jsonRes.json();

    const results = [];

    for (const product of products) {
      // 🧱 Normalize core fields including handle
      const fields = {
        title: normalize(product.title),
        vendor: normalize(product.vendor),
        productType: normalize(product.productType),
        description: normalize(product.description),
        tags: (product.tags || []).map(normalize).join(' '),
        handle: normalize(product.handle?.replace(/-/g, ' ')) || ''
      };

      const metafields = product.metafields?.books || {};
      const metafieldMap = {
        author01: normalize(metafields['author01'] || ''),
        isbn: normalize(metafields['book_isbn'] || ''),
        language: normalize(metafields['language'] || ''),
        readers_category: normalize(metafields['readers_category'] || ''),
        author_location: normalize(metafields['author_location'] || '')
      };

      // 🎯 Step 2: Smart Weighted Scoring
      let score = 0;
      let matchedTokens = new Set();

      // 🎯 Match query tokens to main fields
      for (const field in fields) {
        const value = fields[field];
        for (const token of expandedTokens) {
          if (value.includes(token)) {
            matchedTokens.add(token);
            if (field === 'title') score += 100;
            else if (field === 'handle') score += 100; // highest priority
            else if (field === 'vendor') score += 50;
            else if (field === 'tags') score += 40;
            else if (field === 'description') score += 20;
            else score += 10;
          }
        }
      }

      // 🎯 Match tokens to metafields
      for (const [key, value] of Object.entries(metafieldMap)) {
        for (const token of expandedTokens) {
          if (value.includes(token)) {
            matchedTokens.add(token);
            if (key === 'author01') score += 80;
            else if (key === 'readers_category') score += 70;
            else if (key === 'isbn') score += 65;
            else if (key === 'author_location') score += 60;
            else if (key === 'language') score += 50;
            else score += 30;
          }
        }
      }

      // 🔍 Step 3: Fuzzy Bonus
      if ((fields.title || '').startsWith(fuzzy) || (metafieldMap['author01'] || '').startsWith(fuzzy)) {
        score += 15;
      }

      // 🧠 Bonus: Total matched tokens = more relevant product
      score += matchedTokens.size * 12;

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

    // 🧹 Final Sort by Score
    results.sort((a, b) => b.score - a.score);

    if (results.length === 0) {
      return res.status(200).json({
        products: [],
        text: `❓ No match found for **${query}**.\n\nTry searching by:\n• Book **title**, **author**, or **ISBN**\n• Example: *Yoga in Hindi*, *Devdutt Pattanaik*, *9781234567890*\n\n📩 Suggest a book at [feedback@bookstaa.com](mailto:feedback@bookstaa.com)`
      });
    }

    // ✅ Return top 10
    return res.status(200).json({ products: results.slice(0, 10) });

  } catch (err) {
    console.error('❌ search-products fatal error:', err);
    return res.status(500).json({ error: 'Search failed', details: err.message });
  }
};
