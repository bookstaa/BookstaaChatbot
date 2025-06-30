const fs = require('fs');
const path = require('path');

// ✅ Load all products from local JSON
const allBooks = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../bookstaa-products.json'), 'utf-8')
);

// ✅ Normalize string for loose matching
const normalize = str =>
  str?.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() || '';

function searchBooks(query, maxPrice = null) {
  const keywords = normalize(query).split(/\s+/);

  const matches = allBooks.filter(book => {
    const fieldsToSearch = [
      book.title,
      book.vendor,
      book.type,
      ...(book.tags || []),
      book.metafields?.author01,
      book.metafields?.subcategory,
      book.metafields?.language,
      book.metafields?.keywords
    ]
      .filter(Boolean)
      .map(normalize)
      .join(' ');

    const matchesAll = keywords.every(word => fieldsToSearch.includes(word));

    const withinPrice = maxPrice ? parseFloat(book.price) <= maxPrice : true;

    return matchesAll && withinPrice;
  });

  return matches.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
}

module.exports = { searchBooks };
