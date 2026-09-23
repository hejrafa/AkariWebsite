(() => {
  const root = document.documentElement;
  const themes = ["meadow", "forest", "coast", "canyon"];
  const modes = ["light", "dark"];
  const languages = ["en", "de"];

  function cookieValue(name) {
    const prefix = `${name}=`;
    const entry = document.cookie.split(";").map((value) => value.trim()).find((value) => value.startsWith(prefix));
    return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
  }

  function saveCookie(name, value) {
    const sharedDomain = location.hostname === "joinakari.com" || location.hostname.endsWith(".joinakari.com")
      ? "; Domain=.joinakari.com; Secure"
      : "";
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${sharedDomain}`;
  }

  function persist(name, value) {
    try { localStorage.setItem(name, value); } catch {}
    try { saveCookie(name, value); } catch {}
  }

  function stored(name) {
    try { return cookieValue(name) || localStorage.getItem(name); } catch { return cookieValue(name); }
  }

  function selectedAppearance() {
    return {
      theme: themes.includes(root.dataset.theme) ? root.dataset.theme : "forest",
      mode: modes.includes(root.dataset.mode) ? root.dataset.mode : "dark",
      language: languages.includes(root.dataset.language) ? root.dataset.language : "en",
    };
  }

  function withAppearance(url) {
    const appearance = selectedAppearance();
    url.searchParams.set("theme", appearance.theme);
    url.searchParams.set("mode", appearance.mode);
    url.searchParams.set("lang", appearance.language);
    return url;
  }

  function landingURL() {
    const local = location.hostname === "127.0.0.1" || location.hostname === "localhost";
    return withAppearance(new URL(local ? "http://127.0.0.1:8080/" : "https://joinakari.com/")).href;
  }

  function syncPageChrome() {
    const appearance = selectedAppearance();
    for (const image of document.querySelectorAll("img[data-akari-logo]")) {
      image.src = `https://joinakari.com/assets/logo/akari-logo-${appearance.theme}-${appearance.mode}.svg?v=2`;
    }
    for (const link of document.querySelectorAll("[data-akari-home]")) link.href = landingURL();
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = getComputedStyle(root).getPropertyValue("--page").trim();
  }

  function apply() {
    const params = new URLSearchParams(location.search);
    const requestedTheme = params.get("theme");
    const requestedMode = params.get("mode");
    const requestedLanguage = params.get("lang");
    const theme = themes.includes(requestedTheme) ? requestedTheme : stored("akari-theme");
    const mode = modes.includes(requestedMode) ? requestedMode : stored("akari-mode");
    const language = languages.includes(requestedLanguage) ? requestedLanguage : stored("akari-language");

    root.dataset.theme = themes.includes(theme) ? theme : "forest";
    root.dataset.mode = modes.includes(mode)
      ? mode
      : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    root.dataset.language = languages.includes(language) ? language : "en";
    root.lang = root.dataset.language;

    if (themes.includes(requestedTheme)) persist("akari-theme", root.dataset.theme);
    if (modes.includes(requestedMode)) persist("akari-mode", root.dataset.mode);
    if (languages.includes(requestedLanguage)) persist("akari-language", root.dataset.language);
  }

  apply();
  window.AkariAppearance = { apply, persist, landingURL, syncPageChrome };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", syncPageChrome, { once: true });
  else syncPageChrome();

  window.addEventListener("storage", (event) => {
    if (!["akari-theme", "akari-mode", "akari-language"].includes(event.key)) return;
    apply();
    syncPageChrome();
    window.dispatchEvent(new CustomEvent("akariappearancechange"));
  });
})();
