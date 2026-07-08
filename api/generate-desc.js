export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Clé Google Gemini (gratuite) — aistudio.google.com/apikey
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(200).json({ error: 'Clé API manquante (GEMINI_API_KEY sur Vercel).' });

  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }

  const { title, client, year, role, tags, discipline } = body;
  if (!title || !title.trim()) return res.status(200).json({ error: 'Ajoute au moins un titre de projet.' });

  const facts = [
    `Titre du projet : ${title}`,
    discipline ? `Discipline / dossier : ${discipline}` : '',
    client ? `Client : ${client}` : '',
    year ? `Année : ${year}` : '',
    role ? `Rôle : ${role}` : '',
    (Array.isArray(tags) && tags.length) ? `Outils / techniques : ${tags.join(', ')}` : ''
  ].filter(Boolean).join('\n');

  const prompt = `Tu écris les descriptions d'un projet pour le portfolio d'Anthony Armand, Directeur Artistique (digital painting, identité visuelle, packaging, illustration, web).

Voici les infos du projet :
${facts}

Rédige, à la première personne (« je »), un ton professionnel, concret et sobre — pas de superlatifs creux, pas de jargon marketing. Textes courts (2 à 4 phrases chacun). En français.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour ni balises Markdown, de cette forme exacte :
{"context":"...","objective":"...","approach":"...","result":"..."}

- context : le contexte / le brief / le besoin du client.
- objective : ce qu'il fallait atteindre.
- approach : ma démarche concrète (étapes, choix, outils).
- result : le rendu final et son impact (reste factuel ; si rien de mesurable, décris le résultat visuel).`;

  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + encodeURIComponent(key);
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024, responseMimeType: 'application/json' }
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(200).json({ error: data?.error?.message || 'Erreur API Gemini.' });

    let text = (((data.candidates || [])[0] || {}).content || {}).parts;
    text = Array.isArray(text) ? text.map(p => p.text || '').join('').trim() : '';
    const m = text.match(/\{[\s\S]*\}/);
    if (m) text = m[0];
    let out;
    try { out = JSON.parse(text); } catch (_) { return res.status(200).json({ error: 'Réponse non exploitable, réessaie.' }); }

    return res.status(200).json({
      context: out.context || '',
      objective: out.objective || '',
      approach: out.approach || '',
      result: out.result || ''
    });
  } catch (e) {
    return res.status(200).json({ error: 'Erreur réseau : ' + e.message });
  }
}
