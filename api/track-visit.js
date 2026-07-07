export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const webhook = process.env.DISCORD_WEBHOOK;
  if (!webhook) return res.status(200).json({ ok: false, reason: 'no webhook' });

  let body = req.body || {};
  // sendBeacon envoie parfois du texte brut → parser au besoin
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch(_) { body = {}; } }

  // Vercel geo headers (automatic, no IP stored)
  const country = req.headers['x-vercel-ip-country'] || '??';
  const city    = req.headers['x-vercel-ip-city']    || '';
  const region  = req.headers['x-vercel-ip-country-region'] || '';

  const flags = { FR:'🇫🇷',US:'🇺🇸',GB:'🇬🇧',DE:'🇩🇪',BE:'🇧🇪',CH:'🇨🇭',CA:'🇨🇦',ES:'🇪🇸',IT:'🇮🇹',NL:'🇳🇱',PT:'🇵🇹',JP:'🇯🇵',AU:'🇦🇺',BR:'🇧🇷' };
  const flag = flags[country] || '🌍';

  const location = [city, region, country].filter(Boolean).join(', ');
  const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour12: false });

  const fmtDuration = (s) => {
    s = Math.max(0, Math.round(s || 0));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60), r = s % 60;
    return `${m}min${r ? ' ' + r + 's' : ''}`;
  };

  let embed;

  if (body.type === 'summary') {
    // ── Récap de session (au départ) ──
    const actions = Array.isArray(body.actions) ? body.actions.slice(0, 40) : [];
    const emojiFor = { app:'🪟', dossier:'📁', catégorie:'🗂', image:'🖼', clic:'👆' };
    const parcours = actions.length
      ? actions.map(a => `\`${fmtDuration(a.t).padStart(6)}\` ${emojiFor[a.type] || '•'} ${String(a.label).slice(0,60)}`).join('\n').slice(0, 1400)
      : '—';
    const opened = actions.filter(a => a.type === 'dossier' || a.type === 'catégorie').length;
    const images = actions.filter(a => a.type === 'image').length;
    const clics  = actions.filter(a => a.type === 'clic').length;

    embed = {
      title: '📊 Fin de visite — récap de session',
      color: 0x30D158,
      description: parcours,
      fields: [
        { name: '⏱ Durée',        value: fmtDuration(body.duration), inline: true },
        { name: '📁 Dossiers vus', value: String(opened), inline: true },
        { name: '🖼 Images vues',  value: String(images), inline: true },
        { name: '👆 Clics',        value: String(clics),  inline: true },
        { name: '🌍 Localisation', value: `${flag} ${location}`, inline: true },
      ],
      footer: { text: now }
    };
  } else {
    // ── Nouvelle visite (arrivée) ──
    const { page, referrer, ua } = body;
    if (ua && /bot|crawl|spider|slurp|facebookexternalhit|preview/i.test(ua)) {
      return res.status(200).json({ ok: false, reason: 'bot' });
    }
    let ref = referrer || 'Direct';
    try { ref = new URL(referrer).hostname || 'Direct'; } catch(_) {}

    embed = {
      title: '👁 Nouvelle visite — aardesign.fr',
      color: 0x29B8D9,
      fields: [
        { name: '📄 Page',        value: page || '/',    inline: true },
        { name: '🌍 Localisation', value: `${flag} ${location}`, inline: true },
        { name: '↩ Référent',     value: ref,            inline: true },
      ],
      footer: { text: now },
      thumbnail: { url: 'https://aardesign.fr/assets/favicon.png' }
    };
  }

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
    return res.status(200).json({ ok: true });
  } catch(e) {
    return res.status(200).json({ ok: false });
  }
}
