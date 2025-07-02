const fs = require('fs');
const path = require('path');

// ✅ Load all products from local JSON
const allBooks = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../bookstaa-products.json'), 'utf-8')
);

// ✅ Normalize string for matching
const normalize = str =>
  str?.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() || '';

function searchBooks(query, maxPrice = null) {
  const normalizedQuery = normalize(query);
  const keywords = normalizedQuery.split(/\s+/);

  const isISBN = /^\d{10,13}$/.test(query.trim());

  const matches = allBooks.filter(book => {
    // 🔍 Searchable fields
    const fieldsToSearch = [
      book.title,
      book.vendor,
      book.type,
      ...(book.tags || []),
      book.metafields?.author01,
      book.metafields?.subcategory,
      book.metafields?.language,
      book.metafields?.keywords,
      book.metafields?.isbn_13
    ]
      .filter(Boolean)
      .map(normalize)
      .join(' ');

    // 🔍 Match if all words are partially found (fuzzy match)
    const fuzzyMatch = keywords.every(word => fieldsToSearch.includes(word) || fieldsToSearch.startsWith(word));

    // 🔍 If it's an ISBN search, match exactly
    const isbnMatch = isISBN && (book.metafields?.isbn_13?.includes(query.trim()) || book.title.includes(query.trim()));

    const withinPrice = maxPrice ? parseFloat(book.price) <= maxPrice : true;

    return (fuzzyMatch || isbnMatch) && withinPrice;
  });

  // 📊 Sort low to high price
  return matches.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
}

module.exports = { searchBooks };
