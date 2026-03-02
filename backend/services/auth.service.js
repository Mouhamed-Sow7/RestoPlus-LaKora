"use strict";
const jwt    = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../config");

const _users = (() => {
  const admin      = process.env.ADMIN_DEFAULT_USER;
  const adminPass  = process.env.ADMIN_DEFAULT_PASS;
  const server     = process.env.SERVER_DEFAULT_USER || "server";
  const serverPass = process.env.SERVER_DEFAULT_PASS || "server123";
  if (!admin || !adminPass) throw new Error("ADMIN_DEFAULT_USER and ADMIN_DEFAULT_PASS are required");
  return [
    { username: admin,  passwordHash: bcrypt.hashSync(adminPass,  10), role: "admin"  },
    { username: server, passwordHash: bcrypt.hashSync(serverPass, 10), role: "server" },
  ];
})();

const signAccess  = p => jwt.sign(p, config.jwt.secret,            { expiresIn: config.jwt.accessExpiry  });
const signRefresh = p => jwt.sign(p, config.jwt.secret + "_refresh", { expiresIn: config.jwt.refreshExpiry });

async function login(username, password) {
  const user = _users.find(u => u.username === username) || null;
  const dummy = "$2a$10$dummy.hash.to.prevent.timing.attacks.padding123";
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : await bcrypt.compare(password, dummy).then(() => false);
  if (!valid || !user) throw Object.assign(new Error("Identifiants invalides"), { status: 401, code: "INVALID_CREDENTIALS" });
  const payload = { sub: user.username, username: user.username, role: user.role };
  return { accessToken: signAccess(payload), refreshToken: signRefresh(payload), user: { username: user.username, role: user.role } };
}

function refresh(refreshToken) {
  try {
    const d = jwt.verify(refreshToken, config.jwt.secret + "_refresh");
    return { accessToken: signAccess({ sub: d.username, username: d.username, role: d.role }) };
  } catch {
    throw Object.assign(new Error("Refresh token invalide"), { status: 403, code: "INVALID_REFRESH_TOKEN" });
  }
}

module.exports = { login, refresh };
