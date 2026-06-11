export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const webhook = process.env.DISCORD_WEBHOOK;
  if (!webhook) return res.status(200).json({ ok: false, reason: 'no webhook' });

  const { page, referrer, ua } = req.body || {};

  // Vercel geo headers (automatic, no IP stored)
  const country = req.headers['x-vercel-ip-country'] || '??';
  const city    = req.headers['x-vercel-ip-city']    || '';
  const region  = req.headers['x-vercel-ip-country-region'] || '';

  const flags = { FR:'🇫🇷',US:'🇺🇸',GB:'🇬🇧',DE:'🇩🇪',BE:'🇧🇪',CH:'🇨🇭',CA:'🇨🇦',ES:'🇪🇸',IT:'🇮🇹',NL:'🇳🇱',PT:'🇵🇹',JP:'🇯🇵',AU:'🇦🇺',BR:'🇧🇷' };
  const flag = flags[country] || '🌍';

  const location = [city, region, country].filter(Boolean).join(', ');
  const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour12: false });

  // Detect bot by user-agent
  if (ua && /bot|crawl|spider|slurp|facebookexternalhit|preview/i.test(ua)) {
    return res.status(200).json({ ok: false, reason: 'bot' });
  }

  // Clean referrer
  let ref = referrer || 'Direct';
  try { ref = new URL(referrer).hostname || 'Direct'; } catch(_) {}

  const embed = {
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
