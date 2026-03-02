# RestoPlus Architecture & Logic Review
> **Version 2** — Mise à jour février 2026  
> Modifications de session incluses + suggestions de logiques futures

---

## Overview

RestoPlus ("La Kora") is a restaurant ordering and management application built with:

- **Backend**: Node.js, Express, MongoDB (via Mongoose)
- **Frontend**: Static HTML/CSS/JavaScript served directly by Express (no bundler or SPA framework)

The application supports:

- **Customer flows**: scan a table QR, browse the menu, build a cart, place an order, get a QR ticket, and track status.
- **Staff/admin flows**: log into the admin dashboard, view and manage orders, scan/validate customer QR tickets, merge orders, and see basic analytics.
- **Reservations**: a reservation UI on the frontend and a reservation API on the backend (currently not fully wired together).

The main entrypoint is:

- `backend/server.js` → bootstraps database and HTTP server.
- `backend/app.js` → configures Express, middleware, static serving, and API routes.

---

## Backend Architecture

### Structure

- `backend/server.js`
  - Loads environment variables.
  - Connects to MongoDB.
  - Imports `app` from `backend/app.js`.
  - Starts the HTTP server on the configured port.

- `backend/app.js`
  - Configures Express and CORS.
  - Registers JSON and URL-encoded body parsers.
  - Serves static assets from `public`.
  - Mounts API route modules:
    - `/api/orders`
    - `/api/reservations`
    - `/api/analytics`
    - `/api/auth`
    - `/api/tables` ✅ *(nouveau — migré depuis localStorage)*
  - Provides a simple `/api` health-check endpoint.
  - Adds global 404 and 500 error handlers.

- `backend/routes/`
  - `orders.js`: order creation and lifecycle management, QR scan/validation, payment status, and order fusion.
  - `reservations.js`: reservation CRUD (not currently used by the main frontend).
  - `analytics.js`: aggregates orders/revenue/reservations for dashboards.
  - `auth.js`: admin/server login and token verification.
  - `tables.js` ✅ *(nouveau)* — CRUD tables, seed automatique, mise à jour statuts.

- `backend/models/`
  - `Order.js`: schema and model for customer orders.
  - `Reservation.js`: schema and model for reservations.
  - `Analytics.js`: schema and model for daily analytics snapshots.
  - `Table.js` ✅ *(nouveau)* — schema pour la collection `tables`.

- `backend/middleware/`
  - `auth.js`: JWT verification and role-based access control (`requireAdmin`, `requireServer`, `requireAdminOrServer`).

- `backend/data/`
  - `menu.json`: static menu data (currently not used by the main frontend, which embeds its own menu).

---

### Tables Flow (Backend) ✅ Nouveau

La collection `tables` dans MongoDB est maintenant la source de vérité pour les tables.

**Routes exposées (`/api/tables`) :**

| Méthode | Route | Auth | Usage |
|---------|-------|------|-------|
| `GET` | `/api/tables` | public | Charger toutes les tables |
| `POST` | `/api/tables/seed` | admin | Seed automatique au 1er chargement |
| `PATCH` | `/api/tables/:number/status` | admin | Changer `available/occupied/reserved` |
| `PATCH` | `/api/tables/:number` | admin | Modifier chairs, location, etc. |

**Schema MongoDB `Table` :**
```
tableId      String   unique  "table-1"
number       Number   unique  1..N
chairs       Number           4
location     String           "Salle principale"
status       String           available | occupied | reserved
currentOrder String           orderId ou null
timestamps   auto
```

**Seed automatique :** Au premier chargement de `table-manager.js`, si la collection est vide, `POST /api/tables/seed` insère les 10 tables par défaut. Les démarrages suivants font simplement `GET /api/tables`.

---

### Orders Flow (Backend)

- **Creation**
  - `POST /api/orders`
  - Accepts data such as table, items, totals, payment method, and order mode (group/individual).
  - Persists an `Order` document with `orderId`, `table`, `mode`, `items`, `total`, `paymentMethod`, `paymentStatus`, `status`.
  - Starts as `pending_approval`.
  - This endpoint is **not authenticated** to allow customers to place orders from the public UI.

- **Public History** ✅ Nouveau
  - `GET /api/orders/public?table=X&limit=10&sort=desc`
  - Retourne les 10 dernières commandes d'une table sans auth.
  - Champs exposés publiquement : `orderId, table, total, status, paymentStatus, paymentMethod, items, timestamp`.
  - Utilisé par `order-history.js` côté client.
  - **Important :** Cette route doit être déclarée AVANT `GET /:orderId` dans `orders.js` pour éviter le conflit de paramètre.

- **Status / Payment Updates**
  - Authenticated staff endpoints allow updating `status` and `paymentStatus`.

- **QR Scan & Validation**
  - `POST /api/orders/:id/scan/validate`
  - `POST /api/orders/:id/scan/reject`

- **Fusion/Merging**
  - `POST /api/orders/fuse`

---

### Reservations Flow (Backend)

- Backend complet mais **non connecté au frontend** (le frontend écrit uniquement en localStorage).
- Voir section "Risques & Dette Technique" pour plan de migration.

---

### Analytics Flow (Backend)

- Stocke des agrégats journaliers.
- **Mismatch connu** : le schema `Analytics` ne contient pas le statut `pending_approval`, mais les routes orders tentent d'incrémenter ce bucket. À corriger (voir section Risques).

---

## Frontend Architecture

### Pages & Layout

- `public/index.html` — Landing page, détection QR table.
- `public/menu.html` — Interface commande client.
- `public/reservation.html` — Formulaire réservation (non connecté au backend).
- `public/admin.html` — Dashboard admin/staff.
- `public/login.html` — Authentification admin.

---

### JavaScript Modules

#### `public/js/main.js`

Définit `NotificationManager`, `TableDetector`, `menuData`.

**`NotificationManager.formatTicket(orderId)` — correction appliquée ✅**

```javascript
// Ancienne version (bug : extrayait n'importe quel suffixe hexa)
static formatTicket(orderId) {
  const clean = orderId.replace(/^ORD-FUSED-|^ORD-/i, "");
  const parts = clean.split("-");
  const last = parts[parts.length - 1];
  return last && last.length >= 3 ? last.slice(-6).toUpperCase() : null;
}

// Nouvelle version (extrait uniquement un suffixe numérique court)
static formatTicket(orderId) {
  if (!orderId || typeof orderId !== "string") return null;
  const match = orderId.match(/-(\d{1,6})$/);
  if (match) return match[1]; // "417", "042", etc.
  return null; // MongoDB _id ou format inconnu → pas de "Ticket X •"
}
```

**Pourquoi :** côté menu, certains `orderId` ont un suffixe alphanumérique. L'ancienne version affichait `"Ticket B5C97C •"` au lieu de `"Ticket 417 •"`.

---

#### `public/js/table-manager.js` ✅ Migré vers MongoDB

**Avant :** localStorage (`restaurantTables`) comme source de vérité.

**Après :** MongoDB collection `tables` via `/api/tables`.

Changements clés :

- `loadTables()` → `GET /api/tables`, seed automatique si vide.
- `saveTables()` → **supprimée** (plus de localStorage).
- `updateTableStatus()` → `PATCH /api/tables/:number/status` + mise à jour optimiste locale.
- `voirTableQr()` → **modal QR fonctionnelle** implémentée (était vide).
- `generateQRCode()` → accepte un paramètre `size` optionnel (utile pour le modal "Voir").
- Fallback intégré : si l'API est down, les tables par défaut s'affichent quand même sans bloquer l'UI.

**localStorage restant :** uniquement `adminToken` (auth) et `currentTable` (cache court terme table en cours).

---

#### `public/js/order-history.js` ✅ Migré vers MongoDB

**Avant :** localStorage (`restoplus_order_history`) stockait jusqu'à 50 commandes complètes côté client.

**Après :** MongoDB via `GET /api/orders/public?table=X&limit=10` est la source de vérité.

Changements clés :

- `getHistory()` → appel HTTP vers `/api/orders/public?table=X`.
- `saveHistory()` → **supprimée**.
- `addOrder()` → ne sauvegarde plus en localStorage. Sauvegarde uniquement **l'image QR** en cache (`lakora_qr_cache`) car c'est du cache UI, pas une donnée métier.
- `refreshFromBackend()` → un seul appel `getHistory()` au lieu de N appels parallèles.
- Limit **10** (vs 50 avant) — suffisant pour l'historique d'une table sur un service.
- Bouton 🔄 Rafraîchir dans le header du modal.
- Statuts enrichis visuellement (couleurs + icônes).
- Gestion d'erreur avec bouton "Réessayer".

**localStorage restant :** uniquement `lakora_qr_cache` (images QR base64 — cache UI éphémère).

---

#### `public/js/admin.js` ✅ Plusieurs corrections appliquées

**Kanban — colonnes fusionnées :**

Les 3 colonnes redondantes (`pending_approval`, `pending_scan`, `pending`) fusionnées en une seule colonne **"🔔 À valider"**. Toutes les commandes en attente y apparaissent automatiquement.

**Approbation manuelle — nouveaux boutons :**

Sur les cartes de la colonne "À valider", deux boutons directs :
- `✅ Approuver` → `POST /api/orders/:id/scan/validate`
- `❌ Rejeter` → `POST /api/orders/:id/scan/reject`

Mise à jour optimiste : la carte se déplace immédiatement sans rechargement.

**Corrections de bugs :**

- `order is not defined` dans 18 scopes — remplacé par `orderId` (paramètre disponible).
- Modal fermée immédiatement (optimistic UI) au lieu d'attendre le fetch.
- `manualApproveOrder()` et `manualRejectOrder()` ajoutées.

---

#### `public/js/cart.js`

- Stocke le panier en localStorage (`cart`) — **correct, à conserver**.
- Le panier non soumis ne doit pas être en DB (c'est une donnée UI éphémère).
- `handleOrderCreated()` → dispatch `CustomEvent("orderCreated")` pour notifier l'historique sans partager les données via localStorage.

---

### State Management (Frontend) — État actuel

| Donnée | Stockage | Justification |
|--------|----------|---------------|
| JWT token | sessionStorage / localStorage | Auth — ok |
| Panier (items non soumis) | localStorage `cart` | Cache UI éphémère — ok |
| Table courante | localStorage `currentTable` | Cache court terme — ok |
| Mode commande | localStorage `orderingMode` | Préférence UI — ok |
| Images QR | localStorage `lakora_qr_cache` | Cache UI — ok |
| Configuration tables | ~~localStorage~~ → **MongoDB** ✅ | Donnée métier |
| Historique commandes | ~~localStorage~~ → **MongoDB** ✅ | Donnée métier |
| Réservations | localStorage seulement ⚠️ | Non connecté au backend |

---

## Data & Models

### Order Model

Champs principaux : `orderId`, `table`, `mode`, `items[]`, `total`, `paymentMethod`, `paymentStatus`, `status`, `scan{}`, timestamps.

Statuts du cycle de vie :
```
pending_approval → accepted → preparing → ready → served
                ↘ cancelled
pending_scan (legacy)
pending      (legacy)
```

### Table Model ✅ Nouveau

```
tableId, number, chairs, location, status, currentOrder, timestamps
```

### Reservation Model

`reservationId`, `customerName`, `customerPhone`, `customerEmail`, `table`, `partySize`, `reservationDate`, `reservationTime`, `status`.

### Analytics Model

Agrégats journaliers par statut. **Mismatch** : ne contient pas `pending_approval`.

---

## Authentication & Security

### Auth Flow

- `POST /api/auth/login` → JWT (24h), rôles `admin` ou `server`.
- Token stocké en sessionStorage (ou localStorage si "Se souvenir de moi").
- Middleware `requireAdmin` / `requireAdminOrServer` protège les routes sensibles.

### Security Issues (non résolus)

- **Mots de passe en clair** — `bcrypt` importé mais non utilisé.
- **Secret JWT faible** — fallback `"your-secret-key"` si `JWT_SECRET` non défini.
- **Pas de rate limiting** — aucune protection brute-force sur `/api/auth/login`.
- **Analytics non protégés** — `/api/analytics` accessible sans auth.
- **Réservations non protégées** — `/api/reservations` accessible sans auth.
- **CORS ouvert** — `cors()` sans restriction d'origines.
- **Pas de validation d'input** — aucun schema Joi/Zod sur les request bodies.

---

## Notable Strengths

- End-to-end QR flow bien pensé (table → menu → commande → ticket → validation admin).
- Cycle de vie des commandes détaillé avec états intermédiaires.
- Role-based access control clair.
- Indexes Mongoose sur les champs à haute cardinalité.
- Routing structuré par domaine.

---

## Notable Risks & Technical Debt

### Existants (non résolus)

- **Reservation backend non intégré** — le frontend écrit uniquement en localStorage.
- **Analytics model mismatch** — `pending_approval` absent du schema cause des increments silencieux cassés.
- **Menu dupliqué** — data embarquée dans `main.js` au lieu de `backend/data/menu.json` ou d'une API.
- **Couplage global** — heavy reliance sur `window.*` et ordre des `<script>` tags.
- **Paiement simulé** — card/mobile simulés avec setTimeout, pas d'intégration réelle.
- **orderId inconsistant** — préfixes différents entre frontend (`AUD-ORD-`) et backend (`ORD-`).
- **Dépendances redondantes** — `bcrypt` + `bcryptjs` tous les deux présents, `body-parser` inutile.
- **Logging non structuré** — `console.log` sans niveaux ni format cohérent.
- **`formatPrice` dupliqué** — défini indépendamment dans plusieurs scripts.

### Résolus dans cette session ✅

- ~~`restaurantTables` en localStorage~~ → MongoDB collection `tables`.
- ~~`restoplus_order_history` en localStorage~~ → MongoDB via `/api/orders/public`.
- ~~Colonnes Kanban redondantes (pending_scan + pending)~~ → fusionnées en "À valider".
- ~~Approbation manuelle absente~~ → boutons Approuver/Rejeter sur cartes Kanban.
- ~~`formatTicket` affichait du hex~~ → extrait uniquement suffixe numérique.
- ~~`order is not defined` dans 18 scopes~~ → corrigé.
- ~~Modal lente à fermer~~ → optimistic UI, fermeture immédiate.
- ~~`voirTableQr()` vide~~ → modal QR fonctionnelle.

---

## 🔭 Logiques à Ajouter / Suggérées

### Priorité Haute

**1. Brancher les réservations au backend**

Le frontend `reservation.js` écrit uniquement en localStorage. La collection `Reservation` et les routes existent déjà.

À faire :
- Remplacer `localStorage.setItem("restaurantReservations", ...)` par `POST /api/reservations`.
- Afficher les réservations dans l'admin depuis `GET /api/reservations`.
- Ajouter un onglet "Réservations" dans `admin.html`.

---

**2. Corriger le mismatch Analytics**

```javascript
// Dans Analytics.js, ajouter pending_approval au schema :
byStatus: {
  pending:          { type: Number, default: 0 },
  pending_approval: { type: Number, default: 0 }, // ← manquant
  accepted:         { type: Number, default: 0 },
  preparing:        { type: Number, default: 0 },
  ready:            { type: Number, default: 0 },
  served:           { type: Number, default: 0 },
  cancelled:        { type: Number, default: 0 },
}
```

---

**3. Hasher les mots de passe**

`bcryptjs` est déjà dans `package.json` mais non utilisé.

```javascript
// Dans auth.js login route :
const bcrypt = require("bcryptjs");
const isValid = await bcrypt.compare(password, storedHash);
// Stocker les hash dans .env ou en DB, pas les mots de passe en clair
```

---

**4. Rate limiting sur /api/auth/login**

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require("express-rate-limit");
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.use("/api/auth/login", loginLimiter);
```

---

### Priorité Moyenne

**5. Brancher le menu depuis l'API**

Actuellement `menuData` est hardcodé dans `main.js`. Charger depuis `GET /api/menu` à la place.

```javascript
// Nouveau endpoint à créer
router.get("/menu", (req, res) => {
  res.json(require("../data/menu.json"));
});

// Dans main.js, remplacer menuData par :
const menuData = await fetch("/api/menu").then(r => r.json());
```

Avantage : modifier le menu sans redéploiement frontend.

---

**6. Statut table temps réel**

Quand une commande est acceptée → marquer la table comme `occupied`.
Quand servie → remettre `available`.

```javascript
// Dans orders.js, après updateOrderStatus :
if (newStatus === "accepted") {
  await Table.findOneAndUpdate({ number: order.table }, { status: "occupied" });
}
if (newStatus === "served" || newStatus === "cancelled") {
  await Table.findOneAndUpdate({ number: order.table }, { status: "available", currentOrder: null });
}
```

---

**7. Polling ou WebSocket pour statut commande côté client**

Actuellement le client n'est notifié du changement de statut que s'il rouvre l'historique.

Option légère — polling toutes les 30s si une commande est en cours :

```javascript
// Dans order-history.js
_startPolling(orderId) {
  this._pollTimer = setInterval(async () => {
    const remote = await this.getOrderStatus(orderId);
    if (remote && remote.status !== this._lastKnownStatus) {
      this._lastKnownStatus = remote.status;
      NotificationManager.showSuccess(orderId, "Statut mis à jour", remote.status, 3000);
    }
    if (["served", "cancelled"].includes(remote?.status)) {
      clearInterval(this._pollTimer);
    }
  }, 30000);
}
```

---

**8. Validation des inputs (Joi ou Zod)**

```bash
npm install joi
```

```javascript
// Exemple pour POST /api/orders
const Joi = require("joi");
const orderSchema = Joi.object({
  table:         Joi.number().integer().min(1).required(),
  items:         Joi.array().min(1).required(),
  total:         Joi.number().min(0).required(),
  paymentMethod: Joi.string().valid("cash", "card", "mobile").required(),
});

router.post("/", async (req, res) => {
  const { error } = orderSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  // ...
});
```

---

### Priorité Basse / Confort

**9. Unifier `formatPrice`**

Actuellement définie dans `main.js`, `cart.js`, `order-history.js`, et `admin.js` séparément.

```javascript
// Une seule définition dans main.js
window.LaKora = {
  formatPrice: (n) => new Intl.NumberFormat("fr-FR").format(n || 0),
  // ...
};
// Supprimer les autres
```

---

**10. Corriger le préfixe orderId**

Frontend génère `AUD-ORD-timestamp-NNN`, backend génère `ORD-timestamp-NNN`.

```javascript
// Normaliser dans POST /api/orders (backend) :
if (!body.orderId) {
  const short = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  body.orderId = `ORD-${Date.now()}-${short}`; // format unique
}
// Ne jamais laisser le frontend dicter le format
```

---

**11. Intégration paiement réel**

Les flows card/mobile sont simulés avec `setTimeout`. Intégrations possibles pour le Sénégal :
- **Orange Money** → API Orange Money Sénégal.
- **Wave** → API Wave.
- **CinetPay** → agrégateur multi-opérateurs UEMOA.

---

**12. Logs structurés**

Remplacer `console.log` par un logger avec niveaux :

```bash
npm install pino pino-http
```

```javascript
const pino = require("pino");
const logger = pino({ level: process.env.LOG_LEVEL || "info" });
logger.info({ orderId, status }, "Order status updated");
```

---

## Summary

La base de code est un solide point de départ Node/Express + frontend statique avec un flow QR end-to-end bien pensé. Les migrations de cette session ont éliminé la dépendance aux données métier dans localStorage (tables, historique commandes) au profit de MongoDB. Les prochaines priorités sont le branchement des réservations au backend, la correction du mismatch analytics, et le hashage des mots de passe — les trois ayant le meilleur rapport effort/impact.
