/**
 * Login Manager - Handles admin authentication
 */
class LoginManager {
  constructor() {
    this.form = document.getElementById("login-form");
    this.errorBox = document.getElementById("login-error");
    this.loginBtn = document.querySelector(".login-btn");
    this.btnText = document.querySelector(".btn-text");
    this.btnLoader = document.querySelector(".btn-loader");

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.checkExistingAuth();
  }

  setupEventListeners() {
    if (this.form) {
      this.form.addEventListener("submit", (e) => this.handleLogin(e));
    }
  }

  checkExistingAuth() {
    // Check if already authenticated
    const token = sessionStorage.getItem("adminToken");
    if (token) {
      // Verify token is still valid
      this.verifyToken(token);
    }
  }

  async verifyToken(token) {
    try {
      const response = await fetch("/api/auth/verify", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Token is valid, redirect to admin
        window.location.href = "admin.html";
      } else {
        // Token is invalid, clear it
        sessionStorage.removeItem("adminToken");
        sessionStorage.removeItem("adminUser");
      }
    } catch (error) {
      sessionStorage.removeItem("adminToken");
      sessionStorage.removeItem("adminUser");
    }
  }

  async handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const remember = document.getElementById("remember").checked;

    if (!username || !password) {
      this.showError("Veuillez remplir tous les champs");
      return;
    }

    this.setLoading(true);
    this.hideError();

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur de connexion");
      }

      // Store authentication data — compatibilité API v2 (accessToken) + v1 (token)
      const token = data.accessToken || data.token;
      if (remember) {
        localStorage.setItem("adminToken", token);
        localStorage.setItem("adminUser", JSON.stringify(data.user));
      } else {
        sessionStorage.setItem("adminToken", token);
        sessionStorage.setItem("adminUser", JSON.stringify(data.user));
      }

      // Show success message briefly
      this.showSuccess("Connexion réussie ! Redirection...");

      // Redirect to admin panel
      setTimeout(() => {
        window.location.href = "admin.html";
      }, 1000);
    } catch (error) {
      this.showError(error.message || "Erreur de connexion");
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(loading) {
    if (loading) {
      this.btnText.style.display = "none";
      this.btnLoader.style.display = "flex";
      this.loginBtn.disabled = true;
      this.loginBtn.classList.add("loading");
    } else {
      this.btnText.style.display = "block";
      this.btnLoader.style.display = "none";
      this.loginBtn.disabled = false;
      this.loginBtn.classList.remove("loading");
    }
  }

  showError(message) {
    this.errorBox.textContent = message;
    this.errorBox.style.display = "flex";
    this.errorBox.classList.add("show");

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.hideError();
    }, 5000);
  }

  showSuccess(message) {
    this.errorBox.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            ${message}
        `;
    this.errorBox.style.display = "flex";
    this.errorBox.classList.remove("error");
    this.errorBox.classList.add("success");
    this.errorBox.classList.add("show");
  }

  hideError() {
    this.errorBox.classList.remove("show");
    this.errorBox.classList.remove("success");
    this.errorBox.classList.add("error");
  }
}

// Initialize login manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new LoginManager();
});

// Handle page visibility change to check auth status
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    const token =
      sessionStorage.getItem("adminToken") ||
      localStorage.getItem("adminToken");
    if (token) {
      // Verify token is still valid
      fetch("/api/auth/verify", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
        .then((response) => {
          if (response.ok) {
            window.location.href = "admin.html";
          }
        })
        .catch(() => {
          // Token invalid, stay on login page
        });
    }
  }
});
