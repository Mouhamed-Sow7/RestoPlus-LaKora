 # Refacto RestoPlus (Multi-restaurant)
 
 Ce dossier contient une version refactorisée de RestoPlus prête pour gérer **plusieurs restaurants** à partir d'un même code, uniquement via des **variables d'environnement**.
 
 ## Structure
 
 - `backend/app.js` : serveur Express avec route publique `/api/config`
 - `backend/config/index.js` : configuration globale (port, Mongo, JWT, CORS, rate limit)
 - `backend/config/restaurant.config.js` : configuration par restaurant (branding, paiements, tables, features)
 - `backend/routes/config.js` : expose la config publique au frontend
 - `public/index.html` : page d'accueil générique avec `<span data-restaurant-name>`
 - `public/menu.html` : menu générique multi-restaurant
 - `public/admin.html` : interface admin générique
 - `public/js/app-config.js` : charge `/api/config` et applique le branding
 - `public/js/main.js` : expose `window.RestoPlus` (alias `window.LaKora` pour compat)
 - `public/js/cart.js` : panier connecté à `RestoPlus` et à la config de paiement
 - `public/css/main.css` : couleurs basées sur `--brand` et `--brand-dark`
 - `.env.restaurant-template` : modèle de variables Render par restaurant
 
 ## Déploiement d'un nouveau restaurant sur Render
 
 1. **Créer un nouveau service Render** à partir de ce repo (ou d'un fork).
 2. Dans l'onglet **Environment** de Render, copier/coller le contenu de `.env.restaurant-template` puis adapter :
    - `RESTAURANT_ID`
    - `RESTAURANT_NAME`
    - `RESTAURANT_ADDR`
    - `RESTAURANT_PHONE`
    - `BRAND_COLOR`, `BRAND_COLOR_DARK`, `BRAND_COLOR_ACCENT`
    - `WAVE_PHONE`, `OM_PHONE`
    - `MONGODB_URI`, `JWT_SECRET`, etc.
 3. Lancer le service :  
    - `/api/config` renverra la config du restaurant.  
    - Le frontend appliquera automatiquement le **nom**, les **couleurs**, le **logo**, les **numéros Wave/OM** et les **features**.
 
 ## Résultat
 
 - **Un seul codebase** (ce dossier `refacto`)  
 - **N services Render** (un par restaurant)  
 - Aucun changement de code pour ajouter un restaurant : seulement les variables d'environnement.
 
