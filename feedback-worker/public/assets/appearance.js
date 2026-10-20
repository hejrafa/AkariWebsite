(() => {
  const root = document.documentElement;
  const themes = ["meadow", "forest", "coast", "canyon", "plain"];
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
    return url;
  }

  // The website gives each language its own address, so the German landing page is /de/.
  function landingURL() {
    const local = location.hostname === "127.0.0.1" || location.hostname === "localhost";
    const path = selectedAppearance().language === "de" ? "/de/" : "/";
    return withAppearance(new URL(path, local ? "http://127.0.0.1:8080/" : "https://joinakari.com/")).href;
  }

  function syncPageChrome() {
    const appearance = selectedAppearance();
    for (const image of document.querySelectorAll("img[data-akari-logo]")) {
      // The logo sits on the deep band in both modes, so it is always the variant drawn for a dark ground.
      image.src = `https://joinakari.com/assets/logo/akari-logo-${appearance.theme}-dark.svg?v=2`;
    }
    for (const link of document.querySelectorAll("[data-akari-home]")) link.href = landingURL();
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = getComputedStyle(root).getPropertyValue("--band").trim();
  }

  function apply() {
    const params = new URLSearchParams(location.search);
    const requestedTheme = params.get("theme");
    const requestedMode = params.get("mode");
    const requestedLanguage = params.get("lang");
    const theme = themes.includes(requestedTheme) ? requestedTheme : stored("akari-theme");
    const mode = modes.includes(requestedMode) ? requestedMode : stored("akari-mode");
    const language = languages.includes(requestedLanguage) ? requestedLanguage : stored("akari-language");
    // Without a saved choice, the browser's language decides, as on the website.
    const systemLanguage = (navigator.languages?.[0] || navigator.language || "en").split("-")[0].toLowerCase();

    root.dataset.theme = themes.includes(theme) ? theme : "forest";
    root.dataset.mode = modes.includes(mode)
      ? mode
      : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    root.dataset.language = languages.includes(language) ? language : languages.includes(systemLanguage) ? systemLanguage : "en";
    root.lang = root.dataset.language;

    if (themes.includes(requestedTheme)) persist("akari-theme", root.dataset.theme);
    if (modes.includes(requestedMode)) persist("akari-mode", root.dataset.mode);
    if (languages.includes(requestedLanguage)) persist("akari-language", root.dataset.language);
  }

  // Overscroll shows the root's colour at both ends (admin.css): the band while nearer the top, where the
  // header is, and the page colour while nearer the bottom.
  function syncScrollEnd() {
    const range = root.scrollHeight - innerHeight;
    const end = range > 0 && scrollY > range / 2 ? "bottom" : "top";
    if (root.dataset.scrollEnd !== end) root.dataset.scrollEnd = end;
  }

  apply();
  addEventListener("scroll", syncScrollEnd, { passive: true });
  addEventListener("resize", syncScrollEnd);
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
