// Click-to-expand lightbox for the testimonial screenshots. Builds its own
// overlay markup on load, so nothing needs adding to the page HTML beyond
// this script tag. No-ops on any page with no .testimonial-card images.
(function () {
  const images = document.querySelectorAll(".testimonial-card img");
  if (images.length === 0) return;

  const overlay = document.createElement("div");
  overlay.className = "lightbox";
  overlay.hidden = true;

  const overlayImg = document.createElement("img");
  overlay.appendChild(overlayImg);
  document.body.appendChild(overlay);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "lightbox-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.hidden = true;
  closeBtn.textContent = "×";
  document.body.appendChild(closeBtn);

  function open(img) {
    overlayImg.src = img.currentSrc || img.src;
    overlayImg.alt = img.alt || "";
    overlay.hidden = false;
    closeBtn.hidden = false;
  }

  function close() {
    overlay.hidden = true;
    closeBtn.hidden = true;
    overlayImg.src = "";
  }

  images.forEach((img) => {
    img.addEventListener("click", () => open(img));
  });

  overlay.addEventListener("click", close);
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
})();
