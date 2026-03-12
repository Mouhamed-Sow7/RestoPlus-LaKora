# RestoPlus — Plan de Refactoring Multi-Restaurant

## Architecture choisie : Option B → Option A progressive

### PHASE 1 — Nettoyage branding + fichier de config (Aujourd'hui)

#### 1.1 Créer `config/restaurant.config.js` (backend)

```js
// backend/config/restaurant.config.js
module.exports = {
  id:       process.env.RESTAURANT_ID   || "demo",
  name:     process.env.RESTAURANT_NAME || "RestoPlus Demo",
  address:  process.env.RESTAURANT_ADDR || "",
  phone:    process.env.RESTAURANT_PHONE|| "",
  currency: process.env.RESTAURANT_CURRENCY || "CFA",
  timezone: process.env.RESTAURANT_TZ   || "Africa/Dakar",
  payment: {
    wave:         process.env.WAVE_PHONE || "",
    orange_money: process.env.OM_PHONE   || "",
  },
  branding: {
    primaryColor:   process.env.BRAND_COLOR       || "#c0873f",
    secondaryColor: process.env.BRAND_COLOR_DARK  || "#8b5e2a",
    logoUrl:        process.env.LOGO_URL           || "",
    favicon:        process.env.FAVICON_URL        || "",
  },
  tables: {
    count:    parseInt(process.env.TABLE_COUNT || "10"),
    prefix:   process.env.TABLE_PREFIX || "Table",
  },
  features: {
    fusion:     process.env.FEATURE_FUSION     !== "false",
    stats:      process.env.FEATURE_STATS      !== "false",
    wavePayment:process.env.FEATURE_WAVE       !== "false",
  },
};
```

#### 1.2 Exposer la config via API publique

```js
// backend/routes/config.js
const router = require("express").Router();
const cfg    = require("../config/restaurant.config");

// Route publique — le frontend charge la config au démarrage
router.get("/", (req, res) => {
  res.json({
    id:       cfg.id,
    name:     cfg.name,
    address:  cfg.address,
    currency: cfg.currency,
    payment:  cfg.payment,
    branding: cfg.branding,
    tables:   cfg.tables,
    features: cfg.features,
  });
});

module.exports = router;
```

```js
// Dans app.js — ajouter la route
app.use("/api/config", require("./routes/config"));
```

#### 1.3 Frontend — charger la config dynamiquement

```js
// public/js/app-config.js (nouveau fichier, chargé en premier dans chaque page)
window.RestoConfig = null;

async function loadRestaurantConfig() {
  try {
    const res  = await fetch("/api/config");
    const cfg  = await res.json();
    window.RestoConfig = cfg;

    // Appliquer le branding CSS
    document.documentElement.style.setProperty("--brand",      cfg.branding.primaryColor);
    document.documentElement.style.setProperty("--brand-dark", cfg.branding.secondaryColor);

    // Nom du restaurant
    document.querySelectorAll("[data-restaurant-name]")
      .forEach(el => el.textContent = cfg.name);
    document.querySelectorAll("[data-restaurant-id]")
      .forEach(el => el.textContent = cfg.id);

    // Logo
    if (cfg.branding.logoUrl) {
      document.querySelectorAll("[data-restaurant-logo]")
        .forEach(el => { el.src = cfg.branding.logoUrl; el.style.display = "block"; });
    }

    // Titre de page
    document.title = `${cfg.name} — RestoPlus`;

    return cfg;
  } catch (e) {
    console.warn("[RestoPlus] Config non disponible, valeurs par défaut utilisées");
    window.RestoConfig = {
      name: "RestoPlus",
      currency: "CFA",
      branding: { primaryColor: "#c0873f", secondaryColor: "#8b5e2a" },
      payment: { wave: "", orange_money: "" },
    };
    return window.RestoConfig;
  }
}

// Auto-exécution
loadRestaurantConfig();
```

---

### PHASE 2 — Nettoyage "La Kora" dans le code

#### Fichiers à modifier

| Fichier | Remplacer |
|---|---|
| `public/index.html` | "La Kora" → `<span data-restaurant-name>RestoPlus</span>` |
| `public/menu.html` | Idem + couleurs hardcodées |
| `public/admin.html` | "La Kora - Admin" → `<span data-restaurant-name>RestoPlus</span> — Admin` |
| `public/js/main.js` | Constante `LaKora` → `RestoPlus` |
| `public/css/main.css` | Variables couleur → utiliser `var(--brand)` |
| `public/manifest.json` | name, short_name, theme_color |
| `backend/config/` | Variables d'env au lieu de valeurs hardcodées |

#### Renommages JS

```js
// AVANT
window.LaKora = { TableDetector, menuData, formatPrice, generateOrderId };

// APRÈS
window.RestoPlus = { TableDetector, menuData, formatPrice, generateOrderId };
```

#### manifest.json générique

```json
{
  "name": "RestoPlus",
  "short_name": "RestoPlus",
  "description": "Commandez facilement depuis votre table",
  "start_url": "/menu.html",
  "display": "standalone",
  "background_color": "#fdfaf7",
  "theme_color": "#c0873f",
  "icons": [
    { "src": "/img/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/img/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

### PHASE 3 — Variables d'environnement Render (par restaurant)

Pour déployer "Sikki" comme nouveau client :

```env
# Render → Environment Variables
RESTAURANT_ID=sikki
RESTAURANT_NAME=Restaurant Sikki
RESTAURANT_ADDR=123 Avenue Cheikh Anta Diop, Dakar
RESTAURANT_PHONE=+221 77 XXX XX XX
WAVE_PHONE=77XXXXXXX
OM_PHONE=77XXXXXXX
BRAND_COLOR=#1a6b3c
BRAND_COLOR_DARK=#0f4a28
TABLE_COUNT=8
MONGODB_URI=mongodb+srv://... (DB propre à Sikki)
JWT_SECRET=... (secret propre)
```

**Résultat :** un clone du repo RestoPlus déployé sur Render en 10 minutes avec un nouveau restaurant entièrement configuré sans toucher au code.

---

### PHASE 4 — Architecture QR table (déjà prête)

Le système de QR par table est déjà implémenté. Pour la multi-instance :

```
restoplus-sikki.onrender.com/menu.html?table=1
restoplus-sikki.onrender.com/menu.html?table=2
```

QR Code contenu :
```json
{
  "table": 1,
  "restaurantId": "sikki",
  "url": "https://restoplus-sikki.onrender.com/menu.html?table=1"
}
```

---

### PHASE 5 (futur) — Routing multi-tenant sur un seul backend

```
restoplus.app/r/sikki          → menu Sikki
restoplus.app/r/lakora         → menu LaKora
restoplus.app/admin/sikki      → admin Sikki
```

Architecture backend :

```js
// Middleware restaurant
app.use("/r/:restaurantId", async (req, res, next) => {
  const restaurant = await Restaurant.findOne({ slug: req.params.restaurantId });
  if (!restaurant) return res.status(404).send("Restaurant introuvable");
  req.restaurant = restaurant;
  next();
});

// Toutes les routes prefixées
app.use("/r/:restaurantId/api/orders",  ordersRouter);
app.use("/r/:restaurantId/api/menu",    menuRouter);
```

DB structure multi-tenant :

```js
// Chaque document a un champ restaurantId
orderSchema.add({ restaurantId: { type: String, required: true, index: true } });
menuSchema.add({  restaurantId: { type: String, required: true, index: true } });
```

---

## Checklist immédiate (aujourd'hui)

- [ ] Créer `backend/config/restaurant.config.js`
- [ ] Créer `backend/routes/config.js` + brancher dans `app.js`
- [ ] Créer `public/js/app-config.js`
- [ ] Ajouter `<script src="js/app-config.js">` en PREMIER dans index.html, menu.html, admin.html
- [ ] Remplacer les textes "La Kora" par `data-restaurant-name` dans les HTML
- [ ] Renommer `window.LaKora` → `window.RestoPlus` dans main.js + cart.js + tous les fichiers qui l'utilisent
- [ ] Mettre à jour manifest.json
- [ ] Variables d'env Render : ajouter RESTAURANT_NAME, RESTAURANT_ID, etc.
- [ ] Mettre à jour le README avec les instructions de déploiement multi-restaurant

## Résultat final

Un seul repo GitHub → N déploiements Render → N restaurants  
Chaque déploiement = variables d'env différentes = restaurant différent  
Zéro code à modifier pour ajouter un nouveau client
