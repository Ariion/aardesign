# Skills du projet aardesign

Ces skills sont chargés automatiquement par Claude Code quand le contexte s'y prête.

## Sur mesure

| Skill | Rôle |
|---|---|
| `aardesign-da` | Charte visuelle du site + pièges de plateforme déjà rencontrés en prod (limites GitHub/Vercel, endpoints protégés, protocole de vérification). |

## Sélection tierce — [Jeffallan/claude-skills](https://github.com/Jeffallan/claude-skills) (MIT)

Sélection ciblée sur la stack réelle du projet (HTML/CSS/JS + fonctions Vercel),
sur les 67 skills du dépôt d'origine. Contenu 100 % markdown, aucun script exécutable.

| Skill | Pourquoi ici |
|---|---|
| `javascript-pro` | Stack principale du site et des jeux. |
| `debugging-wizard` | Méthode de débogage systématique (reproduire → isoler → hypothèses). |
| `security-reviewer` | De vraies failles d'authentification ont déjà été trouvées ici. |
| `code-reviewer` | Revue qualité large. |
| `playwright-expert` | Le site se vérifie en pilotant le rendu réel. |
| `api-designer` | Endpoints `/api/*`. |
| `the-fool` | Challenger une décision, pre-mortem, avocat du diable. |
| `wordpress-pro` | Travaux clients sous Wordpress. |

Pour récupérer les **67 skills** dans tous les autres projets (une fois, côté client) :

```
/plugin marketplace add jeffallan/claude-skills
/plugin install fullstack-dev-skills@jeffallan
```

Licence du dépôt d'origine conservée dans `LICENSE-jeffallan-skills`.
