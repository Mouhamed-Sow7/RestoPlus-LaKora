// Shopping Cart Management for La Kora Restaurant

// ─── Config paiement mobile ───────────────────────────────────────────────
const PAYMENT_CONFIG = {
  wave: {
    phone:    "781220391",
    phoneIntl: "+221781220391",
    name:     "Wave",
    icon:     "/img/wave-logo.png",   // à placer dans public/img/
    color:    "#1DC8EF",
    deepLink: (amount) =>
      `https://wave.com/send?phone=%2B221781220391&amount=${amount}&currency=XOF`,
  },
  orange_money: {
    phone:    "781220391",
    name:     "Orange Money",
    icon:     "/img/om-logo.png",     // à placer dans public/img/
    color:    "#FF6600",
    deepLink: (amount) =>
      `tel:*144*1*781220391*${amount}#`,
  },
};

// Backend helpers
async function createBackendOrder(orderPayload) {
  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });
    if (!res.ok) throw new Error("Order creation failed");
    return await res.json();
  } catch (e) { throw e; }
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
    const qrModal = document.getElementById("qr-modal");
    if (qrModal) { qrModal.classList.remove("show"); qrModal.style.display = "none"; }
    document.getElementById("payment-status-display")?.remove();
    document.getElementById("server-hint")?.remove();
  }

  setupEventListeners() {
    const cartToggle  = document.getElementById("cart-toggle");
    const cartClose   = document.getElementById("cart-close");
    const cartSidebar = document.getElementById("cart-sidebar");
    const validateBtn = document.getElementById("validate-order");

    cartToggle?.addEventListener("click", () => cartSidebar.classList.add("open"));
    cartClose?.addEventListener("click",  () => cartSidebar.classList.remove("open"));
    validateBtn?.addEventListener("click", () => this.validateOrder());
    cartSidebar?.addEventListener("click", (e) => {
      if (e.target === cartSidebar) cartSidebar.classList.remove("open");
    });
  }

  addItem(item, quantity) {
    const existing = this.items.find((i) => i.id === item.id);
    if (existing) { existing.quantity += quantity; }
    else { this.items.push({ id: item.id, name: item.name, price: item.price, quantity, image: item.image }); }
    this.saveCartToStorage();
    this.updateDisplay();
    this.showAddToCartFeedback(item.name);
  }

  removeItem(itemId) {
    this.items = this.items.filter((i) => i.id !== itemId);
    this.saveCartToStorage();
    this.updateDisplay();
  }

  updateQuantity(itemId, newQuantity) {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return;
    if (newQuantity <= 0) this.removeItem(itemId);
    else { item.quantity = newQuantity; this.saveCartToStorage(); this.updateDisplay(); }
  }

  setQuantity(itemId, newQuantity) {
    if (newQuantity < 1) this.removeItem(itemId);
    else this.updateQuantity(itemId, newQuantity);
  }

  clearCart() { this.items = []; this.saveCartToStorage(); this.updateDisplay(); }

  getTotal() {
    return this.items.reduce((t, i) => t + i.price * i.quantity, 0);
  }

  updateDisplay() {
    this.updateCartCount();
    this.updateCartItems();
    this.updateCartTotal();
  }

  updateCartCount() {
    const el = document.getElementById("cart-count");
    if (el) el.textContent = this.items.reduce((s, i) => s + i.quantity, 0);
  }

  updateCartItems() {
    const cartItems = document.getElementById("cart-items");
    if (!cartItems) return;
    if (!this.items.length) {
      cartItems.innerHTML = '<p style="text-align:center;color:#666;padding:2rem;">Votre panier est vide</p>';
      return;
    }
    cartItems.innerHTML = this.items.map((item) => `
      <div class="cart-item">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <p>${window.LaKora.formatPrice(item.price)} CFA</p>
        </div>
        <div class="cart-item-controls">
          <button class="cart-qty-btn" onclick="window.cartManager.updateQuantity('${item.id}',${item.quantity-1})" ${item.quantity<=1?"disabled":""}>-</button>
          <input type="number" class="cart-qty-input" value="${item.quantity}" min="1"
                 onchange="window.cartManager.setQuantity('${item.id}',parseInt(this.value))">
          <button class="cart-qty-btn" onclick="window.cartManager.updateQuantity('${item.id}',${item.quantity+1})">+</button>
          <button class="cart-remove-btn" onclick="window.cartManager.removeItem('${item.id}')" title="Supprimer">×</button>
        </div>
      </div>`).join("");
  }

  updateCartTotal() {
    const el = document.getElementById("cart-total");
    if (el) el.textContent = `${(window.LaKora?.formatPrice || this.formatPrice)(this.getTotal())} CFA`;
  }

  formatPrice(price) { return new Intl.NumberFormat("fr-FR").format(price); }

  showAddToCartFeedback(itemName) {
    const fb = document.createElement("div");
    fb.style.cssText = "position:fixed;top:100px;right:20px;background:#28a745;color:white;padding:1rem;border-radius:5px;z-index:1000;";
    fb.textContent = `${itemName} ajouté au panier`;
    document.body.appendChild(fb);
    setTimeout(() => fb.remove(), 2000);
  }

  showAlert(message, type = "info") {
    const colors = { error: "#dc3545", success: "#28a745", info: "#007bff" };
    const alert = document.createElement("div");
    alert.style.cssText = `position:fixed;top:100px;right:20px;background:${colors[type]||"#007bff"};color:white;padding:1rem;border-radius:5px;z-index:1001;max-width:300px;box-shadow:0 4px 12px rgba(0,0,0,0.15);`;
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
  }

  validateOrder() {
    if (!this.items.length) { this.showAlert("Votre panier est vide", "error"); return; }
    const table = window.menuManager?.getCurrentTable() || this.currentTable;
    if (!table) { this.showAlert("Scannez le QR code de votre table pour commander.", "error"); return; }
    this.currentTable = table;
    this.showPaymentMethodModal();
  }

  // ─── Modal paiement ────────────────────────────────────────────────────
  showPaymentMethodModal() {
    document.querySelector(".payment-modal")?.remove();
    const total = this.getTotal();
    const fmt   = window.LaKora.formatPrice(total);

    const modal = document.createElement("div");
    modal.className = "payment-modal";
    modal.innerHTML = `
      <div class="payment-modal-content">
        <div class="payment-modal-header">
          <h3>💳 Méthode de paiement</h3>
          <button class="payment-close">&times;</button>
        </div>
        <div class="payment-modal-body">
          <div class="payment-total-banner">
            <span>Total à payer</span>
            <strong>${fmt} CFA</strong>
          </div>
          <div class="payment-methods">

            <!-- Espèces -->
            <label class="payment-option">
              <input type="radio" name="payment" value="cash" checked>
              <div class="payment-option-card">
                <span class="payment-option-icon">💵</span>
                <div class="payment-option-info">
                  <strong>Espèces</strong>
                  <small>Paiement à la caisse</small>
                </div>
                <span class="payment-option-check">✓</span>
              </div>
            </label>

            <!-- Carte -->
            <label class="payment-option">
              <input type="radio" name="payment" value="card">
              <div class="payment-option-card">
                <span class="payment-option-icon">💳</span>
                <div class="payment-option-info">
                  <strong>Carte bancaire</strong>
                  <small>Visa, Mastercard</small>
                </div>
                <span class="payment-option-check">✓</span>
              </div>
            </label>

            <!-- Wave -->
            <label class="payment-option">
              <input type="radio" name="payment" value="wave">
              <div class="payment-option-card payment-wave">
                <span class="payment-option-icon">🌊</span>
                <div class="payment-option-info">
                  <strong style="color:#1DC8EF;">Wave</strong>
                  <small>${PAYMENT_CONFIG.wave.phone}</small>
                </div>
                <span class="payment-option-check">✓</span>
              </div>
            </label>

            <!-- Orange Money -->
            <label class="payment-option">
              <input type="radio" name="payment" value="orange_money">
              <div class="payment-option-card payment-om">
                <span class="payment-option-icon">🟠</span>
                <div class="payment-option-info">
                  <strong style="color:#FF6600;">Orange Money</strong>
                  <small>${PAYMENT_CONFIG.orange_money.phone}</small>
                </div>
                <span class="payment-option-check">✓</span>
              </div>
            </label>

          </div>
        </div>
        <div class="payment-modal-footer">
          <button class="btn btn-secondary payment-cancel-btn">Annuler</button>
          <button class="btn btn-primary payment-confirm-btn">Continuer →</button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    // Highlight selected option
    modal.querySelectorAll('input[name="payment"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        modal.querySelectorAll(".payment-option-card").forEach((c) => c.classList.remove("selected"));
        radio.closest(".payment-option").querySelector(".payment-option-card").classList.add("selected");
      });
    });
    // Default highlight
    modal.querySelector('input[value="cash"]').closest(".payment-option")
      .querySelector(".payment-option-card").classList.add("selected");

    modal.querySelector(".payment-close").onclick     = () => modal.remove();
    modal.querySelector(".payment-cancel-btn").onclick = () => modal.remove();
    modal.querySelector(".payment-confirm-btn").onclick = () => this.confirmOrder(modal);
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
  }

  confirmOrder(modal) {
    const selected = modal.querySelector('input[name="payment"]:checked');
    if (!selected) { this.showAlert("Choisissez une méthode de paiement", "error"); return; }
    const method = selected.value;

    if (method === "cash" || method === "card") {
      this.processCashPayment(modal, method);
    } else {
      this.showMobilePaymentFlow(modal, method);
    }
  }

  // ─── Flow Wave / Orange Money ─────────────────────────────────────────
  showMobilePaymentFlow(originalModal, method) {
    originalModal.style.display = "none";
    const config = PAYMENT_CONFIG[method];
    const total  = this.getTotal();
    const fmt    = window.LaKora.formatPrice(total);
    const link   = config.deepLink(total);

    const overlay = document.createElement("div");
    overlay.className = "payment-modal payment-mobile-overlay";
    overlay.innerHTML = `
      <div class="payment-modal-content payment-mobile-content">
        <div class="payment-modal-header">
          <h3>${method === "wave" ? "🌊" : "🟠"} Paiement ${config.name}</h3>
          <button class="payment-close">&times;</button>
        </div>
        <div class="payment-mobile-body">

          <!-- Montant -->
          <div class="mobile-pay-amount">
            <span class="mobile-pay-label">Montant à envoyer</span>
            <span class="mobile-pay-value">${fmt} <small>CFA</small></span>
          </div>

          <!-- Numéro -->
          <div class="mobile-pay-number">
            <span class="mobile-pay-number-label">Numéro ${config.name}</span>
            <span class="mobile-pay-number-value">${config.phone}</span>
          </div>

          <!-- Instructions -->
          <div class="mobile-pay-steps">
            ${method === "wave" ? `
              <div class="mobile-pay-step">
                <span class="step-num">1</span>
                <span>Appuyez sur "Ouvrir Wave" ci-dessous</span>
              </div>
              <div class="mobile-pay-step">
                <span class="step-num">2</span>
                <span>Le montant et le numéro sont pré-remplis</span>
              </div>
              <div class="mobile-pay-step">
                <span class="step-num">3</span>
                <span>Confirmez l'envoi dans l'app Wave</span>
              </div>
              <div class="mobile-pay-step">
                <span class="step-num">4</span>
                <span>Revenez ici et cliquez "J'ai payé"</span>
              </div>
            ` : `
              <div class="mobile-pay-step">
                <span class="step-num">1</span>
                <span>Appuyez sur "Ouvrir Orange Money"</span>
              </div>
              <div class="mobile-pay-step">
                <span class="step-num">2</span>
                <span>Entrez votre code PIN Orange Money</span>
              </div>
              <div class="mobile-pay-step">
                <span class="step-num">3</span>
                <span>Confirmez le transfert de <strong>${fmt} CFA</strong></span>
              </div>
              <div class="mobile-pay-step">
                <span class="step-num">4</span>
                <span>Revenez ici et cliquez "J'ai payé"</span>
              </div>
            `}
          </div>

          <!-- Avertissement test -->
          <div class="mobile-pay-test-notice">
            🧪 Mode démo — aucun débit réel ne sera effectué
          </div>

        </div>
        <div class="payment-mobile-footer">
          <button class="btn-mobile-back">← Retour</button>
          <a href="${link}" target="_blank" class="btn-mobile-open" style="background:${config.color};">
            Ouvrir ${config.name} →
          </a>
          <button class="btn-mobile-paid" style="background:#27ae60;">
            ✅ J'ai payé
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    overlay.querySelector(".payment-close").onclick = () => { overlay.remove(); originalModal.remove(); };
    overlay.querySelector(".btn-mobile-back").onclick = () => { overlay.remove(); originalModal.style.display = "flex"; };
    overlay.querySelector(".btn-mobile-paid").onclick = () => {
      overlay.remove();
      originalModal.remove();
      this.finalizeOrder(method, "paid");
    };
  }

  // ─── Finalisation commande ────────────────────────────────────────────
  processCashPayment(modal, method = "cash") {
    modal.remove();
    this.finalizeOrder(method, "pending");
  }

  finalizeOrder(paymentMethod, paymentStatus) {
    const payload = {
      table:         this.currentTable,
      mode:          this.orderingMode,
      items:         this.items.map((it) => ({ id: it.id, name: it.name, price: it.price, quantity: it.quantity })),
      total:         this.getTotal(),
      paymentMethod,
      paymentStatus,
      status:        "pending_approval",
      timestamp:     new Date().toISOString(),
    };

    createBackendOrder(payload)
      .then((saved) => {
        const order = {
          id:            saved.orderId || saved._id,
          orderId:       saved.orderId || saved._id,
          table:         saved.table,
          mode:          saved.mode,
          items:         saved.items,
          total:         saved.total,
          paymentMethod: saved.paymentMethod,
          paymentStatus: saved.paymentStatus,
          timestamp:     saved.timestamp || new Date().toISOString(),
          status:        saved.status,
        };
        this.handleOrderCreated(order);
        this.generateQRTicket(order);
        this.clearCart();

        const msg = paymentMethod === "wave"         ? "Commande créée — paiement Wave confirmé ✅"
                  : paymentMethod === "orange_money"  ? "Commande créée — paiement OM confirmé ✅"
                  : paymentMethod === "cash"           ? "Commande créée. Paiement à la caisse 💵"
                  : "Commande créée ✅";
        this.showAlert(msg, "success");
      })
      .catch(() => this.showAlert("Erreur de création de commande", "error"));
  }

  handleOrderCreated(order) {
    try {
      const orderId = order.orderId || order.id;
      if (!orderId) return;
      window.dispatchEvent(new CustomEvent("orderCreated", { detail: { orderId, table: order.table, total: order.total, status: order.status, paymentStatus: order.paymentStatus, timestamp: order.timestamp } }));
    } catch {}
  }

  generateQRTicket(order) {
    const qrModal    = document.getElementById("qr-modal");
    const ticketTable = document.getElementById("ticket-table");
    const ticketOrder = document.getElementById("ticket-order");
    const ticketTotal = document.getElementById("ticket-total");
    const qrCode      = document.getElementById("qr-code");

    ticketTable.textContent = order.table;
    ticketOrder.textContent = order.id;
    ticketTotal.textContent = window.LaKora.formatPrice(order.total);

    this.addPaymentStatusToModal(order);
    qrCode.innerHTML = "";

    this.generateQRCodeWithLocalLibrary(order, qrCode).then(() => {
      this.saveQRToHistory(order, qrCode);
    });

    qrModal.classList.add("show");

    const closeBtn = document.getElementById("qr-close");
    if (closeBtn) {
      const newBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newBtn, closeBtn);
      newBtn.addEventListener("click", () => this.confirmQRClose(qrModal));
    }
    qrModal.onclick = (e) => { if (e.target === qrModal) this.confirmQRClose(qrModal); };
  }

  async generateQRCodeWithLocalLibrary(order, qrCodeElement) {
    const qrData = { orderId: order.id, table: order.table, total: order.total, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, timestamp: order.timestamp };
    if (typeof QRCode !== "undefined") {
      try {
        new QRCode(qrCodeElement, { text: JSON.stringify(qrData), width: 200, height: 200, colorDark: "#000000", colorLight: "#FFFFFF", correctLevel: QRCode.CorrectLevel.H });
        await new Promise((r) => setTimeout(r, 50));
        return;
      } catch {}
    }
    this.generateQRTicketFallback(order, qrCodeElement);
  }

  addPaymentStatusToModal(order) {
    document.getElementById("payment-status-display")?.remove();
    document.getElementById("server-hint")?.remove();

    const methodLabels = { cash: "💵 Caisse", card: "💳 Carte", wave: "🌊 Wave", orange_money: "🟠 Orange Money", mobile: "📱 Mobile" };
    const isPaid = order.paymentStatus === "paid";

    const statusDisplay = document.createElement("div");
    statusDisplay.id = "payment-status-display";
    statusDisplay.style.cssText = `margin:1rem 0;padding:0.8rem;border-radius:8px;text-align:center;font-weight:bold;background:${isPaid?"#d4edda":"#fff3cd"};color:${isPaid?"#155724":"#856404"};border:1px solid ${isPaid?"#c3e6cb":"#ffeaa7"};`;
    statusDisplay.innerHTML = `
      <div>${isPaid ? "✅ Paiement effectué" : "⏳ Paiement en attente"} — ${methodLabels[order.paymentMethod] || order.paymentMethod}</div>
      <div style="font-size:0.85rem;margin-top:0.4rem;font-weight:normal;">${isPaid ? "Commande payée — présentez ce ticket au serveur" : "Réglez à la caisse avant de recevoir votre commande"}</div>`;

    const qrCode = document.getElementById("qr-code");
    qrCode.parentNode.insertBefore(statusDisplay, qrCode);
  }

  generateQRTicketFallback(order, qrCodeElement) {
    const qrData = { orderId: order.id, table: order.table, total: order.total, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus || "pending", timestamp: order.timestamp };
    const services = [
      `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify(qrData))}`,
      `https://quickchart.io/qr?text=${encodeURIComponent(JSON.stringify(qrData))}&size=200`,
    ];
    this.tryQRCodeServices(services, qrCodeElement, qrData);
  }

  saveQRToHistory(order, qrCodeElement) {
    try {
      let dataUrl = null;
      const img    = qrCodeElement.querySelector("img");
      const canvas = qrCodeElement.querySelector("canvas");
      if (img?.src) dataUrl = img.src;
      else if (canvas?.toDataURL) dataUrl = canvas.toDataURL("image/png");
      if (dataUrl && window.orderHistoryManager) {
        window.orderHistoryManager.addOrder({ ...order, qrData: dataUrl });
      }
    } catch {}
  }

  tryQRCodeServices(services, element, qrData) {
    if (!services.length) { this.showManualQR(element, qrData); return; }
    const img = document.createElement("img");
    img.src = services[0];
    img.alt = "QR Code";
    img.style.cssText = "width:200px;height:200px;border:1px solid #ddd;border-radius:5px;";
    img.onload = () => { element.innerHTML = ""; element.appendChild(img); };
    img.onerror = () => this.tryQRCodeServices(services.slice(1), element, qrData);
    element.innerHTML = "";
    element.appendChild(img);
  }

  showManualQR(element, qrData) {
    element.innerHTML = `<div style="width:200px;height:200px;border:2px dashed #007bff;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f8f9fa;text-align:center;padding:15px;"><div style="font-size:24px;margin-bottom:10px;">📱</div><p style="margin:0;font-size:12px;color:#666;font-weight:bold;">QR Code</p><p style="margin:5px 0 0;font-size:10px;color:#999;">Commande: ${qrData.orderId}</p><p style="margin:2px 0 0;font-size:10px;color:#999;">Table: ${qrData.table}</p></div>`;
  }

  confirmQRClose(qrModal) {
    this.showConfirmModal(
      `<div><div style="font-weight:600;margin-bottom:8px;color:#ffc107;">⚠️ Attention!</div><p style="margin:0 0 8px;">Fermer ce ticket empêchera le serveur de valider votre commande.</p><p style="margin:0;">Vous pourrez le rouvrir depuis l'historique des commandes.</p></div>`,
      () => { qrModal.classList.remove("show"); this.showAlert("Ticket fermé. Rouvrez-le depuis l'historique.", "info"); },
      () => {}
    );
  }

  showConfirmModal(messageHTML, onYes, onNo) {
    const overlay = document.createElement("div");
    overlay.className = "confirm-modal";
    overlay.innerHTML = `
      <div class="confirm-modal-content">
        <div class="confirm-header"><h3>Confirmation</h3><button class="confirm-close">×</button></div>
        <div class="confirm-body">${messageHTML}</div>
        <div class="confirm-actions">
          <button class="btn-decline">Non</button>
          <button class="btn-accept">Oui</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const cleanup = () => overlay.remove();
    overlay.addEventListener("click", (e) => { if (e.target === overlay) cleanup(); });
    overlay.querySelector(".confirm-close").addEventListener("click", cleanup);
    overlay.querySelector(".btn-decline").addEventListener("click", () => { cleanup(); onNo?.(); });
    overlay.querySelector(".btn-accept").addEventListener("click",  () => { cleanup(); onYes?.(); });
  }

  saveCartToStorage() { localStorage.setItem("cart", JSON.stringify(this.items)); }
  loadCartFromStorage() { try { this.items = JSON.parse(localStorage.getItem("cart") || "[]"); } catch { this.items = []; } }
}

document.addEventListener("DOMContentLoaded", function () {
  if (window.location.pathname.includes("menu.html")) {
    const waitForLaKora = () => {
      if (window.LaKora) window.cartManager = new CartManager();
      else setTimeout(waitForLaKora, 100);
    };
    waitForLaKora();
  }
});