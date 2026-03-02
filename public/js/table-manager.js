// Table Management System for La Kora Restaurant
// Source de vérité : MongoDB collection "tables"
// localStorage : supprimé — uniquement utilisé pour adminToken (auth)

class TableManager {
  constructor() {
    this.tables = [];
    this._loading = false;
    this.init();
  }

  init() {
    this.loadTables();
    this.setupEventListeners();
  }

  // ─── Auth helper ──────────────────────────────────────────
  _getToken() {
    return (
      sessionStorage.getItem("adminToken") ||
      localStorage.getItem("adminToken") ||
      null
    );
  }

  _authHeaders() {
    const token = this._getToken();
    const h = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }

  // ─── Setup events ─────────────────────────────────────────
  setupEventListeners() {
    if (window.location.pathname.includes("admin.html")) {
      this.waitForQRCodeLibrary()
        .then(() => this.generateAllTableQRs())
        .catch(() => this.showQRCodeError());
    }
  }

  showQRCodeError() {
    const c = document.getElementById("table-qr-codes");
    if (c) {
      c.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:2rem;">
          <h3 style="color:#dc3545;">Erreur de chargement de la bibliothèque QR</h3>
          <p>Veuillez rafraîchir la page ou vérifier votre connexion.</p>
          <button class="btn btn-primary" onclick="location.reload()" style="margin-top:1rem;">
            Rafraîchir
          </button>
        </div>`;
    }
  }

  waitForQRCodeLibrary() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const check = () => {
        attempts++;
        if (typeof QRCode !== "undefined") return resolve();
        if (attempts >= 50) return this.loadQRCodeLibrary().then(resolve).catch(reject);
        setTimeout(check, 100);
      };
      check();
    });
  }

  loadQRCodeLibrary() {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js";
      s.onload = resolve;
      s.onerror = () => reject(new Error("QRCode library not available"));
      document.head.appendChild(s);
    });
  }

  // ─── Structure d'une table ────────────────────────────────
  _buildTable(number, chairs, location = "Salle principale") {
    return {
      tableId:      `table-${number}`,
      number,
      chairs,
      location,
      status:       "available",
      currentOrder: null,
    };
  }

  _defaultTables() {
    return [
      this._buildTable(1,  4, "Terrasse"),
      this._buildTable(2,  2, "Salle principale"),
      this._buildTable(3,  6, "Salle principale"),
      this._buildTable(4,  4, "Salle principale"),
      this._buildTable(5,  2, "Terrasse"),
      this._buildTable(6,  8, "Salle VIP"),
      this._buildTable(7,  4, "Salle principale"),
      this._buildTable(8,  2, "Terrasse"),
      this._buildTable(9,  6, "Salle principale"),
      this._buildTable(10, 4, "Salle principale"),
    ];
  }

  // ─── CRUD MongoDB ─────────────────────────────────────────

  /**
   * Charge les tables depuis GET /api/tables
   * Si collection vide → seed automatique
   */
  async loadTables() {
    if (this._loading) return;
    this._loading = true;
    try {
      const res = await fetch("/api/tables", { headers: this._authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const tables = Array.isArray(data) ? data : (data.tables || []);

      if (tables.length === 0) {
        await this._seedDefaultTables();
      } else {
        this.tables = tables;
        this.tables.forEach((t) => this._attachQrData(t));
      }
    } catch (err) {
      console.warn("[TableManager] Fallback local — API indisponible:", err.message);
      this.tables = this._defaultTables();
      this.tables.forEach((t) => this._attachQrData(t));
    } finally {
      this._loading = false;
      if (
        window.location.pathname.includes("admin.html") &&
        typeof QRCode !== "undefined"
      ) {
        this.generateAllTableQRs();
      }
    }
  }

  /**
   * Seed initial : POST /api/tables/seed
   * Le backend insère le tableau s'il ne trouve rien
   */
  async _seedDefaultTables() {
    const defaults = this._defaultTables();
    try {
      const res = await fetch("/api/tables/seed", {
        method:  "POST",
        headers: this._authHeaders(),
        body:    JSON.stringify({ tables: defaults }),
      });
      if (res.ok) {
        const saved = await res.json();
        this.tables = Array.isArray(saved.tables) ? saved.tables : defaults;
      } else {
        this.tables = defaults;
      }
    } catch {
      this.tables = defaults;
    }
    this.tables.forEach((t) => this._attachQrData(t));
  }

  /** Attache qrData en mémoire (non stocké en DB) */
  _attachQrData(table) {
    table.qrData = {
      table:    table.number,
      chairs:   table.chairs,
      location: table.location,
      url:      `${window.location.origin}/menu.html?table=${table.number}`,
    };
    return table;
  }

  /**
   * Met à jour le statut d'une table
   * PATCH /api/tables/:number/status
   */
  async updateTableStatus(tableNumber, status, orderId = null) {
    // Optimiste : mise à jour locale immédiate
    const table = this.getTable(tableNumber);
    if (table) {
      table.status = status;
      if (orderId) table.currentOrder = orderId;
    }
    try {
      await fetch(`/api/tables/${tableNumber}/status`, {
        method:  "PATCH",
        headers: this._authHeaders(),
        body:    JSON.stringify({ status, currentOrder: orderId }),
      });
    } catch (err) {
      console.warn("[TableManager] Statut non synchronisé:", err.message);
    }
  }

  // ─── Getters ──────────────────────────────────────────────
  getTable(tableNumber) {
    return this.tables.find((t) => t.number === tableNumber);
  }
  getAllTables()      { return this.tables; }
  getAvailableTables(){ return this.tables.filter((t) => t.status === "available"); }
  getOccupiedTables() { return this.tables.filter((t) => t.status === "occupied"); }

  generateTableQR(tableNumber) {
    const table = this.getTable(tableNumber);
    if (!table) return null;
    return {
      table:    table.number,
      chairs:   table.chairs,
      location: table.location,
      url:      `${window.location.origin}/menu.html?table=${table.number}`,
    };
  }

  // ─── Affichage Admin ──────────────────────────────────────
  generateAllTableQRs() {
    const container = document.getElementById("table-qr-codes");
    if (!container) return;
    container.innerHTML = "";

    if (!this.tables.length) {
      container.innerHTML = `<p style="text-align:center;color:#666;padding:2rem;">
        Chargement des tables...</p>`;
      return;
    }

    this.tables.forEach((table) => {
      const card = document.createElement("div");
      card.className = "table-qr-card";
      card.innerHTML = `
        <div class="table-info">
          <h3>Table ${table.number}</h3>
          <p>${table.chairs} chaises • ${table.location}</p>
          <p class="table-status status-${table.status}">${this.getStatusText(table.status)}</p>
        </div>
        <div class="qr-code-container">
          <div class="qr-code" id="qr-table-${table.number}"></div>
          <button class="voir-table-qr"
            onclick="window.tableManager.voirTableQr(${table.number})">
            👁 Voir
          </button>
          <button class="btn btn-small"
            onclick="window.tableManager.printTableQR(${table.number})">
            🖨 Imprimer
          </button>
        </div>`;
      container.appendChild(card);
      setTimeout(() => {
        this.generateQRCode(`qr-table-${table.number}`, table.qrData);
      }, 200);
    });
  }

  /**
   * Modal "Voir QR" — affiche le QR en grand
   */
  voirTableQr(tableNumber) {
    const table = this.getTable(tableNumber);
    if (!table) return;

    const existing = document.getElementById("modal-voir-qr");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "modal-voir-qr";
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.75);
      display:flex;align-items:center;justify-content:center;z-index:30000;`;

    overlay.innerHTML = `
      <div style="background:white;border-radius:16px;padding:2rem;text-align:center;
                  max-width:340px;width:90%;box-shadow:0 20px 40px rgba(0,0,0,0.35);">
        <h3 style="margin:0 0 0.25rem;color:#8b4513;font-size:1.4rem;">
          Table ${table.number}
        </h3>
        <p style="margin:0 0 1.25rem;color:#666;font-size:0.9rem;">
          ${table.chairs} chaises • ${table.location}
        </p>
        <div id="modal-qr-canvas"
             style="display:inline-block;padding:14px;
                    border:3px solid #8b4513;border-radius:12px;background:white;">
        </div>
        <p style="margin:0.75rem 0 0;font-size:0.75rem;color:#aaa;font-family:monospace;">
          ${window.location.origin}/menu.html?table=${table.number}
        </p>
        <div style="margin-top:1.25rem;display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">
          <button onclick="window.tableManager.printTableQR(${table.number})"
            style="padding:0.65rem 1.2rem;background:linear-gradient(135deg,#8b4513,#a0522d);
                   color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">
            🖨 Imprimer
          </button>
          <button id="modal-voir-qr-close"
            style="padding:0.65rem 1.2rem;background:#f0f0f0;color:#333;
                   border:none;border-radius:8px;cursor:pointer;font-weight:600;">
            ✕ Fermer
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    setTimeout(() => this.generateQRCode("modal-qr-canvas", table.qrData, 220), 60);

    const close = () => overlay.remove();
    document.getElementById("modal-voir-qr-close").onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
  }

  // ─── Génération QR ────────────────────────────────────────
  generateQRCode(elementId, data, size = 150) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (typeof QRCode === "undefined") {
      this.generateQRCodeFallback(elementId, data, size);
      return;
    }
    el.innerHTML = "";
    try {
      new QRCode(el, {
        text:         JSON.stringify(data),
        width:        size,
        height:       size,
        colorDark:    "#000000",
        colorLight:   "#FFFFFF",
        correctLevel: QRCode.CorrectLevel.H,
      });
    } catch {
      this.generateQRCodeFallback(elementId, data, size);
    }
  }

  generateQRCodeFallback(elementId, data, size = 150) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(JSON.stringify(data))}`;
    const img = document.createElement("img");
    img.src = url;
    img.alt = "QR Code";
    img.style.cssText = `width:${size}px;height:${size}px;border:1px solid #ddd;border-radius:5px;`;
    img.onerror = () => {
      el.innerHTML = `
        <div style="width:${size}px;height:${size}px;border:1px solid #ddd;border-radius:5px;
                    display:flex;align-items:center;justify-content:center;
                    background:#f8f9fa;text-align:center;font-size:11px;color:#999;">
          📱<br>QR Code<br>Table ${data.table}
        </div>`;
    };
    el.innerHTML = "";
    el.appendChild(img);
  }

  // ─── Impression ───────────────────────────────────────────
  printTableQR(tableNumber) {
    const table = this.getTable(tableNumber);
    if (!table) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify(table.qrData))}`;
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html><head>
      <title>QR Code - Table ${table.number}</title>
      <style>
        @page{margin:1cm;size:A4}
        body{font-family:Arial,sans-serif;text-align:center;padding:40px 20px;
             display:flex;flex-direction:column;align-items:center;justify-content:center;
             min-height:100vh;background:linear-gradient(135deg,#8b4513,#a0522d);}
        .container{max-width:400px;width:100%;background:white;border-radius:15px;
                   padding:30px;box-shadow:0 10px 30px rgba(0,0,0,0.3);}
        h1{color:#8b4513;font-size:28px;font-weight:700;}
        h2{color:#8b4513;font-weight:600;}
        .qr-code{border:3px solid #8b4513;border-radius:15px;padding:20px;
                 display:inline-block;margin:20px 0;}
        .hint{font-size:14px;color:#666;font-weight:500;}
        @media print{body{background:white!important}.container{box-shadow:none}}
      </style></head><body>
      <div class="container">
        <h1>🍽️ La Kora Restaurant</h1>
        <h2>Table ${table.number}</h2>
        <p>${table.chairs} chaises • ${table.location}</p>
        <div class="qr-code">
          <img src="${qrUrl}" width="200" height="200" alt="QR Code"
               onload="setTimeout(()=>window.print(),400)"
               onerror="this.outerHTML='<p style=color:#c00>QR indisponible</p>'">
        </div>
        <p class="hint"><strong>📱 Scannez pour commander</strong></p>
      </div></body></html>`);
    w.document.close();
  }

  // ─── Helpers ──────────────────────────────────────────────
  getStatusText(status) {
    return { available: "Disponible", occupied: "Occupée", reserved: "Réservée" }[status] || status;
  }

  forceGenerateQRs() { this.generateAllTableQRs(); }
}

// ─── Bootstrap ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  window.tableManager = new TableManager();
});