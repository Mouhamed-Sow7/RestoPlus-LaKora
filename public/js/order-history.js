// order-history.js — La Kora Restaurant
// Source de vérité : MongoDB via GET /api/orders/public?table=X
// localStorage : uniquement cache des images QR (base64) — aucune donnée métier

class OrderHistoryManager {
  constructor() {
    this._qrCacheKey = "lakora_qr_cache"; // seul usage légit du localStorage
    this._orders     = [];                // cache mémoire session
    this._table      = this._detectTable();
  }

  // ─── Détection table courante ─────────────────────────────
  _detectTable() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("table");
    if (fromUrl) return parseInt(fromUrl);
    return parseInt(localStorage.getItem("currentTable")) || null;
  }

  // ─── Cache QR (localStorage — images uniquement) ──────────
  _getQrCache() {
    try {
      return JSON.parse(localStorage.getItem(this._qrCacheKey) || "{}");
    } catch { return {}; }
  }

  saveQRToCache(orderId, dataUrl) {
    try {
      const cache = this._getQrCache();
      cache[orderId] = dataUrl;
      // Limiter le cache à 30 entrées pour éviter de saturer localStorage
      const keys = Object.keys(cache);
      if (keys.length > 30) delete cache[keys[0]];
      localStorage.setItem(this._qrCacheKey, JSON.stringify(cache));
    } catch { /* localStorage plein — pas bloquant */ }
  }

  getQRFromCache(orderId) {
    return this._getQrCache()[orderId] || null;
  }

  // ─── Chargement depuis MongoDB ────────────────────────────

  /**
   * Récupère l'historique depuis /api/orders/public?table=X
   * Enrichit chaque commande avec le QR en cache si disponible
   */
  async getHistory() {
    try {
      const table = this._table;
      if (!table) return [];

      const res = await fetch(
        `/api/orders/public?table=${table}&limit=50&sort=desc`
      );
      if (!res.ok) return this._orders; // fallback cache mémoire

      const data  = await res.json();
      const list  = Array.isArray(data.orders) ? data.orders
                  : Array.isArray(data)         ? data
                  : [];

      // Enrichir avec QR cache local
      const qrCache = this._getQrCache();
      this._orders = list.map((o) => ({
        ...o,
        orderId:       o.orderId || o._id,
        qrData:        qrCache[o.orderId] || null,
        canReopen:     !!qrCache[o.orderId],
      }));

      return this._orders;
    } catch {
      return this._orders; // réseau down → cache mémoire session
    }
  }

  /**
   * Récupère le statut d'une seule commande (polling léger)
   */
  async getOrderStatus(orderId) {
    try {
      const res = await fetch(
        `/api/orders/public/${encodeURIComponent(orderId)}/status`
      );
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }

  /**
   * Rafraîchit les statuts depuis le backend
   * Appelé à l'ouverture du modal historique
   */
  async refreshFromBackend() {
    // Un seul appel suffit : getHistory() recharge tout depuis la DB
    await this.getHistory();
    this.dispatchUpdate("refreshed");
  }

  // ─── Compat addOrder (appelé par cart.js après création) ──
  // On ne stocke plus en localStorage — on se contente de
  // mettre à jour le cache QR si fourni
  addOrder(order) {
    const orderId = order.orderId || order.id;
    if (!orderId) return;

    // Sauvegarder l'image QR si présente
    if (order.qrData) {
      this.saveQRToCache(orderId, order.qrData);
    }

    // Déclencher un refresh de l'historique en arrière-plan
    this.getHistory().then(() => this.dispatchUpdate("added", { orderId }));
  }

  // ─── Compat updateStatus (appelé par admin sync) ──────────
  // Rien à faire en localStorage — la DB est la source de vérité
  // On notifie juste l'UI
  updateStatus(orderId, status, paymentStatus = null) {
    const order = this._orders.find((o) => o.orderId === orderId);
    if (order) {
      order.status = status;
      if (paymentStatus) order.paymentStatus = paymentStatus;
      this.dispatchUpdate("updated", order);
    }
  }

  updateOrderStatus(orderId, newStatus) {
    if (newStatus === "delete") {
      this._orders = this._orders.filter((o) => o.orderId !== orderId);
      this.dispatchUpdate("deleted", { orderId });
      return;
    }
    this.updateStatus(orderId, newStatus);
  }

  // ─── Compat clearHistory ──────────────────────────────────
  // Vide le cache QR local (les orders restent en DB)
  clearHistory() {
    localStorage.removeItem(this._qrCacheKey);
    this._orders = [];
    this.dispatchUpdate("cleared");
  }

  // ─── Helpers ──────────────────────────────────────────────
  dispatchUpdate(action, order = null) {
    document.dispatchEvent(
      new CustomEvent("historyUpdated", { detail: { action, order } })
    );
  }

  isHistoryModalOpen() {
    const modal = document.getElementById("order-history-modal");
    if (!modal) return false;
    const d = modal.style.display || window.getComputedStyle(modal).display;
    return d !== "none";
  }
}

// ─────────────────────────────────────────────────────────────
class OrderHistoryUI {
  constructor(manager) {
    this.manager       = manager;
    this.currentFilter = "all";
    this._rendering    = false;
    this.init();
  }

  init() {
    this.injectModal();
    this.setupHandlers();
  }

  injectModal() {
    if (document.getElementById("order-history-modal")) return;

    document.body.insertAdjacentHTML("beforeend", `
      <!-- Historique -->
      <div id="order-history-modal" class="oh-modal" aria-hidden="true" style="display:none;">
        <div class="oh-modal-content">
          <div class="oh-modal-header">
            <h3>📋 Historique des commandes</h3>
            <div class="oh-actions">
              <button id="oh-refresh" class="btn-secondary" title="Rafraîchir">🔄</button>
              <button id="oh-close" class="oh-close" aria-label="Fermer">×</button>
            </div>
          </div>
          <div class="history-controls">
            <button class="filter-btn active" data-filter="all">Toutes</button>
            <button class="filter-btn" data-filter="pending">En cours</button>
            <button class="filter-btn" data-filter="ready">Prêtes</button>
            <button class="filter-btn" data-filter="served">Servies</button>
            <button class="filter-btn" data-filter="cancelled">Annulées</button>
          </div>
          <div class="oh-modal-body">
            <div id="oh-list" class="oh-list">
              <div class="oh-loading">⏳ Chargement...</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal QR réouverture -->
      <div id="qr-reopen-modal" class="oh-modal" aria-hidden="true" style="display:none;">
        <div class="oh-modal-content">
          <div class="oh-modal-header">
            <h3>📱 QR Code de la commande</h3>
            <button id="qr-reopen-close" class="oh-close" aria-label="Fermer">×</button>
          </div>
          <div class="oh-modal-body" style="text-align:center;padding:2rem;">
            <img id="qr-reopen-img" src="" alt="QR Code"
                 style="max-width:280px;border-radius:8px;">
            <div id="qr-order-info"
                 style="margin-top:1rem;font-size:0.9rem;color:#666;"></div>
          </div>
        </div>
      </div>
    `);
  }

  setupHandlers() {
    document.addEventListener("click", (e) => {
      const t = e.target;
      if (!t) return;

      if (t.id === "oh-close")          this.hideModal();
      if (t.id === "qr-reopen-close")   this.hideQRModal();
      if (t.id === "history-toggle")    this.showModal();
      if (t.id === "oh-refresh")        this.refresh();

      if (t.classList.contains("reopen-qr")) {
        const oid = t.dataset.orderId;
        if (oid) this.reopenQR(oid);
      }

      if (t.classList.contains("view-details")) {
        const oid = t.dataset.orderId;
        if (oid) this.viewDetails(oid);
      }

      if (t.classList.contains("filter-btn")) {
        this.setFilter(t.dataset.filter || "all");
      }
    });

    // Réagir aux mises à jour
    document.addEventListener("historyUpdated", () => {
      if (this.isModalVisible("order-history-modal")) this.loadList();
    });

    this._setupBackdropClose("order-history-modal");
    this._setupBackdropClose("qr-reopen-modal");
  }

  _setupBackdropClose(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modalId === "qr-reopen-modal" ? this.hideQRModal() : this.hideModal();
        }
      });
    }
  }

  async showModal() {
    this.toggleModal("order-history-modal", true);
    await this.refresh();
  }

  hideModal()   { this.toggleModal("order-history-modal", false); }
  hideQRModal() { this.toggleModal("qr-reopen-modal", false); }

  async refresh() {
    const list = document.getElementById("oh-list");
    if (list) list.innerHTML = `<div class="oh-loading">⏳ Chargement...</div>`;
    await this.manager.refreshFromBackend();
    await this.loadList();
  }

  async loadList() {
    if (this._rendering) return;
    this._rendering = true;

    const list = document.getElementById("oh-list");
    if (!list) { this._rendering = false; return; }

    try {
      let hist = await this.manager.getHistory();

      // Filtre
      if (this.currentFilter && this.currentFilter !== "all") {
        if (this.currentFilter === "pending") {
          hist = hist.filter((h) =>
            ["pending_approval", "pending_scan", "pending", "accepted", "preparing"].includes(h.status)
          );
        } else {
          hist = hist.filter((h) => h.status === this.currentFilter);
        }
      }

      if (!hist.length) {
        list.innerHTML = `<div class="oh-empty">Aucune commande trouvée</div>`;
        this._rendering = false;
        return;
      }

      list.innerHTML = hist.map((h) => {
        const d          = new Date(h.timestamp || h.createdAt);
        const dateStr    = d.toLocaleDateString("fr-FR");
        const timeStr    = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        const statusInfo = this._statusInfo(h.status);
        const payBadge   = h.paymentStatus === "paid"
          ? `<span class="badge badge-success">💳 Payé</span>`
          : `<span class="badge badge-warning">⏳ Impayé</span>`;

        return `
          <div class="oh-item oh-item-${h.status}">
            <div class="oh-item-top">
              <strong>#${h.orderId}</strong>
              <span class="oh-table-badge">Table ${h.table}</span>
              ${payBadge}
            </div>
            <div class="oh-item-meta">
              <span>${dateStr} ${timeStr}</span>
              <span class="oh-status-badge" style="background:${statusInfo.bg};color:${statusInfo.color};">
                ${statusInfo.icon} ${statusInfo.label}
              </span>
              <strong>${this.formatPrice(h.total)} CFA</strong>
            </div>
            <div class="oh-item-actions">
              ${h.canReopen
                ? `<button class="btn-primary reopen-qr" data-order-id="${h.orderId}">
                     🔄 Rouvrir QR
                   </button>`
                : ""}
              <button class="btn-secondary view-details" data-order-id="${h.orderId}">
                👁 Détails
              </button>
            </div>
          </div>`;
      }).join("");

    } catch (err) {
      list.innerHTML = `<div class="oh-empty" style="color:#c00;">
        Erreur de chargement. <button class="btn-secondary" id="oh-retry">Réessayer</button>
      </div>`;
      document.getElementById("oh-retry")?.addEventListener("click", () => this.refresh());
    } finally {
      this._rendering = false;
    }
  }

  _statusInfo(status) {
    const map = {
      pending_approval: { label: "En attente",    icon: "🔔", bg: "#fff3e0", color: "#e65100" },
      pending_scan:     { label: "Scan requis",   icon: "🔍", bg: "#fff3e0", color: "#e65100" },
      pending:          { label: "En attente",    icon: "⏳", bg: "#fff3e0", color: "#f57c00" },
      accepted:         { label: "Acceptée",      icon: "✅", bg: "#e3f2fd", color: "#1565c0" },
      preparing:        { label: "En prépa",      icon: "👨‍🍳", bg: "#f3e5f5", color: "#6a1b9a" },
      ready:            { label: "Prête !",       icon: "🍽️", bg: "#e8f5e9", color: "#2e7d32" },
      served:           { label: "Servie",        icon: "🎉", bg: "#eceff1", color: "#546e7a" },
      cancelled:        { label: "Annulée",       icon: "❌", bg: "#ffebee", color: "#c62828" },
    };
    return map[status] || { label: status, icon: "•", bg: "#f5f5f5", color: "#666" };
  }

  reopenQR(orderId) {
    const dataUrl = this.manager.getQRFromCache(orderId);
    if (!dataUrl) {
      // QR pas en cache — afficher message
      const overlay = this._buildInfoOverlay(
        "QR non disponible",
        `Le QR code de la commande <strong>#${orderId}</strong> n'est plus en cache.<br><br>
         Vous pouvez montrer votre numéro de commande au serveur.`
      );
      document.body.appendChild(overlay);
      return;
    }

    const img  = document.getElementById("qr-reopen-img");
    const info = document.getElementById("qr-order-info");
    img.src = dataUrl;

    const order = this.manager._orders.find((o) => o.orderId === orderId);
    if (order) {
      info.innerHTML = `
        Commande <strong>#${order.orderId}</strong><br>
        Table <strong>${order.table}</strong> —
        Total <strong>${this.formatPrice(order.total)} CFA</strong>`;
    }
    this.toggleModal("qr-reopen-modal", true);
  }

  viewDetails(orderId) {
    const order = this.manager._orders.find((o) => o.orderId === orderId);
    if (!order) return;

    const statusInfo = this._statusInfo(order.status);
    const itemsHTML  = (order.items || []).map((it) => `
      <div class="item-detail">
        <span class="item-name">${it.name}</span>
        <span class="item-qty">${it.quantity}×</span>
        <span class="item-price">${this.formatPrice(it.price)} CFA</span>
        <span class="item-total">${this.formatPrice(it.price * it.quantity)} CFA</span>
      </div>`).join("");

    const overlay = document.createElement("div");
    overlay.className = "oh-modal";
    overlay.style.display = "flex";

    overlay.innerHTML = `
      <div class="oh-modal-content">
        <div class="oh-modal-header">
          <h3>Commande #${order.orderId}</h3>
          <button class="oh-close" aria-label="Fermer">×</button>
        </div>
        <div class="oh-modal-body">
          <div class="oh-details-grid">
            <div><strong>Table</strong><span>${order.table}</span></div>
            <div><strong>Total</strong><span>${this.formatPrice(order.total)} CFA</span></div>
            <div><strong>Statut</strong>
              <span class="oh-status-badge"
                    style="background:${statusInfo.bg};color:${statusInfo.color};">
                ${statusInfo.icon} ${statusInfo.label}
              </span>
            </div>
            <div><strong>Paiement</strong>
              <span>${order.paymentStatus === "paid" ? "✅ Payé" : "⏳ En attente"}</span>
            </div>
          </div>
          <div class="oh-items-list">
            <p style="font-weight:600;margin:0.75rem 0 0.5rem;">Articles</p>
            ${itemsHTML || '<div class="oh-empty">Aucun article</div>'}
          </div>
        </div>
        <div class="oh-modal-footer">
          <button class="btn-secondary oh-close">Fermer</button>
          ${order.canReopen
            ? `<button class="btn-primary reopen-qr" data-order-id="${order.orderId}">
                 🔄 Rouvrir QR
               </button>`
            : ""}
        </div>
      </div>`;

    document.body.appendChild(overlay);
    const cleanup = () => overlay.remove();
    overlay.addEventListener("click", (e) => { if (e.target === overlay) cleanup(); });
    overlay.querySelectorAll(".oh-close").forEach((b) => b.addEventListener("click", cleanup));
  }

  _buildInfoOverlay(title, bodyHTML) {
    const overlay = document.createElement("div");
    overlay.className = "oh-modal";
    overlay.style.display = "flex";
    overlay.innerHTML = `
      <div class="oh-modal-content" style="max-width:380px;">
        <div class="oh-modal-header">
          <h3>${title}</h3>
          <button class="oh-close">×</button>
        </div>
        <div class="oh-modal-body" style="padding:1.5rem;text-align:center;">
          ${bodyHTML}
        </div>
        <div class="oh-modal-footer">
          <button class="btn-secondary oh-close">Fermer</button>
        </div>
      </div>`;
    const cleanup = () => overlay.remove();
    overlay.addEventListener("click", (e) => { if (e.target === overlay) cleanup(); });
    overlay.querySelectorAll(".oh-close").forEach((b) => b.addEventListener("click", cleanup));
    return overlay;
  }

  setFilter(filter) {
    this.currentFilter = filter;
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    document.querySelector(`.filter-btn[data-filter="${filter}"]`)?.classList.add("active");
    this.loadList();
  }

  toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = show ? "flex" : "none";
    modal.setAttribute("aria-hidden", show ? "false" : "true");
  }

  isModalVisible(modalId) {
    const modal = document.getElementById(modalId);
    return modal && modal.style.display === "flex";
  }

  formatPrice(n) {
    return new Intl.NumberFormat("fr-FR").format(n || 0);
  }
}

// ─── Bootstrap ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  if (!window.orderHistoryManager) {
    window.orderHistoryManager = new OrderHistoryManager();
  }
  if (!window.orderHistoryUI) {
    window.orderHistoryUI = new OrderHistoryUI(window.orderHistoryManager);
  }
});