// Reservation Management System for RestoPlus

class ReservationManager {
  constructor() {
    this.reservations = [];
    this.init();
  }

  init() {
    this.loadReservations();
    this.setupEventListeners();
    this.setMinDate();
  }

  setupEventListeners() {
    const form = document.getElementById("reservation-form");
    if (form) {
      form.addEventListener("submit", (e) => this.handleReservationSubmit(e));
    }
  }

  setMinDate() {
    const dateInput = document.getElementById("date");
    if (dateInput) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateInput.min = tomorrow.toISOString().split("T")[0];
    }
  }

  handleReservationSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const reservation = {
      id: this.generateReservationId(),
      name: formData.get("name"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      guests: formData.get("guests"),
      date: formData.get("date"),
      time: formData.get("time"),
      location: formData.get("location") || "Aucune préférence",
      specialRequests: formData.get("special-requests"),
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    this.addReservation(reservation);
    this.showSuccessMessage("Réservation enregistrée avec succès!");
    e.target.reset();
  }

  generateReservationId() {
    return "RES-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
  }

  addReservation(reservation) {
    this.reservations.push(reservation);
    this.saveReservations();
    this.displayReservations();
  }

  loadReservations() {
    const savedReservations = localStorage.getItem("restaurantReservations");
    if (savedReservations) {
      this.reservations = JSON.parse(savedReservations);
    }
    this.displayReservations();
  }

  saveReservations() {
    localStorage.setItem(
      "restaurantReservations",
      JSON.stringify(this.reservations)
    );
  }

  displayReservations() {
    const reservationsList = document.getElementById("reservations-list");
    const myReservationsSection = document.getElementById("my-reservations");

    if (!reservationsList || !myReservationsSection) return;

    if (this.reservations.length === 0) {
      myReservationsSection.style.display = "none";
      return;
    }

    myReservationsSection.style.display = "block";
    reservationsList.innerHTML = "";

    // Sort reservations by date (newest first)
    const sortedReservations = this.reservations.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    sortedReservations.forEach((reservation) => {
      const reservationItem = document.createElement("div");
      reservationItem.className = "reservation-item";
      reservationItem.innerHTML = `
        <div class="reservation-details">
          <h4>${reservation.name}</h4>
          <p><strong>Date:</strong> ${this.formatDate(reservation.date)}</p>
          <p><strong>Heure:</strong> ${reservation.time}</p>
          <p><strong>Personnes:</strong> ${reservation.guests}</p>
          <p><strong>Salle:</strong> ${reservation.location}</p>
          ${
            reservation.specialRequests
              ? `<p><strong>Demandes:</strong> ${reservation.specialRequests}</p>`
              : ""
          }
        </div>
        <div class="reservation-status-container">
          <span class="reservation-status status-${reservation.status}">
            ${this.getStatusText(reservation.status)}
          </span>
          <div class="reservation-actions">
            <button class="btn btn-small btn-danger" onclick="window.reservationManager.cancelReservation('${
              reservation.id
            }')">
              Annuler
            </button>
          </div>
        </div>
      `;
      reservationsList.appendChild(reservationItem);
    });
  }

  cancelReservation(reservationId) {
    if (confirm("Êtes-vous sûr de vouloir annuler cette réservation?")) {
      const reservation = this.reservations.find((r) => r.id === reservationId);
      if (reservation) {
        reservation.status = "cancelled";
        this.saveReservations();
        this.displayReservations();
        this.showSuccessMessage("Réservation annulée");
      }
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  getStatusText(status) {
    const statusTexts = {
      pending: "En attente",
      confirmed: "Confirmée",
      cancelled: "Annulée",
    };
    return statusTexts[status] || status;
  }

  showSuccessMessage(message) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll(
      ".success-message, .error-message"
    );
    existingMessages.forEach((msg) => msg.remove());

    const successDiv = document.createElement("div");
    successDiv.className = "success-message";
    successDiv.textContent = message;

    const form = document.getElementById("reservation-form");
    if (form) {
      form.parentNode.insertBefore(successDiv, form);

      // Remove message after 5 seconds
      setTimeout(() => {
        successDiv.remove();
      }, 5000);
    }
  }

  showErrorMessage(message) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll(
      ".success-message, .error-message"
    );
    existingMessages.forEach((msg) => msg.remove());

    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = message;

    const form = document.getElementById("reservation-form");
    if (form) {
      form.parentNode.insertBefore(errorDiv, form);

      // Remove message after 5 seconds
      setTimeout(() => {
        errorDiv.remove();
      }, 5000);
    }
  }

  // Get all reservations (for admin)
  getAllReservations() {
    return this.reservations;
  }

  // Get reservations by date
  getReservationsByDate(date) {
    return this.reservations.filter((r) => r.date === date);
  }

  // Get pending reservations
  getPendingReservations() {
    return this.reservations.filter((r) => r.status === "pending");
  }

  // Update reservation status
  updateReservationStatus(reservationId, status) {
    const reservation = this.reservations.find((r) => r.id === reservationId);
    if (reservation) {
      reservation.status = status;
      this.saveReservations();
      this.displayReservations();
    }
  }
}

// Initialize reservation manager when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  window.reservationManager = new ReservationManager();
});
