"use strict";
const Analytics = require("../models/Analytics");

async function updateDailyAnalytics(order) {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    await Analytics.findOneAndUpdate(
      { date: startOfDay, period: "daily" },
      {
        $inc: {
          "orders.total": 1,
          [`orders.byStatus.${order.status}`]: 1,
          [`orders.byPaymentMethod.${order.paymentMethod}`]: 1,
          "revenue.total": order.total,
          ...(order.paymentStatus === "paid"
            ? { "revenue.paid": order.total, [`revenue.byPaymentMethod.${order.paymentMethod}`]: order.total }
            : { "revenue.pending": order.total }),
        },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error("[Analytics] updateDailyAnalytics error:", err.message);
  }
}

function scheduleAnalyticsUpdate(order) {
  setImmediate(() => updateDailyAnalytics(order));
}

module.exports = { updateDailyAnalytics, scheduleAnalyticsUpdate };
