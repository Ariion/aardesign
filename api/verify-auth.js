import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { token } = req.body || {};
  if (!token) return res.status(401).json({ valid: false });

  const secret = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) return res.status(500).json({ error: 'Config manquante' });

  const [ts, sig] = token.split('.');
  if (!ts || !sig) return res.status(401).json({ valid: false });

  const expected = crypto.createHmac('sha256', secret).update(ts).digest('hex');
  if (sig !== expected) return res.status(401).json({ valid: false });

  // Token valide 24h
  if (Date.now() - parseInt(ts) > 86400000) return res.status(401).json({ valid: false, expired: true });

  return res.status(200).json({ valid: true });
}
