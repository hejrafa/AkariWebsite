const eventExportMode = new URLSearchParams(window.location.search).get("export");
if (eventExportMode === "phone4k" || eventExportMode === "base4k") {
  document.documentElement.dataset.eventExport = eventExportMode;
}

const eventPageMetadata = {
  en: {
    title: "Try Akari",
    description: "Meet Akari, a private iPhone health app that turns your health data into calm daily insights. Scan to join the free TestFlight beta.",
    socialDescription: "Akari turns your health data into a calm, readable daily story. Scan to join the free TestFlight beta.",
    locale: "en_US",
    alternateLocale: "de_DE",
    imageAlt: "Akari logo in an orange-to-yellow gradient on a black background",
    url: "https://joinakari.com/try/",
  },
  de: {
    title: "Akari testen",
    description: "Lerne Akari kennen: Die private Gesundheits-App fürs iPhone macht aus deinen Gesundheitsdaten verständliche Einblicke für jeden Tag. Jetzt die kostenlose TestFlight-Beta testen.",
    socialDescription: "Akari macht aus deinen Gesundheitsdaten eine klare Geschichte deines Tages. Jetzt die kostenlose TestFlight-Beta testen.",
    locale: "de_DE",
    alternateLocale: "en_US",
    imageAlt: "Akari-Logo mit orange-gelbem Verlauf auf schwarzem Hintergrund",
    url: "https://joinakari.com/try/?lang=de",
  },
};

function setEventMetaContent(selector, content) {
  const element = document.querySelector(selector);
  if (element) element.content = content;
}

function updateEventPageMetadata() {
  const language = document.documentElement.dataset.language === "de" ? "de" : "en";
  const metadata = eventPageMetadata[language];

  document.title = metadata.title;
  setEventMetaContent('meta[name="description"]', metadata.description);
  setEventMetaContent('meta[property="og:title"]', metadata.title);
  setEventMetaContent('meta[property="og:description"]', metadata.socialDescription);
  setEventMetaContent('meta[property="og:url"]', metadata.url);
  setEventMetaContent('meta[property="og:locale"]', metadata.locale);
  setEventMetaContent('meta[property="og:locale:alternate"]', metadata.alternateLocale);
  setEventMetaContent('meta[property="og:image:alt"]', metadata.imageAlt);
  setEventMetaContent('meta[name="twitter:title"]', metadata.title);
  setEventMetaContent('meta[name="twitter:description"]', metadata.socialDescription);
  setEventMetaContent('meta[name="twitter:image:alt"]', metadata.imageAlt);

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = metadata.url;
}

updateEventPageMetadata();
