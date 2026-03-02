const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    reservationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    table: {
      type: Number,
      required: true,
      index: true,
    },
    partySize: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
    },
    reservationDate: {
      type: Date,
      required: true,
      index: true,
    },
    reservationTime: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      default: 120, // minutes
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "seated",
        "completed",
        "cancelled",
        "no-show",
      ],
      default: "pending",
      index: true,
    },
    specialRequests: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    confirmedAt: Date,
    seatedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
reservationSchema.index({ reservationDate: 1, reservationTime: 1 });
reservationSchema.index({ status: 1, reservationDate: 1 });
reservationSchema.index({ customerPhone: 1 });
reservationSchema.index({ table: 1, reservationDate: 1 });

// Virtual for checking if reservation is today
reservationSchema.virtual("isToday").get(function () {
  const today = new Date();
  const reservationDate = new Date(this.reservationDate);
  return reservationDate.toDateString() === today.toDateString();
});

// Virtual for checking if reservation is upcoming
reservationSchema.virtual("isUpcoming").get(function () {
  const now = new Date();
  const reservationDateTime = new Date(
    `${this.reservationDate}T${this.reservationTime}`
  );
  return reservationDateTime > now;
});

module.exports = mongoose.model("Reservation", reservationSchema);
