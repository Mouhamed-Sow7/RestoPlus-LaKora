const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    table:   { type: Number, required: true, index: true },
    mode:    { type: String, enum: ["group", "individual"], default: "group" },
    items: [{
      id: String, name: String, price: Number, quantity: Number, category: String,
    }],
    total:         { type: Number, required: true },
    paymentMethod: {
      type: String,
      // ✅ ajout wave + orange_money
      enum: ["cash", "card", "mobile", "wave", "orange_money"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    status: {
      type: String,
      enum: [
        "pending", "pending_scan", "pending_approval",
        "accepted", "preparing", "ready", "served",
        "cancelled", "merged",
      ],
      default: "pending",
    },
    qrData: {
      orderId: String, table: Number, total: Number,
      paymentMethod: String, paymentStatus: String, timestamp: Date,
    },
    timestamp:   { type: Date, default: Date.now, index: true },
    servedAt:    Date,
    cancelledAt: Date,
    mergedAt:    Date,
    mergedInto:  String,
    notes:       String,
    scan: {
      type: {
        firstScannedBy:  { type: String, enum: ["server", "admin", null], default: null },
        firstScannedAt:  { type: Date, default: null },
        lastValidatedBy: { type: String, enum: ["server", "admin", null], default: null },
        lastValidatedAt: { type: Date, default: null },
        lastAction: {
          type: String,
          // ✅ ajout "fused"
          enum: ["validated", "rejected", "deleted", "fused", null],
          default: null,
        },
      },
      default: {},
    },
  },
  { timestamps: true }
);

orderSchema.index({ timestamp: -1 });
orderSchema.index({ table: 1, timestamp: -1 });
orderSchema.index({ status: 1, timestamp: -1 });
orderSchema.index({ paymentStatus: 1, timestamp: -1 });

orderSchema.virtual("revenue").get(function () {
  return this.paymentStatus === "paid" ? this.total : 0;
});

module.exports = mongoose.model("Order", orderSchema);