# RestoPlus-LaKora — Prompts de Correction Copilot

> Prompts ciblés sur les vrais bugs logiques + optimisations du code existant.  
> À appliquer **après** les 12 prompts de refactorisation CSS/UI déjà faits.

---

## 🔴 BUG CRITIQUE 1 — "Encaissé" reste à 0 même quand le client a payé

**Fichier : `backend/services/order.service.js`**

**Explication du bug :**  
Quand un client paie en Wave ou Orange Money, `cart.js` envoie `paymentStatus: "paid"` à la création de la commande. La commande est bien créée avec `paymentStatus: "paid"` en base. Jusqu'ici tout est correct.

**Le problème :** Dans `admin-stats.js`, le `renderKPIs()` appelle l'API avec `includePendingApproval=true`, donc les commandes `pending_approval` sont incluses dans `validOrders`. Si le client a payé (wave/orange_money, `paymentStatus: "paid"`) mais que l'admin n'a pas encore validé le ticket (statut encore `pending_approval`), la commande EST bien dans `paidRevenue`. Ça devrait marcher.

**Le vrai bug est dans `updateOrderStatus` :** quand l'admin passe une commande en `"served"`, la ligne force `paymentStatus: "paid"` — ce qui est correct pour le cash — **mais ça écrase un éventuel `paymentStatus: "failed"` sans distinction.** De plus, si la commande était déjà `paid` (wave), cette ligne est redondante mais inoffensive.

**Le bug réel visible dans le screenshot (Encaissé = 0, Total = 3200) :**  
La commande a `paymentStatus: "pending"` parce que le client a choisi `cash` (méthode qui envoie `paymentStatus: "pending"` depuis `cart.js` ligne 386 : `this.finalizeOrder(method, "pending")`). C'est **normal** pour du cash ! L'encaissé passe à 3200 **seulement quand l'admin marque la commande comme "served"** (qui force `paymentStatus: "paid"`).

**Ce qui manque : un bouton "Marquer comme payé" dans le modal de gestion sans avoir à passer en "served".**

---

### Prompt FIX-1A — `order.service.js` : ne pas écraser paymentStatus si déjà paid

```
Dans `backend/services/order.service.js`, dans la fonction `updateOrderStatus`, corrige la logique de mise à jour du paymentStatus :

Actuellement :
```js
const update = {
  status,
  ...(status === "served" && { servedAt: new Date(), paymentStatus: "paid" }),
  ...(status === "cancelled" && { cancelledAt: new Date() }),
};
```

Remplace par :
```js
const order = await Order.findOne({ orderId });
if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });

const update = {
  status,
  ...(status === "served" && {
    servedAt: new Date(),
    // Ne force paid que si pas déjà paid et pas failed
    ...(order.paymentStatus !== "paid" && order.paymentStatus !== "failed"
      ? { paymentStatus: "paid" }
      : {}),
  }),
  ...(status === "cancelled" && { cancelledAt: new Date() }),
};

const updatedOrder = await Order.findOneAndUpdate({ orderId }, update, { new: true });
if (!updatedOrder) throw Object.assign(new Error("Order not found"), { status: 404 });
scheduleAnalyticsUpdate(updatedOrder);
return updatedOrder;
```

Supprime le `findOneAndUpdate` actuel et remplace-le par le `findOneAndUpdate` dans le nouveau code ci-dessus. Assure-toi que `scheduleAnalyticsUpdate` est bien appelé sur `updatedOrder`.
```

---

### Prompt FIX-1B — `backend/routes/orders.js` + controller : route PATCH payment plus robuste

```
Dans `backend/controllers/order.controller.js`, dans `exports.updatePayment`, ajoute une validation :

```js
exports.updatePayment = async (req, res) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;
    // Empêche de repasser en "pending" si déjà "paid"
    if (paymentStatus === "pending") {
      const existing = await Order.findOne({ orderId: req.params.orderId }, "paymentStatus").lean();
      if (existing?.paymentStatus === "paid") {
        return res.status(400).json({
          error: "Impossible de repasser en 'pending' une commande déjà payée.",
          code: "PAYMENT_DOWNGRADE_FORBIDDEN",
        });
      }
    }
    res.json(await svc.updatePaymentStatus(req.params.orderId, req.body));
  } catch (e) {
    err(res, e);
  }
};
```
```

---

### Prompt FIX-1C — `admin-stats.js` : distinguer "pending_approval payé" vs "en attente de paiement"

```
Dans `public/js/admin-stats.js`, dans `renderKPIs()`, améliore les labels pour distinguer les cas :

Remplace :
```js
const validOrders = this.orders.filter(o => o.status !== "cancelled" && o.status !== "merged");
const totalRevenue  = validOrders.reduce((s, o) => s + (o.total || 0), 0);
const paidRevenue   = validOrders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + (o.total || 0), 0);
const pendingRevenue= validOrders.filter(o => o.paymentStatus !== "paid").reduce((s, o) => s + (o.total || 0), 0);
```

Par :
```js
const validOrders = this.orders.filter(o =>
  o.status !== "cancelled" &&
  o.status !== "merged" &&
  o.status !== "pending_approval" // exclut les commandes pas encore validées du CA total
);
// Commandes en attente de validation (pour info seulement)
const pendingApprovalOrders = this.orders.filter(o => o.status === "pending_approval");
const pendingApprovalRevenue = pendingApprovalOrders.reduce((s, o) => s + (o.total || 0), 0);

const totalRevenue   = validOrders.reduce((s, o) => s + (o.total || 0), 0);
const paidRevenue    = validOrders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + (o.total || 0), 0);
const pendingRevenue = validOrders.filter(o => o.paymentStatus !== "paid").reduce((s, o) => s + (o.total || 0), 0);
const avgOrder       = validOrders.length ? totalRevenue / validOrders.length : 0;
```

Puis après `document.getElementById("kpi-avg").textContent = fmt(avgOrder);`, ajoute :
```js
// Affiche le CA en attente de validation si présent
const kpiPendingApproval = document.getElementById("kpi-pending-approval");
if (kpiPendingApproval) {
  kpiPendingApproval.textContent = fmt(pendingApprovalRevenue);
  kpiPendingApproval.closest(".kpi-card")?.style.setProperty("display", pendingApprovalRevenue > 0 ? "" : "none");
}
```

**Pourquoi ce changement ?** Le CA affiché ne doit compter que les commandes validées (accepted → served). Les commandes `pending_approval` sont des commandes non encore confirmées — les inclure dans le CA total est trompeur.
```

---

### Prompt FIX-1D — `public/admin.html` : ajouter la KPI card "En attente de validation"

```
Dans `public/admin.html`, dans la section `.stats-kpi-grid`, après la card `kpi-pending` (EN ATTENTE), ajoute cette nouvelle card :

```html
<div class="kpi-card kpi-approval" id="kpi-approval-card" style="display:none;">
  <div class="kpi-icon">⏳</div>
  <div class="kpi-content">
    <span class="kpi-label">EN VALIDATION</span>
    <span class="kpi-value" id="kpi-pending-approval">—</span>
    <span class="kpi-unit">CFA</span>
  </div>
  <div class="kpi-bar" style="background: #9B59B6;"></div>
</div>
```

Dans `public/css/admin-stats.css`, ajoute :
```css
.kpi-approval .kpi-bar { background: #9B59B6; }
.kpi-approval { border-left: 4px solid #9B59B6; }
```

Cette card n'apparaît que si des commandes sont en attente de validation (gérée par le JS).
```

---

## 🔴 BUG CRITIQUE 2 — `validateOrder` : paymentStatus "paid" envoyé à la création mais potentiellement perdu

**Fichier : `backend/services/order.service.js`**

**Analyse :** `createOrder` conserve bien le `paymentStatus` fourni (`...data` spread). Si le client Wave clique "J'ai payé" → `paymentStatus: "paid"` est envoyé → MongoDB stocke `paid`. Lors du scan admin → `validateOrder()` ne touche que `status` et `scan` → `paymentStatus` reste `paid`. ✅ **Ce path est correct.**

**Le vrai problème** : cash = `paymentStatus: "pending"` à la création → reste `pending` jusqu'à `updateOrderStatus("served")` qui force `paid`. Si l'admin encaisse sans passer par "served" (commande à emporter par exemple), il doit manuellement appeler `PATCH /payment`.

**Solution : ajouter un bouton "💳 Encaisser" dans le modal de gestion.**

---

### Prompt FIX-2 — `public/js/admin.js` : bouton "Encaisser" dans le modal de gestion

```
Dans `public/js/admin.js`, dans la méthode `setupModalEventListeners` (ou l'endroit où sont définis les boutons d'action du modal), ajoute un handler pour un bouton "Encaisser".

Dans le HTML des boutons de modal (dans `displayOrderInModal` ou `setupModalEventListeners`), après le bouton `mm-btn-serve`, ajoute :
```html
<button class="mm-btn mm-btn-pay" data-action="pay" style="background:linear-gradient(135deg,#27AE60,#219A52);color:#fff;">
  💳 Encaisser
</button>
```

Dans le handler des boutons (le `addEventListener("click", ...)` sur `.mm-actions-grid`), ajoute le case "pay" :

```js
if (action === "pay") {
  const orderId = this.currentOrder?.orderId || this.currentOrder?.id;
  if (!orderId) return;
  
  // Ne pas encaisser si déjà paid
  if (this.currentOrder?.paymentStatus === "paid") {
    NotificationManager.showSuccess(null, "Déjà encaissé", "Cette commande est déjà marquée comme payée.", 2500, "info");
    return;
  }
  
  try {
    const res = await spaAuthenticatedFetch(`/api/orders/${orderId}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: "paid" }),
    });
    if (!res.ok) throw new Error("Erreur serveur");
    const updated = await res.json();
    this.currentOrder = updated;
    NotificationManager.showSuccess(orderId, "✅ Encaissé", `Commande ${orderId} marquée comme payée.`, 3000, "success");
    // Rafraîchit le modal
    this.displayOrderInModal(updated);
    // Rafraîchit le Kanban
    if (typeof window.ordersManager?.loadOrders === "function") window.ordersManager.loadOrders();
  } catch (e) {
    NotificationManager.showSuccess(null, "Erreur", "Impossible d'encaisser. Réessayez.", 3000, "error");
  }
  return;
}
```

Masque le bouton "Encaisser" si `order.paymentStatus === "paid"` : dans `displayOrderInModal`, après avoir injecté le HTML, ajoute :
```js
const btnPay = document.querySelector(".mm-btn-pay");
if (btnPay && order.paymentStatus === "paid") {
  btnPay.style.display = "none";
}
```
```

---

## 🟡 BUG LOGIQUE 3 — `revenueStats` dans le controller : n'exclut pas les commandes `pending_approval` et `cancelled`

**Fichier : `backend/controllers/order.controller.js`**

### Prompt FIX-3 — Correction de `revenueStats`

```
Dans `backend/controllers/order.controller.js`, dans `exports.revenueStats`, le `$match` actuel ne filtre pas les commandes annulées ni les `pending_approval`. Corrige ainsi :

Remplace :
```js
const match = {};
if (startDate || endDate) {
  match.timestamp = {};
  if (startDate) match.timestamp.$gte = new Date(startDate);
  if (endDate)   match.timestamp.$lte = new Date(endDate);
}
```

Par :
```js
const match = {
  // Exclut cancelled, merged, pending_approval du CA
  status: { $nin: ["cancelled", "merged", "pending_approval"] },
};
if (startDate || endDate) {
  match.timestamp = {};
  if (startDate) match.timestamp.$gte = new Date(startDate);
  if (endDate)   match.timestamp.$lte = new Date(endDate);
}
```

Même correction dans `backend/routes/analytics.js` dans la route `GET /revenue` : ajoute le même filtre `status: { $nin: ["cancelled", "merged", "pending_approval"] }` dans le `$match` de l'aggregate.
```

---

## 🟡 BUG LOGIQUE 4 — `analytics.js` : route `/dashboard` ne compte pas `pending_approval` dans les pending

**Fichier : `backend/routes/analytics.js`**

### Prompt FIX-4 — Dashboard analytics : inclure pending_approval dans les "en attente"

```
Dans `backend/routes/analytics.js`, dans la route `GET /dashboard`, la ligne :

```js
pending: todayOrders.filter(o => ["pending","accepted","preparing","ready"].includes(o.status)).length,
```

Ne compte pas les commandes `pending_approval`. Remplace par :

```js
pending: todayOrders.filter(o =>
  ["pending", "pending_approval", "pending_scan", "accepted", "preparing", "ready"].includes(o.status)
).length,
```

Et ajoute un champ `pendingApproval` dans la réponse pour que le frontend puisse afficher spécifiquement les commandes à valider :

```js
res.json({
  orders: {
    total:           todayOrders.length,
    completed:       todayOrders.filter(o => o.status === "served").length,
    pending:         todayOrders.filter(o => ["pending","pending_approval","pending_scan","accepted","preparing","ready"].includes(o.status)).length,
    pendingApproval: todayOrders.filter(o => o.status === "pending_approval").length,
    revenue:         todayOrders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0),
    revenueTotal:    todayOrders.filter(o => !["cancelled","merged","pending_approval"].includes(o.status)).reduce((s, o) => s + o.total, 0),
  },
  reservations: { ... }, // inchangé
});
```
```

---

## 🟡 BUG LOGIQUE 5 — Code mort dans `order.service.js` : `fuseOrders` accepte `pending_approval` mais `validateOrder` n'est jamais appelé sur les commandes fusionnées

### Prompt FIX-5 — `order.service.js` : nettoyer la fusion et ajouter validation des IDs

```
Dans `backend/services/order.service.js`, dans `fuseOrders`, ajoute une vérification que les orderIds sont bien des strings non vides et non dupliqués :

Après `async function fuseOrders(orderIds, table, user) {`, ajoute en premier :
```js
// Validation des entrées
if (!Array.isArray(orderIds) || orderIds.length < 2) {
  throw Object.assign(new Error("La fusion nécessite au moins 2 commandes"), { status: 400 });
}
const uniqueIds = [...new Set(orderIds.filter(id => typeof id === "string" && id.trim()))];
if (uniqueIds.length !== orderIds.length) {
  throw Object.assign(new Error("IDs de commandes invalides ou en double"), { status: 400 });
}
orderIds = uniqueIds; // utilise la version dédupliquée
```

Aussi, dans `backend/middleware/validate.js`, dans `schemas.fuseOrders`, vérifie que le schéma Joi valide bien un tableau d'au moins 2 éléments uniques. S'il ne le fait pas, ajoute `.min(2).unique()` sur le tableau `orderIds`.
```

---

## 🟢 OPTIMISATION 6 — `admin-stats.js` : la courbe "Évolution des revenus" affiche des valeurs incorrectes si includePendingApproval=true

### Prompt OPT-6 — Corriger les séries temporelles pour exclure pending_approval

```
Dans `public/js/admin-stats.js`, dans `getTimeSeriesData()`, toutes les boucles `forEach` utilisent `validOrders` qui inclut `pending_approval` (si le filtre dans `renderKPIs` a été corrigé) ou pas. Aligne avec la logique de `renderKPIs` : la courbe ne doit montrer que les commandes validées (status !== cancelled, merged, pending_approval).

Dans chaque période (day/week/month/year), remplace :
```js
const validOrders = this.orders.filter(o => o.status !== "cancelled" && o.status !== "merged");
```

Par :
```js
const validOrders = this.orders.filter(o =>
  o.status !== "cancelled" &&
  o.status !== "merged" &&
  o.status !== "pending_approval"
);
```

Ce fix s'applique aux 4 blocs `if (this.currentPeriod === ...)` dans `getTimeSeriesData()`.
```

---

## 🟢 OPTIMISATION 7 — `validate.js` : schema `queryOrders` ne valide pas `includePendingApproval`

### Prompt OPT-7 — Ajouter `includePendingApproval` au schéma de validation

```
Dans `backend/middleware/validate.js`, dans `schemas.queryOrders` (le schéma Joi utilisé pour valider les query params de `GET /api/orders`), vérifie que `includePendingApproval` est déclaré. S'il ne l'est pas, ajoute :

```js
includePendingApproval: Joi.string().valid("true", "false").optional(),
```

Sans ça, Joi peut rejeter le paramètre avec un 400 "unknown parameter" si `allowUnknown` n'est pas activé.
```

---

## 🟢 OPTIMISATION 8 — `order.controller.js` : `getOne` est public, ajoute un rate-limit minimal

### Prompt OPT-8 — Sécuriser la route publique GET /api/orders/:orderId

```
Dans `backend/routes/orders.js`, la route `router.get("/:orderId", ctrl.getOne)` est entièrement publique (pas d'auth). N'importe qui peut bruteforcer les orderId pour lire les commandes.

Ajoute un middleware de rate-limit simple sur cette route :

```js
// Installe express-rate-limit si pas déjà dans package.json
// npm install express-rate-limit

const rateLimit = require("express-rate-limit");

const publicOrderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 requêtes par minute par IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requêtes. Réessayez dans une minute." },
});

router.get("/:orderId", publicOrderLimiter, ctrl.getOne);
```

Applique le même `publicOrderLimiter` sur `router.get("/public/:orderId/status", ...)` et `router.get("/public", ...)`.
```

---

## 🟢 OPTIMISATION 9 — Code mort : `analytics.js` importe `Analytics` mais ne l'utilise pas dans `/dashboard` ni `/revenue`

### Prompt OPT-9 — Nettoyer analytics.js

```
Dans `backend/routes/analytics.js`, la route `GET /history` utilise `Analytics.find(...)` — c'est le seul endroit où le modèle `Analytics` est utilisé. Les routes `/dashboard` et `/revenue` utilisent directement `Order.aggregate` / `Order.find`, ce qui est correct (source de vérité unique).

Vérifie aussi que le fichier `backend/routes/analytics.js` ne contient pas du code qui ne devrait pas être là : actuellement le schéma Mongoose `analyticsSchema` est défini à la fin du fichier **après `module.exports = router`** — ce code est du code mort (jamais exécuté, le vrai modèle Analytics est dans `backend/models/Analytics.js`).

**Action : supprime tout le code après `module.exports = router;` dans `backend/routes/analytics.js`.** C'est du code fantôme issu d'un mauvais copier-coller.
```

---

## 🟢 OPTIMISATION 10 — `admin-stats.js` : `fetchOrders` avec limit=500 peut rater des commandes sur les longues périodes

### Prompt OPT-10 — Pagination automatique dans fetchOrders

```
Dans `public/js/admin-stats.js`, dans `fetchOrders()`, remplace le fetch simple par une version qui pagine automatiquement si nécessaire :

```js
async fetchOrders() {
  const { start, end } = this.getPeriodRange(this.currentPeriod);
  const PAGE_SIZE = 500;
  let page = 1;
  let allOrders = [];
  let hasMore = true;

  try {
    while (hasMore) {
      const res = await spaAuthenticatedFetch(
        `/api/orders?limit=${PAGE_SIZE}&page=${page}&startDate=${start.toISOString()}&endDate=${end.toISOString()}&includePendingApproval=true`
      );
      const data = await res.json();
      const batch = Array.isArray(data.orders) ? data.orders : [];
      allOrders = allOrders.concat(batch);

      // Arrête si on a tout récupéré
      hasMore = batch.length === PAGE_SIZE && allOrders.length < (data.total || Infinity);
      page++;

      // Sécurité anti-boucle infinie
      if (page > 20) break;
    }
    this.orders = allOrders;
  } catch {
    this.orders = [];
  }
}
```

Cela garantit que les stats sont complètes même avec +500 commandes sur la période.
```

---

## Résumé des bugs et leur priorité

| # | Fichier(s) | Bug / Problème | Priorité |
|---|-----------|----------------|----------|
| FIX-1A | `order.service.js` | `updateOrderStatus("served")` écrase `paymentStatus` même si déjà `paid` | 🔴 Critique |
| FIX-1B | `order.controller.js` | Pas de garde contre downgrade `paid → pending` | 🔴 Critique |
| FIX-1C | `admin-stats.js` | KPI "Chiffre d'affaires" inclut les `pending_approval` non encore validées | 🔴 Critique |
| FIX-1D | `admin.html` | Pas de KPI pour les commandes en attente de validation | 🟡 Important |
| FIX-2 | `admin.js` | Pas de bouton "Encaisser" — impossible de marquer payé sans passer en "served" | 🔴 Critique |
| FIX-3 | `order.controller.js`, `analytics.js` | `revenueStats` compte les commandes annulées dans le CA | 🔴 Critique |
| FIX-4 | `analytics.js` | Dashboard n'inclut pas `pending_approval` dans les stats pending | 🟡 Important |
| FIX-5 | `order.service.js` | `fuseOrders` sans validation des IDs en entrée | 🟡 Important |
| OPT-6 | `admin-stats.js` | Courbe revenus incorrecte : inclut `pending_approval` | 🟡 Important |
| OPT-7 | `validate.js` | Schema Joi ne valide pas `includePendingApproval` → 400 potentiel | 🟡 Important |
| OPT-8 | `routes/orders.js` | Route publique `GET /orders/:id` sans rate-limit | 🟢 Amélioration |
| OPT-9 | `routes/analytics.js` | Schéma Mongoose mort collé après `module.exports` | 🔴 À supprimer |
| OPT-10 | `admin-stats.js` | `limit=500` fixe → stats incomplètes sur longues périodes | 🟢 Amélioration |

---

## Ordre d'application recommandé

1. **OPT-9** en premier (supprimer le code mort dans analytics.js — risque zéro)
2. **FIX-3** (revenueStats exclut cancelled/merged/pending_approval)
3. **FIX-1A** (updateOrderStatus ne doit pas écraser paymentStatus si déjà paid)
4. **FIX-1C** (KPIs stats excluent pending_approval du CA)
5. **OPT-6** (courbe revenus alignée sur même filtre)
6. **FIX-2** (bouton Encaisser dans le modal)
7. **FIX-1B** (garde anti-downgrade payment)
8. **FIX-4** + **FIX-1D** (dashboard analytics + KPI card)
9. **FIX-5** + **OPT-7** + **OPT-8** + **OPT-10** (robustesse)
