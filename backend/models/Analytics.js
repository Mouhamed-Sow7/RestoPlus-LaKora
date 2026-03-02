const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    period: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
      index: true,
    },
    orders: {
      total: {
        type: Number,
        default: 0,
      },
      completed: {
        type: Number,
        default: 0,
      },
      cancelled: {
        type: Number,
        default: 0,
      },
      byPaymentMethod: {
        cash: { type: Number, default: 0 },
        card: { type: Number, default: 0 },
        mobile: { type: Number, default: 0 },
      },
      byStatus: {
        pending: { type: Number, default: 0 },
        accepted: { type: Number, default: 0 },
        preparing: { type: Number, default: 0 },
        ready: { type: Number, default: 0 },
        served: { type: Number, default: 0 },
        cancelled: { type: Number, default: 0 },
      },
    },
    revenue: {
      total: {
        type: Number,
        default: 0,
      },
      paid: {
        type: Number,
        default: 0,
      },
      pending: {
        type: Number,
        default: 0,
      },
      byPaymentMethod: {
        cash: { type: Number, default: 0 },
        card: { type: Number, default: 0 },
        mobile: { type: Number, default: 0 },
      },
      averageOrderValue: {
        type: Number,
        default: 0,
      },
    },
    reservations: {
      total: {
        type: Number,
        default: 0,
      },
      confirmed: {
        type: Number,
        default: 0,
      },
      seated: {
        type: Number,
        default: 0,
      },
      completed: {
        type: Number,
        default: 0,
      },
      cancelled: {
        type: Number,
        default: 0,
      },
      noShow: {
        type: Number,
        default: 0,
      },
    },
    tables: {
      totalTables: {
        type: Number,
        default: 10,
      },
      occupiedTables: {
        type: Number,
        default: 0,
      },
      averageOccupancy: {
        type: Number,
        default: 0,
      },
    },
    popularItems: [
      {
        itemId: String,
        itemName: String,
        category: String,
        quantity: Number,
        revenue: Number,
      },
    ],
    peakHours: [
      {
        hour: Number,
        orders: Number,
        revenue: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
analyticsSchema.index({ date: -1, period: 1 });
analyticsSchema.index({ period: 1, date: -1 });

module.exports = mongoose.model("Analytics", analyticsSchema);
