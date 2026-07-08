export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(200).json({ error: 'Clé API manquante (ANTHROPIC_API_KEY sur Vercel).' });

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

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme exacte :
{"context":"...","objective":"...","approach":"...","result":"..."}

- context : le contexte / le brief / le besoin du client.
- objective : ce qu'il fallait atteindre.
- approach : ma démarche concrète (étapes, choix, outils).
- result : le rendu final et son impact (reste factuel ; si rien de mesurable, décris le résultat visuel).`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(200).json({ error: data?.error?.message || 'Erreur API Claude.' });

    let text = (data.content || []).map(b => b.text || '').join('').trim();
    // isole le JSON même si le modèle a ajouté du texte
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
