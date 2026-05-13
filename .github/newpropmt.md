PROMPT RESTE-1 — Supprimer le code mort dans analytics.js
Ouvre backend/routes/analytics.js, colle :
Dans `backend/routes/analytics.js`, le fichier contient du code Mongoose après `module.exports = router;` (schéma analyticsSchema, indexes, etc.). Ce code est mort — jamais exécuté car après l'export. Supprime tout ce qui se trouve après la ligne `module.exports = router;` jusqu'à la fin du fichier. Ne touche pas au code avant cette ligne.

PROMPT RESTE-2 — Corriger revenueStats pour exclure annulées + pending_approval du CA
Ouvre backend/controllers/order.controller.js, colle :
Dans `exports.revenueStats`, le `$match` de l'aggregate ne filtre pas les commandes annulées ni les pending_approval, ce qui gonfle le chiffre d'affaires. Remplace :

```js
const match = {};
if (startDate || endDate) {
  match.timestamp = {};
  if (startDate) match.timestamp.$gte = new Date(startDate);
  if (endDate) match.timestamp.$lte = new Date(endDate);
}
```

Par :

```js
const match = {
  status: { $nin: ["cancelled", "merged", "pending_approval"] },
};
if (startDate || endDate) {
  match.timestamp = {};
  if (startDate) match.timestamp.$gte = new Date(startDate);
  if (endDate) match.timestamp.$lte = new Date(endDate);
}
```

Même fix dans `backend/routes/analytics.js` route `GET /revenue` : ajoute `status: { $nin: ["cancelled", "merged", "pending_approval"] }` dans le `$match` de l'aggregate.

PROMPT RESTE-3 — Corriger admin-stats.js : exclure pending_approval du CA affiché
Ouvre public/js/admin-stats.js, colle :
Dans `renderKPIs()` et dans `getTimeSeriesData()`, les validOrders incluent les commandes `pending_approval` non encore approuvées, ce qui fait paraître "Encaissé" à 0 artificiellement.

Dans `renderKPIs()`, remplace :

```js
const validOrders = this.orders.filter(
  (o) => o.status !== "cancelled" && o.status !== "merged",
);
```

Par :

```js
const validOrders = this.orders.filter(
  (o) =>
    o.status !== "cancelled" &&
    o.status !== "merged" &&
    o.status !== "pending_approval",
);
```

Dans `getTimeSeriesData()`, dans les 4 blocs if (day/week/month/year), chaque bloc commence par :

```js
const validOrders = this.orders.filter(
  (o) => o.status !== "cancelled" && o.status !== "merged",
);
```

Remplace ces 4 occurrences par le même filtre avec `&& o.status !== "pending_approval"` ajouté.

PROMPT RESTE-4 — Bouton "💳 Encaisser" dans le modal de gestion commande
Ouvre public/js/admin.js, colle :
Dans la méthode `displayOrderInModal(order)` (ou `setupModalEventListeners`), là où tu génères les boutons d'action (`.mm-actions-grid`), ajoute un bouton Encaisser après le bouton "Servie" :

```html
<button class="mm-btn mm-btn-pay" data-action="pay">💳 Encaisser</button>
```

Masque ce bouton si `order.paymentStatus === "paid"` : après l'injection du HTML dans le modal, ajoute :

```js
const btnPay = document.querySelector(".mm-btn-pay");
if (btnPay && order.paymentStatus === "paid") btnPay.style.display = "none";
```

Dans le handler click de `.mm-actions-grid`, ajoute le case `"pay"` :

```js
if (action === "pay") {
  const orderId = this.currentOrder?.orderId || this.currentOrder?.id;
  if (!orderId) return;
  if (this.currentOrder?.paymentStatus === "paid") {
    NotificationManager.showSuccess(
      null,
      "Déjà encaissé",
      "Commande déjà marquée payée.",
      2500,
      "info",
    );
    return;
  }
  try {
    const res = await spaAuthenticatedFetch(`/api/orders/${orderId}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: "paid" }),
    });
    if (!res.ok) throw new Error();
    const updated = await res.json();
    this.currentOrder = updated;
    NotificationManager.showSuccess(
      orderId,
      "✅ Encaissé",
      `Paiement enregistré.`,
      3000,
      "success",
    );
    this.displayOrderInModal(updated);
    window.ordersManager?.loadOrders?.();
  } catch {
    NotificationManager.showSuccess(
      null,
      "Erreur",
      "Impossible d'encaisser. Réessayez.",
      3000,
      "error",
    );
  }
  return;
}
```

PROMPT RESTE-5 — Header admin uniformisé (UI-3 non appliqué)
Ouvre public/css/admin.css, colle :
Dans `public/css/admin.css`, cherche et remplace le bloc `.admin-header` existant (et toutes ses media queries répétitives) par ce bloc unifié :

```css
/* ─── Header Admin ──────────────────────────────────────────── */
.admin-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: #fff;
  border-bottom: 1px solid var(--color-border, #ebebeb);
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.08));
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-lg, 24px);
  gap: var(--space-md, 16px);
}
.admin-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-size: 1rem;
  color: var(--color-text, #1a1a1a);
  text-decoration: none;
  white-space: nowrap;
}
.admin-logo-icon {
  width: 34px;
  height: 34px;
  background: linear-gradient(
    135deg,
    var(--color-primary, #c0873f),
    var(--color-primary-dark, #9b6830)
  );
  color: #fff;
  border-radius: var(--radius-sm, 8px);
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
  gap: 4px;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.admin-nav::-webkit-scrollbar {
  display: none;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-pill, 9999px);
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--color-text-muted, #6b6b6b);
  text-decoration: none;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all var(--transition-fast, 0.15s ease);
  white-space: nowrap;
}
.nav-link:hover {
  background: var(--color-surface-alt, #f5f0e8);
  color: var(--color-text, #1a1a1a);
}
.nav-link.active {
  background: var(--color-primary-bg, #fdf8f0);
  color: var(--color-primary, #c0873f);
}
@media (max-width: 640px) {
  .admin-header {
    padding: 0 var(--space-md, 16px);
  }
  .nav-link {
    padding: 6px 10px;
    font-size: 0.78rem;
  }
}
```

Supprime ensuite toutes les anciennes media queries répétitives qui redéfinissent `.admin-nav .nav-link` et `.admin-logo h1` à plusieurs breakpoints — elles sont remplacées par le bloc ci-dessus.
