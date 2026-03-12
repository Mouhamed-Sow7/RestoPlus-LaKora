// Burger Menu Management System for La Kora Restaurant

class BurgerMenuManager {
  constructor() {
    this.isOpen = false;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.createMobileNav();
  }

  setupEventListeners() {
    const burgerMenu = document.getElementById("burger-menu");
    if (burgerMenu) {
      burgerMenu.addEventListener("click", () => this.toggleMenu());
    }

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (
        this.isOpen &&
        !e.target.closest(".mobile-nav") &&
        !e.target.closest(".burger-menu")
      ) {
        this.closeMenu();
      }
    });

    // Close menu on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.closeMenu();
      }
    });
  }

  createMobileNav() {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "mobile-nav-overlay";
    overlay.id = "mobile-nav-overlay";
    document.body.appendChild(overlay);

    // Create mobile navigation
    const mobileNav = document.createElement("div");
    mobileNav.className = "mobile-nav";
    mobileNav.id = "mobile-nav";

    // Get current page to determine active link
    const currentPage = this.getCurrentPage();

    mobileNav.innerHTML = `
      <div class="mobile-nav-header">
        <h3>La Kora</h3>
        <button class="mobile-nav-close" id="mobile-nav-close">×</button>
      </div>
      <div class="mobile-nav-links">
        <a href="index.html" class="mobile-nav-link ${
          currentPage === "index" ? "active" : ""
        }">Accueil</a>
        <a href="menu.html" class="mobile-nav-link ${
          currentPage === "menu" ? "active" : ""
        }">Menu</a>
        <a href="reservation.html" class="mobile-nav-link ${
          currentPage === "reservation" ? "active" : ""
        }">Réservation</a>
      
        <a href="admin.html" class="mobile-nav-link admin-link ${
          currentPage === "admin" ? "active" : ""
        }">Admin</a>
      </div>
    `;

    document.body.appendChild(mobileNav);

    // Add close button event listener
    const closeBtn = document.getElementById("mobile-nav-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.closeMenu());
    }

    // Add overlay click event
    overlay.addEventListener("click", () => this.closeMenu());

    // Add link click events to close menu
    const mobileLinks = mobileNav.querySelectorAll(".mobile-nav-link");
    mobileLinks.forEach((link) => {
      link.addEventListener("click", () => {
        // Small delay to allow navigation
        setTimeout(() => this.closeMenu(), 100);
      });
    });
  }

  getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes("menu.html")) return "menu";
    if (path.includes("reservation.html")) return "reservation";
    if (path.includes("admin.html")) return "admin";
    return "index";
  }

  toggleMenu() {
    if (this.isOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    const burgerMenu = document.getElementById("burger-menu");
    const overlay = document.getElementById("mobile-nav-overlay");
    const mobileNav = document.getElementById("mobile-nav");

    if (burgerMenu && overlay && mobileNav) {
      burgerMenu.classList.add("active");
      overlay.classList.add("active");
      mobileNav.classList.add("active");
      this.isOpen = true;

      // Prevent body scroll
      document.body.style.overflow = "hidden";
    }
  }

  closeMenu() {
    const burgerMenu = document.getElementById("burger-menu");
    const overlay = document.getElementById("mobile-nav-overlay");
    const mobileNav = document.getElementById("mobile-nav");

    if (burgerMenu && overlay && mobileNav) {
      burgerMenu.classList.remove("active");
      overlay.classList.remove("active");
      mobileNav.classList.remove("active");
      this.isOpen = false;

      // Restore body scroll
      document.body.style.overflow = "";
    }
  }

  // Method to update active link when page changes
  updateActiveLink() {
    const mobileLinks = document.querySelectorAll(".mobile-nav-link");
    const currentPage = this.getCurrentPage();

    mobileLinks.forEach((link) => {
      link.classList.remove("active");
      if (
        link.href.includes(currentPage + ".html") ||
        (currentPage === "index" && link.href.includes("index.html"))
      ) {
        link.classList.add("active");
      }
    });
  }
}

// Initialize burger menu when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  window.burgerMenuManager = new BurgerMenuManager();
});
