# Intégration Système de Réservation — RestoPlus

## Fichiers fournis

| Fichier | Destination |
|---|---|
| `reservation.html` | `public/reservation.html` |
| `Reservation.model.js` | `backend/models/Reservation.js` |
| `reservations.route.js` | `backend/routes/reservations.js` |
| `email.service.js` | `backend/services/email.service.js` |
| `admin-reservations.js` | `public/js/admin-reservations.js` |
| `admin-reservations.css` | `public/css/admin-reservations.css` |

---

## ÉTAPE 1 — Backend

### 1.1 Installer nodemailer
```bash
npm install nodemailer
```

### 1.2 Brancher la route dans `backend/app.js`
```js
app.use("/api/reservations", require("./routes/reservations"));
```

### 1.3 Variables d'environnement Render
```env
# Choix du provider email : "gmail" | "resend" | "smtp"
EMAIL_PROVIDER=gmail

# Option Gmail (recommandé pour démarrer)
# ⚠️ Utiliser un "App Password" Google, PAS ton vrai mot de passe
# Google Account → Security → 2-Step Verification → App Passwords
GMAIL_USER=sowhamedou10@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Option Resend (recommandé en prod, 3000 emails/mois gratuit)
# RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx

# Adresse d'envoi (apparaît dans "De :")
RESTAURANT_EMAIL_FROM=RestoPlus <noreply@restoplus.app>

# Email qui reçoit les nouvelles réservations
RESTAURANT_EMAIL_TO=sowhamedou10@gmail.com

# URL de l'app (pour le lien "Gérer dans le panel" dans l'email)
APP_URL=https://restoplus-lakora.onrender.com
```

### 1.4 Créer l'App Password Gmail
1. Google Account → Security → 2-Step Verification (activer si pas fait)
2. Security → App Passwords
3. "Select app" → Mail, "Select device" → Other → "RestoPlus"
4. Copier le mot de passe 16 caractères → `GMAIL_APP_PASSWORD`

---

## ÉTAPE 2 — Frontend page réservation

Copier `reservation.html` dans `public/`.

Ajouter le lien dans le menu ou la page d'accueil :
```html
<a href="/reservation.html">Réserver une table</a>
```

### Personnaliser les créneaux horaires
Dans `reservation.html`, modifier le tableau `SLOTS` :
```js
const SLOTS = ["12:00","12:30","13:00","13:30","19:00","19:30","20:00","20:30","21:00","21:30"];
```

---

## ÉTAPE 3 — Panel admin

### 3.1 Ajouter dans `admin.html`

Dans `<head>` :
```html
<link rel="stylesheet" href="css/admin-reservations.css" />
```

Avant `</body>` :
```html
<script src="js/admin-reservations.js"></script>
```

### 3.2 Ajouter l'onglet nav dans `admin.html`
```html
<a href="#reservations" class="nav-link">
  📅 Réservations
  <span id="res-pending-count" class="nav-badge" style="display:none">0</span>
</a>
```

### 3.3 Ajouter la section dans `admin.html`
```html
<section id="reservations" style="display:none;">
  <div id="reservations-content"></div>
</section>
```

### 3.4 Brancher dans `initAdminSPA()` dans `admin.js`

Dans la fonction `showSection(target)` :
```js
// Ajouter reservations dans les sections gérées
const reservationsSection = document.getElementById("reservations");
// ...
if (reservationsSection) reservationsSection.style.display = target === "reservations" ? "block" : "none";
```

Dans `handleTabClick()` :
```js
} else if (target === "reservations") {
  if (window.reservationManager) await window.reservationManager.load();
}
```

### 3.5 Badge de réservations en attente (optionnel)
Ajouter dans `setupAutoRefresh()` ou à part :
```js
async function refreshReservationBadge() {
  try {
    const res  = await spaAuthenticatedFetch("/api/reservations?status=pending&limit=1");
    const data = await res.json();
    const badge = document.getElementById("res-pending-count");
    if (badge && data.total > 0) {
      badge.textContent = data.total;
      badge.style.display = "inline-block";
    }
  } catch {}
}
setInterval(refreshReservationBadge, 30000);
refreshReservationBadge();
```

---

## ÉTAPE 4 — Git + déploiement

```bash
git add backend/models/Reservation.js
git add backend/routes/reservations.js
git add backend/services/email.service.js
git add public/reservation.html
git add public/js/admin-reservations.js
git add public/css/admin-reservations.css
git commit -m "feat: système de réservation complet — form client + API + emails + panel admin"
git push
```

Render redéploie automatiquement. Tester :
1. Ouvrir `/reservation.html`
2. Remplir et soumettre → vérifier l'email reçu sur `sowhamedou10@gmail.com`
3. Ouvrir le panel admin → onglet Réservations
4. Confirmer → vérifier l'email envoyé au client

---

## Flux complet

```
Client remplit le formulaire
        ↓
POST /api/reservations
        ↓
Réservation créée (status: pending)
        ↓
Email automatique → restaurant (Gmail)
        ↓
Admin voit la réservation dans le panel
        ↓
Admin clique "Confirmer" ou "Refuser"
        ↓
PATCH /api/reservations/:id/status
        ↓
Email automatique → client (confirmation OU annulation)
```
