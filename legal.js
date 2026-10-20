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
    themeMeadowLabel: "Wasserkuppe",
    themeForestLabel: "Shiratani",
    themeCoastLabel: "Loch Tay",
    themeCanyonLabel: "Green River Overlook",
    themePlainLabel: "Plain",
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
    brandLabel: "Brand",
    disclaimer: "Akari is not a substitute for professional medical advice. Always consult your physician first.",
  },
  de: {
    headerLabel: "Kopfbereich der Akari-Website",
    mobileMenuLabel: "Einstellungen für Sprache und Darstellung",
    mobileLanguageLabel: "Sprache",
    mobileAppearanceLabel: "Darstellung",
    appearanceLabel: "Erscheinungsbild der Seite wählen",
    themeGroupLabel: "Farbthema wählen",
    themeMeadowLabel: "Wasserkuppe",
    themeForestLabel: "Shiratani",
    themeCoastLabel: "Loch Tay",
    themeCanyonLabel: "Green River Overlook",
    themePlainLabel: "Schlicht",
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
    brandLabel: "Marke",
    disclaimer: "Akari ist kein Ersatz für eine professionelle medizinische Beratung. Wende dich immer zuerst an deine Ärztin oder deinen Arzt.",
  },
};

const pageTranslations = {
  privacy: {
    en: {
      title: "Privacy, without the fine-print fog.",
      emojiLabel: "Play with the lock sticker",
      intro: "Akari is built to help you understand your health without turning it into someone else’s business.",
      updated: "Effective October 16, 2026",
      shortTitle: "The short version",
      shortAccount: "Akari does not require an Akari account.",
      shortDevice: "Your health information is processed on your iPhone and is not used for advertising. Meals you log are the one exception, explained below.",
      shortSale: "Akari does not sell your personal or health information.",
      shortChoice: "You choose which health sources and permissions to connect, and you can disconnect them at any time.",
      shortReports: "If you choose to send a food report from the app, it reaches our server so we can correct the match. It carries no account and no Apple Health data.",
      shortPhotos: "A meal you type, say or photograph is sent to our server and read by an AI service to work out what you ate. We do not store it.",
      shortWebsite: "This website counts visits without cookies and without storing your IP address.",
      reportsTitle: "Food reports",
      reportsSent: "When a food match looks wrong, or right, you can send us a food report from the app. Nothing is sent unless you tap Send. Reports are the part of Akari that leaves your iPhone on purpose: they reach our server so we can improve how Akari recognises food.",
      reportsContent: "A report contains your rating and the reasons you picked, your comment if you write one, what you typed or said, the foods Akari matched with their amounts and nutrients, anything it could not match, a scanned barcode if there was one, and the app’s language, region and version. It does not include your name, an account, your Apple Health data or your location, unless you write something like that into your comment.",
      reportsKeep: "To prevent abuse, the app attaches a random identifier that exists only for food reports; our server keeps just a one-way hash of it and uses it to limit how many reports one installation can send in a day. Our server stores no IP address. Reports are stored with our hosting provider, Cloudflare, and are read only by the Akari team in our review tool. We keep them as long as they help us improve food recognition. To have a report removed, email <a href=\"mailto:contact@hejrafa.com\">contact@hejrafa.com</a> with the date and what you reported.",
      photosTitle: "Meals and meal photos",
      photosSent: "You can log a meal by typing or saying it, or by taking or choosing a photo of it. Nothing is sent unless you log a meal. Packages and nutrition labels are still read on your iPhone; only a meal you type, say or photograph leaves it, so Akari can work out what you ate.",
      photosContent: "What is sent is the words you typed or said, the photo if there is one, the foods from Akari’s catalogue the app found as possible matches, the app’s language and version, a few food words the iPhone’s own image recognition found in the photo, and a random identifier. It contains no Apple Health data, no account and no location. A photo shows whatever is in the frame, so keep people and documents out of it.",
      photosWhere: "Your meal goes to Akari’s server, which runs on Cloudflare. The server passes it to Anthropic’s Claude API, which reads it and returns what is in the meal to the app.",
      photosKeep: "Akari keeps nothing of what you send or of the answer. To limit how many meals can be sent in a day, our server keeps daily counters under a one-way hash of the random identifier and of your IP address, made with a random value that is deleted when the day ends. The IP address is not stored, the counters expire after two days, and nothing else from the request is kept.",
      photosAnthropic: "Anthropic handles your meal under its <a href=\"https://www.anthropic.com/legal/commercial-terms\" rel=\"noreferrer\">Commercial Terms</a>, which do not allow it to train models on it. By default, Anthropic deletes what you sent and its answer within 30 days. It keeps them longer, for up to two years, only if its safety systems flag a request as breaking its usage policy, or where the law requires it. <a href=\"https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data\" rel=\"noreferrer\">Anthropic’s privacy pages</a> explain this in detail.",
      websiteTitle: "Visiting this website",
      websiteBody: "When you open a page on joinakari.com, your browser tells our server which page it was and the site or campaign that sent you there, if there was one. Our hosting provider, Cloudflare, adds the country your connection comes from. We use this only to count visits.",
      websiteCount: "To tell visitors apart without cookies, our server combines your IP address and browser details with a random value that changes every day, and keeps only a short one-way hash of the result. The IP address is not stored, each day’s random value is deleted once the day is over, and the hash cannot be traced back to you or linked across days. Counting visits stores nothing on your device, and nothing is shared with advertisers or analytics companies.",
      accessTitle: "Information Akari accesses",
      accessApple: "<strong>Apple Health.</strong> With your permission, Akari reads the health, activity, sleep, nutrition, and body-measurement categories you select. When you log supported information in Akari, the app may write it to Apple Health only after you grant the corresponding permission.",
      accessGoogle: "<strong>Google Health.</strong> If you connect Google Health, Akari requests read-only access to activity and fitness, health metrics and measurements, and sleep. This can include data from Fitbit, Pixel Watch, and other sources available through Google Health. Akari does not request permission to change or delete your Google Health data.",
      accessEntered: "<strong>Information you enter.</strong> This includes food and water logs, goals, preferences, and other entries you choose to add.",
      accessLocation: "<strong>Location.</strong> If you allow location access, Akari uses your approximate location while the app is open to provide relevant weather context. Akari does not use location for advertising.",
      googleTitle: "Google user data",
      googleAccessed: "<strong>Data accessed.</strong> Akari reads Google user data only if you connect Google Health, and only with read access to three categories: activity and fitness, health metrics and measurements, and sleep. Akari never requests permission to write, change, or delete anything in your Google Account.",
      googleUse: "<strong>How it is used.</strong> Google user data is shown to you in Akari and used on your iPhone to fill gaps Apple Health leaves and to calculate your readiness and Health Age. It is not used for any other purpose.",
      googleSharing: "<strong>Sharing.</strong> Google user data is not transferred to anyone: not to Akari’s operators, not to service providers, not to advertisers, and not to any AI or analytics service. It leaves your iPhone only if you yourself share something from the app.",
      googleProtection: "<strong>Protection.</strong> Google user data is kept in the app’s own storage on your iPhone, protected by the iPhone’s encryption. The sign-in credential is kept in the iOS Keychain. Akari has no server that stores health data.",
      googleRetention: "<strong>Retention and deletion.</strong> Google user data stays on your iPhone while Google Health is connected. Disconnecting Google Health in Akari removes the Google data from the app and revokes Akari’s access at Google; deleting the app removes everything. You can also revoke Akari’s access at any time at <a href=\"https://myaccount.google.com/permissions\" rel=\"noreferrer\">myaccount.google.com/permissions</a>.",
      googleLimitedUse: "Data received from Google APIs is used and transferred in accordance with the <a href=\"https://developers.google.com/terms/api-services-user-data-policy\" rel=\"noreferrer\">Google API Services User Data Policy</a>, including its Limited Use requirements.",
      useTitle: "How the information is used",
      useBody: "Akari uses the information you authorize to display your daily health view, calculate trends and goals, create explanations, and help you connect activity, recovery, sleep, nutrition, and body measurements. Apple Health remains the primary source. Google Health is used to fill matching gaps and avoid double counting where possible.",
      storageTitle: "Storage and sharing",
      storageBody: "Akari stores its health views and app data locally on your device. Google authorization credentials are kept in protected device storage. Akari does not operate an advertising profile or sell health information.",
      sharingBody: "Information may be disclosed if required by law or to protect users or the service from fraud or abuse. Akari uses two service providers. Cloudflare hosts this website, receives the food reports you choose to send, and runs the server that passes on the meals you log. Anthropic reads those meals. Neither receives Apple Health data or Google user data, and both may use what they receive only to provide their service to Akari, never for advertising.",
      choicesTitle: "Your choices and deletion",
      choicesBody: "You can change Apple Health permissions in iOS Settings or the Health app. Disconnecting Google Health in Akari removes the Google data from the app and revokes Akari’s access at Google. You can also revoke Akari’s access from your Google Account permissions.",
      deletionBody: "You can remove Akari’s locally stored information by deleting entries in the app where available or by deleting the app. Information already written to Apple Health remains under your control in Apple Health. To request help with access or deletion, email <a href=\"mailto:contact@hejrafa.com\">contact@hejrafa.com</a>.",
      securityTitle: "Security, children, and changes",
      securityBody: "Akari uses platform security features and limits access to the information needed for its user-facing health features. No system is perfectly secure, but we work to protect data and minimize what leaves your device.",
      childrenBody: "Akari is not directed to children under 13, or a higher minimum age where local law requires it. We may update this policy when Akari changes. The effective date above will be updated, and significant changes will be communicated in the app or on this site.",
      contactTitle: "Contact",
      contactBody: "Questions about privacy or Google Health access can be sent to <a href=\"mailto:contact@hejrafa.com\">contact@hejrafa.com</a>.",
    },
    de: {
      title: "Datenschutz, klar und verständlich.",
      emojiLabel: "Mit dem Schloss-Sticker spielen",
      intro: "Akari hilft dir, deine Gesundheit zu verstehen, ohne sie zum Geschäft anderer zu machen.",
      updated: "Gültig ab 16. Oktober 2026",
      shortTitle: "Kurz gesagt",
      shortAccount: "Für Akari brauchst du kein Akari-Konto.",
      shortDevice: "Deine Gesundheitsdaten werden auf deinem iPhone verarbeitet und nicht für Werbung verwendet. Einzige Ausnahme sind die Mahlzeiten, die du einträgst, mehr dazu unten.",
      shortSale: "Akari verkauft weder personenbezogene Daten noch Gesundheitsdaten.",
      shortChoice: "Du entscheidest, welche Gesundheitsquellen und Berechtigungen du verbindest, und kannst sie jederzeit wieder trennen.",
      shortReports: "Wenn du in der App eine Essensmeldung abschickst, landet sie auf unserem Server, damit wir den Treffer korrigieren können. Sie enthält kein Konto und keine Apple-Health-Daten.",
      shortPhotos: "Eine Mahlzeit, die du tippst, sagst oder fotografierst, wird an unseren Server geschickt und von einem KI-Dienst gelesen, der herausfindet, was du gegessen hast. Wir speichern sie nicht.",
      shortWebsite: "Diese Website zählt Besuche ohne Cookies und ohne deine IP-Adresse zu speichern.",
      reportsTitle: "Essensmeldungen",
      reportsSent: "Wenn ein erkanntes Lebensmittel falsch oder richtig wirkt, kannst du uns aus der App eine Essensmeldung schicken. Gesendet wird nur, wenn du auf Senden tippst. Meldungen sind der Teil von Akari, der dein iPhone bewusst verlässt: Sie landen auf unserem Server, damit wir verbessern können, wie Akari Lebensmittel erkennt.",
      reportsContent: "Eine Meldung enthält deine Bewertung und die gewählten Gründe, deinen Kommentar, falls du einen schreibst, was du getippt oder gesagt hast, die erkannten Lebensmittel mit Mengen und Nährwerten, alles, was nicht erkannt wurde, einen gescannten Barcode, falls vorhanden, sowie Sprache, Region und Version der App. Sie enthält weder deinen Namen noch ein Konto, deine Apple-Health-Daten oder deinen Standort, es sei denn, du schreibst so etwas in deinen Kommentar.",
      reportsKeep: "Zum Schutz vor Missbrauch hängt die App eine zufällige Kennung an, die es nur für Essensmeldungen gibt; unser Server speichert davon nur einen Einweg-Hash und begrenzt damit, wie viele Meldungen eine Installation pro Tag senden kann. Unser Server speichert keine IP-Adresse. Meldungen liegen bei unserem Hosting-Anbieter Cloudflare und werden nur vom Akari-Team in unserem Prüfwerkzeug gelesen. Wir bewahren sie auf, solange sie uns helfen, die Lebensmittelerkennung zu verbessern. Wenn eine Meldung gelöscht werden soll, schreib an <a href=\"mailto:contact@hejrafa.com\">contact@hejrafa.com</a> mit dem Datum und dem, was du gemeldet hast.",
      photosTitle: "Mahlzeiten und Fotos von Mahlzeiten",
      photosSent: "Du kannst eine Mahlzeit eintragen, indem du sie tippst oder sagst, sie fotografierst oder ein Foto auswählst. Gesendet wird nur, wenn du eine Mahlzeit einträgst. Verpackungen und Nährwerttabellen liest Akari weiterhin auf deinem iPhone; nur eine Mahlzeit, die du tippst, sagst oder fotografierst, verlässt es, damit Akari herausfinden kann, was du gegessen hast.",
      photosContent: "Gesendet werden die Wörter, die du getippt oder gesagt hast, das Foto, falls es eines gibt, die Lebensmittel aus Akaris Katalog, die die App als mögliche Treffer gefunden hat, Sprache und Version der App, ein paar Wörter zu Lebensmitteln, die die Bilderkennung deines iPhone auf dem Foto gefunden hat, und eine zufällige Kennung. Nichts davon enthält Apple-Health-Daten, ein Konto oder deinen Standort. Ein Foto zeigt alles, was im Bild ist, also halte Menschen und Dokumente heraus.",
      photosWhere: "Deine Mahlzeit geht an Akaris Server, der bei Cloudflare läuft. Der Server gibt sie an die Claude API von Anthropic weiter, die sie liest und der App zurückschickt, was in der Mahlzeit steckt.",
      photosKeep: "Akari behält nichts von dem, was du sendest, und nichts von der Antwort. Damit pro Tag nur begrenzt viele Mahlzeiten gesendet werden können, führt unser Server tägliche Zähler unter einem Einweg-Hash der zufälligen Kennung und deiner IP-Adresse, gebildet mit einem Zufallswert, der am Ende des Tages gelöscht wird. Die IP-Adresse wird nicht gespeichert, die Zähler laufen nach zwei Tagen ab, und sonst wird von der Anfrage nichts behalten.",
      photosAnthropic: "Anthropic verarbeitet deine Mahlzeit nach seinen <a href=\"https://www.anthropic.com/legal/commercial-terms\" rel=\"noreferrer\">gewerblichen Nutzungsbedingungen</a> (Commercial Terms), die es Anthropic nicht erlauben, damit Modelle zu trainieren. Standardmäßig löscht Anthropic das Gesendete und die Antwort innerhalb von 30 Tagen. Länger, bis zu zwei Jahre, bewahrt Anthropic sie nur auf, wenn seine Sicherheitssysteme eine Anfrage als Verstoß gegen seine Nutzungsrichtlinien markieren, oder wenn das Gesetz es verlangt. Einzelheiten stehen auf den <a href=\"https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data\" rel=\"noreferrer\">Datenschutzseiten von Anthropic</a> (auf Englisch).",
      websiteTitle: "Besuche auf dieser Website",
      websiteBody: "Wenn du eine Seite auf joinakari.com öffnest, teilt dein Browser unserem Server mit, welche Seite es war und über welche Website oder Kampagne du gekommen bist, falls es eine gab. Unser Hosting-Anbieter Cloudflare ergänzt das Land, aus dem deine Verbindung kommt. Wir nutzen das ausschließlich, um Besuche zu zählen.",
      websiteCount: "Um Besucher ohne Cookies auseinanderzuhalten, verknüpft unser Server deine IP-Adresse und Browserangaben mit einem Zufallswert, der sich täglich ändert, und behält davon nur einen kurzen Einweg-Hash. Die IP-Adresse wird nicht gespeichert, der Zufallswert eines Tages wird gelöscht, sobald der Tag vorbei ist, und der Hash lässt sich weder auf dich zurückführen noch über Tage hinweg verknüpfen. Für das Zählen wird nichts auf deinem Gerät gespeichert, und nichts wird an Werbe- oder Analysefirmen weitergegeben.",
      accessTitle: "Auf welche Informationen Akari zugreift",
      accessApple: "<strong>Apple Health.</strong> Mit deiner Erlaubnis liest Akari die von dir ausgewählten Kategorien für Gesundheit, Aktivität, Schlaf, Ernährung und Körpermessungen. Wenn du unterstützte Informationen in Akari einträgst, kann die App sie erst dann in Apple Health speichern, wenn du die entsprechende Berechtigung erteilt hast.",
      accessGoogle: "<strong>Google Health.</strong> Wenn du Google Health verbindest, fordert Akari ausschließlich Lesezugriff auf Aktivität und Fitness, Gesundheitswerte und Messungen sowie Schlaf an. Dazu können Daten von Fitbit, Pixel Watch und anderen über Google Health verfügbaren Quellen gehören. Akari fordert keine Berechtigung an, deine Google-Health-Daten zu ändern oder zu löschen.",
      accessEntered: "<strong>Von dir eingegebene Informationen.</strong> Dazu gehören Ernährungs- und Wassereinträge, Ziele, Einstellungen und weitere Angaben, die du selbst hinzufügst.",
      accessLocation: "<strong>Standort.</strong> Wenn du den Standortzugriff erlaubst, nutzt Akari deinen ungefähren Standort, während die App geöffnet ist, um passende Wetterinformationen anzuzeigen. Akari verwendet deinen Standort nicht für Werbung.",
      googleTitle: "Google-Nutzerdaten",
      googleAccessed: "<strong>Abgerufene Daten.</strong> Akari liest Google-Nutzerdaten nur, wenn du Google Health verbindest, und nur mit Lesezugriff auf drei Kategorien: Aktivität und Fitness, Gesundheitswerte und Messungen sowie Schlaf. Akari fordert nie die Berechtigung an, in deinem Google-Konto etwas zu schreiben, zu ändern oder zu löschen.",
      googleUse: "<strong>Wie sie verwendet werden.</strong> Google-Nutzerdaten werden dir in Akari angezeigt und auf deinem iPhone genutzt, um Lücken zu schließen, die Apple Health lässt, und um deine Tagesform und dein Gesundheitsalter zu berechnen. Für andere Zwecke werden sie nicht verwendet.",
      googleSharing: "<strong>Weitergabe.</strong> Google-Nutzerdaten werden an niemanden übertragen: nicht an die Betreiber von Akari, nicht an Dienstleister, nicht an Werbetreibende und an keinen KI- oder Analysedienst. Sie verlassen dein iPhone nur, wenn du selbst etwas aus der App teilst.",
      googleProtection: "<strong>Schutz.</strong> Google-Nutzerdaten liegen im eigenen Speicher der App auf deinem iPhone und sind durch die Verschlüsselung des iPhone geschützt. Die Anmeldedaten liegen im iOS-Schlüsselbund. Akari hat keinen Server, der Gesundheitsdaten speichert.",
      googleRetention: "<strong>Aufbewahrung und Löschung.</strong> Google-Nutzerdaten bleiben auf deinem iPhone, solange Google Health verbunden ist. Wenn du Google Health in Akari trennst, werden die Google-Daten aus der App entfernt und Akaris Zugriff bei Google widerrufen; wenn du die App löschst, wird alles entfernt. Du kannst Akaris Zugriff außerdem jederzeit unter <a href=\"https://myaccount.google.com/permissions\" rel=\"noreferrer\">myaccount.google.com/permissions</a> widerrufen.",
      googleLimitedUse: "Von Google APIs erhaltene Daten werden gemäß der <a href=\"https://developers.google.com/terms/api-services-user-data-policy\" rel=\"noreferrer\">Google API Services User Data Policy</a> einschließlich der Anforderungen zur eingeschränkten Nutzung verwendet und übertragen.",
      useTitle: "Wie die Informationen verwendet werden",
      useBody: "Akari verwendet die von dir freigegebenen Informationen, um deine tägliche Gesundheitsansicht darzustellen, Trends und Ziele zu berechnen, Erklärungen zu erstellen und Zusammenhänge zwischen Aktivität, Erholung, Schlaf, Ernährung und Körpermessungen sichtbar zu machen. Apple Health bleibt die primäre Quelle. Google Health wird genutzt, um passende Lücken zu schließen und doppelte Einträge nach Möglichkeit zu vermeiden.",
      storageTitle: "Speicherung und Weitergabe",
      storageBody: "Akari speichert Gesundheitsansichten und App-Daten lokal auf deinem Gerät. Google-Anmeldedaten werden im geschützten Gerätespeicher abgelegt. Akari erstellt kein Werbeprofil und verkauft keine Gesundheitsdaten.",
      sharingBody: "Informationen können offengelegt werden, wenn dies gesetzlich vorgeschrieben ist oder um Nutzerinnen und Nutzer oder den Dienst vor Betrug oder Missbrauch zu schützen. Akari nutzt zwei Dienstleister. Cloudflare betreibt diese Website, erhält die Essensmeldungen, die du abschickst, und betreibt den Server, der die Mahlzeiten weitergibt, die du einträgst. Anthropic liest diese Mahlzeiten. Keiner von beiden erhält Apple-Health-Daten oder Google-Nutzerdaten, und beide dürfen das, was sie erhalten, nur nutzen, um ihren Dienst für Akari zu erbringen, nie für Werbung.",
      choicesTitle: "Deine Wahlmöglichkeiten und Löschung",
      choicesBody: "Du kannst Apple-Health-Berechtigungen in den iOS-Einstellungen oder in der Health-App ändern. Wenn du Google Health in Akari trennst, werden die Google-Daten aus der App entfernt und Akaris Zugriff bei Google widerrufen. Du kannst Akaris Zugriff auch in den Berechtigungen deines Google-Kontos widerrufen.",
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
      emojiLabel: "Play with the handshake sticker",
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
      emojiLabel: "Mit dem Handschlag-Sticker spielen",
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
  brand: {
    en: {
      title: "Akari, ready to share.",
      emojiLabel: "Play with the app icon",
      intro: "Logos, the mark, app icons and colours, for anyone writing or talking about Akari.",
      downloadAll: "Download everything",
      downloadAllNote: "ZIP with SVG and PNG",
      aboutTitle: "A word about Akari",
      aboutPromise: "Akari turns private health data into a calm, human reading, then lets you get on with your day. It brings your sleep, movement and food together on your iPhone and explains in plain words what they mean, measured against your own usual days rather than anyone else’s.",
      aboutMirror: "Akari is a mirror and a translator, not a scoreboard. Health should feel understandable without feeling clinical, competitive or urgent, and it stays private: there is no account, and health data stays on the iPhone.",
      aboutUs: "Akari is made by just the two of us, in Germany.",
      nameTitle: "The name",
      nameBody: "Akari is one word with a capital A: Akari, never AKARI or akari. Where it helps, say “the Akari app” or “Akari for iPhone”.",
      logoTitle: "Logo",
      logoBody: "The mark from the app icon above the wordmark. Each of Akari’s five themes has its own colours and its own touches: bolts, leaves, bubbles or drops, and none for Plain. Take the version made for the background it sits on.",
      onDark: "On dark",
      onLight: "On light",
      markTitle: "The mark",
      markBody: "The mark alone, as the app icon draws it, for small spaces and square crops.",
      markName: "mark",
      iconTitle: "App icon",
      iconBody: "The icon as it sits on the Home Screen, on white in light mode and on black in dark mode. Please use it as it is, without changing its colours or corners.",
      iconLight: "Light",
      iconDark: "Dark",
      iconName: "app icon",
      coloursTitle: "Colours",
      coloursBody: "Four themes are named after the landscape painted for them, and Plain has no painting. Each mark runs from its light colour to its dark one, the deep colour is the theme’s band, and the cream sets the wordmark on it. Tap a colour to copy it.",
      colourLight: "Light",
      colourDark: "Dark",
      colourDeep: "Deep",
      colourCream: "Cream",
      copyColour: "Copy",
      copied: "Copied",
      typeTitle: "Type",
      typeBody: "Akari speaks in New York, Apple’s serif, in the app and on this site: its heaviest weight for headlines and the wordmark, the regular one for reading.",
      typeSample: "Your whole day in one place",
      usageTitle: "Using the logo",
      usageRoom: "Give it room. Big or small, it should never feel cramped.",
      usageAsIs: "Keep it as it is: no new colours, outlines or shadows, and no stretching.",
      usageGround: "Put the version made for dark backgrounds on dark ones, and the one for light backgrounds on light ones.",
      usageEndorse: "Please don’t use it in a way that suggests Akari endorses you or works with you.",
      pressTitle: "Press",
      pressBody: "Writing about Akari, or missing something here? Write to <a href=\"mailto:contact@hejrafa.com\">contact@hejrafa.com</a> and we’ll get back to you.",
    },
    de: {
      title: "Akari zum Mitnehmen.",
      emojiLabel: "Mit dem App-Icon spielen",
      intro: "Logos, Bildmarke, App-Icons und Farben für alle, die über Akari schreiben oder sprechen.",
      downloadAll: "Alles herunterladen",
      downloadAllNote: "ZIP mit SVG und PNG",
      aboutTitle: "Ein paar Worte zu Akari",
      aboutPromise: "Akari macht aus privaten Gesundheitsdaten eine ruhige, menschliche Einordnung und lässt dich dann deinen Tag leben. Die App bringt Schlaf, Bewegung und Essen auf deinem iPhone zusammen und erklärt in einfachen Worten, was sie bedeuten, gemessen an deinen eigenen gewohnten Tagen statt an denen anderer.",
      aboutMirror: "Akari ist Spiegel und Übersetzer, keine Anzeigetafel. Gesundheit soll verständlich sein, ohne sich nach Klinik, Wettkampf oder Eile anzufühlen, und sie bleibt privat: Es gibt kein Konto, und Gesundheitsdaten bleiben auf dem iPhone.",
      aboutUs: "Akari machen nur wir zwei, in Deutschland.",
      nameTitle: "Der Name",
      nameBody: "Akari ist ein Wort mit großem A: Akari, nie AKARI oder akari. Wo es hilft, schreib „die App Akari“ oder „Akari für das iPhone“.",
      logoTitle: "Logo",
      logoBody: "Die Bildmarke aus dem App-Icon über dem Schriftzug. Jedes der fünf Themen von Akari hat eigene Farben und eigene Details: Blitze, Blätter, Blasen oder Tropfen, und keine bei „Schlicht“. Nimm die Version, die für den Hintergrund gemacht ist.",
      onDark: "Auf dunkel",
      onLight: "Auf hell",
      markTitle: "Die Bildmarke",
      markBody: "Die Bildmarke allein, so wie das App-Icon sie zeigt, für kleine Flächen und quadratische Ausschnitte.",
      markName: "Bildmarke",
      iconTitle: "App-Icon",
      iconBody: "Das Icon, wie es auf dem Home-Bildschirm liegt: auf Weiß im hellen und auf Schwarz im dunklen Modus. Bitte verwende es unverändert, ohne Farben oder Ecken anzupassen.",
      iconLight: "Hell",
      iconDark: "Dunkel",
      iconName: "App-Icon",
      coloursTitle: "Farben",
      coloursBody: "Vier Themen tragen den Namen der Landschaft, die für sie gemalt wurde; „Schlicht“ hat kein Gemälde. Jede Bildmarke verläuft von ihrer hellen zu ihrer dunklen Farbe, die tiefe Farbe ist das Band des Themas, und in Creme steht der Schriftzug darauf. Tippe auf eine Farbe, um sie zu kopieren.",
      colourLight: "Hell",
      colourDark: "Dunkel",
      colourDeep: "Tief",
      colourCream: "Creme",
      copyColour: "Kopieren",
      copied: "Kopiert",
      typeTitle: "Schrift",
      typeBody: "Akari spricht in New York, der Serifenschrift von Apple, in der App wie auf dieser Website: im kräftigsten Schnitt für Überschriften und den Schriftzug, im normalen zum Lesen.",
      typeSample: "Dein ganzer Tag an einem Ort",
      usageTitle: "Das Logo verwenden",
      usageRoom: "Gib ihm Raum. Groß oder klein, es soll nie eingeengt wirken.",
      usageAsIs: "Lass es, wie es ist: keine neuen Farben, Konturen oder Schatten und kein Verzerren.",
      usageGround: "Setz die Version für dunklen Grund auf dunkle Flächen und die für hellen Grund auf helle.",
      usageEndorse: "Bitte verwende es nicht so, dass es nach einer Empfehlung oder Zusammenarbeit durch Akari aussieht.",
      pressTitle: "Presse",
      pressBody: "Du schreibst über Akari oder vermisst hier etwas? Schreib an <a href=\"mailto:contact@hejrafa.com\">contact@hejrafa.com</a>, und wir melden uns.",
    },
  },
};

const pageMetadata = {
  privacy: {
    en: { title: "Akari: Privacy Policy", description: "Akari privacy policy: how Akari handles Apple Health data, food reports and the meals you log." },
    de: { title: "Akari: Datenschutzerklärung", description: "Akaris Datenschutzerklärung: wie Akari mit Apple-Health-Daten, Essensmeldungen und den Mahlzeiten umgeht, die du einträgst." },
  },
  terms: {
    en: { title: "Akari: Terms of Use", description: "Terms of use for the Akari iPhone health app." },
    de: { title: "Akari: Nutzungsbedingungen", description: "Nutzungsbedingungen für die Akari Gesundheits-App auf dem iPhone." },
  },
  brand: {
    en: { title: "Akari: Brand", description: "Akari’s logos, mark, app icons and colours to download, and a word about the brand." },
    de: { title: "Akari: Marke", description: "Logos, Bildmarke, App-Icons und Farben von Akari zum Herunterladen, und ein paar Worte zur Marke." },
  },
};

const pageColors = {
  dark: { meadow: "#1a1812", forest: "#161a12", coast: "#12171a", canyon: "#1a1412", plain: "#000000" },
  light: { meadow: "#f1eaca", forest: "#e1f1ca", coast: "#cae2f1", canyon: "#f1d7ca", plain: "#f5f5f5" },
};

// The header and footer sit on each theme's deep band in both schemes, so the browser chrome takes
// the band colour and the logos use the variant drawn for a dark ground.
const bandColors = { meadow: "#0a4252", forest: "#0c271c", coast: "#083756", canyon: "#482219", plain: "#141414" };

// The brand page's downloads, written by tools/export_logos.py into assets/brand/ under the themes' names.
// Each mark runs from `light` to `dark`, the stops of the app icon's gradient; `cream` is the wordmark on
// the deep band, `paper` and `ink` the theme's light page and text, which the light tiles show.
const brandThemes = [
  { theme: "meadow", file: "wasserkuppe", label: "themeMeadowLabel", light: "#FFE680", dark: "#C98A0B", cream: "#F1EAC6", paper: "#f1eaca", ink: "#262211" },
  { theme: "forest", file: "shiratani", label: "themeForestLabel", light: "#C9EE5E", dark: "#2E8B3A", cream: "#E6F4D1", paper: "#e1f1ca", ink: "#1e2611" },
  { theme: "coast", file: "loch-tay", label: "themeCoastLabel", light: "#6FE6FF", dark: "#0A5FD6", cream: "#D7EDF8", paper: "#cae2f1", ink: "#111e26" },
  { theme: "canyon", file: "green-river-overlook", label: "themeCanyonLabel", light: "#FFC24A", dark: "#D9361A", cream: "#F4DDD1", paper: "#f1d7ca", ink: "#261811" },
  { theme: "plain", file: "plain", label: "themePlainLabel", light: "#FFD600", dark: "#FF6B00", cream: "#FFFFFF", paper: "#f5f5f5", ink: "#000000" },
];

// A download's accessible name says which theme and variant it is. labelBrandKit writes it from these
// keys, so it follows the language like the visible labels.
function brandFile(path, format, nameKey, variantKey) {
  const formatKey = /^(SVG|PNG)$/.test(format) ? "" : format;
  return `<a class="brand-file" href="/assets/brand/${path}" download data-name-key="${nameKey}" data-variant-key="${variantKey}" data-format="${formatKey ? "PNG" : format}"${formatKey ? ` data-format-key="${formatKey}"` : ""}>${formatKey ? `<span data-i18n="${formatKey}"></span>` : format}</a>`;
}

function brandSwatch(colour, labelKey) {
  return `<button class="brand-swatch" type="button" data-colour="${colour}" data-label-key="${labelKey}" style="--swatch: ${colour}">
    <span class="brand-swatch__chip" aria-hidden="true"></span>
    <span class="brand-swatch__label" data-i18n="${labelKey}"></span>
    <span class="brand-swatch__value">${colour}</span>
  </button>`;
}

// The tiles show each theme in its own colours, whatever the page's theme. They are written once, with
// their words as data-i18n keys, so a language switch changes only the words and no image reloads. The
// files keep their English names.
function renderBrandKit() {
  const logos = document.querySelector("[data-brand-logos]");
  if (!logos || logos.childElementCount) return;
  const tiles = { logos: [], marks: [], icons: [], colours: [] };
  brandThemes.forEach((item) => {
    const name = `<span data-i18n="${item.label}"></span>`;
    const deep = bandColors[item.theme];
    [["dark", "onDark", deep, item.cream], ["light", "onLight", item.paper, item.ink]].forEach(([mode, ground, tile, ink]) => {
      const file = `akari-logo-${item.file}-on-${mode}`;
      tiles.logos.push(`<figure class="brand-tile" style="--tile: ${tile}; --tile-ink: ${ink}">
        <img class="brand-tile__logo" src="/assets/brand/${file}.svg" alt="Akari" width="89" height="50" loading="lazy" />
        <figcaption><span class="brand-tile__name">${name} <span class="brand-tile__variant" data-i18n="${ground}"></span></span><span class="brand-files">${brandFile(`${file}.svg`, "SVG", item.label, ground)}${brandFile(`${file}.png`, "PNG", item.label, ground)}</span></figcaption>
      </figure>`);
    });
    tiles.marks.push(`<figure class="brand-tile brand-tile--mark" style="--tile: ${deep}; --tile-ink: ${item.cream}">
      <img class="brand-tile__mark" src="/assets/brand/akari-mark-${item.file}.svg" alt="" loading="lazy" />
      <figcaption><span class="brand-tile__name">${name}</span><span class="brand-files">${brandFile(`akari-mark-${item.file}.svg`, "SVG", item.label, "markName")}${brandFile(`akari-mark-${item.file}.png`, "PNG", item.label, "markName")}</span></figcaption>
    </figure>`);
    // The tile shows the landing page's small renditions; the buttons fetch the 1024 px PNGs.
    const preview = (mode) => `/assets/welcome/${item.theme}/app-icon-${mode}`;
    tiles.icons.push(`<figure class="brand-tile brand-tile--icon">
      <span class="brand-tile__icons">
        <img src="${preview("light")}@2x.webp" srcset="${preview("light")}@2x.webp 2x, ${preview("light")}@3x.webp 3x" alt="" width="104" height="104" loading="lazy" />
        <img src="${preview("dark")}@2x.webp" srcset="${preview("dark")}@2x.webp 2x, ${preview("dark")}@3x.webp 3x" alt="" width="104" height="104" loading="lazy" />
      </span>
      <figcaption><span class="brand-tile__name">${name}</span><span class="brand-files">${brandFile(`akari-app-icon-${item.file}-light.png`, "iconLight", item.label, "iconName")}${brandFile(`akari-app-icon-${item.file}-dark.png`, "iconDark", item.label, "iconName")}</span></figcaption>
    </figure>`);
    tiles.colours.push(`<div class="brand-colours" style="--from: ${item.light}; --to: ${item.dark}">
      <span class="brand-tile__name">${name}</span>
      <span class="brand-colours__gradient" aria-hidden="true"></span>
      <div class="brand-colours__swatches">
        ${brandSwatch(item.light, "colourLight")}${brandSwatch(item.dark, "colourDark")}${brandSwatch(deep.toUpperCase(), "colourDeep")}${brandSwatch(item.cream, "colourCream")}
      </div>
    </div>`);
  });
  logos.innerHTML = tiles.logos.join("");
  document.querySelector("[data-brand-marks]").innerHTML = tiles.marks.join("");
  document.querySelector("[data-brand-icons]").innerHTML = tiles.icons.join("");
  document.querySelector("[data-brand-colours]").innerHTML = tiles.colours.join("");
}

function labelBrandKit(copy) {
  document.querySelectorAll(".brand-file").forEach((link) => {
    const format = link.dataset.formatKey ? `${copy[link.dataset.formatKey]} ${link.dataset.format}` : link.dataset.format;
    link.setAttribute("aria-label", `${copy[link.dataset.nameKey]}, ${copy[link.dataset.variantKey]}: ${format}`);
  });
  document.querySelectorAll(".brand-swatch").forEach((swatch) => {
    swatch.setAttribute("aria-label", `${copy.copyColour} ${copy[swatch.dataset.labelKey]} ${swatch.dataset.colour}`);
    if (swatch.classList.contains("is-copied")) swatch.querySelector(".brand-swatch__value").textContent = copy.copied;
  });
}

document.addEventListener("click", async (event) => {
  const swatch = event.target.closest(".brand-swatch");
  if (!swatch) return;
  try {
    await navigator.clipboard.writeText(swatch.dataset.colour);
  } catch (error) {
    // Older browsers and some embedded ones refuse the async clipboard; copy through a selection instead.
    const field = Object.assign(document.createElement("textarea"), { value: swatch.dataset.colour });
    field.setAttribute("readonly", "");
    field.style.cssText = "position: fixed; opacity: 0;";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    swatch.focus();
    if (!copied) return;
  }
  const value = swatch.querySelector(".brand-swatch__value");
  const copy = pageTranslations.brand[root.dataset.language] ?? pageTranslations.brand.en;
  value.textContent = copy.copied;
  swatch.classList.add("is-copied");
  clearTimeout(swatch.copiedTimer);
  swatch.copiedTimer = setTimeout(() => {
    value.textContent = swatch.dataset.colour;
    swatch.classList.remove("is-copied");
  }, 1400);
});

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
  document.querySelectorAll('.footer-sitemap a[href^="/"], .footer-logo, .legal-brand, a[href^="/privacy/"], a[href^="/terms/"], a[href="/brand/"]').forEach((link) => {
    const url = new URL(link.getAttribute("href"), window.location.origin);
    if (language === "de") url.searchParams.set("lang", "de");
    else url.searchParams.delete("lang");
    link.href = `${url.pathname}${url.search}${url.hash}`;
  });
}

// The headline's sticker is baked per theme, since its die-cut edge takes the theme's cream, and at a ladder
// of widths (tools/bake_die_cuts.py); it takes the width nearest its box, as on the landing page (cutImageBase
// in script.js). The box follows the headline's size, so a resize can call for another width.
const stickerWidths = [56, 72, 92, 120, 160];

function updateStickers() {
  const images = [...document.querySelectorAll("img[data-sticker]")];
  const boxWidths = images.map((image) => image.parentElement.offsetWidth || 80);
  images.forEach((image, index) => {
    const width = stickerWidths.reduce((best, size) => (Math.abs(Math.log(boxWidths[index] / size)) < Math.abs(Math.log(boxWidths[index] / best)) ? size : best));
    image.parentElement.style.setProperty("--w", width);
    image.parentElement.style.setProperty("--h", width);
    const sticker = image.dataset.sticker.split("/");
    const name = sticker.pop();
    const base = `/assets/${sticker.join("/")}/${root.dataset.theme}/${name}-${width}`;
    if (image.getAttribute("src") === `${base}@2x.webp`) return;
    image.srcset = `${base}@2x.webp 2x, ${base}@3x.webp 3x`;
    image.src = `${base}@2x.webp`;
  });
  // The brand page's headline holds the theme's app icon, die-cut like the landing page's, in the
  // rendition that matches the page.
  document.querySelectorAll("img[data-theme-icon]").forEach((image) => {
    const base = `/assets/welcome/${root.dataset.theme}/app-icon-${root.dataset.mode === "dark" ? "dark" : "light"}-cut`;
    if (image.getAttribute("src") === `${base}@2x.webp`) return;
    image.srcset = `${base}@2x.webp 2x, ${base}@3x.webp 3x`;
    image.src = `${base}@2x.webp`;
  });
}

let lastViewportWidth = window.innerWidth;
window.addEventListener("resize", () => {
  if (window.innerWidth === lastViewportWidth) return;
  lastViewportWidth = window.innerWidth;
  updateStickers();
});

function updateAppearance() {
  const theme = pageColors.dark[root.dataset.theme] ? root.dataset.theme : "forest";
  const mode = pageColors[root.dataset.mode] ? root.dataset.mode : (systemModePreference.matches ? "dark" : "light");
  root.dataset.theme = theme;
  root.dataset.mode = mode;

  if (themeColor) themeColor.content = bandColors[theme];
  themeButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.themeTarget === theme)));
  // The mobile menu names the current theme next to its appearance label, from the dot's translated label.
  const themeName = document.querySelector('.theme-dot[aria-pressed="true"]')?.getAttribute("aria-label") ?? "";
  document.querySelectorAll(".mobile-theme-name").forEach((element) => { element.textContent = themeName; });
  modeButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.modeTarget === mode)));
  brandLogos.forEach((logo) => { logo.src = `/assets/logo/akari-logo-${theme}-dark.svg?v=3`; });
  updateStickers();
  if (adminLink) {
    const localPreview = ["127.0.0.1", "localhost"].includes(window.location.hostname);
    const adminURL = new URL(localPreview ? "http://127.0.0.1:8791/login" : "https://admin.joinakari.com/login");
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
  if (page === "brand") renderBrandKit();
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
  if (page === "brand") labelBrandKit(copy);

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

// A language switch crossfades only the words on screen, as on the landing page (script.js): each
// visible block of copy gets its own view-transition name and the page itself none, so the header,
// its sliding language pill and the images stay live. A switch made mid-fade waits for the fade.
let activeLanguageTransition;
let queuedLanguage;

function languageTransitionItems() {
  const contentGroups = document.querySelectorAll([
    ".legal-eyebrow",
    ".legal-header h1",
    ".legal-intro",
    ".legal-updated",
    ".brand-download > span",
    ".legal-section h2",
    ".legal-section > p",
    ".legal-section li",
    ".brand-tile figcaption",
    ".brand-colours > .brand-tile__name",
    ".brand-swatch__label",
    ".brand-type__line",
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
  if (!commonTranslations[language]) return;

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
  particle.append(emoji.querySelector(".cut").cloneNode(true));
  particle.style.left = `${bounds.left + bounds.width / 2}px`;
  particle.style.top = `${bounds.top + bounds.height / 2}px`;
  particle.style.setProperty("--particle-size", `${Math.round(bounds.width)}px`);
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
