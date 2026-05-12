# RestoPlus-LaKora — Prompts QR, Session & UI

> Série de corrections sur la logique QR codes, sessions table, scanner admin, et design.
> Chaque prompt est autonome. Applique-les dans l'ordre indiqué.

---

## CONTEXTE GLOBAL (lis avant tout)

### Architecture QR actuelle :
- **QR TABLE** → JSON `{ table, chairs, location, url }` → généré côté admin (`table-manager.js`)
- **QR TICKET** → JSON `{ orderId, table, total, paymentMethod, paymentStatus, timestamp }` → généré dans `cart.js` après commande

### Problèmes à corriger :
1. Session table = 2h → trop long, client peut commander depuis chez lui
2. La session ne se coupe pas proprement après validation du panier
3. Scanner admin ne reconnaît plus les tickets QR (bug `processQRCodeScan` override)
4. Tickets QR doivent avoir un `orderHash` unique dans l'historique
5. Design : zones non stylisées avec couleurs par défaut du navigateur

---

## PROMPT QR-1 — SESSION TABLE : TTL 30min + déconnexion après validation panier

**Fichier : `public/js/menu.js`**

```
Dans `public/js/menu.js`, corrige la gestion de session table.

### 1. Réduis le TTL de 2h à 30 minutes :
Ligne 5, remplace :
```js
const TABLE_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 heures
```
Par :
```js
const TABLE_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
```

### 2. Dans `setTableSession`, ajoute un `expiresAt` explicite :
```js
function setTableSession(tableNumber) {
  const now = Date.now();
  sessionStorage.setItem(
    TABLE_SESSION_KEY,
    JSON.stringify({
      table:     tableNumber,
      startedAt: now,
      expiresAt: now + TABLE_SESSION_TTL_MS,
    }),
  );
}
```

### 3. Dans `getTableSession`, utilise `expiresAt` si présent :
```js
function getTableSession() {
  try {
    const raw = sessionStorage.getItem(TABLE_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    const expiry = session.expiresAt || (session.startedAt + TABLE_SESSION_TTL_MS);
    if (Date.now() > expiry) {
      clearTableSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}
```

### 4. Déconnexion IMMÉDIATE après soumission du panier (pas seulement après "accepted") :
Dans `setupEventListeners`, dans le listener `orderCreated`, ajoute APRÈS `localStorage.setItem("currentOrderId", orderId)` :

```js
// Déconnecte la session table immédiatement après commande soumise
// Le client doit re-scanner pour commander à nouveau
clearTableSession();
showBanner(
  "✅ Commande envoyée ! Votre ticket QR a été généré. Attendez la validation du serveur.",
  "#C0873F",
);
```

### 5. Dans `fetchAndUpdateOrderStatus`, supprime l'appel à `this.onOrderAccepted()` qui appelle clearTableSession() (désormais redondant, session déjà coupée) :
Remplace :
```js
if (order.status === "accepted") this.onOrderAccepted();
```
Par :
```js
if (order.status === "accepted") {
  // Session déjà coupée à la soumission — affiche juste la confirmation
  showBanner(
    "✅ Commande acceptée par le serveur ! Elle est en cours de préparation.",
    "#27AE60",
  );
  this.stopOrderPolling();
}
```

### 6. Dans `onOrderAccepted()`, simplifie (session déjà coupée) :
```js
onOrderAccepted() {
  // La session a déjà été coupée à la soumission du panier.
  // Cette méthode est conservée pour compatibilité mais ne doit plus clearTableSession.
  this.updateTableInfo();
}
```
```

---

## PROMPT QR-2 — GROS BUG SCANNER : le scan ticket ne fonctionne plus côté admin

**Fichier : `public/js/admin.js`**

### Diagnostic du bug :
Dans `admin.js`, quand `qrScannerAdmin` est créé, `processQRCodeScan` est overridé (ligne ~109). Cet override vérifie :
```js
document.getElementById("order-approval-modal") ||
```
**Ce check est faux** : il cherche un élément DOM par ID alors que les modals sont créés dynamiquement et `getElementById` retourne `null` si le modal n'est pas encore dans le DOM au moment du check. Résultat : `processingScan` reste `true` et **le scanner est bloqué**.

```
Dans `public/js/admin.js`, trouve le bloc où `window.qrScannerAdmin.processQRCodeScan` est overridé (autour de la ligne 109). Il ressemble à :

```js
window.qrScannerAdmin.processQRCodeScan = (decodedText) => {
  if (
    window.qrScannerAdmin.processingScan ||
    document.getElementById("order-approval-modal") ||
    ...
  ) return;
  window.qrScannerAdmin.processingScan = true;
  this.handleQRScan(decodedText);
};
```

Remplace cet override ENTIER par :

```js
window.qrScannerAdmin.processQRCodeScan = (decodedText) => {
  // Guard : ignore si déjà en cours de traitement
  if (window.qrScannerAdmin.processingScan) return;

  // Guard : ignore si un modal de validation/fusion est VISIBLE (pas juste présent dans le DOM)
  const approvalModal = document.getElementById("order-approval-modal");
  const fusionModal   = document.getElementById("order-fusion-modal");
  const approvalVisible = approvalModal && approvalModal.style.display !== "none" && approvalModal.offsetParent !== null;
  const fusionVisible   = fusionModal   && fusionModal.style.display   !== "none" && fusionModal.offsetParent   !== null;
  if (approvalVisible || fusionVisible) return;

  window.qrScannerAdmin.processingScan = true;

  // Safety timeout : débloque après 8 secondes max pour éviter tout gel
  const safetyTimer = setTimeout(() => {
    window.qrScannerAdmin.processingScan = false;
    window.qrScannerAdmin.hideScanLoader?.();
    console.warn("[AdminQR] Safety timeout triggered — scanner débloqué");
  }, 8000);

  // Enveloppe dans un try/catch pour que processingScan ne reste jamais true en cas d'erreur
  try {
    this.handleQRScan(decodedText);
  } catch (err) {
    console.error("[AdminQR] Erreur handleQRScan:", err);
    window.qrScannerAdmin.processingScan = false;
    window.qrScannerAdmin.hideScanLoader?.();
    clearTimeout(safetyTimer);
  }
};
```

Assure-toi que `handleQRScan` et toutes ses branches async (`handleOrderScan`) appellent bien `clearTimeout(safetyTimer)` ou que le safety timeout de 8s est acceptable comme fallback. Vu que les branches async ont leur propre gestion, le timeout est un filet de sécurité acceptable.
```

---

## PROMPT QR-3 — UNICITÉ DES TICKETS QR dans l'historique

**Fichiers : `public/js/cart.js` + `backend/models/Order.js`**

```
### Partie 1 — `public/js/cart.js` : ajouter un `orderHash` dans les données QR ticket

Dans `generateQRCodeWithLocalLibrary` et `generateQRTicketFallback`, dans la construction de `qrData`, ajoute un champ `h` (hash court) pour identifier univoquement ce ticket sans exposer trop d'info :

```js
// Avant :
const qrData = { orderId: order.id, table: order.table, total: order.total, ... };

// Après : ajoute un hash court basé sur orderId + timestamp
const orderHash = btoa(`${order.id}:${order.timestamp || Date.now()}`).slice(0, 12).replace(/[+/=]/g, "");
const qrData = {
  orderId:       order.id || order.orderId,
  table:         order.table,
  total:         order.total,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  timestamp:     order.timestamp,
  h:             orderHash,   // ← hash unique pour vérification côté admin
};
```

Applique ce changement dans les 2 endroits (generateQRCodeWithLocalLibrary ligne ~466 ET generateQRTicketFallback ligne ~496).

### Partie 2 — `backend/models/Order.js` : ajouter un champ `orderHash` au schéma

Dans le schéma `orderSchema`, ajoute après le champ `orderId` :

```js
orderHash: {
  type: String,
  index: true,
  sparse: true, // null pour les commandes sans hash (anciennes)
},
```

### Partie 3 — `backend/services/order.service.js` : générer l'orderHash à la création

Dans `createOrder`, avant le `new Order(...)`, ajoute :

```js
const { createHash } = require("crypto");
const orderHash = createHash("sha256")
  .update(`${data.orderId || ""}:${Date.now()}`)
  .digest("base64")
  .slice(0, 16)
  .replace(/[+/=]/g, "");
```

Puis ajoute `orderHash` dans les données du `new Order({...data, orderHash, ...})`.

### Partie 4 — `backend/controllers/order.controller.js` : vérifier l'unicité du hash au scan

Dans `handleQRScan` côté admin (pas dans le controller mais documenter), le scan doit d'abord vérifier via `GET /api/orders/:orderId` — le `orderHash` renvoyé dans la réponse permet de valider que le QR scanné correspond bien à la commande.

Dans `getOne`, la réponse inclut déjà `orderHash` via `.lean()` — pas de changement nécessaire.
```

---

## PROMPT QR-4 — LOGIQUE TABLE : empêcher les nouvelles commandes si session expirée

**Fichier : `public/js/cart.js`**

```
Dans `public/js/cart.js`, dans la méthode `finalizeOrder` (ou juste avant l'appel à l'API `/api/orders`), ajoute une vérification que la session table est encore valide :

```js
finalizeOrder(paymentMethod, paymentStatus) {
  // ─── Vérification session table ─────────────────────────────────────
  const TABLE_SESSION_KEY = "tableSession";
  const TABLE_SESSION_TTL_MS = 30 * 60 * 1000; // doit correspondre à menu.js

  let activeTable = null;
  try {
    const raw = sessionStorage.getItem(TABLE_SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      const expiry = session.expiresAt || (session.startedAt + TABLE_SESSION_TTL_MS);
      if (Date.now() <= expiry) {
        activeTable = session.table;
      }
    }
  } catch {}

  if (!activeTable) {
    // Session expirée ou absente — bloque la commande
    alert("⏱️ Votre session de table a expiré. Scannez à nouveau le QR code de votre table pour commander.");
    // Ou utilise NotificationManager si disponible :
    // NotificationManager?.showSuccess(null, "Session expirée", "Scannez le QR de votre table pour continuer.", 4000, "warning");
    return;
  }
  // ─── Suite normale de finalizeOrder ─────────────────────────────────
  // ... (code existant inchangé)
}
```

**Important :** ne modifie que le début de `finalizeOrder`. Tout le reste du code (fetch, QR generation, etc.) reste identique.
```

---

## PROMPT QR-5 — ADMIN SCANNER : restartScanner robuste après chaque modal fermé

**Fichier : `public/js/admin.js`**

```
Dans `public/js/admin.js`, dans les callbacks de fermeture des modals (`order-approval-modal` et `order-fusion-modal`), assure-toi que `processingScan` est reset ET que le scanner redémarre.

Cherche tous les endroits où un modal est fermé (bouton X, backdrop, reject, accept) et ajoute systématiquement :

```js
// Pattern à appliquer partout où un modal se ferme :
if (window.qrScannerAdmin) {
  window.qrScannerAdmin.processingScan = false;
  window.qrScannerAdmin.hideScanLoader?.();
}
setTimeout(() => this.restartScanner(), 300);
```

Spécifiquement, vérifie et applique ce pattern dans :
1. `btn-approval-reject` click handler
2. `btn-approval-accept` click handler (après la logique métier)
3. `btn-fusion-confirm` click handler (après la logique métier)
4. `btn-fusion-decline` click handler
5. `btn-fusion-scan` click handler
6. Tout bouton `.approval-modal-close` ou backdrop de ces modals

Dans `restartScanner()` lui-même, ajoute un log pour traçabilité :
```js
restartScanner() {
  console.debug("[AdminQR] restartScanner() called");
  // ... code existant ...
}
```
```

---

## PROMPT UI-1 — DESIGN : uniformisation couleurs primaires dans tout le projet

**Fichiers : `public/css/main.css` (et `admin.css`, `menu.css`)**

```
Dans `public/css/main.css`, dans le `:root`, vérifie que ces variables sont bien déclarées (ajoute si manquantes) :

```css
:root {
  --color-primary:       #C0873F;
  --color-primary-dark:  #9B6830;
  --color-primary-light: #E8A85A;
  --color-primary-bg:    #FDF8F0;   /* fond léger gold */
  --color-primary-glow:  rgba(192, 135, 63, 0.2);

  --color-bg:            #FAFAF8;
  --color-surface:       #FFFFFF;
  --color-surface-alt:   #F5F0E8;
  --color-border:        #EBEBEB;
  --color-border-strong: #D0C8BA;

  --color-text:          #1A1A1A;
  --color-text-muted:    #6B6B6B;
  --color-text-light:    #ADADAD;

  --color-success:       #27AE60;
  --color-warning:       #E67E22;
  --color-danger:        #E74C3C;
  --color-info:          #2980B9;

  --font-sans:  'Inter', system-ui, -apple-system, sans-serif;
  --font-mono:  'JetBrains Mono', 'Fira Code', monospace;

  --space-xs:   4px;
  --space-sm:   8px;
  --space-md:   16px;
  --space-lg:   24px;
  --space-xl:   40px;
  --space-2xl:  64px;

  --radius-sm:  8px;
  --radius-md:  12px;
  --radius-lg:  16px;
  --radius-xl:  24px;
  --radius-pill:9999px;

  --shadow-sm:  0 1px 3px rgba(0,0,0,0.08);
  --shadow-md:  0 4px 16px rgba(0,0,0,0.10);
  --shadow-lg:  0 12px 32px rgba(0,0,0,0.15);
  --shadow-gold:0 4px 16px rgba(192,135,63,0.25);

  --transition-fast: 0.15s ease;
  --transition-base: 0.25s ease;
  --transition-slow: 0.4s ease;
}
```

Ensuite, cherche dans `admin.css`, `menu.css`, `admin-modal.css`, `admin-stats.css`, `admin-reservations.css` toutes les valeurs hardcodées suivantes et remplace-les par les variables correspondantes :

- `#C0873F` ou `#c0873f` → `var(--color-primary)`
- `#9B6830` ou `#9b6830` → `var(--color-primary-dark)`
- `#E8A85A` ou `#e8a85a` → `var(--color-primary-light)`
- `#27AE60` ou `#27ae60` → `var(--color-success)`
- `#E74C3C` ou `#e74c3c` → `var(--color-danger)`
- `#E67E22` ou `#e67e22` → `var(--color-warning)`
- `#2980B9` ou `#2980b9` → `var(--color-info)`
- `#1A1A1A` → `var(--color-text)`
- `#6B6B6B` → `var(--color-text-muted)`
- `#FAFAF8` → `var(--color-bg)`
- `#F5F0E8` → `var(--color-surface-alt)`

Ne touche pas aux valeurs dans les bibliothèques tierces (fontawesome).
```

---

## PROMPT UI-2 — DESIGN : sections non stylisées (formulaires, inputs, selects)

**Fichier : `public/css/main.css`**

```
Dans `public/css/main.css`, ajoute une section "Composants de base" avec ces styles globaux qui couvrent les zones non touchées :

```css
/* ─── Inputs & Formulaires ────────────────────────────────────────────── */
input,
textarea,
select {
  font-family: var(--font-sans);
  font-size: 0.95rem;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

input:focus,
textarea:focus,
select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-glow);
}

input::placeholder,
textarea::placeholder {
  color: var(--color-text-light);
}

select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B6B6B' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
  cursor: pointer;
}

label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: var(--space-xs);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

/* ─── Boutons globaux ─────────────────────────────────────────────────── */
button,
.btn {
  font-family: var(--font-sans);
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
  padding: 10px 20px;
  box-shadow: var(--shadow-gold);
}
.btn-primary:hover  { background: var(--color-primary-dark); transform: translateY(-1px); }
.btn-primary:active { transform: scale(0.98); }

.btn-ghost {
  background: transparent;
  color: var(--color-primary);
  border: 1.5px solid var(--color-primary);
  padding: 9px 18px;
}
.btn-ghost:hover { background: var(--color-primary-bg); }

.btn-danger {
  background: #FDE8E8;
  color: var(--color-danger);
  padding: 10px 20px;
}
.btn-danger:hover { background: var(--color-danger); color: #fff; }

/* ─── Cards génériques ────────────────────────────────────────────────── */
.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

/* ─── Scrollbars custom ───────────────────────────────────────────────── */
::-webkit-scrollbar       { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: var(--color-text-muted); }

/* ─── Loading states ─────────────────────────────────────────────────── */
.skeleton {
  background: linear-gradient(90deg, #f0ede8 25%, #faf8f5 50%, #f0ede8 75%);
  background-size: 200% 100%;
  animation: skeleton-wave 1.5s infinite;
  border-radius: var(--radius-sm);
}
@keyframes skeleton-wave {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ─── Navigation active states ────────────────────────────────────────── */
.nav-link.active,
.nav-link[aria-current="page"] {
  color: var(--color-primary) !important;
  border-bottom: 2px solid var(--color-primary);
}
```
```

---

## PROMPT UI-3 — DESIGN : header admin uniformisé

**Fichier : `public/css/admin.css`**

```
Dans `public/css/admin.css`, cherche et remplace les styles du header/navbar admin (`.admin-header`, `.admin-nav`, `.nav-link`, etc.).

Remplace par :

```css
/* ─── Header Admin ────────────────────────────────────────────────────── */
.admin-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: #fff;
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-lg);
  gap: var(--space-md);
}

.admin-logo {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-weight: 800;
  font-size: 1rem;
  color: var(--color-text);
  text-decoration: none;
  white-space: nowrap;
}

.admin-logo-icon {
  width: 34px;
  height: 34px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.admin-nav {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex: 1;
  overflow-x: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.admin-nav::-webkit-scrollbar { display: none; }

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-decoration: none;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.nav-link:hover {
  background: var(--color-surface-alt);
  color: var(--color-text);
}

.nav-link.active {
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border: none;
}

/* Mobile nav */
@media (max-width: 640px) {
  .admin-header { padding: 0 var(--space-md); }
  .nav-link { padding: 6px 10px; font-size: 0.78rem; }
  .nav-link span.nav-label { display: none; } /* Garde seulement l'emoji */
}
```
```

---

## PROMPT UI-4 — DESIGN : Banner/notification QR scan améliorée

**Fichier : `public/js/menu.js` — fonction `showBanner`**

```
Dans `public/js/menu.js`, remplace la fonction `showBanner` par une version plus design :

```js
function showBanner(message, type = "info") {
  const colors = {
    success: { bg: "#E8F5E9", border: "#27AE60", text: "#1E7E44", icon: "✅" },
    warning: { bg: "#FFF8E1", border: "#E67E22", text: "#B7560D", icon: "⚠️" },
    info:    { bg: "#FDF8F0", border: "#C0873F", text: "#9B6830", icon: "📍" },
    error:   { bg: "#FDE8E8", border: "#E74C3C", text: "#C0392B", icon: "❌" },
  };

  // Rétrocompatibilité : si `type` est une couleur hex (#...), détecte et convertit
  if (typeof type === "string" && type.startsWith("#")) {
    if (type.includes("28a745") || type.includes("27AE60")) type = "success";
    else if (type.includes("C0873F") || type.includes("c0873f")) type = "info";
    else type = "info";
  }

  const style = colors[type] || colors.info;

  const existingId = "table-session-banner";
  const existing = document.getElementById(existingId);
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.id = existingId;
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
    background: ${style.bg};
    border-bottom: 2px solid ${style.border};
    color: ${style.text};
    padding: 12px 20px;
    text-align: center;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.88rem;
    font-weight: 600;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.10);
    animation: slideDown 0.3s ease;
  `;

  // Inject animation if not already present
  if (!document.getElementById("banner-anim")) {
    const style_el = document.createElement("style");
    style_el.id = "banner-anim";
    style_el.textContent = `
      @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    `;
    document.head.appendChild(style_el);
  }

  banner.innerHTML = `
    <span style="font-size:1.1rem">${style.icon}</span>
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" style="
      margin-left: auto; background: none; border: none; cursor: pointer;
      color: ${style.text}; font-size: 1rem; opacity: 0.6; padding: 0 4px; line-height: 1;
    ">✕</button>
  `;

  document.body.prepend(banner);

  // Auto-remove after 6 seconds
  setTimeout(() => banner.remove(), 6000);
}
```

**Important :** mets à jour tous les appels à `showBanner` dans le fichier pour utiliser le nouveau format :
- `showBanner("...", "#28a745")` → `showBanner("...", "success")`
- `showBanner("...", "#C0873F")` → `showBanner("...", "info")`  
- `showBanner("...", "#dc3545")` → `showBanner("...", "error")`
- Si 2ème argument absent → garde le défaut `"info"`
```

---

## Résumé des bugs et leur impact

| Prompt | Fichier(s) | Problème | Sévérité |
|--------|-----------|----------|----------|
| QR-1   | `menu.js` | TTL session 2h → client peut commander depuis chez lui | 🔴 Critique |
| QR-1   | `menu.js` | Session pas coupée après soumission panier | 🔴 Critique |
| QR-2   | `admin.js` | `processQRCodeScan` override bugué → scanner bloqué | 🔴 Critique |
| QR-3   | `cart.js`, `Order.js`, `order.service.js` | Tickets sans hash unique → impossible de détecter les doublons | 🟡 Important |
| QR-4   | `cart.js` | `finalizeOrder` ne vérifie pas si session encore valide | 🟡 Important |
| QR-5   | `admin.js` | `processingScan` pas toujours reset à fermeture modal | 🟡 Important |
| UI-1   | Tous CSS | Couleurs hardcodées → variables CSS | 🟢 Qualité |
| UI-2   | `main.css` | Inputs/boutons/cards non stylisés | 🟢 Design |
| UI-3   | `admin.css` | Header admin incohérent | 🟢 Design |
| UI-4   | `menu.js` | Banner session basique et moche | 🟢 Design |

## Ordre d'application IMPÉRATIF

```
QR-2 (scanner fix) → QR-1 (session TTL) → QR-4 (guard finalizeOrder)
→ QR-5 (reset modal) → QR-3 (hash unique)
→ UI-1 → UI-2 → UI-3 → UI-4
```

QR-2 en premier car c'est le bug bloquant (scanner mort = rien ne marche).
