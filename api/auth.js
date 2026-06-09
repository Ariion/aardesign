import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { password } = req.body || {};
  const adminPwd = process.env.ADMIN_PASSWORD;

  if (!adminPwd) return res.status(500).json({ error: 'ADMIN_PASSWORD non configuré' });
  if (!password || password !== adminPwd) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  const secret = process.env.JWT_SECRET || adminPwd;
  const ts = Date.now().toString();
  const sig = crypto.createHmac('sha256', secret).update(ts).digest('hex');
  const token = ts + '.' + sig;

  return res.status(200).json({ token });
}
