const form = document.querySelector("#local-login-form");
const root = document.documentElement;
const languageButtons = [...document.querySelectorAll("[data-language-target]")];

const translations = {
  en: {
    languageGroupLabel: "Choose a language",
    languageEnglishLabel: "View in English",
    languageGermanLabel: "View in German",
    homeLabel: "Akari home",
    signInTitle: "Sign in",
    signInBody: "Use your Akari admin email to continue.",
    emailLabel: "Email address",
    continueButton: "Continue",
    pageTitle: "Akari: Sign in",
  },
  de: {
    languageGroupLabel: "Sprache wählen",
    languageEnglishLabel: "Seite auf Englisch anzeigen",
    languageGermanLabel: "Seite auf Deutsch anzeigen",
    homeLabel: "Akari Startseite",
    signInTitle: "Anmelden",
    signInBody: "Melde dich mit deiner Akari Admin-E-Mail-Adresse an.",
    emailLabel: "E-Mail-Adresse",
    continueButton: "Weiter",
    pageTitle: "Akari: Anmelden",
  },
};

function selectLanguage(language, persist = true) {
  const selected = language === "de" ? "de" : "en";
  root.dataset.language = selected;
  root.lang = selected;
  if (persist) {
    if (window.AkariAppearance) window.AkariAppearance.persist("akari-language", selected);
    else try { localStorage.setItem("akari-language", selected); } catch {}
  }
  for (const node of document.querySelectorAll("[data-i18n]")) node.textContent = translations[selected][node.dataset.i18n];
  for (const node of document.querySelectorAll("[data-i18n-aria-label]")) node.setAttribute("aria-label", translations[selected][node.dataset.i18nAriaLabel]);
  for (const button of languageButtons) button.setAttribute("aria-pressed", String(button.dataset.languageTarget === selected));
  document.title = translations[selected].pageTitle;
}

for (const button of languageButtons) {
  button.addEventListener("click", () => selectLanguage(button.dataset.languageTarget));
}

selectLanguage(root.dataset.language, false);

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  window.location.replace("/#dashboard");
});
