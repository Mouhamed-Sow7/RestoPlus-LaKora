"use strict";
/**
 * email.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Gère tous les emails de réservation RestoPlus.
 *
 * Stratégie :
 *  1. Resend (recommandé en prod)  → RESEND_API_KEY dans les vars d'env
 *  2. Nodemailer + Gmail           → GMAIL_USER + GMAIL_APP_PASSWORD
 *  3. Nodemailer + SMTP custom     → SMTP_HOST, SMTP_PORT, etc.
 *
 * Ajouter dans .env :
 *   EMAIL_PROVIDER=resend      (ou "gmail" ou "smtp")
 *   RESEND_API_KEY=re_xxxxx
 *   GMAIL_USER=moncompte@gmail.com
 *   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
 *   RESTAURANT_EMAIL_FROM=RestoPlus <noreply@mondomaine.sn>
 *   RESTAURANT_EMAIL_TO=contact@monrestaurant.sn
 */

const nodemailer = require("nodemailer");
const cfg = require("../config/restaurant.config");

// ── Créer le transporteur selon le provider ──────────────────────────────────
function createTransporter() {
  const provider = (process.env.EMAIL_PROVIDER || "gmail").toLowerCase();

  if (provider === "resend") {
    // Resend via SMTP (fonctionne avec nodemailer, gratuit jusqu'à 3000/mois)
    return nodemailer.createTransporter({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: {
        user: "resend",
        pass: process.env.RESEND_API_KEY,
      },
    });
  }

  if (provider === "gmail") {
    return nodemailer.createTransporter({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,  // App Password Google (pas le mdp normal)
      },
    });
  }

  // SMTP custom (OVH, Mailjet, etc.)
  return nodemailer.createTransporter({
    host:   process.env.SMTP_HOST || "smtp.gmail.com",
    port:   parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const transporter = createTransporter();
const FROM        = process.env.RESTAURANT_EMAIL_FROM || `${cfg.name} <noreply@restoplus.app>`;
const RESTO_EMAIL = process.env.RESTAURANT_EMAIL_TO   || process.env.GMAIL_USER;

// ── Helper HTML commun ────────────────────────────────────────────────────────
function baseTemplate(content, title) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
  body { margin:0; padding:0; background:#f5f0e8; font-family:'Segoe UI',Arial,sans-serif; }
  .wrap { max-width:560px; margin:32px auto; background:#fff; border-radius:18px; overflow:hidden;
          box-shadow:0 4px 24px rgba(0,0,0,0.07); }
  .header { background:linear-gradient(135deg,#c0873f,#8b5e2a); padding:32px 32px 24px;
             text-align:center; }
  .header h1 { margin:0; color:#fff; font-size:1.35rem; font-weight:700; }
  .header p  { margin:6px 0 0; color:rgba(255,255,255,0.8); font-size:0.85rem; }
  .logo-badge { display:inline-block; background:rgba(255,255,255,0.2);
                border-radius:12px; padding:8px 16px; margin-bottom:12px;
                font-size:1.5rem; }
  .body   { padding:32px; }
  .info-card { background:#fdf8f3; border-radius:12px; padding:20px 24px;
               border-left:4px solid #c0873f; margin:20px 0; }
  .info-row  { display:flex; justify-content:space-between; align-items:center;
               padding:6px 0; border-bottom:1px solid #ede5d8; }
  .info-row:last-child { border-bottom:none; padding-bottom:0; }
  .info-label { font-size:0.8rem; color:#6b5740; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; }
  .info-value { font-size:0.95rem; color:#1a1208; font-weight:600; }
  .badge { display:inline-block; padding:4px 12px; border-radius:20px;
           font-size:0.78rem; font-weight:700; }
  .badge-pending   { background:#fff3cd; color:#856404; }
  .badge-confirmed { background:#d1e7dd; color:#0f5132; }
  .badge-cancelled { background:#f8d7da; color:#842029; }
  .btn { display:inline-block; padding:14px 28px; border-radius:10px;
         text-decoration:none; font-weight:700; font-size:0.95rem; margin:4px; }
  .btn-confirm { background:#c0873f; color:#fff; }
  .btn-cancel  { background:#e74c3c; color:#fff; }
  .btn-view    { background:#2980b9; color:#fff; }
  .action-row  { text-align:center; margin:24px 0 8px; }
  .footer { background:#fdf8f3; padding:20px 32px; text-align:center;
            font-size:0.75rem; color:#6b5740; border-top:1px solid #ede5d8; }
  .res-id { font-family:monospace; background:#f0e8da; padding:3px 8px;
            border-radius:6px; font-size:0.85rem; color:#8b5e2a; font-weight:700; }
</style></head>
<body><div class="wrap">${content}</div></body></html>`;
}

// ── Email 1 : notification restaurant (nouvelle réservation) ─────────────────
async function sendReservationToRestaurant(reservation) {
  const dateStr = new Date(reservation.date + "T" + reservation.time)
    .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const adminUrl = process.env.APP_URL
    ? `${process.env.APP_URL}/admin.html#reservations`
    : "#";

  const html = baseTemplate(`
    <div class="header">
      <div class="logo-badge">🔔</div>
      <h1>Nouvelle réservation reçue</h1>
      <p>${cfg.name}</p>
    </div>
    <div class="body">
      <p style="color:#6b5740;margin-bottom:4px;">Réf.</p>
      <span class="res-id">${reservation.reservationId}</span>

      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Client</span>
          <span class="info-value">${reservation.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Téléphone</span>
          <span class="info-value">${reservation.phone}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email</span>
          <span class="info-value">${reservation.email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date</span>
          <span class="info-value">${dateStr}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Heure</span>
          <span class="info-value">${reservation.time}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Personnes</span>
          <span class="info-value">${reservation.guests} personne${reservation.guests > 1 ? "s" : ""}</span>
        </div>
        ${reservation.note ? `
        <div class="info-row">
          <span class="info-label">Note</span>
          <span class="info-value" style="max-width:60%;text-align:right;">${reservation.note}</span>
        </div>` : ""}
      </div>

      <div class="action-row">
        <a href="${adminUrl}" class="btn btn-view">Gérer dans le panel →</a>
      </div>
    </div>
    <div class="footer">
      ${cfg.name} · Système de réservation RestoPlus<br/>
      Répondez à ce mail pour contacter le client directement.
    </div>
  `, "Nouvelle réservation");

  await transporter.sendMail({
    from:    FROM,
    to:      RESTO_EMAIL,
    replyTo: reservation.email,
    subject: `🍽️ Nouvelle réservation — ${reservation.name} · ${reservation.date} ${reservation.time}`,
    html,
  });
}

// ── Email 2a : confirmation au client ────────────────────────────────────────
async function sendConfirmationToClient(reservation) {
  const dateStr = new Date(reservation.date + "T12:00")
    .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const html = baseTemplate(`
    <div class="header">
      <div class="logo-badge">✅</div>
      <h1>Réservation confirmée !</h1>
      <p>${cfg.name}</p>
    </div>
    <div class="body">
      <p style="color:#1a1208;font-size:1rem;margin-bottom:20px;">
        Bonjour <strong>${reservation.name}</strong>,<br/>
        Votre réservation a été <strong>confirmée</strong>. Nous vous attendons avec plaisir !
      </p>

      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Référence</span>
          <span class="res-id">${reservation.reservationId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date</span>
          <span class="info-value">${dateStr}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Heure</span>
          <span class="info-value">${reservation.time}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Personnes</span>
          <span class="info-value">${reservation.guests} personne${reservation.guests > 1 ? "s" : ""}</span>
        </div>
        ${reservation.assignedTable ? `
        <div class="info-row">
          <span class="info-label">Table assignée</span>
          <span class="info-value">Table ${reservation.assignedTable}</span>
        </div>` : ""}
      </div>

      <p style="color:#6b5740;font-size:0.88rem;line-height:1.6;margin-top:8px;">
        📍 ${cfg.address || cfg.name}<br/>
        📞 ${cfg.phone || "Contactez-nous pour toute question"}
      </p>

      <p style="color:#6b5740;font-size:0.82rem;margin-top:16px;padding-top:16px;border-top:1px solid #ede5d8;">
        Pour annuler ou modifier votre réservation, répondez à cet email.
      </p>
    </div>
    <div class="footer">
      ${cfg.name} · Propulsé par RestoPlus
    </div>
  `, "Réservation confirmée");

  await transporter.sendMail({
    from:    FROM,
    to:      reservation.email,
    replyTo: RESTO_EMAIL,
    subject: `✅ Réservation confirmée — ${cfg.name} · ${reservation.date} à ${reservation.time}`,
    html,
  });
}

// ── Email 2b : annulation au client ──────────────────────────────────────────
async function sendCancellationToClient(reservation, reason = "") {
  const html = baseTemplate(`
    <div class="header" style="background:linear-gradient(135deg,#c0392b,#922b21);">
      <div class="logo-badge">❌</div>
      <h1>Réservation annulée</h1>
      <p>${cfg.name}</p>
    </div>
    <div class="body">
      <p style="color:#1a1208;font-size:1rem;margin-bottom:20px;">
        Bonjour <strong>${reservation.name}</strong>,<br/>
        Nous sommes désolés, votre réservation du <strong>${reservation.date}</strong>
        à <strong>${reservation.time}</strong> a été annulée.
      </p>
      ${reason ? `
      <div style="background:#fef2f2;border-radius:10px;padding:16px;border-left:3px solid #e74c3c;margin-bottom:16px;">
        <strong style="color:#842029;font-size:0.82rem;">Motif :</strong>
        <p style="margin:4px 0 0;color:#6b5740;">${reason}</p>
      </div>` : ""}
      <p style="color:#6b5740;font-size:0.88rem;">
        Pour toute question ou pour effectuer une nouvelle réservation,<br/>
        contactez-nous : <strong>${cfg.phone || cfg.email || RESTO_EMAIL}</strong>
      </p>
    </div>
    <div class="footer">${cfg.name} · RestoPlus</div>
  `, "Réservation annulée");

  await transporter.sendMail({
    from:    FROM,
    to:      reservation.email,
    replyTo: RESTO_EMAIL,
    subject: `❌ Réservation annulée — ${cfg.name}`,
    html,
  });
}

// ── Vérification connexion ────────────────────────────────────────────────────
async function verifyConnection() {
  try {
    await transporter.verify();
    console.log("[Email] ✅ Transporteur email opérationnel");
    return true;
  } catch (e) {
    console.warn("[Email] ⚠️  Email indisponible:", e.message);
    return false;
  }
}

module.exports = {
  sendReservationToRestaurant,
  sendConfirmationToClient,
  sendCancellationToClient,
  verifyConnection,
};
