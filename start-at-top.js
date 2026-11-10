// Always open the landing pages at the top, on the VSL. Browsers (and in-app
// browsers like Instagram's) otherwise restore wherever the visitor was last
// time, and late-loading video players can nudge the page down.
(function () {
  if (location.hash) return; // a link to a specific section should still work
  try {
    history.scrollRestoration = "manual";
  } catch (e) {}

  let userMoved = false;
  const stop = () => {
    userMoved = true;
  };
  ["wheel", "touchstart", "keydown", "mousedown"].forEach((t) =>
    addEventListener(t, stop, { passive: true, once: true })
  );

  const toTop = () => {
    if (!userMoved && scrollY !== 0) scrollTo(0, 0);
  };
  toTop();
  addEventListener("DOMContentLoaded", toTop);
  addEventListener("load", toTop);
  addEventListener("pageshow", toTop);

  // For the first few seconds, undo any jump the visitor didn't make themselves.
  const started = Date.now();
  addEventListener(
    "scroll",
    function guard() {
      if (Date.now() - started > 4000 || userMoved) {
        removeEventListener("scroll", guard);
        return;
      }
      toTop();
    },
    { passive: true }
  );
})();
