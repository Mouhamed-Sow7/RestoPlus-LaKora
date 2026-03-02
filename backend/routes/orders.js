"use strict";
const router = require("express").Router();
const ctrl   = require("../controllers/order.controller");
const { authenticateToken, requireAdmin, requireAdminOrServer } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validate");

// Routes statiques AVANT /:orderId (ordre obligatoire sous Express)
router.get( "/public",                  ctrl.publicHistory);
router.get( "/public/:orderId/status",  ctrl.publicStatus);
router.get( "/stats/revenue",           authenticateToken, requireAdmin, ctrl.revenueStats);

router.get( "/",                        authenticateToken, requireAdminOrServer, validate(schemas.queryOrders, "query"), ctrl.list);
router.post("/",                        validate(schemas.createOrder), ctrl.create);
router.post("/fuse",                    authenticateToken, validate(schemas.fuseOrders), ctrl.fuse);

router.get(    "/:orderId",             ctrl.getOne);
router.post(   "/:orderId/scan/validate", authenticateToken, ctrl.scanValidate);
router.post(   "/:orderId/scan/reject",   authenticateToken, ctrl.scanReject);
router.patch(  "/:orderId/status",      authenticateToken, requireAdmin, validate(schemas.updateStatus), ctrl.updateStatus);
router.patch(  "/:orderId/payment",     authenticateToken, requireAdmin, validate(schemas.updatePayment), ctrl.updatePayment);
router.delete( "/:orderId",            authenticateToken, requireAdmin, ctrl.remove);

module.exports = router;
