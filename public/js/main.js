// Main JavaScript for La Kora Restaurant

// Notification Utility
class NotificationManager {

  static queue = [];
  static isShowing = false;

  static formatTicket(orderId) {
    if (!orderId || typeof orderId !== "string") return null;
    // Cherche UNIQUEMENT un suffixe numérique court après le dernier tiret
    const match = orderId.match(/-(\d{1,6})$/);
    if (match) return match[1]; // "417", "042", etc.
    return null; // MongoDB _id ou format inconnu → pas de "Ticket X •"
  }

  static showSuccess(orderId, title, message, duration = 3000) {

    const ticketNumber = this.formatTicket(orderId);
  
    this.queue.push({
      title: ticketNumber
        ? `Ticket ${ticketNumber} • ${title}`
        : title,
      message,
      duration
    });
  
    this.runQueue();
  }
  
  

  static runQueue() {

    if (this.isShowing) return;
    if (this.queue.length === 0) return;

    this.isShowing = true;

    const notif = this.queue.shift();

    const popup = document.getElementById("success-popup");
    const titleEl = popup.querySelector(".popup-message h4");
    const msgEl = popup.querySelector("#popup-table-info");

    titleEl.textContent = notif.title;
    msgEl.textContent = notif.message;

    popup.classList.add("show");

    setTimeout(() => {

      popup.classList.remove("show");

      setTimeout(() => {
        this.isShowing = false;
        this.runQueue();
      }, 400);

    }, notif.duration);
  }

  static showLoading(show = true) {
    document
      .getElementById("loading-overlay")
      .classList.toggle("show", show);
  }
}


// Table Detection
// ─── PATCH menu.js — TableDetector ───────────────────────────────────────
// Remplace la classe TableDetector existante dans menu.js par celle-ci.
// Changements :
//   1. localStorage → sessionStorage pour currentTable (fix persistence)
//   2. Bouton "🎯 Démo Table 1" injecté dans la zone de scan
//   3. Paramètre URL ?demo=1 bypass le scan et charge table 1 directement

class TableDetector {
  constructor() {
    this.currentTable = null;
    this.init();
  }

  init() {
    this.detectTableFromURL();
    this.detectTableFromScan();
    this.displayTableInfo();
    this.initializeQRScanner();
    this.injectDemoButton(); // ← nouveau
  }

  // ─── Auth helper (inchangé) ───────────────────────────────
  _getToken() {
    return sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken") || null;
  }

  // ─── FIX : sessionStorage au lieu de localStorage ─────────
  detectTableFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const tableNumber = urlParams.get("table");
    const isDemo     = urlParams.get("demo") === "1";

    if (isDemo && !tableNumber) {
      // Mode démo : charge table 1 sans scan
      this.currentTable = 1;
      sessionStorage.setItem("currentTable", "1");
      sessionStorage.setItem("tableSession", JSON.stringify({
        table: 1, ts: Date.now(), ttl: 7200000
      }));
      if (window.tableManager) {
        window.tableManager.updateTableStatus(1, "occupied");
      }
      return;
    }

    if (tableNumber) {
      this.currentTable = parseInt(tableNumber);
      // ✅ sessionStorage — vidé à la fermeture du navigateur/onglet
      sessionStorage.setItem("currentTable", String(this.currentTable));

      if (window.tableManager) {
        window.tableManager.updateTableStatus(this.currentTable, "occupied");
      }
    } else {
      // ✅ On lit sessionStorage — pas localStorage
      const stored = sessionStorage.getItem("currentTable");
      this.currentTable = stored ? parseInt(stored) : null;
    }
  }

  detectTableFromScan() {
    const scannedTableData = sessionStorage.getItem("scannedTable");
    if (scannedTableData) {
      try {
        const tableData = JSON.parse(scannedTableData);
        this.currentTable = parseInt(tableData.table);
        sessionStorage.setItem("currentTable", String(this.currentTable)); // ✅ session

        if (window.tableManager) {
          window.tableManager.updateTableStatus(this.currentTable, "occupied");
        }
        sessionStorage.removeItem("scannedTable");
      } catch {}
    }
  }

  // ─── Bouton démo ──────────────────────────────────────────
  injectDemoButton() {
    // Injecte uniquement sur index.html / page de scan
    const isIndexPage =
      window.location.pathname === "/" ||
      window.location.pathname.includes("index.html");
    if (!isIndexPage) return;

    // Attend que le DOM de la zone scan soit prêt
    const tryInject = () => {
      const scanZone = document.getElementById("table-detection");
      if (!scanZone) { setTimeout(tryInject, 300); return; }

      // Evite double injection
      if (document.getElementById("demo-table-btn")) return;

      const btn = document.createElement("button");
      btn.id = "demo-table-btn";
      btn.innerHTML = "🎯 Démo — Commander à la Table 1";
      btn.style.cssText = `
        display: block;
        width: calc(100% - 2rem);
        margin: 1rem auto 0;
        padding: 0.85rem 1.5rem;
        background: linear-gradient(135deg, #c0873f, #8b5e2a);
        color: #fff;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(192,135,63,0.35);
        transition: all 0.2s;
        letter-spacing: 0.3px;
      `;

      btn.onmouseover = () => btn.style.transform = "translateY(-2px)";
      btn.onmouseout  = () => btn.style.transform = "translateY(0)";

      btn.addEventListener("click", () => {
        // Démarre la session table 1 directement
        sessionStorage.setItem("currentTable", "1");
        sessionStorage.setItem("tableSession", JSON.stringify({
          table: 1, ts: Date.now(), ttl: 7200000
        }));
        // Redirige vers menu.html avec table=1
        window.location.href = "/menu.html?table=1";
      });

      scanZone.appendChild(btn);

      // Note démo discrète
      const note = document.createElement("p");
      note.style.cssText = "text-align:center;font-size:0.75rem;color:#aaa;margin:0.5rem 1rem 0;";
      note.textContent = "Mode démo — aucune table physique requise";
      scanZone.appendChild(note);
    };

    tryInject();
  }

  // ─── Méthodes inchangées ──────────────────────────────────
  displayTableInfo() {
    const tableNumberElement = document.getElementById("current-table");
    if (tableNumberElement) {
      tableNumberElement.textContent = this.currentTable || "-";
    }

    const tableNumberIndexElement = document.getElementById("table-number");
    if (tableNumberIndexElement) {
      tableNumberIndexElement.textContent = this.currentTable || "-";
      this.showTableSection();
    }
  }

  showTableSection() {
    const tableSection = document.getElementById("table-detection");
    if (tableSection) tableSection.style.display = "block";
  }

  hideTableSection() {}

  getCurrentTable() {
    return this.currentTable;
  }

  initializeQRScanner() {
    if (
      window.location.pathname === "/" ||
      window.location.pathname.includes("index.html")
    ) {
      this.waitForQRScannerLibrary().then(() => {
        if (typeof Html5Qrcode !== "undefined" && typeof QRScannerManager !== "undefined") {
          window.qrScannerHome = new QRScannerManager(
            "qr-scanner-container-home",
            "qr-reader-home",
            "toggleCamBtn-home",
            "camera-select-home",
            "camera-selection-home"
          );
        }
      });
    }
  }

  waitForQRScannerLibrary() {
    return new Promise((resolve) => {
      if (typeof Html5Qrcode !== "undefined") { resolve(); return; }
      let attempts = 0;
      const check = setInterval(() => {
        attempts++;
        if (typeof Html5Qrcode !== "undefined" || attempts >= 50) {
          clearInterval(check); resolve();
        }
      }, 100);
    });
  }
}

// Menu Data
const menuData = {
  plats: [
    {
      id: "thieboudienne",
      name: "ceebu jeun",
      price: 3500,
      description: "Plat national sénégalais avec riz, poisson et légumes",
      ingredients:
        "Riz parfumé, poisson frais, tomates, carottes, choux, aubergines, piment",
      image: "img/thieboudjeune.jpg",
      category: "plats",
    },
    {
      id: "yassa-poulet",
      name: "Yassa au Poulet",
      price: 3200,
      description: "Poulet mariné aux oignons et citron",
      ingredients:
        "Poulet fermier, oignons, citron, ail, gingembre, piment, huile d'arachide",
      image: "img/yassa.jpg",
      category: "plats",
    },
    {
      id: "mafe",
      name: "Mafé",
      price: 3000,
      description: "Ragoût de viande aux arachides",
      ingredients:
        "Viande de bœuf, pâte d'arachide, tomates, oignons, carottes, patates douces",
      image: "img/Mafé.jpg",
      category: "plats",
    },
    {
      id: "pastels",
      name: "Pastels",
      price: 1500,
      description: "Beignets de poisson frits",
      ingredients:
        "Pâte à beignet, poisson frais, oignons, persil, piment, huile de friture",
      image: "img/pastels.jpg",
      category: "plats",
    },
    {
      id: "domoda",
      name: "Domoda",
      price: 2800,
      description: "Ragoût de viande aux légumes",
      ingredients:
        "Viande de mouton, tomates, oignons, carottes, choux, pâte d'arachide",
      image: "img/domoda.jpg",
      category: "plats",
    },
    {
      id: "thiebouyapp",
      name: "Thiebou Yapp",
      price: 3200,
      description: "Riz au mouton",
      ingredients:
        "Riz, viande de mouton, tomates, oignons, carottes, choux, épices",
      image: "img/thiebou-yapp-riz-a-la-viande.jpg",
      category: "plats",
    },
    {
      id: "soupoukanja",
      name: "Soupou Kanja",
      price: 2500,
      description: "Soupe aux feuilles de manioc",
      ingredients:
        "Feuilles de manioc, poisson fumé, tomates, oignons, piment, huile de palme",
      image: "img/skandia.jpg",
      category: "plats",
    },
    {
      id: "lakh",
      name: "Lakh",
      price: 2000,
      description: "Bouillie de mil au lait",
      ingredients: "Mil, lait, sucre, vanille, cannelle",
      image: "img/lakh.jpg",
      category: "plats",
    },
    {
      id: "ceebu_jen",
      name: "Ceebu Jën",
      price: 4000,
      description: "Riz au poisson traditionnel",
      ingredients:
        "Riz, poisson frais, tomates, oignons, carottes, choux, aubergines, piment",
      image: "img/ceebu_jen.jpg",
      category: "plats",
    },
    {
      id: "thiebou_guerté",
      name: "Thiebou Guerté",
      price: 3000,
      description: "Riz aux légumes",
      ingredients: "Riz, aubergines, carottes, choux, tomates, oignons, épices",
      image: "img/thiebou_guerte.jpg",
      category: "plats",
    },
    {
      id: "yassa_poisson",
      name: "Yassa au Poisson",
      price: 3500,
      description: "Poisson mariné aux oignons",
      ingredients:
        "Poisson frais, oignons, citron, ail, gingembre, piment, huile",
      image: "img/yassa_poisson.jpg",
      category: "plats",
    },
    {
      id: "thiebou_niébé",
      name: "Thiebou Niébé",
      price: 2500,
      description: "Riz aux haricots",
      ingredients:
        "Riz, haricots noirs, tomates, oignons, ail, gingembre, épices",
      image: "img/thiebou_niebe.jpg",
      category: "plats",
    },
  ],
  boissons: [
    {
      id: "bissap",
      name: "Bissap",
      price: 800,
      description: "Jus d'hibiscus frais",
      ingredients: "Fleurs d'hibiscus, sucre, menthe, citron, eau",
      image: "img/jus-de-bissap-avec-glaçons.jpg",
      category: "boissons",
    },
    {
      id: "gingembre",
      name: "Gingembre",
      price: 700,
      description: "Jus de gingembre épicé",
      ingredients: "Racine de gingembre, citron, sucre, piment, eau",
      image: "img/gingembre.jpg",
      category: "boissons",
    },
    {
      id: "bouye",
      name: "Bouye",
      price: 900,
      description: "Jus de pain de singe",
      ingredients: "Fruit du baobab, sucre, eau, vanille",
      image: "img/bouye.jpg",
      category: "boissons",
    },
    {
      id: "tamarind",
      name: "Tamarind",
      price: 750,
      description: "Jus de tamarin",
      ingredients: "Pulpe de tamarin, sucre, menthe, eau",
      image: "img/tamarind-juice-3.jpg",
      category: "boissons",
    },
    {
      id: "jus_mangue",
      name: "Jus de Mangue",
      price: 1000,
      description: "Jus de mangue frais",
      ingredients: "Mangues mûres, sucre, citron, eau",
      image: "img/jus_mangue.jpg",
      category: "boissons",
    },
    {
      id: "jus_orange",
      name: "Jus d'Orange",
      price: 800,
      description: "Jus d'orange pressé",
      ingredients: "Oranges fraîches, sucre, eau",
      image: "img/jus-Orange.jpeg",
      category: "boissons",
    },
    {
      id: "café_touba",
      name: "Café Touba",
      price: 600,
      description: "Café épicé traditionnel",
      ingredients: "Café, clous de girofle, poivre noir, sucre",
      image: "img/cafe_touba.jpg",
      category: "boissons",
    },
    {
      id: "thé_menthe",
      name: "Thé à la Menthe",
      price: 500,
      description: "Thé vert à la menthe",
      ingredients: "Thé vert, menthe fraîche, sucre, eau",
      image: "img/the_menthe.jpg",
      category: "boissons",
    },
    {
      id: "jus_papaye",
      name: "Jus de Papaye",
      price: 900,
      description: "Jus de papaye frais",
      ingredients: "Papaye mûre, sucre, citron, eau",
      image: "img/jus_papaye.jpg",
      category: "boissons",
    },
    {
      id: "jus_ananas",
      name: "Jus d'Ananas",
      price: 850,
      description: "Jus d'ananas frais",
      ingredients: "Ananas frais, sucre, menthe, eau",
      image: "img/jus-nas.jpg",
      category: "boissons",
    },
    {
      id: "jus_coco",
      name: "Jus de Coco",
      price: 950,
      description: "Jus de noix de coco",
      ingredients: "Noix de coco fraîche, sucre, eau",
      image: "img/lait-de-coco.jpeg",
      category: "boissons",
    },
    {
      id: "jus_citron",
      name: "Jus de Citron",
      price: 650,
      description: "Jus de citron frais",
      ingredients: "Citrons frais, sucre, menthe, eau",
      image: "img/jus-de-citron.jpg",
      category: "boissons",
    },
  ],
  desserts: [
    {
      id: "thiakry",
      name: "Thiakry",
      price: 1200,
      description: "Dessert au mil et lait caillé",
      ingredients: "Mil, lait caillé, sucre, vanille, cannelle, raisins secs",
      image: "img/Thiakry-copy.jpg",
      category: "desserts",
    },
    {
      id: "bissap_glace",
      name: "Glace au Bissap",
      price: 1500,
      description: "Glace à l'hibiscus",
      ingredients: "Bissap, lait, sucre, vanille, crème",
      image: "img/jus-de-bissap-avec-glacons.JPG",
      category: "desserts",
    },
    {
      id: "mango_sorbet",
      name: "Sorbet Mangue",
      price: 1300,
      description: "Sorbet à la mangue",
      ingredients: "Mangues mûres, sucre, citron, eau",
      image: "img/sorbet-mangue.jpg",
      category: "desserts",
    },
    {
      id: "banane_flambee",
      name: "Banane Flambée",
      price: 1800,
      description: "Bananes flambées au rhum",
      ingredients: "Bananes, rhum, sucre, beurre, cannelle",
      image: "img/banane_flambee.jpg",
      category: "desserts",
    },
    {
      id: "tarte_coco",
      name: "Tarte à la Noix de Coco",
      price: 2000,
      description: "Tarte crémeuse à la noix de coco",
      ingredients: "Noix de coco, lait, œufs, sucre, farine, beurre",
      image: "img/tarte_coco.jpg",
      category: "desserts",
    },
    {
      id: "flan_caramel",
      name: "Flan au Caramel",
      price: 1600,
      description: "Flan crémeux au caramel",
      ingredients: "Œufs, lait, sucre, vanille, caramel",
      image: "img/flan_caramel.jpg",
      category: "desserts",
    },
    {
      id: "fruit_salad",
      name: "Salade de Fruits",
      price: 1400,
      description: "Salade de fruits frais",
      ingredients: "Mangue, papaye, ananas, banane, orange, citron, menthe",
      image: "img/fruit_salad.jpg",
      category: "desserts",
    },
    {
      id: "chocolate_mousse",
      name: "Mousse au Chocolat",
      price: 1700,
      description: "Mousse au chocolat noir",
      ingredients: "Chocolat noir, œufs, sucre, crème, vanille",
      image: "img/chocolate_mousse.jpg",
      category: "desserts",
    },
    {
      id: "tiramisu",
      name: "Tiramisu",
      price: 2200,
      description: "Tiramisu aux fruits tropicaux",
      ingredients: "Mascarpone, café, cacao, fruits tropicaux, biscuits",
      image: "img/tiramisu-simple.jpg",
      category: "desserts",
    },
    {
      id: "creme_brulee",
      name: "Crème Brûlée",
      price: 1900,
      description: "Crème brûlée à la vanille",
      ingredients: "Œufs, crème, sucre, vanille, caramel",
      image: "img/creme_brulee.jpg",
      category: "desserts",
    },
    {
      id: "panna_cotta",
      name: "Panna Cotta",
      price: 1600,
      description: "Panna cotta aux fruits",
      ingredients: "Crème, sucre, gélatine, fruits, vanille",
      image: "img/panna_cotta.jpg",
      category: "desserts",
    },
    {
      id: "cheesecake",
      name: "Cheesecake",
      price: 2100,
      description: "Cheesecake aux fruits rouges",
      ingredients: "Fromage frais, biscuits, fruits rouges, sucre, œufs",
      image: "img/cheesecake.jpg",
      category: "desserts",
    },
  ],
};

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Initialize table detector
  window.tableDetector = new TableDetector();

  // Initialize other components if on menu page
  if (window.location.pathname.includes("menu.html")) {
    initializeMenuPage();
  }

  // Initialize admin page if on admin page
  if (window.location.pathname.includes("admin.html")) {
    initializeAdminPage();
  }
});

// Menu Page Initialization
function initializeMenuPage() {
  // This will be handled by menu.js
}

// Admin Page Initialization
function initializeAdminPage() {
  // This will be handled by admin.js
}

// Utility Functions
function formatPrice(price) {
  return new Intl.NumberFormat("fr-FR").format(price);
}

function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `AUD-ORD-${timestamp}-${random.toString().padStart(3, "0")}`;
}

// Export for use in other modules
window.LaKora = {
  TableDetector,
  menuData,
  formatPrice,
  generateOrderId,
};

// Remove any static/local image paths from menuData so frontend uses curated online images
try {
  Object.keys(menuData).forEach(cat => {
    menuData[cat].forEach(item => {
      if (item && item.image) delete item.image;
    });
  });
} catch (e) {
  // ignore
}

// Export NotificationManager globally
window.NotificationManager = NotificationManager;