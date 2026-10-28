// Two-question qualifier embedded directly on /dominique/. Starts hidden
// behind a "Click here to apply" button; clicking it swaps the button out
// for the form in place. On completion, the two answers are sent to a
// Google Sheet via an Apps Script webhook (see APPS_SCRIPT_SNIPPET.md for
// the doPost() this pairs with), then the visitor is sent on to the booking
// page. Logic mirrors the site's old multi-step form (same auto-advance/
// validation patterns), trimmed to two steps.

const SHEET_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbzltdMI7KSf1brRfpwcLV49FtR0rTbz5OSBwzYc482CUsAhRUulIwWp17kHjNu01jhm/exec";
const WEBHOOK_TOKEN = "4b1452bd158dbf136adadf654d4a708265a8e7d47292473d";

const TOTAL_QUESTIONS = 2;
const form = document.getElementById("applyForm");
const steps = Array.from(form.querySelectorAll(".form-step"));
const progressFill = document.getElementById("progressFill");
const startBtn = document.getElementById("startApply");
const buttonWrap = document.getElementById("applyButtonWrap");

if (startBtn) {
  startBtn.addEventListener("click", () => {
    buttonWrap.hidden = true;
    form.hidden = false;
    showStep(0); // re-focus the first field now that it's actually visible
  });
}

const answers = {};
let currentIndex = 0;
let autoAdvanceTimer = null; // pending setTimeout(goNext) from an option click, if any

function showStep(index) {
  steps.forEach((s, i) => s.classList.toggle("active", i === index));
  currentIndex = index;

  const step = steps[index];
  const stepNum = parseInt(step.dataset.step, 10) || TOTAL_QUESTIONS;
  const pct = Math.min((stepNum / TOTAL_QUESTIONS) * 100, 100);
  progressFill.style.width = `${pct}%`;

  const firstField = step.querySelector("input:not([type=hidden]), textarea");
  if (firstField) firstField.focus({ preventScroll: true });
}

function selectedOption(step) {
  const optionList = step.querySelector(".option-list");
  return optionList ? optionList.querySelector(".option.selected") : null;
}

function validateStep(step) {
  const optionList = step.querySelector(".option-list");
  if (optionList) {
    const selected = selectedOption(step);
    if (!selected) return false;
    if (selected.dataset.other === "true") {
      const otherInput = step.querySelector(".other-input");
      return !!(otherInput && otherInput.value.trim());
    }
    return true;
  }
  const textarea = step.querySelector("textarea");
  if (textarea) return !!textarea.value.trim();
  return true;
}

function flashInvalid(el) {
  if (!el) return;
  el.style.borderColor = "#b0555a";
  setTimeout(() => {
    el.style.borderColor = "";
  }, 900);
}

function optionLabel(optionEl) {
  const clone = optionEl.cloneNode(true);
  const letter = clone.querySelector(".option-letter");
  if (letter) letter.remove();
  return clone.textContent.trim();
}

function recordAnswers(step) {
  const optionList = step.querySelector(".option-list");
  if (optionList) {
    const selected = selectedOption(step);
    if (selected && selected.dataset.other === "true") {
      const otherInput = step.querySelector(".other-input");
      answers[optionList.dataset.field] = otherInput.value.trim();
    } else if (selected) {
      answers[optionList.dataset.field] = optionLabel(selected);
    }
    return;
  }
  const textarea = step.querySelector("textarea");
  if (textarea) answers[textarea.name || textarea.id] = textarea.value.trim();
}

// Fire-and-forget, same pattern the old erikreborn form used: a webhook
// hiccup should never block someone from reaching the booking page.
function sendAnswers() {
  fetch(SHEET_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(Object.assign({ token: WEBHOOK_TOKEN }, answers)),
  }).catch(() => {});
}

function goNext() {
  // See erikreborn/form.js history: an option click can have an auto-advance
  // already queued, and a manual Continue click before it fires would run
  // goNext() twice. Clearing here means whichever happens first wins.
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
  }

  const step = steps[currentIndex];
  if (!validateStep(step)) {
    const optionList = step.querySelector(".option-list");
    const selected = optionList ? selectedOption(step) : null;
    const invalidEl =
      selected && selected.dataset.other === "true"
        ? step.querySelector(".other-input")
        : step.querySelector("textarea");
    flashInvalid(invalidEl);
    return;
  }

  recordAnswers(step);

  if (currentIndex < steps.length - 1) {
    showStep(currentIndex + 1);
    return;
  }

  // Both questions answered — record them, then on to the existing booking page.
  sendAnswers();
  window.location.href = "apply/";
}

function goBack() {
  if (currentIndex > 0) showStep(currentIndex - 1);
}

form.querySelectorAll("[data-next]").forEach((btn) => btn.addEventListener("click", goNext));
form.querySelectorAll("[data-back]").forEach((btn) => btn.addEventListener("click", goBack));

// Enter key advances (Shift+Enter still inserts a newline in the textarea)
form.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const step = steps[currentIndex];
  if (step.querySelector(".option-list") && !step.querySelector(".other-input.visible")) return;
  if (e.target.tagName === "TEXTAREA" && e.shiftKey) return;
  e.preventDefault();
  goNext();
});

// Step 1: single-select, auto-advance (except "Other", which reveals a text field)
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
          return; // wait for free-text entry + Continue
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

showStep(0);
