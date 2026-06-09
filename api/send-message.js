export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !message) return res.status(400).json({ error: 'Champs manquants' });

  const REPO = 'ariion/aardesign';
  const FILE = 'data/messages.json';
  const token = process.env.GITHUB_TOKEN;
  const resendKey = process.env.RESEND_API_KEY;

  const entry = { id: String(Date.now()), created_at: new Date().toISOString(), name, email, subject: subject || '(sans objet)', message, read: false };

  if (token) {
    try {
      const headers = { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
      let messages = [], sha = '';
      const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, { headers });
      if (getRes.ok) {
        const d = await getRes.json();
        sha = d.sha || '';
        messages = JSON.parse(Buffer.from(d.content, 'base64').toString('utf8'));
      }
      messages.unshift(entry);
      const content = Buffer.from(JSON.stringify(messages, null, 2)).toString('base64');
      const body = { message: 'New contact message', content };
      if (sha) body.sha = sha;
      await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, { method: 'PUT', headers, body: JSON.stringify(body) });
    } catch (e) {
      console.error('GitHub save error:', e.message);
    }
  }

  if (resendKey) {
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Aardesign Contact <contact@aardesign.fr>',
          to: 'aardesign14@gmail.com',
          reply_to: email,
          subject: `[aardesign.fr] ${subject || 'Nouveau message'} — ${name}`,
          html: `<p><b>De :</b> ${name} &lt;${email}&gt;</p><p><b>Objet :</b> ${subject || '(sans objet)'}</p><hr><p>${message.replace(/\n/g, '<br>')}</p>`
        })
      });
      if (!resendRes.ok) {
        const errBody = await resendRes.json();
        console.error('Resend error:', JSON.stringify(errBody));
      }
    } catch (e) {
      console.error('Resend error:', e.message);
    }
  }

  return res.status(200).json({ ok: true });
}
