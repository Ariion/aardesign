export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN non configuré dans Vercel' });

  const { dataUrl, filename } = req.body || {};
  if (!dataUrl || !filename) return res.status(400).json({ error: 'dataUrl et filename requis' });

  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return res.status(400).json({ error: 'dataUrl invalide (attendu: data:<mime>;base64,<...>)' });
  const base64 = m[2];

  // Une image encodée en base64 pèse ~1.33x son poids réel — au-delà d'environ 3 Mo de base64
  // (~2.2 Mo réels) on approche la limite de payload des fonctions Vercel (4.5 Mo), donc on
  // refuse proprement plutôt que de laisser échouer silencieusement côté plateforme.
  if (base64.length > 3_500_000) {
    return res.status(413).json({ error: 'Image trop lourde même après compression — réessaie avec un fichier plus petit.' });
  }

  const REPO = 'ariion/aardesign';
  const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const path = `assets/uploads/${Date.now()}-${safeName}`;
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  try {
    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ message: 'Upload image via admin', content: base64 })
    });
    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      return res.status(500).json({ error: err.message || `GitHub error ${putRes.status}` });
    }
    return res.status(200).json({ ok: true, path });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
