// Shared by every /apply page (root, /erikreborn/apply/, /dominique/apply/ — each just a
// Calendly embed, nothing else). Two jobs:
// 1. Resize the widget to Calendly's own reported content height instead of guessing a fixed
//    number — avoids both an internal scrollbar (too short) and wasted empty space (too tall).
// 2. Once someone actually books a slot, send them to the confirmation page.
window.addEventListener("message", (e) => {
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
    window.location.href = window.location.origin + "/application-confirmation/";
  }
});
