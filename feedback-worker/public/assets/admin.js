const reports = document.querySelector("#reports");
const state = document.querySelector("#state");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const pageLinks = [...document.querySelectorAll("[data-page-link]")];
const pageViews = [...document.querySelectorAll("[data-page]")];
const playfulEmojis = [...document.querySelectorAll(".playful-emoji")];
const logoutLink = document.querySelector("[data-logout]");
const languageButtons = [...document.querySelectorAll("[data-language-target]")];
const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let activeFilter = "open";
let allReports = [];
let activePanel = null;
let panelTrigger = null;
let feedbackLoaded = false;
let currentLanguage = root.dataset.language === "de" ? "de" : "en";

const translations = {
  en: {
    languageGroupLabel: "Choose a language", languageEnglishLabel: "View in English", languageGermanLabel: "View in German",
    homeLabel: "Akari home", adminPagesLabel: "Admin pages", dashboardNavLabel: "Dashboard", foodReviewNavLabel: "Food review", logoutLabel: "Log out",
    dashboardTitle: "Dashboard", dashboardLede: "A clearer view of how Akari is being used.", dashboardEmojiLabel: "Play with the dashboard emoji",
    comingSoon: "Coming soon", analyticsTitle: "Akari analytics", analyticsBody: "Downloads, revenue, subscriptions, and the metrics that show how Akari is growing will appear here.",
    foodReviewTitle: "Food review", foodReviewLede: "Review what worked and what needs fixing.", foodReviewEmojiLabel: "Play with the food review emoji",
    feedbackSummaryLabel: "Feedback summary", open: "Open", confirmed: "Confirmed", resolved: "Resolved", loadingFeedback: "Loading feedback…",
    pageTitleDashboard: "Akari: Dashboard", pageTitleFeedback: "Akari: Food Review",
    tableIssue: "Issue", tableInput: "What they entered", tableComment: "Comment", tableMatch: "Matched result", tableActions: "Actions",
    openDetails: "Open details for {title}", noComment: "No comment", noMatchData: "No match data",
    copyPrompt: "Copy prompt", copied: "Copied", tryAgain: "Try again", reopen: "Reopen", resolve: "Resolve", reopening: "Reopening", resolving: "Resolving", reopened: "Reopened", resolved: "Resolved",
    closeDetails: "Close food review details", foodDetails: "Food details", issueSectionTitle: "Issue", logInput: "Log input", typedInLog: "Typed in Log", originalLogMissing: "The original Log text was not captured for this report.", feedbackComment: "Feedback comment",
    foodItems: "Food items · {count}", noFoodResult: "No food result data was attached.", reportDetails: "Report details", received: "Received", market: "Market", locale: "Locale", app: "App", catalogue: "Catalogue",
    searchSentence: "Search sentence", noSearchPhrase: "No separate search phrase was recorded.", macros: "Macros · {basis}", micronutrients: "Micronutrients · {basis}", nutritionBasis: "Nutrition basis", barcode: "Barcode", estimated: "Estimated",
    emptyConfirmedTitle: "No confirmed results yet", emptyConfirmedBody: "Matches people approve will collect here.", emptyOpenTitle: "You’re all caught up", emptyOpenBody: "New food reports will appear here.", emptyResolvedTitle: "Nothing resolved yet", emptyResolvedBody: "Completed fixes will collect here.",
    foodResult: "Food result", resultRight: "This result was right", wrongFoodMatch: "Wrong food match", wrongFoodIcon: "The food icon is wrong", nutritionWrong: "Nutrition looks wrong", servingWrong: "Serving or amount looks wrong", barcodeWrong: "Barcode or scan looks wrong", productMissing: "A product is missing", extraProduct: "Too many foods were added", tooSlow: "The result took too long", resultNeedsAttention: "This result needs attention",
    match: "Match", icon: "Icon", nutrition: "Nutrition", portion: "Portion", scan: "Scan", missing: "Missing", extra: "Extra", slow: "Slow", other: "Other",
    unitServing: "serving", basisPer100g: "per 100 g", basisPerServing: "per serving",
    label_fixed: "Resolved", label_calories: "Calories", label_protein: "Protein", label_carbs: "Carbs", label_fat: "Fat", label_fiber: "Fiber", label_sugar: "Sugar", label_water: "Water", label_saturatedFat: "Saturated fat", label_monounsaturatedFat: "Monounsaturated fat", label_polyunsaturatedFat: "Polyunsaturated fat", label_calcium: "Calcium", label_iron: "Iron", label_magnesium: "Magnesium", label_potassium: "Potassium", label_sodium: "Sodium", label_zinc: "Zinc", label_vitaminA: "Vitamin A", label_vitaminB12: "Vitamin B12", label_vitaminC: "Vitamin C", label_vitaminD: "Vitamin D", label_folate: "Folate", label_iodine: "Iodine", label_selenium: "Selenium", label_cholesterol: "Cholesterol", label_caffeine: "Caffeine",
  },
  de: {
    languageGroupLabel: "Sprache wählen", languageEnglishLabel: "Seite auf Englisch anzeigen", languageGermanLabel: "Seite auf Deutsch anzeigen",
    homeLabel: "Akari Startseite", adminPagesLabel: "Admin-Seiten", dashboardNavLabel: "Übersicht", foodReviewNavLabel: "Essensfeedback", logoutLabel: "Abmelden",
    dashboardTitle: "Übersicht", dashboardLede: "Ein klarer Blick darauf, wie Akari genutzt wird.", dashboardEmojiLabel: "Mit dem Übersichts-Emoji spielen",
    comingSoon: "Demnächst", analyticsTitle: "Akari Analysen", analyticsBody: "Downloads, Umsatz, Abonnements und weitere Kennzahlen zum Wachstum von Akari werden hier angezeigt.",
    foodReviewTitle: "Essensfeedback", foodReviewLede: "Prüfe, was funktioniert hat und was korrigiert werden muss.", foodReviewEmojiLabel: "Mit dem Essensfeedback-Emoji spielen",
    feedbackSummaryLabel: "Zusammenfassung der Rückmeldungen", open: "Offen", confirmed: "Bestätigt", resolved: "Erledigt", loadingFeedback: "Rückmeldungen werden geladen…",
    pageTitleDashboard: "Akari: Übersicht", pageTitleFeedback: "Akari: Essensfeedback",
    tableIssue: "Problem", tableInput: "Eingabe", tableComment: "Kommentar", tableMatch: "Gefundenes Ergebnis", tableActions: "Aktionen",
    openDetails: "Details öffnen: {title}", noComment: "Kein Kommentar", noMatchData: "Keine Ergebnisdaten",
    copyPrompt: "Prompt kopieren", copied: "Kopiert", tryAgain: "Erneut versuchen", reopen: "Wieder öffnen", resolve: "Erledigen", reopening: "Wird geöffnet", resolving: "Wird erledigt", reopened: "Wieder geöffnet", resolved: "Erledigt",
    closeDetails: "Details der Essensrückmeldung schließen", foodDetails: "Lebensmitteldetails", issueSectionTitle: "Problem", logInput: "Eingabe im Log", typedInLog: "Im Log eingegeben", originalLogMissing: "Die ursprüngliche Eingabe wurde für diese Rückmeldung nicht gespeichert.", feedbackComment: "Kommentar zur Rückmeldung",
    foodItems: "Lebensmittel · {count}", noFoodResult: "Es wurden keine Lebensmitteldaten angehängt.", reportDetails: "Details zur Rückmeldung", received: "Eingegangen", market: "Markt", locale: "Sprache", app: "App", catalogue: "Katalog",
    searchSentence: "Suchtext", noSearchPhrase: "Es wurde kein eigener Suchtext gespeichert.", macros: "Makronährstoffe · {basis}", micronutrients: "Mikronährstoffe · {basis}", nutritionBasis: "Bezugsmenge", barcode: "Barcode", estimated: "Geschätzt",
    emptyConfirmedTitle: "Noch keine bestätigten Ergebnisse", emptyConfirmedBody: "Bestätigte Treffer werden hier gesammelt.", emptyOpenTitle: "Alles erledigt", emptyOpenBody: "Neue Rückmeldungen erscheinen hier.", emptyResolvedTitle: "Noch nichts erledigt", emptyResolvedBody: "Abgeschlossene Korrekturen werden hier gesammelt.",
    foodResult: "Lebensmittelergebnis", resultRight: "Dieses Ergebnis war richtig", wrongFoodMatch: "Falsches Lebensmittel", wrongFoodIcon: "Das Symbol passt nicht", nutritionWrong: "Nährwerte sind falsch", servingWrong: "Portion oder Menge ist falsch", barcodeWrong: "Barcode oder Scan ist falsch", productMissing: "Ein Produkt fehlt", extraProduct: "Zu viele Einträge wurden hinzugefügt", tooSlow: "Das Ergebnis hat zu lange gedauert", resultNeedsAttention: "Dieses Ergebnis muss geprüft werden",
    match: "Zuordnung", icon: "Symbol", nutrition: "Nährwerte", portion: "Portion", scan: "Scan", missing: "Fehlend", extra: "Extras", slow: "Langsam", other: "Sonstiges",
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
  if (page !== "feedback") closeReportPanel();
  if (page === "feedback" && !feedbackLoaded) {
    feedbackLoaded = true;
    load();
  }
}

window.addEventListener("hashchange", syncPage);

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
    render(allReports);
  });
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

function render(items) {
  const unresolved = items.filter((item) => !["fixed", "dismissed"].includes(item.status));
  const resolved = items.filter((item) => item.status === "fixed");
  const open = unresolved.filter((item) => item.rating === "negative");
  const confirmed = unresolved.filter((item) => item.rating === "positive");
  const visible = activeFilter === "positive" ? confirmed
      : activeFilter === "resolved" ? resolved
        : open;

  document.querySelector("#open-count").textContent = open.length;
  document.querySelector("#positive-count").textContent = confirmed.length;
  document.querySelector("#resolved-count").textContent = resolved.length;
  reports.replaceChildren();
  if (!visible.length) {
    reports.append(emptyState());
    return;
  }
  reports.append(reportTableHeader());
  for (const item of visible) reports.append(reportCard(item));
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
  if (report.logText) {
    title.append(element("h2", "log-text", report.logText));
  } else {
    title.append(element("h2", "log-text", resultNames(report)));
  }

  const comment = element("div", "comment-cell");
  if (report.note) {
    comment.append(element("p", "row-comment", `“${report.note}”`));
  } else {
    comment.append(element("span", "no-comment", t("noComment")));
  }

  const matches = matchCell(report);
  const actions = reportActions(report);
  actions.classList.add("action-cell");
  row.append(issue, title, matches, comment, actions);
  card.append(row);
  return card;
}

function reportTableHeader() {
  const header = element("div", "report-columns");
  for (const title of [t("tableIssue"), t("tableInput"), t("tableMatch"), t("tableComment"), t("tableActions")]) {
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
  const isResolved = report.status === "fixed";
  const resolve = element("button", `resolve-button ${isResolved ? "reopen" : ""}`);
  if (isPanel) resolve.classList.add("panel-cta");
  resolve.type = "button";
  setButtonState(
    resolve,
    isResolved ? t("reopen") : t("resolve"),
    "idle",
    isPanel ? null : (isResolved ? "arrow.uturn.backward.png" : "checkmark.png"),
  );
  resolve.addEventListener("click", async () => {
    resolve.disabled = true;
    if (report.preview) {
      report.status = isResolved ? "new" : "fixed";
      setButtonState(resolve, isResolved ? t("reopened") : t("resolved"), "success");
      setTimeout(() => finishStatusChange(report.id, true), 560);
      return;
    }
    setButtonState(resolve, isResolved ? t("reopening") : t("resolving"), "loading");
    try {
      const response = await fetch(`/admin-api/reports/${encodeURIComponent(report.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: isResolved ? "new" : "fixed" }),
      });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      setButtonState(resolve, isResolved ? t("reopened") : t("resolved"), "success");
      setTimeout(() => finishStatusChange(report.id, report.preview), 560);
    } catch {
      resolve.disabled = false;
      setButtonState(resolve, t("tryAgain"), "error");
    }
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
    const check = element("span", "button-check", "✓");
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

function finishStatusChange(reportId, isPreview = false) {
  if (activePanel) closeReportPanel();
  const row = [...document.querySelectorAll(".report")]
    .find((candidate) => candidate.dataset.reportId === reportId);
  if (!row) {
    if (isPreview) {
      render(allReports);
    } else {
      load();
    }
    return;
  }
  row.style.maxHeight = `${row.getBoundingClientRect().height}px`;
  row.getBoundingClientRect();
  row.classList.add("is-leaving");
  requestAnimationFrame(() => { row.style.maxHeight = "0px"; });
  setTimeout(() => {
    if (isPreview) {
      render(allReports);
    } else {
      load();
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
  const close = element("button", "panel-close", "×");
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
  const subline = [item.brand, item.source].filter(Boolean).join(" · ");
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
  const icon = element("span", "empty-icon", ["positive", "resolved"].includes(activeFilter) ? "✓" : "✦");
  icon.setAttribute("aria-hidden", "true");
  const copy = element("div", "empty-copy");
  if (activeFilter === "resolved") {
    copy.append(
      element("h2", "", t("emptyResolvedTitle")),
      element("p", "", t("emptyResolvedBody")),
    );
  } else if (activeFilter === "positive") {
    copy.append(
      element("h2", "", t("emptyConfirmedTitle")),
      element("p", "", t("emptyConfirmedBody")),
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
  for (const [index, item] of (report.items ?? []).entries()) {
    const identity = [item.name, item.brand].filter(Boolean).join(" · ");
    lines.push(`Food ${index + 1}: ${identity}`);
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
  if (report.rating === "positive") return t("resultRight");
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
  return t("resultNeedsAttention");
}

function feedbackReasonShortTitle(reason) {
  if (reason === "wrong_match") return t("match");
  if (reason === "wrong_icon") return t("icon");
  if (reason === "nutrition") return t("nutrition");
  if (reason === "serving") return t("portion");
  if (reason === "barcode_or_scan") return t("scan");
  if (reason === "missing_product") return t("missing");
  if (reason === "extra_product") return t("extra");
  if (reason === "too_slow") return t("slow");
  return t("other");
}

function feedbackReasons(report) {
  if (report.rating === "positive") return [];
  return [...new Set(report.reasons?.length ? report.reasons : ["other"])];
}

function issueToneClass(report, reason) {
  if (report.rating === "positive") return "issue-confirmed";
  return `issue-${reason.replaceAll("_", "-")}`;
}

function appendIssuePills(container, report, compact = false) {
  if (report.rating === "positive") {
    const pill = element("span", `issue-pill ${compact ? "row-pill " : ""}positive issue-confirmed`);
    pill.append(element("span", "issue-text", t("confirmed")));
    container.append(pill);
    return;
  }

  for (const reason of feedbackReasons(report)) {
    const pill = element("span", `issue-pill ${compact ? "row-pill " : ""}${issueToneClass(report, reason)}`);
    pill.append(element("span", "issue-text", feedbackReasonShortTitle(reason)));
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
