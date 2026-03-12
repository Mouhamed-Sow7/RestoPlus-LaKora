"use strict";
const router      = require("express").Router();
const Reservation = require("../models/Reservation");
const emailSvc    = require("../services/email.service");
const { authenticate } = require("../middleware/auth");
const cfg = (() => { try { return require('../config/restaurant.config'); } catch(_) { try { return require('../config'); } catch(__) { return {}; } } })();

// ── POST /api/reservations — Créer une réservation (public) ──────────────────
router.post("/", async (req, res) => {
  try {
    const { name, phone, email, date, time, guests, note } = req.body;

    // Validation basique
    if (!name || !phone || !email || !date || !time || !guests) {
      return res.status(400).json({ message: "Champs obligatoires manquants" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Email invalide" });
    }
    if (new Date(date) < new Date(new Date().toDateString())) {
      return res.status(400).json({ message: "Date dans le passé" });
    }

    // Créer la réservation
    const reservation = await Reservation.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      date,
      time,
      guests: parseInt(guests),
      note: (note || "").trim(),
      restaurantId: cfg.id,
      status: "pending",
    });

    // Email au restaurant (non bloquant)
    emailSvc.sendReservationToRestaurant(reservation)
      .then(() => Reservation.findByIdAndUpdate(reservation._id, {
        "emails.notifiedRestaurant": true
      }))
      .catch(err => console.error("[Email] Erreur notification restaurant:", err.message));

    return res.status(201).json({
      reservationId: reservation.reservationId,
      status: "pending",
      message: "Réservation créée, en attente de confirmation",
    });
  } catch (err) {
    console.error("[Reservations] POST error:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

// ── GET /api/reservations — Lister (admin) ────────────────────────────────────
router.get("/", authenticate, async (req, res) => {
  try {
    const { status, date, page = 1, limit = 50 } = req.query;
    const filter = { restaurantId: cfg.id };
    if (status && status !== "all") filter.status = status;
    if (date) filter.date = date;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Reservation.countDocuments(filter);
    const reservations = await Reservation.find(filter)
      .sort({ date: 1, time: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    return res.json({ reservations, total, page: parseInt(page) });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

// ── GET /api/reservations/calendar — Vue calendrier ──────────────────────────
router.get("/calendar", authenticate, async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const y   = parseInt(year  || now.getFullYear());
    const m   = parseInt(month || now.getMonth() + 1);

    const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
    const endDate   = `${y}-${String(m).padStart(2, "0")}-31`;

    const reservations = await Reservation.find({
      restaurantId: cfg.id,
      date: { $gte: startDate, $lte: endDate },
      status: { $ne: "cancelled" },
    }).sort({ date: 1, time: 1 });

    // Grouper par date
    const byDate = {};
    reservations.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = [];
      byDate[r.date].push({
        reservationId: r.reservationId,
        time:          r.time,
        name:          r.name,
        guests:        r.guests,
        status:        r.status,
        assignedTable: r.assignedTable,
      });
    });

    return res.json({ year: y, month: m, days: byDate });
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

// ── GET /api/reservations/:id — Détail (admin) ────────────────────────────────
router.get("/:id", authenticate, async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      reservationId: req.params.id,
      restaurantId:  cfg.id,
    });
    if (!reservation) return res.status(404).json({ message: "Réservation introuvable" });
    return res.json(reservation);
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

// ── PATCH /api/reservations/:id/status — Confirmer/Annuler (admin) ────────────
router.patch("/:id/status", authenticate, async (req, res) => {
  try {
    const { status, adminNote, assignedTable, reason } = req.body;
    const allowed = ["pending", "confirmed", "cancelled", "completed", "no_show"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    const reservation = await Reservation.findOneAndUpdate(
      { reservationId: req.params.id, restaurantId: cfg.id },
      {
        status,
        ...(adminNote     !== undefined && { adminNote }),
        ...(assignedTable !== undefined && { assignedTable }),
      },
      { new: true }
    );
    if (!reservation) return res.status(404).json({ message: "Réservation introuvable" });

    // Envoyer email au client si confirmed ou cancelled
    if (status === "confirmed") {
      emailSvc.sendConfirmationToClient(reservation)
        .then(() => Reservation.findByIdAndUpdate(reservation._id, {
          "emails.notifiedClient": true,
          "emails.lastEmailAt": new Date(),
        }))
        .catch(err => console.error("[Email] Erreur confirmation client:", err.message));
    } else if (status === "cancelled") {
      emailSvc.sendCancellationToClient(reservation, reason || "")
        .then(() => Reservation.findByIdAndUpdate(reservation._id, {
          "emails.notifiedClient": true,
          "emails.lastEmailAt": new Date(),
        }))
        .catch(err => console.error("[Email] Erreur annulation client:", err.message));
    }

    return res.json(reservation);
  } catch (err) {
    console.error("[Reservations] PATCH status error:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

// ── PATCH /api/reservations/:id — Modifier (admin) ────────────────────────────
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const allowed = ["date","time","guests","note","adminNote","assignedTable"];
    const update  = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const reservation = await Reservation.findOneAndUpdate(
      { reservationId: req.params.id, restaurantId: cfg.id },
      update,
      { new: true }
    );
    if (!reservation) return res.status(404).json({ message: "Réservation introuvable" });
    return res.json(reservation);
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

// ── DELETE /api/reservations/:id — Supprimer (admin) ─────────────────────────
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const deleted = await Reservation.findOneAndDelete({
      reservationId: req.params.id,
      restaurantId:  cfg.id,
    });
    if (!deleted) return res.status(404).json({ message: "Réservation introuvable" });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;

