"use strict";
const router = require("express").Router();
const { authenticateToken, requireAdminOrServer } = require("../middleware/auth");
const Analytics   = require("../models/Analytics");
const Order       = require("../models/Order");
const Reservation = require("../models/Reservation");

// Toutes les routes analytics sont désormais protégées
router.use(authenticateToken, requireAdminOrServer);

router.get("/dashboard", async (req, res) => {
  try {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(); endOfDay.setHours(23, 59, 59, 999);
    const [todayOrders, todayReservations] = await Promise.all([
      Order.find({ timestamp: { $gte: startOfDay, $lte: endOfDay } }).lean(),
      Reservation.find({ reservationDate: { $gte: startOfDay, $lte: endOfDay } }).lean(),
    ]);
    res.json({
      orders: {
        total:     todayOrders.length,
        completed: todayOrders.filter(o => o.status === "served").length,
        pending:   todayOrders.filter(o => ["pending","accepted","preparing","ready"].includes(o.status)).length,
        revenue:   todayOrders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0),
      },
      reservations: {
        total:     todayReservations.length,
        confirmed: todayReservations.filter(r => r.status === "confirmed").length,
        seated:    todayReservations.filter(r => r.status === "seated").length,
        completed: todayReservations.filter(r => r.status === "completed").length,
      },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/revenue", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = {};
    if (startDate || endDate) { match.timestamp = {}; if (startDate) match.timestamp.$gte = new Date(startDate); if (endDate) match.timestamp.$lte = new Date(endDate); }
    const [stats] = await Order.aggregate([{ $match: match }, { $group: { _id: null, totalRevenue: { $sum: "$total" }, paidRevenue: { $sum: { $cond: [{ $eq: ["$paymentStatus","paid"]}, "$total", 0] } }, pendingRevenue: { $sum: { $cond: [{ $eq: ["$paymentStatus","pending"]}, "$total", 0] } }, totalOrders: { $sum: 1 }, averageOrderValue: { $avg: "$total" } } }]);
    res.json(stats || { totalRevenue: 0, paidRevenue: 0, pendingRevenue: 0, totalOrders: 0, averageOrderValue: 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/history", async (req, res) => {
  try {
    const { period = "daily", limit = 30 } = req.query;
    res.json(await Analytics.find({ period }).sort({ date: -1 }).limit(parseInt(limit, 10)).lean());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
