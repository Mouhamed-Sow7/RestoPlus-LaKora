// Admin Panel Management for La Kora Restaurant

class AdminManager {
  constructor() {
    this.currentOrder = null;
    this.orders = [];
    this.scanner = null;
    this.currentManagingOrder = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadOrders();
    this.initializeQRScanner();
    this.setupMenuToggle();
    this.setupAutoRefresh();
  }

  // Setup auto-refresh for new orders
  setupAutoRefresh() {
    // Check for new orders frequently when tab visible
    const REFRESH_MS = 4000;
    this._refreshTimer = setInterval(() => {
      if (!document.hidden) this.loadOrders(true); // Silent refresh when visible
    }, REFRESH_MS);

    // Also listen for focus events to refresh when admin comes back to tab
    window.addEventListener("focus", () => {
      this.loadOrders(true);
    });

    // Refresh immediately when tab becomes visible
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.loadOrders(true);
    });
  }

  // Setup hamburger menu toggle
  setupMenuToggle() {
    const menuToggle = document.getElementById("menu-toggle");
    const adminNav = document.getElementById("admin-nav");

    if (menuToggle && adminNav) {
      menuToggle.addEventListener("click", () => {
        menuToggle.classList.toggle("active");
        adminNav.classList.toggle("active");
      });

      // Close menu when clicking outside
      document.addEventListener("click", (e) => {
        if (
          !e.target.closest(".admin-nav") &&
          !e.target.closest(".menu-toggle") &&
          adminNav.classList.contains("active")
        ) {
          menuToggle.classList.remove("active");
          adminNav.classList.remove("active");
        }
      });

      // Close menu when clicking on nav links
      const navLinks = adminNav.querySelectorAll(".nav-link");
      navLinks.forEach((link) => {
        link.addEventListener("click", () => {
          menuToggle.classList.remove("active");
          adminNav.classList.remove("active");
        });
      });
    }
  }

  setupEventListeners() {
    // Order action buttons (these are handled by the new modal system)
    // Keeping for backward compatibility but they're not used in the new UI

    // Status filter
    const statusFilter = document.getElementById("status-filter");
    if (statusFilter) {
      statusFilter.addEventListener("change", (e) => {
        this.filterOrders(e.target.value);
      });
    }
  }

  initializeQRScanner() {
    // Wait for Html5Qrcode to be available
    this.waitForQRScannerLibrary()
      .then(() => {
        if (typeof Html5Qrcode !== "undefined" && typeof QRScannerManager !== "undefined") {
          // Create admin-specific scanner manager
          window.qrScannerAdmin = new QRScannerManager(
            "qr-scanner-container-admin",
            "qr-reader",
            "toggleCamBtn-admin",
            "camera-select-admin",
            "camera-selection-admin"
          );
          
          // Override handleQRScan and processQRCodeScan for admin page
          window.qrScannerAdmin.handleQRScan = (decodedText) => {
            this.handleQRScan(decodedText);
          };
          
          // Also override processQRCodeScan to ensure admin handling
          window.qrScannerAdmin.processQRCodeScan = (decodedText) => {
            // Guard: ignore if a modal is already open or already processing
            if (
              window.qrScannerAdmin.processingScan ||
              document.getElementById("order-approval-modal") ||
              document.getElementById("order-fusion-modal")
            ) {
              return;
            }
            window.qrScannerAdmin.processingScan = true;
            // On admin page, always use admin's handleQRScan
            this.handleQRScan(decodedText);
          };
          
          // Store reference to admin manager for scanner
          window.adminManager = this;
        } else {
          const qrReader = document.getElementById("qr-reader");
          if (qrReader) {
            qrReader.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
              <p>Scanner QR non disponible</p>
              <p>Veuillez rafraîchir la page</p>
            </div>
          `;
          }
        }
      })
      .catch((error) => {
        const qrReader = document.getElementById("qr-reader");
        if (qrReader) {
          qrReader.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: #666;">
            <p>Scanner QR non disponible</p>
            <p>Veuillez rafraîchir la page</p>
          </div>
        `;
        }
      });
  }

  waitForQRScannerLibrary() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait

      const checkLibrary = () => {
        attempts++;
        if (typeof Html5Qrcode !== "undefined") {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error("Html5Qrcode library not found"));
        } else {
          setTimeout(checkLibrary, 100);
        }
      };
      checkLibrary();
    });
  }

  showRestartButton() {
    const qrReader = document.getElementById("qr-reader");
    if (qrReader) {
      const restartBtn = document.createElement("button");
      restartBtn.textContent = "Redémarrer le scanner";
      restartBtn.className = "btn btn-primary";
      restartBtn.style.marginTop = "10px";
      restartBtn.onclick = () => {
        this.restartScanner();
      };

      // Remove existing restart button if any
      const existingBtn = qrReader.querySelector(".restart-scanner-btn");
      if (existingBtn) {
        existingBtn.remove();
      }

      restartBtn.className += " restart-scanner-btn";
      qrReader.appendChild(restartBtn);
    }
  }

  // Animation is now handled by CSS classes in QRScannerManager

  // Camera controls are now handled by QRScannerManager

  restartScanner() {
    if (window.qrScannerAdmin) {
      // Stop camera if active
      if (window.qrScannerAdmin.html5QrCode && window.qrScannerAdmin.html5QrCode.isScanning) {
        window.qrScannerAdmin.html5QrCode.stop().then(() => {
          window.qrScannerAdmin.resetCameraState();
          // Reinitialize scanner
          setTimeout(() => {
            this.initializeQRScanner();
          }, 100);
        }).catch(() => {
          window.qrScannerAdmin.resetCameraState();
          setTimeout(() => {
            this.initializeQRScanner();
          }, 100);
        });
      } else {
        window.qrScannerAdmin.resetCameraState();
        setTimeout(() => {
          this.initializeQRScanner();
        }, 100);
      }
    } else {
      // Fallback: reinitialize
      setTimeout(() => {
        this.initializeQRScanner();
      }, 100);
    }
  }

  updateScanningAnimationSize(animationId, containerId) {
    const container = document.getElementById(containerId);
    const animation = document.getElementById(animationId);
    if (container && animation) {
      const rect = container.getBoundingClientRect();
      animation.style.width = `${rect.width}px`;
      animation.style.height = `${rect.height}px`;
    }
  }

  handleQRScan(decodedText) {
    // Clear loading state when handling scan
    if (window.qrScannerAdmin && typeof window.qrScannerAdmin.hideScanLoader === "function") {
      window.qrScannerAdmin.hideScanLoader();
    }

    try {
      // Try to parse as JSON (table QR code or order QR code)
      const qrData = JSON.parse(decodedText);

      if (qrData.table && qrData.url) {
        // This is a table QR code - register table and redirect to menu
        // Store the scanned table info for the menu page
        sessionStorage.setItem(
          "scannedTable",
          JSON.stringify({
            table: qrData.table,
            chairs: qrData.chairs,
            location: qrData.location,
            scannedAt: new Date().toISOString(),
          })
        );

        // Show notification and redirect
        NotificationManager.showSuccess(
          "Table détectée !",
          `Table ${qrData.table} (${qrData.chairs} chaises - ${qrData.location})`,
          2000
        );

        setTimeout(() => {
          window.location.href = qrData.url;
        }, 2000);
        return;
      }

      if (qrData.orderId || qrData.qrTicket) {
        // This is an order QR code - fetch from backend (may be pending_approval)
        const orderId = qrData.orderId || qrData.qrTicket;
        this.handleOrderScan(orderId, qrData.table).catch(() => {
          NotificationManager.showSuccess(
            orderId,
            "Erreur",
            "Impossible de traiter cette commande",
            3000
          );
        });
        return;
      }
    } catch (error) {
      // Not JSON, try as direct order ID
      const orderId = decodedText;
      if (orderId && orderId.startsWith("ORD-")) {
        this.handleOrderScan(orderId).catch(() => {
          NotificationManager.showSuccess(
            orderId,
            "Erreur",
            "Impossible de traiter cette commande",
            3000
          );
        });
        return;
      }
    }

    // QR Code not recognized
    NotificationManager.showSuccess(
      null,
      "Erreur",
      "QR Code non reconnu. Veuillez scanner un QR code de table ou de commande valide.",
      3000
    );
  }

  // Handle order scanning with table detection and fusion logic
  async handleOrderScan(orderId, scannedTable = null) {
    try {
      const token =
        sessionStorage.getItem("adminToken") ||
        localStorage.getItem("adminToken");

      if (!token) {
        NotificationManager.showSuccess(
          orderId,
          "Erreur",
          "Authentification requise",
          3000
        );
        return;
      }

      // Fetch order from backend (include pending_approval orders)
      const res = await fetch(`/api/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Order not found: ${res.status}`);
      }

      const scannedOrder = await res.json();
      const orderTable = scannedOrder.table || scannedTable;

      // If this order is already processed, just show a notice and stop here
      const status = (scannedOrder.status || "").toLowerCase();
      const alreadyHandledStatuses = [
        "accepted",
        "preparing",
        "ready",
        "served",
        "cancelled",
      ];
      if (alreadyHandledStatuses.includes(status)) {
        const statusText = this.getStatusText(scannedOrder.status);
        if (window.NotificationManager) {
          window.NotificationManager.showSuccess(
            orderId,
            "Commande déjà traitée",
            `Cette commande est déjà ${statusText}.`,
            3000
          );
        }
        this.restartScanner();
        return;
      }

      if (!orderTable) {
        NotificationManager.showSuccess(
          orderId,
          "Erreur",
          "Impossible de détecter la table de cette commande",
          3000
        );
        return;
      }

      // Find other pending_approval orders for the same table
      const relatedOrdersRes = await fetch(
        `/api/orders?table=${orderTable}&status=pending_approval&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const relatedOrdersData = await relatedOrdersRes.json();
      const relatedOrders = Array.isArray(relatedOrdersData.orders)
        ? relatedOrdersData.orders
        : Array.isArray(relatedOrdersData)
        ? relatedOrdersData
        : [];

      // Filter out the current order and get others
      const otherOrders = relatedOrders.filter(
        (o) => (o.orderId || o.id) !== orderId
      );

      // Check if we're in the middle of a fusion flow (scanning more orders)
      if (this.pendingFusionOrders && this.pendingFusionTable === orderTable) {
        // Add scanned order to pending fusion list
        const allPendingOrders = [...this.pendingFusionOrders, scannedOrder];
        // Find any other orders we might have missed
        const additionalOrders = relatedOrders.filter(
          (o) =>
            !allPendingOrders.some(
              (po) => (po.orderId || po.id) === (o.orderId || o.id)
            )
        );
        
        // Combine all orders
        const combinedOrders = [...this.pendingFusionOrders, scannedOrder, ...additionalOrders];
        
        // Store combined orders before clearing state
        const ordersToShow = combinedOrders;
        
        // Clear pending fusion state
        this.pendingFusionOrders = null;
        this.pendingFusionTable = null;
        
        // Show fusion modal with all orders (scanned order + previous orders)
        // Pass only other orders (excluding scannedOrder which will be added in showOrderFusionModal)
        const otherOrdersForModal = ordersToShow.filter(
          (o) => (o.orderId || o.id) !== (scannedOrder.orderId || scannedOrder.id)
        );
        this.showOrderFusionModal(
          scannedOrder,
          otherOrdersForModal,
          orderTable
        );
      } else if (otherOrders.length > 0) {
        // First time detecting multiple orders - show fusion modal
        this.showOrderFusionModal(scannedOrder, otherOrders, orderTable);
      } else {
        // Single order - show approval modal
        this.showOrderApprovalModal(scannedOrder);
      }
    } catch (error) {
      NotificationManager.showSuccess(
        orderId,
        "Erreur",
        "Impossible de charger la commande",
        3000
      );
    }
  }

  displayOrderDetails(order) {
    this.currentOrder = order;

    // Update order details display
    document.getElementById("order-id").textContent = order.id;
    document.getElementById("order-table").textContent = order.table;
    document.getElementById("order-mode").textContent =
      order.mode === "group" ? "Groupe" : "Individuel";
    document.getElementById("order-total").textContent = this.formatPrice(
      order.total
    );
    document.getElementById("order-status").textContent = this.getStatusText(
      order.status
    );
    document.getElementById(
      "order-status"
    ).className = `status-badge ${order.status}`;

    // Update order items
    const orderItems = document.getElementById("order-items");
    orderItems.innerHTML = order.items
      .map(
        (item) => `
            <div class="order-item">
                <span>${item.name} x${item.quantity}</span>
                <span>${this.formatPrice(item.price * item.quantity)} CFA</span>
            </div>
        `
      )
      .join("");

    // Show order details
    document.getElementById("order-details").style.display = "block";
  }

  async loadOrders(silent = false) {
    try {
      let res, data;

      // Use authenticated fetch if available
      if (window.adminAuth && window.adminAuth.authenticatedFetch) {
        res = await window.adminAuth.authenticatedFetch(
          "/api/orders?limit=200&includePendingApproval=true"
        );
        data = await res.json();
      } else {
        // Fallback to regular fetch with token
        const token =
          sessionStorage.getItem("adminToken") ||
          localStorage.getItem("adminToken");

        if (!token) {
          this.orders = [];
          this.displayOrders();
          return Promise.resolve();
        }

        res = await fetch("/api/orders?limit=200&includePendingApproval=true", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        data = await res.json();
      }

      this.orders = Array.isArray(data.orders)
        ? data.orders
        : Array.isArray(data)
        ? data
        : [];
      this.displayOrders();
      return Promise.resolve();
    } catch (e) {
      this.orders = [];
      this.displayOrders();
      return Promise.reject(e);
    }
  }

  displayOrders() {
    const container = document.getElementById("orders-list");
    if (!container) return;

    if (!this.orders || this.orders.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #666; padding: 2rem;">Aucune commande</p>';
      return;
    }

    // pending_approval + pending_scan + pending → colonne unique "À valider"
    const PENDING_STATUSES = ["pending_approval", "pending_scan", "pending"];

    const statusConfig = [
      { key: "pending_approval", title: "À valider",       emoji: "🔔" },
      { key: "accepted",         title: "Acceptées",       emoji: "✅" },
      { key: "preparing",        title: "En préparation",  emoji: "👨‍🍳" },
      { key: "ready",            title: "Prêtes",          emoji: "🍽️" },
      { key: "served",           title: "Servies",         emoji: "🎉" },
      { key: "cancelled",        title: "Annulées",        emoji: "❌" },
    ];

    const grouped = {};
    statusConfig.forEach((s) => (grouped[s.key] = []));

    this.orders.forEach((rawOrder) => {
      const o = rawOrder || {};
      if (PENDING_STATUSES.includes(o.status)) {
        grouped["pending_approval"].push(o);
      } else if (grouped[o.status] !== undefined) {
        grouped[o.status].push(o);
      }
    });

    const renderCard = (order, isPending) => {
      const id = order.orderId || order.id || "—";
      const shortId = id.length > 20 ? id.substring(id.length - 12) : id;
      const safeTable = typeof order.table !== "undefined" ? order.table : "—";
      const safeTotal = this.formatPrice(order.total || 0);
      const safeItemCount = (order.items && order.items.length) || 0;
      const safeTime = order.timestamp
        ? new Date(order.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        : "—";
      const itemsPreview = (order.items || [])
        .slice(0, 2)
        .map((i) => `${i.name}${i.quantity > 1 ? " x" + i.quantity : ""}`)
        .join(", ");
      const moreItems = safeItemCount > 2 ? ` +${safeItemCount - 2}` : "";
      const payBadge = order.paymentStatus === "paid"
        ? `<span class="pay-badge paid">💳 Payé</span>`
        : `<span class="pay-badge pending-pay">⏳ Impayé</span>`;

      const actionButtons = isPending ? `
          <div class="kanban-approval-actions">
            <button class="btn-kanban-approve" data-action="approve" data-order-id="${id}">
              ✅ Approuver
            </button>
            <button class="btn-kanban-reject" data-action="reject" data-order-id="${id}">
              ❌ Rejeter
            </button>
          </div>
          <button class="btn-kanban-manage" data-action="manage" data-order-id="${id}">
            Détails →
          </button>` : `
          <button class="btn-kanban-manage" data-action="manage" data-order-id="${id}">
            Gérer →
          </button>`;

      return `
        <div class="order-card-kanban ${order.status || ""}" data-order-id="${id}">
          <div class="kanban-card-top">
            <span class="kanban-table">Table ${safeTable}</span>
            <span class="kanban-time">${safeTime}</span>
          </div>
          <div class="kanban-card-id">${shortId}</div>
          <div class="kanban-items-preview">${itemsPreview}${moreItems}</div>
          <div class="kanban-card-bottom">
            <span class="kanban-total">${safeTotal} CFA</span>
            ${payBadge}
          </div>
          ${actionButtons}
        </div>`;
    };

    const renderColumn = (statusKey, title, emoji, items) => {
      const safeItems = items || [];
      const isPending = statusKey === "pending_approval";
      const cards = safeItems.length > 0
        ? safeItems.map((order) => renderCard(order, isPending)).join("")
        : `<div class="kanban-empty">Aucune commande</div>`;

      return `
      <div class="orders-column status-${statusKey}">
        <div class="orders-column-header">
          <span class="col-emoji">${emoji}</span>
          <span class="col-title">${title}</span>
          <span class="col-count">${safeItems.length}</span>
        </div>
        <div class="orders-column-body">
          ${cards}
        </div>
      </div>`;
    };

    container.innerHTML = statusConfig
      .map((s) => renderColumn(s.key, s.title, s.emoji, grouped[s.key]))
      .join("");

    // Event delegation — bound only once
    if (!this._ordersClickDelegationBound) {
      container.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        const action  = btn.getAttribute("data-action");
        const orderId = btn.getAttribute("data-order-id");
        if (!orderId) return;

        if (action === "manage") {
          this.openManagementModal(orderId);
        } else if (action === "approve") {
          await this.manualApproveOrder(orderId, btn);
        } else if (action === "reject") {
          await this.manualRejectOrder(orderId, btn);
        } else {
          await this.updateOrderStatus(action, orderId);
        }
      });
      this._ordersClickDelegationBound = true;
    }
  }

  // Approbation manuelle (quand la caméra ne fonctionne pas)
  async manualApproveOrder(orderId, btn) {
    const card = btn.closest(".order-card-kanban");
    if (card) card.style.opacity = "0.5";
    btn.disabled = true;
    btn.textContent = "⏳...";
    try {
      const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken");
      const res = await fetch(`/api/orders/${orderId}/scan/validate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const idx = this.orders.findIndex((o) => (o.orderId || o.id) === orderId);
      if (idx !== -1) this.orders[idx].status = "accepted";
      NotificationManager.showSuccess(orderId, "Commande approuvée !", `Commande ${orderId} validée manuellement`, 3000);
      this.displayOrders();
    } catch (err) {
      if (card) card.style.opacity = "1";
      btn.disabled = false;
      btn.textContent = "✅ Approuver";
      NotificationManager.showSuccess(orderId, "Erreur", "Impossible d'approuver la commande", 3000);
    }
  }

  // Rejet manuel
  async manualRejectOrder(orderId, btn) {
    const card = btn.closest(".order-card-kanban");
    if (card) card.style.opacity = "0.5";
    btn.disabled = true;
    btn.textContent = "⏳...";
    try {
      const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken");
      const res = await fetch(`/api/orders/${orderId}/scan/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const idx = this.orders.findIndex((o) => (o.orderId || o.id) === orderId);
      if (idx !== -1) this.orders[idx].status = "cancelled";
      NotificationManager.showSuccess(orderId, "Commande rejetée", `Commande ${orderId} rejetée`, 3000);
      this.displayOrders();
    } catch (err) {
      if (card) card.style.opacity = "1";
      btn.disabled = false;
      btn.textContent = "❌ Rejeter";
      NotificationManager.showSuccess(orderId, "Erreur", "Impossible de rejeter la commande", 3000);
    }
  }
  filterOrders(status) {
    const ordersList = document.getElementById("orders-list");
    let filteredOrders = this.orders || [];
    if (status !== "all") {
      filteredOrders = filteredOrders.filter(
        (order) => order.status === status
      );
    }

    if (filteredOrders.length === 0) {
      ordersList.innerHTML =
        '<p style="text-align: center; color: #666; padding: 2rem;">Aucune commande</p>';
      return;
    }

    const section = (title, statusKey, items) => {
      const cards = items
        .map((order) => {
          const id = order.orderId || order.id || "—";
          const safeTimestamp = order.timestamp
            ? new Date(order.timestamp).toLocaleString("fr-FR")
            : "—";

          return `
        <div class="order-card-small ${order.status}" data-order-id="${id}">
          <div class="order-card-header">
            <div class="order-id">${id}</div>
            <div class="order-time">${safeTimestamp}</div>
          </div>
        </div>`;
        })
        .join("");

      return `
        <div class="orders-column" data-status="${statusKey}" style="min-width:260px;">
          <h3 style="margin:0 0 8px 0;">${title}</h3>
          ${cards || '<div style="color:#666;">Aucune</div>'}
        </div>`;
    };

    ordersList.style.display = "grid";
    ordersList.style.gridTemplateColumns =
      "repeat(auto-fit, minmax(260px, 1fr))";
    ordersList.style.gap = "12px";
    ordersList.innerHTML = [
      section(
        status === "all" ? "Toutes" : this.getStatusText(status),
        status,
        filteredOrders
      ),
    ].join("");
  }

  getStatusText(status) {
    const statusTexts = {
      pending_scan: "En attente (scan)",
      pending_approval: "En attente d'approbation",
      pending: "En attente",
      accepted: "Acceptée",
      preparing: "En préparation",
      ready: "Prête",
      cancelled: "Annulée",
    };
    return statusTexts[status] || status;
  }

  formatPrice(price) {
    try {
      return new Intl.NumberFormat("fr-FR").format(price || 0);
    } catch (_) {
      return price;
    }
  }

  // Management Modal Methods
  openManagementModal(orderId) {
    // Try to find order in current list
    let order = this.orders.find((o) => (o.orderId || o.id) === orderId);

    // If not found, refresh orders and try again (for newly created orders)
    if (!order) {
      // Try to fetch this specific order immediately
      this.loadOrders(true).then(() => {
        order = this.orders.find((o) => (o.orderId || o.id) === orderId);
        if (order) {
          this.displayOrderInModal(order);
        } else {
          NotificationManager.showSuccess(
            orderId,
            "Erreur",
            `Commande ${orderId} introuvable`,
            2000
          );
        }
      });
      return;
    }

    this.displayOrderInModal(order);
  }

  displayOrderInModal(order) {
    this.currentManagingOrder = order;
    const modal = document.getElementById("order-management-modal");
    const orderIdElement = document.getElementById("modal-order-id");
    const orderDetailsElement = document.getElementById("modal-order-details");
    const orderDateElement = document.getElementById("modal-order-date");

    orderIdElement.textContent = order.orderId || order.id;

    const payIcon = order.paymentStatus === "paid" ? "💳 Payé" : "⏳ Impayé";
    const itemsList = (order.items || [])
      .map((i) => `<span class="modal-item-chip">${i.name} ×${i.quantity || 1} — ${this.formatPrice((i.price || 0) * (i.quantity || 1))} CFA</span>`)
      .join("");

    orderDetailsElement.innerHTML = `
      <div class="modal-meta-row">
        <span>🪑 Table <strong>${order.table}</strong></span>
        <span>📦 ${(order.items || []).length} article(s)</span>
        <span>💰 <strong>${this.formatPrice(order.total)} CFA</strong></span>
        <span class="modal-pay-badge ${order.paymentStatus === "paid" ? "paid" : "unpaid"}">${payIcon}</span>
      </div>
      <div class="modal-items-list">${itemsList}</div>`;

    orderDateElement.textContent = order.timestamp
      ? new Date(order.timestamp).toLocaleString("fr-FR")
      : "—";

    modal.classList.add("show");
    this.setupModalEventListeners();
  }

  setupModalEventListeners() {
    const closeBtn = document.getElementById("close-management-modal");
    const modal = document.getElementById("order-management-modal");

    if (closeBtn) {
      closeBtn.onclick = () => modal.classList.remove("show");
    }

    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.remove("show");
    };

    // Injecter les boutons d'action en 2 rangées dans le modal
    const actionsContainer = modal.querySelector(".modal-actions");
    if (actionsContainer && !actionsContainer.dataset.rendered) {
      actionsContainer.dataset.rendered = "1";
      actionsContainer.innerHTML = `
        <div class="modal-actions-row modal-actions-row-top">
          <button class="action-btn btn-accepted"   data-action="accepted">✅ Accepter</button>
          <button class="action-btn btn-preparing"  data-action="preparing">👨‍🍳 Préparer</button>
          <button class="action-btn btn-ready"      data-action="ready">🍽️ Prête</button>
        </div>
        <div class="modal-actions-row modal-actions-row-bottom">
          <button class="action-btn btn-served"     data-action="served">🎉 Servie</button>
          <button class="action-btn btn-cancelled"  data-action="cancelled">⛔ Annuler</button>
          <button class="action-btn btn-delete"     data-action="delete">🗑️ Supprimer</button>
        </div>`;
    }

    // Action buttons — fermeture IMMÉDIATE puis fetch en arrière-plan
    const actionButtons = modal.querySelectorAll(".action-btn");
    actionButtons.forEach((btn) => {
      btn.onclick = (e) => {
        const action = e.currentTarget.getAttribute("data-action");
        if (!this.currentManagingOrder) return;
        const orderId = this.currentManagingOrder.orderId || this.currentManagingOrder.id;

        // Suppression → confirmation d'abord
        if (action === "delete") {
          this._confirmDelete(orderId, modal);
          return;
        }

        // 1. Mise à jour optimiste locale immédiate
        const orderIndex = this.orders.findIndex((o) => (o.orderId || o.id) === orderId);
        if (orderIndex !== -1) {
          this.orders[orderIndex].status = action;
        }

        // 2. Fermer le modal IMMÉDIATEMENT
        modal.classList.remove("show");

        // 3. Rafraîchir l'affichage immédiatement
        this.displayOrders();

        // 4. Fetch en arrière-plan sans bloquer l'UI
        this.updateOrderStatus(action, orderId);
      };
    });
  }

  // Modal de confirmation suppression
  _confirmDelete(orderId, parentModal) {
    const existing = document.getElementById("confirm-delete-modal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "confirm-delete-modal";
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.55);
      display:flex;align-items:center;justify-content:center;z-index:20000;`;

    overlay.innerHTML = `
      <div style="background:white;border-radius:14px;padding:2rem;max-width:360px;
                  width:90%;box-shadow:0 20px 40px rgba(0,0,0,0.25);text-align:center;">
        <div style="font-size:2.5rem;margin-bottom:0.75rem;">🗑️</div>
        <h3 style="margin:0 0 0.5rem;color:#1a1a1a;font-size:1.15rem;">
          Supprimer la commande ?
        </h3>
        <p style="margin:0 0 1.5rem;color:#666;font-size:0.9rem;line-height:1.5;">
          Cette action est <strong>irréversible</strong>.<br>
          La commande <code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;">
          ${orderId}</code> sera définitivement supprimée.
        </p>
        <div style="display:flex;gap:0.75rem;justify-content:center;">
          <button id="confirm-delete-cancel"
            style="flex:1;padding:0.75rem;background:#f0f0f0;color:#333;
                   border:none;border-radius:9px;font-size:0.95rem;
                   font-weight:600;cursor:pointer;">
            ✕ Annuler
          </button>
          <button id="confirm-delete-yes"
            style="flex:1;padding:0.75rem;
                   background:linear-gradient(135deg,#e74c3c,#c0392b);
                   color:white;border:none;border-radius:9px;font-size:0.95rem;
                   font-weight:600;cursor:pointer;">
            🗑️ Supprimer
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    document.getElementById("confirm-delete-cancel").onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    document.getElementById("confirm-delete-yes").onclick = () => {
      close();

      // Mise à jour optimiste locale
      const orderIndex = this.orders.findIndex((o) => (o.orderId || o.id) === orderId);
      if (orderIndex !== -1) this.orders.splice(orderIndex, 1);

      // Fermer le modal parent
      parentModal.classList.remove("show");
      this.displayOrders();

      // Fetch en arrière-plan
      this.updateOrderStatus("delete", orderId);
    };
  }

  // Enhanced updateOrderStatus with backend synchronization
  async updateOrderStatus(newStatus, orderId) {
    try {
      const token =
        sessionStorage.getItem("adminToken") ||
        localStorage.getItem("adminToken");

      let response;

      if (newStatus === "delete") {
        // Handle delete action
        response = await fetch(`/api/orders/${orderId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        // Handle status update
        response = await fetch(`/api/orders/${orderId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle response - delete might return 204 No Content (no body)
      let result = null;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          result = await response.json();
        } catch (e) {
        }
      }
      if (newStatus === "delete") {
        // Remove order from local array
        const orderIndex = this.orders.findIndex(
          (o) => (o.orderId || o.id) === orderId
        );
        if (orderIndex !== -1) {
          this.orders.splice(orderIndex, 1);
        }

        // Close the management modal
        const modal = document.getElementById("order-management-modal");
        if (modal) {
          modal.classList.remove("show");
        }

        // Notify frontend about deletion (for real-time sync with menu history)
        this.notifyFrontendStatusChange(orderId, "delete");

        // Show delete notification with a small delay to ensure modal closes first
        setTimeout(() => {
          NotificationManager.showSuccess(
            orderId,
            "Commande supprimée !",
            `Commande ${orderId} supprimée définitivement`,
            2000
          );
        }, 100);
      } else {
        // Update local orders array
        const orderIndex = this.orders.findIndex(
          (o) => (o.orderId || o.id) === orderId
        );
        if (orderIndex !== -1) {
          this.orders[orderIndex].status = newStatus;
          this.orders[orderIndex].lastUpdated = new Date().toISOString();
        }

        // Show success notification
        NotificationManager.showSuccess(
          orderId,
          "Statut mis à jour !",
          `Commande ${orderId} : ${this.getStatusLabel(newStatus)}`,
          2000
        );

        // Notify frontend about status change (for real-time sync)
        this.notifyFrontendStatusChange(orderId, newStatus);
      }

      // Refresh the orders display
      this.displayOrders();
    } catch (error) {
      // Only show error if response was actually an error (not just JSON parse failure)
      const responseStatus =
        error.response?.status ||
        (error.message?.includes("HTTP error") ? "unknown" : null);

      if (newStatus === "delete") {
        // Check if deletion actually succeeded despite error in response handling
        const orderStillExists = this.orders.find(
          (o) => (o.orderId || o.id) === orderId
        );
        if (!orderStillExists) {
          // Order was removed, so deletion likely succeeded
          this.notifyFrontendStatusChange(orderId, "delete");
          NotificationManager.showSuccess(
            orderId,
            "Commande supprimée !",
            `Commande ${orderId} supprimée`,
            2000
          );
        } else {
          NotificationManager.showSuccess(
            orderId,
            "Erreur",
            "Impossible de supprimer la commande",
            3000
          );
        }
      } else {
        NotificationManager.showSuccess(
          orderId,
          "Erreur",
          "Impossible de mettre à jour le statut",
          3000
        );
      }
    }
  }

  getStatusLabel(status) {
    const labels = {
      pending_scan: "En attente de scan",
      pending_approval: "En attente d'approbation",
      accepted: "Acceptée",
      preparing: "En préparation",
      ready: "Prête",
      served: "Servie",
      cancelled: "Annulée",
    };
    return labels[status] || status;
  }

  // Show order fusion modal when multiple orders detected for same table
  showOrderFusionModal(scannedOrder, otherOrders, tableNumber) {
    // GUARD: supprimer tout modal déjà ouvert pour éviter la superposition
    const existingApproval = document.getElementById("order-approval-modal");
    if (existingApproval) existingApproval.remove();
    const existingFusion = document.getElementById("order-fusion-modal");
    if (existingFusion) existingFusion.remove();
    const allOrders = [scannedOrder, ...otherOrders];
    const totalItems = allOrders.reduce(
      (sum, order) => sum + (order.items?.length || 0),
      0
    );
    const grandTotal = allOrders.reduce(
      (sum, order) => sum + (order.total || 0),
      0
    );
    const orderCount = allOrders.length;
    const orderCountLabel =
      orderCount === 1
        ? "Cette commande est"
        : `${orderCount} commande(s) sont`;

    const modal = document.createElement("div");
    modal.className = "order-fusion-modal";
    modal.id = "order-fusion-modal";
    modal.innerHTML = `
      <div class="fusion-modal-content">
        <div class="fusion-modal-header">
          <h3>🔍 Détection de Table</h3>
          <button class="fusion-close" id="fusion-close">&times;</button>
        </div>
        <div class="fusion-modal-body">
          <div class="fusion-info">
            <div class="fusion-alert">
              <strong>${orderCountLabel} à la table ${tableNumber}</strong>
            </div>
            <div class="fusion-orders-list">
              ${allOrders
                .map(
                  (order, idx) => `
                <div class="fusion-order-item">
                  <div class="fusion-order-header">
                    <span class="fusion-order-id">${order.orderId || order.id}</span>
                    <span class="fusion-order-total">${this.formatPrice(order.total)} CFA</span>
                  </div>
                  <div class="fusion-order-items">
                    ${(order.items || [])
                      .map(
                        (item) =>
                          `<span class="fusion-item">${item.name} x${item.quantity}</span>`
                      )
                      .join(", ")}
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
            <div class="fusion-summary">
              <div class="fusion-summary-row">
                <span>Total articles:</span>
                <strong>${totalItems}</strong>
              </div>
              <div class="fusion-summary-row">
                <span>Total fusionné:</span>
                <strong>${this.formatPrice(grandTotal)} CFA</strong>
              </div>
            </div>
          </div>
        </div>
        <div class="fusion-modal-actions">
          <button class="btn-fusion-scan" id="btn-fusion-scan">
            📱 Scanner une autre commande
          </button>
          <button class="btn-fusion-decline" id="btn-fusion-decline">
            ❌ Garder séparées
          </button>
          <button class="btn-fusion-confirm" id="btn-fusion-confirm">
            ✅ Fusionner les commandes
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event handlers
    const closeBtn = modal.querySelector("#fusion-close");
    const scanBtn = modal.querySelector("#btn-fusion-scan");
    const declineBtn = modal.querySelector("#btn-fusion-decline");
    const confirmBtn = modal.querySelector("#btn-fusion-confirm");

    const closeModal = () => {
      modal.remove();
      if (window.qrScannerAdmin) window.qrScannerAdmin.processingScan = false;
      // Restart scanner if declined/closed
      setTimeout(() => {
        this.restartScanner();
      }, 500);
    };

    closeBtn.onclick = closeModal;
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };

    // Scan another order - will recursively check for more orders
    scanBtn.onclick = () => {
      // Store current orders for fusion flow
      this.pendingFusionOrders = allOrders;
      this.pendingFusionTable = tableNumber;
      modal.remove();
      if (window.qrScannerAdmin) window.qrScannerAdmin.processingScan = false;
      // Restart scanner to scan another order for the same table
      setTimeout(() => {
        this.restartScanner();
        NotificationManager.showSuccess(
          null,
          "Scanner prêt",
          `Scannez une autre commande pour la table ${tableNumber}`,
          2000
        );
      }, 300);
    };

    // Decline fusion - approve orders séparately
    declineBtn.onclick = async () => {
      // Close the modal immediately
      modal.remove();
      if (window.qrScannerAdmin) window.qrScannerAdmin.processingScan = false;
      try {
        const token =
          sessionStorage.getItem("adminToken") ||
          localStorage.getItem("adminToken");

        // Approve all orders separately (change status from pending_approval to accepted)
        const approvePromises = allOrders.map((order) =>
          fetch(`/api/orders/${order.orderId || order.id}/scan/validate`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })
        );

        await Promise.all(approvePromises);

        NotificationManager.showSuccess(
          order.orderId || order.id,
          "Commandes approuvées",
          `${allOrders.length} commande(s) approuvée(s) séparément pour la table ${tableNumber}`,
          3000
        );

        // Refresh orders list
        this.loadOrders(true);
      } catch (error) {
        NotificationManager.showSuccess(
          order.orderId || order.id,
          "Erreur",
          "Impossible d'approuver les commandes",
          3000
        );
      } finally {
        this.restartScanner();
      }
    };

    // Confirm fusion
    confirmBtn.onclick = async () => {
      // Close modal immediately to avoid it staying open
      modal.remove();
      if (window.qrScannerAdmin) window.qrScannerAdmin.processingScan = false;
      try {
        const token =
          sessionStorage.getItem("adminToken") ||
          localStorage.getItem("adminToken");

        // Call fusion endpoint
        const orderIds = allOrders.map((o) => o.orderId || o.id);
        const res = await fetch("/api/orders/fuse", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderIds,
            table: tableNumber,
          }),
        });

        if (!res.ok) {
          throw new Error("Fusion failed");
        }

        const fusedOrder = await res.json();

        NotificationManager.showSuccess(
          order.orderId || order.id,
          "Commandes fusionnées !",
          `Commande ${fusedOrder.orderId} créée pour la table ${tableNumber}`,
          3000
        );

        // Refresh orders list
        this.loadOrders(true);
      } catch (error) {
        NotificationManager.showSuccess(
          order.orderId || order.id,
          "Erreur",
          "Impossible de fusionner les commandes",
          3000
        );
      } finally {
        this.restartScanner();
      }
    };
  }

  // Show order approval modal for single order
  showOrderApprovalModal(order) {
    // GUARD: supprimer tout modal déjà ouvert pour éviter la superposition
    const existingApproval = document.getElementById("order-approval-modal");
    if (existingApproval) existingApproval.remove();
    const existingFusion = document.getElementById("order-fusion-modal");
    if (existingFusion) existingFusion.remove();

    const modal = document.createElement("div");
    modal.className = "order-approval-modal";
    modal.id = "order-approval-modal";
    modal.innerHTML = `
      <div class="approval-modal-content">
        <div class="approval-modal-header">
          <h3>📋 Validation de Commande</h3>
          <button class="approval-close" id="approval-close">&times;</button>
        </div>
        <div class="approval-modal-body">
          <div class="approval-order-info">
            <div class="approval-order-id">${order.orderId || order.id}</div>
            <div class="approval-order-details">
              <div><strong>Table:</strong> ${order.table}</div>
              <div><strong>Total:</strong> ${this.formatPrice(order.total)} CFA</div>
              <div><strong>Articles:</strong> ${order.items?.length || 0}</div>
              <div><strong>Paiement:</strong> ${order.paymentStatus === "paid" ? "✅ Payé" : "⏳ En attente"}</div>
            </div>
            <div class="approval-order-items">
              <h4>Articles:</h4>
              <div class="approval-items-list">
                ${(order.items || [])
                  .map(
                    (item) => `
                  <div class="approval-item">
                    <span>${item.name}</span>
                    <span>x${item.quantity}</span>
                    <span>${this.formatPrice(item.price * item.quantity)} CFA</span>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
          </div>
        </div>
        <div class="approval-modal-actions">
          <button class="btn-approval-reject" id="btn-approval-reject">
            ❌ Rejeter
          </button>
          <button class="btn-approval-accept" id="btn-approval-accept">
            ✅ accepter
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event handlers
    const closeBtn = modal.querySelector("#approval-close");
    const rejectBtn = modal.querySelector("#btn-approval-reject");
    const acceptBtn = modal.querySelector("#btn-approval-accept");

    const closeModal = () => {
      modal.remove();
      // Libérer le verrou de scan pour permettre un nouveau scan
      if (window.qrScannerAdmin) {
        window.qrScannerAdmin.processingScan = false;
      }
      setTimeout(() => {
        this.restartScanner();
      }, 500);
    };

    // Close with X or backdrop
    closeBtn.onclick = closeModal;
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };

    // Reject order: close immediately, handle errors gracefully
    rejectBtn.onclick = async () => {
      modal.remove();
      if (window.qrScannerAdmin) window.qrScannerAdmin.processingScan = false;
      try {
        const token =
          sessionStorage.getItem("adminToken") ||
          localStorage.getItem("adminToken");

        await fetch(`/api/orders/${order.orderId || order.id}/scan/reject`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        NotificationManager.showSuccess(
          order.orderId || order.id,
          "Commande rejetée",
          `Commande ${order.orderId || order.id} rejetée`,
          3000
        );
      } catch (error) {
        NotificationManager.showSuccess(
          order.orderId || order.id,
          "Erreur",
          "Impossible de rejeter la commande",
          3000
        );
      } finally {
        setTimeout(() => {
          this.restartScanner();
        }, 500);
      }
    };

    // Accept order: close immediately, refresh in background
    acceptBtn.onclick = async () => {
      modal.remove();
      if (window.qrScannerAdmin) window.qrScannerAdmin.processingScan = false;
    try {
      const token =
        sessionStorage.getItem("adminToken") ||
        localStorage.getItem("adminToken");

      const res = await fetch(
        `/api/orders/${order.orderId || order.id}/scan/validate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      NotificationManager.showSuccess(
        order.orderId || order.id,
        "Commande approuvée !",
        `Commande ${order.orderId || order.id} approuvée et ajoutée à la gestion`,
        3000
      );

      // Try to refresh orders list; errors here should not block UI
      try {
        await this.loadOrders(true);
      } catch (loadErr) {
        // ignore reload errors
      }
    } catch (error) {
        NotificationManager.showSuccess(
          order.orderId || order.id,
          "Erreur",
          "Impossible d'approuver la commande",
          3000
        );
      } finally {
        setTimeout(() => {
          this.restartScanner();
        }, 500);
      }
    };
  }

  // Notify frontend about status changes for real-time sync
  notifyFrontendStatusChange(orderId, newStatus) {
    // Dispatch a same-tab custom event for any listeners that care
    window.dispatchEvent(
      new CustomEvent("orderStatusChanged", {
        detail: { orderId, status: newStatus },
      })
    );
  }
}

// Initialize admin manager when DOM is loaded and authentication is ready
document.addEventListener("DOMContentLoaded", function () {
  if (window.location.pathname.includes("admin.html")) {
    // Wait for authentication to be ready, then initialize admin manager and SPA
    const initAdmin = () => {
      if (window.adminAuth && window.adminAuth.token) {
        window.adminManager = new AdminManager();
        initAdminSPA();
      } else {
        // Retry after a short delay
        setTimeout(initAdmin, 100);
      }
    };

    initAdmin();
  }
});

// -------- Lightweight SPA for admin.html --------
function initAdminSPA() {
  const navLinks = document.querySelectorAll(".admin-nav .nav-link[href^='#']");
  if (!navLinks.length) return;

  const scannerSection = document.querySelector(".scanner-section");
  const orderDetailsSection = document.getElementById("order-details");
  const ordersSection = document.getElementById("orders");
  const tablesSection = document.getElementById("tables");

  function showSection(target) {
    // Dashboard: only scanner (and optional order details when used)
    if (scannerSection) {
      scannerSection.style.display = target === "dashboard" ? "block" : "none";
    }
    if (orderDetailsSection) {
      // Keep order-details hidden on tab switches; it is controlled by scanner flow
      if (target === "dashboard") {
        // let scanner logic decide when to show/hide details
      } else {
        orderDetailsSection.style.display = "none";
      }
    }

    if (ordersSection) {
      ordersSection.style.display = target === "orders" ? "block" : "none";
    }
    if (tablesSection) {
      tablesSection.style.display = target === "tables" ? "block" : "none";
    }
  }

  async function handleTabClick(e) {
    e.preventDefault();
    const link = e.currentTarget;
    const hash = link.getAttribute("href") || "#dashboard";
    const target = hash.replace("#", "") || "dashboard";

    navLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    showSection(target);

    if (target === "orders") {
      await loadOrdersTab();
    } else if (target === "tables") {
      await loadTablesTab();
    }
  }

  navLinks.forEach((link) => {
    const hash = link.getAttribute("href") || "#dashboard";
    const target = hash.replace("#", "") || "dashboard";
    link.addEventListener("click", handleTabClick);
    if (target === "dashboard") {
      link.classList.add("active");
    }
  });

  showSection("dashboard");
}

async function spaAuthenticatedFetch(url, options = {}) {
  if (window.adminAuth && typeof window.adminAuth.authenticatedFetch === "function") {
    return window.adminAuth.authenticatedFetch(url, options);
  }

  const token =
    sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken");

  const headers = {
    ...(options.headers || {}),
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      : { "Content-Type": "application/json" }),
  };

  return fetch(url, { ...options, headers });
}

async function loadOrdersTab() {
  if (window.adminManager && typeof window.adminManager.loadOrders === "function") {
    try {
      await window.adminManager.loadOrders(false);
    } catch (_) {
      // ignore errors; UI will handle empty state
    }
    return;
  }

  const container = document.getElementById("orders-list");
  if (!container) return;

  try {
    const res = await spaAuthenticatedFetch("/api/orders?limit=200");
    if (!res.ok) {
      container.innerHTML =
        '<p style="text-align:center; color:#c00; padding:2rem;">Impossible de charger les commandes.</p>';
      return;
    }

    const data = await res.json();
    const orders = Array.isArray(data.orders)
      ? data.orders
      : Array.isArray(data)
      ? data
      : [];

    if (!orders.length) {
      container.innerHTML =
        '<p style="text-align:center; color:#666; padding:2rem;">Aucune commande</p>';
      return;
    }

    container.innerHTML = orders
      .map((order) => {
        const id = order.orderId || order.id;
        const date = order.timestamp
          ? new Date(order.timestamp).toLocaleString("fr-FR")
          : "";
        const itemsCount = order.items?.length || 0;
        const total = new Intl.NumberFormat("fr-FR").format(order.total || 0);

        return `
          <div class="order-card-small ${order.status || ""}" data-order-id="${id}">
            <div class="order-card-header">
              <span class="order-id">${id}</span>
              <span class="order-time">${date}</span>
            </div>
            <div class="order-summary">
              Table ${order.table || "-"} • ${itemsCount} article(s) • ${total} CFA
            </div>
          </div>
        `;
      })
      .join("");
  } catch (_) {
    container.innerHTML =
      '<p style="text-align:center; color:#c00; padding:2rem;">Erreur lors du chargement des commandes.</p>';
  }
}

async function loadTablesTab() {
  const container = document.getElementById("table-qr-codes");
  if (!container) return;

  // Prefer existing TableManager behaviour so tables appear without manual click
  if (window.tableManager && typeof window.tableManager.generateAllTableQRs === "function") {
    // Clear container and let TableManager rebuild it from its data/localStorage
    container.innerHTML = "";
    window.tableManager.generateAllTableQRs();
    return;
  }
}