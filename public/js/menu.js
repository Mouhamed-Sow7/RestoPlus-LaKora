// Menu Management for La Kora Restaurant

// ─── Constantes session ───────────────────────────────────────────────────
const TABLE_SESSION_KEY    = "tableSession";
const TABLE_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 heures

// ─── Helpers session table ────────────────────────────────────────────────

function getTableSession() {
  try {
    const raw = sessionStorage.getItem(TABLE_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() - session.startedAt > TABLE_SESSION_TTL_MS) {
      clearTableSession();
      return null;
    }
    return session;
  } catch { return null; }
}

function setTableSession(tableNumber) {
  sessionStorage.setItem(TABLE_SESSION_KEY, JSON.stringify({
    table: tableNumber,
    startedAt: Date.now(),
  }));
}

function clearTableSession() {
  sessionStorage.removeItem(TABLE_SESSION_KEY);
  const url = new URL(window.location.href);
  url.searchParams.delete("table");
  window.history.replaceState({}, "", url.toString());
}

function showBanner(message, color) {
  const existingId = "table-session-banner";
  const existing = document.getElementById(existingId);
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.id = existingId;
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
    background: ${color}; color: white;
    padding: 14px 20px; text-align: center;
    font-family: sans-serif; font-size: 14px;
    display: flex; align-items: center; justify-content: center; gap: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;
  banner.innerHTML = `
    <span>${message}</span>
    <button onclick="document.getElementById('${existingId}').remove()"
      style="background:rgba(255,255,255,0.2);border:none;color:white;
             padding:4px 10px;border-radius:4px;cursor:pointer;font-size:13px;">✕</button>
  `;
  document.body.appendChild(banner);
}

// ─── MenuManager ─────────────────────────────────────────────────────────

class MenuManager {
  constructor() {
    this.currentCategory = "plats";
    this.menuData = window.LaKora?.menuData;
    if (!this.menuData) return;
    this.currentOrderId = null;
    this.lastOrderStatus = null;
    this.orderPollTimer = null;
    this.init();
  }

  init() {
    this.initTableSession();
    this.setupEventListeners();
    this.loadMenuItems();
    this.updateTableInfo();
    this.setupOrderStatusMonitoring();
  }

  // ─── Session table ──────────────────────────────────────────────────────

  initTableSession() {
    const urlParams = new URLSearchParams(window.location.search);
    const tableFromUrl = urlParams.get("table");

    if (tableFromUrl) {
      // Nouveau scan QR → démarre/renouvelle la session
      setTableSession(parseInt(tableFromUrl, 10));
    } else {
      // Pas de paramètre URL → vérifie session existante
      const session = getTableSession();
      if (!session) {
        showBanner("📍 Scannez le QR code de votre table pour commander.", "#8b4513");
      }
    }
  }

  getCurrentTable() {
    const session = getTableSession();
    return session?.table || null;
  }

  onOrderAccepted() {
    clearTableSession();
    showBanner("✅ Commande acceptée ! Scannez à nouveau le QR de votre table pour une nouvelle commande.", "#28a745");
    this.updateTableInfo();
  }

  // ─── Events ────────────────────────────────────────────────────────────

  setupEventListeners() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.switchCategory(e.target.dataset.category));
    });
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.switchOrderingMode(e.target.dataset.mode));
    });
  }

  switchCategory(category) {
    document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
    document.querySelector(`[data-category="${category}"]`)?.classList.add("active");
    document.querySelectorAll(".menu-section").forEach((s) => s.classList.remove("active"));
    document.getElementById(category)?.classList.add("active");
    this.currentCategory = category;
  }

  switchOrderingMode(mode) {
    document.querySelectorAll(".mode-btn").forEach((btn) => btn.classList.remove("active"));
    document.querySelector(`[data-mode="${mode}"]`)?.classList.add("active");
    localStorage.setItem("orderingMode", mode);
    if (window.cartManager) window.cartManager.updateDisplay();
  }

  // ─── Menu items ────────────────────────────────────────────────────────

  loadMenuItems() {
    Object.keys(this.menuData).forEach((category) => {
      const grid = document.getElementById(`${category}-grid`);
      if (grid) {
        grid.innerHTML = "";
        this.menuData[category].forEach((item) => grid.appendChild(this.createMenuItem(item)));
      }
    });
  }

  createMenuItem(item) {
    const menuItem = document.createElement("div");
    menuItem.className = "menu-item";
    const imgSrc = item.image || "/img/kora.jpg";

    menuItem.innerHTML = `
      <div class="thumb">
        <img src="${imgSrc}" alt="${item.name}" loading="lazy" />
      </div>
      <div class="item-content">
        <h3>${item.name}</h3>
        <p class="price">${window.LaKora.formatPrice(item.price)} CFA</p>
      </div>
      <div class="menu-actions">
        <button class="voir-btn" data-item-id="${item.id}">Voir</button>
        <input type="number" min="1" value="1" class="qty" data-item-id="${item.id}" aria-label="Quantité">
        <button class="add-btn" data-item-id="${item.id}">Ajouter</button>
      </div>
    `;

    const img = menuItem.querySelector(".thumb img");
    img.addEventListener("error", () => { img.onerror = null; img.src = "/img/kora.jpg"; });

    menuItem.querySelector(".voir-btn").addEventListener("click", () => this.showItemModal(item));
    menuItem.querySelector(".add-btn").addEventListener("click", () => {
      // Bloque si pas de session table active
      if (!this.getCurrentTable()) {
        showBanner("📍 Scannez le QR code de votre table pour commander.", "#c0392b");
        return;
      }
      const qty = parseInt(menuItem.querySelector(".qty").value);
      if (qty > 0) {
        this.addToCart(item, qty);
        menuItem.querySelector(".qty").value = 1;
      }
    });

    return menuItem;
  }

  showItemModal(item) {
    const modal       = document.getElementById("item-modal");
    const title       = document.getElementById("modal-title");
    const image       = document.getElementById("modal-image");
    const description = document.getElementById("modal-description");
    const price       = document.getElementById("modal-price");

    title.textContent = item.name;
    image.src = item.image || "/img/kora.jpg";
    image.alt = item.name;
    image.onerror = null;
    image.addEventListener("error", () => { image.src = "/img/kora.jpg"; });

    let content = `<p><strong>Description:</strong> ${item.description}</p>`;
    if (item.ingredients) content += `<p><strong>Ingrédients:</strong> ${item.ingredients}</p>`;
    description.innerHTML = content;

    price.textContent = window.LaKora.formatPrice(item.price);
    modal.classList.add("show");

    document.getElementById("modal-close").onclick = () => modal.classList.remove("show");
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove("show"); };
  }

  addToCart(item, quantity) {
    if (window.cartManager) window.cartManager.addItem(item, quantity);
  }

  updateTableInfo() {
    const currentTable = this.getCurrentTable();
    const tableElement = document.getElementById("current-table");
    if (tableElement) tableElement.textContent = currentTable || "-";
  }

  // ─── Polling statut commande ───────────────────────────────────────────

  setupOrderStatusMonitoring() {
    const storedOrderId = localStorage.getItem("currentOrderId");
    if (storedOrderId) this.startOrderPolling(storedOrderId, false);

    window.addEventListener("orderCreated", (event) => {
      const orderId = event.detail?.orderId;
      if (!orderId) return;
      localStorage.setItem("currentOrderId", orderId);
      this.startOrderPolling(orderId, true);
    });
  }

  startOrderPolling(orderId, resetStatus = false) {
    if (!orderId) return;
    if (this.orderPollTimer) { clearInterval(this.orderPollTimer); this.orderPollTimer = null; }
    this.currentOrderId = orderId;
    if (resetStatus) this.lastOrderStatus = null;
    this.fetchAndUpdateOrderStatus();
    this.orderPollTimer = setInterval(() => this.fetchAndUpdateOrderStatus(), 5000);
  }

  stopOrderPolling() {
    if (this.orderPollTimer) { clearInterval(this.orderPollTimer); this.orderPollTimer = null; }
    this.currentOrderId = null;
    this.lastOrderStatus = null;
    localStorage.removeItem("currentOrderId");
  }

  async fetchAndUpdateOrderStatus() {
    if (!this.currentOrderId) return;
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(this.currentOrderId)}`);
      if (!res.ok) { if (res.status === 404) this.stopOrderPolling(); return; }
      const order = await res.json();
      if (!order?.status) return;

      if (this.lastOrderStatus !== order.status) {
        this.lastOrderStatus = order.status;
        this.updateOrderStatusUI(order);

        // ✅ Session table expirée dès acceptation
        if (order.status === "accepted") this.onOrderAccepted();
      }

      if (order.status === "served" || order.status === "cancelled") this.stopOrderPolling();
    } catch {}
  }

  updateOrderStatusUI(order) {
    const ticketModal = document.getElementById("qr-modal");
    if (!ticketModal) return;
    const ticketInfo = ticketModal.querySelector(".ticket-info");
    if (!ticketInfo) return;

    let statusRow = document.getElementById("ticket-status-row");
    if (!statusRow) {
      statusRow = document.createElement("p");
      statusRow.id = "ticket-status-row";
      const strong = document.createElement("strong"); strong.textContent = "Statut: ";
      const span   = document.createElement("span");   span.id = "ticket-status";
      statusRow.appendChild(strong);
      statusRow.appendChild(span);
      ticketInfo.appendChild(statusRow);
    }

    const statusSpan = document.getElementById("ticket-status");
    if (!statusSpan) return;
    statusSpan.textContent = this.getStatusLabel(order.status);
    statusSpan.className = `status-badge status-${order.status}`;

    if (window.NotificationManager) {
      window.NotificationManager.showSuccess(
        order.orderId || order.id,
        "Statut mis à jour",
        `Votre commande est maintenant : ${this.getStatusLabel(order.status)}`,
        4000
      );
    }
    this.playNotificationSound();
  }

  getStatusLabel(status) {
    const labels = {
      pending:          "En attente",
      pending_scan:     "En attente (scan)",
      pending_approval: "En attente d'approbation",
      accepted:         "Acceptée",
      preparing:        "En préparation",
      ready:            "Prête",
      served:           "Servie",
      cancelled:        "Annulée",
    };
    return labels[status] || status;
  }

  playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.start(); o.stop(ctx.currentTime + 0.3);
    } catch {}
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  if (window.location.pathname.includes("menu.html")) {
    const waitForLaKora = () => {
      if (window.LaKora && window.LaKora.menuData) {
        window.menuManager = new MenuManager();
      } else {
        setTimeout(waitForLaKora, 100);
      }
    };
    waitForLaKora();
  }
});