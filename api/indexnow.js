export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST method is allowed' });
  }

  const INDEXNOW_API_KEY = 'f957624a77ca4beea15944d6ee307b97';

  const body = {
    host: 'bookstaa.com',
    key: INDEXNOW_API_KEY,
    keyLocation: `https://bookstaa.com/${INDEXNOW_API_KEY}.txt`,
    urlList: req.body.urls || []
  };

  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const text = await response.text();
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ message: 'IndexNow request failed', error: err.message });
  }
}
