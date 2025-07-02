// lib/smartSearch.js
const fs = require('fs');
const path = require('path');

const allBooks = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../bookstaa-products.json'), 'utf-8')
);

// Normalize for loose fuzzy matching
const normalize = str =>
  str?.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

// Fuzzy match core logic
function smartSearch(query) {
  if (!query || query.trim().length < 2) return [];

  const normalizedQuery = normalize(query);
  const keyword = normalizedQuery.slice(0, 4); // Fuzzy: first 4 letters

  return allBooks
    .map(book => {
      const score = computeScore(book, normalizedQuery, keyword);
      return { ...book, _score: score };
    })
    .filter(b => b._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 5); // Return top 5 matches
}

function computeScore(book, normalizedQuery, keyword) {
  let score = 0;
  const fields = [
    book.title,
    book.author,
    book.vendor,
    book.tags?.join(' '),
    book.product_type,
  ];

  for (const field of fields) {
    const text = normalize(field);
    if (!text) continue;

    if (text.includes(normalizedQuery)) score += 10;
    else if (text.includes(keyword)) score += 5;
    else if (text.split(' ').some(word => word.startsWith(keyword))) score += 2;
  }

  return score;
}

module.exports = { smartSearch };
