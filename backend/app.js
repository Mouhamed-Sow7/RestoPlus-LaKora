"use strict";
const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");
const path      = require("path");
const config    = require("./config");

const app = express();
app.set("trust proxy", 1); // Render est derrière un reverse proxy

// For local development relax CSP to avoid blocking external fonts/images.
// In production, re-enable a strict CSP.
// ─── Sécurité ─────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:   ["'self'"],
      scriptSrc:    ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      scriptSrcAttr:["'unsafe-inline'"],
      styleSrc:     ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:      ["'self'", "https://fonts.gstatic.com"],
      imgSrc:       ["'self'", "data:", "blob:"],
      connectSrc:   ["'self'"],
      mediaSrc:     ["'self'", "blob:"],
    },
  },
}));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || config.cors.origins.includes(origin)) return cb(null, true);
    cb(new Error(`Origin non autorisée: ${origin}`));
  },
  credentials: true,
}));

app.use("/api/auth/login",
  rateLimit({ windowMs: config.rateLimit.auth.windowMs, max: config.rateLimit.auth.max,
    message: { error: "Trop de tentatives. Réessayez dans 15 minutes." },
    standardHeaders: true, legacyHeaders: false })
);

app.use("/api",
  rateLimit({ windowMs: config.rateLimit.api.windowMs, max: config.rateLimit.api.max,
    message: { error: "Trop de requêtes. Réessayez dans une minute." },
    standardHeaders: true, legacyHeaders: false })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.static(path.join(__dirname, "../public"), { maxAge: config.env === "production" ? "1d" : 0 }));

app.use("/api/auth",         require("./routes/auth"));
app.use("/api/orders",       require("./routes/orders"));
app.use("/api/reservations", require("./routes/reservations"));
app.use("/api/analytics",    require("./routes/analytics"));

app.get("/api", (_req, res) => res.json({ message: "API Restoplus v2 🚀", status: "ok" }));

app.use((_req, res) => res.status(404).json({ message: "Route introuvable" }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status  = err.status || 500;
  const message = config.env === "production" && status === 500 ? "Erreur interne du serveur" : err.message;
  console.error(`[${new Date().toISOString()}] ${status} — ${err.message}`);
  res.status(status).json({ error: message });
});

module.exports = app;
