export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Fournisseurs gratuits : Groq (prioritaire si présent) ou Google Gemini.
  const groqKey = process.env.GROQ_API_KEY;
  const key = process.env.GEMINI_API_KEY;
  if (!groqKey && !key) return res.status(200).json({ error: 'Clé API manquante (GROQ_API_KEY ou GEMINI_API_KEY sur Vercel).' });

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

  const parseOut = (text) => {
    const m = text && text.match(/\{[\s\S]*\}/);
    if (m) text = m[0];
    try {
      const out = JSON.parse(text);
      return { context: out.context || '', objective: out.objective || '', approach: out.approach || '', result: out.result || '' };
    } catch (_) { return null; }
  };

  // ── Groq (gratuit, très fiable) ──
  if (groqKey) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + groqKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          max_tokens: 1024,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const data = await r.json();
      if (r.ok) {
        const txt = (((data.choices || [])[0] || {}).message || {}).content || '';
        const out = parseOut(txt);
        if (out) return res.status(200).json(out);
      }
      // sinon on retombe sur Gemini si dispo
      if (!key) return res.status(200).json({ error: data?.error?.message || 'Erreur API Groq.' });
    } catch (e) {
      if (!key) return res.status(200).json({ error: 'Erreur réseau : ' + e.message });
    }
  }

  // ── Google Gemini : on essaie plusieurs modèles selon le quota du compte ──
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
  let lastErr = 'Erreur API Gemini.';

  try {
    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024, responseMimeType: 'application/json' }
        })
      });
      const data = await r.json();

      if (!r.ok) {
        lastErr = data?.error?.message || lastErr;
        // quota épuisé ou modèle indisponible → on tente le suivant
        if (r.status === 429 || r.status === 404 || r.status === 400) continue;
        return res.status(200).json({ error: lastErr });
      }

      let text = (((data.candidates || [])[0] || {}).content || {}).parts;
      text = Array.isArray(text) ? text.map(p => p.text || '').join('').trim() : '';
      const out = parseOut(text);
      if (!out) continue;
      return res.status(200).json(out);
    }
    // aucun modèle n'a répondu
    const friendly = /quota|limit:\s*0/i.test(lastErr)
      ? 'Quota gratuit épuisé pour le moment — réessaie dans une minute.'
      : lastErr;
    return res.status(200).json({ error: friendly });
  } catch (e) {
    return res.status(200).json({ error: 'Erreur réseau : ' + e.message });
  }
}
