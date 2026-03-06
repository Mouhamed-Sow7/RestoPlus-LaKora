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
        <div class="oh-modal-content" role="dialog" aria-modal="true" aria-label="Historique des commandes">
          <div class="oh-modal-header">
            <div class="oh-header-left">
              <div class="oh-title">
                <span class="oh-title-dot" aria-hidden="true"></span>
                <span>Historique</span>
              </div>
              <span class="oh-count-badge" id="oh-count-badge">0</span>
            </div>
            <button id="oh-close" class="oh-close" aria-label="Fermer">×</button>
          </div>

          <div class="oh-tabs" role="tablist" aria-label="Filtres commandes">
            <button class="oh-tab is-active" data-filter="all" role="tab" aria-selected="true">Toutes</button>
            <button class="oh-tab" data-filter="pending" role="tab" aria-selected="false">En cours</button>
            <button class="oh-tab" data-filter="ready" role="tab" aria-selected="false">Prêtes</button>
            <button class="oh-tab" data-filter="served" role="tab" aria-selected="false">Servies</button>
            <button class="oh-tab" data-filter="cancelled" role="tab" aria-selected="false">Annulées</button>
          </div>

          <div class="oh-modal-body">
            <div id="oh-list" class="oh-list"></div>
          </div>

          <!-- Details panel (slides over history) -->
          <div class="oh-details" id="oh-details" aria-hidden="true">
            <div class="oh-details-header">
              <button id="oh-details-back" class="oh-details-back" aria-label="Retour">←</button>
              <div class="oh-details-title" id="oh-details-title">Détails</div>
              <button id="oh-details-close" class="oh-close" aria-label="Fermer">×</button>
            </div>
            <div class="oh-details-body" id="oh-details-body"></div>
          </div>
        </div>
      </div>

      <!-- QR Viewer -->
      <div id="qr-reopen-modal" class="oh-modal" aria-hidden="true" style="display:none;">
        <div class="oh-modal-content" role="dialog" aria-modal="true" aria-label="QR Code de la commande">
          <div class="oh-modal-header">
            <div class="oh-header-left">
              <div class="oh-title">
                <span class="oh-title-dot" aria-hidden="true"></span>
                <span>QR Code</span>
              </div>
              <span class="oh-count-badge" id="qr-order-badge">—</span>
            </div>
            <button id="qr-reopen-close" class="oh-close" aria-label="Fermer">×</button>
          </div>
          <div class="oh-modal-body">
            <div class="oh-qr-wrap">
              <img id="qr-reopen-img" src="" alt="QR Code de la commande" class="oh-qr-img">
              <div id="qr-order-info" class="oh-qr-info"></div>
            </div>
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
      if (t.id === "oh-details-back")   this.hideDetails();
      if (t.id === "oh-details-close")  this.hideDetails();

      if (t.classList.contains("oh-action-qr")) {
        const oid = t.dataset.orderId;
        if (oid) this.reopenQR(oid);
      }

      if (t.classList.contains("oh-action-details")) {
        const oid = t.dataset.orderId;
        if (oid) this.viewDetails(oid);
      }

      if (t.classList.contains("oh-tab")) {
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
    if (list) list.innerHTML = this._renderSkeletons(3);
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

      const countBadge = document.getElementById("oh-count-badge");
      if (countBadge) countBadge.textContent = String(hist.length);

      if (!hist.length) {
        list.innerHTML = `
          <div class="oh-empty">
            <div class="oh-empty-illu" aria-hidden="true">
              <svg viewBox="0 0 120 90" width="120" height="90" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 70c0-20 16-36 36-36h44c6 0 10-4 10-10V18c0-6-4-10-10-10H50C24 8 4 28 4 54v10c0 6 4 10 10 10h0z" fill="#f5ede6"/>
                <path d="M32 64h64" stroke="#8b4513" stroke-width="5" stroke-linecap="round"/>
                <path d="M42 74h44" stroke="#c09070" stroke-width="5" stroke-linecap="round"/>
                <circle cx="92" cy="26" r="8" fill="#8b4513" opacity="0.15"/>
              </svg>
            </div>
            <div class="oh-empty-title">Aucune commande pour cette table</div>
            <div class="oh-empty-sub">Quand vous passerez une commande, elle apparaîtra ici automatiquement.</div>
          </div>`;
        this._rendering = false;
        return;
      }

      list.innerHTML = hist.map((h) => this._renderOrderCard(h)).join("");

    } catch (err) {
      list.innerHTML = `
        <div class="oh-empty oh-empty--error">
          <div class="oh-empty-title">Impossible de charger l'historique</div>
          <div class="oh-empty-sub">Vérifiez votre connexion et réessayez.</div>
          <button class="oh-btn oh-btn--secondary" id="oh-retry">Réessayer</button>
        </div>`;
      document.getElementById("oh-retry")?.addEventListener("click", () => this.refresh());
    } finally {
      this._rendering = false;
    }
  }

  _statusInfo(status) {
    const map = {
      pending_approval: { label: "En attente",      color: "#ff9800" },
      pending_scan:     { label: "Scan requis",     color: "#ff9800" },
      pending:          { label: "En attente",      color: "#ff9800" },
      accepted:         { label: "Acceptée",        color: "#2196f3" },
      preparing:        { label: "En préparation",  color: "#9c27b0" },
      ready:            { label: "Prête",           color: "#4caf50" },
      served:           { label: "Servie",          color: "#607d8b" },
      cancelled:        { label: "Annulée",         color: "#f44336" },
    };
    return map[status] || { label: status, color: "#9e9e9e" };
  }

  _shortId(orderId) {
    const id = String(orderId || "");
    if (!id) return "—";
    return id.length > 12 ? id.slice(-12) : id;
  }

  _formatTime(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "—";
    }
  }

  _renderSkeletons(count = 3) {
    return Array.from({ length: count }).map(() => `
      <div class="oh-skeleton-card">
        <div class="oh-skel-row">
          <span class="oh-skel oh-skel--id"></span>
          <span class="oh-skel oh-skel--badge"></span>
          <span class="oh-skel oh-skel--time"></span>
        </div>
        <div class="oh-skel-row">
          <span class="oh-skel oh-skel--pill"></span>
          <span class="oh-skel oh-skel--pill"></span>
        </div>
        <div class="oh-skel-row">
          <span class="oh-skel oh-skel--line"></span>
        </div>
        <div class="oh-skel-row">
          <span class="oh-skel oh-skel--total"></span>
        </div>
        <div class="oh-skel-row">
          <span class="oh-skel oh-skel--btn"></span>
          <span class="oh-skel oh-skel--btn"></span>
        </div>
      </div>
    `).join("");
  }

  _renderOrderCard(order) {
    const id = order.orderId || order.id || order._id;
    const shortId = this._shortId(id);
    const timeStr = this._formatTime(order.timestamp || order.createdAt);
    const table = typeof order.table !== "undefined" ? order.table : "—";

    const statusInfo = this._statusInfo(order.status);
    const statusLabel = statusInfo.label;
    const statusColor = statusInfo.color;

    const paymentPaid = order.paymentStatus === "paid";
    const paymentLabel = paymentPaid ? "Payé" : "Impayé";

    const items = Array.isArray(order.items) ? order.items : [];
    const preview = items.slice(0, 2).map((i) => i?.name).filter(Boolean).join(", ");
    const moreCount = items.length > 2 ? items.length - 2 : 0;
    const previewText = preview
      ? `${preview}${moreCount ? ` +${moreCount} autres` : ""}`
      : "—";

    const total = this.formatPrice(order.total);

    const canReopen = !!order.canReopen;
    const readyPulse = order.status === "ready" ? " is-ready" : "";

    return `
      <div class="oh-card${readyPulse}" data-status="${order.status || ""}" style="--oh-accent:${statusColor};">
        <div class="oh-card-top">
          <div class="oh-id">#${shortId}</div>
          <div class="oh-top-right">
            <span class="oh-table">Table ${table}</span>
            <span class="oh-time">${timeStr}</span>
          </div>
        </div>

        <div class="oh-card-badges">
          <span class="oh-badge oh-badge--status">${statusLabel}</span>
          <span class="oh-badge oh-badge--pay">${paymentLabel}</span>
        </div>

        <div class="oh-items-preview">${previewText}</div>

        <div class="oh-card-bottom">
          <div class="oh-total">${total} CFA</div>
        </div>

        <div class="oh-card-actions">
          ${canReopen ? `<button class="oh-btn oh-btn--primary oh-action-qr" data-order-id="${id}">Voir QR</button>` : ""}
          <button class="oh-btn oh-btn--secondary oh-action-details" data-order-id="${id}">Détails</button>
        </div>
      </div>
    `;
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
    const badge = document.getElementById("qr-order-badge");
    img.src = dataUrl;

    const order = this.manager._orders.find((o) => o.orderId === orderId);
    if (order) {
      if (badge) badge.textContent = `#${this._shortId(order.orderId)}`;
      info.innerHTML = `
        Commande <strong>#${this._shortId(order.orderId)}</strong><br>
        Table <strong>${order.table}</strong> —
        Total <strong>${this.formatPrice(order.total)} CFA</strong>`;
    }
    this.toggleModal("qr-reopen-modal", true);
  }

  viewDetails(orderId) {
    const order = this.manager._orders.find((o) => o.orderId === orderId);
    if (!order) return;

    const panel = document.getElementById("oh-details");
    const title = document.getElementById("oh-details-title");
    const body = document.getElementById("oh-details-body");
    if (!panel || !title || !body) return;

    const statusInfo = this._statusInfo(order.status);
    const id = order.orderId || order.id || order._id;
    title.textContent = `Commande #${this._shortId(id)}`;

    const items = Array.isArray(order.items) ? order.items : [];
    const itemsHtml = items.length
      ? items.map((it) => `
          <div class="oh-line">
            <div class="oh-line-left">
              <div class="oh-line-name">${it.name}</div>
              <div class="oh-line-meta">${it.quantity} × ${this.formatPrice(it.price)} CFA</div>
            </div>
            <div class="oh-line-total">${this.formatPrice(it.price * it.quantity)} CFA</div>
          </div>
        `).join("")
      : `<div class="oh-empty oh-empty--compact">Aucun article</div>`;

    body.innerHTML = `
      <div class="oh-details-meta">
        <div class="oh-meta-item"><span>Table</span><strong>${order.table}</strong></div>
        <div class="oh-meta-item"><span>Statut</span><strong style="color:${statusInfo.color}">${statusInfo.label}</strong></div>
        <div class="oh-meta-item"><span>Paiement</span><strong>${order.paymentStatus === "paid" ? "Payé" : "Impayé"}</strong></div>
        <div class="oh-meta-item"><span>Total</span><strong>${this.formatPrice(order.total)} CFA</strong></div>
      </div>

      <div class="oh-details-section">
        <div class="oh-details-section-title">Articles</div>
        <div class="oh-lines">
          ${itemsHtml}
        </div>
      </div>

      <div class="oh-details-actions">
        ${order.canReopen ? `<button class="oh-btn oh-btn--primary oh-action-qr" data-order-id="${id}">Voir QR</button>` : ""}
        <button class="oh-btn oh-btn--secondary" id="oh-details-done">Fermer</button>
      </div>
    `;

    document.getElementById("oh-details-done")?.addEventListener("click", () => this.hideDetails(), { once: true });

    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
  }

  hideDetails() {
    const panel = document.getElementById("oh-details");
    if (!panel) return;
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
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
    document.querySelectorAll(".oh-tab").forEach((b) => {
      b.classList.toggle("is-active", (b.dataset.filter || "all") === filter);
      b.setAttribute("aria-selected", ((b.dataset.filter || "all") === filter) ? "true" : "false");
    });
    this.loadList();
  }

  toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (show) {
      modal.style.display = "flex";
      // trigger animation
      requestAnimationFrame(() => modal.classList.add("show"));
    } else {
      modal.classList.remove("show");
      // let transition finish before removing from layout
      setTimeout(() => { modal.style.display = "none"; }, 250);
      if (modalId === "order-history-modal") this.hideDetails();
    }
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