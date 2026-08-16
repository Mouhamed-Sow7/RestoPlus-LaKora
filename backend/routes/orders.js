"use strict";
const router = require("express").Router();
const ctrl = require("../controllers/order.controller");
const Order = require("../models/Order");
const {
  authenticateToken,
  requireAdmin,
  requireAdminOrServer,
} = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validate");
const rateLimit = require("express-rate-limit");

// Rate limiter pour les endpoints publics
const publicOrderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 requêtes par minute par IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requêtes. Réessayez dans une minute." },
});

// Rate limiter dédié à la CRÉATION de commande — plus strict, car
// contrairement aux GET publics, chaque appel produit un effet de bord
// (nouvelle commande à traiter par le staff). Aucun limiter n'existait
// jusqu'ici sur POST /api/orders.
const createOrderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6, // 6 créations de commande / minute / IP — largement suffisant
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de commandes créées. Réessayez dans une minute." },
});

// ─── Middleware anti-flood (léger) ──────────────────────────────────────────
// Le client peut commander autant de fois qu'il veut : c'est le scan du
// ticket QR par le serveur (validation/rejet manuel) qui fait office de
// contrôle métier, pas une restriction côté commande. On garde uniquement
// un plafond très lâche par table pour absorber un flood extrême
// (ex: script qui spam), sans jamais bloquer un usage normal, même avec
// plusieurs commandes successives légitimes.
const checkTableSpam = async (req, res, next) => {
  try {
    const table = parseInt(req.body.table, 10);
    if (!table) return next();
    const count = await Order.countDocuments({
      table,
      status: "pending_approval",
    });
    if (count >= 15) {
      return res.status(429).json({
        error:
          "Trop de commandes en attente pour cette table. Contactez le personnel.",
        code: "TABLE_SPAM_LIMIT",
      });
    }
    next();
  } catch {
    next();
  }
};

// Routes statiques AVANT /:orderId (ordre obligatoire sous Express)
router.get("/public", publicOrderLimiter, ctrl.publicHistory);
router.get("/public/:orderId/status", publicOrderLimiter, ctrl.publicStatus);
router.get(
  "/stats/revenue",
  authenticateToken,
  requireAdmin,
  ctrl.revenueStats,
);
router.get("/qr/type", ctrl.detectQRType); // QR type detection (public endpoint)

router.get(
  "/",
  authenticateToken,
  requireAdminOrServer,
  validate(schemas.queryOrders, "query"),
  ctrl.list,
);
router.post(
  "/",
  createOrderLimiter,
  validate(schemas.createOrder),
  checkTableSpam,
  ctrl.create,
);
router.post(
  "/fuse",
  authenticateToken,
  validate(schemas.fuseOrders),
  ctrl.fuse,
);

router.get("/:orderId", publicOrderLimiter, ctrl.getOne);
router.post("/:orderId/scan/validate", authenticateToken, ctrl.scanValidate);
router.post("/:orderId/scan/reject", authenticateToken, ctrl.scanReject);
router.patch(
  "/:orderId/status",
  authenticateToken,
  requireAdmin,
  validate(schemas.updateStatus),
  ctrl.updateStatus,
);
router.patch(
  "/:orderId/payment",
  authenticateToken,
  requireAdmin,
  validate(schemas.updatePayment),
  ctrl.updatePayment,
);
router.delete("/:orderId", authenticateToken, requireAdmin, ctrl.remove);

module.exports = router;
