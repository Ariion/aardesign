// Sert une URL projet propre et partageable (aardesign.fr/projets/<slug>) avec un
// <title>/description/OG corrects pour les moteurs de recherche et les aperçus de lien
// (LinkedIn, Slack, Discord...), tout en renvoyant la même appli (index.html) pour un
// vrai visiteur — qui atterrit directement sur la fiche projet ouverte.
//
// Le rewrite vercel.json envoie /projets/:slug ici avec ?slug=:slug.

const FOLDER_LABELS = {
  digital: 'Digital Painting',
  logo: 'Identité visuelle',
  print: 'Print & Packaging',
  sites: 'Web & Sites',
  etudes: 'Illustration & Études',
};

function slugify(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function findProject(portfolio, slug) {
  const projects = (portfolio && portfolio._projects) || {};
  for (const fid of Object.keys(projects)) {
    const arr = Array.isArray(projects[fid]) ? projects[fid] : [];
    const idx = arr.findIndex(p => slugify(p.title || '') === slug);
    if (idx > -1) return { fid, idx, project: arr[idx] };
  }
  return null;
}

function escAttr(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function handler(req, res) {
  const slug = String(req.query.slug || '');
  const REPO = 'ariion/aardesign';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const siteUrl = `${proto}://${host}`;

  try {
    const [cfgRes, htmlRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${REPO}/contents/data/site-config.json`, {
        headers: { 'Accept': 'application/vnd.github.raw' }
      }),
      fetch(`${siteUrl}/index.html`)
    ]);

    let html = htmlRes.ok ? await htmlRes.text() : '';
    if (!html) return res.status(500).send('Erreur de chargement');

    if (!cfgRes.ok) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    const config = await cfgRes.json();
    const found = findProject(config.aar_portfolio, slug);

    if (!found) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(html);
    }

    const { fid, idx, project: p } = found;
    const folderLabel = FOLDER_LABELS[fid] || fid;
    const title = `${p.title || 'Projet'} — ${folderLabel} | Anthony Armand`;
    const rawDesc = p.context || p.objective || p.result || `${p.title} — ${folderLabel}, un projet d'Anthony Armand (aardesign).`;
    const description = String(rawDesc).replace(/\s+/g, ' ').trim().slice(0, 155);
    const cover = p.images && p.images[0] && p.images[0].src;
    const ogImage = (cover && !cover.startsWith('data:'))
      ? (cover.startsWith('http') ? cover : `${siteUrl}/${cover}`)
      : `${siteUrl}/assets/Logo-Aardesign-Long.png`;
    const pageUrl = `${siteUrl}/projets/${slug}`;

    html = html
      .replace(/<title>.*?<\/title>/, `<title>${escAttr(title)}</title>`)
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escAttr(description)}">`)
      .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escAttr(title)}">`)
      .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escAttr(description)}">`)
      .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${escAttr(ogImage)}">`)
      .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${escAttr(pageUrl)}">`)
      .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escAttr(title)}">`)
      .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escAttr(description)}">`)
      .replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${escAttr(ogImage)}">`)
      .replace(/<link rel="canonical" href="[^"]*" id="meta-canonical">/, `<link rel="canonical" href="${escAttr(pageUrl)}" id="meta-canonical">`)
      .replace('</head>', `<script>window.__AAR_DEEP_PROJECT__=${JSON.stringify({ fid, idx })};</script>\n</head>`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(html);
  } catch (e) {
    return res.status(500).send('Erreur : ' + e.message);
  }
}
