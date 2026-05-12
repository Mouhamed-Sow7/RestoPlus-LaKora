# RestoPlus-LaKora — Prompts de Refactorisation Copilot

> À coller dans VS Code Copilot Chat (`Ctrl+Shift+I`) ou dans un fichier `.github/copilot-instructions.md`.
> Chaque section = un prompt autonome. Lance-les dans l'ordre.

---

## PROMPT 1 — DESIGN SYSTÈME : Variables CSS globales & Reset

**Ouvre `public/css/main.css`, puis colle ce prompt :**

```
Refactore le fichier `public/css/main.css`.

Objectif : établir un design system cohérent, professionnel et responsive pour RestoPlus-LaKora (restaurant sénégalais).

Règles strictes :
1. Déclare toutes les variables CSS dans `:root` en début de fichier :
   - Couleurs primaires : --color-primary: #C0873F (or du Sahel), --color-primary-dark: #9B6830, --color-primary-light: #E8A85A
   - Surfaces : --color-bg: #FAFAF8, --color-surface: #FFFFFF, --color-surface-alt: #F5F0E8
   - Textes : --color-text: #1A1A1A, --color-text-muted: #6B6B6B, --color-text-light: #ADADAD
   - Statuts : --color-success: #27AE60, --color-warning: #E67E22, --color-danger: #E74C3C, --color-info: #2980B9
   - Typographie : --font-sans: 'Inter', system-ui, sans-serif; --font-mono: 'JetBrains Mono', monospace
   - Espacements : --space-xs: 4px, --space-sm: 8px, --space-md: 16px, --space-lg: 24px, --space-xl: 40px
   - Rayons : --radius-sm: 8px, --radius-md: 12px, --radius-lg: 16px, --radius-xl: 24px, --radius-pill: 9999px
   - Ombres : --shadow-sm: 0 1px 3px rgba(0,0,0,0.08), --shadow-md: 0 4px 16px rgba(0,0,0,0.10), --shadow-lg: 0 12px 32px rgba(0,0,0,0.15)
   - Transitions : --transition-fast: 0.15s ease, --transition-base: 0.25s ease, --transition-slow: 0.4s ease

2. Reset moderne : box-sizing border-box global, margin/padding 0 sur html/body, scroll-behavior smooth.

3. Body : font-family var(--font-sans), background var(--color-bg), color var(--color-text), line-height 1.6.

4. Utilitaires globaux : .sr-only, .truncate, .flex-center, classes de statut (.badge-success, .badge-warning, .badge-danger, .badge-info) avec les couleurs du design system.

5. Garde tous les styles existants fonctionnels — ne supprime rien, seulement remplace les valeurs hardcodées par des variables.

Ne touche pas aux layouts spécifiques des composants (admin, menu, etc.).
```

---

## PROMPT 2 — ADMIN : Refonte complète `admin-modal.css`

**Ouvre `public/css/admin-modal.css`, puis colle ce prompt :**

```
Refactore entièrement `public/css/admin-modal.css`.

Contexte : ce fichier gère 3 modals dans l'admin :
1. `.order-management-modal` — modal de gestion de commande existante (bottom-sheet sur mobile, centré sur desktop)
2. `.order-approval-modal` — modal qui s'affiche après scan QR d'un TICKET de commande
3. `.order-fusion-modal` — modal de fusion de plusieurs commandes

Problèmes actuels à corriger :
- Le modal d'approbation (approval) n'a aucun style propre et ressemble à un modale générique
- Le modal de fusion n'est pas visuellement distinctif
- Les boutons accepter/rejeter sont trop petits sur mobile

Règles strictes :

### Modal d'approbation ticket (`.order-approval-modal`) :
Crée un design PRO qui ressemble à un vrai terminal de validation de ticket :
- Position : fixed, inset 0, z-index 15000, display flex, align-items flex-end (mobile) ou center (≥600px)
- Backdrop : rgba(0,0,0,0.65) avec backdrop-filter blur(6px)
- `.approval-modal-content` : background #fff, border-radius 24px 24px 0 0 (mobile) ou 20px (desktop), width 100%, max-width 480px, max-height 90vh, overflow-y auto, animation slide-up (mobile) ou scale-in (desktop)
- `.approval-modal-header` : padding 1.5rem, sticky top 0 bg #fff, border-bottom 1px solid #f0f0f0, titre "📋 Validation de Commande" en font-size 1.05rem font-weight 700
- `.approval-order-id` : font-family monospace, font-size 0.75rem, color #aaa, display block, margin-top 4px
- `.approval-order-details` : grille 2 colonnes, padding 1rem 1.5rem, gap 8px, chaque ligne avec label gris et valeur bold
- `.approval-order-items` : liste avec chaque `.approval-item` en flex row : nom flex-1, quantité badge arrondi background #f0f0f0, prix en --color-primary bold
- `.approval-modal-actions` : sticky bottom 0, background #fff, padding 1rem 1.5rem, display flex, gap 12px, border-top 1px solid #f0f0f0
- `#btn-approval-reject` : flex 1, padding 1rem, background #FDE8E8, color #E74C3C, border-radius 12px, font-weight 700, border none, font-size 1rem, transition all 0.2s — hover: background #E74C3C, color #fff
- `#btn-approval-accept` : flex 2, padding 1rem, background linear-gradient(135deg, #27AE60, #219A52), color #fff, border-radius 12px, font-weight 700, border none, font-size 1rem, box-shadow 0 4px 12px rgba(39,174,96,0.3) — hover: brightness(1.08), transform translateY(-1px)

### Modal de fusion (`.order-fusion-modal`) :
- Même structure backdrop/sheet que approval
- `.fusion-modal-header` : background linear-gradient(135deg, #1A1A1A, #2C2C2C), color #fff, border-radius 24px 24px 0 0 (mobile) ou 20px 20px 0 0 — titre couleur #C0873F
- `.fusion-alert` : background #FFF8E1, border-left 4px solid #E67E22, padding 0.75rem 1rem, border-radius 8px, color #333, margin-bottom 1rem, font-weight 600
- `.fusion-order-item` : border 1px solid #E8E8E8, border-radius 10px, padding 0.75rem 1rem, margin-bottom 8px
- `.fusion-order-header` : flex space-between, `.fusion-order-id` monospace 0.75rem gris, `.fusion-order-total` font-weight 700 --color-primary
- `.fusion-item` : badge inline-block background #F5F0E8 color #9B6830, border-radius 4px, padding 2px 8px, font-size 0.78rem, margin 2px
- `.fusion-summary` : background #F8F8F8, border-radius 10px, padding 0.75rem 1rem
- `.fusion-modal-actions` : 3 boutons en colonne sur mobile (flex-direction column), en row sur desktop :
  * `#btn-fusion-scan` : outline style, border 2px solid --color-primary, color --color-primary, background transparent, padding 0.875rem
  * `#btn-fusion-decline` : background #F5F5F5, color #666
  * `#btn-fusion-confirm` : background --color-primary gradient, color #fff, box-shadow or

Ajoute les keyframes `@keyframes slide-up` (translateY(100%) → translateY(0)) et `@keyframes scale-in` (scale(0.9) opacity 0 → scale(1) opacity 1).

Utilise partout les variables CSS de main.css (--color-primary, --radius-*, --shadow-*, etc.).
```

---

## PROMPT 3 — ADMIN : Kanban des commandes — refonte CSS

**Ouvre `public/css/admin.css`, puis colle ce prompt :**

```
Dans `public/css/admin.css`, refactore la section Kanban des commandes.

Cherche et remplace tous les styles liés aux classes : `.orders-column`, `.order-card-kanban`, `.kanban-card-top`, `.kanban-table`, `.kanban-time`, `.kanban-card-id`, `.kanban-items-preview`, `.kanban-card-bottom`, `.kanban-total`, `.pay-badge`, `.kanban-approval-actions`, `.btn-kanban-approve`, `.btn-kanban-reject`, `.btn-kanban-manage`, `.kanban-empty`.

Objectif : un Kanban professionnel type Linear/Notion pour restaurant.

Règles :
1. `#orders-list` : display grid, grid-template-columns repeat(auto-fill, minmax(260px, 1fr)) sur desktop, 1 colonne sur mobile (<768px), gap 16px, padding 16px, align-items start.

2. `.orders-column` : background #F8F8F6, border-radius 14px, padding 0, overflow hidden, display flex, flex-direction column, max-height calc(100vh - 200px).

3. `.orders-column-header` : padding 12px 16px, display flex, align-items center, gap 8px, border-bottom 2px solid transparent, background #fff, position sticky, top 0.
   - `.col-emoji` : font-size 1.1rem
   - `.col-title` : font-weight 700, font-size 0.88rem, color #1A1A1A, flex 1
   - `.col-count` : background #E8E8E8, color #666, border-radius 99px, padding 2px 8px, font-size 0.75rem, font-weight 700

4. Couleurs header par statut (border-bottom) :
   - `.status-pending_approval .orders-column-header` : border-bottom-color #E67E22, background #FFF8F0
   - `.status-accepted .orders-column-header` : border-bottom-color #27AE60, background #F0FFF4
   - `.status-preparing .orders-column-header` : border-bottom-color #C0873F, background #FDF8F0
   - `.status-ready .orders-column-header` : border-bottom-color #2980B9, background #F0F7FF
   - `.status-served .orders-column-header` : border-bottom-color #16A085, background #F0FFFD
   - `.status-cancelled .orders-column-header` : border-bottom-color #E74C3C, background #FFF0F0

5. `.orders-column-body` : padding 8px, display flex, flex-direction column, gap 8px, overflow-y auto, flex 1.

6. `.order-card-kanban` : background #fff, border-radius 12px, padding 12px, box-shadow 0 1px 3px rgba(0,0,0,0.06), border 1px solid #F0F0F0, transition all 0.2s, cursor pointer.
   - hover : box-shadow 0 4px 12px rgba(0,0,0,0.10), border-color #E0D5C5, transform translateY(-1px)

7. `.kanban-card-top` : display flex, justify-content space-between, align-items center, margin-bottom 6px.
   - `.kanban-table` : font-weight 700, font-size 0.85rem, color #1A1A1A, background #F5F0E8, padding 3px 10px, border-radius 6px
   - `.kanban-time` : font-size 0.72rem, color #AAA

8. `.kanban-card-id` : font-family monospace, font-size 0.68rem, color #C0C0C0, margin-bottom 6px, overflow hidden, text-overflow ellipsis, white-space nowrap

9. `.kanban-items-preview` : font-size 0.82rem, color #555, margin-bottom 8px, line-height 1.4, display -webkit-box, -webkit-line-clamp 2, -webkit-box-orient vertical, overflow hidden

10. `.kanban-card-bottom` : display flex, align-items center, justify-content space-between, margin-bottom 10px.
    - `.kanban-total` : font-weight 800, font-size 0.95rem, color #1A1A1A
    - `.pay-badge` : font-size 0.72rem, padding 2px 8px, border-radius 99px
    - `.pay-badge.paid` : background #E8F5E9, color #27AE60
    - `.pay-badge.pending-pay` : background #FFF8E1, color #E67E22

11. `.kanban-approval-actions` : display flex, gap 6px, margin-bottom 6px.
    - `.btn-kanban-approve` : flex 1, padding 0.5rem, background #E8F5E9, color #27AE60, border none, border-radius 8px, font-weight 700, font-size 0.82rem, cursor pointer, transition all 0.15s — hover: background #27AE60 color #fff
    - `.btn-kanban-reject` : flex 1, padding 0.5rem, background #FDE8E8, color #E74C3C, border none, border-radius 8px, font-weight 700, font-size 0.82rem, cursor pointer — hover: background #E74C3C color #fff

12. `.btn-kanban-manage` : width 100%, padding 0.55rem, background #F5F5F5, color #555, border none, border-radius 8px, font-size 0.82rem, font-weight 600, cursor pointer, text-align center — hover: background #E8E8E8

13. `.kanban-empty` : text-align center, color #CCC, padding 2rem 1rem, font-size 0.85rem, font-style italic

Mobile (<768px) : `.orders-column` max-height none, `#orders-list` overflow-x auto, display flex (horizontal scroll), chaque colonne min-width 260px.
```

---

## PROMPT 4 — BUG CRITIQUE : Séparation QR Ticket vs QR Table

**Ouvre `public/js/admin.js`, puis colle ce prompt :**

````
Dans `public/js/admin.js`, dans la méthode `handleQRScan(decodedText)`, corrige le bug où un QR code de TABLE redirige l'admin vers le menu client.

Contexte du bug :
- Les QR de TABLE ont la structure JSON : `{ "table": "12", "chairs": 4, "location": "Terrasse", "url": "/menu.html?table=12" }`
- Les QR de TICKET (commande) ont la structure : `{ "orderId": "ORD-xxx", "table": "12" }` ou `{ "qrTicket": "ORD-xxx", "table": "12" }`
- Actuellement, quand l'admin scanne un QR de TABLE, il est redirigé vers `qrData.url` — ce qui est un comportement client, PAS admin.

Fix requis dans `handleQRScan` :
1. Garde le bloc de détection JSON (try/catch).
2. Pour le cas `qrData.table && qrData.url` (QR de table), remplace la redirection par :
   - Arrêter la redirection complètement
   - Afficher une notification de type avertissement distincte :
     ```js
     NotificationManager.showSuccess(
       null,
       "⚠️ QR de Table Détecté",
       `Table ${qrData.table} — ${qrData.chairs || '?'} couverts (${qrData.location || ''}). Ce QR est destiné aux clients. Scannez un QR de commande.`,
       4000
     );
     ```
   - Réinitialiser `window.qrScannerAdmin.processingScan = false` si disponible
   - Appeler `this.restartScanner()` après 500ms
   - Ne pas stocker dans sessionStorage, ne pas rediriger
   - Ajouter un `return` pour stopper le traitement

3. Garde le bloc `qrData.orderId || qrData.qrTicket` exactement tel quel.
4. Garde le fallback pour strings commençant par "ORD-" exactement tel quel.
5. Dans le cas "QR non reconnu", améliore le message : distingue les cas en vérifiant si decodedText ressemble à une URL (contient "http") — si oui, message "Ce QR est une URL externe, non compatible." sinon "QR non reconnu."

Ajoute aussi en haut de la méthode, après le hideScanLoader, un log console.debug pour traçabilité : `console.debug('[AdminQR] Decoded:', decodedText.substring(0, 80));`
````

---

## PROMPT 5 — IMAGES DES PLATS : Fallback robuste avec Unsplash

**Ouvre `public/js/menu.js`, puis colle ce prompt :**

````
Dans `public/js/menu.js`, refactore le système de chargement des images des plats pour gérer les images manquantes ou non-conformes.

Contexte :
- `backend/data/menu.json` contient des images locales (ex: `/img/domoda.jpg` pour "Poulet Yassa" — incohérence)
- Certaines images n'existent pas côté serveur ou ne correspondent pas au plat

Règles strictes :

1. Ajoute un objet mapping en haut du fichier (après les imports/`use strict`) :
```js
const DISH_IMAGE_MAP = {
  // Plats
  'poulet yassa':       'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&q=80',
  'thieboudienne':      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
  'thiébou yapp':       'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80',
  'mafé':               'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80',
  'pastels':            'https://images.unsplash.com/photo-1599031565836-e54740c3de3a?w=400&q=80',
  'thiakry':            'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80',
  'tiramisu':           'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80',
  'sorbet mangue':      'https://images.unsplash.com/photo-1567206563114-c179706e9c04?w=400&q=80',
  // Boissons
  'bissap':             'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=400&q=80',
  'jus de citron':      'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&q=80',
  'jus de gingembre':   'https://images.unsplash.com/photo-1568909344668-6f14a07b56a0?w=400&q=80',
  "jus d'orange":       'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80',
  'lait de coco':       'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400&q=80',
  'jus de tamarin':     'https://images.unsplash.com/photo-1596803244897-3b7d2cd09f23?w=400&q=80',
  // Fallback générique
  '__default_plat__':   'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
  '__default_boisson__':'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
};
````

2. Crée une fonction utilitaire :

```js
function getItemImage(item, category = "plat") {
  const key = (item.name || "").toLowerCase().trim();
  return (
    DISH_IMAGE_MAP[key] ||
    item.image || // garde l'image originale si elle existe ET si elle n'est pas un placeholder évident
    (category === "boisson"
      ? DISH_IMAGE_MAP["__default_boisson__"]
      : DISH_IMAGE_MAP["__default_plat__"])
  );
}
```

3. Partout dans le fichier où tu construis le HTML des items du menu (cherche les `<img` avec `item.image`), remplace `item.image` par `getItemImage(item, category)`.

4. Sur chaque tag `<img>` généré, ajoute :
   - `loading="lazy"`
   - `onerror="this.onerror=null;this.src='${DISH_IMAGE_MAP['__default_plat__']}'"`
   - `style="object-fit:cover;width:100%;height:100%;border-radius:inherit;"`
   - `alt="${item.name}"`

5. Pour le CSS des images dans les cards menu (dans `public/css/menu.css` si tu peux y accéder) : assure-toi que le container image est `aspect-ratio: 4/3`, `overflow: hidden`, `background: #f0ede8`.

```

---

## PROMPT 6 — MENU CSS : Cards plats responsive & modernes

**Ouvre `public/css/menu.css`, puis colle ce prompt :**

```

Refactore `public/css/menu.css` pour les cards de plats et boissons.

Objectif : cards modernes, propres, responsive sur tous les devices (mobile, tablet, desktop).

Cherche les sélecteurs existants liés aux cards de menu et remplace/enrichis :

1. `.menu-grid` ou le container des cards :
   - display grid
   - grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr))
   - gap: 16px
   - padding: 0 16px 24px

2. `.menu-item` ou `.dish-card` (card principale) :
   - background: #fff
   - border-radius: 16px
   - overflow: hidden
   - box-shadow: 0 2px 8px rgba(0,0,0,0.06)
   - border: 1px solid rgba(0,0,0,0.06)
   - transition: transform 0.2s ease, box-shadow 0.2s ease
   - display: flex
   - flex-direction: column
   - hover → transform translateY(-3px), box-shadow 0 8px 24px rgba(0,0,0,0.12)

3. `.dish-image-wrapper` ou `.menu-item-image` (container image) :
   - aspect-ratio: 4/3
   - overflow: hidden
   - background: #F5F0E8
   - position: relative
   - img : width 100%, height 100%, object-fit cover, transition transform 0.3s ease
   - hover img → transform scale(1.05)

4. `.dish-info` ou `.menu-item-body` (contenu) :
   - padding: 14px 16px 16px
   - flex: 1
   - display: flex
   - flex-direction: column

5. `.dish-name` :
   - font-size: 0.97rem
   - font-weight: 700
   - color: #1A1A1A
   - margin-bottom: 4px
   - line-height: 1.3

6. `.dish-description` :
   - font-size: 0.80rem
   - color: #888
   - line-height: 1.45
   - margin-bottom: 12px
   - flex: 1
   - display: -webkit-box
   - -webkit-line-clamp: 2
   - -webkit-box-orient: vertical
   - overflow: hidden

7. `.dish-footer` (prix + bouton) :
   - display: flex
   - align-items: center
   - justify-content: space-between
   - margin-top: auto

8. `.dish-price` :
   - font-weight: 800
   - font-size: 1.05rem
   - color: #C0873F

9. `.btn-add-cart` ou `.add-to-cart` :
   - background: #C0873F
   - color: #fff
   - border: none
   - border-radius: 9px
   - padding: 7px 14px
   - font-size: 0.82rem
   - font-weight: 700
   - cursor: pointer
   - transition: all 0.15s
   - hover → background #9B6830 transform scale(1.04)
   - active → scale(0.97)

Mobile (<480px) :

- `.menu-grid` → grid-template-columns 1fr (1 colonne)
- `.dish-image-wrapper` → aspect-ratio 16/9

Tablet (481px–768px) :

- `.menu-grid` → grid-template-columns repeat(2, 1fr)

Desktop (>1200px) :

- `.menu-grid` → grid-template-columns repeat(3, 1fr)

```

---

## PROMPT 7 — MODAL GESTION COMMANDE : Refonte HTML dans admin.js

**Ouvre `public/js/admin.js`, puis colle ce prompt :**

```

Dans `public/js/admin.js`, dans la méthode `displayOrderInModal(order)`, refactore entièrement le HTML injecté dans le modal de gestion.

Le modal actuel utilise une structure HTML basique. Remplace-la par une structure qui utilise les classes CSS `mm-*` déjà définies dans `admin-modal.css`.

Structure HTML cible à générer dans `orderDetailsElement.innerHTML` :

```html
<div class="mm-hero">
  <div class="mm-hero-left">
    <span class="mm-table-badge">🪑 Table ${order.table}</span>
    <div class="mm-total">${formatPrice(order.total)} <span>CFA</span></div>
    <div style="font-size:0.78rem;color:#AAA;margin-top:4px;">
      ${(order.items||[]).length} article(s)
    </div>
  </div>
  <div class="mm-hero-right">
    <span
      class="mm-status-pill"
      style="background:${statusBg};color:${statusColor};"
      >${statusLabel}</span
    >
    <span
      class="mm-pay-pill ${order.paymentStatus === 'paid' ? 'paid' : 'unpaid'}"
      >${order.paymentStatus === 'paid' ? '💳 Payé' : '⏳ Impayé'}</span
    >
  </div>
</div>
<div class="mm-items">
  ${(order.items||[]).map(i => `
  <div class="mm-item">
    <span class="mm-item-name">${i.name}</span>
    <span class="mm-item-qty">×${i.quantity||1}</span>
    <span class="mm-item-price"
      >${formatPrice((i.price||0)*(i.quantity||1))} CFA</span
    >
  </div>
  `).join('')}
</div>
<div class="mm-footer-meta">
  <span
    >🕐 ${order.timestamp ? new Date(order.timestamp).toLocaleString('fr-FR') :
    '—'}</span
  >
  <span>📦 ${order.orderId || order.id}</span>
</div>
```

Pour les couleurs de statut (`statusBg`, `statusColor`, `statusLabel`), crée une fonction helper locale `getStatusStyle(status)` qui retourne `{ bg, color, label }` :

- pending_approval / pending_scan / pending → bg #FFF8E1, color #E67E22, label "⏳ En attente"
- accepted → bg #E8F5E9, color #27AE60, label "✅ Acceptée"
- preparing → bg #FDF8F0, color #C0873F, label "👨‍🍳 En préparation"
- ready → bg #E3F2FD, color #2980B9, label "🍽️ Prête"
- served → bg #E0F2F1, color #16A085, label "🎉 Servie"
- cancelled → bg #FDE8E8, color #E74C3C, label "❌ Annulée"
- default → bg #F5F5F5, color #666, label status

Dans `setupModalEventListeners`, remplace le HTML des boutons par :

```html
<div class="mm-actions-grid">
  <button class="mm-btn mm-btn-accept" data-action="accepted">
    ✅ Accepter
  </button>
  <button class="mm-btn mm-btn-prepare" data-action="preparing">
    👨‍🍳 Préparer
  </button>
  <button class="mm-btn mm-btn-ready" data-action="ready">🍽️ Prête</button>
  <button class="mm-btn mm-btn-serve" data-action="served">🎉 Servie</button>
  <button class="mm-btn mm-btn-cancel" data-action="cancelled">
    ⛔ Annuler
  </button>
  <button class="mm-btn mm-btn-delete" data-action="delete">🗑️ Sup.</button>
</div>
```

Assure-toi que la logique métier (onclick, optimistic update, etc.) reste exactement identique.

```

---

## PROMPT 8 — BACKEND : Route de validation QR distingue ticket vs table

**Ouvre `backend/routes/orders.js`, puis colle ce prompt :**

```

Dans `backend/routes/orders.js`, vérifie et améliore la route `GET /api/orders/:orderId`.

Contexte : quand l'admin scanne un QR code, le frontend appelle cette route. Elle doit retourner l'ordre avec son statut complet, y compris `pending_approval`.

Vérifie que :

1. La route `GET /api/orders/:orderId` existe et retourne l'ordre complet (tous champs, y compris `table`, `items`, `total`, `status`, `paymentStatus`, `timestamp`).

2. Elle inclut les ordres avec status `pending_approval` et `pending_scan` (pas seulement les ordres actifs).

3. Si l'ordre n'existe pas, retourner `res.status(404).json({ error: 'Order not found', orderId: req.params.orderId })`.

4. Ajoute une route `GET /api/qr/type` qui prend un query param `data` (le contenu brut du QR décodé) et retourne `{ type: 'ticket' | 'table' | 'unknown', payload: {...} }`. Cette route aide le frontend à distinguer les types sans logique côté client. Logique :
   - Tente de parser le JSON
   - Si `orderId` ou `qrTicket` présents → `{ type: 'ticket', payload: parsedData }`
   - Si `table` et `url` présents → `{ type: 'table', payload: parsedData }`
   - Sinon → `{ type: 'unknown', payload: null }`
   - Si parse JSON échoue mais commence par "ORD-" → `{ type: 'ticket', payload: { orderId: data } }`
   - Route publique (pas d'auth requise, données non sensibles)

5. Assure-toi que la route `GET /api/orders` accepte le query param `includePendingApproval=true` et retourne bien ces commandes dans les résultats.

```

---

## PROMPT 9 — ADMIN HTML : Structure du modal gestion

**Ouvre `public/admin.html`, puis colle ce prompt :**

```

Dans `public/admin.html`, trouve le div `id="order-management-modal"` et remplace son innerHTML par la structure suivante utilisant les classes `mm-*` :

```html
<div id="order-management-modal" class="order-management-modal">
  <div class="mm-backdrop" id="close-management-modal"></div>
  <div
    class="mm-sheet"
    role="dialog"
    aria-modal="true"
    aria-labelledby="mm-title"
  >
    <div class="mm-handle" aria-hidden="true"></div>
    <div class="mm-header">
      <div class="mm-header-title">
        <span class="mm-header-icon">📋</span>
        <div>
          <h3 id="mm-title">Gestion commande</h3>
          <div class="mm-order-id" id="modal-order-id">—</div>
        </div>
      </div>
      <button
        class="mm-close"
        id="close-management-modal-btn"
        aria-label="Fermer"
      >
        ✕
      </button>
    </div>
    <div class="mm-body">
      <div id="modal-order-details"><!-- injecté par JS --></div>
    </div>
    <div
      class="mm-footer"
      style="padding: 0 1.5rem 1.5rem; position: sticky; bottom: 0; background: #fff; padding-top: 0.75rem; border-top: 1px solid #F0F0F0;"
    >
      <div class="modal-actions mm-actions-grid"><!-- injecté par JS --></div>
    </div>
  </div>
</div>
```

Aussi, dans `setupModalEventListeners()` dans `admin.js`, mets à jour les références :

- `document.getElementById('close-management-modal')` → cherche aussi `document.getElementById('close-management-modal-btn')` pour le bouton X
- Le backdrop `mm-backdrop` doit aussi fermer le modal au clic
- Retire `id="modal-order-date"` si présent (date est maintenant dans le body)

```

---

## PROMPT 10 — RESPONSIVE : Meta viewport, PWA & scroll

**Ouvre `public/admin.html` ET `public/menu.html`, puis colle ce prompt pour chaque fichier :**

```

Dans ce fichier HTML, vérifie et corrige :

1. Dans `<head>`, assure-toi que ces metas existent exactement :

```html
<meta charset="UTF-8" />
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
/>
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="theme-color" content="#C0873F" />
```

2. Assure-toi que `<html lang="fr">` est défini.

3. Dans le `<body>` ou dans le CSS inline, assure-toi que : `overscroll-behavior: none` sur body pour éviter le pull-to-refresh natif non désiré.

4. Tous les `<button>` et liens interactifs doivent avoir `touch-action: manipulation` (via CSS global ou attribut style si isolé).

5. Si un `<select>` de caméra (`id="camera-select-admin"` ou similaire) existe, assure-toi qu'il a `font-size: 16px` minimum dans son style pour éviter le zoom auto sur iOS.

```

---

## PROMPT 11 — NOTIFICATION MANAGER : Amélioration visuelle

**Cherche dans `public/js/admin.js` ou `public/js/main.js` la classe/fonction `NotificationManager`, puis colle ce prompt :**

```

Trouve la définition de `NotificationManager` (class ou objet avec méthode `showSuccess`).

Refactore `showSuccess` pour supporter plusieurs types visuels avec icône et couleur distinctes.

Signature mise à jour : `showSuccess(orderId, title, message, duration, type = 'info')`
où `type` peut être : `'success'`, `'error'`, `'warning'`, `'info'` (défaut).

Styles par type (génère le CSS inline dans le toast) :

- `success` → background linear-gradient(135deg, #27AE60, #219A52), icône ✅
- `error` → background linear-gradient(135deg, #E74C3C, #C0392B), icône ❌
- `warning` → background linear-gradient(135deg, #E67E22, #D35400), icône ⚠️
- `info` → background linear-gradient(135deg, #2980B9, #1F618D), icône ℹ️ (défaut quand type non spécifié)

Structure du toast :

```html
<div class="rp-toast rp-toast-${type}">
  <span class="rp-toast-icon">${icon}</span>
  <div class="rp-toast-body">
    <div class="rp-toast-title">${title}</div>
    ${message ? `
    <div class="rp-toast-msg">${message}</div>
    ` : ''} ${orderId ? `
    <div class="rp-toast-id">${orderId}</div>
    ` : ''}
  </div>
  <button class="rp-toast-close">✕</button>
</div>
```

CSS injecté une fois dans `<head>` si absent (vérifie avec `document.getElementById('rp-toast-styles')`) :

- `.rp-toast` : position fixed, bottom 20px, right 20px, z-index 99999, display flex, align-items flex-start, gap 10px, color #fff, border-radius 14px, padding 14px 16px, min-width 280px, max-width 380px, box-shadow 0 8px 24px rgba(0,0,0,0.25), animation slide-in-right 0.3s ease
- `.rp-toast-icon` : font-size 1.2rem, flex-shrink 0, padding-top 2px
- `.rp-toast-body` : flex 1
- `.rp-toast-title` : font-weight 700, font-size 0.9rem, line-height 1.3
- `.rp-toast-msg` : font-size 0.8rem, opacity 0.85, margin-top 3px
- `.rp-toast-id` : font-family monospace, font-size 0.7rem, opacity 0.6, margin-top 4px
- `.rp-toast-close` : background none, border none, color rgba(255,255,255,0.7), cursor pointer, padding 0 0 0 8px, font-size 1rem, flex-shrink 0, align-self flex-start
- `@keyframes slide-in-right` : from transform translateX(110%) opacity 0 / to transform translateX(0) opacity 1

Mets à jour tous les appels `NotificationManager.showSuccess(...)` dans `admin.js` :

- Appels de succès → ajoute `'success'`
- Appels d'erreur → ajoute `'error'`
- Appels d'avertissement (QR table détecté, etc.) → ajoute `'warning'`

```

---

## PROMPT 12 — VÉRIFICATION FINALE & CLEANUP

**Ouvre le workspace complet dans Copilot, puis colle ce prompt :**

```

Effectue une vérification finale sur le projet RestoPlus-LaKora.

1. Dans `public/css/admin.css`, vérifie qu'il n'y a pas de doublons de sélecteurs entre admin.css et admin-modal.css. Si tu trouves des définitions de `.order-management-modal`, `.order-approval-modal`, ou `.order-fusion-modal` dans admin.css, supprime-les (elles sont maintenant dans admin-modal.css).

2. Dans `public/admin.html`, vérifie que les scripts sont chargés dans cet ordre :
   a. html5-qrcode (CDN)
   b. qr-scanner-manager.js
   c. admin-auth.js
   d. admin-modal.css (link)
   e. admin.js
   f. admin-stats.js
   g. admin-reservations.js
   Si ce n'est pas le cas, corrige l'ordre.

3. Dans `public/js/admin.js`, vérifie que `NotificationManager.showSuccess` n'est jamais appelé avec `orderId` comme premier argument lorsque `orderId` est `null` ou `undefined` — remplace par `null` explicite dans ces cas.

4. Dans `public/css/menu.css`, supprime tout `!important` non nécessaire. Les `!important` ne doivent rester que sur les overrides de bibliothèques tierces.

5. Vérifie que chaque fichier HTML a bien le `<link rel="stylesheet" href="/css/main.css">` avant tous les autres CSS du projet.

6. Dans `backend/data/menu.json`, corrige l'incohérence des images :
   - "Poulet Yassa" → image `/img/poulet-yassa.jpg` (note: le fichier n'existe pas encore, c'est ok, le fallback JS gérera)
   - "Thieboudienne" → `/img/thieboudienne.jpg`
   - "Thiébou Yapp" → `/img/thiebou-yapp.jpg`
   - "Mafé" → `/img/mafe.jpg` (sans caractère spécial)
     Garde les autres images existantes qui correspondent déjà à leur plat.

7. Rapport final : liste tous les fichiers modifiés avec un résumé d'une ligne par fichier.

```

---

## Notes d'implémentation

- **Ordre** : Exécute les prompts 1→12 dans l'ordre. Chaque prompt suppose le précédent terminé.
- **Tests** : Après les prompts 4 et 8, teste manuellement le scan QR avec un vrai QR de table pour vérifier qu'il n'y a plus de redirection.
- **Images** : Le prompt 5 utilise des URLs Unsplash publiques sans clé API — elles fonctionnent directement. Pour la production, remplace par tes vraies photos.
- **CSS Variables** : Le prompt 1 est le fondement. Si Copilot ne l'applique pas complètement, lance-le deux fois.
- **Copilot Inline Edit** : Pour les prompts 2, 3 et 6, utilise `Ctrl+K` sur la sélection du fichier entier pour l'édition inline plutôt que le chat, c'est plus précis.
```
