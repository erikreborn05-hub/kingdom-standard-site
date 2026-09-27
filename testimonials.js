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

  let opener = null;

  function open(img) {
    opener = img;
    overlayImg.src = img.currentSrc || img.src;
    overlayImg.alt = img.alt || "";
    overlay.hidden = false;
    closeBtn.hidden = false;
    document.documentElement.style.overflow = "hidden";
    closeBtn.focus();
  }

  function close() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    closeBtn.hidden = true;
    overlayImg.src = "";
    document.documentElement.style.overflow = "";
    if (opener) opener.focus();
  }

  images.forEach((img) => {
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    img.addEventListener("click", () => open(img));
    img.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(img);
      }
    });
  });

  overlay.addEventListener("click", close);
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
})();
