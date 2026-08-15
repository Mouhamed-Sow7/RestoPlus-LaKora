"use strict";
const mongoose = require("mongoose");

// Reflète exactement la structure produite par TableManager._buildTable()
// côté front (public/js/table-manager.js) — aucune transformation
// nécessaire entre le document Mongo et l'objet consommé par l'UI.
const tableSchema = new mongoose.Schema(
  {
    tableId: { type: String, required: true, unique: true },
    number: { type: Number, required: true, unique: true, index: true },
    chairs: { type: Number, required: true, default: 4 },
    location: { type: String, default: "Salle principale" },
    status: {
      type: String,
      enum: ["available", "occupied", "reserved", "cleaning"],
      default: "available",
    },
    currentOrder: { type: String, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Table", tableSchema);
