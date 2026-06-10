export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN non configuré dans Vercel' });

  const { config } = req.body;
  if (!config) return res.status(400).json({ error: 'Pas de config fournie' });

  const REPO = 'ariion/aardesign';
  const FILE = 'data/site-config.json';
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  try {
    // Lire la config actuelle
    let sha = '', existing = {};
    const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, { headers });
    if (getRes.ok) {
      const d = await getRes.json();
      sha = d.sha || '';
      try { existing = JSON.parse(Buffer.from(d.content, 'base64').toString('utf8')); } catch(_) {}
    }

    // Protection : ne jamais écraser aar_portfolio avec un objet vide si l'existant a des données
    const merged = { ...existing, ...config };
    if ((!config.aar_portfolio || Object.keys(config.aar_portfolio).length === 0) && existing.aar_portfolio && Object.keys(existing.aar_portfolio).length > 0) {
      merged.aar_portfolio = existing.aar_portfolio;
    }

    const content = Buffer.from(JSON.stringify(merged, null, 2)).toString('base64');
    const body = { message: 'Update site config', content };
    if (sha) body.sha = sha;

    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
      method: 'PUT', headers, body: JSON.stringify(body)
    });


    if (!putRes.ok) {
      const err = await putRes.json();
      return res.status(500).json({ error: err.message || putRes.status });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
