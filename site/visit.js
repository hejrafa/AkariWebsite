// Counts one visit per page load for the admin dashboard. Nothing is stored in
// the browser: no cookies, no localStorage, no identifier. The server derives a
// daily visitor hash it can't link to anyone once the day is over.
(() => {
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  if (local || navigator.webdriver) return;

  const params = new URLSearchParams(window.location.search);
  let source = params.get("utm_source") || params.get("ref") || "";
  if (!source && document.referrer) {
    try {
      const referrer = new URL(document.referrer);
      if (referrer.hostname !== window.location.hostname) source = referrer.hostname;
    } catch {}
  }

  const body = JSON.stringify({ path: window.location.pathname, source });
  const endpoint = "https://api.joinakari.com/v1/visit";
  try {
    if (navigator.sendBeacon?.(endpoint, body)) return;
  } catch {}
  fetch(endpoint, { method: "POST", body, keepalive: true, mode: "no-cors" }).catch(() => {});
})();
