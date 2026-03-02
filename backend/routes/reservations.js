const express = require("express");
const router = express.Router();
const Reservation = require("../models/Reservation");

// Get all reservations with filtering
router.get("/", async (req, res) => {
  try {
    const { status, date, table, customerPhone, startDate, endDate } =
      req.query;

    const filter = {};

    if (status) filter.status = status;
    if (table) filter.table = parseInt(table);
    if (customerPhone) filter.customerPhone = customerPhone;
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      filter.reservationDate = { $gte: startOfDay, $lte: endOfDay };
    }
    if (startDate || endDate) {
      filter.reservationDate = {};
      if (startDate) filter.reservationDate.$gte = new Date(startDate);
      if (endDate) filter.reservationDate.$lte = new Date(endDate);
    }

    const reservations = await Reservation.find(filter)
      .sort({ reservationDate: 1, reservationTime: 1 })
      .exec();

    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get reservation by ID
router.get("/:reservationId", async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      reservationId: req.params.reservationId,
    });
    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }
    res.json(reservation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new reservation
router.post("/", async (req, res) => {
  try {
    // Check for table conflicts
    const existingReservation = await Reservation.findOne({
      table: req.body.table,
      reservationDate: req.body.reservationDate,
      reservationTime: req.body.reservationTime,
      status: { $in: ["pending", "confirmed", "seated"] },
    });

    if (existingReservation) {
      return res.status(409).json({
        error: "Table is already reserved for this time slot",
      });
    }

    const reservation = new Reservation(req.body);
    await reservation.save();
    res.status(201).json(reservation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update reservation status
router.patch("/:reservationId/status", async (req, res) => {
  try {
    const { status, notes } = req.body;
    const updateData = { status };

    if (notes) updateData.notes = notes;

    // Add timestamp based on status
    switch (status) {
      case "confirmed":
        updateData.confirmedAt = new Date();
        break;
      case "seated":
        updateData.seatedAt = new Date();
        break;
      case "completed":
        updateData.completedAt = new Date();
        break;
      case "cancelled":
        updateData.cancelledAt = new Date();
        break;
    }

    const reservation = await Reservation.findOneAndUpdate(
      { reservationId: req.params.reservationId },
      updateData,
      { new: true }
    );

    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    res.json(reservation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get today's reservations
router.get("/today/list", async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const reservations = await Reservation.find({
      reservationDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ["pending", "confirmed", "seated"] },
    })
      .sort({ reservationTime: 1 })
      .exec();

    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get reservation statistics
router.get("/stats/overview", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let matchStage = {};
    if (startDate || endDate) {
      matchStage.reservationDate = {};
      if (startDate) matchStage.reservationDate.$gte = new Date(startDate);
      if (endDate) matchStage.reservationDate.$lte = new Date(endDate);
    }

    const stats = await Reservation.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          confirmed: {
            $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
          },
          seated: {
            $sum: { $cond: [{ $eq: ["$status", "seated"] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
          noShow: {
            $sum: { $cond: [{ $eq: ["$status", "no-show"] }, 1, 0] },
          },
          averagePartySize: { $avg: "$partySize" },
        },
      },
    ]);

    res.json(
      stats[0] || {
        total: 0,
        confirmed: 0,
        seated: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        averagePartySize: 0,
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
