"use strict";
const authService = require("../services/auth.service");

exports.login = async (req, res) => {
  try {
    const username = req.body.username || req.body.email || "";
    res.json(await authService.login(username, req.body.password));
  } catch (e) { res.status(e.status || 500).json({ message: e.message, code: e.code }); }
};

exports.refresh = (req, res) => {
  try {
    if (!req.body.refreshToken) return res.status(400).json({ message: "refreshToken requis" });
    res.json(authService.refresh(req.body.refreshToken));
  } catch (e) { res.status(e.status || 403).json({ message: e.message, code: e.code }); }
};

exports.verify  = (req, res) => res.json({ valid: true, user: { username: req.user.username, role: req.user.role } });
exports.logout  = (_req, res) => res.json({ message: "Déconnexion réussie" });
