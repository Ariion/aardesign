export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'max-age=60');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = process.env.GITHUB_TOKEN;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    ...(token ? { 'Authorization': `token ${token}` } : {})
  };

  try {
    const r = await fetch('https://api.github.com/repos/ariion/aardesign/git/trees/main?recursive=1', { headers });
    if (!r.ok) return res.status(r.status).json({ error: 'GitHub API error' });
    const data = await r.json();
    const images = (data.tree || [])
      .filter(f => f.type === 'blob' && f.path.startsWith('assets/') && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f.path))
      .map(f => f.path);
    return res.status(200).json({ images });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
