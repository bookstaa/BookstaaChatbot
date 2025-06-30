const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const INPUT_CSV = path.join(__dirname, '..', 'products_export_1.csv');
const OUTPUT_JSON = path.join(__dirname, 'bookstaa_data.json');

const results = [];

fs.createReadStream(INPUT_CSV)
  .pipe(csv())
  .on('data', (row) => {
    // Skip empty or non-product rows
    if (!row.Title || !row['Variant Price']) return;

    results.push({
      handle: row.Handle,
      title: row.Title,
      author: row['Vendor'] || '',
      type: row['Type'] || '',
      tags: row['Tags'] ? row['Tags'].split(',').map(t => t.trim()) : [],
      description: row['Body (HTML)'] || '',
      price: row['Variant Price'],
      currency: row['Variant Currency'] || 'INR',
      image: row['Image Src'] || '',
      link: `https://www.bookstaa.com/products/${row.Handle}`,
      metafields: {
        isbn: row['Variant SKU'] || '',
        vendor: row['Vendor'] || '',
        compareAtPrice: row['Variant Compare At Price'] || '',
        weight: row['Variant Grams'] || '',
        options: {
          option1: row['Option1 Value'] || '',
          option2: row['Option2 Value'] || '',
        }
      }
    });
  })
  .on('end', () => {
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`✅ Extracted ${results.length} products to ${OUTPUT_JSON}`);
  });
