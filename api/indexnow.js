export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST method is allowed' });
  }

  const body = {
    host: 'bookstaa.com',
    key: 'YOUR_INDEXNOW_KEY',
    keyLocation: 'https://bookstaa.com/YOUR_INDEXNOW_KEY.txt',
    urlList: req.body.urls || []
  };

  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const result = await response.text();
  res.status(200).send(result);
}

