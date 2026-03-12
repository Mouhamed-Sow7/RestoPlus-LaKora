 // ─── RestoPlus — App Config Loader ───────────────────────────────────────
 // À inclure EN PREMIER dans chaque page HTML (avant tous les autres scripts).
 // Charge la config du restaurant depuis /api/config et applique le branding.
 
 (function () {
   "use strict";
 
   // Config par défaut (utilisée si l'API est indisponible)
   const DEFAULT_CONFIG = {
     id:       "demo",
     name:     "RestoPlus",
     address:  "",
     phone:    "",
     currency: "CFA",
     locale:   "fr-FR",
     payment: {
       wave: "", orange_money: "",
       cashEnabled: true, cardEnabled: true,
       waveEnabled: false, omEnabled: false,
     },
     branding: {
       primaryColor:   "#c0873f",
       secondaryColor: "#8b5e2a",
       accentColor:    "#e8b06a",
       logoUrl:        "",
     },
     tables:   { count: 10, prefix: "Table", zones: ["Salle principale"] },
     features: { orderFusion: true, stats: true, orderHistory: true, notifications: true },
   };
 
   window.RestoConfig = DEFAULT_CONFIG;
 
   // ─── Appliquer branding CSS ─────────────────────────────────────────────
   function applyBranding(cfg) {
     const root = document.documentElement;
     root.style.setProperty("--brand",       cfg.branding.primaryColor);
     root.style.setProperty("--brand-dark",  cfg.branding.secondaryColor);
     root.style.setProperty("--brand-light", cfg.branding.accentColor || "#e8b06a");
   }
 
   // ─── Injecter nom/logo dans le DOM ─────────────────────────────────────
   function applyDOM(cfg) {
     // Nom du restaurant
     document.querySelectorAll("[data-restaurant-name]")
       .forEach(el => { el.textContent = cfg.name; });
 
     // Tagline "Powered by RestoPlus" / adresse
     document.querySelectorAll("[data-restaurant-tagline]")
       .forEach(el => { el.textContent = cfg.address || ""; });
 
     // Logo
     if (cfg.branding.logoUrl) {
       document.querySelectorAll("[data-restaurant-logo]").forEach(el => {
         if (el.tagName === "IMG") {
           el.src = cfg.branding.logoUrl;
           el.alt = cfg.name;
           el.style.display = "block";
         }
       });
     }
 
     // Titre de page
     const pageTitle = document.title;
     if (pageTitle && cfg.name !== "RestoPlus") {
       document.title = pageTitle.replace("RestoPlus", cfg.name);
     }
 
     // Masquer/afficher boutons paiement selon config
     if (!cfg.payment.waveEnabled) {
       document.querySelectorAll("[data-payment='wave']")
         .forEach(el => el.style.display = "none");
     }
     if (!cfg.payment.omEnabled) {
       document.querySelectorAll("[data-payment='orange_money']")
         .forEach(el => el.style.display = "none");
     }
   }
 
   // ─── Charger depuis l'API ───────────────────────────────────────────────
   async function loadConfig() {
     try {
       const res = await fetch("/api/config");
       if (!res.ok) throw new Error(`HTTP ${res.status}`);
       const cfg = await res.json();
 
       // Merge avec les defaults pour éviter les champs manquants
       window.RestoConfig = Object.assign({}, DEFAULT_CONFIG, cfg, {
         payment:  Object.assign({}, DEFAULT_CONFIG.payment,  cfg.payment  || {}),
         branding: Object.assign({}, DEFAULT_CONFIG.branding, cfg.branding || {}),
         tables:   Object.assign({}, DEFAULT_CONFIG.tables,   cfg.tables   || {}),
         features: Object.assign({}, DEFAULT_CONFIG.features, cfg.features || {}),
       });
 
       // Mettre à jour PAYMENT_CONFIG dans cart.js si déjà chargé
       if (window.PAYMENT_CONFIG) {
         if (cfg.payment?.wave) {
           window.PAYMENT_CONFIG.wave.phone     = cfg.payment.wave;
           window.PAYMENT_CONFIG.wave.phoneIntl = "+221" + cfg.payment.wave;
           window.PAYMENT_CONFIG.wave.deepLink  = (amount) =>
             `https://wave.com/send?phone=%2B221${cfg.payment.wave}&amount=${amount}&currency=XOF`;
         }
         if (cfg.payment?.orange_money) {
           window.PAYMENT_CONFIG.orange_money.phone    = cfg.payment.orange_money;
           window.PAYMENT_CONFIG.orange_money.deepLink = (amount) =>
             `tel:*144*1*${cfg.payment.orange_money}*${amount}#`;
         }
       }
 
       // Compatibilité : garder window.LaKora fonctionnel (alias) si présent
       if (window.LaKora) window.RestoPlus = window.LaKora;
 
     } catch (e) {
       console.warn("[RestoPlus] Config API indisponible, defaults utilisés:", e.message);
     }
 
     // Appliquer dans tous les cas
     applyBranding(window.RestoConfig);
 
     // Attendre DOM si pas encore prêt
     if (document.readyState === "loading") {
       document.addEventListener("DOMContentLoaded", () => applyDOM(window.RestoConfig));
     } else {
       applyDOM(window.RestoConfig);
     }
 
     // Émettre un événement pour les modules qui attendent la config
     window.dispatchEvent(new CustomEvent("restoConfigLoaded", { detail: window.RestoConfig }));
   }
 
   loadConfig();
 
   // ─── Helper global ──────────────────────────────────────────────────────
   window.getRestoConfig = function () { return window.RestoConfig; };
 
   // ─── Formateur de prix utilisant la locale du restaurant ────────────────
   window.formatRestoPrice = function (amount) {
     const cfg = window.RestoConfig;
     try {
       return new Intl.NumberFormat(cfg.locale || "fr-FR").format(amount || 0);
     } catch (_) {
       return String(amount || 0);
     }
   };
 })();

