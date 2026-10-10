const reports = document.querySelector("#reports");
const state = document.querySelector("#state");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const pageLinks = [...document.querySelectorAll("[data-page-link]")];
const pageViews = [...document.querySelectorAll("[data-page]")];
const playfulEmojis = [...document.querySelectorAll(".playful-emoji")];
const logoutLink = document.querySelector("[data-logout]");
const languageButtons = [...document.querySelectorAll("[data-language-target]")];
const indicatorGroups = [...document.querySelectorAll(".admin-tabs, .summary")];
const rangeButtons = [...document.querySelectorAll("[data-range]")];
const visitStats = document.querySelector("#visit-stats");
const visitsPlot = document.querySelector(".visits-plot");
const visitBreakdowns = document.querySelector("#visit-breakdowns");
const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let activeFilter = "open";
let allReports = [];
let activePanel = null;
let panelTrigger = null;
let feedbackLoaded = false;
let visitRange = 30;
let visitData = null;
let visitsRequest = 0;
let currentLanguage = root.dataset.language === "de" ? "de" : "en";

const translations = {
  en: {
    languageGroupLabel: "Choose a language", languageEnglishLabel: "View in English", languageGermanLabel: "View in German",
    homeLabel: "Akari home", adminPagesLabel: "Admin pages", dashboardNavLabel: "Dashboard", foodReviewNavLabel: "Food inbox", logoutLabel: "Log out",
    dashboardTitle: "Dashboard", dashboardLede: "Who’s finding joinakari.com, and where they’re coming from.", dashboardEmojiLabel: "Play with the dashboard emoji",
    visitsTitle: "Website visits", rangeLabel: "Time range", range7: "7 days", range30: "30 days", range90: "90 days",
    statVisitors: "Visitors", statViews: "Page views", versusPrevious: "{change} vs. previous {days} days",
    chartSummary: "Visitors per day over the last {days} days, {total} in total.", loadingVisits: "Loading visits…", noVisits: "No visits yet. They’ll show up here as people find the website.",
    tooltipVisitors: "{count} visitors", tooltipVisitor: "1 visitor", tooltipViews: "{count} page views", tooltipView: "1 page view", tableDay: "Day",
    breakdownPages: "Pages", breakdownSources: "Came from", breakdownCountries: "Countries", breakdownEmpty: "Nothing yet",
    pageHome: "Home", pagePrivacy: "Privacy", pageTerms: "Terms", sourceDirect: "Direct", unknown: "Unknown",
    visitsNote: "Counted without cookies. A visitor is recognised for one day only.",
    foodReviewTitle: "Food inbox", foodReviewLede: "Wrong matches, odd portions and off nutrition, flagged by people using Akari. Fix each one, then check it off.", foodReviewEmojiLabel: "Play with the food inbox emoji",
    feedbackSummaryLabel: "Feedback summary", open: "Open", resolved: "Resolved", loadingFeedback: "Loading feedback…",
    pageTitleDashboard: "Akari: Dashboard", pageTitleFeedback: "Akari: Food Inbox",
    tableIssue: "Issue", tableInput: "Entered", tableComment: "Comment", tableMatch: "Matched",
    openDetails: "Open details for {title}", noComment: "No comment", noMatchData: "No food matched",
    copyPrompt: "Copy prompt", copied: "Copied", tryAgain: "Try again", reopen: "Reopen", resolve: "Resolve", reopening: "Reopening", resolving: "Resolving", reopened: "Reopened", resolved: "Resolved",
    closeDetails: "Close food review details", foodDetails: "Food details", issueSectionTitle: "Issue", logInput: "Log input", typedInLog: "Typed in Log", originalLogMissing: "The original Log text was not captured for this report.", feedbackComment: "Feedback comment",
    foodItems: "Food items · {count}", noFoodResult: "No food matched.", unmatchedItems: "Not matched · {count}", missingBarcode: "Barcode not found", reportDetails: "Report details", received: "Received", market: "Market", locale: "Locale", app: "App", catalogue: "Catalogue",
    searchSentence: "Search sentence", noSearchPhrase: "No separate search phrase was recorded.", macros: "Macros · {basis}", micronutrients: "Micronutrients · {basis}", nutritionBasis: "Nutrition basis", barcode: "Barcode", estimated: "Estimated",
    emptyOpenTitle: "You’re all caught up", emptyOpenBody: "New food reports will appear here.", emptyResolvedTitle: "Nothing resolved yet", emptyResolvedBody: "Completed fixes will collect here.",
    foodResult: "Food result", wrongFoodMatch: "Wrong food match", wrongFoodIcon: "The food icon is wrong", nutritionWrong: "Nutrition looks wrong", servingWrong: "Serving amount", barcodeWrong: "Barcode", productMissing: "Missing food", extraProduct: "Too many foods were added", tooSlow: "The result took too long", resultNeedsAttention: "This result needs attention",
    anythingElse: "Anything else",
    issue_wrong_match: "Mismatch", issue_wrong_icon: "Icon", issue_nutrition: "Nutrition", issue_serving: "Serving", issue_barcode_or_scan: "Barcode", issue_missing_product: "Missing", issue_extra_product: "Extra", issue_too_slow: "Slow", issue_other: "Other", issue_unknown: "Review",
    unitServing: "serving", basisPer100g: "per 100 g", basisPerServing: "per serving",
    label_fixed: "Resolved", label_calories: "Calories", label_protein: "Protein", label_carbs: "Carbs", label_fat: "Fat", label_fiber: "Fiber", label_sugar: "Sugar", label_water: "Water", label_saturatedFat: "Saturated fat", label_monounsaturatedFat: "Monounsaturated fat", label_polyunsaturatedFat: "Polyunsaturated fat", label_calcium: "Calcium", label_iron: "Iron", label_magnesium: "Magnesium", label_potassium: "Potassium", label_sodium: "Sodium", label_zinc: "Zinc", label_vitaminA: "Vitamin A", label_vitaminB12: "Vitamin B12", label_vitaminC: "Vitamin C", label_vitaminD: "Vitamin D", label_folate: "Folate", label_iodine: "Iodine", label_selenium: "Selenium", label_cholesterol: "Cholesterol", label_caffeine: "Caffeine",
  },
  de: {
    languageGroupLabel: "Sprache wählen", languageEnglishLabel: "Seite auf Englisch anzeigen", languageGermanLabel: "Seite auf Deutsch anzeigen",
    homeLabel: "Akari Startseite", adminPagesLabel: "Admin-Seiten", dashboardNavLabel: "Übersicht", foodReviewNavLabel: "Meldungen", logoutLabel: "Abmelden",
    dashboardTitle: "Übersicht", dashboardLede: "Wer joinakari.com findet und woher die Leute kommen.", dashboardEmojiLabel: "Mit dem Übersichts-Emoji spielen",
    visitsTitle: "Website-Besuche", rangeLabel: "Zeitraum", range7: "7 Tage", range30: "30 Tage", range90: "90 Tage",
    statVisitors: "Besucher", statViews: "Seitenaufrufe", versusPrevious: "{change} ggü. den {days} Tagen davor",
    chartSummary: "Besucher pro Tag in den letzten {days} Tagen, insgesamt {total}.", loadingVisits: "Besuche werden geladen…", noVisits: "Noch keine Besuche. Sie erscheinen hier, sobald Leute die Website finden.",
    tooltipVisitors: "{count} Besucher", tooltipVisitor: "1 Besucher", tooltipViews: "{count} Seitenaufrufe", tooltipView: "1 Seitenaufruf", tableDay: "Tag",
    breakdownPages: "Seiten", breakdownSources: "Gekommen von", breakdownCountries: "Länder", breakdownEmpty: "Noch nichts",
    pageHome: "Startseite", pagePrivacy: "Datenschutz", pageTerms: "Nutzungsbedingungen", sourceDirect: "Direkt", unknown: "Unbekannt",
    visitsNote: "Gezählt ohne Cookies. Ein Besucher wird nur einen Tag lang wiedererkannt.",
    foodReviewTitle: "Meldungen", foodReviewLede: "Falsche Treffer, seltsame Portionen und fehlerhafte Nährwerte, gemeldet von Akari-Nutzern. Korrigieren, dann abhaken.", foodReviewEmojiLabel: "Mit dem Meldungen-Emoji spielen",
    feedbackSummaryLabel: "Zusammenfassung der Rückmeldungen", open: "Offen", resolved: "Erledigt", loadingFeedback: "Rückmeldungen werden geladen…",
    pageTitleDashboard: "Akari: Übersicht", pageTitleFeedback: "Akari: Meldungen",
    tableIssue: "Problem", tableInput: "Eingabe", tableComment: "Kommentar", tableMatch: "Treffer",
    openDetails: "Details öffnen: {title}", noComment: "Kein Kommentar", noMatchData: "Kein Lebensmittel gefunden",
    copyPrompt: "Prompt kopieren", copied: "Kopiert", tryAgain: "Erneut versuchen", reopen: "Wieder öffnen", resolve: "Erledigen", reopening: "Wird geöffnet", resolving: "Wird erledigt", reopened: "Wieder geöffnet", resolved: "Erledigt",
    closeDetails: "Details der Essensrückmeldung schließen", foodDetails: "Lebensmitteldetails", issueSectionTitle: "Problem", logInput: "Eingabe im Log", typedInLog: "Im Log eingegeben", originalLogMissing: "Die ursprüngliche Eingabe wurde für diese Rückmeldung nicht gespeichert.", feedbackComment: "Kommentar zur Rückmeldung",
    foodItems: "Lebensmittel · {count}", noFoodResult: "Kein Lebensmittel gefunden.", unmatchedItems: "Nicht gefunden · {count}", missingBarcode: "Barcode nicht gefunden", reportDetails: "Details zur Rückmeldung", received: "Eingegangen", market: "Markt", locale: "Sprache", app: "App", catalogue: "Katalog",
    searchSentence: "Suchtext", noSearchPhrase: "Es wurde kein eigener Suchtext gespeichert.", macros: "Makronährstoffe · {basis}", micronutrients: "Mikronährstoffe · {basis}", nutritionBasis: "Bezugsmenge", barcode: "Barcode", estimated: "Geschätzt",
    emptyOpenTitle: "Alles erledigt", emptyOpenBody: "Neue Rückmeldungen erscheinen hier.", emptyResolvedTitle: "Noch nichts erledigt", emptyResolvedBody: "Abgeschlossene Korrekturen werden hier gesammelt.",
    foodResult: "Lebensmittelergebnis", wrongFoodMatch: "Falsches Lebensmittel", wrongFoodIcon: "Das Symbol passt nicht", nutritionWrong: "Nährwerte stimmen nicht", servingWrong: "Portionsmenge", barcodeWrong: "Barcode", productMissing: "Lebensmittel fehlt", extraProduct: "Zu viele Einträge wurden hinzugefügt", tooSlow: "Das Ergebnis hat zu lange gedauert", resultNeedsAttention: "Dieses Ergebnis muss geprüft werden",
    anythingElse: "Weitere Angaben",
    issue_wrong_match: "Verwechslung", issue_wrong_icon: "Symbol", issue_nutrition: "Nährwerte", issue_serving: "Portion", issue_barcode_or_scan: "Barcode", issue_missing_product: "Fehlt", issue_extra_product: "Zuviel", issue_too_slow: "Langsam", issue_other: "Sonstiges", issue_unknown: "Prüfen",
    unitServing: "Portion", basisPer100g: "pro 100 g", basisPerServing: "pro Portion",
    label_fixed: "Erledigt", label_calories: "Kalorien", label_protein: "Eiweiß", label_carbs: "Kohlenhydrate", label_fat: "Fett", label_fiber: "Ballaststoffe", label_sugar: "Zucker", label_water: "Wasser", label_saturatedFat: "Gesättigte Fettsäuren", label_monounsaturatedFat: "Einfach ungesättigte Fettsäuren", label_polyunsaturatedFat: "Mehrfach ungesättigte Fettsäuren", label_calcium: "Kalzium", label_iron: "Eisen", label_magnesium: "Magnesium", label_potassium: "Kalium", label_sodium: "Natrium", label_zinc: "Zink", label_vitaminA: "Vitamin A", label_vitaminB12: "Vitamin B12", label_vitaminC: "Vitamin C", label_vitaminD: "Vitamin D", label_folate: "Folat", label_iodine: "Jod", label_selenium: "Selen", label_cholesterol: "Cholesterin", label_caffeine: "Koffein",
  },
};

function t(key, values = {}) {
  const value = translations[currentLanguage][key] ?? translations.en[key] ?? key;
  return Object.entries(values).reduce((copy, [name, replacement]) => copy.replaceAll(`{${name}}`, replacement), value);
}

function translateStatic() {
  for (const node of document.querySelectorAll("[data-i18n]")) node.textContent = t(node.dataset.i18n);
  for (const node of document.querySelectorAll("[data-i18n-aria-label]")) node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  for (const button of languageButtons) button.setAttribute("aria-pressed", String(button.dataset.languageTarget === currentLanguage));
}

function selectLanguage(language, persist = true) {
  currentLanguage = language === "de" ? "de" : "en";
  root.dataset.language = currentLanguage;
  root.lang = currentLanguage;
  if (persist) {
    if (window.AkariAppearance) window.AkariAppearance.persist("akari-language", currentLanguage);
    else try { localStorage.setItem("akari-language", currentLanguage); } catch {}
  }
  translateStatic();
  syncPage();
  if (allReports.length) render(allReports);
  if (visitData) renderVisits(visitData);
  if (activePanel) closeReportPanel();
}

for (const button of languageButtons) {
  button.addEventListener("click", () => selectLanguage(button.dataset.languageTarget));
}

function syncPage() {
  const requestedPage = window.location.hash.slice(1);
  const page = requestedPage === "feedback" ? "feedback" : "dashboard";
  if (!window.location.hash) history.replaceState(null, "", "#dashboard");

  for (const view of pageViews) view.hidden = view.dataset.page !== page;
  for (const link of pageLinks) {
    const selected = link.dataset.pageLink === page;
    link.classList.toggle("is-active", selected);
    if (selected) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }

  document.title = page === "feedback" ? t("pageTitleFeedback") : t("pageTitleDashboard");
  syncIndicators();
  if (page !== "feedback") closeReportPanel();
  if (page === "feedback" && !feedbackLoaded) {
    feedbackLoaded = true;
    load();
  }
  if (page === "dashboard" && !visitData) loadVisits();
}

window.addEventListener("hashchange", syncPage);
window.addEventListener("resize", syncIndicators);
document.fonts?.ready.then(syncIndicators);

// Slides each segmented control's pill under its active item, like the
// language switch. Items differ in width, so the pill is measured.
function syncIndicators() {
  for (const group of indicatorGroups) {
    const active = group.querySelector(".is-active");
    if (!active || !group.offsetParent) continue;
    group.style.setProperty("--indicator-x", `${active.offsetLeft}px`);
    group.style.setProperty("--indicator-w", `${active.offsetWidth}px`);
    // Only animate after the first placement, so the pill doesn't fly in on load.
    requestAnimationFrame(() => group.classList.add("is-animated"));
  }
}

if (logoutLink) {
  if (isLocalPreview()) {
    logoutLink.href = window.AkariAppearance?.landingURL() || "http://127.0.0.1:8080/";
  } else {
    logoutLink.addEventListener("click", async (event) => {
      event.preventDefault();
      logoutLink.setAttribute("aria-disabled", "true");
      try {
        await fetch("/auth/logout", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });
      } finally {
        window.location.replace(window.AkariAppearance?.landingURL() || "https://joinakari.com/");
      }
    });
  }
}

function popEmoji(emoji) {
  if (reduceMotion.matches) return;
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

for (const emoji of playfulEmojis) {
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
}

for (const button of filterButtons) {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    for (const candidate of filterButtons) {
      const selected = candidate === button;
      candidate.classList.toggle("is-active", selected);
      candidate.setAttribute("aria-pressed", String(selected));
    }
    syncIndicators();
    render(allReports);
  });
}

for (const button of rangeButtons) {
  button.addEventListener("click", () => {
    visitRange = Number(button.dataset.range);
    for (const candidate of rangeButtons) {
      const selected = candidate === button;
      candidate.classList.toggle("is-active", selected);
      candidate.setAttribute("aria-pressed", String(selected));
    }
    loadVisits();
  });
}

// Website visits ---------------------------------------------------------------------------------

async function loadVisits() {
  const request = ++visitsRequest;
  visitsPlot.setAttribute("aria-busy", "true");
  try {
    const response = await fetch(`/admin-api/visits?days=${visitRange}`);
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    let data = await response.json();
    if (isLocalPreview() && data.totals.views === 0) data = previewVisits(data);
    if (request !== visitsRequest) return;
    visitData = data;
    renderVisits(data);
  } catch (error) {
    if (request !== visitsRequest) return;
    visitsPlot.replaceChildren(element("p", "visits-state", error.message));
  } finally {
    if (request === visitsRequest) visitsPlot.removeAttribute("aria-busy");
  }
}

function renderVisits(data) {
  visitStats.replaceChildren(
    visitStat(t("statVisitors"), data.totals.visitors, comparison(data.totals.visitors, data.previous.visitors, data.days)),
    visitStat(t("statViews"), data.totals.views, comparison(data.totals.views, data.previous.views, data.days)),
  );

  if (data.totals.views === 0) {
    visitsPlot.replaceChildren(element("p", "visits-state", t("noVisits")));
  } else {
    visitsPlot.replaceChildren(visitsChart(data), visitsTable(data));
  }

  const { pages, sources, countries } = data.breakdowns;
  visitBreakdowns.replaceChildren(
    breakdownList(t("breakdownPages"), pages, pageLabel),
    breakdownList(t("breakdownSources"), sources, (value) => value ?? t("sourceDirect")),
    breakdownList(t("breakdownCountries"), countries, countryLabel),
  );
}

function visitStat(label, value, detail) {
  const stat = element("div", "visit-stat");
  const description = element("dd");
  description.append(element("strong", "", formatNumber(value)));
  if (detail) description.append(element("span", "visit-stat-detail", detail));
  stat.append(element("dt", "", label), description);
  return stat;
}

function comparison(current, previous, days) {
  if (!previous) return "";
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return "";
  return t("versusPrevious", { change: `${change > 0 ? "↑" : "↓"} ${Math.abs(change)}%`, days });
}

// One series, so no legend: the stat beside it names it. Hovering shows the
// day's numbers.
function visitsChart(data) {
  const svgNS = "http://www.w3.org/2000/svg";
  const width = 720;
  const height = 220;
  const pad = { top: 20, right: 14, bottom: 30, left: 14 };
  const points = data.daily;
  const max = Math.max(1, ...points.map((point) => point.visitors));
  const top = niceCeiling(max);
  const x = (index) => pad.left + (points.length === 1 ? 0 : (index / (points.length - 1)) * (width - pad.left - pad.right));
  const y = (value) => pad.top + (1 - value / top) * (height - pad.top - pad.bottom);
  const baseline = y(0);

  const wrap = element("div", "visits-chart-wrap");
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", t("chartSummary", { days: data.days, total: formatNumber(data.totals.visitors) }));
  const shape = (name, attributes) => {
    const node = document.createElementNS(svgNS, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    svg.append(node);
    return node;
  };

  // A fill that fades out towards the baseline, so the line carries the chart.
  const defs = shape("defs", {});
  const gradient = document.createElementNS(svgNS, "linearGradient");
  for (const [key, value] of Object.entries({ id: "visits-fill", x1: 0, y1: 0, x2: 0, y2: 1 })) gradient.setAttribute(key, value);
  for (const [offset, name] of [["0", "visits-fill-top"], ["1", "visits-fill-bottom"]]) {
    const stop = document.createElementNS(svgNS, "stop");
    stop.setAttribute("offset", offset);
    stop.setAttribute("class", name);
    gradient.append(stop);
  }
  defs.append(gradient);

  for (const fraction of [0.5, 1]) {
    shape("line", { class: "visits-grid", x1: pad.left, x2: width - pad.right, y1: y(top * fraction), y2: y(top * fraction) });
  }
  shape("line", { class: "visits-baseline", x1: pad.left, x2: width - pad.right, y1: baseline, y2: baseline });
  const line = smoothPath(points.map((point, index) => [x(index), y(point.visitors)]));
  shape("path", { class: "visits-area", fill: "url(#visits-fill)", d: `${line} L${x(points.length - 1).toFixed(1)} ${baseline} L${x(0).toFixed(1)} ${baseline} Z` });
  shape("path", { class: "visits-line", d: line });
  const crosshair = shape("line", { class: "visits-crosshair", y1: pad.top, y2: baseline, x1: 0, x2: 0 });

  const scale = element("span", "visits-scale", formatNumber(top));
  scale.style.top = `${(y(top) / height) * 100}%`;
  const axis = element("div", "visits-axis");
  for (const index of [0, Math.floor((points.length - 1) / 2), points.length - 1]) {
    const tick = element("span", "", formatDay(points[index].day, { day: "numeric", month: "short" }));
    tick.style.left = `${(x(index) / width) * 100}%`;
    axis.append(tick);
  }

  const marker = element("span", "visits-marker");
  const tooltip = element("div", "visits-tooltip");
  tooltip.setAttribute("role", "status");
  wrap.append(svg, scale, axis, marker, tooltip);

  const show = (index) => {
    const point = points[index];
    const left = (x(index) / width) * 100;
    crosshair.setAttribute("x1", x(index));
    crosshair.setAttribute("x2", x(index));
    marker.style.left = `${left}%`;
    marker.style.top = `${(y(point.visitors) / height) * 100}%`;
    tooltip.replaceChildren(
      element("span", "visits-tooltip-day", formatDay(point.day, { weekday: "short", day: "numeric", month: "short" })),
      element("strong", "", point.visitors === 1 ? t("tooltipVisitor") : t("tooltipVisitors", { count: formatNumber(point.visitors) })),
      element("span", "", point.views === 1 ? t("tooltipView") : t("tooltipViews", { count: formatNumber(point.views) })),
    );
    tooltip.style.left = `${left}%`;
    tooltip.classList.toggle("is-flipped", left > 60);
    wrap.classList.add("is-hovering");
  };
  const hide = () => wrap.classList.remove("is-hovering");
  const indexAt = (event) => {
    const bounds = svg.getBoundingClientRect();
    const position = ((event.clientX - bounds.left) / bounds.width) * width;
    const fraction = (position - pad.left) / (width - pad.left - pad.right);
    return Math.min(points.length - 1, Math.max(0, Math.round(fraction * (points.length - 1))));
  };
  wrap.addEventListener("pointermove", (event) => show(indexAt(event)));
  wrap.addEventListener("pointerdown", (event) => show(indexAt(event)));
  wrap.addEventListener("pointerleave", hide);
  return wrap;
}

// A monotone cubic through every point (Fritsch–Carlson): smooth, but it never
// overshoots a day's value or dips below zero between days.
function smoothPath(coordinates) {
  const count = coordinates.length;
  if (count < 3) return coordinates.map(([px, py], index) => `${index ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");
  const slopes = [];
  for (let index = 0; index < count - 1; index += 1) {
    const [x0, y0] = coordinates[index];
    const [x1, y1] = coordinates[index + 1];
    slopes.push((y1 - y0) / (x1 - x0));
  }
  const tangents = coordinates.map((_, index) => {
    if (index === 0) return slopes[0];
    if (index === count - 1) return slopes[count - 2];
    const before = slopes[index - 1];
    const after = slopes[index];
    return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
  });
  let path = `M${coordinates[0][0].toFixed(1)} ${coordinates[0][1].toFixed(1)}`;
  for (let index = 0; index < count - 1; index += 1) {
    const [x0, y0] = coordinates[index];
    const [x1, y1] = coordinates[index + 1];
    const third = (x1 - x0) / 3;
    path += ` C${(x0 + third).toFixed(1)} ${(y0 + tangents[index] * third).toFixed(1)} ${(x1 - third).toFixed(1)} ${(y1 - tangents[index + 1] * third).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return path;
}

function niceCeiling(value) {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (value <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

// The same numbers as a table, for screen readers.
function visitsTable(data) {
  const table = element("table", "visually-hidden");
  const head = element("tr");
  head.append(element("th", "", t("tableDay")), element("th", "", t("statVisitors")), element("th", "", t("statViews")));
  table.append(head);
  for (const point of data.daily) {
    const row = element("tr");
    row.append(element("td", "", formatDay(point.day, { dateStyle: "medium" })), element("td", "", formatNumber(point.visitors)), element("td", "", formatNumber(point.views)));
    table.append(row);
  }
  return table;
}

function breakdownList(title, rows, labelFor) {
  const section = element("section", "breakdown");
  section.append(element("h3", "", title));
  if (!rows.length) {
    section.append(element("p", "breakdown-empty", t("breakdownEmpty")));
    return section;
  }
  const list = element("ol", "breakdown-list");
  for (const row of rows.slice(0, 5)) {
    const item = element("li", "breakdown-row");
    item.append(element("span", "breakdown-label", labelFor(row.value)), element("span", "breakdown-value", formatNumber(row.visitors)));
    list.append(item);
  }
  section.append(list);
  return section;
}

function pageLabel(path) {
  return ({ "/": t("pageHome"), "/privacy/": t("pagePrivacy"), "/terms/": t("pageTerms") })[path] ?? path;
}

function countryLabel(code) {
  if (!code) return t("unknown");
  const flag = String.fromCodePoint(...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
  let name = code;
  try {
    name = new Intl.DisplayNames([currentLanguage], { type: "region" }).of(code) ?? code;
  } catch {}
  return `${flag} ${name}`;
}

function formatDay(day, options) {
  if (!day) return "";
  return new Intl.DateTimeFormat(currentLanguage === "de" ? "de-DE" : "en-US", { timeZone: "UTC", ...options }).format(new Date(`${day}T00:00:00Z`));
}

async function load() {
  state.hidden = false;
  state.textContent = t("loadingFeedback");
  reports.replaceChildren(state);
  try {
    const response = await fetch("/admin-api/reports");
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const data = await response.json();
    const savedReports = data.reports ?? [];
    allReports = isLocalPreview() ? [...previewReports(), ...savedReports] : savedReports;
    render(allReports);
  } catch (error) {
    feedbackLoaded = false;
    reports.replaceChildren(state);
    state.textContent = error.message;
  }
}

function problemGroups(items) {
  // Older apps can still send positive feedback. Keep it stored, while
  // this dashboard focuses on problem reports in both views and counts.
  const problems = items.filter((item) => item.rating === "negative");
  return {
    open: problems.filter((item) => !["fixed", "dismissed"].includes(item.status)),
    resolved: problems.filter((item) => item.status === "fixed"),
  };
}

function render(items) {
  const { open, resolved } = problemGroups(items);
  const visible = activeFilter === "resolved" ? resolved : open;

  updateCounts(open.length, resolved.length);
  reports.replaceChildren();
  if (!visible.length) {
    reports.append(emptyState());
    return;
  }
  reports.append(reportTableHeader());
  for (const item of visible) reports.append(reportCard(item));
}

function updateCounts(openCount, resolvedCount) {
  document.querySelector("#open-count").textContent = openCount;
  document.querySelector("#resolved-count").textContent = resolvedCount;
}

function reportCard(report) {
  const card = element("article", "report");
  card.dataset.reportId = report.id;
  card.tabIndex = 0;
  card.setAttribute("aria-label", t("openDetails", { title: feedbackTitle(report) }));
  card.addEventListener("click", (event) => {
    if (event.target.closest("button, a")) return;
    openReportPanel(report, card);
  });
  card.addEventListener("keydown", (event) => {
    if (event.target !== card || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    openReportPanel(report, card);
  });
  const row = element("div", "report-row");

  const issue = element("div", "issue-cell");
  appendIssuePills(issue, report, true);

  const title = element("div", "input-cell");
  const heading = element("h2", "log-text");
  heading.append(element("span", "strike", report.logText || resultNames(report)));
  title.append(heading);

  const comment = element("div", "comment-cell");
  if (report.note) {
    comment.append(element("p", "row-comment", `“${report.note}”`));
  } else {
    comment.append(element("span", "no-comment", t("noComment")));
  }

  const matches = matchCell(report);
  const actions = reportActions(report);
  actions.classList.add("action-cell");
  row.append(completeCell(report), issue, title, matches, comment, actions);
  card.append(row);
  return card;
}

function reportTableHeader() {
  const header = element("div", "report-columns");
  for (const title of ["", t("tableIssue"), t("tableInput"), t("tableMatch"), t("tableComment"), ""]) {
    header.append(element("span", "", title));
  }
  return header;
}

function matchCell(report) {
  const cell = element("div", "matches-cell");
  const items = report.items ?? [];
  if (!items.length) {
    cell.append(element("span", "no-match", t("noMatchData")));
    return cell;
  }
  const suffix = items.length > 1 ? ` +${items.length - 1}` : "";
  cell.append(element("span", "matched-result", `${items[0].name}${suffix}`));
  return cell;
}

const completeSVG = `<svg viewBox="0 0 28 28" aria-hidden="true">
  <circle class="complete-fill" cx="14" cy="14" r="12.5"/>
  <circle class="complete-ring" cx="14" cy="14" r="12"/>
  <path class="complete-tick" pathLength="1" d="M8.6 14.4l3.6 3.6 7.2-8"/>
</svg>`;

function completeCell(report) {
  const cell = element("div", "complete-cell");
  const toggle = element("button", "complete-toggle");
  toggle.type = "button";
  toggle.classList.toggle("is-checked", report.status === "fixed");
  toggle.setAttribute("aria-label", report.status === "fixed" ? t("reopen") : t("resolve"));
  toggle.innerHTML = completeSVG;
  toggle.addEventListener("click", async () => {
    const row = toggle.closest(".report");
    const nextStatus = report.status === "fixed" ? "new" : "fixed";
    toggle.disabled = true;
    toggle.classList.remove("is-error");
    // Play the check-off right away; the row only leaves once the server agrees.
    const [saved] = await Promise.all([saveStatus(report, nextStatus), playRowCompletion(row, nextStatus)]);
    if (!saved) {
      row.classList.remove("is-completing", "is-reopening");
      toggle.classList.add("is-error");
      toggle.setAttribute("aria-label", t("tryAgain"));
      toggle.disabled = false;
      return;
    }
    report.status = nextStatus;
    collapseRow(row);
  });
  cell.append(toggle);
  return cell;
}

function playRowCompletion(row, nextStatus) {
  row.classList.add(nextStatus === "fixed" ? "is-completing" : "is-reopening");
  return wait(reduceMotion.matches ? 0 : 820);
}

async function saveStatus(report, nextStatus) {
  if (report.preview) return true;
  try {
    const response = await fetch(`/admin-api/reports/${encodeURIComponent(report.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function reportActions(report, presentation = "compact") {
  const isPanel = presentation === "panel";
  const buttons = element("div", "report-buttons");
  buttons.addEventListener("click", (event) => event.stopPropagation());
  if (report.rating === "negative") {
    const copy = element("button", "copy-button");
    if (isPanel) copy.classList.add("panel-cta");
    copy.type = "button";
    setButtonState(copy, t("copyPrompt"), "idle", isPanel ? null : "doc.on.doc.fill.png");
    copy.addEventListener("click", async () => {
      copy.disabled = true;
      const copied = await copyText(fixPrompt(report));
      setButtonState(copy, copied ? t("copied") : t("tryAgain"), copied ? "success" : "error");
      setTimeout(() => {
        copy.disabled = false;
        setButtonState(copy, t("copyPrompt"), "idle", isPanel ? null : "doc.on.doc.fill.png");
      }, 1400);
    });
    buttons.append(copy);
  }
  if (!isPanel) return buttons;
  const isResolved = report.status === "fixed";
  const nextStatus = isResolved ? "new" : "fixed";
  const resolve = element("button", `resolve-button panel-cta ${isResolved ? "reopen" : ""}`);
  resolve.type = "button";
  // Resolve shows the row's check-off circle next to its label; Reopen stays text-only.
  const setResolveLabel = (text) => {
    const content = element("span", "button-state");
    const icon = element("span", "complete-toggle");
    icon.innerHTML = completeSVG;
    content.append(icon, document.createTextNode(text));
    resolve.setAttribute("aria-label", text);
    resolve.replaceChildren(content);
  };
  if (isResolved) setButtonState(resolve, t("reopen"));
  else setResolveLabel(t("resolve"));
  resolve.addEventListener("click", async () => {
    resolve.disabled = true;
    let saved;
    if (isResolved) {
      // Only show the spinner when the request is noticeably slow, so a fast
      // response goes straight to the checkmark without a spinner blink.
      const showLoading = setTimeout(() => setButtonState(resolve, t("reopening"), "loading"), 220);
      saved = await saveStatus(report, nextStatus);
      clearTimeout(showLoading);
      if (saved) {
        setButtonState(resolve, t("reopened"), "success");
        await wait(380);
      }
    } else {
      // Check off right away, like the rows; the panel only closes once saved.
      setResolveLabel(t("resolved"));
      resolve.classList.add("is-completing");
      [saved] = await Promise.all([saveStatus(report, nextStatus), wait(reduceMotion.matches ? 0 : 640)]);
    }
    if (!saved) {
      resolve.classList.remove("is-completing");
      resolve.disabled = false;
      setButtonState(resolve, t("tryAgain"), "error");
      return;
    }
    report.status = nextStatus;
    closeReportPanel();
    const row = [...document.querySelectorAll(".report")]
      .find((candidate) => candidate.dataset.reportId === report.id);
    if (!row) {
      render(allReports);
      return;
    }
    await playRowCompletion(row, nextStatus);
    collapseRow(row);
  });
  buttons.append(resolve);
  return buttons;
}

function setButtonState(button, text, state = "idle", symbol = null) {
  button.classList.remove("is-loading", "is-success", "is-error");
  if (state !== "idle") button.classList.add(`is-${state}`);
  button.setAttribute("aria-label", text);
  const content = element("span", "button-state");
  const showsText = button.classList.contains("panel-cta");
  if (state === "loading") {
    const spinner = element("span", "button-spinner");
    spinner.setAttribute("aria-hidden", "true");
    content.append(spinner);
  } else if (state === "success") {
    // Same SF Symbol as the idle Resolve button, so the weight never jumps.
    const check = element("span", "button-symbol button-check");
    check.style.setProperty("--symbol", "url('/assets/sf-symbols/checkmark.png')");
    check.setAttribute("aria-hidden", "true");
    content.append(check);
  } else if (state === "error") {
    const error = element("span", "button-error", "!");
    error.setAttribute("aria-hidden", "true");
    content.append(error);
  } else if (symbol) {
    const icon = element("span", "button-symbol");
    icon.style.setProperty("--symbol", `url('/assets/sf-symbols/${symbol}')`);
    icon.setAttribute("aria-hidden", "true");
    content.append(icon);
  }
  if (state === "idle" && (showsText || !symbol)) content.append(document.createTextNode(text));
  button.replaceChildren(content);
}

function collapseRow(row) {
  // The server already confirmed the change and the report object was updated
  // in place, so collapse just this row instead of re-fetching and rebuilding
  // the whole list (which flashed the loading state).
  const { open, resolved } = problemGroups(allReports);
  updateCounts(open.length, resolved.length);
  const neighbour = row.nextElementSibling?.matches(".report") ? row.nextElementSibling : row.previousElementSibling;
  const hadFocus = row.contains(document.activeElement);
  row.style.maxHeight = `${row.getBoundingClientRect().height}px`;
  row.getBoundingClientRect();
  row.classList.add("is-leaving");
  requestAnimationFrame(() => { row.style.maxHeight = "0px"; });
  setTimeout(() => {
    row.remove();
    if (!reports.querySelector(".report")) {
      render(allReports);
    } else if (hadFocus && neighbour?.matches(".report")) {
      neighbour.focus({ preventScroll: true });
    }
  }, 460);
}

function openReportPanel(report, trigger) {
  closeReportPanel();
  panelTrigger = trigger;

  const backdrop = element("div", "panel-backdrop");
  const panel = element("aside", "detail-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "detail-panel-title");

  const header = element("header", "panel-header");
  const close = element("button", "panel-close");
  close.innerHTML = `<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M1.5 1.5l11 11M12.5 1.5l-11 11"/></svg>`;
  close.type = "button";
  close.setAttribute("aria-label", t("closeDetails"));
  close.addEventListener("click", closeReportPanel);
  const heading = element("div", "panel-heading");
  heading.append(element("h1", "", t("foodDetails")));
  heading.querySelector("h1").id = "detail-panel-title";
  header.append(close, heading, element("span", "panel-header-spacer"));

  const content = element("div", "panel-content");
  const issueSection = panelSection(t("issueSectionTitle"));
  const issueCard = element("div", "panel-card panel-issue-card");
  const panelIssues = element("div", "panel-issue-list");
  appendIssuePills(panelIssues, report);
  issueCard.append(panelIssues);
  issueSection.append(issueCard);
  content.append(issueSection);

  const inputSection = panelSection(t("logInput"));
  const inputCard = element("div", "panel-card log-card");
  inputCard.append(
    element("span", "feedback-label", t("typedInLog")),
    element("blockquote", "", report.logText || t("originalLogMissing")),
  );
  if (report.note) {
    const note = element("div", "panel-note");
    note.append(element("span", "feedback-label", t("feedbackComment")), element("p", "", report.note));
    inputCard.append(note);
  }
  inputSection.append(inputCard);
  content.append(inputSection);

  if (report.barcode) {
    const barcodeSection = panelSection(t("missingBarcode"));
    const barcodeCard = element("div", "panel-card log-card");
    barcodeCard.append(element("blockquote", "", report.barcode));
    barcodeSection.append(barcodeCard);
    content.append(barcodeSection);
  }

  const unmatched = report.unmatched ?? [];
  if (unmatched.length) {
    const unmatchedSection = panelSection(t("unmatchedItems", { count: unmatched.length }));
    const unmatchedCard = element("div", "panel-card log-card");
    for (const row of unmatched) unmatchedCard.append(element("blockquote", "", row));
    unmatchedSection.append(unmatchedCard);
    content.append(unmatchedSection);
  }

  const foodsSection = panelSection(t("foodItems", { count: report.items?.length ?? 0 }));
  for (const [index, item] of (report.items ?? []).entries()) {
    foodsSection.append(panelFoodCard(item, index));
  }
  if (!(report.items?.length)) {
    foodsSection.append(element("div", "panel-card panel-food-empty", t("noFoodResult")));
  }
  content.append(foodsSection);

  const contextSection = panelSection(t("reportDetails"));
  const contextCard = element("dl", "panel-card context-list");
  appendDefinition(contextCard, t("received"), formatDate(report.createdAt));
  appendDefinition(contextCard, t("market"), report.market);
  appendDefinition(contextCard, t("locale"), report.locale);
  appendDefinition(contextCard, t("app"), report.appVersion && `${report.appVersion} (${report.buildNumber ?? "?"})`);
  appendDefinition(contextCard, t("catalogue"), report.catalogVersion);
  contextSection.append(contextCard);
  content.append(contextSection);

  const footer = element("footer", "panel-footer");
  footer.append(reportActions(report, "panel"));
  panel.append(header, content, footer);
  backdrop.append(panel);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeReportPanel();
  });
  document.body.append(backdrop);
  document.body.classList.add("panel-open");
  document.addEventListener("keydown", closePanelOnEscape);
  activePanel = backdrop;
  requestAnimationFrame(() => backdrop.classList.add("is-open"));
  close.focus();
}

function closeReportPanel() {
  if (!activePanel) return;
  const closing = activePanel;
  activePanel = null;
  document.body.classList.remove("panel-open");
  document.removeEventListener("keydown", closePanelOnEscape);
  closing.classList.remove("is-open");
  setTimeout(() => closing.remove(), 220);
  panelTrigger?.focus();
  panelTrigger = null;
}

function closePanelOnEscape(event) {
  if (event.key === "Escape") closeReportPanel();
}

function panelSection(title) {
  const section = element("section", "panel-section");
  section.append(element("h2", "", title));
  return section;
}

function panelFoodCard(item, index) {
  const card = element("article", "panel-card food-detail-card");
  const head = element("header", "food-detail-head");
  const number = element("span", "food-number", String(index + 1).padStart(2, "0"));
  const identity = element("div", "food-identity");
  identity.append(element("h3", "", item.name));
  const subline = [item.dish, item.brand, item.source].filter(Boolean).join(" · ");
  if (subline) identity.append(element("p", "", subline));
  const amount = item.amount && item.unit ? `${formatNumber(item.amount)} ${labelUnit(item.unit)}` : "";
  head.append(number, identity, element("strong", "food-amount", amount));
  card.append(head);

  const query = element("div", "search-sentence");
  query.append(
    element("span", "feedback-label", t("searchSentence")),
    element("p", "", item.query || t("noSearchPhrase")),
  );
  card.append(query);

  const nutrientEntries = Object.entries(item.nutrients ?? {});
  const macroKeys = ["calories", "protein", "carbs", "fat", "fiber", "sugar"];
  const macros = macroKeys
    .filter((key) => item.nutrients?.[key] !== undefined)
    .map((key) => [key, item.nutrients[key]]);
  const micros = nutrientEntries.filter(([key]) => !macroKeys.includes(key));
  const basis = nutritionBasisLabel(item.nutritionBasis);

  if (macros.length) {
    card.append(element("h4", "nutrient-heading", t("macros", { basis })));
    const grid = element("div", "macro-grid");
    for (const [key, value] of macros) grid.append(nutrientTile(key, value, item));
    card.append(grid);
  }

  if (micros.length) {
    card.append(element("h4", "nutrient-heading", t("micronutrients", { basis })));
    const list = element("div", "micro-list");
    for (const [key, value] of micros) list.append(nutrientRow(key, value, item));
    card.append(list);
  }

  const facts = element("dl", "food-facts");
  appendDefinition(facts, t("nutritionBasis"), item.nutritionBasis && basis);
  appendDefinition(facts, t("barcode"), item.barcode);
  if (facts.children.length) card.append(facts);
  return card;
}

function nutrientTile(key, value, item) {
  const tile = element("div", "nutrient-tile");
  tile.append(
    element("span", "", label(key)),
    element("strong", "", `${formatNumber(value)}${nutrientUnit(key) ? ` ${nutrientUnit(key)}` : ""}`),
  );
  if (item.estimatedNutrients?.includes(key)) tile.append(element("small", "", t("estimated")));
  return tile;
}

function nutrientRow(key, value, item) {
  const row = element("div", "micro-row");
  const name = element("span", "", label(key));
  if (item.estimatedNutrients?.includes(key)) name.append(element("small", "estimated", t("estimated")));
  row.append(name, element("strong", "", `${formatNumber(value)}${nutrientUnit(key) ? ` ${nutrientUnit(key)}` : ""}`));
  return row;
}

function appendDefinition(list, term, value) {
  if (value === null || value === undefined || value === "") return;
  list.append(element("dt", "", term), element("dd", "", value));
}

function emptyState() {
  const empty = element("div", "empty-state");
  const icon = element("span", "empty-icon", activeFilter === "resolved" ? "✓" : "✦");
  icon.setAttribute("aria-hidden", "true");
  const copy = element("div", "empty-copy");
  if (activeFilter === "resolved") {
    copy.append(
      element("h2", "", t("emptyResolvedTitle")),
      element("p", "", t("emptyResolvedBody")),
    );
  } else {
    copy.append(
      element("h2", "", t("emptyOpenTitle")),
      element("p", "", t("emptyOpenBody")),
    );
  }
  empty.append(icon, copy);
  return empty;
}

function resultNames(report) {
  const names = (report.items ?? []).map((item) => item.name).filter(Boolean);
  return names.length ? names.join(", ") : t("foodResult");
}

function fixPrompt(report) {
  const lines = [
    "Please investigate and fix this Akari food result feedback.",
    `Issue: ${feedbackTitle(report)}`,
  ];
  if (report.logText) lines.push(`What the person typed in Log: ${report.logText}`);
  if (report.note) lines.push(`User comment: ${report.note}`);
  for (const row of report.unmatched ?? []) lines.push(`Not matched: ${row}`);
  if (report.barcode) lines.push(`Barcode not found in any database: ${report.barcode} (market ${report.market ?? "unknown"})`);
  for (const [index, item] of (report.items ?? []).entries()) {
    const identity = [item.name, item.brand].filter(Boolean).join(" · ");
    lines.push(`Food ${index + 1}: ${identity}`);
    if (item.dish) lines.push(`Part of the dish: ${item.dish}`);
    if (item.query) lines.push(`Matched from: ${item.query}`);
    if (item.amount && item.unit) lines.push(`Amount: ${formatNumber(item.amount)} ${labelUnit(item.unit)}`);
    if (item.barcode) lines.push(`Barcode: ${item.barcode}`);
    lines.push(`Source: ${item.source}`);
    const nutrition = Object.entries(item.nutrients ?? {})
      .map(([key, value]) => `${label(key)} ${formatNumber(value)}${nutrientUnit(key) ? ` ${nutrientUnit(key)}` : ""}`)
      .join(", ");
    if (nutrition) lines.push(`Current nutrition per 100 g: ${nutrition}`);
  }
  lines.push("Check the matching and source data, correct the result without overwriting verified branded data, and add regression coverage for the fix.");
  return lines.join("\n");
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = value;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  }
}

function feedbackTitle(report) {
  return feedbackReasons(report).map(feedbackReasonTitle).join(", ");
}

function feedbackReasonTitle(reason) {
  if (reason === "wrong_match") return t("wrongFoodMatch");
  if (reason === "wrong_icon") return t("wrongFoodIcon");
  if (reason === "nutrition") return t("nutritionWrong");
  if (reason === "serving") return t("servingWrong");
  if (reason === "barcode_or_scan") return t("barcodeWrong");
  if (reason === "missing_product") return t("productMissing");
  if (reason === "extra_product") return t("extraProduct");
  if (reason === "too_slow") return t("tooSlow");
  if (reason === "other") return t("anythingElse");
  return t("resultNeedsAttention");
}

function issueLabel(reason) {
  const key = `issue_${reason}`;
  return key in translations.en ? t(key) : t("issue_unknown");
}

function feedbackReasons(report) {
  return [...new Set(report.reasons?.length ? report.reasons : ["other"])];
}

function issueToneClass(reason) {
  return `issue-${reason.replaceAll("_", "-")}`;
}

function appendIssuePills(container, report, compact = false) {
  for (const reason of feedbackReasons(report)) {
    const pill = element("span", `issue-pill ${compact ? "row-pill " : ""}${issueToneClass(reason)}`);
    pill.title = feedbackReasonTitle(reason);
    pill.append(element("span", "issue-text", issueLabel(reason)));
    container.append(pill);
  }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function label(value) {
  const translated = translations[currentLanguage][`label_${value}`];
  if (translated) return translated;
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function labelUnit(value) {
  return ({ gram: "g", milliliter: "ml", serving: t("unitServing") })[value] ?? value;
}

function nutritionBasisLabel(value) {
  return ({ per100Grams: t("basisPer100g"), perServing: t("basisPerServing") })[value] ?? label(value || t("basisPer100g"));
}

function nutrientUnit(value) {
  if (value === "calories") return "kcal";
  if (["protein", "carbs", "fat", "fiber", "sugar", "water", "saturatedFat", "monounsaturatedFat", "polyunsaturatedFat"].includes(value)) return "g";
  if (["calcium", "iron", "magnesium", "potassium", "sodium", "zinc", "vitaminC", "cholesterol", "caffeine"].includes(value)) return "mg";
  if (["vitaminA", "vitaminB12", "vitaminD", "folate", "iodine", "selenium"].includes(value)) return "µg";
  return "";
}

function formatDate(value) {
  return new Intl.DateTimeFormat(currentLanguage === "de" ? "de-DE" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat(currentLanguage === "de" ? "de-DE" : "en-US", { maximumFractionDigits: 1 }).format(value);
}

function isLocalPreview() {
  return ["127.0.0.1", "localhost"].includes(window.location.hostname);
}

// Local development has no visits, so the dashboard shows a believable
// sample to design against, like the food inbox's preview reports.
function previewVisits(data) {
  const daily = data.daily.map((point, index) => {
    const weekday = new Date(`${point.day}T00:00:00Z`).getUTCDay();
    const trend = 14 + index * 0.35;
    const visitors = Math.round(trend * (weekday === 0 || weekday === 6 ? 0.7 : 1) + Math.abs(Math.sin(index * 1.7)) * 9);
    return { day: point.day, visitors, views: Math.round(visitors * 1.6) };
  });
  const visitors = daily.reduce((sum, point) => sum + point.visitors, 0);
  const views = daily.reduce((sum, point) => sum + point.views, 0);
  const share = (entries) => entries.map(([value, fraction]) => ({ value, visitors: Math.round(visitors * fraction), views: Math.round(views * fraction) }));
  return {
    ...data,
    daily,
    totals: { visitors, views },
    previous: { visitors: Math.round(visitors * 0.82), views: Math.round(views * 0.86) },
    breakdowns: {
      pages: share([["/", 0.86], ["/privacy/", 0.09], ["/terms/", 0.05]]),
      sources: share([[null, 0.48], ["news.ycombinator.com", 0.21], ["google.com", 0.14], ["testflight", 0.09], ["reddit.com", 0.05], ["t.co", 0.03]]),
      countries: share([["DE", 0.41], ["US", 0.24], ["GB", 0.09], ["AT", 0.07], ["CH", 0.06], ["JP", 0.05], ["NL", 0.04], [null, 0.04]]),
    },
  };
}

function previewReports() {
  const now = Date.now();
  const report = (id, minutesAgo, values) => ({
    id: `preview-${id}`,
    createdAt: new Date(now - minutesAgo * 60_000).toISOString(),
    updatedAt: new Date(now - minutesAgo * 60_000).toISOString(),
    flow: "log",
    locale: "en-DE",
    market: "germany",
    appVersion: "0.5.0",
    buildNumber: "109",
    catalogVersion: "Preview catalogue",
    status: "new",
    note: null,
    logText: null,
    items: [],
    preview: true,
    ...values,
  });
  const food = (values) => ({
    productId: `preview-${Math.random().toString(36).slice(2)}`,
    source: "Preview",
    amount: 100,
    unit: "gram",
    nutritionBasis: "per100Grams",
    nutrients: {},
    estimatedNutrients: [],
    ...values,
  });

  return [
    report("banana", 2, {
      rating: "positive",
      reasons: [],
      logText: "banana",
      items: [food({ name: "Banana", query: "banana", amount: 1, unit: "serving", nutrients: { calories: 105, carbs: 27, protein: 1.3, fat: 0.4, fiber: 3.1, potassium: 422 } })],
    }),
    report("egg", 7, {
      rating: "negative",
      reasons: ["wrong_match"],
      logText: "egg",
      note: "That is an aubergine, not an egg.",
      items: [food({ name: "Eggplant, cooked", query: "egg", amount: 1, unit: "serving", nutrients: { calories: 35, carbs: 8.7, protein: 0.8, fat: 0.2 } })],
    }),
    report("long-meal", 13, {
      rating: "negative",
      reasons: ["serving", "extra_product", "too_slow"],
      logText: "A very large homemade dinner with two heaped ladles of lentil and sweet potato curry, about half a packet of microwave brown rice, cucumber salad with yoghurt and herbs, one piece of warm naan, and a small spoonful of mango chutney because I went back for just a little more after finishing the first plate",
      note: "The portions feel much too small. This was a big dinner and the rice alone was probably closer to 300 grams. I also cannot tell whether the oil used for frying the onions was included.",
      items: [
        food({ name: "Lentil and sweet potato curry, homemade", query: "two heaped ladles lentil and sweet potato curry", amount: 420, nutrients: { calories: 612, carbs: 89, protein: 26, fat: 18, fiber: 24, sugar: 17, sodium: 830, iron: 7.4 } }),
        food({ name: "Brown basmati rice, microwave pouch", brand: "Very Long Supermarket Own Brand Name", query: "half a packet microwave brown rice", amount: 300, nutrients: { calories: 444, carbs: 91, protein: 10, fat: 4.1, fiber: 5.7 } }),
        food({ name: "Cucumber yoghurt salad with dill, mint, lemon and garlic", query: "cucumber salad with yoghurt and herbs", amount: 180, nutrients: { calories: 128, carbs: 9.4, protein: 7.1, fat: 7.5, calcium: 214 } }),
        food({ name: "Garlic and coriander naan bread", query: "one piece warm naan", amount: 1, unit: "serving", nutrients: { calories: 316, carbs: 54, protein: 9.2, fat: 7.6 } }),
        food({ name: "Mango chutney", query: "small spoonful mango chutney", amount: 18, nutrients: { calories: 42, carbs: 10.5, sugar: 9.8 } }),
      ],
    }),
    report("barcode", 21, {
      rating: "negative",
      status: "reviewing",
      reasons: ["barcode_or_scan"],
      logText: "Scanned the label",
      note: "The barcode belongs to the vanilla one. I scanned chocolate.",
      flow: "barcode",
      items: [food({ name: "High Protein Pudding Vanilla Flavour Limited Family Multipack", brand: "Fit & Fine Protein Kitchen", query: "Barcode 4000000000009", barcode: "4000000000009", amount: 200, nutrients: { calories: 152, protein: 20, carbs: 13, fat: 2.8, sugar: 8.4, sodium: 210 } })],
    }),
    report("missing", 29, {
      rating: "negative",
      reasons: ["missing_product"],
      logText: "Grandma’s plum dumplings",
      note: "Nothing remotely similar appeared.",
      items: [],
      unmatched: ["Grandma’s plum dumplings"],
    }),
    report("nutrition", 35, {
      rating: "negative",
      status: "reviewing",
      reasons: ["nutrition"],
      logText: "one café oat latte",
      note: "Nine hundred calories for one normal cup cannot be right.",
      items: [food({ name: "Oat milk latte", query: "one café oat latte", amount: 1, unit: "serving", nutrients: { calories: 912, carbs: 112, protein: 8.4, fat: 44, sugar: 78, saturatedFat: 18, sodium: 640, caffeine: 128 } })],
    }),
    report("espresso", 42, {
      rating: "positive",
      reasons: [],
      logText: "espresso",
      items: [food({ name: "Espresso", query: "espresso", amount: 30, unit: "milliliter", nutrients: { calories: 2, carbs: 0.4, protein: 0.1, caffeine: 64 } })],
    }),
    report("resolved-oats", 49, {
      rating: "negative",
      status: "fixed",
      reasons: ["nutrition"],
      logText: "overnight oats with blueberries and almond butter",
      note: "The almond butter was missing from the calories and fat.",
      items: [food({ name: "Overnight oats with blueberries", query: "overnight oats with blueberries and almond butter", amount: 1, unit: "serving", nutrients: { calories: 418, carbs: 54, protein: 15, fat: 18, fiber: 11, sugar: 16 } })],
    }),
    report("german", 58, {
      rating: "negative",
      reasons: ["wrong_match"],
      locale: "de-DE",
      logText: "Zwei Scheiben dunkles Roggenbrot mit körnigem Frischkäse, ein weich gekochtes Ei, Radieschen, Gurke und ziemlich viel Schnittlauch; dazu ein großer Milchkaffee mit ungesüßter Hafermilch",
      note: "Der Kaffee fehlt komplett und aus dem körnigen Frischkäse wurde normaler Doppelrahmfrischkäse. Das verändert Eiweiß und Kalorien deutlich.",
      items: [
        food({ name: "Roggenvollkornbrot", query: "zwei Scheiben dunkles Roggenbrot", amount: 110, nutrients: { calories: 238, carbs: 42, protein: 7.7, fat: 2.4, fiber: 8.8 } }),
        food({ name: "Doppelrahmfrischkäse", query: "körniger Frischkäse", amount: 80, nutrients: { calories: 272, protein: 4.8, carbs: 2.7, fat: 26.4 } }),
        food({ name: "Ei, weich gekocht", query: "ein weich gekochtes Ei", amount: 1, unit: "serving", nutrients: { calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, vitaminB12: 0.6 } }),
      ],
    }),
    report("apple", 73, {
      rating: "positive",
      status: "fixed",
      reasons: [],
      logText: "🍎",
      note: "Exactly right.",
      items: [food({ name: "Apple", query: "🍎", amount: 182, nutrients: { calories: 95, carbs: 25, protein: 0.5, fat: 0.3, fiber: 4.4, sugar: 19 } })],
    }),
    report("micros", 91, {
      rating: "negative",
      reasons: ["nutrition"],
      logText: "green smoothie after gym",
      note: "The macros look believable, but the micronutrients are almost all zero even though it contains spinach, kiwi and yoghurt.",
      items: [food({ name: "Spinach kiwi yoghurt smoothie with chia seeds and fresh ginger", query: "green smoothie after gym", amount: 520, unit: "milliliter", nutrients: { calories: 386, protein: 24.2, carbs: 48, fat: 12.3, fiber: 13.8, sugar: 29, saturatedFat: 3.2, calcium: 0, iron: 0, magnesium: 0, potassium: 0, sodium: 0, zinc: 0, vitaminA: 0, vitaminB12: 0, vitaminC: 0, vitaminD: 0, folate: 0, iodine: 0, selenium: 0 } })],
    }),
    report("no-text", 118, {
      rating: "negative",
      reasons: ["other"],
      note: "Opened this from an old result, so there is no original sentence. The brand spelling is odd.",
      items: [food({ name: "CRNCHY CRML PRTN BR", brand: "Unknown", query: null, amount: 55, nutrients: { calories: 214, protein: 19, carbs: 21, fat: 7.4 } })],
    }),
    report("huge-name", 147, {
      rating: "negative",
      reasons: ["serving"],
      logText: "half of one of those giant bakery cookies",
      note: "The result says one gram instead of half a cookie.",
      items: [food({ name: "Triple Chocolate Chunk Cookie with Dark Chocolate, Milk Chocolate, White Chocolate and Salted Caramel Centre", brand: "The Neighbourhood Bakery at the Corner with the Blue Awning", query: "half of one of those giant bakery cookies", amount: 1, nutrients: { calories: 4.9, protein: 0.1, carbs: 0.6, fat: 0.3 } })],
    }),
  ];
}

selectLanguage(currentLanguage, false);
