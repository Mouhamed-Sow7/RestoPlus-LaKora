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
    this.checkAuthentication();
    this.setupLogoutHandler();
    this.setupTokenRefresh();
  }

  checkAuthentication() {
    // Check for token in sessionStorage first, then localStorage
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

    // Verify token is still valid
    this.verifyToken();
  }

  async verifyToken() {
    try {
      const response = await fetch("/api/auth/verify", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Token invalid");
      }

      const data = await response.json();
      this.user = data.user;

      // Update stored user data
      sessionStorage.setItem("adminUser", JSON.stringify(this.user));
      if (localStorage.getItem("adminToken")) {
        localStorage.setItem("adminUser", JSON.stringify(this.user));
      }

      this.displayUserInfo();
    } catch (error) {
      this.clearAuth();
      this.redirectToLogin();
    }
  }

  displayUserInfo() {
    // Update any user info displays in the admin panel
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

    // Role-based UI restrictions for 'server' role
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
    // Handle logout button clicks
    document.addEventListener("click", (e) => {
      if (e.target.matches("#logout-btn, .logout-btn, [data-logout]")) {
        e.preventDefault();
        this.logout();
      }
    });

    // Handle logout via keyboard shortcut (Ctrl+Shift+L)
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "L") {
        e.preventDefault();
        this.logout();
      }
    });
  }

  setupTokenRefresh() {
    // Refresh token every 30 minutes
    setInterval(() => {
      if (this.token) {
        this.verifyToken();
      }
    }, 30 * 60 * 1000); // 30 minutes

    // Check token validity when page becomes visible
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.token) {
        this.verifyToken();
      }
    });
  }

  logout() {
    // Show confirmation dialog
    if (confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) {
      this.clearAuth();
      this.redirectToLogin();
    }
  }

  clearAuth() {
    // Clear all authentication data
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminUser");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");

    this.token = null;
    this.user = null;
  }

  redirectToLogin() {
    // Add a small delay to show any loading states
    setTimeout(() => {
      window.location.href = "login.html";
    }, 100);
  }

  // Method to get current token for API calls
  getAuthHeaders() {
    if (!this.token) {
      throw new Error("No authentication token available");
    }

    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  // Method to make authenticated API calls
  async authenticatedFetch(url, options = {}) {
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If token is invalid, redirect to login
    if (response.status === 401) {
      this.clearAuth();
      this.redirectToLogin();
      throw new Error("Authentication required");
    }

    return response;
  }
}

// Initialize authentication manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.adminAuth = new AdminAuthManager();
});

// Export for use in other scripts
window.AdminAuthManager = AdminAuthManager;
