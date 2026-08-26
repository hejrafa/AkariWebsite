const root = document.documentElement;
const mainContent = document.querySelector("#main");
const skipLink = document.querySelector(".skip-link");
const themeColor = document.querySelector('meta[name="theme-color"]');
const themeButtons = document.querySelectorAll("[data-theme-target]");
const modeButtons = document.querySelectorAll("[data-mode-target]");
const languageButtons = document.querySelectorAll("[data-language-target]");
const brandLogo = document.querySelector(".brand img");
const creditsLink = document.querySelector(".credits-heart");
const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");
const headerControlsPanel = document.querySelector(".header-controls");
const headlineHeart = document.querySelector(".headline-heart");
const headlineLines = document.querySelectorAll(".hero .headline-line");
const featureGrid = document.querySelector(".feature-grid");
const siteRoot = new URL(".", document.currentScript?.src || window.location.href);
const systemModePreference = window.matchMedia("(prefers-color-scheme: dark)");
const themedImages = document.querySelectorAll("img[data-media-kind][data-media-index]");
const phoneModels = document.querySelectorAll("model-viewer[data-screen-index]");
let followsSystemMode = false;

const translations = {
  en: {
    skipLink: "Skip to content",
    headerLabel: "Akari website header",
    mobileMenuLabel: "Language and appearance settings",
    mobileLanguageLabel: "Language",
    mobileAppearanceLabel: "Appearance",
    languageGroupLabel: "Choose a language",
    languageEnglishLabel: "View in English",
    languageGermanLabel: "View in German",
    homeLabel: "Akari home",
    appearanceLabel: "Choose page appearance",
    themeGroupLabel: "Choose a color theme",
    themeGermanyLabel: "Germany theme",
    themeJapanLabel: "Japan theme",
    themeScotlandLabel: "Scotland theme",
    themeUsaLabel: "USA theme",
    lightModeLabel: "Use light appearance",
    darkModeLabel: "Use dark appearance",
    heroPhoneLabel: "Akari running on an iPhone 17 Pro",
    betaPhoneLabel: "Akari's Steps view on an iPhone",
    betaPhoneAlt: "Akari's Steps view running on an iPhone 17 Pro",
    heroLine1: "Your health",
    heroLine2: "has a story",
    heroLine3: " to tell.",
    trustBeta: "Free during beta · No account",
    trustPrivacy: "Your health data stays on your iPhone",
    joinBeta: "Join the beta",
    whyTitle: " Why?",
    whyBody: "Akari turns your health data into a calm, readable daily story—bringing your vitals, nutrition and goals together in one place.",
    featuresLabel: "What Akari helps you do",
    featuresInstructions: "Swipe or use the left and right arrow keys to explore all cards.",
    featureTodayTitle: "See today clearly",
    featureTodayBody: "Your day, explained calmly—without scores, judgment, or alarm.",
    featureUnderstandTitle: "Understand your data",
    featureUnderstandBody: "Simple, science-based explanations with relatable everyday examples.",
    featureWholeTitle: "See the whole picture",
    featureWholeBody: "Your vitals and nutrition, together in one clear view.",
    betaLine1: "Help shape",
    betaLine2: "Akari before",
    betaLine3: "launch.",
    betaBody: "Use Akari for a few days and tell us what felt useful, what was confusing and what you wish it could do. Your feedback will directly influence what we build next.",
    faqTitle: "FAQ",
    faqIntro: "Akari is free during beta and available for iPhone through Apple’s TestFlight. Here is what to know before you try it.",
    faqWhatQuestion: "What is Akari?",
    faqWhatAnswer: "Akari is an iPhone health app that turns health data into a calm, readable daily story.",
    faqDataQuestion: "What health data can I see?",
    faqDataAnswer: "Akari brings supported vitals, activity, nutrition and goals together so you can understand your day in context.",
    faqPrivacyQuestion: "Does my health data leave my iPhone?",
    faqPrivacyAnswer: "No. Akari works without an account, and your health data stays on your iPhone.",
    faqTryQuestion: "How can I try Akari?",
    faqTryPrefix: "Join the free public beta through ",
    faqTrySuffix: " and help shape the app before launch.",
    footerLabel: "Akari credits",
    madePrefix: "Made with ",
    madeSuffix: " in Germany",
    creditsLabel: "Open credits",
    disclaimer: "Akari is not a substitute for professional medical advice. Always consult your physician first.",
  },
  de: {
    skipLink: "Zum Inhalt springen",
    headerLabel: "Kopfbereich der Akari-Website",
    mobileMenuLabel: "Einstellungen für Sprache und Darstellung",
    mobileLanguageLabel: "Sprache",
    mobileAppearanceLabel: "Design",
    languageGroupLabel: "Sprache wählen",
    languageEnglishLabel: "Seite auf Englisch anzeigen",
    languageGermanLabel: "Seite auf Deutsch anzeigen",
    homeLabel: "Akari-Startseite",
    appearanceLabel: "Erscheinungsbild der Seite wählen",
    themeGroupLabel: "Farbthema wählen",
    themeGermanyLabel: "Deutschland-Design",
    themeJapanLabel: "Japan-Design",
    themeScotlandLabel: "Schottland-Design",
    themeUsaLabel: "USA-Design",
    lightModeLabel: "Helles Erscheinungsbild verwenden",
    darkModeLabel: "Dunkles Erscheinungsbild verwenden",
    heroPhoneLabel: "Akari auf einem iPhone 17 Pro",
    betaPhoneLabel: "Akaris Schritte-Ansicht auf einem iPhone",
    betaPhoneAlt: "Akaris Schritte-Ansicht auf einem iPhone 17 Pro",
    heroLine1: "Dein Körper",
    heroLine2: "hat viel",
    heroLine3: "zu erzählen.",
    trustBeta: "Kostenlos während der Beta · Kein Konto notwendig",
    trustPrivacy: "Deine Gesundheitsdaten bleiben auf dem iPhone",
    joinBeta: "Beta testen",
    whyTitle: " Warum?",
    whyBody: "Akari macht aus deinen Gesundheitsdaten eine klare Geschichte deines Tages—mit Vitalwerten, Ernährung und Zielen an einem Ort.",
    featuresLabel: "Was Akari für dich tut",
    featuresInstructions: "Wische oder nutze die linke und rechte Pfeiltaste, um alle Karten zu entdecken.",
    featureTodayTitle: "Dein Tag im Blick",
    featureTodayBody: "Ruhig und klar erklärt—ohne Punkte, Wertung oder Alarm.",
    featureUnderstandTitle: "Daten verstehen",
    featureUnderstandBody: "Fundierte Erklärungen mit Beispielen aus dem Alltag.",
    featureWholeTitle: "Das Ganze im Blick",
    featureWholeBody: "Vitalwerte und Ernährung—übersichtlich an einem Ort.",
    betaLine1: "Gestalte",
    betaLine2: "Akari vorm",
    betaLine3: "Start mit.",
    betaBody: "Teste Akari ein paar Tage und sag uns, was hilft, was unklar ist und was dir fehlt. Dein Feedback bestimmt, was wir als Nächstes bauen.",
    faqTitle: "FAQ",
    faqIntro: "Akari ist in der Beta kostenlos und über Apples TestFlight fürs iPhone verfügbar. Das solltest du vor dem Start wissen.",
    faqWhatQuestion: "Was ist Akari?",
    faqWhatAnswer: "Akari ist eine iPhone-App, die deine Gesundheitsdaten ruhig und verständlich einordnet.",
    faqDataQuestion: "Welche Gesundheitsdaten kann ich sehen?",
    faqDataAnswer: "Akari zeigt Vitalwerte, Aktivität, Ernährung und Ziele gemeinsam—für mehr Kontext im Alltag.",
    faqPrivacyQuestion: "Bleiben meine Gesundheitsdaten auf dem iPhone?",
    faqPrivacyAnswer: "Ja. Akari braucht kein Konto, und deine Gesundheitsdaten bleiben auf deinem iPhone.",
    faqTryQuestion: "Wie teste ich Akari?",
    faqTryPrefix: "Teste Akari kostenlos über ",
    faqTrySuffix: " und gestalte die App vor dem Start mit.",
    footerLabel: "Akari-Info und rechtlicher Hinweis",
    madePrefix: "Mit ",
    madeSuffix: " in Deutschland entwickelt",
    creditsLabel: "Mitwirkende anzeigen",
    disclaimer: "Akari ist kein Ersatz für eine professionelle medizinische Beratung. Wende dich immer zuerst an deine Ärztin oder deinen Arzt.",
  },
};

const pageMetadata = {
  en: {
    title: "Akari—Understand your health data",
    description: "Akari is a private iPhone health app that turns health data—vitals, activity and nutrition—into calm daily insights. Join the free TestFlight beta.",
    socialTitle: "Akari—Understand your health data",
    socialDescription: "Akari turns your health data into a calm, readable daily story—bringing your vitals, nutrition and goals together in one place.",
    twitterDescription: "Akari turns your health data into a calm, readable daily story—bringing your vitals, nutrition and goals together in one place.",
    imageAlt: "Akari logo on a bright green background",
  },
  de: {
    title: "Akari—Verstehe deine Gesundheitsdaten",
    description: "Akari ist eine private Gesundheits-App fürs iPhone. Sie macht aus Vitalwerten, Aktivität und Ernährung verständliche Einblicke für jeden Tag. Jetzt kostenlos testen.",
    socialTitle: "Akari—Verstehe deine Gesundheitsdaten",
    socialDescription: "Akari macht aus deinen Gesundheitsdaten eine klare Geschichte deines Tages—mit Vitalwerten, Ernährung und Zielen an einem Ort.",
    twitterDescription: "Akari macht aus deinen Gesundheitsdaten eine klare Geschichte deines Tages—mit Vitalwerten, Ernährung und Zielen an einem Ort.",
    imageAlt: "Akari-Logo auf leuchtend grünem Hintergrund",
  },
};

function structuredDataFor(language) {
  const isGerman = language === "de";
  const url = isGerman ? "https://joinakari.com/?lang=de" : "https://joinakari.com/";
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://joinakari.com/#website",
        url,
        name: "Akari",
        description: isGerman
          ? "Akari hilft Menschen, ihre Gesundheitsdaten mit ruhigen, verständlichen Einblicken für jeden Tag besser zu verstehen."
          : "Akari helps people understand their health data through calm daily insights.",
        inLanguage: language,
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: pageMetadata[language].title,
        description: pageMetadata[language].socialDescription,
        isPartOf: { "@id": "https://joinakari.com/#website" },
        mainEntity: { "@id": "https://joinakari.com/#app" },
        primaryImageOfPage: "https://joinakari.com/assets/social.png?v=1",
        inLanguage: language,
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://joinakari.com/#app",
        name: "Akari",
        url,
        description: isGerman
          ? "Akari macht aus Gesundheitsdaten eine ruhige, verständliche Geschichte des Tages—mit einfachen Erklärungen zu unterstützten Vitalwerten, Aktivität und Ernährung."
          : "Akari turns health data into a calm, readable daily story with simple explanations across supported vitals, activity and nutrition data.",
        applicationCategory: "HealthApplication",
        operatingSystem: "iOS",
        availableOnDevice: "iPhone",
        isAccessibleForFree: true,
        image: "https://joinakari.com/health/assets/app-icon.png",
        screenshot: [
          "https://joinakari.com/assets/theme-media/image_japan_dark_01.webp",
          "https://joinakari.com/assets/theme-media/image_japan_dark_02.webp",
          "https://joinakari.com/assets/theme-media/image_japan_dark_03.webp",
        ],
        featureList: isGerman
          ? [
              "Eine ruhige Tagesansicht ohne Punktesysteme oder Wertung",
              "Einfache Erklärungen mit anschaulichen Beispielen",
              "Unterstützte Vitalwerte, Aktivität und Ernährung in einer App",
              "Kein Konto erforderlich",
              "Gesundheitsdaten bleiben auf dem iPhone",
            ]
          : [
              "A calm daily view without scores or judgment",
              "Simple explanations with relatable examples",
              "Supported vitals, activity and nutrition in one app",
              "No account required",
              "Health data stays on the user's iPhone",
            ],
        downloadUrl: "https://testflight.apple.com/join/wrv4aFVQ",
        softwareRequirements: isGerman
          ? "Während der Beta sind ein iPhone mit Apple Health und TestFlight erforderlich."
          : "Requires an iPhone with Apple Health and TestFlight during beta.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: isGerman ? "EUR" : "USD",
          availability: "https://schema.org/InStock",
          url: "https://testflight.apple.com/join/wrv4aFVQ",
        },
      },
    ],
  };
}

function setMetaContent(selector, content) {
  const element = document.querySelector(selector);
  if (element) element.content = content;
}

function updatePageMetadata(language) {
  const metadata = pageMetadata[language];
  const canonicalUrl = language === "de" ? "https://joinakari.com/?lang=de" : "https://joinakari.com/";
  document.title = metadata.title;
  setMetaContent('meta[name="description"]', metadata.description);
  setMetaContent('meta[property="og:title"]', metadata.socialTitle);
  setMetaContent('meta[property="og:description"]', metadata.socialDescription);
  setMetaContent('meta[property="og:url"]', canonicalUrl);
  setMetaContent('meta[property="og:locale"]', language === "de" ? "de_DE" : "en_US");
  setMetaContent('meta[property="og:locale:alternate"]', language === "de" ? "en_US" : "de_DE");
  setMetaContent('meta[property="og:image:alt"]', metadata.imageAlt);
  setMetaContent('meta[name="twitter:title"]', metadata.socialTitle);
  setMetaContent('meta[name="twitter:description"]', metadata.twitterDescription);
  setMetaContent('meta[name="twitter:image:alt"]', metadata.imageAlt);

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = canonicalUrl;

  const manifest = document.querySelector('link[rel="manifest"]');
  if (manifest) manifest.href = language === "de" ? "manifest-de.webmanifest" : "manifest.webmanifest";

  const structuredData = document.querySelector("#structured-data");
  if (structuredData) structuredData.textContent = JSON.stringify(structuredDataFor(language));
}

function updateLanguageUrl(language) {
  const url = new URL(window.location.href);
  if (language === "de") url.searchParams.set("lang", "de");
  else url.searchParams.delete("lang");
  window.history.replaceState({}, "", url);
}

function selectLanguage(language, persist = true, updateUrl = true) {
  if (!translations[language]) return;
  root.dataset.language = language;
  root.lang = language;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = translations[language][element.dataset.i18n];
    if (value !== undefined) element.textContent = value;
  });
  if (headlineHeart && headlineLines.length >= 3) {
    const heartLine = language === "de" ? headlineLines[1] : headlineLines[2];
    heartLine.insertBefore(headlineHeart, heartLine.firstChild);
  }
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const value = translations[language][element.dataset.i18nAriaLabel];
    if (value !== undefined) element.setAttribute("aria-label", value);
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
    const value = translations[language][element.dataset.i18nAlt];
    if (value !== undefined) element.setAttribute("alt", value);
  });
  languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.languageTarget === language));
  });

  if (persist) {
    try { localStorage.setItem("akari-language", language); } catch (error) {}
  }
  if (updateUrl) updateLanguageUrl(language);
  updatePageMetadata(language);
  updateThemeColor();
}

let activeLanguageTransition;
let queuedLanguage;

function languageTransitionItems() {
  const contentGroups = document.querySelectorAll([
    ".hero h1",
    ".hero .trust-line",
    ".hero .cta > [data-i18n]",
    ".why__intro h2",
    ".why__intro > p",
    ".feature-card__copy",
    ".beta h2",
    ".beta__content > p",
    ".beta .cta > [data-i18n]",
    ".answers__intro h2",
    ".answers__intro > p",
    ".answers__item dt",
    ".answers__item dd",
    ".footer-made",
    ".footer-disclaimer",
  ].join(", "));

  return [...contentGroups].filter((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.bottom > -24 && bounds.top < window.innerHeight + 24;
  });
}

function finishLanguageTransition(transitionToken) {
  if (activeLanguageTransition !== transitionToken) return;
  activeLanguageTransition = undefined;

  const nextLanguage = queuedLanguage;
  queuedLanguage = undefined;
  if (nextLanguage && nextLanguage !== root.dataset.language) transitionLanguage(nextLanguage);
}

function fallbackLanguageTransition(language, transitionItems) {
  const transitionToken = {};
  activeLanguageTransition = transitionToken;

  transitionItems.forEach((element) => element.classList.add("language-copy-fallback"));
  void document.body.offsetWidth;
  transitionItems.forEach((element) => element.classList.add("is-language-hidden"));

  window.setTimeout(() => {
    selectLanguage(language);
    transitionItems.forEach((element) => element.classList.add("language-copy-fallback--enter"));
    void document.body.offsetWidth;
    transitionItems.forEach((element) => element.classList.remove("is-language-hidden"));

    window.setTimeout(() => {
      transitionItems.forEach((element) => {
        element.classList.remove("language-copy-fallback", "language-copy-fallback--enter", "is-language-hidden");
      });
      finishLanguageTransition(transitionToken);
    }, 170);
  }, 100);
}

function transitionLanguage(language) {
  if (!translations[language]) return;

  if (activeLanguageTransition) {
    queuedLanguage = language;
    return;
  }

  if (language === root.dataset.language) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    selectLanguage(language);
    return;
  }

  const transitionItems = languageTransitionItems();

  if (!transitionItems.length) {
    selectLanguage(language);
    return;
  }

  if (typeof document.startViewTransition !== "function") {
    fallbackLanguageTransition(language, transitionItems);
    return;
  }

  transitionItems.forEach((element, index) => {
    element.style.viewTransitionName = `language-copy-${index + 1}`;
  });
  root.classList.add("language-view-transition");

  let transition;
  try {
    transition = document.startViewTransition(() => selectLanguage(language));
  } catch (error) {
    transitionItems.forEach((element) => element.style.removeProperty("view-transition-name"));
    root.classList.remove("language-view-transition");
    fallbackLanguageTransition(language, transitionItems);
    return;
  }

  activeLanguageTransition = transition;

  transition.finished
    .catch(() => {})
    .finally(() => {
      transitionItems.forEach((element) => {
        element.style.removeProperty("view-transition-name");
      });
      root.classList.remove("language-view-transition");
      finishLanguageTransition(transition);
    });
}

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
    creditsLink.href = new URL(`health/credits.html?theme=${encodeURIComponent(root.dataset.theme)}&mode=${encodeURIComponent(root.dataset.mode)}&lang=${encodeURIComponent(root.dataset.language || "en")}`, siteRoot).href;
  }

  const country = themeCountries[root.dataset.theme];
  if (!country || !pageColors[root.dataset.mode]) return;
  const languageSuffix = root.dataset.language === "de" ? "_de" : "";

  themedImages.forEach((image) => {
    const source = new URL(
      `assets/theme-media/${image.dataset.mediaKind}_${country}_${root.dataset.mode}_${image.dataset.mediaIndex}${languageSuffix}.webp?v=3`,
      siteRoot,
    ).href;
    image.dataset.src = source;
    if (image.hasAttribute("src")) image.src = source;
  });

  phoneModels.forEach((model) => {
    model.dataset.screenSrc = new URL(
      `assets/theme-media/mockup_${country}_${root.dataset.mode}_${model.dataset.screenIndex}${languageSuffix}.webp?v=1`,
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

const mobileHeaderQuery = window.matchMedia("(max-width: 760px)");

function setMobileMenu(open, focusFirstControl = false) {
  const shouldOpen = Boolean(open && mobileHeaderQuery.matches);
  root.classList.toggle("mobile-menu-is-open", shouldOpen);
  mobileMenuToggle?.setAttribute("aria-expanded", String(shouldOpen));

  if (shouldOpen && focusFirstControl) {
    requestAnimationFrame(() => {
      const selectedLanguage = headerControlsPanel?.querySelector('.language-button[aria-pressed="true"]');
      (selectedLanguage || headerControlsPanel?.querySelector("button"))?.focus();
    });
  }
}

mobileMenuToggle?.addEventListener("click", () => {
  const shouldOpen = !root.classList.contains("mobile-menu-is-open");
  setMobileMenu(shouldOpen, shouldOpen);
});

document.addEventListener("click", (event) => {
  if (!root.classList.contains("mobile-menu-is-open")) return;
  if (mobileMenuToggle?.contains(event.target) || headerControlsPanel?.contains(event.target)) return;
  setMobileMenu(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !root.classList.contains("mobile-menu-is-open")) return;
  setMobileMenu(false);
  mobileMenuToggle?.focus();
});

mobileHeaderQuery.addEventListener?.("change", (event) => {
  if (!event.matches) setMobileMenu(false);
});

skipLink?.addEventListener("click", () => {
  requestAnimationFrame(() => mainContent?.focus({ preventScroll: true }));
});

function updateFeatureGridKeyboardAccess() {
  if (!featureGrid) return;
  const isScrollable = featureGrid.scrollWidth > featureGrid.clientWidth + 1;
  featureGrid.tabIndex = isScrollable ? 0 : -1;
}

featureGrid?.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  const firstCard = featureGrid.querySelector(".feature-card");
  if (!firstCard) return;

  event.preventDefault();
  const gap = Number.parseFloat(getComputedStyle(featureGrid).columnGap) || 0;
  const direction = event.key === "ArrowRight" ? 1 : -1;
  const nextLeft = featureGrid.scrollLeft + direction * (firstCard.getBoundingClientRect().width + gap);
  featureGrid.scrollTo({
    left: nextLeft,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
});

window.addEventListener("resize", updateFeatureGridKeyboardAccess, { passive: true });
document.fonts?.ready.then(updateFeatureGridKeyboardAccess);
requestAnimationFrame(updateFeatureGridKeyboardAccess);

languageButtons.forEach((button) => {
  button.addEventListener("click", () => transitionLanguage(button.dataset.languageTarget));
});

selectLanguage(root.dataset.language || "en", false, false);

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
      element.dataset.languageReveal = variant;
      element.classList.add("reveal", `reveal--${variant}`);
      element.style.setProperty("--reveal-delay", `${delay}ms`);
      collection.push(element);
    });
  }

  prepare(document.querySelectorAll(".brand"), "drop", [0], loadItems);
  prepare(document.querySelectorAll(".language-button"), "pop", [70, 115], loadItems);
  prepare(document.querySelectorAll(".mobile-menu-toggle"), "pop", [70], loadItems);
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
