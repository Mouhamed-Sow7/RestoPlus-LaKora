/**
 * Admin Authentication Manager - Handles token verification and logout
 */
class AdminAuthManager {
  constructor() {
    this.token = null;
    this.user = null;
    this.init();
  }

  init() {
    // Affiche le loading IMMÉDIATEMENT — avant toute vérification
    this.showLoadingScreen();
    this.checkAuthentication();
    this.setupLogoutHandler();
    this.setupTokenRefresh();
  }

  // ─── Loading screen ────────────────────────────────────────────────────────

  showLoadingScreen() {
    // Crée un overlay de chargement par-dessus le contenu admin
    if (document.getElementById("auth-loading-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "auth-loading-overlay";
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: #1a1a2e;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 16px;
    `;
    overlay.innerHTML = `
      <div style="
        width: 48px; height: 48px; border-radius: 50%;
        border: 4px solid rgba(255,255,255,0.15);
        border-top-color: #c0873f;
        animation: spin 0.8s linear infinite;
      "></div>
      <p style="color: rgba(255,255,255,0.7); font-family: sans-serif; font-size: 14px; margin: 0;">
        Vérification en cours…
      </p>
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    `;
    document.body.appendChild(overlay);
  }

  hideLoadingScreen() {
    const overlay = document.getElementById("auth-loading-overlay");
    if (overlay) {
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity 0.2s";
      setTimeout(() => overlay.remove(), 200);
    }
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  checkAuthentication() {
    this.token =
      sessionStorage.getItem("adminToken") ||
      localStorage.getItem("adminToken");
    this.user = JSON.parse(
      sessionStorage.getItem("adminUser") ||
        localStorage.getItem("adminUser") ||
        "{}"
    );

    if (!this.token) {
      this.redirectToLogin();
      return;
    }

    this.verifyToken();
  }

  async verifyToken() {
    try {
      // Timeout de 10 secondes — tolère le réveil de Render (free tier)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("/api/auth/verify", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) throw new Error("Token invalid");

      const data = await response.json();
      this.user = data.user;

      sessionStorage.setItem("adminUser", JSON.stringify(this.user));
      if (localStorage.getItem("adminToken")) {
        localStorage.setItem("adminUser", JSON.stringify(this.user));
      }

      // ✅ Auth OK — on révèle le contenu
      this.hideLoadingScreen();
      this.displayUserInfo();

    } catch (error) {
      // Timeout ou token invalide → login
      this.clearAuth();
      this.redirectToLogin();
    }
  }

  displayUserInfo() {
    const userElements = document.querySelectorAll("[data-user-info]");
    userElements.forEach((element) => {
      const infoType = element.getAttribute("data-user-info");
      switch (infoType) {
        case "username":
          element.textContent = this.user.username || "Admin";
          break;
        case "last-login":
          element.textContent = new Date().toLocaleString("fr-FR");
          break;
      }
    });

    const role = this.user?.role;
    if (role === "server") {
      document.querySelectorAll(".admin-nav .nav-link").forEach((link) => {
        if (!link.classList.contains("logout-btn")) {
          link.setAttribute("tabindex", "-1");
          link.classList.add("disabled");
          link.addEventListener("click", (e) => e.preventDefault());
        }
      });
    }
  }

  setupLogoutHandler() {
    document.addEventListener("click", (e) => {
      if (e.target.matches("#logout-btn, .logout-btn, [data-logout]")) {
        e.preventDefault();
        this.logout();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "L") {
        e.preventDefault();
        this.logout();
      }
    });
  }

  setupTokenRefresh() {
    setInterval(() => {
      if (this.token) this.verifyToken();
    }, 30 * 60 * 1000);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.token) this.verifyToken();
    });
  }

  logout() {
    if (confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) {
      this.clearAuth();
      this.redirectToLogin();
    }
  }

  clearAuth() {
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminUser");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    this.token = null;
    this.user = null;
  }

  redirectToLogin() {
    // Cache le contenu admin avant de rediriger
    this.hideLoadingScreen();
    window.location.href = "login.html";
  }

  getAuthHeaders() {
    if (!this.token) throw new Error("No authentication token available");
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  async authenticatedFetch(url, options = {}) {
    const headers = { ...this.getAuthHeaders(), ...options.headers };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      this.clearAuth();
      this.redirectToLogin();
      throw new Error("Authentication required");
    }
    return response;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.adminAuth = new AdminAuthManager();
});

window.AdminAuthManager = AdminAuthManager;