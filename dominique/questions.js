// Eight-question qualifier on /dominique/. Starts hidden behind the "Click here
// to apply" button. Answers go to Dominique's Google Sheet via an Apps Script
// webhook. "Not right now" on the investment question ends on a Kingdom Roots
// invite instead of the booking page; Worship/Gospel artists, producers and
// mixing engineers finish on the "application received" page; everyone else continues to apply/.

const SHEET_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbwTuCWlMAFgMBSRru73gKhmkwZf_SfzMFrFrUa2cqy8XsDSOVlS9ulX1Nj7Aa8HuLDFDw/exec";
const WEBHOOK_TOKEN = "4b1452bd158dbf136adadf654d4a708265a8e7d47292473d";
// Leave empty to hide the "Join Kingdom Roots" button on the end screen.
const KINGDOM_ROOTS_URL = "https://discord.gg/XHJ7BEAsdy";

const TOTAL_QUESTIONS = 8;
const NOT_READY = "Not right now";
// Applicants in these roles are reviewed manually instead of booking a call.
const REVIEW_ROLES = ["Worship/Gospel Artist", "Producer / Beatmaker", "Mixing Engineer"];

const form = document.getElementById("applyForm");
const steps = Array.from(form.querySelectorAll(".form-step"));
const questionSteps = steps.filter((s) => s.dataset.step !== "end");
const endStep = steps.find((s) => s.dataset.step === "end");
const progressFill = document.getElementById("progressFill");
const startBtn = document.getElementById("startApply");
const buttonWrap = document.getElementById("applyButtonWrap");
const rootsLink = document.getElementById("rootsLink");

if (rootsLink && KINGDOM_ROOTS_URL) {
  rootsLink.href = KINGDOM_ROOTS_URL;
  rootsLink.hidden = false;
}

startBtn.addEventListener("click", () => {
  buttonWrap.hidden = true;
  form.hidden = false;
  showStep(0);
});

const answers = {};
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
  if (list) {
    const selected = selectedOption(step);
    if (!selected) return;
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
function sendAnswers(outcome) {
  fetch(SHEET_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(Object.assign({ token: WEBHOOK_TOKEN, outcome }, answers)),
  }).catch(() => {});
}

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

  if (answers.investReady === NOT_READY && step.querySelector('[data-field="investReady"]')) {
    finished = true;
    sendAnswers("Kingdom Roots");
    showStep(steps.indexOf(endStep));
    return;
  }

  if (currentIndex < questionSteps.length - 1) {
    showStep(currentIndex + 1);
    return;
  }

  finished = true;
  if (REVIEW_ROLES.includes(answers.role)) {
    sendAnswers("Under review");
    window.location.href = "/application-received/";
    return;
  }
  sendAnswers("Booking page");
  window.location.href = "apply/";
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

showStep(0);
