 "use strict";
 const router = require("express").Router();
 const cfg    = require("../config/restaurant.config");
 
 // GET /api/config — config publique (sans données sensibles)
 router.get("/", (_req, res) => {
   res.json({
     id:       cfg.id,
     name:     cfg.name,
     address:  cfg.address,
     phone:    cfg.phone,
     currency: cfg.currency,
     locale:   cfg.locale,
     payment:  {
       wave:          cfg.payment.wave,
       orange_money:  cfg.payment.orange_money,
       cashEnabled:   cfg.payment.cashEnabled,
       cardEnabled:   cfg.payment.cardEnabled,
       waveEnabled:   cfg.payment.waveEnabled,
       omEnabled:     cfg.payment.omEnabled,
     },
     branding: cfg.branding,
     tables:   cfg.tables,
     features: cfg.features,
   });
 });
 
 module.exports = router;
*** End Patch```}"/>
