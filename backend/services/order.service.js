"use strict";
const { randomInt, createHash } = require("crypto");
const Order = require("../models/Order");
const { scheduleAnalyticsUpdate } = require("./analytics.service");

function generateOrderId(prefix = "ORD") {
  return `${prefix}-${Date.now()}-${randomInt(0, 999999).toString().padStart(6, "0")}`;
}

async function createOrder(data) {
  const orderId = data.orderId || generateOrderId();
  const orderHash = createHash("sha256")
    .update(`${orderId}:${Date.now()}`)
    .digest("base64")
    .slice(0, 16)
    .replace(/[+/=]/g, "");

  const order = await new Order({
    ...data,
    orderId,
    orderHash,
    status: "pending_approval",
  }).save();
  scheduleAnalyticsUpdate(order);
  return order;
}

async function validateOrder(orderId, role) {
  const order = await Order.findOneAndUpdate(
    { orderId },
    {
      status: "accepted",
      scan: {
        firstScannedBy: role,
        firstScannedAt: new Date(),
        lastValidatedBy: role,
        lastValidatedAt: new Date(),
        lastAction: "validated",
      },
    },
    { new: true },
  );
  if (!order)
    throw Object.assign(new Error("Order not found"), { status: 404 });
  return order;
}

async function rejectOrder(orderId, role) {
  const order = await Order.findOneAndUpdate(
    { orderId },
    {
      status: "cancelled",
      cancelledAt: new Date(),
      scan: {
        lastValidatedBy: role,
        lastValidatedAt: new Date(),
        lastAction: "rejected",
      },
    },
    { new: true },
  );
  if (!order)
    throw Object.assign(new Error("Order not found"), { status: 404 });
  return order;
}

async function updateOrderStatus(orderId, status) {
  const order = await Order.findOne({ orderId });
  if (!order)
    throw Object.assign(new Error("Order not found"), { status: 404 });

  const update = {
    status,
    ...(status === "served" && {
      servedAt: new Date(),
      // Ne force paid que si pas déjà paid et pas failed
      ...(order.paymentStatus !== "paid" && order.paymentStatus !== "failed"
        ? { paymentStatus: "paid" }
        : {}),
    }),
    ...(status === "cancelled" && { cancelledAt: new Date() }),
  };

  const updatedOrder = await Order.findOneAndUpdate({ orderId }, update, {
    new: true,
  });
  if (!updatedOrder)
    throw Object.assign(new Error("Order not found"), { status: 404 });
  scheduleAnalyticsUpdate(updatedOrder);
  return updatedOrder;
}

async function updatePaymentStatus(orderId, { paymentStatus, paymentMethod }) {
  const order = await Order.findOneAndUpdate(
    { orderId },
    { paymentStatus, ...(paymentMethod && { paymentMethod }) },
    { new: true },
  );
  if (!order)
    throw Object.assign(new Error("Order not found"), { status: 404 });
  scheduleAnalyticsUpdate(order);
  return order;
}

async function fuseOrders(orderIds, table, user) {
  // Validation des entrées
  if (!Array.isArray(orderIds) || orderIds.length < 2) {
    throw Object.assign(new Error("La fusion nécessite au moins 2 commandes"), {
      status: 400,
    });
  }
  const uniqueIds = [
    ...new Set(orderIds.filter((id) => typeof id === "string" && id.trim())),
  ];
  if (uniqueIds.length !== orderIds.length) {
    throw Object.assign(new Error("IDs de commandes invalides ou en double"), {
      status: 400,
    });
  }
  orderIds = uniqueIds; // utilise la version dédupliquée
  const FUSIBLE_STATUSES = ["pending_approval", "accepted"];

  const orders = await Order.find({
    orderId: { $in: orderIds },
    status: { $in: FUSIBLE_STATUSES },
  });

  if (orders.length !== orderIds.length) {
    throw Object.assign(
      new Error(
        "Certaines commandes sont introuvables ou ne peuvent pas être fusionnées",
      ),
      { status: 400 },
    );
  }

  // Fusion des items — cumule les quantités si même id
  const itemMap = new Map();
  let totalAmount = 0;
  const paymentMethods = new Set();
  const paymentStatuses = new Set();

  for (const order of orders) {
    for (const item of order.items) {
      if (itemMap.has(item.id)) {
        itemMap.get(item.id).quantity += item.quantity || 1;
      } else {
        itemMap.set(item.id, {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          category: item.category,
        });
      }
    }
    totalAmount += order.total || 0;
    paymentMethods.add(order.paymentMethod);
    paymentStatuses.add(order.paymentStatus);
  }

  // Statut paiement fusionné : paid seulement si toutes sont paid
  const fusedPaymentStatus =
    paymentStatuses.size === 1 && paymentStatuses.has("paid")
      ? "paid"
      : "pending";

  // Méthode paiement : priorité card > mobile > cash
  let fusedPaymentMethod = "cash";
  if (paymentMethods.has("card")) fusedPaymentMethod = "card";
  else if (paymentMethods.has("mobile")) fusedPaymentMethod = "mobile";

  // Crée la commande fusionnée
  const fusedOrder = await new Order({
    orderId: generateOrderId("ORD-FUSED"),
    table,
    mode: "group",
    items: [...itemMap.values()],
    total: totalAmount,
    paymentMethod: fusedPaymentMethod,
    paymentStatus: fusedPaymentStatus,
    status: "accepted",
    timestamp: new Date(),
    scan: {
      firstScannedBy: user?.role || "admin",
      firstScannedAt: new Date(),
      lastValidatedBy: user?.role || "admin",
      lastValidatedAt: new Date(),
      lastAction: "fused",
    },
    notes: `Fusion de ${orders.length} commande(s): ${orderIds.join(", ")}`,
  }).save();

  // ✅ Marque les commandes originales "merged" au lieu de les supprimer
  // Traçabilité conservée — on peut retrouver l'historique
  await Order.updateMany(
    { orderId: { $in: orderIds } },
    {
      status: "merged",
      mergedInto: fusedOrder.orderId,
      mergedAt: new Date(),
    },
  );

  scheduleAnalyticsUpdate(fusedOrder);
  return fusedOrder;
}

module.exports = {
  createOrder,
  validateOrder,
  rejectOrder,
  updateOrderStatus,
  updatePaymentStatus,
  fuseOrders,
  generateOrderId,
};
