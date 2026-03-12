 "use strict";

 // ─── Configuration Restaurant — RestoPlus ─────────────────────────────────
 // Toutes les valeurs viennent des variables d'environnement.
 // Pour un nouveau restaurant : modifier uniquement les variables Render,
 // pas le code.

 module.exports = {
   // Identité
   id:       process.env.RESTAURANT_ID    || "demo",
   name:     process.env.RESTAURANT_NAME  || "RestoPlus Demo",
   address:  process.env.RESTAURANT_ADDR  || "",
   phone:    process.env.RESTAURANT_PHONE || "",
   email:    process.env.RESTAURANT_EMAIL || "",
   website:  process.env.RESTAURANT_WEB   || "",

   // Locale
   currency: process.env.RESTAURANT_CURRENCY || "CFA",
   timezone: process.env.RESTAURANT_TZ       || "Africa/Dakar",
   locale:   process.env.RESTAURANT_LOCALE   || "fr-FR",

   // Paiement mobile
   payment: {
     wave:         process.env.WAVE_PHONE || "",
     orange_money: process.env.OM_PHONE   || "",
     cashEnabled:  process.env.CASH_ENABLED  !== "false",
     cardEnabled:  process.env.CARD_ENABLED  !== "false",
     waveEnabled:  process.env.WAVE_ENABLED  !== "false",
     omEnabled:    process.env.OM_ENABLED    !== "false",
   },

   // Branding
   branding: {
     primaryColor:   process.env.BRAND_COLOR        || "#c0873f",
     secondaryColor: process.env.BRAND_COLOR_DARK   || "#8b5e2a",
     accentColor:    process.env.BRAND_COLOR_ACCENT || "#e8b06a",
     logoUrl:        process.env.LOGO_URL            || "",
     faviconUrl:     process.env.FAVICON_URL         || "",
     bannerUrl:      process.env.BANNER_URL          || "",
   },

   // Tables
   tables: {
     count:    parseInt(process.env.TABLE_COUNT  || "10"),
     prefix:   process.env.TABLE_PREFIX          || "Table",
     // Zones personnalisables
     zones: process.env.TABLE_ZONES
       ? process.env.TABLE_ZONES.split(",").map(z => z.trim())
       : ["Salle principale", "Terrasse", "Salle VIP"],
   },

   // Fonctionnalités activables par restaurant
   features: {
     orderFusion:   process.env.FEATURE_FUSION !== "false",
     stats:         process.env.FEATURE_STATS  !== "false",
     orderHistory:  process.env.FEATURE_HISTORY !== "false",
     notifications: process.env.FEATURE_NOTIFS !== "false",
   },

   // Sécurité (ne jamais exposer au frontend)
   _private: {
     jwtSecret:   process.env.JWT_SECRET,
     mongoUri:    process.env.MONGODB_URI,
     adminUser:   process.env.ADMIN_USERNAME,
     serverUser:  process.env.SERVER_USERNAME,
   },
 };

