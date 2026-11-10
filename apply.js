// Shared by every /apply page (root, /erikreborn/apply/, /dominique/apply/ — each just a
// Calendly embed, nothing else). Two jobs:
// 1. Resize the widget to Calendly's own reported content height instead of guessing a fixed
//    number — avoids both an internal scrollbar (too short) and wasted empty space (too tall).
// 2. Once someone actually books a slot, log it to the sheet (crediting the landing page
//    they came through) and send them to the confirmation page.
const SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwObKB-C8yU0U5D8gJUabpvmYD7lMUyuCDztsLGo6Ructv0_1Jwk4KM2P7-1Vz7mY46/exec";
const WEBHOOK_TOKEN = "4b1452bd158dbf136adadf654d4a708265a8e7d47292473d";

function logBooking() {
  let sessionId = null;
  let source = null;
  try {
    sessionId = sessionStorage.getItem("ks_session");
    source = sessionStorage.getItem("ks_source");
  } catch (e) {}
  sessionId = sessionId || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  source = source || location.pathname.split("/")[1] || "homepage";
  fetch(SHEET_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    keepalive: true,
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ token: WEBHOOK_TOKEN, sessionId, source, outcome: "Booked call" }),
  }).catch(() => {});
}

// Pre-fill Calendly with what they gave on the form: name, email, and their
// Instagram handle as the answer to the event's first custom question (a1).
// Runs before widget.js loads.
(function () {
  let contact = null;
  try {
    contact = JSON.parse(sessionStorage.getItem("ks_contact") || "null");
  } catch (e) {}
  const widget = document.querySelector(".calendly-inline-widget");
  if (!contact || !widget) return;
  const url = new URL(widget.dataset.url);
  if (contact.name) url.searchParams.set("name", contact.name);
  if (contact.email) url.searchParams.set("email", contact.email);
  if (contact.instagram) url.searchParams.set("a1", contact.instagram);
  widget.dataset.url = url.toString();
})();

window.addEventListener("message", (e) => {
  // Only trust messages from the Calendly embed, not any other window.
  if (e.origin !== "https://calendly.com") return;
  let data = e.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (err) {
      return;
    }
  }
  if (!data || typeof data.event !== "string") return;

  if (data.event === "calendly.page_height" && data.payload && data.payload.height) {
    const widget = document.querySelector(".calendly-inline-widget");
    if (widget) widget.style.height = `${data.payload.height}px`;
  }

  if (data.event === "calendly.event_scheduled") {
    logBooking();
    // Calendly redirects to the confirmation page itself, with the booked time in
    // the URL (for the "Add to calendar" buttons). Only step in if it doesn't.
    setTimeout(() => {
      window.location.href = window.location.origin + "/application-confirmation/";
    }, 4000);
  }
});
