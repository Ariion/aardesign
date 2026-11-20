// Liste d'attente publique : un visiteur laisse son adresse pour être prévenu
// quand Module Admin passe en bêta puis en ligne.
//
// Volontairement sans authentification (c'est un formulaire public), donc
// trois garde-fous : un champ piège invisible, une validation stricte de
// l'adresse, et un plafond sur la taille du fichier pour qu'un robot ne puisse
// pas faire gonfler le dépôt indéfiniment.

const REPO = 'ariion/aardesign';
const FILE = 'data/waitlist.json';
const PLAFOND = 5000;           // au-delà, on prévient Anthony sans plus rien stocker
const SOURCES = ['module-admin']; // seules valeurs acceptées pour `source`

// Une adresse plausible, sans chercher à réinventer la RFC 5322.
const RE_EMAIL = /^[^\s@,;:<>()[\]\\]+@[^\s@.,;:<>()[\]\\]+(\.[^\s@.,;:<>()[\]\\]+)+$/;

function nettoie(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};

  // Champ piège : invisible pour un humain, rempli par la plupart des robots.
  // On répond comme si tout s'était bien passé, sans rien enregistrer.
  if (nettoie(body.website, 200)) return res.status(200).json({ ok: true });

  const email = nettoie(body.email, 180).toLowerCase();
  const source = SOURCES.includes(body.source) ? body.source : 'module-admin';

  if (!email) return res.status(400).json({ error: 'Adresse manquante' });
  if (!RE_EMAIL.test(email)) return res.status(400).json({ error: 'Adresse invalide' });

  const token = process.env.GITHUB_TOKEN;
  const resendKey = process.env.RESEND_API_KEY;
  const destinataire = process.env.NOTIFY_TO || 'aardesign14@gmail.com';

  let deja = false;
  let total = null;

  if (token) {
    try {
      const headers = {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      };
      let liste = [], sha = '';
      const lecture = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
        headers: { ...headers, 'Accept': 'application/vnd.github.raw' },
      });
      if (lecture.ok) {
        const texte = await lecture.text();
        try { liste = JSON.parse(texte); } catch (_) { liste = []; }
        // le sha n'est pas dans la réponse brute : on le redemande
        const meta = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, { headers });
        if (meta.ok) sha = (await meta.json()).sha || '';
      }
      if (!Array.isArray(liste)) liste = [];

      deja = liste.some(e => e && e.email === email);
      total = liste.length;

      if (!deja && liste.length < PLAFOND) {
        liste.push({ email, source, created_at: new Date().toISOString() });
        total = liste.length;
        const contenu = Buffer.from(JSON.stringify(liste, null, 2)).toString('base64');
        const corps = { message: `Liste d'attente : +1 (${source})`, content: contenu };
        if (sha) corps.sha = sha;
        const ecriture = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
          method: 'PUT', headers, body: JSON.stringify(corps),
        });
        if (!ecriture.ok) console.error('Waitlist write error:', ecriture.status, await ecriture.text());
      }
    } catch (e) {
      console.error('Waitlist save error:', e.message);
    }
  }

  // Déjà inscrit : on le dit au visiteur, et on n'envoie pas de second message.
  if (deja) return res.status(200).json({ ok: true, deja: true });

  if (resendKey) {
    // 1. Prévenir Anthony
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Aardesign <contact@aardesign.fr>',
          to: destinataire,
          reply_to: email,
          subject: `[aardesign.fr] Liste d'attente Module Admin : ${email}`,
          html: `<p><b>${escapeHtml(email)}</b> souhaite être prévenu du lancement de Module Admin.</p>`
              + `<p>Source : ${escapeHtml(source)}${total !== null ? ` — ${total} inscrit${total > 1 ? 's' : ''} au total` : ''}</p>`,
        }),
      });
    } catch (e) { console.error('Resend (interne) error:', e.message); }

    // 2. Confirmer au visiteur, pour qu'il sache que c'est enregistré
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Aardesign <contact@aardesign.fr>',
          to: email,
          reply_to: destinataire,
          subject: 'Module Admin — vous serez prévenu du lancement',
          html: `<p>Bonjour,</p>`
              + `<p>Votre adresse est enregistrée : vous recevrez un message quand <b>Module Admin</b> ouvrira en bêta, puis quand l'outil sera en ligne. Rien d'autre, pas de lettre d'information.</p>`
              + `<p>Pour être retiré de la liste, il suffit de répondre à ce message.</p>`
              + `<p>— Anthony Armand, <a href="https://aardesign.fr">aardesign.fr</a></p>`,
        }),
      });
    } catch (e) { console.error('Resend (confirmation) error:', e.message); }
  }

  return res.status(200).json({ ok: true, deja: false });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
