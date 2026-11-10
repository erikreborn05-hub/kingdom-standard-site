// Five-question application form shared by the homepage, /erikreborn/ and
// /dominique/, hidden behind the "Click here to apply" button. Answers go to the
// Google Sheet as the visitor goes and when they leave, tagged with the page.
// Producers and engineers always end on the "application received" page; a
// plain "No" to the $200 question gets the Kingdom Roots invite; Hip-Hop/R&B
// artists who answer "Yes" or "No, but I'm planning to" go to the page's
// booking calendar (the form's data-booking); anyone else ends on
// "application received".

const SHEET_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbwObKB-C8yU0U5D8gJUabpvmYD7lMUyuCDztsLGo6Ructv0_1Jwk4KM2P7-1Vz7mY46/exec";
const WEBHOOK_TOKEN = "4b1452bd158dbf136adadf654d4a708265a8e7d47292473d";

const TOTAL_QUESTIONS = 5;
// "Yes" books a call only if at least one of these roles is selected; anyone
// else is reviewed by hand.
const BOOKING_ROLES = ["Christian Hip-Hop Artist", "Christian R&B Artist"];
// We don't work with producers or engineers: picking either always ends on the
// "application received" page, even alongside an artist role.
const EXCLUDED_ROLES = ["Beatmaker / Mixing Engineer", "Other"];
const BOOKING_ANSWERS = ["Yes", "No, but I’m planning to"];
// Plain "No" to the $200 question gets the free community invite instead.
const KINGDOM_ROOTS_URL = "https://discord.gg/XHJ7BEAsdy";
let selectedRoles = [];

const form = document.getElementById("applyForm");
// Which landing page this is, for the Source column in the sheet.
const PAGE_SOURCE = location.pathname.split("/")[1] || "homepage";
const steps = Array.from(form.querySelectorAll(".form-step"));
const questionSteps = steps.filter((s) => s.dataset.step !== "end");
const endStep = steps.find((s) => s.dataset.step === "end");
const progressFill = document.getElementById("progressFill");
const startBtn = document.getElementById("startApply");
const buttonWrap = document.getElementById("applyButtonWrap");
const rootsLink = document.getElementById("rootsLink");
if (rootsLink) {
  rootsLink.href = KINGDOM_ROOTS_URL;
  rootsLink.hidden = false;
}

// When the form was opened, so the sheet script can drop applications
// finished faster than a person could (bots).
let openedAt = 0;
const honeypot = document.getElementById("website");

startBtn.addEventListener("click", () => {
  if (!openedAt) openedAt = Date.now();
  buttonWrap.hidden = true;
  form.hidden = false;
  showStep(0);
});

const answers = {};
// One ID per visit so the sheet updates a single row as answers come in,
// instead of adding a new row for every step.
// Shared with the booking page (apply.js) so a booking updates this same row.
let sessionId = null;
try {
  sessionId = sessionStorage.getItem("ks_session");
} catch (e) {}
if (!sessionId) {
  sessionId =
    (window.crypto && crypto.randomUUID && crypto.randomUUID()) ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    sessionStorage.setItem("ks_session", sessionId);
  } catch (e) {}
}
let currentIndex = 0;
let autoAdvanceTimer = null;
let finished = false;

function showStep(index) {
  steps.forEach((s, i) => s.classList.toggle("active", i === index));
  currentIndex = index;
  const step = steps[index];
  const num = step.dataset.step === "end" ? TOTAL_QUESTIONS : parseInt(step.dataset.step, 10);
  progressFill.style.width = `${Math.min((num / TOTAL_QUESTIONS) * 100, 100)}%`;
  const first = step.querySelector("input:not(.other-input), textarea");
  if (first) first.focus({ preventScroll: true });
}

function textFields(step) {
  return Array.from(step.querySelectorAll("input:not(.other-input), textarea"));
}

function selectedOption(step) {
  const list = step.querySelector(".option-list");
  return list ? list.querySelector(".option.selected") : null;
}

function optionLabel(optionEl) {
  const clone = optionEl.cloneNode(true);
  const letter = clone.querySelector(".option-letter");
  if (letter) letter.remove();
  return clone.textContent.trim();
}

// Returns the first invalid element, or null if the step is complete.
function invalidField(step) {
  const list = step.querySelector(".option-list");
  if (list) {
    const selected = selectedOption(step);
    if (!selected) return list;
    if (selected.dataset.other === "true") {
      const other = step.querySelector(".other-input");
      if (!other.value.trim()) return other;
    }
    return null;
  }
  return (
    textFields(step).find(
      (f) => !f.value.trim() || !f.checkValidity() || (f.type === "tel" && f.value.replace(/\D/g, "").length < 7)
    ) || null
  );
}

function flashInvalid(el) {
  if (!el) return;
  el.style.borderColor = "#b0555a";
  setTimeout(() => {
    el.style.borderColor = "";
  }, 900);
}

function recordAnswers(step) {
  const list = step.querySelector(".option-list");
  if (list && list.dataset.multi === "true") {
    const labels = Array.from(list.querySelectorAll(".option.selected")).map(optionLabel);
    if (list.dataset.field === "role") selectedRoles = labels;
    answers[list.dataset.field] = labels.join(", ");
    return;
  }
  if (list) {
    const selected = selectedOption(step);
    if (!selected) return;
    if (list.dataset.field === "role") selectedRoles = [optionLabel(selected)];
    answers[list.dataset.field] =
      selected.dataset.other === "true"
        ? `Other: ${step.querySelector(".other-input").value.trim()}`
        : optionLabel(selected);
    return;
  }
  textFields(step).forEach((f) => {
    const code = f.type === "tel" ? step.querySelector(".phone-code") : null;
    answers[f.name || f.id] = code ? `${code.value} ${f.value.trim()}` : f.value.trim();
  });
}

// Fire-and-forget: a webhook hiccup should never block the visitor.
// Lets the booking page pre-fill Calendly so they don't retype their details.
function rememberContact() {
  try {
    sessionStorage.setItem(
      "ks_contact",
      JSON.stringify({ name: answers.fullName, email: answers.email, instagram: answers.instagram })
    );
  } catch (e) {}
}

function sendAnswers(outcome) {
  rememberContact();
  fetch(SHEET_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    keepalive: true,
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(
      Object.assign(
        {
          token: WEBHOOK_TOKEN,
          sessionId,
          source: PAGE_SOURCE,
          outcome,
          website: honeypot ? honeypot.value : "",
          elapsedMs: openedAt ? Date.now() - openedAt : 0,
        },
        answers
      )
    ),
  }).catch(() => {});
}

function progressOutcome() {
  return `Stopped at question ${steps[currentIndex].dataset.step}`;
}

// Keep whatever is typed or picked on the current step even if it was never
// submitted with Continue (used when the visitor leaves mid-form).
function recordPartial(step) {
  const list = step.querySelector(".option-list");
  if (list) {
    if (list.querySelector(".option.selected")) recordAnswers(step);
    return;
  }
  textFields(step).forEach((f) => {
    if (f.value.trim()) answers[f.name || f.id] = f.value.trim();
  });
  const phone = step.querySelector('input[type="tel"]');
  const code = step.querySelector(".phone-code");
  if (phone && code && phone.value.trim()) answers[phone.name || phone.id] = `${code.value} ${phone.value.trim()}`;
}

function hasAnswers() {
  return Object.keys(answers).length > 0;
}

// Leaving the page (closing the tab, switching apps, going back) saves progress.
function saveOnLeave() {
  if (finished || form.hidden) return;
  recordPartial(steps[currentIndex]);
  if (hasAnswers()) sendAnswers(progressOutcome());
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveOnLeave();
});
window.addEventListener("pagehide", saveOnLeave);

function goNext() {
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
  }
  if (finished) return;

  const step = steps[currentIndex];
  const bad = invalidField(step);
  if (bad) {
    flashInvalid(bad);
    return;
  }
  recordAnswers(step);

  if (currentIndex < questionSteps.length - 1) {
    showStep(currentIndex + 1);
    sendAnswers(progressOutcome());
    return;
  }

  finished = true;
  const excluded = selectedRoles.some((r) => EXCLUDED_ROLES.includes(r));
  // Kingdom Roots is for Christian artists only, so producers/engineers never get it.
  if (answers.investReady === "No" && !excluded) {
    sendAnswers("Kingdom Roots");
    showStep(steps.indexOf(endStep));
    return;
  }
  const canBook =
    !excluded &&
    selectedRoles.some((r) => BOOKING_ROLES.includes(r)) &&
    BOOKING_ANSWERS.includes(answers.investReady);
  if (!canBook) {
    sendAnswers("Under review");
    window.location.href = "/application-received/";
    return;
  }
  sendAnswers("Booking page");
  window.location.href = form.dataset.booking || "apply/";
}

function goBack() {
  // A pending auto-advance from an option click would otherwise fire after we
  // move back and push the visitor forward again.
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
  }
  if (currentIndex > 0 && steps[currentIndex] !== endStep) showStep(currentIndex - 1);
}

form.querySelectorAll("[data-next]").forEach((btn) => btn.addEventListener("click", goNext));
form.querySelectorAll("[data-back]").forEach((btn) => btn.addEventListener("click", goBack));

// Enter advances; Shift+Enter still adds a newline in text areas.
form.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const step = steps[currentIndex];
  if (step === endStep) return;
  if (step.querySelector(".option-list") && !step.querySelector(".other-input.visible")) return;
  if (e.target.tagName === "TEXTAREA" && e.shiftKey) return;
  e.preventDefault();
  goNext();
});

// Single-select options auto-advance, except "Other", which reveals a text box.
form.querySelectorAll(".option-list").forEach((list) => {
  const step = list.closest(".form-step");
  const otherInput = step.querySelector(".other-input");

  list.querySelectorAll(".option").forEach((opt) => {
    opt.addEventListener("click", () => {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
      }
      if (list.dataset.multi === "true") {
        opt.classList.toggle("selected");
        return; // multi-select waits for Continue
      }
      list.querySelectorAll(".option").forEach((o) => o.classList.remove("selected"));
      opt.classList.add("selected");
      const isOther = opt.dataset.other === "true";

      if (otherInput) {
        otherInput.classList.toggle("visible", isOther);
        if (isOther) {
          otherInput.focus();
          return;
        }
        otherInput.value = "";
      }

      autoAdvanceTimer = setTimeout(() => {
        autoAdvanceTimer = null;
        goNext();
      }, 220);
    });
  });
});

// Coming back from the booking page with the browser's Back button can restore
// this page as it was left (mid-redirect), so let the form be used again.
window.addEventListener("pageshow", (e) => {
  if (e.persisted && steps[currentIndex] !== endStep) finished = false;
});

// Pre-select the phone country code from the visitor's browser region
// (e.g. "en-GB" -> United Kingdom). Falls back to the United States.
(function () {
  const select = document.getElementById("phoneCode");
  if (!select) return;
  const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
  for (const lang of langs) {
    const region = (lang || "").split("-")[1];
    if (!region) continue;
    const option = select.querySelector(`option[data-cc="${region.toUpperCase()}"]`);
    if (option) {
      option.selected = true;
      break;
    }
  }

  // Show just the code ("+44") in the box; the full country list still
  // appears when it's tapped. The real select sits invisibly on top.
  const wrap = document.createElement("div");
  wrap.className = "phone-code-wrap";
  const shown = document.createElement("span");
  shown.className = "phone-code-shown";
  shown.setAttribute("aria-hidden", "true");
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(shown);
  wrap.appendChild(select);
  const update = () => {
    shown.textContent = select.value;
  };
  select.addEventListener("change", update);
  select.addEventListener("focus", () => wrap.classList.add("focused"));
  select.addEventListener("blur", () => wrap.classList.remove("focused"));
  update();
})();

showStep(0);
