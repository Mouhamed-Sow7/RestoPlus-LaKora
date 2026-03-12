"use strict";
const Order = require("../models/Order");
const svc   = require("../services/order.service");
const err   = (res, e) => res.status(e.status || 500).json({ error: e.message });

exports.list = async (req, res) => {
  try {
    const { page, limit, status, paymentStatus, table, startDate, endDate, includePendingApproval } = req.query;
    const filter = {};
    if (status) {
      const arr = String(status).split(",").map(s => s.trim()).filter(Boolean);
      filter.status = arr.length > 1 ? { $in: arr } : arr[0];
    } else if (includePendingApproval !== "true") {
      filter.status = { $ne: "pending_approval" };
    }
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (table) filter.table = parseInt(table);
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate)   filter.timestamp.$lte = new Date(endDate);
    }
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ timestamp: -1 }).limit(limit).skip((page - 1) * limit).lean(),
      Order.countDocuments(filter),
    ]);
    res.json({ orders, totalPages: Math.ceil(total / limit), currentPage: page, total });
  } catch (e) { err(res, e); }
};

exports.publicHistory = async (req, res) => {
  try {
    const { table, limit = 50, sort = "desc" } = req.query;
    if (!table) return res.status(400).json({ error: "Paramètre 'table' requis" });
    const tableNum = parseInt(table, 10);
    if (isNaN(tableNum)) return res.status(400).json({ error: "Table doit être un nombre" });
    const orders = await Order.find({ table: tableNum }, "orderId table total status paymentStatus paymentMethod items timestamp")
      .sort({ timestamp: sort === "asc" ? 1 : -1 }).limit(Math.min(parseInt(limit, 10) || 50, 100)).lean();
    res.json({ orders, table: tableNum });
  } catch (e) { err(res, e); }
};

exports.publicStatus = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId }, "orderId status paymentStatus table total timestamp").lean();
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (e) { err(res, e); }
};

exports.getOne = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId }).lean();
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (e) { err(res, e); }
};

exports.create       = async (req, res) => { try { res.status(201).json(await svc.createOrder(req.body));                                       } catch (e) { err(res, e); } };
exports.fuse         = async (req, res) => { try { res.status(201).json(await svc.fuseOrders(req.body.orderIds, req.body.table, req.user));      } catch (e) { err(res, e); } };
exports.scanValidate = async (req, res) => { try { res.json(await svc.validateOrder(req.params.orderId, req.user?.role || "admin"));             } catch (e) { err(res, e); } };
exports.scanReject   = async (req, res) => { try { res.json(await svc.rejectOrder(req.params.orderId, req.user?.role || "admin"));               } catch (e) { err(res, e); } };
exports.updateStatus = async (req, res) => { try { res.json(await svc.updateOrderStatus(req.params.orderId, req.body.status));                   } catch (e) { err(res, e); } };
exports.updatePayment= async (req, res) => { try { res.json(await svc.updatePaymentStatus(req.params.orderId, req.body));                        } catch (e) { err(res, e); } };
exports.remove       = async (req, res) => {
  try {
    const order = await Order.findOneAndDelete({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ message: "Order deleted successfully", orderId: req.params.orderId });
  } catch (e) { err(res, e); }
};
exports.revenueStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = {};
    if (startDate || endDate) { match.timestamp = {}; if (startDate) match.timestamp.$gte = new Date(startDate); if (endDate) match.timestamp.$lte = new Date(endDate); }
    const [stats] = await Order.aggregate([{ $match: match }, { $group: { _id: null, totalRevenue: { $sum: "$total" }, paidRevenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$total", 0] } }, pendingRevenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, "$total", 0] } }, totalOrders: { $sum: 1 }, averageOrderValue: { $avg: "$total" } } }]);
    res.json(stats || { totalRevenue: 0, paidRevenue: 0, pendingRevenue: 0, totalOrders: 0, averageOrderValue: 0 });
  } catch (e) { err(res, e); }
};
