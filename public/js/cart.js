// Shopping Cart Management for La Kora Restaurant

// Backend helpers (real order creation)
async function createBackendOrder(orderPayload) {
  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });
    if (!res.ok) throw new Error("Order creation failed");
    const saved = await res.json();
    return saved;
  } catch (e) {
    throw e;
  }
}

class CartManager {
  constructor() {
    this.items = [];
    this.orderingMode = localStorage.getItem("orderingMode") || "group";
    this.currentTable = window.tableDetector
      ? window.tableDetector.getCurrentTable()
      : null;
    this.init();
    this.clearModalState();
  }

  init() {
    this.loadCartFromStorage();
    this.setupEventListeners();
    this.updateDisplay();
  }

  clearModalState() {
    // Ensure QR modal is hidden on page load
    const qrModal = document.getElementById("qr-modal");
    if (qrModal) {
      qrModal.classList.remove("show");
      qrModal.style.display = "none";
    }

    // Clear any existing payment status displays
    const existingStatus = document.getElementById("payment-status-display");
    if (existingStatus) {
      existingStatus.remove();
    }

    const existingHint = document.getElementById("server-hint");
    if (existingHint) {
      existingHint.remove();
    }
  }

  setupEventListeners() {
    // Cart toggle
    const cartToggle = document.getElementById("cart-toggle");
    const cartClose = document.getElementById("cart-close");
    const cartSidebar = document.getElementById("cart-sidebar");

    if (cartToggle) {
      cartToggle.addEventListener("click", () => {
        cartSidebar.classList.add("open");
      });
    }

    if (cartClose) {
      cartClose.addEventListener("click", () => {
        cartSidebar.classList.remove("open");
      });
    }

    // Validate order button
    const validateBtn = document.getElementById("validate-order");
    if (validateBtn) {
      validateBtn.addEventListener("click", () => {
        this.validateOrder();
      });
    }

    // Close cart on backdrop click
    if (cartSidebar) {
      cartSidebar.addEventListener("click", (e) => {
        if (e.target === cartSidebar) {
          cartSidebar.classList.remove("open");
        }
      });
    }
  }

  addItem(item, quantity) {
    const existingItem = this.items.find((cartItem) => cartItem.id === item.id);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.items.push({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: quantity,
        image: item.image,
      });
    }

    this.saveCartToStorage();
    this.updateDisplay();
    this.showAddToCartFeedback(item.name);
  }

  removeItem(itemId) {
    this.items = this.items.filter((item) => item.id !== itemId);
    this.saveCartToStorage();
    this.updateDisplay();
  }

  updateQuantity(itemId, newQuantity) {
    const item = this.items.find((cartItem) => cartItem.id === itemId);
    if (item) {
      if (newQuantity <= 0) {
        this.removeItem(itemId);
      } else {
        item.quantity = newQuantity;
        this.saveCartToStorage();
        this.updateDisplay();
      }
    }
  }

  setQuantity(itemId, newQuantity) {
    if (newQuantity < 1) {
      this.removeItem(itemId);
    } else {
      this.updateQuantity(itemId, newQuantity);
    }
  }

  clearCart() {
    this.items = [];
    this.saveCartToStorage();
    this.updateDisplay();
  }

  getTotal() {
    return this.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }

  updateDisplay() {
    this.updateCartCount();
    this.updateCartItems();
    this.updateCartTotal();
  }

  updateCartCount() {
    const cartCount = document.getElementById("cart-count");
    if (cartCount) {
      const totalItems = this.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      cartCount.textContent = totalItems;
    }
  }

  updateCartItems() {
    const cartItems = document.getElementById("cart-items");
    if (!cartItems) return;

    if (this.items.length === 0) {
      cartItems.innerHTML =
        '<p style="text-align: center; color: #666; padding: 2rem;">Votre panier est vide</p>';
      return;
    }

    cartItems.innerHTML = this.items
      .map(
        (item) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>${window.LaKora.formatPrice(item.price)} CFA</p>
                </div>
                <div class="cart-item-controls">
                    <button class="cart-qty-btn" onclick="window.cartManager.updateQuantity('${
                      item.id
                    }', ${item.quantity - 1})" ${
          item.quantity <= 1 ? "disabled" : ""
        }>-</button>
                    <input type="number" class="cart-qty-input" value="${
                      item.quantity
                    }" min="1" 
                           onchange="window.cartManager.setQuantity('${
                             item.id
                           }', parseInt(this.value))">
                    <button class="cart-qty-btn" onclick="window.cartManager.updateQuantity('${
                      item.id
                    }', ${item.quantity + 1})">+</button>
                    <button class="cart-remove-btn" onclick="window.cartManager.removeItem('${
                      item.id
                    }')" title="Supprimer">×</button>
                </div>
            </div>
        `
      )
      .join("");
  }

  updateCartTotal() {
    const cartTotal = document.getElementById("cart-total");
    if (cartTotal) {
      const formatPrice = window.LaKora?.formatPrice || this.formatPrice;
      cartTotal.textContent = `${formatPrice(this.getTotal())} CFA`;
    }
  }

  // Fallback formatPrice function
  formatPrice(price) {
    return new Intl.NumberFormat("fr-FR").format(price);
  }

  showAddToCartFeedback(itemName) {
    // Create temporary feedback element
    const feedback = document.createElement("div");
    feedback.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 1rem;
            border-radius: 5px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
    feedback.textContent = `${itemName} ajouté au panier`;

    document.body.appendChild(feedback);

    setTimeout(() => {
      feedback.remove();
    }, 2000);
  }

  showAlert(message, type = "info") {
    // Check if cart is open to position alert appropriately
    const cart = document.getElementById("cart");
    const isCartOpen = cart && cart.classList.contains("open");

    const alert = document.createElement("div");
    alert.className = `alert alert-${type}`;
    alert.style.cssText = `
      position: fixed;
      top: ${isCartOpen ? "20px" : "100px"};
      right: ${isCartOpen ? "320px" : "20px"};
      background: ${
        type === "error"
          ? "#dc3545"
          : type === "success"
          ? "#28a745"
          : "#007bff"
      };
      color: white;
      padding: 1rem;
      border-radius: 5px;
      z-index: 1001;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
    `;
    alert.textContent = message;

    document.body.appendChild(alert);

    setTimeout(() => {
      alert.remove();
    }, 3000);
  }

  validateOrder() {
    if (this.items.length === 0) {
      this.showAlert("Votre panier est vide", "error");
      return;
    }

    if (!this.currentTable) {
      this.showAlert(
        "Table non détectée. Veuillez scanner le QR code de votre table.",
        "error"
      );
      return;
    }

    // Show payment method selection
    this.showPaymentMethodModal();
  }

  showPaymentMethodModal() {
    const modal = document.createElement("div");
    modal.className = "payment-modal";
    modal.innerHTML = `
      <div class="payment-modal-content">
        <div class="payment-modal-header">
          <h3>Méthode de Paiement</h3>
          <button class="payment-close" onclick="this.closest('.payment-modal').remove()">&times;</button>
        </div>
        <div class="payment-modal-body">
          <p>Total: <strong>${window.LaKora.formatPrice(
            this.getTotal()
          )} CFA</strong></p>
          <div class="payment-methods">
            <label class="payment-option">
              <input type="radio" name="payment" value="cash" checked>
              <span class="payment-label">
                <i class="payment-icon">💵</i>
                Paiement en espèces
              </span>
            </label>
            <label class="payment-option">
              <input type="radio" name="payment" value="card">
              <span class="payment-label">
                <i class="payment-icon">💳</i>
                Carte bancaire
              </span>
            </label>
            <label class="payment-option">
              <input type="radio" name="payment" value="mobile">
              <span class="payment-label">
                <i class="payment-icon">📱</i>
                Paiement mobile (Orange Money, MTN Money)
              </span>
            </label>
          </div>
        </div>
        <div class="payment-modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.payment-modal').remove()">Annuler</button>
          <button class="btn btn-primary" onclick="window.cartManager.confirmOrder(this.closest('.payment-modal'))">Confirmer</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  confirmOrder(modal) {
    const selectedPayment = modal.querySelector(
      'input[name="payment"]:checked'
    );
    if (!selectedPayment) {
      this.showAlert("Veuillez sélectionner une méthode de paiement", "error");
      return;
    }

    const paymentMethod = selectedPayment.value;

    // Handle different payment flows
    if (paymentMethod === "cash") {
      this.processCashPayment(modal);
    } else {
      this.processCardMobilePayment(modal, paymentMethod);
    }
  }

  processCashPayment(modal) {
    const payload = {
      table: this.currentTable,
      mode: this.orderingMode,
      items: [...this.items].map((it) => ({
        id: it.id,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
      })),
      total: this.getTotal(),
      paymentMethod: "cash",
      paymentStatus: "pending",
      status: "pending_approval", // Order must be scanned/approved before appearing in admin
      timestamp: new Date().toISOString(),
    };

    createBackendOrder(payload)
      .then((saved) => {
        // Remove modal
        modal.remove();

        // Build order object for QR
        const order = {
          id: saved.orderId || saved._id || window.LaKora.generateOrderId(),
          orderId: saved.orderId || saved._id,
          table: saved.table,
          mode: saved.mode,
          items: saved.items,
          total: saved.total,
          paymentMethod: saved.paymentMethod,
          paymentStatus: saved.paymentStatus,
          timestamp: saved.timestamp || new Date().toISOString(),
          status: saved.status,
        };

        // Notify global listeners (menu, history, etc.)
        this.handleOrderCreated(order);

        // Generate QR ticket
        this.generateQRTicket(order);

        // Clear cart
        this.clearCart();

        this.showAlert("Commande créée. Paiement à la caisse.", "success");
      })
      .catch(() => this.showAlert("Erreur de création de commande", "error"));
  }

  processCardMobilePayment(modal, paymentMethod) {
    // Show payment processing modal
    this.showPaymentProcessingModal(modal, paymentMethod);
  }

  showPaymentProcessingModal(originalModal, paymentMethod) {
    const processingModal = document.createElement("div");
    processingModal.className = "payment-processing-modal";
    processingModal.innerHTML = `
      <div class="payment-processing-content">
        <div class="processing-header">
          <h3>Paiement en cours...</h3>
          <div class="processing-spinner"></div>
        </div>
        <div class="processing-body">
          <p>Méthode: ${
            paymentMethod === "card" ? "Carte bancaire" : "Paiement mobile"
          }</p>
          <p>Montant: <strong>${window.LaKora.formatPrice(
            this.getTotal()
          )} CFA</strong></p>
          <div class="processing-steps">
            <div class="step active">1. Vérification...</div>
            <div class="step">2. Traitement...</div>
            <div class="step">3. Confirmation...</div>
          </div>
        </div>
        <div class="processing-footer">
          <button class="btn btn-secondary" onclick="this.closest('.payment-processing-modal').remove(); document.querySelector('.payment-modal').style.display='block'">Annuler</button>
        </div>
      </div>
    `;

    document.body.appendChild(processingModal);
    originalModal.style.display = "none";

    // Simulate payment processing
    setTimeout(() => {
      this.simulatePaymentSuccess(processingModal, originalModal);
    }, 3000);
  }

  simulatePaymentSuccess(processingModal, originalModal) {
    const method = originalModal.querySelector(
      'input[name="payment"]:checked'
    ).value;
    const payload = {
      table: this.currentTable,
      mode: this.orderingMode,
      items: [...this.items].map((it) => ({
        id: it.id,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
      })),
      total: this.getTotal(),
      paymentMethod: method,
      paymentStatus: "paid",
      status: "pending_approval", // Order must be scanned/approved before appearing in admin
      timestamp: new Date().toISOString(),
    };

    createBackendOrder(payload)
      .then((saved) => {
        processingModal.remove();
        originalModal.remove();

        const order = {
          id: saved.orderId || saved._id || window.LaKora.generateOrderId(),
          orderId: saved.orderId || saved._id,
          table: saved.table,
          mode: saved.mode,
          items: saved.items,
          total: saved.total,
          paymentMethod: saved.paymentMethod,
          paymentStatus: saved.paymentStatus,
          timestamp: saved.timestamp || new Date().toISOString(),
          status: saved.status,
        };

        // Notify global listeners (menu, history, etc.)
        this.handleOrderCreated(order);

        this.generateQRTicket(order);
        this.clearCart();
        this.showAlert("Commande créée et payée.", "success");
      })
      .catch(() => this.showAlert("Erreur de création de commande", "error"));
  }

  /**
   * Global hook called when an order has been successfully created
   * on the backend. This is responsible for notifying other parts of
   * the app (e.g. menu.js) without sharing full order details via
   * localStorage, so the backend stays the single source of truth.
   */
  handleOrderCreated(order) {
    try {
      const orderId = order.orderId || order.id;
      if (!orderId) return;

      window.dispatchEvent(
        new CustomEvent("orderCreated", {
          detail: {
            orderId,
            table: order.table,
            total: order.total,
            status: order.status,
            paymentStatus: order.paymentStatus,
            timestamp: order.timestamp,
          },
        })
      );
    } catch (err) {
    }
  }

  generateQRTicket(order) {
    const qrModal = document.getElementById("qr-modal");
    const ticketTable = document.getElementById("ticket-table");
    const ticketOrder = document.getElementById("ticket-order");
    const ticketTotal = document.getElementById("ticket-total");
    const qrCode = document.getElementById("qr-code");

    ticketTable.textContent = order.table;
    ticketOrder.textContent = order.id;
    ticketTotal.textContent = window.LaKora.formatPrice(order.total);

    // Add payment status info to the modal
    this.addPaymentStatusToModal(order);

    // Clear any existing QR code
    qrCode.innerHTML = "";

    // Generate QR code using local QRCode library
    this.generateQRCodeWithLocalLibrary(order, qrCode).then(() => {
      // After QR renders, try to persist an image version into history so 'Rouvrir QR' is enabled
      this.saveQRToHistory(order, qrCode);
    });

    // Show modal
    qrModal.classList.add("show");

    // Setup close button event (remove existing listeners first)
    const closeBtn = document.getElementById("qr-close");
    if (closeBtn) {
      // Remove existing event listeners
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

      // Add new event listener with confirmation
      newCloseBtn.addEventListener("click", () => {
        this.confirmQRClose(qrModal);
      });
    }

    // Close on background click (also with confirmation)
    qrModal.onclick = (e) => {
      if (e.target === qrModal) {
        this.confirmQRClose(qrModal);
      }
    };
  }

  async generateQRCodeWithLocalLibrary(order, qrCodeElement) {
    const qrData = {
      orderId: order.id,
      table: order.table,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      timestamp: order.timestamp,
    };

    // Try to use local QRCode library first
    if (typeof QRCode !== "undefined") {
      try {
        new QRCode(qrCodeElement, {
          text: JSON.stringify(qrData),
          width: 200,
          height: 200,
          colorDark: "#000000",
          colorLight: "#FFFFFF",
          correctLevel: QRCode.CorrectLevel.H,
        });
        // small delay to allow DOM to paint
        await new Promise((r) => setTimeout(r, 50));
        return;
      } catch (error) {
      }
    }

    // Fallback to online services
    // console.log("Using fallback QR generation");
    this.generateQRTicketFallback(order, qrCodeElement);
  }

  addPaymentStatusToModal(order) {
    // Add payment status display to the modal
    const existingStatus = document.getElementById("payment-status-display");
    if (existingStatus) {
      existingStatus.remove();
    }

    const statusDisplay = document.createElement("div");
    statusDisplay.id = "payment-status-display";
    statusDisplay.style.cssText = `
      margin: 1rem 0;
      padding: 0.8rem;
      border-radius: 8px;
      text-align: center;
      font-weight: bold;
      background: ${order.paymentStatus === "paid" ? "#d4edda" : "#fff3cd"};
      color: ${order.paymentStatus === "paid" ? "#155724" : "#856404"};
      border: 1px solid ${
        order.paymentStatus === "paid" ? "#c3e6cb" : "#ffeaa7"
      };
    `;

    const paymentText =
      order.paymentStatus === "paid"
        ? `✅ Paiement effectué (${
            order.paymentMethod === "cash"
              ? "Espèces"
              : order.paymentMethod === "card"
              ? "Carte"
              : "Mobile"
          })`
        : `⏳ Paiement en espèces à la caisse`;

    statusDisplay.innerHTML = `
      <div>${paymentText}</div>
      <div style="font-size: 0.9rem; margin-top: 0.5rem; font-weight: normal;">
        ${
          order.paymentStatus === "paid"
            ? "Commande prête à être servie"
            : "Payer avant de recevoir la commande"
        }
      </div>
    `;

    // Insert after the total, before QR code
    const qrCode = document.getElementById("qr-code");
    qrCode.parentNode.insertBefore(statusDisplay, qrCode);

    // Add server hint
    const existingHint = document.getElementById("server-hint");
    if (existingHint) {
      existingHint.remove();
    }

    const serverHint = document.createElement("div");
    serverHint.id = "server-hint";
    serverHint.style.cssText = `
      margin-top: 1rem;
      padding: 0.8rem;
      background: #e3f2fd;
      border: 1px solid #bbdefb;
      border-radius: 8px;
      text-align: center;
      color: #1565c0;
      font-size: 0.9rem;
      display: none;
    `;
    serverHint.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 0.3rem;">📱 Pour le serveur</div>
      <div>Présenter ce ticket QR au serveur/servante pour valider la commande</div>
    `;

    qrCode.parentNode.appendChild(serverHint);
  }

  generateQRTicketFallback(order, qrCodeElement) {
    // Create QR code data with payment status
    const qrData = {
      orderId: order.id,
      table: order.table,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus || "pending",
      timestamp: order.timestamp,
    };

    // Try multiple QR code services
    const qrServices = [
      `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        JSON.stringify(qrData)
      )}`,
      `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(
        JSON.stringify(qrData)
      )}`,
      `https://quickchart.io/qr?text=${encodeURIComponent(
        JSON.stringify(qrData)
      )}&size=200`,
    ];

    this.tryQRCodeServices(qrServices, qrCodeElement, qrData);
  }

  saveQRToHistory(order, qrCodeElement) {
    try {
      let dataUrl = null;
      const img = qrCodeElement.querySelector("img");
      const canvas = qrCodeElement.querySelector("canvas");
      if (img && img.src) {
        dataUrl = img.src;
      } else if (canvas && canvas.toDataURL) {
        dataUrl = canvas.toDataURL("image/png");
      }
      if (dataUrl && window.orderHistoryManager) {
        const payload = {
          orderId: order.id,
          table: order.table,
          total: order.total,
          paymentStatus: order.paymentStatus,
          status: order.status,
          timestamp: order.timestamp,
        };
        const enriched = {
          ...order,
          qrData: dataUrl,
          qrPayload: payload,
        };
        window.orderHistoryManager.addOrder(enriched);
      }
    } catch (e) {
    }
  }

  tryQRCodeServices(services, element, qrData) {
    if (services.length === 0) {
      // All services failed, show manual QR
      this.showManualQR(element, qrData);
      return;
    }

    const currentService = services[0];
    const img = document.createElement("img");
    img.src = currentService;
    img.alt = "QR Code";
    img.style.width = "200px";
    img.style.height = "200px";
    img.style.border = "1px solid #ddd";
    img.style.borderRadius = "5px";

    img.onload = () => {
      element.innerHTML = "";
      element.appendChild(img);
    };

    img.onerror = () => {
      this.tryQRCodeServices(services.slice(1), element, qrData);
    };

    element.innerHTML = "";
    element.appendChild(img);
  }

  showManualQR(element, qrData) {
    // console.log("All QR services failed, showing manual QR");
    element.innerHTML = `
      <div style="width: 200px; height: 200px; border: 2px dashed #007bff; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8f9fa; text-align: center; padding: 15px;">
        <div style="font-size: 24px; margin-bottom: 10px;">📱</div>
        <p style="margin: 0; font-size: 12px; color: #666; font-weight: bold;">QR Code</p>
        <p style="margin: 5px 0 0 0; font-size: 10px; color: #999;">Commande: ${
          qrData.orderId
        }</p>
        <p style="margin: 2px 0 0 0; font-size: 10px; color: #999;">Table: ${
          qrData.table
        }</p>
        <p style="margin: 2px 0 0 0; font-size: 10px; color: #999;">Paiement: ${
          qrData.paymentStatus === "paid" ? "✅ Payé" : "⏳ En attente"
        }</p>
      </div>
    `;
  }

  confirmQRClose(qrModal) {
    const message = `
      <div style="text-align:left;">
        <div style="font-weight:600; margin-bottom:8px; color:#ffc107;">⚠️ Attention!</div>
        <p style="margin:0 0 8px 0;">Fermer ce ticket QR empêchera le serveur de valider votre commande.</p>
        <p style="margin:0;">Êtes-vous sûr de vouloir fermer ? Vous pourrez toujours le rouvrir depuis l'historique des commandes.</p>
      </div>
    `;
    this.showConfirmModal(
      message,
      () => {
        qrModal.classList.remove("show");
        this.showAlert(
          "Ticket QR fermé. Vous pouvez le rouvrir depuis l'historique.",
          "info"
        );
      },
      () => {}
    );
  }

  showConfirmModal(messageHTML, onYes, onNo) {
    const overlay = document.createElement("div");
    overlay.className = "confirm-modal";
    overlay.innerHTML = `
      <div class="confirm-modal-content">
        <div class="confirm-header">
          <h3>Confirmation</h3>
          <button class="confirm-close" aria-label="Fermer">×</button>
        </div>
        <div class="confirm-body">${messageHTML}</div>
        <div class="confirm-actions">
          <button class="btn-decline" type="button">Non</button>
          <button class="btn-accept" type="button">Oui</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = () => overlay.remove();
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup();
    });
    overlay.querySelector(".confirm-close").addEventListener("click", cleanup);
    overlay.querySelector(".btn-decline").addEventListener("click", () => {
      cleanup();
      if (typeof onNo === "function") onNo();
    });
    overlay.querySelector(".btn-accept").addEventListener("click", () => {
      cleanup();
      if (typeof onYes === "function") onYes();
    });
  }

  saveCartToStorage() {
    localStorage.setItem("cart", JSON.stringify(this.items));
  }

  loadCartFromStorage() {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      this.items = JSON.parse(savedCart);
    }
  }

}

// Initialize cart manager when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  if (window.location.pathname.includes("menu.html")) {
    // Wait for LaKora to be available
    const waitForLaKora = () => {
      if (window.LaKora) {
        window.cartManager = new CartManager();
      } else {
        setTimeout(waitForLaKora, 100);
      }
    };
    waitForLaKora();
  }
});
