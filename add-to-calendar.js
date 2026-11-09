// "Add to calendar" buttons on the confirmation page. Calendly redirects here with
// the booked time in the URL (event_start_time / event_end_time) when "Pass event
// details to your redirected page" is on for the event. Without those, the page
// just points people to their confirmation email.
(function () {
  const box = document.getElementById("addCal");
  if (!box) return;

  const params = new URLSearchParams(location.search);
  const start = new Date(params.get("event_start_time") || "");
  const end = new Date(params.get("event_end_time") || "");
  if (isNaN(start) || isNaN(end) || end <= start) return;

  const title = "Kingdom Standard call";
  const details = "Your Kingdom Standard call. The joining link is in your Calendly confirmation email.";
  const utc = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  document.getElementById("calWhen").textContent = start.toLocaleString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  document.getElementById("calGoogle").href =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${utc(start)}/${utc(end)}` +
    `&details=${encodeURIComponent(details)}`;

  document.getElementById("calOutlook").href =
    "https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent" +
    `&subject=${encodeURIComponent(title)}` +
    `&startdt=${encodeURIComponent(start.toISOString())}` +
    `&enddt=${encodeURIComponent(end.toISOString())}` +
    `&body=${encodeURIComponent(details)}`;

  // Apple Calendar and most other apps open a downloaded .ics file.
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kingdom Standard//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${utc(start)}-${Math.random().toString(36).slice(2)}@kingdomstandard.net`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${details}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  document.getElementById("calApple").href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));

  box.hidden = false;
  const fallback = document.getElementById("calFallback");
  if (fallback) fallback.hidden = true;
})();
