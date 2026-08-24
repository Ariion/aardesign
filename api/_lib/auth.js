import crypto from 'crypto';

// Vérifie le token de session admin (même mécanisme HMAC que auth.js / verify-auth.js).
// Utilisé pour protéger les endpoints d'écriture ou coûteux (save-config, upload-image,
// generate-desc, translate, list-assets) qui ne devaient jamais être appelables sans
// être passé par /api/auth au préalable.
export function verifyToken(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.body && req.body.token) || '';
  if (!token) return false;

  const secret = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) return false;

  const [ts, sig] = token.split('.');
  if (!ts || !sig) return false;

  const expected = crypto.createHmac('sha256', secret).update(ts).digest('hex');
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;

  // Token valide 24h, comme verify-auth.js
  if (Date.now() - parseInt(ts, 10) > 86400000) return false;

  return true;
}
