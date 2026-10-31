// One-question qualifier on /dominique/, hidden behind the "Click here to apply"
// button. "Yes" goes to the booking page; "No" goes to the application-received
// page. The answer is also logged to Dominique's Google Sheet.

const SHEET_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbw2u91V46TkZQ2507kpNiDOD3mi0XA-j2WN5ltwTAJtuBHXjij4bh-8Hswl7d1IuvmaRQ/exec";
const WEBHOOK_TOKEN = "4b1452bd158dbf136adadf654d4a708265a8e7d47292473d";

const form = document.getElementById("applyForm");
const startBtn = document.getElementById("startApply");
const buttonWrap = document.getElementById("applyButtonWrap");
let finished = false;

startBtn.addEventListener("click", () => {
  buttonWrap.hidden = true;
  form.hidden = false;
});

// Fire-and-forget: a webhook hiccup should never block the visitor.
function logAnswer(answer, outcome) {
  fetch(SHEET_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ token: WEBHOOK_TOKEN, investReady: answer, outcome }),
  }).catch(() => {});
}

form.querySelectorAll(".option").forEach((opt) => {
  opt.addEventListener("click", () => {
    if (finished) return;
    finished = true;
    form.querySelectorAll(".option").forEach((o) => o.classList.remove("selected"));
    opt.classList.add("selected");
    const yes = opt.textContent.trim().endsWith("Yes");
    logAnswer(yes ? "Yes" : "No", yes ? "Booking page" : "Under review");
    setTimeout(() => {
      window.location.href = yes ? "apply/" : "/application-received/";
    }, 250);
  });
});

// Returning with the browser's Back button can restore this page mid-redirect.
window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    finished = false;
    form.querySelectorAll(".option").forEach((o) => o.classList.remove("selected"));
  }
});
