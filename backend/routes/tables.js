"use strict";
const router = require("express").Router();
const Table = require("../models/Table");
const { authenticateToken: authenticate } = require("../middleware/auth");

// ── GET /api/tables — Liste toutes les tables (public : le menu client
//    n'a pas besoin d'auth pour savoir qu'une table existe) ────────────────
router.get("/", async (req, res) => {
  try {
    const tables = await Table.find().sort({ number: 1 });
    res.json({ tables });
  } catch (err) {
    res.status(500).json({ message: "Erreur chargement tables", error: err.message });
  }
});

// ── POST /api/tables/seed — Seed initial (admin uniquement).
//    N'écrase jamais une collection déjà peuplée. ──────────────────────────
router.post("/seed", authenticate, async (req, res) => {
  try {
    const existing = await Table.countDocuments();
    if (existing > 0) {
      const tables = await Table.find().sort({ number: 1 });
      return res.json({ tables, seeded: false });
    }

    const incoming = Array.isArray(req.body?.tables) ? req.body.tables : [];
    if (incoming.length === 0) {
      return res.status(400).json({ message: "Aucune table à insérer" });
    }

    const docs = incoming.map((t) => ({
      tableId: t.tableId || `table-${t.number}`,
      number: t.number,
      chairs: t.chairs || 4,
      location: t.location || "Salle principale",
      status: t.status || "available",
      currentOrder: t.currentOrder || null,
    }));

    const tables = await Table.insertMany(docs, { ordered: true });
    res.status(201).json({ tables, seeded: true });
  } catch (err) {
    res.status(500).json({ message: "Erreur seed tables", error: err.message });
  }
});

// ── PATCH /api/tables/:number/status — Met à jour statut + commande liée
//    (admin uniquement) ─────────────────────────────────────────────────────
router.patch("/:number/status", authenticate, async (req, res) => {
  try {
    const number = parseInt(req.params.number);
    const { status, currentOrder } = req.body;

    const allowed = ["available", "occupied", "reserved", "cleaning"];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    const update = {};
    if (status) update.status = status;
    if (currentOrder !== undefined) update.currentOrder = currentOrder;

    const table = await Table.findOneAndUpdate({ number }, update, {
      new: true,
    });
    if (!table) return res.status(404).json({ message: "Table introuvable" });

    res.json({ table });
  } catch (err) {
    res.status(500).json({ message: "Erreur mise à jour table", error: err.message });
  }
});

module.exports = router;
