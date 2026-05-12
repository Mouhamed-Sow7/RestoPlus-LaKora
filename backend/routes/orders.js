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

// ─── Middleware anti-spam ──────────────────────────────────────────────────
// Bloque si une table a déjà 3 commandes pending_approval simultanées
const checkTableSpam = async (req, res, next) => {
  try {
    const table = parseInt(req.body.table, 10);
    if (!table) return next();
    const count = await Order.countDocuments({
      table,
      status: "pending_approval",
    });
    if (count >= 3) {
      return res.status(429).json({
        error:
          "Trop de commandes en attente pour cette table. Veuillez patienter.",
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
router.post("/", validate(schemas.createOrder), checkTableSpam, ctrl.create);
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
