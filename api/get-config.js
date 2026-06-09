export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const token = process.env.GITHUB_TOKEN;
  const REPO = 'ariion/aardesign';
  const FILE = 'data/site-config.json';
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, { headers });
    if (!r.ok) return res.status(r.status).json({ error: 'GitHub error' });
    const d = await r.json();
    const content = JSON.parse(Buffer.from(d.content, 'base64').toString('utf8'));
    return res.status(200).json(content);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
