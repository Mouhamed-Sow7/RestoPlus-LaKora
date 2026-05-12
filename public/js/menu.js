// Menu Management for RestoPlus

// ─── Constantes session ───────────────────────────────────────────────────
const TABLE_SESSION_KEY = "tableSession";
const TABLE_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const DISH_IMAGE_MAP = {
  // Plats
  "poulet yassa":
    "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&q=80",
  thieboudienne:
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80",
  "thiébou yapp":
    "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80",
  mafé: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80",
  pastels:
    "https://images.unsplash.com/photo-1599031565836-e54740c3de3a?w=400&q=80",
  thiakry:
    "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80",
  tiramisu:
    "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80",
  "sorbet mangue":
    "https://images.unsplash.com/photo-1567206563114-c179706e9c04?w=400&q=80",
  // Boissons
  bissap:
    "https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=400&q=80",
  "jus de citron":
    "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&q=80",
  "jus de gingembre":
    "https://images.unsplash.com/photo-1568909344668-6f14a07b56a0?w=400&q=80",
  "jus d'orange":
    "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80",
  "lait de coco":
    "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400&q=80",
  "jus de tamarin":
    "https://images.unsplash.com/photo-1596803244897-3b7d2cd09f23?w=400&q=80",
  // Fallback générique
  __default_plat__:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80",
  __default_boisson__:
    "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80",
};

function getItemImage(item, category = "plat") {
  const key = (item.name || "").toLowerCase().trim();
  return (
    DISH_IMAGE_MAP[key] ||
    item.image ||
    (category === "boisson"
      ? DISH_IMAGE_MAP["__default_boisson__"]
      : DISH_IMAGE_MAP["__default_plat__"])
  );
}
// ─── Helpers session table ────────────────────────────────────────────────

function getTableSession() {
  try {
    const raw = sessionStorage.getItem(TABLE_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    const expiry =
      session.expiresAt || session.startedAt + TABLE_SESSION_TTL_MS;
    if (Date.now() > expiry) {
      clearTableSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function setTableSession(tableNumber) {
  const now = Date.now();
  sessionStorage.setItem(
    TABLE_SESSION_KEY,
    JSON.stringify({
      table: tableNumber,
      startedAt: now,
      expiresAt: now + TABLE_SESSION_TTL_MS,
    }),
  );
}

function clearTableSession() {
  sessionStorage.removeItem(TABLE_SESSION_KEY);
  const url = new URL(window.location.href);
  url.searchParams.delete("table");
  window.history.replaceState({}, "", url.toString());
}

function showBanner(message, type = "info") {
  const colors = {
    success: { bg: "#E8F5E9", border: "#27AE60", text: "#1E7E44", icon: "✅" },
    warning: { bg: "#FFF8E1", border: "#E67E22", text: "#B7560D", icon: "⚠️" },
    info: { bg: "#FDF8F0", border: "#C0873F", text: "#9B6830", icon: "📍" },
    error: { bg: "#FDE8E8", border: "#E74C3C", text: "#C0392B", icon: "❌" },
  };

  // Rétrocompatibilité : si `type` est une couleur hex (#...), détecte et convertit
  if (typeof type === "string" && type.startsWith("#")) {
    if (type.includes("28a745") || type.includes("27AE60")) type = "success";
    else if (type.includes("C0873F") || type.includes("c0873f")) type = "info";
    else type = "info";
  }

  const style = colors[type] || colors.info;

  const existingId = "table-session-banner";
  const existing = document.getElementById(existingId);
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.id = existingId;
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
    background: ${style.bg};
    border-bottom: 2px solid ${style.border};
    color: ${style.text};
    padding: 12px 20px;
    text-align: center;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.88rem;
    font-weight: 600;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.10);
    animation: slideDown 0.3s ease;
  `;

  // Inject animation if not already present
  if (!document.getElementById("banner-anim")) {
    const style_el = document.createElement("style");
    style_el.id = "banner-anim";
    style_el.textContent = `
      @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    `;
    document.head.appendChild(style_el);
  }

  banner.innerHTML = `
    <span style="font-size:1.1rem">${style.icon}</span>
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" style="
      margin-left: auto; background: none; border: none; cursor: pointer;
      color: ${style.text}; font-size: 1rem; opacity: 0.6; padding: 0 4px; line-height: 1;
    ">✕</button>
  `;

  document.body.prepend(banner);

  // Auto-remove after 6 seconds
  setTimeout(() => banner.remove(), 6000);
}

// ─── MenuManager ─────────────────────────────────────────────────────────

class MenuManager {
  constructor() {
    this.currentCategory = "plats";
    this.menuData = window.RestoPlus?.menuData;
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
        showBanner(
          "📍 Scannez le QR code de votre table pour commander.",
          "#8b4513",
        );
      }
    }
  }

  getCurrentTable() {
    const session = getTableSession();
    return session?.table || null;
  }

  onOrderAccepted() {
    // La session a déjà été coupée à la soumission du panier.
    // Cette méthode est conservée pour compatibilité mais ne doit plus clearTableSession.
    this.updateTableInfo();
  }

  // ─── Events ────────────────────────────────────────────────────────────

  setupEventListeners() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.switchCategory(e.target.dataset.category),
      );
    });
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.switchOrderingMode(e.target.dataset.mode),
      );
    });
  }

  switchCategory(category) {
    document
      .querySelectorAll(".tab-btn")
      .forEach((btn) => btn.classList.remove("active"));
    document
      .querySelector(`[data-category="${category}"]`)
      ?.classList.add("active");
    document
      .querySelectorAll(".menu-section")
      .forEach((s) => s.classList.remove("active"));
    document.getElementById(category)?.classList.add("active");
    this.currentCategory = category;
  }

  switchOrderingMode(mode) {
    document
      .querySelectorAll(".mode-btn")
      .forEach((btn) => btn.classList.remove("active"));
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
        this.menuData[category].forEach((item) =>
          grid.appendChild(this.createMenuItem(item, category)),
        );
      }
    });
  }

  createMenuItem(item, category = "plats") {
    const menuItem = document.createElement("div");
    menuItem.className = "menu-item";
    const imgSrc = getItemImage(item, category);

    menuItem.innerHTML = `
      <div class="thumb">
        <img src="${imgSrc}"
          alt="${item.name}"
          loading="lazy"
          style="object-fit:cover;width:100%;height:100%;border-radius:inherit;"
          onerror="this.onerror=null;this.src='${DISH_IMAGE_MAP["__default_plat__"]}'"
        />
      </div>
      <div class="item-content">
        <h3>${item.name}</h3>
        <p class="price">${window.RestoPlus.formatPrice(item.price)} CFA</p>
      </div>
      <div class="menu-actions">
        <button class="voir-btn" data-item-id="${item.id}">Voir</button>
        <div class="qty-counter" data-item-id="${item.id}" aria-label="Quantité">
          <button type="button" class="qty-btn qty-minus" aria-label="Diminuer">−</button>
          <input type="text" value="1" class="qty" data-item-id="${item.id}" aria-label="Quantité" readonly>
          <button type="button" class="qty-btn qty-plus" aria-label="Augmenter">+</button>
        </div>
        <button class="add-btn" data-item-id="${item.id}">Ajouter</button>
      </div>
    `;

    const img = menuItem.querySelector(".thumb img");
    img.addEventListener("error", () => {
      img.onerror = null;
      img.src = DISH_IMAGE_MAP["__default_plat__"];
    });

    menuItem
      .querySelector(".voir-btn")
      .addEventListener("click", () => this.showItemModal(item));

    // Qty counter (+/-), min 1
    const qtyInput = menuItem.querySelector(".qty");
    const btnMinus = menuItem.querySelector(".qty-minus");
    const btnPlus = menuItem.querySelector(".qty-plus");
    const clampQty = (n) => Math.max(1, Number.isFinite(n) ? n : 1);
    const setQty = (n) => {
      qtyInput.value = String(clampQty(n));
    };

    btnMinus?.addEventListener("click", () =>
      setQty(parseInt(qtyInput.value, 10) - 1),
    );
    btnPlus?.addEventListener("click", () =>
      setQty(parseInt(qtyInput.value, 10) + 1),
    );

    menuItem.querySelector(".add-btn").addEventListener("click", () => {
      // Bloque si pas de session table active
      if (!this.getCurrentTable()) {
        showBanner(
          "📍 Scannez le QR code de votre table pour commander.",
          "#c0392b",
        );
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
    const modal = document.getElementById("item-modal");
    const title = document.getElementById("modal-title");
    const image = document.getElementById("modal-image");
    const description = document.getElementById("modal-description");
    const price = document.getElementById("modal-price");

    title.textContent = item.name;
    image.src = getItemImage(item, item.category || "plat");
    image.alt = item.name;
    image.onerror = null;
    image.addEventListener("error", () => {
      image.onerror = null;
      image.src = DISH_IMAGE_MAP["__default_plat__"];
    });

    let content = `<p><strong>Description:</strong> ${item.description}</p>`;
    if (item.ingredients)
      content += `<p><strong>Ingrédients:</strong> ${item.ingredients}</p>`;
    description.innerHTML = content;

    price.textContent = window.RestoPlus.formatPrice(item.price);
    modal.classList.add("show");

    document.getElementById("modal-close").onclick = () =>
      modal.classList.remove("show");
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.remove("show");
    };
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
      // Déconnecte la session table immédiatement après commande soumise
      // Le client doit re-scanner pour commander à nouveau
      clearTableSession();
      showBanner(
        "✅ Commande envoyée ! Votre ticket QR a été généré. Attendez la validation du serveur.",
        "#C0873F",
      );
      this.startOrderPolling(orderId, true);
    });
  }

  startOrderPolling(orderId, resetStatus = false) {
    if (!orderId) return;
    if (this.orderPollTimer) {
      clearInterval(this.orderPollTimer);
      this.orderPollTimer = null;
    }
    this.currentOrderId = orderId;
    if (resetStatus) this.lastOrderStatus = null;
    this.fetchAndUpdateOrderStatus();
    this.orderPollTimer = setInterval(
      () => this.fetchAndUpdateOrderStatus(),
      5000,
    );
  }

  stopOrderPolling() {
    if (this.orderPollTimer) {
      clearInterval(this.orderPollTimer);
      this.orderPollTimer = null;
    }
    this.currentOrderId = null;
    this.lastOrderStatus = null;
    localStorage.removeItem("currentOrderId");
  }

  async fetchAndUpdateOrderStatus() {
    if (!this.currentOrderId) return;
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(this.currentOrderId)}`,
      );
      if (!res.ok) {
        if (res.status === 404) this.stopOrderPolling();
        return;
      }
      const order = await res.json();
      if (!order?.status) return;

      if (this.lastOrderStatus !== order.status) {
        this.lastOrderStatus = order.status;
        this.updateOrderStatusUI(order);

        if (order.status === "accepted") {
          // Session déjà coupée à la soumission — affiche juste la confirmation
          showBanner(
            "✅ Commande acceptée par le serveur ! Elle est en cours de préparation.",
            "#27AE60",
          );
          this.stopOrderPolling();
        }
      }

      if (order.status === "served" || order.status === "cancelled")
        this.stopOrderPolling();
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

    if (window.NotificationManager) {
      window.NotificationManager.showSuccess(
        order.orderId || order.id,
        "Statut mis à jour",
        `Votre commande est maintenant : ${this.getStatusLabel(order.status)}`,
        4000,
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
    } catch {}
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  if (window.location.pathname.includes("menu.html")) {
    const waitForRestoPlus = () => {
      if (window.RestoPlus && window.RestoPlus.menuData) {
        window.menuManager = new MenuManager();
      } else {
        setTimeout(waitForRestoPlus, 100);
      }
    };
    waitForRestoPlus();
  }
});
