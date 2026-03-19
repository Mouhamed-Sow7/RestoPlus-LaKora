// ─── Dashboard Statistiques — RestoPlus ───────────────────────────────────
// Dépendances : Chart.js (CDN), SheetJS (CDN) — chargés dans admin.html

class StatsManager {
    constructor() {
      this.currentPeriod = "day";
      this.orders        = [];
      this.charts        = {};
      this.init();
    }
  
    init() {
      this.setupFilters();
      this.setupExport();
    }
  
    // ─── Appelé par le SPA quand on clique sur #stats ────────────────────
    async load() {
      await this.fetchOrders();
      this.renderKPIs();
      this.renderCharts();
      this.renderTable();
    }
  
    // ─── Fetch toutes les commandes de la période ─────────────────────────
    async fetchOrders() {
      const { start, end } = this.getPeriodRange(this.currentPeriod);
      try {
        const res = await spaAuthenticatedFetch(
          `/api/orders?limit=500&startDate=${start.toISOString()}&endDate=${end.toISOString()}&includePendingApproval=true`
        );
        const data = await res.json();
        this.orders = Array.isArray(data.orders) ? data.orders : [];
      } catch {
        this.orders = [];
      }
    }
  
    // ─── Période → date range ─────────────────────────────────────────────
    getPeriodRange(period) {
      const now   = new Date();
      const start = new Date(now);
      const end   = new Date(now);
  
      if (period === "day") {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (period === "week") {
        const day = now.getDay() || 7;
        start.setDate(now.getDate() - day + 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (period === "month") {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (period === "year") {
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      }
      return { start, end };
    }
  
    // ─── KPI Cards ────────────────────────────────────────────────────────
    renderKPIs() {
      const fmt = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));
  
      const validOrders = this.orders.filter(o => o.status !== "cancelled" && o.status !== "merged");
      const totalRevenue  = validOrders.reduce((s, o) => s + (o.total || 0), 0);
      const paidRevenue   = validOrders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + (o.total || 0), 0);
      const pendingRevenue= validOrders.filter(o => o.paymentStatus !== "paid").reduce((s, o) => s + (o.total || 0), 0);
      const avgOrder      = validOrders.length ? totalRevenue / validOrders.length : 0;
  
      document.getElementById("kpi-revenue").textContent = fmt(totalRevenue);
      document.getElementById("kpi-paid").textContent    = fmt(paidRevenue);
      document.getElementById("kpi-pending").textContent = fmt(pendingRevenue);
      document.getElementById("kpi-orders").textContent  = validOrders.length;
      document.getElementById("kpi-avg").textContent     = fmt(avgOrder);
    }
  
    // ─── Charts ───────────────────────────────────────────────────────────
    renderCharts() {
      this.renderLineChart();
      this.renderBarChart();
      this.renderDonutChart();
    }
  
    // Courbe revenus dans le temps
    renderLineChart() {
      const ctx = document.getElementById("chart-revenue-line");
      if (!ctx) return;
  
      const { labels, totalData, paidData } = this.getTimeSeriesData();
  
      if (this.charts.line) this.charts.line.destroy();
      this.charts.line = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Total",
              data: totalData,
              borderColor: "#c0873f",
              backgroundColor: "rgba(192,135,63,0.1)",
              borderWidth: 2.5,
              pointRadius: 4,
              pointBackgroundColor: "#c0873f",
              tension: 0.4,
              fill: true,
            },
            {
              label: "Encaissé",
              data: paidData,
              borderColor: "#27ae60",
              backgroundColor: "rgba(39,174,96,0.08)",
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: "#27ae60",
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) =>
                  ` ${new Intl.NumberFormat("fr-FR").format(ctx.parsed.y)} CFA`,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (v) =>
                  new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(v),
              },
              grid: { color: "rgba(0,0,0,0.05)" },
            },
            x: { grid: { display: false } },
          },
        },
      });
    }
  
    // Barres par statut commande
    renderBarChart() {
      const ctx = document.getElementById("chart-status-bar");
      if (!ctx) return;
  
      const statusLabels = {
        accepted: "Acceptées",
        preparing: "En prép.",
        ready: "Prêtes",
        served: "Servies",
        cancelled: "Annulées",
        pending_approval: "En attente",
      };
  
      const counts = {};
      this.orders.forEach(o => {
        if (o.status === "merged") return;
        counts[o.status] = (counts[o.status] || 0) + 1;
      });
  
      const labels = Object.keys(counts).map(k => statusLabels[k] || k);
      const values = Object.values(counts);
      const colors = Object.keys(counts).map(k => ({
        accepted: "#27ae60",
        preparing: "#f39c12",
        ready: "#2980b9",
        served: "#8e44ad",
        cancelled: "#e74c3c",
        pending_approval: "#95a5a6",
      }[k] || "#bdc3c7"));
  
      if (this.charts.bar) this.charts.bar.destroy();
      this.charts.bar = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: colors,
            borderRadius: 6,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: "rgba(0,0,0,0.05)" } },
            x: { grid: { display: false } },
          },
        },
      });
    }
  
    // Donut méthodes paiement
    renderDonutChart() {
      const ctx = document.getElementById("chart-payment-donut");
      if (!ctx) return;
  
      const methods = { cash: 0, card: 0, mobile: 0, wave: 0, orange_money: 0 };
      this.orders.forEach(o => {
        if (o.status === "merged" || o.status === "cancelled") return;
        const m = o.paymentMethod || "cash";
        methods[m] = (methods[m] || 0) + 1;
      });
  
      const filtered = Object.entries(methods).filter(([, v]) => v > 0);
      const labelMap  = { cash: "Espèces", card: "Carte", mobile: "Mobile", wave: "Wave", orange_money: "Orange Money" };
  
      if (this.charts.donut) this.charts.donut.destroy();
      this.charts.donut = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: filtered.map(([k]) => labelMap[k] || k),
          datasets: [{
            data: filtered.map(([, v]) => v),
            backgroundColor: ["#c0873f", "#27ae60", "#2980b9", "#8e44ad", "#e67e22"],
            borderWidth: 2,
            borderColor: "#fff",
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: { padding: 12, font: { size: 12 } },
            },
          },
          cutout: "65%",
        },
      });
    }
  
    // ─── Séries temporelles pour la courbe ───────────────────────────────
    getTimeSeriesData() {
      const validOrders = this.orders.filter(o => o.status !== "cancelled" && o.status !== "merged");
  
      if (this.currentPeriod === "day") {
        // Par heure (0-23)
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const totalData = new Array(24).fill(0);
        const paidData  = new Array(24).fill(0);
        validOrders.forEach(o => {
          const h = new Date(o.timestamp).getHours();
          totalData[h] += o.total || 0;
          if (o.paymentStatus === "paid") paidData[h] += o.total || 0;
        });
        return {
          labels: hours.map(h => `${String(h).padStart(2, "0")}h`),
          totalData, paidData,
        };
      }
  
      if (this.currentPeriod === "week") {
        const jours = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
        const totalData = new Array(7).fill(0);
        const paidData  = new Array(7).fill(0);
        validOrders.forEach(o => {
          const d = new Date(o.timestamp).getDay();
          const idx = d === 0 ? 6 : d - 1;
          totalData[idx] += o.total || 0;
          if (o.paymentStatus === "paid") paidData[idx] += o.total || 0;
        });
        return { labels: jours, totalData, paidData };
      }
  
      if (this.currentPeriod === "month") {
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const totalData = new Array(daysInMonth).fill(0);
        const paidData  = new Array(daysInMonth).fill(0);
        validOrders.forEach(o => {
          const d = new Date(o.timestamp).getDate() - 1;
          totalData[d] += o.total || 0;
          if (o.paymentStatus === "paid") paidData[d] += o.total || 0;
        });
        return {
          labels: Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`),
          totalData, paidData,
        };
      }
  
      if (this.currentPeriod === "year") {
        const mois = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
        const totalData = new Array(12).fill(0);
        const paidData  = new Array(12).fill(0);
        validOrders.forEach(o => {
          const m = new Date(o.timestamp).getMonth();
          totalData[m] += o.total || 0;
          if (o.paymentStatus === "paid") paidData[m] += o.total || 0;
        });
        return { labels: mois, totalData, paidData };
      }
  
      return { labels: [], totalData: [], paidData: [] };
    }
  
    // ─── Tableau détaillé ────────────────────────────────────────────────
    renderTable() {
      const tbody = document.getElementById("stats-table-body");
      const count = document.getElementById("stats-table-count");
      if (!tbody) return;
  
      const visible = this.orders.filter(o => o.status !== "merged");
      if (count) count.textContent = `${visible.length} ticket${visible.length > 1 ? "s" : ""}`;
  
      if (!visible.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="stats-table-empty">Aucune commande sur cette période</td></tr>`;
        return;
      }
  
      const fmt     = (n) => new Intl.NumberFormat("fr-FR").format(n || 0);
      const fmtDate = (d) => d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
      const payLabel = { cash: "Espèces", card: "Carte", mobile: "Mobile", wave: "Wave", orange_money: "OM" };
      const statusLabel = {
        pending_approval: "⏳ Attente",
        accepted: "✅ Acceptée",
        preparing: "👨‍🍳 Prép.",
        ready: "🍽️ Prête",
        served: "🎉 Servie",
        cancelled: "❌ Annulée",
      };
  
      tbody.innerHTML = visible.map(o => {
        const id = o.orderId || o.id || "—";
        const shortId = id.length > 18 ? "…" + id.slice(-12) : id;
        const isPaid = o.paymentStatus === "paid";
        return `
          <tr>
            <td class="stats-td-id" title="${id}">${shortId}</td>
            <td>Table ${o.table || "—"}</td>
            <td>${fmtDate(o.timestamp)}</td>
            <td>${(o.items || []).length}</td>
            <td class="stats-td-amount">${fmt(o.total)} CFA</td>
            <td>
              <span class="stats-pay-badge ${isPaid ? "paid" : "unpaid"}">
                ${isPaid ? "✅" : "⏳"} ${payLabel[o.paymentMethod] || o.paymentMethod || "—"}
              </span>
            </td>
            <td>
              <span class="stats-status-badge status-${o.status}">
                ${statusLabel[o.status] || o.status}
              </span>
            </td>
          </tr>`;
      }).join("");
    }
  
    // ─── Filtres période ─────────────────────────────────────────────────
    setupFilters() {
      document.addEventListener("click", async (e) => {
        const btn = e.target.closest(".stats-filter-btn");
        if (!btn) return;
        document.querySelectorAll(".stats-filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentPeriod = btn.dataset.period;
        await this.load();
      });
    }
  
    // ─── Export Excel ────────────────────────────────────────────────────
    setupExport() {
      document.addEventListener("click", (e) => {
        if (!e.target.closest("#stats-export-btn")) return;
        this.exportExcel();
      });
    }
  
    exportExcel() {
      if (typeof XLSX === "undefined") {
        alert("Bibliothèque Excel non chargée. Vérifiez votre connexion.");
        return;
      }
  
      const payLabel = { cash: "Espèces", card: "Carte", mobile: "Mobile", wave: "Wave", orange_money: "Orange Money" };
      const statusLabel = {
        pending_approval: "En attente",
        accepted: "Acceptée",
        preparing: "En préparation",
        ready: "Prête",
        served: "Servie",
        cancelled: "Annulée",
      };
  
      const rows = this.orders
        .filter(o => o.status !== "merged")
        .map(o => ({
          "Ticket ID":          o.orderId || o.id,
          "Table":              `Table ${o.table || "—"}`,
          "Date & Heure":       o.timestamp ? new Date(o.timestamp).toLocaleString("fr-FR") : "—",
          "Nb Articles":        (o.items || []).length,
          "Montant (CFA)":      o.total || 0,
          "Méthode paiement":   payLabel[o.paymentMethod] || o.paymentMethod || "—",
          "Statut paiement":    o.paymentStatus === "paid" ? "Payé" : "Impayé",
          "Statut commande":    statusLabel[o.status] || o.status,
        }));
  
      const periodLabels = { day: "Aujourd'hui", week: "Semaine", month: "Mois", year: "Année" };
      const ws   = XLSX.utils.json_to_sheet(rows);
      const wb   = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Revenus");
  
      // Largeurs colonnes
      ws["!cols"] = [
        { wch: 30 }, { wch: 10 }, { wch: 18 }, { wch: 12 },
        { wch: 15 }, { wch: 18 }, { wch: 14 }, { wch: 16 },
      ];
  
      const filename = `RestoPlus_Stats_${periodLabels[this.currentPeriod]}_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.xlsx`;
      XLSX.writeFile(wb, filename);
    }
  }
  
  // Bootstrap
  document.addEventListener("DOMContentLoaded", () => {
    window.statsManager = new StatsManager();
  });