"use strict";

// ─── RestoPlus — Gestionnaire Réservations Admin ─────────────────────────────
// À inclure dans admin.html + brancher dans initAdminSPA() pour l'onglet #reservations

class ReservationManager {
  constructor() {
    this.reservations = [];
    this.currentView  = "list";   // "list" | "calendar"
    this.currentMonth = new Date().getMonth() + 1;
    this.currentYear  = new Date().getFullYear();
    this.statusFilter = "all";
    this.dateFilter   = "";
    this._rendered    = false;
  }

  // ── Charger depuis l'API ──────────────────────────────────────────────────
  async load() {
    const container = document.getElementById("reservations-content");
    if (!container) return;

    if (!this._rendered) {
      container.innerHTML = this._skeletonHTML();
    }

    try {
      const params = new URLSearchParams({ limit: 100, status: this.statusFilter });
      if (this.dateFilter) params.set("date", this.dateFilter);

      const res  = await spaAuthenticatedFetch(`/api/reservations?${params}`);
      const data = await res.json();
      this.reservations = data.reservations || [];
      this._render();
    } catch (e) {
      container.innerHTML = `<div class="res-empty">Erreur de chargement</div>`;
    }
  }

  // ── Rendu principal ───────────────────────────────────────────────────────
  _render() {
    const container = document.getElementById("reservations-content");
    if (!container) return;
    this._rendered = true;

    container.innerHTML = `
      <div class="res-panel">

        <!-- Toolbar -->
        <div class="res-toolbar">
          <div class="res-toolbar-left">
            <h2 class="res-title">📅 Réservations</h2>
            <span class="res-count-badge">${this.reservations.length}</span>
          </div>
          <div class="res-toolbar-right">
            <!-- Filtre statut -->
            <select class="res-filter-select" id="res-status-filter">
              <option value="all"      ${this.statusFilter==="all"       ?"selected":""}>Toutes</option>
              <option value="pending"  ${this.statusFilter==="pending"   ?"selected":""}>⏳ En attente</option>
              <option value="confirmed"${this.statusFilter==="confirmed" ?"selected":""}>✅ Confirmées</option>
              <option value="cancelled"${this.statusFilter==="cancelled" ?"selected":""}>❌ Annulées</option>
              <option value="completed"${this.statusFilter==="completed" ?"selected":""}>🏁 Terminées</option>
              <option value="no_show"  ${this.statusFilter==="no_show"   ?"selected":""}>👻 No-show</option>
            </select>
            <!-- Filtre date -->
            <input type="date" class="res-date-input" id="res-date-filter" value="${this.dateFilter}" placeholder="Filtrer par date" />
            <!-- Vue -->
            <div class="res-view-toggle">
              <button class="res-view-btn ${this.currentView==='list'    ?'active':''}" data-view="list">☰ Liste</button>
              <button class="res-view-btn ${this.currentView==='calendar'?'active':''}" data-view="calendar">📅 Calendrier</button>
            </div>
          </div>
        </div>

        <!-- Contenu -->
        <div id="res-view-content">
          ${this.currentView === "calendar"
            ? this._calendarHTML()
            : this._listHTML()
          }
        </div>

      </div>

      <!-- Modal détail/édition -->
      <div id="res-detail-modal" class="res-modal">
        <div class="res-modal-backdrop"></div>
        <div class="res-modal-sheet">
          <div class="res-modal-handle"></div>
          <div id="res-modal-body"></div>
        </div>
      </div>`;

    this._bindEvents();
  }

  // ── Liste des réservations ────────────────────────────────────────────────
  _listHTML() {
    if (!this.reservations.length) {
      return `<div class="res-empty">
        <div style="font-size:3rem;margin-bottom:1rem;">📭</div>
        <p>Aucune réservation pour ce filtre</p>
      </div>`;
    }

    // Grouper par date
    const byDate = {};
    this.reservations.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = [];
      byDate[r.date].push(r);
    });

    return Object.entries(byDate).sort(([a],[b]) => a.localeCompare(b)).map(([date, items]) => {
      const dateLabel = new Date(date + "T12:00").toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long"
      });
      const total = items.reduce((s, r) => s + r.guests, 0);
      return `
        <div class="res-date-group">
          <div class="res-date-header">
            <span class="res-date-label">${dateLabel}</span>
            <span class="res-date-meta">${items.length} rés. · ${total} pers.</span>
          </div>
          <div class="res-cards">
            ${items.map(r => this._cardHTML(r)).join("")}
          </div>
        </div>`;
    }).join("");
  }

  // ── Card réservation ──────────────────────────────────────────────────────
  _cardHTML(r) {
    const statusConf = {
      pending:   { icon:"⏳", label:"En attente", cls:"pending"   },
      confirmed: { icon:"✅", label:"Confirmée",  cls:"confirmed" },
      cancelled: { icon:"❌", label:"Annulée",    cls:"cancelled" },
      completed: { icon:"🏁", label:"Terminée",   cls:"completed" },
      no_show:   { icon:"👻", label:"No-show",    cls:"no-show"   },
    };
    const sc = statusConf[r.status] || { icon:"•", label:r.status, cls:"" };

    return `
      <div class="res-card res-card-${sc.cls}" data-id="${r.reservationId}">
        <div class="res-card-top">
          <span class="res-card-time">🕐 ${r.time}</span>
          <span class="res-status-badge res-status-${sc.cls}">${sc.icon} ${sc.label}</span>
        </div>
        <div class="res-card-name">${r.name}</div>
        <div class="res-card-meta">
          <span>👥 ${r.guests} pers.</span>
          <span>📞 ${r.phone}</span>
          ${r.assignedTable ? `<span>🪑 Table ${r.assignedTable}</span>` : ""}
          ${r.emails?.notifiedClient ? `<span title="Email envoyé">📧✓</span>` : ""}
        </div>
        ${r.note ? `<div class="res-card-note">💬 ${r.note}</div>` : ""}
        <div class="res-card-actions">
          ${r.status === "pending" ? `
            <button class="res-btn res-btn-confirm" data-action="confirm" data-id="${r.reservationId}">✅ Confirmer</button>
            <button class="res-btn res-btn-cancel"  data-action="cancel"  data-id="${r.reservationId}">❌ Refuser</button>
          ` : ""}
          <button class="res-btn res-btn-edit" data-action="edit" data-id="${r.reservationId}">✏️ Détails</button>
        </div>
      </div>`;
  }

  // ── Vue calendrier ────────────────────────────────────────────────────────
  _calendarHTML() {
    const year  = this.currentYear;
    const month = this.currentMonth;
    const monthName = new Date(year, month-1, 1).toLocaleDateString("fr-FR", { month:"long", year:"numeric" });
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay  = (new Date(year, month-1, 1).getDay() + 6) % 7; // 0=Lundi

    const byDate = {};
    this.reservations.forEach(r => { if (!byDate[r.date]) byDate[r.date]=[]; byDate[r.date].push(r); });

    const cells = [];
    for (let i=0; i<firstDay; i++) cells.push(`<div class="cal-cell cal-empty"></div>`);

    for (let d=1; d<=daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const items   = byDate[dateStr] || [];
      const today   = new Date().toISOString().split("T")[0];
      const isToday = dateStr === today;
      const pending  = items.filter(r => r.status==="pending").length;
      const confirmed= items.filter(r => r.status==="confirmed").length;

      cells.push(`
        <div class="cal-cell ${isToday?"cal-today":""} ${items.length?"cal-has-res":""}" data-date="${dateStr}">
          <div class="cal-day">${d}</div>
          ${items.length ? `
            <div class="cal-dots">
              ${pending   ? `<span class="cal-dot dot-pending"   title="${pending} en attente"></span>`   : ""}
              ${confirmed ? `<span class="cal-dot dot-confirmed" title="${confirmed} confirmée(s)"></span>` : ""}
            </div>
            <div class="cal-count">${items.length}</div>` : ""}
        </div>`);
    }

    return `
      <div class="cal-wrapper">
        <div class="cal-nav">
          <button class="cal-nav-btn" id="cal-prev">‹</button>
          <span class="cal-month-label">${monthName}</span>
          <button class="cal-nav-btn" id="cal-next">›</button>
        </div>
        <div class="cal-grid">
          ${["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(d=>`<div class="cal-head">${d}</div>`).join("")}
          ${cells.join("")}
        </div>
      </div>`;
  }

  // ── Modal détail / action ─────────────────────────────────────────────────
  _openModal(reservationId) {
    const r = this.reservations.find(x => x.reservationId === reservationId);
    if (!r) return;

    const modal = document.getElementById("res-detail-modal");
    const body  = document.getElementById("res-modal-body");

    const dateLabel = new Date(r.date + "T12:00").toLocaleDateString("fr-FR", {
      weekday:"long", day:"numeric", month:"long", year:"numeric"
    });

    body.innerHTML = `
      <div class="res-modal-header">
        <div>
          <h3 style="margin:0;font-size:1rem;font-weight:700;">Réservation</h3>
          <p style="margin:2px 0 0;font-size:0.72rem;color:#bbb;font-family:monospace;">${r.reservationId}</p>
        </div>
        <button class="mm-close" id="res-modal-close">✕</button>
      </div>
      <div style="padding:1.25rem 1.5rem 1.5rem;">

        <!-- Infos client -->
        <div class="res-info-block">
          <div class="res-info-row"><span>👤 Nom</span><strong>${r.name}</strong></div>
          <div class="res-info-row"><span>📞 Tél.</span><strong>${r.phone}</strong></div>
          <div class="res-info-row"><span>📧 Email</span><strong style="font-size:0.82rem;">${r.email}</strong></div>
        </div>

        <!-- Détails résa -->
        <div class="res-info-block" style="margin-top:10px;">
          <div class="res-info-row"><span>📅 Date</span><strong>${dateLabel}</strong></div>
          <div class="res-info-row"><span>🕐 Heure</span><strong>${r.time}</strong></div>
          <div class="res-info-row"><span>👥 Personnes</span><strong>${r.guests}</strong></div>
          ${r.note ? `<div class="res-info-row"><span>💬 Note</span><em style="font-size:0.85rem;color:#666;">${r.note}</em></div>` : ""}
        </div>

        <!-- Table assignée -->
        <div style="margin:12px 0;">
          <label style="font-size:0.78rem;font-weight:600;color:#888;display:block;margin-bottom:5px;">ASSIGNER UNE TABLE</label>
          <input type="number" id="modal-table-assign" min="1" max="50"
            value="${r.assignedTable || ""}" placeholder="N° table"
            style="width:100%;padding:8px 12px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:0.95rem;" />
        </div>

        <!-- Note interne -->
        <div style="margin:12px 0;">
          <label style="font-size:0.78rem;font-weight:600;color:#888;display:block;margin-bottom:5px;">NOTE INTERNE (non visible client)</label>
          <textarea id="modal-admin-note" rows="2"
            style="width:100%;padding:8px 12px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:0.88rem;resize:vertical;"
            placeholder="Note pour l'équipe…">${r.adminNote || ""}</textarea>
        </div>

        <!-- Actions -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px;">
          ${r.status === "pending" ? `
            <button class="mm-btn mm-btn-accept"  data-modal-action="confirm" data-id="${r.reservationId}">✅ Confirmer</button>
            <button class="mm-btn mm-btn-cancel"  data-modal-action="cancel"  data-id="${r.reservationId}">❌ Refuser</button>
          ` : ""}
          <button class="mm-btn mm-btn-prepare"   data-modal-action="save"    data-id="${r.reservationId}" style="grid-column:1/-1;">💾 Enregistrer</button>
          ${r.status !== "cancelled" && r.status !== "completed" ? `
          <button class="mm-btn" data-modal-action="no_show" data-id="${r.reservationId}"
            style="background:#fff3cd;color:#856404;grid-column:1/-1;">👻 No-show</button>` : ""}
        </div>

        <!-- Email status -->
        <div style="margin-top:12px;font-size:0.75rem;color:#bbb;text-align:center;">
          ${r.emails?.notifiedClient
            ? `📧 Email envoyé au client le ${new Date(r.emails.lastEmailAt).toLocaleDateString("fr-FR")}`
            : "📧 Aucun email envoyé au client"}
        </div>
      </div>`;

    modal.classList.add("show");

    document.getElementById("res-modal-close").onclick = () => modal.classList.remove("show");
    modal.querySelector(".res-modal-backdrop").onclick  = () => modal.classList.remove("show");

    // Boutons actions dans le modal
    modal.querySelectorAll("[data-modal-action]").forEach(btn => {
      btn.onclick = async () => {
        const action = btn.getAttribute("data-modal-action");
        const id     = btn.getAttribute("data-id");
        const tableVal = document.getElementById("modal-table-assign").value;
        const noteVal  = document.getElementById("modal-admin-note").value;

        if (action === "save") {
          await this._updateReservation(id, {
            assignedTable: tableVal ? parseInt(tableVal) : null,
            adminNote: noteVal,
          });
          modal.classList.remove("show");
        } else if (action === "confirm") {
          await this._setStatus(id, "confirmed", { assignedTable: tableVal ? parseInt(tableVal) : null, adminNote: noteVal });
          modal.classList.remove("show");
        } else if (action === "cancel") {
          const reason = prompt("Motif d'annulation (optionnel) :") || "";
          await this._setStatus(id, "cancelled", { reason });
          modal.classList.remove("show");
        } else if (action === "no_show") {
          await this._setStatus(id, "no_show", {});
          modal.classList.remove("show");
        }
      };
    });
  }

  // ── Actions API ───────────────────────────────────────────────────────────
  async _setStatus(id, status, extra = {}) {
    try {
      const res = await spaAuthenticatedFetch(`/api/reservations/${id}/status`, {
        method: "PATCH",
        body:   JSON.stringify({ status, ...extra }),
      });
      if (!res.ok) throw new Error();
      // Mise à jour locale
      const idx = this.reservations.findIndex(r => r.reservationId === id);
      if (idx !== -1) Object.assign(this.reservations[idx], { status, ...extra });
      this._render();
      window.NotificationManager?.showSuccess(id, status === "confirmed" ? "Confirmée ✅" : "Mise à jour", `Réservation ${id}`, 2500);
    } catch {
      window.NotificationManager?.showSuccess(id, "Erreur", "Impossible de mettre à jour", 3000);
    }
  }

  async _updateReservation(id, data) {
    try {
      const res = await spaAuthenticatedFetch(`/api/reservations/${id}`, {
        method: "PATCH",
        body:   JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const idx = this.reservations.findIndex(r => r.reservationId === id);
      if (idx !== -1) Object.assign(this.reservations[idx], data);
      this._render();
      window.NotificationManager?.showSuccess(id, "Enregistré", "Réservation mise à jour", 2000);
    } catch {
      window.NotificationManager?.showSuccess(id, "Erreur", "Impossible de sauvegarder", 3000);
    }
  }

  // ── Events ────────────────────────────────────────────────────────────────
  _bindEvents() {
    // Filtre statut
    document.getElementById("res-status-filter")?.addEventListener("change", e => {
      this.statusFilter = e.target.value; this.load();
    });
    // Filtre date
    document.getElementById("res-date-filter")?.addEventListener("change", e => {
      this.dateFilter = e.target.value; this.load();
    });
    // Toggle vue
    document.querySelectorAll(".res-view-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.currentView = btn.dataset.view;
        document.querySelectorAll(".res-view-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById("res-view-content").innerHTML =
          this.currentView === "calendar" ? this._calendarHTML() : this._listHTML();
        this._bindCalendarNav();
        this._bindCalendarCells();
      });
    });
    // Boutons confirm/cancel/edit sur les cards
    document.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", async e => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const id     = btn.dataset.id;
        if (action === "confirm") await this._setStatus(id, "confirmed");
        else if (action === "cancel") {
          const reason = prompt("Motif (optionnel) :") || "";
          await this._setStatus(id, "cancelled", { reason });
        }
        else if (action === "edit") this._openModal(id);
      });
    });
    // Clic sur card → ouvre modal
    document.querySelectorAll(".res-card").forEach(card => {
      card.addEventListener("click", e => {
        if (!e.target.closest("button")) this._openModal(card.dataset.id);
      });
    });
    this._bindCalendarNav();
    this._bindCalendarCells();
  }

  _bindCalendarNav() {
    document.getElementById("cal-prev")?.addEventListener("click", () => {
      this.currentMonth--; if (this.currentMonth < 1) { this.currentMonth=12; this.currentYear--; }
      this._loadCalendar();
    });
    document.getElementById("cal-next")?.addEventListener("click", () => {
      this.currentMonth++; if (this.currentMonth > 12) { this.currentMonth=1; this.currentYear++; }
      this._loadCalendar();
    });
  }
  _bindCalendarCells() {
    document.querySelectorAll(".cal-cell.cal-has-res").forEach(cell => {
      cell.addEventListener("click", () => {
        this.dateFilter = cell.dataset.date;
        this.currentView = "list";
        this.load();
      });
    });
  }
  async _loadCalendar() {
    try {
      const res  = await spaAuthenticatedFetch(`/api/reservations/calendar?year=${this.currentYear}&month=${this.currentMonth}`);
      const data = await res.json();
      // Reconstruire la liste à plat pour le rendu calendrier
      this.reservations = Object.values(data.days || {}).flat().map(r => ({...r, date: Object.keys(data.days).find(d => data.days[d].includes(r))}));
      document.getElementById("res-view-content").innerHTML = this._calendarHTML();
      this._bindCalendarNav();
      this._bindCalendarCells();
    } catch {
      // silencieux
    }
  }

  _skeletonHTML() {
    return `<div class="res-panel"><div class="res-skeleton"></div></div>`;
  }
}

// ── Init (brancher dans initAdminSPA) ─────────────────────────────────────────
window.reservationManager = new ReservationManager();

