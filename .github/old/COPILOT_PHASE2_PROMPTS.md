# RestoPlus-LaKora — Phase 2 : Design Unifié & Bug Fixes
> Prompts Copilot Phase 2. À coller dans VS Code Copilot Chat (`Ctrl+Shift+I`).
> Direction design : **"Sable & Or"** — noir-brun naturel #1C1917, or chaud #C0873F, surfaces #FAFAF8.
> Zéro violet, zéro brun orangé saturé. Restaurant premium, sobre, authentique.

---

## PROMPT A — DESIGN SYSTEM PHASE 2 : Tokens unifiés & typographie

**Ouvre `public/css/main.css`, puis colle ce prompt :**

```
Refactore les variables CSS dans `:root` de `public/css/main.css`.

Contexte : le projet a un problème d'incohérence visuelle — violet non désiré, brun saturé sur le scanner, couleurs de sidebar qui clashent avec le reste.

La direction design choisie est "Sable & Or" : noir naturel profond, or chaud, surfaces sable chaud. Sobre, premium, restaurant.

Remplace ENTIÈREMENT le bloc `:root { ... }` par celui-ci, puis remplace dans le reste du fichier toutes les valeurs qui contredisent ces tokens :

```css
:root {
  /* === PALETTE PRINCIPALE "SABLE & OR" === */
  --color-primary:        #C0873F;   /* or du Sahel */
  --color-primary-dark:   #9B6830;   /* or profond */
  --color-primary-light:  #E8A85A;   /* or clair */
  --color-primary-ultra:  #FDF6EC;   /* wash or très pâle */

  /* === SURFACES === */
  --color-bg:             #F7F5F1;   /* sable chaud — fond global */
  --color-surface:        #FFFFFF;   /* blanc pur — cards */
  --color-surface-alt:    #F0EBE3;   /* sable moyen — sections alternées */
  --color-surface-dark:   #1C1917;   /* noir naturel profond — navbar, header */
  --color-surface-mid:    #2C2620;   /* brun-noir — sidebar hover */
  --color-border:         #E8E2D9;   /* bordure sable */
  --color-border-light:   #F0EBE3;   /* bordure très légère */

  /* === TEXTES === */
  --color-text:           #1C1917;   /* noir naturel */
  --color-text-muted:     #6B6560;   /* gris chaud */
  --color-text-light:     #A8A09A;   /* gris sable */
  --color-text-inverse:   #FAFAF8;   /* texte sur dark */
  --color-text-gold:      #C0873F;   /* texte accent */

  /* === STATUTS === */
  --color-success:        #2D9B6A;   /* vert naturel */
  --color-success-bg:     #EAF7F1;
  --color-warning:        #D4820A;   /* ambre */
  --color-warning-bg:     #FEF3DC;
  --color-danger:         #C0392B;   /* rouge sobre */
  --color-danger-bg:      #FDECEA;
  --color-info:           #2471A3;   /* bleu profond */
  --color-info-bg:        #EAF4FB;

  /* === TYPOGRAPHIE === */
  --font-display:         'Playfair Display', Georgia, serif;  /* titres */
  --font-body:            'DM Sans', system-ui, sans-serif;    /* body */
  --font-mono:            'JetBrains Mono', 'Courier New', monospace;

  /* === ESPACEMENTS === */
  --space-xs:   4px;
  --space-sm:   8px;
  --space-md:   16px;
  --space-lg:   24px;
  --space-xl:   40px;
  --space-2xl:  64px;

  /* === RAYONS === */
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   14px;
  --radius-xl:   20px;
  --radius-2xl:  28px;
  --radius-pill: 9999px;

  /* === OMBRES === */
  --shadow-xs:  0 1px 2px rgba(28,25,23,0.06);
  --shadow-sm:  0 2px 6px rgba(28,25,23,0.08);
  --shadow-md:  0 4px 16px rgba(28,25,23,0.10);
  --shadow-lg:  0 12px 32px rgba(28,25,23,0.14);
  --shadow-xl:  0 24px 48px rgba(28,25,23,0.18);
  --shadow-gold: 0 4px 16px rgba(192,135,63,0.25);

  /* === TRANSITIONS === */
  --transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  /* === Z-INDEX === */
  --z-base:    1;
  --z-sticky:  100;
  --z-modal:   1000;
  --z-toast:   9999;
}
```

Ensuite, dans le body, change font-family en `var(--font-body)`.

Dans le `<head>` de chaque page HTML (admin.html, menu.html, index.html, login.html, reservation.html), ajoute ces deux imports Google Fonts s'ils ne sont pas déjà présents :
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
```

Remplace dans main.css toute mention de `#6B6B6B`, `#ADADAD`, `#1A1A1A`, `#FAFAF8`, `#F5F0E8`, `#E8E8E8`, `#F0F0F0` par les variables correspondantes du nouveau token set.
```

---

## PROMPT B — ADMIN NAVBAR & SIDEBAR : Refonte complète

**Ouvre `public/css/admin.css`, puis colle ce prompt :**

```
Dans `public/css/admin.css`, refactore entièrement la navbar et la sidebar admin.

Contexte visuel actuel : la navbar est trop sombre avec une couleur inconsistante, la sidebar crée des clashes de couleur avec le reste.

Direction : dark navbar sobre #1C1917, accents or #C0873F, fond page #F7F5F1, aucun violet.

### 1. Navbar principale `.admin-header` ou `.admin-navbar` :
```css
.admin-header {
  background: var(--color-surface-dark); /* #1C1917 */
  color: var(--color-text-inverse);
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  box-shadow: 0 1px 0 rgba(255,255,255,0.06);
}
```

### 2. Logo `.admin-logo` ou `.logo-badge` :
```css
.logo-badge {
  width: 36px;
  height: 36px;
  background: var(--color-primary);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: #fff;
  flex-shrink: 0;
  box-shadow: var(--shadow-gold);
}
.admin-title {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-inverse);
  letter-spacing: 0.01em;
}
```

### 3. Nav links `.admin-nav` (menu hamburger) :
```css
.admin-nav {
  position: fixed;
  top: 56px;
  left: 0;
  width: 240px;
  height: calc(100vh - 56px);
  background: var(--color-surface-dark);
  border-right: 1px solid rgba(255,255,255,0.06);
  padding: 12px 8px;
  transform: translateX(-100%);
  transition: transform var(--transition-base);
  z-index: calc(var(--z-sticky) - 1);
  overflow-y: auto;
}
.admin-nav.active {
  transform: translateX(0);
  box-shadow: 4px 0 24px rgba(0,0,0,0.3);
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  color: rgba(250,250,248,0.65);
  font-size: 0.875rem;
  font-weight: 500;
  font-family: var(--font-body);
  text-decoration: none;
  transition: all var(--transition-fast);
  margin-bottom: 2px;
}
.nav-link:hover {
  background: rgba(255,255,255,0.07);
  color: var(--color-text-inverse);
}
.nav-link.active {
  background: rgba(192,135,63,0.18);
  color: var(--color-primary-light);
  font-weight: 600;
}
.nav-link i {
  font-size: 1rem;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
  opacity: 0.8;
}
.nav-link.active i {
  opacity: 1;
  color: var(--color-primary);
}
```

### 4. Menu hamburger toggle `.menu-toggle` :
```css
.menu-toggle {
  background: none;
  border: none;
  color: rgba(250,250,248,0.75);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 6px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  margin-left: auto;
}
.menu-toggle:hover {
  background: rgba(255,255,255,0.1);
  color: var(--color-text-inverse);
}
```

### 5. Fond de la page admin `body` ou `.admin-page` :
```css
body {
  background: var(--color-bg); /* #F7F5F1 — sable chaud */
}
```

### 6. Section principale `.admin-main` ou `main` :
```css
.admin-main {
  padding: 20px 16px;
  max-width: 1200px;
  margin: 0 auto;
}
```

Supprime toute occurrence de `background: purple`, `#6A0DAD`, `background: linear-gradient(135deg, #8B4513` ou toute couleur violette/brun saturé non désirée dans ce fichier.
```

---

## PROMPT C — SCANNER QR : Redesign sobre et cohérent

**Ouvre `public/css/admin.css`, trouve la section Scanner, puis colle ce prompt :**

```
Dans `public/css/admin.css`, refactore entièrement la section du scanner QR.

Cherche et remplace tous les styles liés à : `.scanner-section`, `.qr-scanner-container`, `.qr-style-zone`, `#qr-reader`, `.scanner-card`, `.scanner-controls`, `#toggleCamBtn-admin`, `#camera-selection-admin`, `#camera-select-admin`.

Objectif : scanner sobre, cohérent avec le design "Sable & Or". Zéro fond brun orangé saturé.

```css
.scanner-section {
  padding: 16px;
}

.scanner-card {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  max-width: 480px;
  margin: 0 auto;
}

.scanner-card-header {
  padding: 20px 24px 0;
  text-align: center;
}
.scanner-card-header h2 {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
}
.scanner-card-header p {
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

/* Zone vidéo */
.qr-scanner-container {
  padding: 20px 24px;
}

.qr-style-zone {
  aspect-ratio: 1;
  background: var(--color-surface-alt);
  border-radius: var(--radius-lg);
  overflow: hidden;
  position: relative;
  border: 2px dashed var(--color-border);
  transition: border-color var(--transition-base);
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-style-zone.camera-active {
  border-color: var(--color-primary);
  border-style: solid;
}

/* Icône placeholder caméra off */
.qr-style-zone.camera-off::before {
  content: '\f030';  /* fa-camera */
  font-family: 'Font Awesome 6 Free';
  font-weight: 900;
  font-size: 2.5rem;
  color: var(--color-border);
}

#qr-reader {
  width: 100% !important;
  height: 100% !important;
  border: none !important;
  border-radius: var(--radius-md) !important;
  overflow: hidden;
}

/* Ligne de scan animée */
.scan-line {
  position: absolute;
  left: 10%;
  right: 10%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
  animation: scan-sweep 2s ease-in-out infinite;
  opacity: 0;
}
.qr-style-zone.camera-active .scan-line {
  opacity: 1;
}
@keyframes scan-sweep {
  0%   { top: 10%; }
  50%  { top: 85%; }
  100% { top: 10%; }
}

/* Coins décoratifs */
.qr-corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: var(--color-primary);
  border-style: solid;
  opacity: 0;
  transition: opacity var(--transition-base);
}
.qr-style-zone.camera-active .qr-corner { opacity: 1; }
.qr-corner.tl { top: 8px; left: 8px;  border-width: 2px 0 0 2px; border-radius: 4px 0 0 0; }
.qr-corner.tr { top: 8px; right: 8px; border-width: 2px 2px 0 0; border-radius: 0 4px 0 0; }
.qr-corner.bl { bottom: 8px; left: 8px;  border-width: 0 0 2px 2px; border-radius: 0 0 0 4px; }
.qr-corner.br { bottom: 8px; right: 8px; border-width: 0 2px 2px 0; border-radius: 0 0 4px 0; }

/* Contrôles scanner */
.scanner-controls {
  padding: 0 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

#toggleCamBtn-admin {
  width: 100%;
  padding: 12px 20px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: var(--shadow-gold);
}
#toggleCamBtn-admin:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(192,135,63,0.3);
}

.camera-selection-label {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  font-weight: 500;
  margin-bottom: 4px;
}

#camera-select-admin {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-size: 16px; /* iOS zoom prevention */
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B6560' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
  transition: border-color var(--transition-fast);
}
#camera-select-admin:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(192,135,63,0.12);
}
```
```

---

## PROMPT D — RÉSERVATIONS : Cohérence visuelle complète

**Ouvre `public/css/admin-reservations.css`, puis colle ce prompt :**

```
Refactore entièrement `public/css/admin-reservations.css` pour qu'il soit cohérent avec le design system "Sable & Or".

Problème actuel : la page réservations utilise des couleurs qui clashent avec le reste de l'admin.

Règles globales :
- Fond de section : var(--color-bg) #F7F5F1
- Cards : var(--color-surface) fond blanc, bordure var(--color-border)
- Titres : font-family var(--font-display), couleur var(--color-text)
- Badges statut : couleurs var(--color-*) du design system
- Boutons primaires : var(--color-primary) background, blanc text
- Aucun violet, aucun brun saturé

Applique ces règles :

### Header section réservations :
```css
.reservations-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px 12px;
  flex-wrap: wrap;
  gap: 12px;
}
.reservations-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
}
.reservations-title i {
  color: var(--color-primary);
  font-size: 1.1rem;
}
.reservations-count-badge {
  background: var(--color-primary);
  color: #fff;
  border-radius: var(--radius-pill);
  padding: 2px 10px;
  font-size: 0.75rem;
  font-weight: 700;
}
```

### Filtres :
```css
.reservations-filters {
  padding: 0 16px 16px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.filter-select {
  padding: 8px 14px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-size: 16px;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}
.filter-select:focus {
  outline: none;
  border-color: var(--color-primary);
}
.filter-date {
  padding: 8px 14px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 16px;
  transition: border-color var(--transition-fast);
}
.filter-date:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(192,135,63,0.12);
}
```

### Toggle vues (Liste/Calendrier) :
```css
.view-toggle {
  display: flex;
  background: var(--color-surface-alt);
  border-radius: var(--radius-md);
  padding: 3px;
  gap: 2px;
}
.view-btn {
  padding: 7px 16px;
  border: none;
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  background: transparent;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}
.view-btn.active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-xs);
}
```

### Card de réservation :
```css
.reservation-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  margin: 0 16px 10px;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-xs);
}
.reservation-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary-light);
  transform: translateY(-1px);
}
.reservation-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
}
.reservation-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-text);
}
.reservation-time {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  margin-top: 2px;
}
.reservation-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
.reservation-meta i {
  color: var(--color-primary);
  margin-right: 4px;
}
```

### Badges statuts :
```css
.reservation-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: 0.72rem;
  font-weight: 700;
}
.reservation-badge.confirmed {
  background: var(--color-success-bg);
  color: var(--color-success);
}
.reservation-badge.pending {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}
.reservation-badge.cancelled {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}
```

### État vide :
```css
.reservations-empty {
  text-align: center;
  padding: 48px 24px;
  color: var(--color-text-muted);
}
.reservations-empty-icon {
  font-size: 3rem;
  margin-bottom: 12px;
  opacity: 0.4;
}
.reservations-empty-text {
  font-size: 0.875rem;
  color: var(--color-text-light);
}
```
```

---

## PROMPT E — BUG CRITIQUE : Toast notifications empilées

**Ouvre `public/js/main.js`, trouve `NotificationManager`, puis colle ce prompt :**

```
Dans `public/js/main.js`, dans la classe/objet `NotificationManager`, corrige le bug de superposition des toasts.

Problème actuel : quand plusieurs notifications apparaissent rapidement, elles se superposent au même endroit au lieu de s'empiler verticalement.

Fix requis :

1. Crée un container dédié pour les toasts si il n'existe pas déjà :
```js
function getToastContainer() {
  let container = document.getElementById('rp-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'rp-toast-container';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 99999;
      display: flex;
      flex-direction: column-reverse;
      gap: 8px;
      max-width: 380px;
      width: calc(100vw - 40px);
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }
  return container;
}
```

2. Dans `showSuccess`, remplace `document.body.appendChild(toast)` par `getToastContainer().appendChild(toast)`.

3. Le toast lui-même doit avoir `pointer-events: auto` et `position: relative` (pas `fixed`) — le container est `fixed`, pas les toasts individuels.

4. Retire de chaque toast ces propriétés si elles y sont : `position: fixed`, `bottom`, `right`, `top`, `left` — le positionnement est géré par le container flex.

5. Supprime le CSS `position: fixed; bottom: 20px; right: 20px;` du style injecté pour `.rp-toast`. À la place :
```css
.rp-toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  min-width: 0;
  width: 100%;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
  animation: slide-in-right 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: auto;
  cursor: default;
}
```

6. Pour la suppression d'un toast, ajoute une animation de sortie :
```js
function dismissToast(toast) {
  toast.style.animation = 'slide-out-right 0.25s ease forwards';
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
    // Nettoyer le container si vide
    const container = document.getElementById('rp-toast-container');
    if (container && container.children.length === 0) {
      // laisser le container en place pour les prochains toasts
    }
  }, 250);
}
```

7. Ajoute les keyframes manquants dans le CSS injecté :
```css
@keyframes slide-out-right {
  from { transform: translateX(0); opacity: 1; }
  to   { transform: translateX(110%); opacity: 0; }
}
```

8. Limite le nombre max de toasts visibles simultanément à 4. Si le container a déjà 4 enfants, retire le plus ancien avant d'ajouter le nouveau.

9. Sur mobile (<480px), le container doit s'adapter :
```js
// Dans getToastContainer, ajoute :
if (window.innerWidth < 480) {
  container.style.left = '12px';
  container.style.right = '12px';
  container.style.bottom = '16px';
  container.style.width = 'auto';
}
```
```

---

## PROMPT F — BUG LOGIQUE : Modal gestion — Bouton "Accepter" conditionnel

**Ouvre `public/js/admin.js`, trouve `displayOrderInModal` et `setupModalEventListeners`, puis colle ce prompt :**

```
Dans `public/js/admin.js`, corrige le bug logique du modal de gestion de commande.

Bug : quand une commande est au statut "accepted" (ou tout statut ≥ accepted), le bouton "✅ Accepter" dans le modal reste visible et cliquable, ce qui n'a aucun sens.

Fix requis :

1. Dans `setupModalEventListeners()`, après avoir injecté les boutons `.mm-actions-grid`, ajoute une logique de visibilité conditionnelle basée sur le statut actuel de la commande :

```js
// Juste après l'injection du HTML des boutons :
this._applyModalButtonVisibility(modal, this.currentManagingOrder);
```

2. Ajoute une méthode `_applyModalButtonVisibility(modal, order)` dans la classe `AdminManager` :

```js
_applyModalButtonVisibility(modal, order) {
  if (!order || !modal) return;
  const status = (order.status || '').toLowerCase();

  // Mapping : pour chaque statut, quels boutons masquer
  const HIDE_MAP = {
    // Si déjà acceptée, masquer "Accepter"
    'accepted':         ['accepted'],
    // Si en préparation, masquer "Accepter" et "Préparer"
    'preparing':        ['accepted', 'preparing'],
    // Si prête, masquer "Accepter", "Préparer", "Prête"
    'ready':            ['accepted', 'preparing', 'ready'],
    // Si servie, masquer tout sauf Supprimer
    'served':           ['accepted', 'preparing', 'ready', 'served'],
    // Si annulée, masquer tout sauf Supprimer
    'cancelled':        ['accepted', 'preparing', 'ready', 'served', 'cancelled'],
  };

  const toHide = HIDE_MAP[status] || [];

  // Appliquer la visibilité
  const buttons = modal.querySelectorAll('.mm-btn[data-action]');
  buttons.forEach(btn => {
    const action = btn.getAttribute('data-action');
    if (toHide.includes(action)) {
      btn.style.display = 'none';
    } else {
      btn.style.display = '';
    }
  });

  // Highlight le bouton du statut actuel
  buttons.forEach(btn => {
    const action = btn.getAttribute('data-action');
    if (action === status) {
      btn.style.outline = '2px solid currentColor';
      btn.style.outlineOffset = '2px';
    } else {
      btn.style.outline = '';
      btn.style.outlineOffset = '';
    }
  });
}
```

3. Dans `setupModalEventListeners()`, dans le `onclick` des boutons d'action, après le changement optimiste de statut local (`this.orders[orderIndex].status = action`), si le modal est encore ouvert (ce qui ne devrait pas arriver vu qu'on ferme immédiatement), réappliquer la visibilité. 

4. Dans `openManagementModal(orderId)` et `displayOrderInModal(order)`, assure-toi que `this.currentManagingOrder` est toujours mis à jour AVANT l'appel à `setupModalEventListeners`.

5. Aussi, dans le rendu du grid HTML des boutons dans `setupModalEventListeners`, ajoute le bouton "Prête" avec `data-action="ready"` s'il est absent :
```html
<div class="mm-actions-grid">
  <button class="mm-btn mm-btn-accept"   data-action="accepted">  <i class="fa-solid fa-check"></i> Accepter</button>
  <button class="mm-btn mm-btn-prepare"  data-action="preparing"> <i class="fa-solid fa-fire-burner"></i> Préparer</button>
  <button class="mm-btn mm-btn-ready"    data-action="ready">     <i class="fa-solid fa-bell-concierge"></i> Prête</button>
  <button class="mm-btn mm-btn-serve"    data-action="served">    <i class="fa-solid fa-check-double"></i> Servie</button>
  <button class="mm-btn mm-btn-cancel"   data-action="cancelled"> <i class="fa-solid fa-xmark"></i> Annuler</button>
  <button class="mm-btn mm-btn-delete"   data-action="delete">    <i class="fa-solid fa-trash"></i> Sup.</button>
</div>
```
```

---

## PROMPT G — BUG : API Tables 404 — Fallback silencieux

**Ouvre `public/js/table-manager.js`, puis colle ce prompt :**

```
Dans `public/js/table-manager.js`, dans la méthode `loadTables()` (ou équivalent qui appelle `/api/tables`), améliore le fallback pour qu'il soit silencieux et ne génère pas d'erreurs dans la console admin.

Problème : `/api/tables` retourne 404, ce qui génère une erreur visible dans la console et potentiellement une notification d'erreur à l'admin.

Fix requis :

1. Dans le bloc `catch` ou dans le check de response status, si le status est 404 :
   - Ne pas appeler `NotificationManager.showSuccess` avec un message d'erreur
   - Logger seulement en `console.debug` (pas `console.error` ni `console.warn`) : `console.debug('[TableManager] API /api/tables non disponible, mode local activé')`
   - Continuer normalement avec les données locales/localStorage

2. Remplace tout `console.error` ou `console.warn` dans `loadTables` par `console.debug` pour les erreurs 404.

3. Si une notification d'erreur est affichée quand l'API retourne 404, supprime-la.

4. Le fallback doit charger les tables depuis localStorage silencieusement. Si aucune donnée localStorage, initialiser avec un set de tables par défaut (tables 1 à 10) sans notification.

5. Ajoute un flag `this.apiAvailable = false` quand le 404 est détecté, pour que le TableManager sache qu'il travaille en mode local dans les appels suivants (économise des requêtes inutiles).
```

---

## PROMPT H — MODAL GESTION : Fix grid boutons sur mobile

**Ouvre `public/css/admin-modal.css`, trouve `.mm-actions-grid`, puis colle ce prompt :**

```
Dans `public/css/admin-modal.css`, corrige le CSS de `.mm-actions-grid` pour éviter le débordement des boutons sur mobile.

Problème actuel : les 6 boutons d'action dans le modal de gestion débordent ou se chevauchent sur petits écrans.

Remplace le CSS de `.mm-actions-grid` et `.mm-btn` par :

```css
.mm-actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.mm-btn {
  padding: 10px 6px;
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
  line-height: 1.3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-height: 56px;
  justify-content: center;
}

/* Icône au-dessus, label en dessous */
.mm-btn i {
  font-size: 1rem;
}

.mm-btn:hover  { transform: translateY(-2px); filter: brightness(1.08); }
.mm-btn:active { transform: scale(0.96); }

.mm-btn-accept  { background: var(--color-success-bg);  color: var(--color-success); }
.mm-btn-prepare { background: var(--color-warning-bg);  color: var(--color-warning); }
.mm-btn-ready   { background: var(--color-info-bg);     color: var(--color-info); }
.mm-btn-serve   { background: #E0F2F1;                  color: #16A085; }
.mm-btn-cancel  { background: var(--color-danger-bg);   color: var(--color-danger); }
.mm-btn-delete  { background: var(--color-surface-alt); color: var(--color-text-muted); }

.mm-btn-accept:hover  { background: var(--color-success); color: #fff; }
.mm-btn-prepare:hover { background: var(--color-warning); color: #fff; }
.mm-btn-ready:hover   { background: var(--color-info);    color: #fff; }
.mm-btn-serve:hover   { background: #16A085;              color: #fff; }
.mm-btn-cancel:hover  { background: var(--color-danger);  color: #fff; }
.mm-btn-delete:hover  { background: var(--color-text-muted); color: #fff; }

/* Sur très petits écrans : 2 colonnes */
@media (max-width: 360px) {
  .mm-actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

Aussi, assure-toi que le `.mm-footer` dans le modal est collant en bas avec ces styles :
```css
.mm-footer {
  padding: 12px 20px 20px;
  position: sticky;
  bottom: 0;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border-light);
  padding-bottom: max(20px, env(safe-area-inset-bottom));
}
```
```

---

## PROMPT I — MENU CLIENT : Couleurs navbar cohérentes

**Ouvre `public/css/menu.css`, puis colle ce prompt :**

```
Dans `public/css/menu.css`, refactore la navbar du menu client pour qu'elle soit cohérente avec le design "Sable & Or".

Problème : le fond violet de la page menu (#4A0080 ou similaire) ne correspond pas au design system.

Cherche et remplace :

1. Le fond de `body` ou `.menu-page` en `var(--color-bg)` (#F7F5F1) — pas de violet.

2. La navbar `.menu-header` ou `.navbar` :
```css
.menu-header {
  background: var(--color-surface-dark); /* #1C1917 */
  color: var(--color-text-inverse);
  padding: 0 16px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  box-shadow: 0 1px 0 rgba(255,255,255,0.06);
}
```

3. Le logo dans la navbar :
```css
.menu-logo {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-inverse);
}
.menu-logo-badge {
  background: var(--color-primary);
  color: #fff;
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  font-size: 0.85rem;
  font-weight: 700;
  margin-right: 6px;
}
```

4. Les tabs de catégories (Groupe/Individuel, sandwiko/Carte Boissons/etc.) :
```css
.category-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  overflow-x: auto;
  scrollbar-width: none;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.category-tabs::-webkit-scrollbar { display: none; }

.tab-btn {
  padding: 7px 18px;
  border-radius: var(--radius-pill);
  border: 1.5px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  font-family: var(--font-body);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}
.tab-btn:hover {
  border-color: var(--color-primary-light);
  color: var(--color-primary);
}
.tab-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
  box-shadow: var(--shadow-gold);
}
```

5. Section titre "Nos Plats" :
```css
.menu-section-title {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text);
  text-align: center;
  padding: 24px 16px 8px;
}
```

Supprime tout `background: purple`, `background: #4A0080`, `background: #6A0DAD` ou toute couleur violette du fichier.
```

---

## PROMPT J — VÉRIFICATION FINALE PHASE 2

**Ouvre le workspace complet dans Copilot, puis colle ce prompt :**

```
Effectue une vérification finale sur RestoPlus-LaKora après la Phase 2 de refactoring.

1. Dans `public/css/admin.css`, vérifie qu'aucun sélecteur ne définit une couleur de fond violette ou brun saturé (cherche `purple`, `#4A`, `#6A0D`, `rgba(106`, `#8B45`). Si trouvé, remplace par `var(--color-surface-dark)` ou `var(--color-bg)` selon le contexte.

2. Dans tous les fichiers CSS (`admin.css`, `menu.css`, `admin-modal.css`, `admin-reservations.css`, `main.css`), vérifie qu'il n'y a pas de valeurs `font-family: 'Inter'` hardcodées — remplace par `var(--font-body)`.

3. Dans `public/js/main.js`, vérifie que `getToastContainer()` est défini et que `showSuccess` l'utilise bien.

4. Dans `public/js/admin.js`, vérifie que `_applyModalButtonVisibility` est défini dans la classe `AdminManager` et appelé dans `setupModalEventListeners`.

5. Dans `public/admin.html`, vérifie que les imports Google Fonts (DM Sans + Playfair Display) sont dans le `<head>` avant les stylesheets.

6. Dans `public/menu.html`, vérifie également les imports Google Fonts.

7. Dans `public/css/admin-modal.css`, vérifie que `.mm-actions-grid` est défini avec `grid-template-columns: repeat(3, 1fr)`.

8. Rapport final : liste les 5 changements les plus impactants appliqués en Phase 2, avec une ligne de description chacun.
```

---

## Résumé de la direction design "Sable & Or"

| Élément | Avant | Après |
|---------|-------|-------|
| Fond global | Blanc / violet | #F7F5F1 (sable chaud) |
| Navbar | Brun saturé / violet | #1C1917 (noir naturel) |
| Accent | #C0873F (existant) | #C0873F (renforcé, cohérent) |
| Scanner fond | Brun orangé lourd | Blanc + dashed border or |
| Typography | Inter system | DM Sans (body) + Playfair Display (titres) |
| Toasts | Superposés fixed | Container flex, empilés proprement |
| Modal boutons | Grid cassé mobile | 3 colonnes, icônes FA, conditionnel selon statut |
| Réservations | Incohérent | Même token set, badges propres |
