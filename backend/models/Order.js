const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    table: {
      type: Number,
      required: true,
      index: true,
    },
    mode: {
      type: String,
      enum: ["group", "individual"],
      default: "group",
    },
    items: [
      {
        id: String,
        name: String,
        price: Number,
        quantity: Number,
        category: String,
      },
    ],
    total: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "mobile"],
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
        "pending",
        "pending_scan",
        "pending_approval",
        "accepted",
        "preparing",
        "ready",
        "served",
        "cancelled",
      ],
      default: "pending",
    },
    qrData: {
      orderId: String,
      table: Number,
      total: Number,
      paymentMethod: String,
      paymentStatus: String,
      timestamp: Date,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    servedAt: Date,
    cancelledAt: Date,
    notes: String,
    // Scan/validation lifecycle
    scan: {
      type: {
        firstScannedBy: {
          type: String,
          enum: ["server", "admin", null],
          required: false,
          default: null,
        },
        firstScannedAt: {
          type: Date,
          required: false,
          default: null,
        },
        lastValidatedBy: {
          type: String,
          enum: ["server", "admin", null],
          required: false,
          default: null,
        },
        lastValidatedAt: {
          type: Date,
          required: false,
          default: null,
        },
        lastAction: {
          type: String,
          enum: ["validated", "rejected", "deleted", null],
          required: false,
          default: null,
        },
      },
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
orderSchema.index({ timestamp: -1 });
orderSchema.index({ table: 1, timestamp: -1 });
orderSchema.index({ status: 1, timestamp: -1 });
orderSchema.index({ paymentStatus: 1, timestamp: -1 });

// Virtual for revenue calculation
orderSchema.virtual("revenue").get(function () {
  return this.paymentStatus === "paid" ? this.total : 0;
});

module.exports = mongoose.model("Order", orderSchema);