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
    // Lire la config actuelle. Deux appels : un pour le sha (nécessaire au PUT), un pour le
    // contenu en "raw" — l'API Contents ne renvoie "content" en base64 que pour les fichiers
    // < 1 Mo, et notre config le dépasse désormais (images des projets) ; au-delà elle serait
    // silencieusement vide, ce qui viderait "existing" et pourrait écraser des données réelles.
    let sha = '', existing = {};
    const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, { headers });
    if (getRes.ok) {
      const d = await getRes.json();
      sha = d.sha || '';
    }
    const rawRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
      headers: { ...headers, 'Accept': 'application/vnd.github.raw' }
    });
    if (rawRes.ok) {
      try { existing = await rawRes.json(); } catch(_) {}
    }

    // Protection : bloque uniquement une perte massive et suspecte (fichier vidé, navigateur
    // pas resynchronisé après une coupure) — pas une suppression normale d'un ou deux projets,
    // qui reste tout à fait légitime depuis l'admin.
    const countProjects = (pf) => {
      if (!pf || !pf._projects) return 0;
      return Object.values(pf._projects).reduce((n, arr) => n + (Array.isArray(arr) ? arr.length : 0), 0);
    };
    const merged = { ...existing, ...config };
    const existingCount = countProjects(existing.aar_portfolio);
    const incomingCount = countProjects(config.aar_portfolio);
    if (existingCount >= 4 && incomingCount < existingCount / 2) {
      merged.aar_portfolio = existing.aar_portfolio;
      merged._lastRejectedPortfolioSave = { at: new Date().toISOString(), incomingCount, existingCount };
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
