const root = document.documentElement;
const page = document.body.dataset.legalPage;
const languageButtons = document.querySelectorAll("[data-language-target]");
const themeButtons = document.querySelectorAll("[data-theme-target]");
const modeButtons = document.querySelectorAll("[data-mode-target]");
const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");
const headerControlsPanel = document.querySelector(".header-controls");
const brandLogos = document.querySelectorAll(".legal-brand img, .footer-logo img");
const adminLink = document.querySelector(".footer-admin-link");
const themeColor = document.querySelector('meta[name="theme-color"]');
const systemModePreference = window.matchMedia("(prefers-color-scheme: dark)");
const playfulEmojis = document.querySelectorAll(".legal-headline-emoji");

const commonTranslations = {
  en: {
    headerLabel: "Akari website header",
    mobileMenuLabel: "Language and appearance settings",
    mobileLanguageLabel: "Language",
    mobileAppearanceLabel: "Appearance",
    appearanceLabel: "Choose page appearance",
    themeGroupLabel: "Choose a color theme",
    themeGermanyLabel: "Germany theme",
    themeJapanLabel: "Japan theme",
    themeScotlandLabel: "Scotland theme",
    themeUsaLabel: "USA theme",
    themePlainLabel: "Plain theme",
    lightModeLabel: "Use light appearance",
    darkModeLabel: "Use dark appearance",
    homeLabel: "Akari home",
    languageGroupLabel: "Choose a language",
    languageEnglishLabel: "View in English",
    languageGermanLabel: "View in German",
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
    footerPricingLabel: "Pricing",
    footerSupportTitle: "Support",
    footerFaqLabel: "FAQ",
    footerLegalTitle: "Legal",
    privacyLabel: "Privacy Policy",
    termsLabel: "Terms of Service",
    contactLabel: "Contact us",
    disclaimer: "Akari is not a substitute for professional medical advice. Always consult your physician first.",
  },
  de: {
    headerLabel: "Kopfbereich der Akari-Website",
    mobileMenuLabel: "Einstellungen für Sprache und Darstellung",
    mobileLanguageLabel: "Sprache",
    mobileAppearanceLabel: "Design",
    appearanceLabel: "Erscheinungsbild der Seite wählen",
    themeGroupLabel: "Farbthema wählen",
    themeGermanyLabel: "Deutschland-Design",
    themeJapanLabel: "Japan-Design",
    themeScotlandLabel: "Schottland-Design",
    themeUsaLabel: "USA-Design",
    themePlainLabel: "Schlicht-Design",
    lightModeLabel: "Helles Erscheinungsbild verwenden",
    darkModeLabel: "Dunkles Erscheinungsbild verwenden",
    homeLabel: "Akari-Startseite",
    languageGroupLabel: "Sprache wählen",
    languageEnglishLabel: "Seite auf Englisch anzeigen",
    languageGermanLabel: "Seite auf Deutsch anzeigen",
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
    footerPricingLabel: "Preise",
    footerSupportTitle: "Hilfe",
    footerFaqLabel: "FAQ",
    footerLegalTitle: "Rechtliches",
    privacyLabel: "Datenschutzerklärung",
    termsLabel: "Nutzungsbedingungen",
    contactLabel: "Kontakt",
    disclaimer: "Akari ist kein Ersatz für eine professionelle medizinische Beratung. Wende dich immer zuerst an deine Ärztin oder deinen Arzt.",
  },
};

const pageTranslations = {
  privacy: {
    en: {
      title: "Privacy, without the fine-print fog.",
      emojiLabel: "Play with the lock emoji",
      intro: "Akari is built to help you understand your health without turning it into someone else’s business.",
      updated: "Effective September 21, 2026",
      shortTitle: "The short version",
      shortAccount: "Akari does not require an Akari account.",
      shortDevice: "Your health information is processed on your iPhone and is not used for advertising.",
      shortSale: "Akari does not sell your personal or health information.",
      shortChoice: "You choose which health sources and permissions to connect, and you can disconnect them at any time.",
      shortReports: "If you choose to send a food report from the app, it reaches our server so we can correct the match. It carries no account and no Apple Health data.",
      reportsTitle: "Food reports",
      reportsSent: "When a food match looks wrong, or right, you can send us a food report from the app. Nothing is sent unless you tap Send. Reports are the part of Akari that leaves your iPhone on purpose: they reach our server so we can improve how Akari recognises food.",
      reportsContent: "A report contains your rating and the reasons you picked, your comment if you write one, what you typed or said, the foods Akari matched with their amounts and nutrients, anything it could not match, a scanned barcode if there was one, and the app’s language, region and version. It does not include your name, an account, your Apple Health data or your location, unless you write something like that into your comment.",
      reportsKeep: "To prevent abuse, the app attaches a random identifier that exists only for food reports; our server keeps just a one-way hash of it and uses it to limit how many reports one installation can send in a day. Our server stores no IP address. Reports are stored with our hosting provider, Cloudflare, and are read only by the Akari team in our review tool. We keep them as long as they help us improve food recognition. To have a report removed, email <a href=\"mailto:contact@hejrafa.com\">contact@hejrafa.com</a> with the date and what you reported.",
      accessTitle: "Information Akari accesses",
      accessApple: "<strong>Apple Health.</strong> With your permission, Akari reads the health, activity, sleep, nutrition, and body-measurement categories you select. When you log supported information in Akari, the app may write it to Apple Health only after you grant the corresponding permission.",
      accessGoogle: "<strong>Google Health.</strong> If you connect Google Health, Akari requests read-only access to activity and fitness, health metrics and measurements, and sleep. This can include data from Fitbit, Pixel Watch, and other sources available through Google Health. Akari does not request permission to change or delete your Google Health data.",
      accessEntered: "<strong>Information you enter.</strong> This includes food and water logs, goals, preferences, and other entries you choose to add.",
      accessLocation: "<strong>Location.</strong> If you allow location access, Akari uses your approximate location while the app is open to provide relevant weather context. Akari does not use location for advertising.",
      useTitle: "How the information is used",
      useBody: "Akari uses the information you authorize to display your daily health view, calculate trends and goals, create explanations, and help you connect activity, recovery, sleep, nutrition, and body measurements. Apple Health remains the primary source. Google Health is used to fill matching gaps and avoid double counting where possible.",
      useGoogle: "Data received from Google APIs is used and transferred in accordance with the <a href=\"https://developers.google.com/terms/api-services-user-data-policy\" rel=\"noreferrer\">Google API Services User Data Policy</a>, including its Limited Use requirements.",
      storageTitle: "Storage and sharing",
      storageBody: "Akari stores its health views and app data locally on your device. Google authorization credentials are kept in protected device storage. Akari does not operate an advertising profile or sell health information.",
      sharingBody: "Information may be disclosed if required by law, to protect users or the service from fraud or abuse, or to service providers strictly as needed to operate Akari. Those providers may not use the information for their own advertising or unrelated purposes.",
      choicesTitle: "Your choices and deletion",
      choicesBody: "You can change Apple Health permissions in iOS Settings or the Health app. You can disconnect Google Health in Akari and revoke Akari’s access from your Google Account permissions. Disconnecting stops future access.",
      deletionBody: "You can remove Akari’s locally stored information by deleting entries in the app where available or by deleting the app. Information already written to Apple Health remains under your control in Apple Health. To request help with access or deletion, email <a href=\"mailto:contact@hejrafa.com\">contact@hejrafa.com</a>.",
      securityTitle: "Security, children, and changes",
      securityBody: "Akari uses platform security features and limits access to the information needed for its user-facing health features. No system is perfectly secure, but we work to protect data and minimize what leaves your device.",
      childrenBody: "Akari is not directed to children under 13, or a higher minimum age where local law requires it. We may update this policy when Akari changes. The effective date above will be updated, and significant changes will be communicated in the app or on this site.",
      contactTitle: "Contact",
      contactBody: "Questions about privacy or Google Health access can be sent to <a href=\"mailto:contact@hejrafa.com\">contact@hejrafa.com</a>.",
    },
    de: {
      title: "Datenschutz, klar und verständlich.",
      emojiLabel: "Mit dem Schloss-Emoji spielen",
      intro: "Akari hilft dir, deine Gesundheit zu verstehen, ohne sie zum Geschäft anderer zu machen.",
      updated: "Gültig ab 21. September 2026",
      shortTitle: "Kurz gesagt",
      shortAccount: "Für Akari brauchst du kein Akari-Konto.",
      shortDevice: "Deine Gesundheitsdaten werden auf deinem iPhone verarbeitet und nicht für Werbung verwendet.",
      shortSale: "Akari verkauft weder personenbezogene Daten noch Gesundheitsdaten.",
      shortChoice: "Du entscheidest, welche Gesundheitsquellen und Berechtigungen du verbindest, und kannst sie jederzeit wieder trennen.",
      shortReports: "Wenn du in der App eine Essensmeldung abschickst, landet sie auf unserem Server, damit wir den Treffer korrigieren können. Sie enthält kein Konto und keine Apple-Health-Daten.",
      reportsTitle: "Essensmeldungen",
      reportsSent: "Wenn ein erkanntes Lebensmittel falsch oder richtig wirkt, kannst du uns aus der App eine Essensmeldung schicken. Gesendet wird nur, wenn du auf Senden tippst. Meldungen sind der Teil von Akari, der dein iPhone bewusst verlässt: Sie landen auf unserem Server, damit wir verbessern können, wie Akari Lebensmittel erkennt.",
      reportsContent: "Eine Meldung enthält deine Bewertung und die gewählten Gründe, deinen Kommentar, falls du einen schreibst, was du getippt oder gesagt hast, die erkannten Lebensmittel mit Mengen und Nährwerten, alles, was nicht erkannt wurde, einen gescannten Barcode, falls vorhanden, sowie Sprache, Region und Version der App. Sie enthält weder deinen Namen noch ein Konto, deine Apple-Health-Daten oder deinen Standort, es sei denn, du schreibst so etwas in deinen Kommentar.",
      reportsKeep: "Zum Schutz vor Missbrauch hängt die App eine zufällige Kennung an, die es nur für Essensmeldungen gibt; unser Server speichert davon nur einen Einweg-Hash und begrenzt damit, wie viele Meldungen eine Installation pro Tag senden kann. Unser Server speichert keine IP-Adresse. Meldungen liegen bei unserem Hosting-Anbieter Cloudflare und werden nur vom Akari-Team in unserem Prüfwerkzeug gelesen. Wir bewahren sie auf, solange sie uns helfen, die Lebensmittelerkennung zu verbessern. Wenn eine Meldung gelöscht werden soll, schreib an <a href=\"mailto:contact@hejrafa.com\">contact@hejrafa.com</a> mit dem Datum und dem, was du gemeldet hast.",
      accessTitle: "Auf welche Informationen Akari zugreift",
      accessApple: "<strong>Apple Health.</strong> Mit deiner Erlaubnis liest Akari die von dir ausgewählten Kategorien für Gesundheit, Aktivität, Schlaf, Ernährung und Körpermessungen. Wenn du unterstützte Informationen in Akari einträgst, kann die App sie erst dann in Apple Health speichern, wenn du die entsprechende Berechtigung erteilt hast.",
      accessGoogle: "<strong>Google Health.</strong> Wenn du Google Health verbindest, fordert Akari ausschließlich Lesezugriff auf Aktivität und Fitness, Gesundheitswerte und Messungen sowie Schlaf an. Dazu können Daten von Fitbit, Pixel Watch und anderen über Google Health verfügbaren Quellen gehören. Akari fordert keine Berechtigung an, deine Google-Health-Daten zu ändern oder zu löschen.",
      accessEntered: "<strong>Von dir eingegebene Informationen.</strong> Dazu gehören Ernährungs- und Wassereinträge, Ziele, Einstellungen und weitere Angaben, die du selbst hinzufügst.",
      accessLocation: "<strong>Standort.</strong> Wenn du den Standortzugriff erlaubst, nutzt Akari deinen ungefähren Standort, während die App geöffnet ist, um passende Wetterinformationen anzuzeigen. Akari verwendet deinen Standort nicht für Werbung.",
      useTitle: "Wie die Informationen verwendet werden",
      useBody: "Akari verwendet die von dir freigegebenen Informationen, um deine tägliche Gesundheitsansicht darzustellen, Trends und Ziele zu berechnen, Erklärungen zu erstellen und Zusammenhänge zwischen Aktivität, Erholung, Schlaf, Ernährung und Körpermessungen sichtbar zu machen. Apple Health bleibt die primäre Quelle. Google Health wird genutzt, um passende Lücken zu schließen und doppelte Einträge nach Möglichkeit zu vermeiden.",
      useGoogle: "Von Google APIs erhaltene Daten werden gemäß der <a href=\"https://developers.google.com/terms/api-services-user-data-policy\" rel=\"noreferrer\">Google API Services User Data Policy</a> einschließlich der Anforderungen zur eingeschränkten Nutzung verwendet und übertragen.",
      storageTitle: "Speicherung und Weitergabe",
      storageBody: "Akari speichert Gesundheitsansichten und App-Daten lokal auf deinem Gerät. Google-Anmeldedaten werden im geschützten Gerätespeicher abgelegt. Akari erstellt kein Werbeprofil und verkauft keine Gesundheitsdaten.",
      sharingBody: "Informationen können offengelegt werden, wenn dies gesetzlich vorgeschrieben ist, um Nutzerinnen und Nutzer oder den Dienst vor Betrug oder Missbrauch zu schützen, oder soweit Dienstleister sie zwingend für den Betrieb von Akari benötigen. Diese Dienstleister dürfen die Informationen nicht für eigene Werbung oder andere Zwecke verwenden.",
      choicesTitle: "Deine Wahlmöglichkeiten und Löschung",
      choicesBody: "Du kannst Apple-Health-Berechtigungen in den iOS-Einstellungen oder in der Health-App ändern. Du kannst Google Health in Akari trennen und Akaris Zugriff in den Berechtigungen deines Google-Kontos widerrufen. Danach findet kein weiterer Zugriff statt.",
      deletionBody: "Du kannst lokal in Akari gespeicherte Informationen entfernen, indem du Einträge – soweit verfügbar – in der App löschst oder die App deinstallierst. Bereits in Apple Health gespeicherte Informationen bleiben dort unter deiner Kontrolle. Hilfe bei Auskunft oder Löschung erhältst du per E-Mail an <a href=\"mailto:contact@hejrafa.com\">contact@hejrafa.com</a>.",
      securityTitle: "Sicherheit, Kinder und Änderungen",
      securityBody: "Akari nutzt die Sicherheitsfunktionen der Plattform und beschränkt den Zugriff auf die Informationen, die für die Gesundheitsfunktionen der App erforderlich sind. Kein System ist vollkommen sicher, aber wir schützen deine Daten und halten die Datenmenge, die dein Gerät verlässt, so klein wie möglich.",
      childrenBody: "Akari richtet sich nicht an Kinder unter 13 Jahren oder unter einem höheren, lokal geltenden Mindestalter. Wir können diese Datenschutzerklärung aktualisieren, wenn sich Akari verändert. Das oben genannte Datum wird dann angepasst; über wesentliche Änderungen informieren wir in der App oder auf dieser Website.",
      contactTitle: "Kontakt",
      contactBody: "Fragen zum Datenschutz oder zum Zugriff auf Google Health kannst du an <a href=\"mailto:contact@hejrafa.com\">contact@hejrafa.com</a> senden.",
    },
  },
  terms: {
    en: {
      title: "Terms you can actually read.",
      emojiLabel: "Play with the handshake emoji",
      intro: "These terms govern your use of the Akari app, beta builds, and website.",
      updated: "Effective September 21, 2026",
      usingTitle: "Using Akari",
      usingBody: "By using Akari, you agree to these terms and the <a href=\"/privacy/\">Privacy Policy</a>. You may use Akari for personal, lawful purposes and in accordance with the rules of Apple, Google, and any connected service.",
      responsibilityBody: "You remain responsible for your device, your connected accounts, and the accuracy of information you enter.",
      medicalTitle: "Health information is not medical advice",
      medicalBody: "Akari presents wellness information, summaries, estimates, and patterns for general informational purposes. It is not a medical device, diagnosis, treatment, or substitute for professional medical advice. Do not use Akari for emergencies or to make urgent medical decisions.",
      readingsBody: "Health readings and estimates can be delayed, incomplete, or inaccurate. Contact a qualified healthcare professional with questions about your health, and contact local emergency services in an emergency.",
      servicesTitle: "Connected services",
      servicesBody: "Features that use Apple Health, Google Health, Fitbit, Pixel Watch, weather providers, or other third-party services depend on those services and the permissions you grant. Their own terms and privacy policies also apply. Akari is not responsible for outages, changes, or inaccuracies originating from a third-party service.",
      betaTitle: "Beta software and availability",
      betaBody: "Pre-release versions may contain bugs, change without notice, or lose data. Features may be added, changed, suspended, or discontinued. Please keep independent copies of information that is important to you.",
      purchasesTitle: "Subscriptions and purchases",
      purchasesBody: "If Akari offers a paid subscription or purchase, the price, billing period, trial, renewal, and cancellation terms shown in the app at checkout apply. Apple processes App Store payments, and you can manage or cancel them through your Apple Account settings.",
      acceptableTitle: "Acceptable use and ownership",
      acceptableBody: "Do not misuse Akari, interfere with its operation, attempt unauthorized access, or use it to violate another person’s rights. Akari’s software, design, writing, branding, and original content remain protected by applicable intellectual-property laws. These terms give you a personal, limited, non-transferable right to use the service.",
      disclaimersTitle: "Disclaimers and responsibility",
      disclaimersBody: "To the extent permitted by law, Akari is provided “as is” and without warranties of uninterrupted availability or error-free results. Nothing in these terms excludes rights or liabilities that cannot legally be excluded, including applicable consumer protections.",
      liabilityBody: "To the extent permitted by law, Akari is not liable for indirect or consequential losses resulting from use of the service or reliance on its informational output.",
      changesTitle: "Changes and contact",
      changesBody: "We may update these terms as Akari evolves. The effective date above will change, and significant updates will be communicated in the app or on this site. If a provision is unenforceable, the remaining provisions continue to apply.",
      questionsBody: "Questions can be sent to <a href=\"mailto:contact@hejrafa.com\">contact@hejrafa.com</a>.",
    },
    de: {
      title: "Regeln, die du wirklich lesen kannst.",
      emojiLabel: "Mit dem Handschlag-Emoji spielen",
      intro: "Diese Bedingungen gelten für deine Nutzung der Akari-App, der Beta-Versionen und der Website.",
      updated: "Gültig ab 21. September 2026",
      usingTitle: "Akari verwenden",
      usingBody: "Mit der Nutzung von Akari stimmst du diesen Bedingungen und der <a href=\"/privacy/\">Datenschutzerklärung</a> zu. Du darfst Akari für persönliche, rechtmäßige Zwecke und im Einklang mit den Regeln von Apple, Google und allen verbundenen Diensten verwenden.",
      responsibilityBody: "Du bist für dein Gerät, deine verbundenen Konten und die Richtigkeit der von dir eingegebenen Informationen verantwortlich.",
      medicalTitle: "Gesundheitsinformationen sind keine medizinische Beratung",
      medicalBody: "Akari zeigt Wellness-Informationen, Zusammenfassungen, Schätzungen und Muster zu allgemeinen Informationszwecken. Akari ist weder ein Medizinprodukt noch eine Diagnose, Behandlung oder ein Ersatz für professionelle medizinische Beratung. Verwende Akari nicht in Notfällen oder für dringende medizinische Entscheidungen.",
      readingsBody: "Gesundheitswerte und Schätzungen können verzögert, unvollständig oder ungenau sein. Wende dich bei Fragen zu deiner Gesundheit an medizinisches Fachpersonal und in einem Notfall an den örtlichen Rettungsdienst.",
      servicesTitle: "Verbundene Dienste",
      servicesBody: "Funktionen, die Apple Health, Google Health, Fitbit, Pixel Watch, Wetteranbieter oder andere Dienste Dritter nutzen, hängen von diesen Diensten und den von dir erteilten Berechtigungen ab. Zusätzlich gelten deren eigene Bedingungen und Datenschutzerklärungen. Akari ist nicht für Ausfälle, Änderungen oder Ungenauigkeiten verantwortlich, die von einem Drittanbieter ausgehen.",
      betaTitle: "Beta-Software und Verfügbarkeit",
      betaBody: "Vorabversionen können Fehler enthalten, sich ohne Vorankündigung ändern oder Daten verlieren. Funktionen können hinzugefügt, geändert, ausgesetzt oder eingestellt werden. Bewahre eigenständige Kopien von Informationen auf, die dir wichtig sind.",
      purchasesTitle: "Abonnements und Käufe",
      purchasesBody: "Falls Akari ein kostenpflichtiges Abonnement oder einen Kauf anbietet, gelten die in der App beim Abschluss angezeigten Angaben zu Preis, Abrechnungszeitraum, Testphase, Verlängerung und Kündigung. Apple verarbeitet Zahlungen im App Store; du kannst sie in den Einstellungen deines Apple Accounts verwalten oder kündigen.",
      acceptableTitle: "Zulässige Nutzung und Eigentum",
      acceptableBody: "Missbrauche Akari nicht, störe den Betrieb nicht, versuche keinen unbefugten Zugriff und verletze mit der Nutzung keine Rechte anderer. Software, Design, Texte, Marke und eigene Inhalte von Akari bleiben durch die geltenden Gesetze zum geistigen Eigentum geschützt. Diese Bedingungen geben dir ein persönliches, beschränktes und nicht übertragbares Recht zur Nutzung des Dienstes.",
      disclaimersTitle: "Haftungsausschlüsse und Verantwortung",
      disclaimersBody: "Soweit gesetzlich zulässig, wird Akari „wie besehen“ und ohne Gewähr für eine ununterbrochene Verfügbarkeit oder fehlerfreie Ergebnisse bereitgestellt. Diese Bedingungen schließen keine Rechte oder Haftungen aus, die gesetzlich nicht ausgeschlossen werden dürfen; dazu gehören auch geltende Verbraucherschutzrechte.",
      liabilityBody: "Soweit gesetzlich zulässig, haftet Akari nicht für mittelbare Schäden oder Folgeschäden, die aus der Nutzung des Dienstes oder dem Vertrauen auf seine Informationsausgaben entstehen.",
      changesTitle: "Änderungen und Kontakt",
      changesBody: "Wir können diese Bedingungen aktualisieren, wenn sich Akari weiterentwickelt. Das oben genannte Datum wird dann angepasst; über wesentliche Änderungen informieren wir in der App oder auf dieser Website. Sollte eine Bestimmung unwirksam sein, bleiben die übrigen Bestimmungen davon unberührt.",
      questionsBody: "Fragen kannst du an <a href=\"mailto:contact@hejrafa.com\">contact@hejrafa.com</a> senden.",
    },
  },
};

const pageMetadata = {
  privacy: {
    en: { title: "Akari: Privacy Policy", description: "Akari privacy policy, including how Apple Health and Google Health data are handled." },
    de: { title: "Akari: Datenschutzerklärung", description: "Akaris Datenschutzerklärung erklärt, wie Daten aus Apple Health und Google Health verarbeitet werden." },
  },
  terms: {
    en: { title: "Akari: Terms of Use", description: "Terms of use for the Akari iPhone health app." },
    de: { title: "Akari: Nutzungsbedingungen", description: "Nutzungsbedingungen für die Akari Gesundheits-App auf dem iPhone." },
  },
};

const pageColors = {
  dark: { meadow: "#1a1812", forest: "#161a12", coast: "#12171a", canyon: "#1a1412", plain: "#000000" },
  light: { meadow: "#f1eaca", forest: "#e1f1ca", coast: "#cae2f1", canyon: "#f1d7ca", plain: "#f5f5f5" },
};

// The header and footer sit on each theme's deep band in both schemes, so the browser chrome takes
// the band colour and the logos use the variant drawn for a dark ground.
const bandColors = { meadow: "#0a4252", forest: "#0c271c", coast: "#083756", canyon: "#482219", plain: "#141414" };

function persistSitePreference(name, value) {
  try { localStorage.setItem(name, value); } catch (error) {}
  try {
    const sharedDomain = window.location.hostname === "joinakari.com" || window.location.hostname.endsWith(".joinakari.com")
      ? "; Domain=.joinakari.com; Secure"
      : "";
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${sharedDomain}`;
  } catch (error) {}
}

function updateLanguageUrl(language) {
  const url = new URL(window.location.href);
  if (language === "de") url.searchParams.set("lang", "de");
  else url.searchParams.delete("lang");
  window.history.replaceState({}, "", url);
}

function updateInternalLinks(language) {
  document.querySelectorAll('.footer-sitemap a[href^="/"], .footer-logo, .legal-brand, a[href^="/privacy/"], a[href^="/terms/"]').forEach((link) => {
    const url = new URL(link.getAttribute("href"), window.location.origin);
    if (language === "de") url.searchParams.set("lang", "de");
    else url.searchParams.delete("lang");
    link.href = `${url.pathname}${url.search}${url.hash}`;
  });
}

function updateAppearance() {
  const theme = pageColors.dark[root.dataset.theme] ? root.dataset.theme : "forest";
  const mode = pageColors[root.dataset.mode] ? root.dataset.mode : (systemModePreference.matches ? "dark" : "light");
  root.dataset.theme = theme;
  root.dataset.mode = mode;

  if (themeColor) themeColor.content = bandColors[theme];
  themeButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.themeTarget === theme)));
  modeButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.modeTarget === mode)));
  brandLogos.forEach((logo) => { logo.src = `/assets/logo/akari-logo-${theme}-dark.svg?v=2`; });
  if (adminLink) {
    const localPreview = ["127.0.0.1", "localhost"].includes(window.location.hostname);
    const adminURL = new URL(localPreview ? "http://127.0.0.1:8791/login" : "https://admin.joinakari.com/");
    adminURL.searchParams.set("theme", theme);
    adminURL.searchParams.set("mode", mode);
    adminURL.searchParams.set("lang", root.dataset.language || "en");
    adminLink.href = adminURL.href;
  }
}

function selectLanguage(language, persist = true, updateUrl = true) {
  const pageCopy = pageTranslations[page]?.[language];
  const commonCopy = commonTranslations[language];
  if (!pageCopy || !commonCopy) return;
  const copy = { ...commonCopy, ...pageCopy };

  root.dataset.language = language;
  root.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = copy[element.dataset.i18n];
    if (value !== undefined) element.textContent = value;
  });
  document.querySelectorAll("[data-i18n-html]").forEach((element) => {
    const value = copy[element.dataset.i18nHtml];
    if (value !== undefined) element.innerHTML = value;
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const value = copy[element.dataset.i18nAriaLabel];
    if (value !== undefined) element.setAttribute("aria-label", value);
  });
  languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.languageTarget === language));
  });

  const metadata = pageMetadata[page][language];
  document.title = metadata.title;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = metadata.description;
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = language === "de" ? `https://joinakari.com/${page}/?lang=de` : `https://joinakari.com/${page}/`;

  if (persist) persistSitePreference("akari-language", language);
  if (updateUrl) updateLanguageUrl(language);
  updateInternalLinks(language);
  updateAppearance();
}

function transitionLanguage(language) {
  if (language === root.dataset.language) return;
  if (typeof document.startViewTransition === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.startViewTransition(() => selectLanguage(language));
  } else {
    selectLanguage(language);
  }
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => transitionLanguage(button.dataset.languageTarget));
});

selectLanguage(root.dataset.language || "en", false, false);
updateAppearance();

let followsSystemMode = false;
try {
  const params = new URLSearchParams(window.location.search);
  followsSystemMode = !params.get("mode") && !localStorage.getItem("akari-mode");
} catch (error) {
  followsSystemMode = true;
}

systemModePreference.addEventListener?.("change", (event) => {
  if (!followsSystemMode) return;
  root.dataset.mode = event.matches ? "dark" : "light";
  updateAppearance();
});

themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    root.dataset.theme = button.dataset.themeTarget;
    persistSitePreference("akari-theme", root.dataset.theme);
    updateAppearance();
  });
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    followsSystemMode = false;
    root.dataset.mode = button.dataset.modeTarget;
    persistSitePreference("akari-mode", root.dataset.mode);
    updateAppearance();
  });
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

window.addEventListener("storage", (event) => {
  if (event.key === "akari-theme" && pageColors.dark[event.newValue]) root.dataset.theme = event.newValue;
  if (event.key === "akari-mode" && pageColors[event.newValue]) {
    followsSystemMode = false;
    root.dataset.mode = event.newValue;
  }
  if (event.key === "akari-language" && commonTranslations[event.newValue]) {
    selectLanguage(event.newValue, false, false);
    return;
  }
  if (event.key === "akari-theme" || event.key === "akari-mode") updateAppearance();
});

function popEmoji(emoji) {
  const bounds = emoji.getBoundingClientRect();
  const angle = (-0.88 + Math.random() * 0.76) * Math.PI;
  const distance = 42 + Math.random() * 36;
  const particle = document.createElement("span");

  particle.className = "emoji-particle";
  particle.textContent = emoji.textContent.trim();
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
  particle.addEventListener("animationend", () => particle.remove());
  navigator.vibrate?.(10);
}

playfulEmojis.forEach((emoji) => {
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
});
