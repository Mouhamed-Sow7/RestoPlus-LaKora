"use strict";
const mongoose = require("mongoose");

// ─── Génération ID réservation ─────────────────────────────────────────────
function generateReservationId() {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RES-${ts}-${rnd}`;
}

const reservationSchema = new mongoose.Schema(
  {
    // Identifiant lisible
    reservationId: {
      type: String,
      unique: true,
      default: generateReservationId,
    },

    // Identité client
    name:  { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },

    // Détails réservation
    date:   { type: String, required: true },  // format YYYY-MM-DD
    time:   { type: String, required: true },  // format HH:MM
    guests: { type: Number, required: true, min: 1, max: 50 },
    note:   { type: String, default: "" },

    // Statut géré par l'admin
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "no_show"],
      default: "pending",
    },

    // Table assignée (optionnel — assignable par l'admin)
    assignedTable: { type: Number, default: null },

    // Notes internes admin (jamais visibles par le client)
    adminNote: { type: String, default: "" },

    // Traçabilité emails
    emails: {
      notifiedRestaurant: { type: Boolean, default: false },  // email au restaurant à la création
      notifiedClient:     { type: Boolean, default: false },  // email au client après décision
      lastEmailAt:        { type: Date, default: null },
    },

    // Multi-restaurant
    restaurantId: { type: String, default: "demo", index: true },
  },
  {
    timestamps: true,  // createdAt, updatedAt auto
  }
);

// Index pour les requêtes fréquentes
reservationSchema.index({ date: 1, status: 1 });
reservationSchema.index({ email: 1 });
reservationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Reservation", reservationSchema);
