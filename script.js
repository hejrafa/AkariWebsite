const root = document.documentElement;
const themeColor = document.querySelector('meta[name="theme-color"]');
const themeButtons = document.querySelectorAll("[data-theme-target]");
const modeButtons = document.querySelectorAll("[data-mode-target]");
const brandLogo = document.querySelector(".brand img");
const creditsLink = document.querySelector(".credits-heart");
const siteRoot = new URL(".", document.currentScript?.src || window.location.href);
const systemModePreference = window.matchMedia("(prefers-color-scheme: dark)");
let followsSystemMode = false;

const pageColors = {
  dark: {
    meadow: "#1d1b07",
    forest: "#151a0c",
    coast: "#0d1920",
    canyon: "#1a100c",
  },
  light: {
    meadow: "#f1eac6",
    forest: "#e6f4d1",
    coast: "#d7edf8",
    canyon: "#f4ddd1",
  },
};

function updateThemeColor() {
  const color = pageColors[root.dataset.mode]?.[root.dataset.theme];
  if (color && themeColor) themeColor.content = color;
  if (brandLogo) {
    brandLogo.src = new URL(`assets/logo/akari-logo-${root.dataset.theme}-${root.dataset.mode}.svg?v=2`, siteRoot).href;
  }
  if (creditsLink) {
    creditsLink.href = new URL(`health/credits.html?theme=${encodeURIComponent(root.dataset.theme)}&mode=${encodeURIComponent(root.dataset.mode)}`, siteRoot).href;
  }
}

function selectTheme(theme, persist = true) {
  if (!pageColors.dark[theme]) return;
  root.dataset.theme = theme;
  themeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.themeTarget === theme));
  });
  if (persist) {
    try { localStorage.setItem("akari-theme", theme); } catch (error) {}
  }
  updateThemeColor();
}

function selectMode(mode, persist = true) {
  if (!pageColors[mode]) return;
  root.dataset.mode = mode;
  modeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.modeTarget === mode));
  });
  if (persist) {
    followsSystemMode = false;
    try { localStorage.setItem("akari-mode", mode); } catch (error) {}
  }
  updateThemeColor();
}

themeButtons.forEach((button) => {
  button.addEventListener("click", () => selectTheme(button.dataset.themeTarget));
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => selectMode(button.dataset.modeTarget));
});

try {
  const params = new URLSearchParams(window.location.search);
  const requestedTheme = params.get("theme");
  const requestedMode = params.get("mode");
  const queryTheme = pageColors.dark[requestedTheme] ? requestedTheme : null;
  const queryMode = pageColors[requestedMode] ? requestedMode : null;
  const savedTheme = localStorage.getItem("akari-theme");
  const savedMode = localStorage.getItem("akari-mode");

  followsSystemMode = !queryMode && !savedMode;
  selectTheme(queryTheme || savedTheme || "forest", Boolean(queryTheme));
  selectMode(queryMode || savedMode || (systemModePreference.matches ? "dark" : "light"), Boolean(queryMode));
} catch (error) {
  followsSystemMode = true;
  selectTheme("forest", false);
  selectMode(systemModePreference.matches ? "dark" : "light", false);
}

systemModePreference.addEventListener?.("change", (event) => {
  if (followsSystemMode) selectMode(event.matches ? "dark" : "light", false);
});

function popEmoji(emoji) {
  const bounds = emoji.getBoundingClientRect();
  const angle = (-0.88 + Math.random() * 0.76) * Math.PI;
  const distance = 42 + Math.random() * 36;
  const particle = document.createElement("span");
  particle.className = "emoji-particle";
  particle.textContent = emoji.dataset.emoji || "💛";
  particle.setAttribute("aria-hidden", "true");
  particle.style.left = `${bounds.left + bounds.width / 2}px`;
  particle.style.top = `${bounds.top + bounds.height / 2}px`;
  particle.style.setProperty("--particle-size", `${Math.round(bounds.height)}px`);
  particle.style.setProperty("--pop-x", `${Math.cos(angle) * distance}px`);
  particle.style.setProperty("--pop-y", `${Math.sin(angle) * distance}px`);
  particle.style.setProperty("--spin", `${-18 + Math.random() * 36}deg`);
  particle.style.setProperty("--fall-drift", `${-24 + Math.random() * 48}px`);
  particle.style.setProperty("--fall-distance", `${92 + Math.random() * 50}px`);
  particle.style.setProperty("--fall-spin", `${-58 + Math.random() * 116}deg`);
  document.body.append(particle);
  particle.addEventListener("animationend", () => particle.remove(), { once: true });
  navigator.vibrate?.(10);
}

document.querySelectorAll(".playful-emoji").forEach((emoji) => {
  let startPoint;
  let wasDragged = false;
  let ignoreClick = false;

  emoji.addEventListener("pointerdown", (event) => {
    startPoint = { x: event.clientX, y: event.clientY };
    wasDragged = false;
    emoji.setPointerCapture(event.pointerId);
  });

  emoji.addEventListener("pointermove", (event) => {
    if (!startPoint) return;
    const x = event.clientX - startPoint.x;
    const y = event.clientY - startPoint.y;
    if (Math.hypot(x, y) > 8) wasDragged = true;
    if (!wasDragged) return;
    emoji.classList.add("is-dragging");
    emoji.style.setProperty("--drag-x", `${x}px`);
    emoji.style.setProperty("--drag-y", `${y}px`);
  });

  const finishPointer = () => {
    if (!startPoint) return;
    if (wasDragged) {
      emoji.classList.remove("is-dragging");
      emoji.style.removeProperty("--drag-x");
      emoji.style.removeProperty("--drag-y");
    } else {
      popEmoji(emoji);
    }
    ignoreClick = true;
    startPoint = undefined;
  };

  emoji.addEventListener("pointerup", finishPointer);
  emoji.addEventListener("pointercancel", () => {
    emoji.classList.remove("is-dragging");
    emoji.style.removeProperty("--drag-x");
    emoji.style.removeProperty("--drag-y");
    startPoint = undefined;
  });

  emoji.addEventListener("click", (event) => {
    if (ignoreClick) {
      event.preventDefault();
      ignoreClick = false;
    } else {
      popEmoji(emoji);
    }
  });

  emoji.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    popEmoji(emoji);
  });
});

function setupRevealMotion() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const loadItems = [];
  const scrollItems = [];
  const footerItems = [];

  function prepare(elements, variant, delays, collection) {
    const nodes = typeof elements === "string" ? document.querySelectorAll(elements) : elements;
    [...nodes].forEach((element, index) => {
      if (!element) return;
      const delay = Array.isArray(delays) ? delays[index] ?? delays.at(-1) ?? 0 : (delays || 0) * index;
      element.classList.add("reveal", `reveal--${variant}`);
      element.style.setProperty("--reveal-delay", `${delay}ms`);
      collection.push(element);
    });
  }

  prepare(document.querySelectorAll(".brand"), "drop", [40], loadItems);
  prepare(document.querySelectorAll(".theme-dot, .mode-button"), "pop", [110, 150, 190, 230, 285, 330], loadItems);
  prepare(document.querySelectorAll(".hero .headline-line"), "line", [100, 190, 280], loadItems);
  prepare(document.querySelectorAll(".hero .trust-line"), "up", [390], loadItems);
  prepare(document.querySelectorAll(".hero .cta"), "pop", [490], loadItems);

  prepare(document.querySelectorAll(".why__intro h2"), "left", [0], scrollItems);
  prepare(document.querySelectorAll(".why__intro p"), "right", [90], scrollItems);
  prepare(document.querySelectorAll(".feature-card"), "card", [0, 110, 220], scrollItems);
  prepare(document.querySelectorAll(".beta .beta-line"), "line", [0, 90, 180], scrollItems);
  prepare(document.querySelectorAll(".beta__content p"), "up", [270], scrollItems);
  prepare(document.querySelectorAll(".beta .cta"), "pop", [360], scrollItems);
  prepare(document.querySelectorAll(".hero-footer > *"), "up", [0, 80], footerItems);

  root.classList.add("motion-ready");

  function reveal(element) {
    if (element.classList.contains("is-visible")) return;
    element.classList.add("is-visible");

    const delay = Number.parseFloat(element.style.getPropertyValue("--reveal-delay")) || 0;
    window.setTimeout(() => {
      [...element.classList]
        .filter((className) => className === "reveal" || className === "is-visible" || className.startsWith("reveal--"))
        .forEach((className) => element.classList.remove(className));
      element.style.removeProperty("--reveal-delay");
    }, delay + 1100);
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => loadItems.forEach(reveal));
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      reveal(entry.target);
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.14,
    rootMargin: "0px 0px -7% 0px",
  });

  scrollItems.forEach((element) => observer.observe(element));

  const footer = document.querySelector(".hero-footer");
  if (footer) {
    const footerObserver = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      footerItems.forEach(reveal);
      footerObserver.disconnect();
    }, {
      threshold: 0.05,
      rootMargin: "0px",
    });

    footerObserver.observe(footer);
  }
}

setupRevealMotion();
