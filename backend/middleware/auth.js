"use strict";
const jwt    = require("jsonwebtoken");
const config = require("../config");

const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token d'accès requis", code: "NO_TOKEN" });
  try {
    req.user = jwt.verify(token, config.jwt.secret);
    next();
  } catch (err) {
    const code = err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN";
    return res.status(403).json({ message: "Token invalide ou expiré", code });
  }
};

const optionalAuth = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) { req.user = null; return next(); }
  try { req.user = jwt.verify(token, config.jwt.secret); } catch { req.user = null; }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Authentification requise", code: "AUTH_REQUIRED" });
  if (req.user.role !== "admin") return res.status(403).json({ message: "Accès administrateur requis", code: "ADMIN_REQUIRED" });
  next();
};

const requireAdminOrServer = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Authentification requise", code: "AUTH_REQUIRED" });
  if (!["admin", "server"].includes(req.user.role)) return res.status(403).json({ message: "Accès restreint", code: "FORBIDDEN" });
  next();
};

module.exports = { authenticateToken, optionalAuth, requireAdmin, requireAdminOrServer };
