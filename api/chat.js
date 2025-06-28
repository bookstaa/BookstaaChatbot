export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const testFetch = await fetch('https://b80e25.myshopify.com/api/2024-01/graphql.json', {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '{ shop { name } }'
      })
    });

    const raw = await testFetch.text();
    console.log('✅ Shopify Raw:', raw);

    try {
      const parsed = JSON.parse(raw);
      return res.status(200).json({ data: parsed });
    } catch (jsonError) {
      console.error('❌ JSON Parse Error:', jsonError.message);
      return res.status(500).send(`Invalid JSON: ${raw.slice(0, 100)}...`);
    }

  } catch (err) {
    console.error('❌ General Error:', err.message);
    return res.status(500).send(`Server Error: ${err.message}`);
  }
}
