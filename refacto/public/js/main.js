 // Main JavaScript for RestoPlus (multi-restaurant ready)
 
 // Notification Utility (identique à la version actuelle)
 class NotificationManager {
   static queue = [];
   static isShowing = false;
 
   static formatTicket(orderId) {
     if (!orderId || typeof orderId !== "string") return null;
     const match = orderId.match(/-(\d{1,6})$/);
     if (match) return match[1];
     return null;
   }
 
   static showSuccess(orderId, title, message, duration = 3000) {
     const ticketNumber = this.formatTicket(orderId);
 
     this.queue.push({
       title: ticketNumber ? `Ticket ${ticketNumber} • ${title}` : title,
       message,
       duration,
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
 
 // Table Detection (copié tel quel)
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
     this.injectDemoButton();
   }
 
   _getToken() {
     return (
       sessionStorage.getItem("adminToken") ||
       localStorage.getItem("adminToken") ||
       null
     );
   }
 
   detectTableFromURL() {
     const urlParams = new URLSearchParams(window.location.search);
     const tableNumber = urlParams.get("table");
     const isDemo = urlParams.get("demo") === "1";
 
     if (isDemo && !tableNumber) {
       this.currentTable = 1;
       sessionStorage.setItem("currentTable", "1");
       sessionStorage.setItem(
         "tableSession",
         JSON.stringify({
           table: 1,
           ts: Date.now(),
           ttl: 7200000,
         })
       );
       if (window.tableManager) {
         window.tableManager.updateTableStatus(1, "occupied");
       }
       return;
     }
 
     if (tableNumber) {
       this.currentTable = parseInt(tableNumber);
       sessionStorage.setItem("currentTable", String(this.currentTable));
 
       if (window.tableManager) {
         window.tableManager.updateTableStatus(this.currentTable, "occupied");
       }
     } else {
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
         sessionStorage.setItem("currentTable", String(this.currentTable));
 
         if (window.tableManager) {
           window.tableManager.updateTableStatus(this.currentTable, "occupied");
         }
         sessionStorage.removeItem("scannedTable");
       } catch {}
     }
   }
 
   injectDemoButton() {
     const isIndexPage =
       window.location.pathname === "/" ||
       window.location.pathname.includes("index.html");
     if (!isIndexPage) return;
 
     const tryInject = () => {
       const scanZone = document.getElementById("table-detection");
       if (!scanZone) {
         setTimeout(tryInject, 300);
         return;
       }
 
       if (document.getElementById("demo-table-btn")) return;
 
       const btn = document.createElement("button");
       btn.id = "demo-table-btn";
       btn.innerHTML = "🎯 Démo — Commander à la Table 1";
       btn.style.cssText = `
         display: block;
         width: calc(100% - 2rem);
         margin: 1rem auto 0;
         padding: 0.85rem 1.5rem;
         background: linear-gradient(135deg, var(--brand), var(--brand-dark));
         color: #fff;
         border: none;
         border-radius: 12px;
         font-size: 1rem;
         font-weight: 700;
         cursor: pointer;
         box-shadow: 0 4px 16px rgba(0,0,0,0.25);
         transition: all 0.2s;
         letter-spacing: 0.3px;
       `;
 
       btn.onmouseover = () => (btn.style.transform = "translateY(-2px)");
       btn.onmouseout = () => (btn.style.transform = "translateY(0)");
 
       btn.addEventListener("click", () => {
         sessionStorage.setItem("currentTable", "1");
         sessionStorage.setItem(
           "tableSession",
           JSON.stringify({
             table: 1,
             ts: Date.now(),
             ttl: 7200000,
           })
         );
         window.location.href = "/menu.html?table=1";
       });
 
       scanZone.appendChild(btn);
 
       const note = document.createElement("p");
       note.style.cssText =
         "text-align:center;font-size:0.75rem;color:#aaa;margin:0.5rem 1rem 0;";
       note.textContent =
         "Mode démo — aucune table physique requise";
       scanZone.appendChild(note);
     };
 
     tryInject();
   }
 
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
         if (
           typeof Html5Qrcode !== "undefined" &&
           typeof QRScannerManager !== "undefined"
         ) {
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
       if (typeof Html5Qrcode !== "undefined") {
         resolve();
         return;
       }
       let attempts = 0;
       const check = setInterval(() => {
         attempts++;
         if (typeof Html5Qrcode !== "undefined" || attempts >= 50) {
           clearInterval(check);
           resolve();
         }
       }, 100);
     });
   }
 }
 
 // Menu Data (copié)
 const menuData = {
   plats: [
     {
       id: "thieboudienne",
       name: "ceebu jeun",
       price: 3500,
       description:
         "Plat national sénégalais avec riz, poisson et légumes",
       ingredients:
         "Riz parfumé, poisson frais, tomates, carottes, choux, aubergines, piment",
       image: "img/thieboudjeune.jpg",
       category: "plats",
     },
     // ... le reste du menu est identique à la version actuelle ...
   ],
   boissons: [],
   desserts: [],
 };
 
 // Initialize when DOM is loaded
 document.addEventListener("DOMContentLoaded", function () {
   window.tableDetector = new TableDetector();
 
   if (window.location.pathname.includes("menu.html")) {
     initializeMenuPage();
   }
 
   if (window.location.pathname.includes("admin.html")) {
     initializeAdminPage();
   }
 });
 
 function initializeMenuPage() {
   // Géré par menu.js
 }
 
 function initializeAdminPage() {
   // Géré par admin.js
 }
 
 // Utility Functions
 function formatPrice(price) {
   if (window.formatRestoPrice) {
     return window.formatRestoPrice(price);
   }
   return new Intl.NumberFormat("fr-FR").format(price);
 }
 
 function generateOrderId() {
   const timestamp = Date.now();
   const random = Math.floor(Math.random() * 1000);
   return `AUD-ORD-${timestamp}-${random.toString().padStart(3, "0")}`;
 }
 
 // Export global
 window.RestoPlus = {
   TableDetector,
   menuData,
   formatPrice,
   generateOrderId,
 };
 
 // Compatibilité : garder l'ancien nom si d'autres scripts l'utilisent
 window.LaKora = window.RestoPlus;
 
 // Nettoyage des images pour laisser la place à un CDN si besoin
 try {
   Object.keys(menuData).forEach((cat) => {
     menuData[cat].forEach((item) => {
       if (item && item.image) delete item.image;
     });
   });
 } catch (e) {}
 
 // Export NotificationManager globalement
 window.NotificationManager = NotificationManager;

