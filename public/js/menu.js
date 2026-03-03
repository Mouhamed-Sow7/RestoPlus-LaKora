// Menu Management for La Kora Restaurant

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
    this.setupEventListeners();
    this.loadMenuItems();
    this.updateTableInfo();
    this.setupOrderStatusMonitoring();
  }

  setupEventListeners() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.switchCategory(e.target.dataset.category);
      });
    });

    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.switchOrderingMode(e.target.dataset.mode);
      });
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

  loadMenuItems() {
    Object.keys(this.menuData).forEach((category) => {
      const grid = document.getElementById(`${category}-grid`);
      if (grid) {
        grid.innerHTML = "";
        this.menuData[category].forEach((item) => {
          grid.appendChild(this.createMenuItem(item));
        });
      }
    });
  }

  createMenuItem(item) {
    const menuItem = document.createElement("div");
    menuItem.className = "menu-item";

    // Image : utilise celle du menu.json, fallback sur /img/kora.jpg si erreur
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

    // Fallback image locale si 404
    const img = menuItem.querySelector(".thumb img");
    img.addEventListener("error", () => {
      img.onerror = null;
      img.src = "/img/kora.jpg";
    });

    menuItem.querySelector(".voir-btn").addEventListener("click", () => this.showItemModal(item));
    menuItem.querySelector(".add-btn").addEventListener("click", () => {
      const qty = parseInt(menuItem.querySelector(".qty").value);
      if (qty > 0) {
        this.addToCart(item, qty);
        menuItem.querySelector(".qty").value = 1;
      }
    });

    return menuItem;
  }

  showItemModal(item) {
    const modal = document.getElementById("item-modal");
    const title = document.getElementById("modal-title");
    const image = document.getElementById("modal-image");
    const description = document.getElementById("modal-description");
    const price = document.getElementById("modal-price");

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
    const currentTable = window.tableDetector?.getCurrentTable() || null;
    const tableElement = document.getElementById("current-table");
    if (tableElement && currentTable) tableElement.textContent = currentTable;
  }

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
      }
      if (order.status === "served" || order.status === "cancelled") this.stopOrderPolling();
    } catch (err) {}
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
      const strong = document.createElement("strong");
      strong.textContent = "Statut: ";
      const span = document.createElement("span");
      span.id = "ticket-status";
      statusRow.appendChild(strong);
      statusRow.appendChild(span);
      ticketInfo.appendChild(statusRow);
    }

    const statusSpan = document.getElementById("ticket-status");
    if (!statusSpan) return;
    statusSpan.textContent = this.getStatusLabel(order.status);
    statusSpan.className = `status-badge status-${order.status}`;

    // Toast visuel + son quand le statut change
    if (window.NotificationManager) {
      const label = this.getStatusLabel(order.status);
      window.NotificationManager.showSuccess(
        order.orderId || order.id,
        "Statut mis à jour",
        `Votre commande est maintenant : ${label}`,
        4000
      );
    }
    this.playNotificationSound();
  }

  getStatusLabel(status) {
    const labels = {
      pending: "En attente",
      pending_scan: "En attente (scan)",
      pending_approval: "En attente d'approbation",
      accepted: "Acceptée",
      preparing: "En préparation",
      ready: "Prête",
      served: "Servie",
      cancelled: "Annulée",
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
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.start();
      o.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // AudioContext non supporté ou bloqué : on ignore simplement
    }
  }
}

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