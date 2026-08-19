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
    // L'API Contents de GitHub ne renvoie le contenu en base64 (champ "content") que pour
    // les fichiers < 1 Mo. Au-delà, "content" est vide sans erreur explicite — le fichier
    // grossit avec les images des projets, donc on demande directement le média "raw" qui,
    // lui, n'a pas cette limite (jusqu'à 100 Mo).
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
      headers: { ...headers, 'Accept': 'application/vnd.github.raw' }
    });
    if (!r.ok) return res.status(r.status).json({ error: 'GitHub error' });
    const content = await r.json();
    return res.status(200).json(content);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
