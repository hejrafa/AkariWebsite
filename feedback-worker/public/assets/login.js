const form = document.querySelector("#local-login-form");
const errorMessage = document.querySelector("#login-error");
const root = document.documentElement;
const languageButtons = [...document.querySelectorAll("[data-language-target]")];

const translations = {
  en: {
    languageGroupLabel: "Choose a language",
    languageEnglishLabel: "View in English",
    languageGermanLabel: "View in German",
    homeLabel: "Akari home",
    signInTitle: "Sign in",
    emailLabel: "Email address",
    passwordLabel: "Password",
    continueButton: "Continue",
    invalidCredentials: "That email or password is not right.",
    signInFailed: "Sign in is unavailable right now. Please try again.",
    pageTitle: "Akari: Sign in",
  },
  de: {
    languageGroupLabel: "Sprache wählen",
    languageEnglishLabel: "Seite auf Englisch anzeigen",
    languageGermanLabel: "Seite auf Deutsch anzeigen",
    homeLabel: "Akari Startseite",
    signInTitle: "Anmelden",
    emailLabel: "E-Mail-Adresse",
    passwordLabel: "Passwort",
    continueButton: "Weiter",
    invalidCredentials: "E-Mail-Adresse oder Passwort stimmen nicht.",
    signInFailed: "Die Anmeldung ist gerade nicht verfügbar. Versuch es bitte erneut.",
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

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button[type='submit']");
  const data = new FormData(form);
  button.disabled = true;
  errorMessage.hidden = true;
  try {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: data.get("email"),
        password: data.get("password"),
      }),
    });
    if (!response.ok) {
      errorMessage.textContent = translations[root.dataset.language]?.invalidCredentials ?? translations.en.invalidCredentials;
      errorMessage.hidden = false;
      return;
    }
    window.location.replace("/#dashboard");
  } catch {
    errorMessage.textContent = translations[root.dataset.language]?.signInFailed ?? translations.en.signInFailed;
    errorMessage.hidden = false;
  } finally {
    button.disabled = false;
  }
});
