"use strict";
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const cfg = (() => {
  try { return require("../config/restaurant.config"); } catch (_) {}
  try { return require("../config"); } catch (_) {}
  return {};
})();

const restoName = cfg.name || process.env.RESTAURANT_NAME || "RestoPlus";
const FROM      = process.env.RESTAURANT_EMAIL_FROM || "sowhamedou10@gmail.com";
const RESTO_TO  = process.env.RESTAURANT_EMAIL_TO   || "sowhamedou10@gmail.com";

function brandColor() { return process.env.BRAND_COLOR || "#8b4513"; }

function tpl(body, title) {
  const c = brandColor();
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>${title}</title>
<style>body{margin:0;background:#f5f0e8;font-family:Arial,sans-serif}.wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)}.hdr{background:${c};padding:32px;text-align:center}.hdr h1{margin:0;color:#fff;font-size:1.3rem}.hdr p{margin:6px 0 0;color:rgba(255,255,255,.8);font-size:.85rem}.badge{display:inline-block;background:rgba(255,255,255,.2);border-radius:12px;padding:8px 16px;margin-bottom:12px;font-size:1.5rem}.bdy{padding:32px}.card{background:#fdf8f3;border-radius:12px;padding:20px 24px;border-left:4px solid ${c};margin:20px 0}.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #ede5d8}.row:last-child{border-bottom:none}.lbl{font-size:.78rem;color:#6b5740;font-weight:700;text-transform:uppercase}.val{font-size:.93rem;color:#1a1208;font-weight:600}.btn{display:inline-block;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;color:#fff;background:${c}}.ftr{background:#fdf8f3;padding:20px 32px;text-align:center;font-size:.75rem;color:#6b5740;border-top:1px solid #ede5d8}.rid{font-family:monospace;background:#f0e8da;padding:3px 8px;border-radius:6px;font-size:.85rem;color:${c};font-weight:700}</style>
</head><body><div class="wrap">${body}</div></body></html>`;
}

async function sendReservationToRestaurant(r) {
  const adminUrl = (process.env.APP_URL || "") + "/admin.html#reservations";
  const html = tpl(`
    <div class="hdr"><div class="badge">🔔</div><h1>Nouvelle réservation</h1><p>${restoName}</p></div>
    <div class="bdy">
      <p style="color:#6b5740;margin-bottom:4px">Référence</p><span class="rid">${r.reservationId}</span>
      <div class="card">
        <div class="row"><span class="lbl">Client</span><span class="val">${r.name}</span></div>
        <div class="row"><span class="lbl">Téléphone</span><span class="val">${r.phone}</span></div>
        <div class="row"><span class="lbl">Email</span><span class="val">${r.email}</span></div>
        <div class="row"><span class="lbl">Date</span><span class="val">${r.date}</span></div>
        <div class="row"><span class="lbl">Heure</span><span class="val">${r.time}</span></div>
        <div class="row"><span class="lbl">Personnes</span><span class="val">${r.guests}</span></div>
        ${r.note ? `<div class="row"><span class="lbl">Note</span><span class="val">${r.note}</span></div>` : ""}
      </div>
      <div style="text-align:center;margin-top:16px"><a href="${adminUrl}" class="btn">Gérer dans le panel →</a></div>
    </div>
    <div class="ftr">${restoName} · RestoPlus</div>`, "Nouvelle réservation");

  await sgMail.send({
    from: FROM,
    to: RESTO_TO,
    replyTo: r.email,
    subject: `Nouvelle réservation — ${r.name} · ${r.date} ${r.time}`,
    html,
  });
  console.log("[Email] ✅ Notification restaurant envoyée");
}

async function sendConfirmationToClient(r) {
  const html = tpl(`
    <div class="hdr"><div class="badge">✅</div><h1>Réservation confirmée !</h1><p>${restoName}</p></div>
    <div class="bdy">
      <p style="font-size:1rem;margin-bottom:20px">Bonjour <strong>${r.name}</strong>,<br/>Votre réservation est <strong>confirmée</strong>. Nous vous attendons !</p>
      <div class="card">
        <div class="row"><span class="lbl">Référence</span><span class="rid">${r.reservationId}</span></div>
        <div class="row"><span class="lbl">Date</span><span class="val">${r.date}</span></div>
        <div class="row"><span class="lbl">Heure</span><span class="val">${r.time}</span></div>
        <div class="row"><span class="lbl">Personnes</span><span class="val">${r.guests}</span></div>
        ${r.assignedTable ? `<div class="row"><span class="lbl">Table</span><span class="val">Table ${r.assignedTable}</span></div>` : ""}
      </div>
    </div>
    <div class="ftr">${restoName} · RestoPlus</div>`, "Réservation confirmée");

  await sgMail.send({
    from: FROM,
    to: r.email,
    replyTo: RESTO_TO,
    subject: `Réservation confirmée — ${restoName} · ${r.date} à ${r.time}`,
    html,
  });
  console.log("[Email] ✅ Confirmation client envoyée à", r.email);
}

async function sendCancellationToClient(r, reason = "") {
  const html = tpl(`
    <div class="hdr" style="background:#c0392b"><div class="badge">❌</div><h1>Réservation annulée</h1><p>${restoName}</p></div>
    <div class="bdy">
      <p style="font-size:1rem;margin-bottom:20px">Bonjour <strong>${r.name}</strong>,<br/>Votre réservation du <strong>${r.date}</strong> à <strong>${r.time}</strong> a été annulée.</p>
      ${reason ? `<div style="background:#fef2f2;border-radius:10px;padding:16px;border-left:3px solid #e74c3c;margin-bottom:16px"><strong style="color:#842029">Motif :</strong><p style="margin:4px 0 0">${reason}</p></div>` : ""}
    </div>
    <div class="ftr">${restoName} · RestoPlus</div>`, "Réservation annulée");

  await sgMail.send({
    from: FROM,
    to: r.email,
    replyTo: RESTO_TO,
    subject: `Réservation annulée — ${restoName}`,
    html,
  });
  console.log("[Email] ✅ Annulation client envoyée à", r.email);
}

async function verifyConnection() {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("[Email] ⚠️  SENDGRID_API_KEY manquant");
    return false;
  }
  console.log("[Email] ✅ SendGrid API configuré");
  return true;
}

verifyConnection();

module.exports = { sendReservationToRestaurant, sendConfirmationToClient, sendCancellationToClient, verifyConnection };