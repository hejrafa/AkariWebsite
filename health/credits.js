const root = document.documentElement;
const themeColor = document.querySelector('meta[name="theme-color"]');
const brandLogo = document.querySelector(".credits-brand img");
const returnLink = document.querySelector("a.credits-brand");
const siteRoot = new URL("../", document.currentScript?.src || window.location.href);
const systemModePreference = window.matchMedia("(prefers-color-scheme: dark)");

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

function updateAppearance() {
  const theme = pageColors.dark[root.dataset.theme] ? root.dataset.theme : "forest";
  const mode = pageColors[root.dataset.mode] ? root.dataset.mode : (systemModePreference.matches ? "dark" : "light");

  root.dataset.theme = theme;
  root.dataset.mode = mode;

  if (brandLogo) {
    brandLogo.src = new URL(`assets/logo/akari-logo-${theme}-${mode}.svg?v=2`, siteRoot).href;
  }

  if (themeColor) {
    themeColor.content = pageColors[mode][theme];
  }

  if (returnLink) {
    returnLink.href = new URL(`?theme=${encodeURIComponent(theme)}&mode=${encodeURIComponent(mode)}`, siteRoot).href;
  }
}

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

requestAnimationFrame(() => {
  requestAnimationFrame(() => root.classList.add("is-loaded"));
});
