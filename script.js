const root = document.documentElement;
const mainContent = document.querySelector("#main");
const skipLink = document.querySelector(".skip-link");
const themeColor = document.querySelector('meta[name="theme-color"]');
const themeButtons = document.querySelectorAll("[data-theme-target]");
const modeButtons = document.querySelectorAll("[data-mode-target]");
const languageButtons = document.querySelectorAll("[data-language-target]");
const brandLogos = document.querySelectorAll(".brand img, .footer-logo img");
const adminLink = document.querySelector(".footer-admin-link");
const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");
const headerControlsPanel = document.querySelector(".header-controls");
const goalOptions = document.querySelector(".goals__options");
const goalBlurb = document.querySelector("#goal-blurb");
const goalSticker = document.querySelector("#goal-sticker");
const goalFocuses = document.querySelector("#goal-focuses");
// What each goal brings together, after Goal.focuses in the app, and each item's sticker.
const focusStickers = {
  Outside: "goal-dailies",
  Move: "goal-move",
  Hydrate: "focus-hydrate",
  Eat: "focus-eat",
  Sleep: "goal-sleep",
  Connect: "focus-connect",
  Train: "focus-train",
  Strength: "focus-strength",
  Burn: "focus-burn",
  WindDown: "focus-wind-down",
  Protein: "focus-protein",
  Fiber: "broccoli",
  Priorities: "goal-for-you",
};
const goalFocusLists = {
  ForYou: ["Priorities"],
  Dailies: ["Outside", "Move", "Hydrate", "Eat", "Sleep", "Connect"],
  Sleep: ["Sleep", "WindDown", "Outside"],
  Move: ["Move", "Train", "Burn"],
  Eat: ["Eat", "Protein", "Fiber"],
  Lose: ["Eat", "Protein", "Fiber", "Move", "Strength"],
};
// Each goal's sticker follows the app's goal icon (Goal.swift).
const goalStickers = {
  ForYou: "goal-for-you",
  Dailies: "goal-dailies",
  Sleep: "goal-sleep",
  Move: "goal-move",
  Eat: "goal-eat",
  Lose: "goal-lose",
};
const siteRoot = new URL(".", document.currentScript?.src || window.location.href);
const systemModePreference = window.matchMedia("(prefers-color-scheme: dark)");
let followsSystemMode = false;

function persistSitePreference(name, value) {
  try { localStorage.setItem(name, value); } catch (error) {}
  try {
    const sharedDomain = window.location.hostname === "joinakari.com" || window.location.hostname.endsWith(".joinakari.com")
      ? "; Domain=.joinakari.com; Secure"
      : "";
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${sharedDomain}`;
  } catch (error) {}
}

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
    heroChip: "Sleep, movement, food",
    heroTitle: "Your whole day in one place",
    heroTitleA: "Your",
    heroTitleB: "whole day",
    heroTitleC: "in one place",
    joinBeta: "Join the beta",
    vitalsChip: "Vitals",
    vitalsTitle: "Your readiness, every morning",
    vitalsBody: "Each morning Akari reads last night against your own usual nights. Yesterday’s food and strain count too.",
    nutritionChip: "Nutrition",
    nutritionTitle: "More than just calories",
    nutritionBody: "Every nutrient gets a row of its own, with its own symbol. Where there is a limit, Akari marks it. You log food by writing or saying it.",
    privacyChip: "No account, no server",
    privacyTitle: "Your data stays on this iPhone",
    privacyTitleA: "Your data stays on",
    privacyTitleB: "this iPhone",
    privacyBody: "Akari reads Apple Health on your iPhone and keeps what it works out right there.",
    privacyLink: "Read the privacy policy",
    goalsChip: "Your goal",
    goalsTitle: "One goal is enough to start",
    goalForYou: "For you",
    goalDailies: "Dailies",
    goalSleep: "Sleep better",
    goalMove: "Move more",
    goalEat: "Eat well",
    goalLose: "Lose weight",
    goalForYouBlurb: "Your highest-priority health areas, brought together in one goal and tracked through Apple Health.",
    goalDailiesBlurb: "Six small things that make a day good. Nothing heroic, outside, moving, watered, fed, rested, and in touch with someone.",
    goalSleepBlurb: "Build the night from the day around it: morning light, screens down in the evening, and a full night behind you.",
    goalMoveBlurb: "Steps on your feet, time spent training, and the energy to show for it.",
    goalEatBlurb: "Keep calories, protein, and fiber in view for balanced meals that keep you going.",
    goalLoseBlurb: "Stay within your calorie budget while keeping protein, fiber, daily movement, and strength work in view.",
    focusOutsideTitle: "Get outside",
    focusOutsideBody: "Daylight and fresh air, even briefly",
    focusMoveTitle: "Move",
    focusMoveBody: "Steps on your feet",
    focusHydrateTitle: "Hydrate",
    focusHydrateBody: "Water through the day",
    focusEatTitle: "Eat",
    focusEatBody: "Enough on your plate",
    focusSleepTitle: "Sleep",
    focusSleepBody: "A full night behind you",
    focusConnectTitle: "Connect",
    focusConnectBody: "Reach someone you like",
    focusTrainTitle: "Train",
    focusTrainBody: "Time spent working",
    focusStrengthTitle: "Strength",
    focusStrengthBody: "Two strength days this week",
    focusBurnTitle: "Burn",
    focusBurnBody: "Active energy burned",
    focusWindDownTitle: "Wind down",
    focusWindDownBody: "Screens down before bed",
    focusProteinTitle: "Protein",
    focusProteinBody: "Enough protein through the day",
    focusFiberTitle: "Fiber",
    focusFiberBody: "Enough fiber through the day",
    focusPrioritiesTitle: "Your priorities",
    focusPrioritiesBody: "Picked from your Apple Health data",
    goalsTracksLabel: "What this goal brings together",
    foodChip: "Akari does the rest",
    foodTitle: "Write or say what you ate",
    launchTitle: "Akari is almost here.",
    launchBody: "We’re getting ready for the App Store. Until then, the beta is open: try Akari now and tell us what you think.",
    faqTitle: "FAQ",
    faqHeadline: "Good to know",
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
    heartLabel: "love",
    adminLoginLabel: "Admin",
    footerSitemapLabel: "Sitemap",
    footerProductTitle: "Product",
    footerJoinLabel: "Join the beta",
    footerVitalsLabel: "Vitals",
    footerNutritionLabel: "Nutrition",
    footerGoalsLabel: "Goals",
    footerFoodLabel: "Food logging",
    footerDataLabel: "Your data",
    footerSupportTitle: "Support",
    footerFaqLabel: "FAQ",
    footerLegalTitle: "Legal",
    privacyLabel: "Privacy Policy",
    termsLabel: "Terms of Service",
    contactLabel: "Contact us",
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
    heroChip: "Schlaf, Bewegung, Essen",
    heroTitle: "Dein ganzer Tag an einem Ort",
    heroTitleA: "Dein",
    heroTitleB: "ganzer Tag",
    heroTitleC: "an einem Ort",
    joinBeta: "Beta testen",
    vitalsChip: "Vitalwerte",
    vitalsTitle: "Deine Tagesform, jeden Morgen",
    vitalsBody: "Jeden Morgen vergleicht Akari die letzte Nacht mit deinen üblichen Nächten. Das Essen und die Belastung von gestern zählen mit.",
    nutritionChip: "Ernährung",
    nutritionTitle: "Mehr als nur Kalorien",
    nutritionBody: "Jeder Nährstoff hat eine eigene Zeile mit eigenem Symbol. Wo es eine Grenze gibt, zeigt Akari sie an. Essen trägst du ein, indem du es schreibst oder sagst.",
    privacyChip: "Kein Konto, kein Server",
    privacyTitle: "Deine Daten bleiben bei dir",
    privacyTitleA: "Deine Daten bleiben",
    privacyTitleB: "bei dir",
    privacyBody: "Akari liest Apple Health auf deinem iPhone und behält alles, was daraus entsteht, genau dort.",
    privacyLink: "Datenschutzerklärung lesen",
    goalsChip: "Dein Ziel",
    goalsTitle: "Ein Ziel reicht für den Anfang",
    goalForYou: "Für dich",
    goalDailies: "Tagesaufgaben",
    goalSleep: "Besser schlafen",
    goalMove: "Mehr bewegen",
    goalEat: "Gut essen",
    goalLose: "Abnehmen",
    goalForYouBlurb: "Deine wichtigsten Gesundheitsbereiche, gebündelt in einem Ziel und über Apple Health erfasst.",
    goalDailiesBlurb: "Sechs kleine Dinge, die einen Tag gut machen. Nichts Heldenhaftes, draußen gewesen, bewegt, getrunken, gegessen, ausgeruht und in Kontakt.",
    goalSleepBlurb: "Guter Schlaf beginnt am Tag: morgens Tageslicht, abends weniger Bildschirmzeit und genug Zeit zum Schlafen.",
    goalMoveBlurb: "Schritte auf den Beinen, Zeit im Training und die Energie, die dabei herauskommt.",
    goalEatBlurb: "Behalte Kalorien, Eiweiß und Ballaststoffe im Blick – für ausgewogene Mahlzeiten, die lange satt machen.",
    goalLoseBlurb: "Bleib in deinem Kalorienbudget und behalte Eiweiß, Ballaststoffe, tägliche Bewegung und Krafttraining im Blick.",
    focusOutsideTitle: "Rausgehen",
    focusOutsideBody: "Tageslicht & frische Luft",
    focusMoveTitle: "Bewegen",
    focusMoveBody: "Schritte auf den Beinen",
    focusHydrateTitle: "Wasser",
    focusHydrateBody: "Wasser über den Tag",
    focusEatTitle: "Essen",
    focusEatBody: "Genug auf dem Teller",
    focusSleepTitle: "Schlaf",
    focusSleepBody: "Eine volle Nacht hinter dir",
    focusConnectTitle: "Kontakt",
    focusConnectBody: "Kurz bei jemandem melden",
    focusTrainTitle: "Trainieren",
    focusTrainBody: "Zeit im Training",
    focusStrengthTitle: "Kraft",
    focusStrengthBody: "Zwei Krafttrainingstage diese Woche",
    focusBurnTitle: "Verbrennen",
    focusBurnBody: "Verbrannte Aktivenergie",
    focusWindDownTitle: "Bildschirmpause",
    focusWindDownBody: "Vor dem Schlafen das Handy beiseitelegen",
    focusProteinTitle: "Protein",
    focusProteinBody: "Genug Eiweiß über den Tag",
    focusFiberTitle: "Ballaststoffe",
    focusFiberBody: "Genug Ballaststoffe über den Tag",
    focusPrioritiesTitle: "Deine Prioritäten",
    focusPrioritiesBody: "Aus deinen Apple-Health-Daten ausgewählt",
    goalsTracksLabel: "Was dieses Ziel zusammenbringt",
    foodChip: "Akari macht den Rest",
    foodTitle: "Schreib oder sag, was du isst",
    launchTitle: "Akari ist fast da.",
    launchBody: "Wir bereiten den Start im App Store vor. Bis dahin ist die Beta offen: Teste Akari jetzt und sag uns, was du denkst.",
    faqTitle: "FAQ",
    faqHeadline: "Gut zu wissen",
    faqIntro: "Akari ist in der Beta kostenlos und über Apples TestFlight fürs iPhone verfügbar. Das solltest du vor dem Start wissen.",
    faqWhatQuestion: "Was ist Akari?",
    faqWhatAnswer: "Akari ist eine iPhone-App, die deine Gesundheitsdaten ruhig und verständlich einordnet.",
    faqDataQuestion: "Welche Gesundheitsdaten kann ich sehen?",
    faqDataAnswer: "Akari zeigt Vitalwerte, Aktivität, Ernährung und Ziele gemeinsam. So bekommst du mehr Kontext im Alltag.",
    faqPrivacyQuestion: "Bleiben meine Gesundheitsdaten auf dem iPhone?",
    faqPrivacyAnswer: "Ja. Akari braucht kein Konto, und deine Gesundheitsdaten bleiben auf deinem iPhone.",
    faqTryQuestion: "Wie teste ich Akari?",
    faqTryPrefix: "Teste Akari kostenlos über ",
    faqTrySuffix: " und gestalte die App vor dem Start mit.",
    footerLabel: "Akari-Info und rechtlicher Hinweis",
    madePrefix: "Mit ",
    madeSuffix: " in Deutschland entwickelt",
    heartLabel: "Liebe",
    adminLoginLabel: "Admin",
    footerSitemapLabel: "Seitenübersicht",
    footerProductTitle: "Produkt",
    footerJoinLabel: "Beta beitreten",
    footerVitalsLabel: "Vitalwerte",
    footerNutritionLabel: "Ernährung",
    footerGoalsLabel: "Ziele",
    footerFoodLabel: "Essen erfassen",
    footerDataLabel: "Deine Daten",
    footerSupportTitle: "Hilfe",
    footerFaqLabel: "FAQ",
    footerLegalTitle: "Rechtliches",
    privacyLabel: "Datenschutzerklärung",
    termsLabel: "Nutzungsbedingungen",
    contactLabel: "Kontakt",
    disclaimer: "Akari ist kein Ersatz für eine professionelle medizinische Beratung. Wende dich immer zuerst an deine Ärztin oder deinen Arzt.",
  },
};

const pageMetadata = {
  en: {
    title: "Akari: Understand your health data",
    description: "Akari is a private iPhone health app that turns health data, including vitals, activity and nutrition, into calm daily insights. Join the free TestFlight beta.",
    socialTitle: "Akari: Understand your health data",
    socialDescription: "Akari turns your health data into a calm, readable daily story. It brings your vitals, nutrition and goals together in one place.",
    twitterDescription: "Akari turns your health data into a calm, readable daily story. It brings your vitals, nutrition and goals together in one place.",
    imageAlt: "Akari logo in an orange-to-yellow gradient on a black background",
  },
  de: {
    title: "Akari: Verstehe deine Gesundheitsdaten",
    description: "Akari ist eine private Gesundheits-App fürs iPhone. Sie macht aus Vitalwerten, Aktivität und Ernährung verständliche Einblicke für jeden Tag. Jetzt kostenlos testen.",
    socialTitle: "Akari: Verstehe deine Gesundheitsdaten",
    socialDescription: "Akari macht aus deinen Gesundheitsdaten eine klare Geschichte deines Tages und bringt Vitalwerte, Ernährung und Ziele an einem Ort zusammen.",
    twitterDescription: "Akari macht aus deinen Gesundheitsdaten eine klare Geschichte deines Tages und bringt Vitalwerte, Ernährung und Ziele an einem Ort zusammen.",
    imageAlt: "Akari-Logo mit orange-gelbem Verlauf auf schwarzem Hintergrund",
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
        primaryImageOfPage: "https://joinakari.com/assets/social.png?v=2",
        inLanguage: language,
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://joinakari.com/#app",
        name: "Akari",
        url,
        description: isGerman
          ? "Akari macht Gesundheitsdaten zu einer ruhigen, verständlichen Geschichte des Tages. Dazu erklärt die App unterstützte Vitalwerte, Aktivität und Ernährung mit einfachen Worten."
          : "Akari turns health data into a calm, readable daily story with simple explanations across supported vitals, activity and nutrition data.",
        applicationCategory: "HealthApplication",
        operatingSystem: "iOS",
        availableOnDevice: "iPhone",
        isAccessibleForFree: true,
        image: "https://joinakari.com/assets/app-icon.png",
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

function selectLanguage(language, persist = true, updateUrl = true, updateAppearance = true) {
  if (!translations[language]) return;
  root.dataset.language = language;
  root.lang = language;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = translations[language][element.dataset.i18n];
    if (value !== undefined) element.textContent = value;
  });
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
  document.querySelectorAll('.footer-sitemap a[href^="/privacy/"], .footer-sitemap a[href^="/terms/"], .privacy__link').forEach((link) => {
    const url = new URL(link.getAttribute("href"), window.location.origin);
    if (language === "de") url.searchParams.set("lang", "de");
    else url.searchParams.delete("lang");
    link.href = `${url.pathname}${url.search}`;
  });

  if (persist) {
    persistSitePreference("akari-language", language);
  }
  if (updateUrl) updateLanguageUrl(language);
  updatePageMetadata(language);
  if (updateAppearance) updateThemeColor();
}

let activeLanguageTransition;
let queuedLanguage;

function languageTransitionItems() {
  const contentGroups = document.querySelectorAll([
    ".burst-hero h1",
    ".pill-cta > [data-i18n]",
    ".burst__bubble",
    ".eyebrow",
    "main h2:not(#hero-title)",
    ".muted-copy",
    ".privacy__body",
    ".privacy__link > [data-i18n]",
    ".goal-pill",
    ".goals__blurb",
    ".goals__focuses",
    ".band-cta > [data-i18n]",
    ".faq__item",
    ".footer-made",
    ".footer-sitemap",
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
  brandLogos.forEach((logo) => {
    logo.src = new URL(`assets/logo/akari-logo-${root.dataset.theme}-dark.svg?v=2`, siteRoot).href;
  });
  document.querySelectorAll("img[data-theme-icon]").forEach((icon) => {
    icon.src = new URL(`assets/app-icons/${root.dataset.theme}.jpg`, siteRoot).href;
  });
  document.querySelectorAll("img[data-piece]").forEach((piece) => {
    const source = new URL(`assets/welcome/${root.dataset.language}/${root.dataset.mode}/${piece.dataset.piece}@3x.png`, siteRoot).href;
    if (piece.src !== source) piece.src = source;
  });
  if (adminLink) {
    const localPreview = ["127.0.0.1", "localhost"].includes(window.location.hostname);
    const adminURL = new URL(localPreview
      ? "http://127.0.0.1:8791/login"
      : "https://admin.joinakari.com/");
    adminURL.searchParams.set("theme", root.dataset.theme);
    adminURL.searchParams.set("mode", root.dataset.mode);
    adminURL.searchParams.set("lang", root.dataset.language);
    adminLink.href = adminURL.href;
  }

}

function selectTheme(theme, persist = true, updateAppearance = true) {
  if (!pageColors.dark[theme]) return;
  const themeChanged = root.dataset.theme !== theme;
  root.dataset.theme = theme;
  themeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.themeTarget === theme));
  });
  if (persist) {
    persistSitePreference("akari-theme", theme);
  }
  if (updateAppearance && themeChanged) updateThemeColor();
}

function selectMode(mode, persist = true, updateAppearance = true) {
  if (!pageColors[mode]) return;
  const modeChanged = root.dataset.mode !== mode;
  root.dataset.mode = mode;
  modeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.modeTarget === mode));
  });
  if (persist) {
    followsSystemMode = false;
    persistSitePreference("akari-mode", mode);
  }
  if (updateAppearance && modeChanged) updateThemeColor();
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

function selectGoal(pill, moveFocus = false) {
  goalOptions.querySelectorAll(".goal-pill").forEach((option) => {
    const isSelected = option === pill;
    option.setAttribute("aria-checked", String(isSelected));
    option.tabIndex = isSelected ? 0 : -1;
  });
  goalBlurb.dataset.i18n = `goal${pill.dataset.goal}Blurb`;
  goalBlurb.textContent = translations[root.dataset.language]?.[goalBlurb.dataset.i18n] ?? goalBlurb.textContent;
  goalSticker.src = new URL(`assets/stickers/${goalStickers[pill.dataset.goal]}.png`, siteRoot).href;
  goalSticker.classList.remove("is-tossed");
  void goalSticker.offsetWidth;
  goalSticker.classList.add("is-tossed");
  renderGoalFocuses(pill.dataset.goal);
  if (moveFocus) pill.focus();
}

function renderGoalFocuses(goal) {
  const copy = translations[root.dataset.language];
  const tiles = goalFocusLists[goal].map((focus, index) => {
    const tile = document.createElement("li");
    tile.className = "focus-tile is-new";
    tile.style.setProperty("--tile-delay", `${index * 60}ms`);
    const sticker = document.createElement("img");
    sticker.src = new URL(`assets/stickers/${focusStickers[focus]}.png`, siteRoot).href;
    sticker.alt = "";
    sticker.width = 256;
    sticker.height = 256;
    const title = document.createElement("strong");
    title.dataset.i18n = `focus${focus}Title`;
    title.textContent = copy[title.dataset.i18n];
    const body = document.createElement("span");
    body.dataset.i18n = `focus${focus}Body`;
    body.textContent = copy[body.dataset.i18n];
    tile.append(sticker, title, body);
    return tile;
  });
  goalFocuses.dataset.count = String(tiles.length);
  goalFocuses.replaceChildren(...tiles);
}

// Fetch the other goal stickers once the page is idle, so a switch never waits on the network.
window.addEventListener("load", () => {
  [...Object.values(goalStickers), ...Object.values(focusStickers)].forEach((name) => {
    new Image().src = new URL(`assets/stickers/${name}.png`, siteRoot).href;
  });
}, { once: true });

goalOptions?.addEventListener("click", (event) => {
  const pill = event.target.closest(".goal-pill");
  if (pill) selectGoal(pill);
});

goalOptions?.addEventListener("keydown", (event) => {
  const pills = [...goalOptions.querySelectorAll(".goal-pill")];
  const current = pills.indexOf(document.activeElement);
  if (current === -1) return;

  let next;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (current + 1) % pills.length;
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (current - 1 + pills.length) % pills.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = pills.length - 1;
  else if (event.key === " ") next = current;
  else return;

  event.preventDefault();
  selectGoal(pills[next], true);
});

languageButtons.forEach((button) => {
  button.addEventListener("click", () => transitionLanguage(button.dataset.languageTarget));
});

selectLanguage(root.dataset.language || "en", false, false, false);

try {
  const params = new URLSearchParams(window.location.search);
  const requestedTheme = params.get("theme");
  const requestedMode = params.get("mode");
  const queryTheme = pageColors.dark[requestedTheme] ? requestedTheme : null;
  const queryMode = pageColors[requestedMode] ? requestedMode : null;
  const savedTheme = localStorage.getItem("akari-theme");
  const savedMode = localStorage.getItem("akari-mode");

  followsSystemMode = !queryMode && !savedMode;
  selectTheme(queryTheme || savedTheme || "forest", Boolean(queryTheme), false);
  selectMode(queryMode || savedMode || (systemModePreference.matches ? "dark" : "light"), Boolean(queryMode), false);
} catch (error) {
  followsSystemMode = true;
  selectTheme("forest", false, false);
  selectMode(systemModePreference.matches ? "dark" : "light", false, false);
}

updateThemeColor();

systemModePreference.addEventListener?.("change", (event) => {
  if (followsSystemMode) selectMode(event.matches ? "dark" : "light", false);
});

function setupRevealMotion() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const loadItems = [];
  const scrollItems = [];
  const cardItems = [];
  const footerItems = [];

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
  // The headline is the page's largest paint, so it is never held back for an entrance.
  prepare(document.querySelectorAll(".pill-cta"), "pop", [620], loadItems);

  prepare(document.querySelectorAll(".eyebrow"), "pop", 0, scrollItems);
  prepare(document.querySelectorAll("main h2:not(#hero-title)"), "up", 0, scrollItems);
  prepare(document.querySelectorAll(".muted-copy, .privacy__body"), "up", 0, scrollItems);
  prepare(document.querySelectorAll(".goals__answer, .goals__focuses"), "card", 0, cardItems);
  prepare(document.querySelectorAll(".privacy__stickers, .shape__stickers"), "pop", 0, scrollItems);
  prepare(document.querySelectorAll(".privacy__link"), "up", 0, scrollItems);
  prepare(document.querySelectorAll(".goals__options, .band-cta"), "up", 0, scrollItems);
  prepare(document.querySelectorAll(".faq__item"), "up", 70, scrollItems);
  prepare(document.querySelectorAll(".spotlight__panel, .deep-panel, .food__panel"), "card", 0, cardItems);
  prepare(document.querySelectorAll(".footer-brand, .footer-column, .site-footer .footer-disclaimer"), "up", [0, 80, 140, 200, 260], footerItems);

  loadItems.forEach((element) => element.classList.add("reveal--armed"));

  const motionPreparationObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("reveal--armed");
      motionPreparationObserver.unobserve(entry.target);
    });
  }, {
    threshold: 0,
    rootMargin: "45% 0px",
  });

  [...scrollItems, ...cardItems, ...footerItems]
    .forEach((element) => motionPreparationObserver.observe(element));

  root.classList.add("motion-ready");

  function reveal(element) {
    if (element.classList.contains("is-visible")) return;
    element.classList.add("is-visible");

    const delay = Number.parseFloat(element.style.getPropertyValue("--reveal-delay")) || 0;
    const cleanupDuration = 1100;
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
    requestAnimationFrame(() => loadItems.forEach(reveal));
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

  const footer = document.querySelector(".site-footer");
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

// The hero's burst leans a little toward the pointer, each piece by its own depth (see .burst__piece).
function setupBurst() {
  const hero = document.querySelector(".burst-hero");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!hero || !finePointer.matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let targetX = 0;
  let targetY = 0;
  let pointerX = 0;
  let pointerY = 0;
  let frame;

  function ease() {
    pointerX += (targetX - pointerX) * 0.08;
    pointerY += (targetY - pointerY) * 0.08;
    hero.style.setProperty("--px", pointerX.toFixed(3));
    hero.style.setProperty("--py", pointerY.toFixed(3));
    const settled = Math.abs(targetX - pointerX) < 0.001 && Math.abs(targetY - pointerY) < 0.001;
    frame = settled ? undefined : requestAnimationFrame(ease);
  }

  function follow(x, y) {
    targetX = x;
    targetY = y;
    if (frame === undefined) frame = requestAnimationFrame(ease);
  }

  hero.addEventListener("pointermove", (event) => {
    const bounds = hero.getBoundingClientRect();
    follow(((event.clientX - bounds.left) / bounds.width) * 2 - 1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1);
  }, { passive: true });

  hero.addEventListener("pointerleave", () => follow(0, 0));
}

setupBurst();
