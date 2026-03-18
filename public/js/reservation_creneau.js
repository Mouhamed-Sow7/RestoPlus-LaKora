{/* <script> */}
// ── Créneaux horaires ─────────────────────────────────────
const SLOTS = ["12:00","12:30","13:00","13:30","19:00","19:30","20:00","20:30","21:00","21:30"];
let selectedTime = null;
let guestsCount = 2;

function renderSlots() {
  const container = document.getElementById("time-slots");
  container.innerHTML = SLOTS.map(t => `
    <div class="time-slot" data-time="${t}">${t}</div>
  `).join("");
  container.querySelectorAll(".time-slot").forEach(el => {
    el.addEventListener("click", () => {
      container.querySelectorAll(".time-slot").forEach(s => s.classList.remove("selected"));
      el.classList.add("selected");
      selectedTime = el.dataset.time;
      document.getElementById("res-time").value = selectedTime;
      document.getElementById("err-time").classList.remove("visible");
    });
  });
}
renderSlots();

// ── Date min = aujourd'hui ────────────────────────────────
const today = new Date().toISOString().split("T")[0];
document.getElementById("res-date").min = today;

// ── Guests counter ────────────────────────────────────────
const minGuests = 1, maxGuests = 20;
function updateGuests(n) {
  guestsCount = Math.min(maxGuests, Math.max(minGuests, n));
  document.getElementById("guests-count").textContent = guestsCount;
  document.getElementById("guests-value").value = guestsCount;
  document.getElementById("guests-minus").disabled = guestsCount <= minGuests;
  document.getElementById("guests-plus").disabled  = guestsCount >= maxGuests;
}
document.getElementById("guests-minus").addEventListener("click", () => updateGuests(guestsCount - 1));
document.getElementById("guests-plus").addEventListener("click",  () => updateGuests(guestsCount + 1));
updateGuests(2);

// ── Validation ────────────────────────────────────────────
function validate() {
  let ok = true;
  const set = (id, errId, cond) => {
    const el = document.getElementById(id);
    const err = document.getElementById(errId);
    if (!cond) { el.classList.add("error"); err.classList.add("visible"); ok = false; }
    else        { el.classList.remove("error"); err.classList.remove("visible"); }
  };
  const name  = document.getElementById("guest-name").value.trim();
  const phone = document.getElementById("guest-phone").value.trim();
  const email = document.getElementById("guest-email").value.trim();
  const date  = document.getElementById("res-date").value;
  const time  = document.getElementById("res-time").value;

  set("guest-name",  "err-name",  name.length >= 2);
  set("guest-phone", "err-phone", phone.length >= 6);
  set("guest-email", "err-email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  set("res-date",    "err-date",  date && date >= today);
  if (!time) { document.getElementById("err-time").classList.add("visible"); ok = false; }
  else        { document.getElementById("err-time").classList.remove("visible"); }

  return ok;
}

// ── Submit ────────────────────────────────────────────────
document.getElementById("reservation-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validate()) return;

  const btn = document.getElementById("btn-submit");
  btn.classList.add("loading"); btn.disabled = true;

  const payload = {
    name:   document.getElementById("guest-name").value.trim(),
    phone:  document.getElementById("guest-phone").value.trim(),
    email:  document.getElementById("guest-email").value.trim(),
    date:   document.getElementById("res-date").value,
    time:   document.getElementById("res-time").value,
    guests: parseInt(document.getElementById("guests-value").value),
    note:   document.getElementById("res-note").value.trim(),
  };

  try {
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Erreur");

    document.getElementById("reservation-form-card").style.display = "none";
    document.getElementById("success-ref").textContent = data.reservationId || "RES-" + Date.now().toString(36).toUpperCase();
    document.getElementById("success-card").classList.add("visible");
  } catch (err) {
    alert("Erreur : " + err.message + "\nVeuillez réessayer.");
  } finally {
    btn.classList.remove("loading"); btn.disabled = false;
  }
});
// </script>