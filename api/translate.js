export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const groqKey = process.env.GROQ_API_KEY;
  const key = process.env.GEMINI_API_KEY;
  if (!groqKey && !key) return res.status(200).json({ error: 'Clé API manquante (GROQ_API_KEY ou GEMINI_API_KEY sur Vercel).' });

  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }

  const items = body.items && typeof body.items === 'object' ? body.items : null;
  if (!items || !Object.keys(items).length) return res.status(200).json({ error: 'Rien à traduire.' });

  const prompt = `Tu es traducteur professionnel FR → EN pour un portfolio de directeur artistique.
Traduis en anglais naturel et professionnel les VALEURS de l'objet JSON ci-dessous, sans toucher aux clés.
Règles :
- Garde les noms propres, marques et noms de personnes tels quels (Arsène Valentin, Clopinette, Optimind, aardesign, Caen…).
- Les listes de tags séparés par des virgules restent séparées par des virgules.
- Conserve un ton sobre, à la première personne quand c'est le cas.
- Réponds UNIQUEMENT avec un objet JSON valide ayant EXACTEMENT les mêmes clés, sans texte autour.

JSON à traduire :
${JSON.stringify(items)}`;

  const parseObj = (text) => {
    const m = text && text.match(/\{[\s\S]*\}/);
    if (m) text = m[0];
    try { return JSON.parse(text); } catch (_) { return null; }
  };

  // ── Groq prioritaire ──
  if (groqKey) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + groqKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.3,
          max_tokens: 4096,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const data = await r.json();
      if (r.ok) {
        const out = parseObj((((data.choices || [])[0] || {}).message || {}).content || '');
        if (out) return res.status(200).json({ translations: out });
      }
      if (!key) return res.status(200).json({ error: data?.error?.message || 'Erreur API Groq.' });
    } catch (e) { if (!key) return res.status(200).json({ error: 'Erreur réseau : ' + e.message }); }
  }

  // ── Gemini (fallback multi-modèles) ──
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
          generationConfig: { temperature: 0.3, maxOutputTokens: 4096, responseMimeType: 'application/json' }
        })
      });
      const data = await r.json();
      if (!r.ok) { lastErr = data?.error?.message || lastErr; if ([429, 404, 400].includes(r.status)) continue; return res.status(200).json({ error: lastErr }); }
      let text = (((data.candidates || [])[0] || {}).content || {}).parts;
      text = Array.isArray(text) ? text.map(p => p.text || '').join('').trim() : '';
      const out = parseObj(text);
      if (!out) continue;
      return res.status(200).json({ translations: out });
    }
    const friendly = /quota|limit:\s*0/i.test(lastErr) ? 'Quota gratuit épuisé — réessaie dans une minute.' : lastErr;
    return res.status(200).json({ error: friendly });
  } catch (e) {
    return res.status(200).json({ error: 'Erreur réseau : ' + e.message });
  }
}
