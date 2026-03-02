"use strict";
const { randomInt } = require("crypto");
const Order = require("../models/Order");
const { scheduleAnalyticsUpdate } = require("./analytics.service");

function generateOrderId(prefix = "ORD") {
  return `${prefix}-${Date.now()}-${randomInt(0, 999999).toString().padStart(6, "0")}`;
}

async function createOrder(data) {
  const order = await new Order({
    ...data,
    orderId: data.orderId || generateOrderId(),
    status: "pending_approval",
  }).save();
  scheduleAnalyticsUpdate(order);
  return order;
}

async function validateOrder(orderId, role) {
  const order = await Order.findOneAndUpdate(
    { orderId },
    { status: "accepted", scan: { firstScannedBy: role, firstScannedAt: new Date(), lastValidatedBy: role, lastValidatedAt: new Date(), lastAction: "validated" } },
    { new: true }
  );
  if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
  return order;
}

async function rejectOrder(orderId, role) {
  const order = await Order.findOneAndUpdate(
    { orderId },
    { status: "cancelled", cancelledAt: new Date(), scan: { lastValidatedBy: role, lastValidatedAt: new Date(), lastAction: "rejected" } },
    { new: true }
  );
  if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
  return order;
}

async function updateOrderStatus(orderId, status) {
  const order = await Order.findOneAndUpdate(
    { orderId },
    { status, ...(status === "served" && { servedAt: new Date() }), ...(status === "cancelled" && { cancelledAt: new Date() }) },
    { new: true }
  );
  if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
  scheduleAnalyticsUpdate(order);
  return order;
}

async function updatePaymentStatus(orderId, { paymentStatus, paymentMethod }) {
  const order = await Order.findOneAndUpdate(
    { orderId },
    { paymentStatus, ...(paymentMethod && { paymentMethod }) },
    { new: true }
  );
  if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
  scheduleAnalyticsUpdate(order);
  return order;
}

async function fuseOrders(orderIds, table, user) {
  const orders = await Order.find({ orderId: { $in: orderIds }, status: "pending_approval" });
  if (orders.length !== orderIds.length) {
    throw Object.assign(new Error("Certaines commandes sont introuvables ou ne sont pas en attente d'approbation"), { status: 400 });
  }

  const itemMap = new Map();
  let totalAmount = 0;
  const paymentMethods = new Set();
  const paymentStatuses = new Set();

  for (const order of orders) {
    for (const item of order.items) {
      if (itemMap.has(item.id)) itemMap.get(item.id).quantity += item.quantity || 1;
      else itemMap.set(item.id, { id: item.id, name: item.name, price: item.price, quantity: item.quantity || 1, category: item.category });
    }
    totalAmount += order.total || 0;
    paymentMethods.add(order.paymentMethod);
    paymentStatuses.add(order.paymentStatus);
  }

  const fusedPaymentStatus = paymentStatuses.size === 1 && paymentStatuses.has("paid") ? "paid" : "pending";
  let fusedPaymentMethod = "cash";
  if (paymentMethods.has("card")) fusedPaymentMethod = "card";
  else if (paymentMethods.has("mobile")) fusedPaymentMethod = "mobile";

  const fusedOrder = await new Order({
    orderId: generateOrderId("ORD-FUSED"),
    table, mode: "group",
    items: [...itemMap.values()],
    total: totalAmount,
    paymentMethod: fusedPaymentMethod,
    paymentStatus: fusedPaymentStatus,
    status: "accepted",
    timestamp: new Date(),
    scan: { firstScannedBy: user?.role || "admin", firstScannedAt: new Date(), lastValidatedBy: user?.role || "admin", lastValidatedAt: new Date(), lastAction: "validated" },
    notes: `Fusion de ${orders.length} commande(s): ${orderIds.join(", ")}`,
  }).save();

  await Order.deleteMany({ orderId: { $in: orderIds } });
  scheduleAnalyticsUpdate(fusedOrder);
  return fusedOrder;
}

module.exports = { createOrder, validateOrder, rejectOrder, updateOrderStatus, updatePaymentStatus, fuseOrders, generateOrderId };
