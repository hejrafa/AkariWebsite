const root = document.documentElement;
const themeColor = document.querySelector('meta[name="theme-color"]');
const themeButtons = document.querySelectorAll("[data-theme-target]");
const modeButtons = document.querySelectorAll("[data-mode-target]");
const brandLogo = document.querySelector(".brand img");
const creditsLink = document.querySelector(".credits-heart");
const siteRoot = new URL(".", document.currentScript?.src || window.location.href);
const systemModePreference = window.matchMedia("(prefers-color-scheme: dark)");
const themedImages = document.querySelectorAll("img[data-media-kind][data-media-index]");
const phoneModels = document.querySelectorAll("model-viewer[data-screen-index]");
let followsSystemMode = false;

const themeCountries = {
  meadow: "germany",
  forest: "japan",
  coast: "scotland",
  canyon: "usa",
};

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

  const country = themeCountries[root.dataset.theme];
  if (!country || !pageColors[root.dataset.mode]) return;

  themedImages.forEach((image) => {
    const mediaVersion = image.dataset.mediaKind === "image" && image.dataset.mediaIndex === "02" ? 2 : 1;
    const source = new URL(
      `assets/theme-media/${image.dataset.mediaKind}_${country}_${root.dataset.mode}_${image.dataset.mediaIndex}.webp?v=${mediaVersion}`,
      siteRoot,
    ).href;
    image.dataset.src = source;
    if (image.hasAttribute("src")) image.src = source;
  });

  phoneModels.forEach((model) => {
    model.dataset.screenSrc = new URL(
      `assets/theme-media/mockup_${country}_${root.dataset.mode}_${model.dataset.screenIndex}.webp?v=1`,
      siteRoot,
    ).href;
    if (model.model) syncModelScreen(model);
  });
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

function setupHeroPhone() {
  const phone = document.querySelector("#hero-phone-model");
  const hero = phone?.closest(".hero");
  const phoneHost = phone?.closest(".hero-phone");
  const floatLayer = phone?.closest(".hero-phone__float");
  if (!phone || !hero || !phoneHost || !floatLayer) return;

  const canFollowPointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let pointerIsInHero = false;
  let heroIsVisible = true;
  let animationFrame;

  function updatePointerTarget(event) {
    if (!canFollowPointer.matches || reducedMotion.matches) return;
    const bounds = hero.getBoundingClientRect();
    targetX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1));
    targetY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1));
    pointerIsInHero = true;
  }

  function settlePhone() {
    pointerIsInHero = false;
    targetX = 0;
    targetY = 0;
  }

  function animatePhone(time) {
    if (!heroIsVisible || document.hidden) {
      animationFrame = undefined;
      return;
    }

    const idleX = pointerIsInHero ? 0 : Math.sin(time / 2400) * 0.08;
    const idleY = pointerIsInHero ? 0 : Math.cos(time / 3100) * 0.055;
    currentX += (targetX + idleX - currentX) * 0.065;
    currentY += (targetY + idleY - currentY) * 0.065;

    floatLayer.style.setProperty("--phone-drift-x", `${(currentX * 9).toFixed(2)}px`);
    floatLayer.style.setProperty("--phone-drift-y", `${(currentY * 6).toFixed(2)}px`);
    floatLayer.style.setProperty("--phone-rotate-x", `${(-currentY * 4.5).toFixed(2)}deg`);
    floatLayer.style.setProperty("--phone-rotate-y", `${(currentX * 5.5).toFixed(2)}deg`);
    animationFrame = requestAnimationFrame(animatePhone);
  }

  function startPhoneMotion() {
    if (reducedMotion.matches || animationFrame || !heroIsVisible || document.hidden) return;
    animationFrame = requestAnimationFrame(animatePhone);
  }

  hero.addEventListener("pointermove", updatePointerTarget, { passive: true });
  hero.addEventListener("pointerleave", settlePhone);
  document.addEventListener("visibilitychange", startPhoneMotion);

  const visibilityObserver = new IntersectionObserver((entries) => {
    heroIsVisible = entries[0]?.isIntersecting ?? true;
    if (heroIsVisible) startPhoneMotion();
  }, { rootMargin: "12% 0px", threshold: 0 });

  visibilityObserver.observe(hero);
  startPhoneMotion();
}

setupHeroPhone();

function setupBetaPhone() {
  const phone = document.querySelector("#beta-phone-model");
  const beta = phone?.closest(".beta");
  const phoneHost = phone?.closest(".beta-phone");
  const floatLayer = phone?.closest(".beta-phone__float");
  if (!phone || !beta || !phoneHost || !floatLayer) return;

  const canFollowPointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let pointerIsInBeta = false;
  let betaIsVisible = false;
  let animationFrame;

  function updatePointerTarget(event) {
    if (!canFollowPointer.matches || reducedMotion.matches) return;
    const bounds = beta.getBoundingClientRect();
    targetX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1));
    targetY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1));
    pointerIsInBeta = true;
  }

  function settlePhone() {
    pointerIsInBeta = false;
    targetX = 0;
    targetY = 0;
  }

  function animatePhone(time) {
    if (!betaIsVisible || document.hidden) {
      animationFrame = undefined;
      return;
    }

    const idleX = pointerIsInBeta ? 0 : Math.sin(time / 2400) * 0.08;
    const idleY = pointerIsInBeta ? 0 : Math.cos(time / 3100) * 0.055;
    currentX += (targetX + idleX - currentX) * 0.065;
    currentY += (targetY + idleY - currentY) * 0.065;

    floatLayer.style.setProperty("--phone-drift-x", `${(currentX * 9).toFixed(2)}px`);
    floatLayer.style.setProperty("--phone-drift-y", `${(currentY * 6).toFixed(2)}px`);
    floatLayer.style.setProperty("--phone-rotate-x", `${(-currentY * 4.5).toFixed(2)}deg`);
    floatLayer.style.setProperty("--phone-rotate-y", `${(currentX * 5.5).toFixed(2)}deg`);
    animationFrame = requestAnimationFrame(animatePhone);
  }

  function startPhoneMotion() {
    if (reducedMotion.matches || animationFrame || !betaIsVisible || document.hidden) return;
    animationFrame = requestAnimationFrame(animatePhone);
  }

  beta.addEventListener("pointermove", updatePointerTarget, { passive: true });
  beta.addEventListener("pointerleave", settlePhone);
  document.addEventListener("visibilitychange", startPhoneMotion);

  const visibilityObserver = new IntersectionObserver((entries) => {
    betaIsVisible = entries[0]?.isIntersecting ?? false;
    if (betaIsVisible) startPhoneMotion();
  }, { rootMargin: "12% 0px", threshold: 0 });

  visibilityObserver.observe(beta);
}

setupBetaPhone();

async function syncModelScreen(model) {
  if (!model?.model || !model.dataset.screenSrc) return false;

  const source = model.dataset.screenSrc;
  try {
    const texture = await model.createTexture(source, "image/webp");
    if (source !== model.dataset.screenSrc) return syncModelScreen(model);

    const screenMaterial = model.model.getMaterialByName("OLED");
    const screenTexture = screenMaterial?.pbrMetallicRoughness?.baseColorTexture;
    if (!screenTexture) throw new Error("The OLED screen material is unavailable.");
    screenTexture.setTexture(texture);
    return true;
  } catch (error) {
    console.warn("Akari phone screen could not be updated.", error);
    return false;
  }
}

function setupPhoneModels() {
  const models = [...document.querySelectorAll("model-viewer[data-model-src]")];
  if (!models.length) return;

  let libraryPromise;

  function loadLibrary() {
    if (customElements.get("model-viewer")) return Promise.resolve();
    if (libraryPromise) return libraryPromise;

    libraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.type = "module";
      script.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.3.1/model-viewer.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });

    return libraryPromise;
  }

  models.forEach((model) => {
    const phoneHost = model.closest(".hero-phone, .beta-phone");

    model.addEventListener("load", async () => {
      await syncModelScreen(model);
      model.classList.add("is-loaded");
      phoneHost?.classList.add("is-ready");
      model.dispatchEvent(new Event("phone-ready"));
    }, { once: true });

    model.addEventListener("error", () => {
      phoneHost?.classList.add("is-unavailable");
    }, { once: true });
  });

  loadLibrary()
    .then(() => {
      models.forEach((model) => {
        const activateModel = () => {
          model.setAttribute("loading", "eager");
          model.setAttribute("src", model.dataset.modelSrc);
        };

        if (model.getAttribute("loading") !== "lazy") {
          activateModel();
          return;
        }

        const region = model.closest(".beta");
        if (!region) {
          activateModel();
          return;
        }

        const loadObserver = new IntersectionObserver((entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          activateModel();
          loadObserver.disconnect();
        }, { rootMargin: "85% 0px", threshold: 0 });

        loadObserver.observe(region);
      });
    })
    .catch(() => {
      models.forEach((model) => model.closest(".hero-phone, .beta-phone")?.classList.add("is-unavailable"));
    });
}

setupPhoneModels();

function setupRevealMotion() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const loadItems = [];
  const scrollItems = [];
  const cardItems = [];
  const footerItems = [];
  const phoneItems = [];
  const betaPhoneItems = [];

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

  prepare(document.querySelectorAll(".brand"), "drop", [0], loadItems);
  prepare(document.querySelectorAll(".theme-dot, .mode-button"), "pop", [70, 115, 160, 205, 265, 315], loadItems);
  prepare(document.querySelectorAll(".hero-phone"), "phone", [90], phoneItems);
  prepare(document.querySelectorAll(".hero .headline-line"), "line", [280, 410, 540], loadItems);
  prepare(document.querySelectorAll(".hero .trust-line"), "up", [680], loadItems);
  prepare(document.querySelectorAll(".hero .cta"), "pop", [800], loadItems);

  prepare(document.querySelectorAll(".why__intro h2"), "left", [0], scrollItems);
  prepare(document.querySelectorAll(".why__intro p"), "right", [160], scrollItems);
  prepare(document.querySelectorAll(".feature-card"), "card", [280, 400, 520], cardItems);
  prepare(document.querySelectorAll(".beta-phone"), "phone-right", [0], betaPhoneItems);
  prepare(document.querySelectorAll(".beta .beta-line"), "line", [0, 90, 180], scrollItems);
  prepare(document.querySelectorAll(".beta__content p"), "up", [270], scrollItems);
  prepare(document.querySelectorAll(".beta .cta"), "pop", [360], scrollItems);
  prepare(document.querySelectorAll(".answers__intro h2"), "right", [0], scrollItems);
  prepare(document.querySelectorAll(".answers__intro > p"), "left", [140], scrollItems);
  prepare(document.querySelectorAll(".answers__item"), "up", [220, 300, 380, 460], scrollItems);
  prepare(document.querySelectorAll(".hero-footer > *"), "up", [0, 80, 150], footerItems);

  root.classList.add("motion-ready");

  function reveal(element) {
    if (element.classList.contains("is-visible")) return;
    element.classList.add("is-visible");

    const delay = Number.parseFloat(element.style.getPropertyValue("--reveal-delay")) || 0;
    const cleanupDuration = [...element.classList].some((className) => className.startsWith("reveal--phone")) ? 1300 : 1100;
    window.setTimeout(() => {
      [...element.classList]
        .filter((className) => className === "reveal" || className === "is-visible" || className.startsWith("reveal--"))
        .forEach((className) => element.classList.remove(className));
      element.style.removeProperty("--reveal-delay");
    }, delay + cleanupDuration);
  }

  const loadSequenceStart = 180;

  window.setTimeout(() => {
    root.classList.remove("motion-boot");
    requestAnimationFrame(() => {
      loadItems.forEach(reveal);
      phoneItems.forEach((phoneItem) => {
        const model = phoneItem.querySelector("model-viewer");
        const revealPhone = () => {
          reveal(phoneItem);
          requestAnimationFrame(() => root.classList.remove("phone-motion-boot"));
        };

        if (model?.classList.contains("is-loaded")) {
          revealPhone();
          return;
        }

        model?.addEventListener("phone-ready", revealPhone, { once: true });
      });
    });
  }, loadSequenceStart);

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

  const beta = document.querySelector(".beta");
  if (beta && betaPhoneItems.length) {
    let betaIsVisible = false;

    const revealBetaPhone = () => {
      const model = betaPhoneItems[0]?.querySelector("model-viewer");
      if (!betaIsVisible || !model?.classList.contains("is-loaded")) return;
      betaPhoneItems.forEach(reveal);
    };

    const betaPhoneObserver = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      betaIsVisible = true;
      revealBetaPhone();
      betaPhoneObserver.disconnect();
    }, {
      threshold: 0.08,
      rootMargin: "12% 0px 12% 0px",
    });

    betaPhoneObserver.observe(beta);
    betaPhoneItems[0]?.querySelector("model-viewer")?.addEventListener("phone-ready", revealBetaPhone, { once: true });
  }

  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      reveal(entry.target);
      cardObserver.unobserve(entry.target);
    });
  }, {
    threshold: 0.01,
    rootMargin: "0px 0px 18% 0px",
  });

  const scrollSequenceStart = loadSequenceStart + 1650;
  window.setTimeout(() => {
    scrollItems.forEach((element) => observer.observe(element));
    cardItems.forEach((element) => cardObserver.observe(element));
  }, scrollSequenceStart);

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
