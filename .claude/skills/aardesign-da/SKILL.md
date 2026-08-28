---
name: aardesign-da
description: Direction artistique et contraintes techniques du site aardesign.fr (Anthony Armand, graphiste & illustrateur). À utiliser dès qu'on touche au visuel du site, du CV, d'une page annexe ou d'un support Aardesign — palette, typographie, composants, et pièges de plateforme déjà rencontrés en production. Invoquer pour : design, DA, charte, couleurs, typo, mise en page, nouveau projet portfolio, CV, page d'atterrissage, ou avant tout déploiement.
license: MIT
metadata:
  author: Anthony Armand — aardesign.fr
  version: "1.0.0"
  domain: design
---

# DA Aardesign

Charte et garde-fous du site `aardesign.fr` + de son admin. À respecter par défaut ;
s'en écarter seulement si Anthony le demande explicitement.

## Positionnement

- Intitulé actuel : **Graphiste & Illustrateur** — pas « Directeur Artistique »,
  pas « Designer Produit » (ancien positionnement, retiré volontairement).
- Deux adresses, deux circuits — ne pas les mélanger :
  | Contexte | Adresse |
  |---|---|
  | Site public, pages légales, clients / freelance | `aardesign14@gmail.com` |
  | CV, `/dev.html`, candidatures salariat | `anthony.armand07@gmail.com` |
- `/dev.html` est une **porte dérobée volontaire** : `noindex`, jamais liée depuis le site
  public. Ne pas y ajouter de lien depuis le bureau.

## Palette

```
--navy    #1B3560   base de marque
--cyan    #29B8D9   accent principal (liens, labels, focus)
--cyan2   #0097BA   accent secondaire
```

Thème sombre (défaut) : fonds `#050b18` → `#071228`, texte `--ink #dde8f6`,
secondaire `--mid #5c7899`.
Thème clair : fonds `#f5f7fa` → `#edf0f6`, texte `#12254d`, secondaire `#6278a0`.

Le cyan s'utilise **en accent fin** (texte, filets, liseré au survol) — jamais en grand
aplat. Sur un support imprimé, pas d'aplat sombre : Anthony imprime ses CV et tient à
l'économie d'encre.

## Typographie

| Usage | Fonte |
|---|---|
| Titres / affichage | Georgia, 'Times New Roman', serif |
| Corps, interface | Montserrat |
| Métadonnées, labels, dates, compteurs | ui-monospace, 'SF Mono', Menlo |

Le trio serif + sans + mono est la signature du site : un label de section en majuscules
monospace espacées (`letter-spacing:.12em`) au-dessus d'un titre Georgia. Le respecter
sur toute nouvelle page (voir `dev.html`, `mentions-legales.html`).

## Composants

**Vignettes portfolio** (`.pvg-card.spec`) — traitement unique à tous les dossiers :
carte de poids égal, image en 4/3 (`max-height:280px`), nom du client **toujours visible
sous l'image** (jamais caché derrière un survol), coins arrondis 10px, ombre douce,
léger lift + liseré cyan au survol. Grille en `auto-fit minmax(230px,1fr)`.

- Pas de carte « à la une » asymétrique : abandonnée, elle créait des trous de grille.
- Visuels sur fond clair (logos) : cocher « fond clair » dans l'admin, puis régler le
  curseur de taille (`coverPad`, 0–25 %, défaut 15) pour que le logo respire sans être
  minuscule.

**Fenêtres** : métaphore bureau macOS — barre de titre, pastilles de fenêtre, dock bas.
Toute nouvelle app suit ce gabarit.

## Pièges de plateforme (déjà rencontrés en production)

À vérifier **avant** de toucher au stockage ou aux endpoints :

1. **API GitHub Contents — limite 1 Mo.** Le champ `content` revient vide *sans erreur*
   au-delà. `data/site-config.json` dépasse largement. Toujours demander
   `Accept: application/vnd.github.raw`. A déjà causé une perte apparente de tout le
   portfolio.
2. **Vercel Functions — corps de requête 4,5 Mo max.** Ne jamais réembarquer d'images en
   base64 dans la config : elles passent par `/api/upload-image`, qui commite un vrai
   fichier dans `assets/uploads/`.
3. **Endpoints d'écriture protégés.** `save-config`, `upload-image`, `generate-desc`,
   `translate`, `list-assets` exigent le jeton admin via `api/_lib/auth.js`. Tout nouvel
   endpoint qui écrit ou coûte de l'argent doit appeler `verifyToken(req)` — sinon il est
   ouvert à tout internet.
4. **Anthony édite en direct via l'admin pendant les sessions.** Toujours
   `git fetch origin main` avant de pousser ; en cas de conflit sur `site-config.json`,
   fusionner à la main, jamais écraser un côté.
5. **Animation de démarrage : ne pas la complexifier.** Les versions qui déplaçaient le
   vrai logo de la topbar ont échoué quatre fois (mise en page pas stabilisée, image pas
   chargée). La version actuelle — image dédiée, simple fondu, le vrai logo ne bouge
   jamais — est volontairement modeste et fiable. Ne pas y revenir sans raison forte.

## Vérification avant livraison

Le site n'a pas de tests : la vérification se fait **en pilotant le vrai rendu**.
Servir en local (`python3 -m http.server`), injecter `data/site-config.json` dans
`localStorage`, puis capturer avec Playwright (Chromium sur `/opt/pw-browsers/chromium`).
Vérifier au minimum : bureau, les 5 dossiers, une fiche projet, CV, À propos, mobile.

Les endpoints `/api/*` n'existent pas sous un serveur statique : les 404 correspondants
dans la console sont normaux et ne sont pas des régressions.
