// The app's headline emoji is a tiny toy: drag it, or tap it to make a heart pop.
document.documentElement.classList.add("has-js");

const playfulEmojis = document.querySelectorAll(".playful-emoji");
const creditsHeart = document.querySelector(".credits-heart");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const themeInputs = document.querySelectorAll('input[name="akari-theme"]');
const appearanceInputs = document.querySelectorAll('input[name="akari-color-mode"]');
const themeColorTags = document.querySelectorAll('meta[name="theme-color"]');
const themeTransitionLayer = document.querySelector(".hero-image--transition");
const systemColorScheme = window.matchMedia("(prefers-color-scheme: dark)");
let activeTheme = document.querySelector('input[name="akari-theme"]:checked')?.value || "canyon";
let themeTransitionRequest = 0;
let appearanceMode = "auto";

const themes = {
  meadow: {
    image: "assets/wasserkuppe.png",
    focus: "50% center",
    colors: { dark: "#1a1812", light: "#f1eaca" },
  },
  coast: {
    image: "assets/loch-tay.png",
    focus: "52% center",
    colors: { dark: "#12171a", light: "#cae2f1" },
  },
  forest: {
    image: "assets/shiratani.png",
    focus: "50% center",
    colors: { dark: "#161a12", light: "#e1f1ca" },
  },
  canyon: {
    image: "assets/green-river-overlook.png",
    focus: "61% center",
    colors: { dark: "#1a1412", light: "#f1d7ca" },
  },
};

function crossfadeTheme(nextThemeName) {
  const previousTheme = themes[activeTheme];
  const nextTheme = themes[nextThemeName];
  activeTheme = nextThemeName;

  if (!themeTransitionLayer || !previousTheme || !nextTheme || reduceMotion.matches) return;

  const request = ++themeTransitionRequest;
  themeTransitionLayer.classList.remove("is-fading");
  themeTransitionLayer.style.backgroundImage = `url("${previousTheme.image}")`;
  themeTransitionLayer.style.backgroundPosition = previousTheme.focus;
  themeTransitionLayer.style.opacity = "1";

  const preloader = new Image();
  const revealNextTheme = () => {
    if (request !== themeTransitionRequest) return;
    requestAnimationFrame(() => {
      themeTransitionLayer.classList.add("is-fading");
      themeTransitionLayer.style.opacity = "0";
    });
  };

  preloader.addEventListener("load", revealNextTheme, { once: true });
  preloader.addEventListener("error", revealNextTheme, { once: true });
  preloader.src = nextTheme.image;
}

function selectTheme(themeName) {
  const theme = themes[themeName];
  if (!theme) return;

  document.documentElement.dataset.theme = themeName;
  updateThemeColorTags(themeName);
}

function resolvedColorMode() {
  return appearanceMode === "auto" ? (systemColorScheme.matches ? "dark" : "light") : appearanceMode;
}

function updateThemeColorTags(themeName = activeTheme) {
  const theme = themes[themeName];
  if (!theme) return;

  themeColorTags.forEach((tag) => {
    tag.content = appearanceMode === "auto" ? theme.colors[tag.dataset.colorScheme] : theme.colors[resolvedColorMode()];
  });
}

function setAppearance(mode, persist = true) {
  appearanceMode = ["auto", "light", "dark"].includes(mode) ? mode : "auto";

  if (appearanceMode === "auto") {
    delete document.documentElement.dataset.colorMode;
  } else {
    document.documentElement.dataset.colorMode = appearanceMode;
  }

  appearanceInputs.forEach((input) => {
    input.checked = input.value === appearanceMode;
  });

  if (persist) {
    try { localStorage.setItem("akari-color-mode", appearanceMode); } catch (error) {}
  }

  updateThemeColorTags();
}

themeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (!input.checked) return;
    crossfadeTheme(input.value);
    selectTheme(input.value);
  });
});

appearanceInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (input.checked) setAppearance(input.value);
  });
});

try {
  setAppearance(localStorage.getItem("akari-color-mode") || "auto", false);
} catch (error) {
  setAppearance("auto", false);
}

systemColorScheme.addEventListener?.("change", () => {
  if (appearanceMode === "auto") updateThemeColorTags();
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

creditsHeart.addEventListener("click", () => {
  window.location.href = "credits.html";
});

// Every trackable Akari item, resolved through the same titles, SF Symbols,
// values, colors, and visual families used by TrackEntryBuilder in the app.
const widgetRows = {
  vitals: [
    { id: "rhr", title: "RHR Baseline", short: "RHR", symbol: "heart.fill", color: "#eb4030", rgb: "235, 64, 48", value: "48.0", unit: "bpm", rating: "Excellent", ratingColor: "#28a0a8", style: "sparkline", size: "medium", fraction: 0.2, series: [51, 50, 50, 49, 50, 49, 48, 49, 48, 48] },
    { id: "energy", title: "Active Energy", short: "Energy", symbol: "flame.fill", color: "#ff9f0a", rgb: "255, 159, 10", value: "684", unit: "kcal", rating: "Excellent", ratingColor: "#28a0a8", style: "arc", size: "small", fraction: 1 },
    { id: "hrv", title: "Heart Rate Variability", short: "HRV", symbol: "waveform.path.ecg", color: "#f27593", rgb: "242, 117, 147", value: "89", unit: "ms", rating: "Excellent", ratingColor: "#28a0a8", style: "gauge", size: "medium", fraction: 0.88 },
    { id: "exercise", title: "Exercise", short: "Move", symbol: "stopwatch.fill", color: "#63e6be", rgb: "99, 230, 190", value: "45", unit: "min", rating: "Excellent", ratingColor: "#28a0a8", style: "radial", size: "small", fraction: 1 },
    { id: "steps", title: "Steps", short: "Steps", symbol: "figure.walk", color: "#30c759", rgb: "48, 199, 89", value: "11,907", unit: "steps", rating: "Excellent", ratingColor: "#28a0a8", style: "steps", size: "medium", fraction: 1 },
    { id: "vo2", title: "VO₂ Max", short: "VO₂", symbol: "lungs.fill", color: "#409cff", rgb: "64, 156, 255", value: "52.7", unit: "ml/kg·min", rating: "Excellent", ratingColor: "#28a0a8", style: "arc", size: "small", fraction: 0.82 },
    { id: "sleep", title: "Sleep", short: "Sleep", symbol: "moon.zzz.fill", color: "#6f75f5", rgb: "111, 117, 245", value: "7h 42m", unit: "", rating: "Good", ratingColor: "#30a958", style: "sleep", size: "medium", fraction: 0.67 },
    { id: "oxygen", title: "Blood Oxygen", short: "SpO₂", symbol: "drop.fill", color: "#64d2ff", rgb: "100, 210, 255", value: "98", unit: "%", rating: "Excellent", ratingColor: "#28a0a8", style: "radial", size: "small", fraction: 0.8 },
    { id: "resp", title: "Respiratory Rate", short: "Resp", symbol: "wind", color: "#30b0c7", rgb: "48, 176, 199", value: "13", unit: "br/min", rating: "Good", ratingColor: "#30a958", style: "wave", size: "medium", fraction: 0.31 },
  ],
  nutrition: [
    { id: "calories", title: "Calories", short: "Calories", symbol: "flame.fill", color: "#ff9f0a", rgb: "255, 159, 10", value: "873", unit: "kcal", subtitle: "of 2,630 kcal", style: "macro", size: "medium", fraction: 0.33 },
    { id: "carbs", title: "Carbohydrates", short: "Carbs", symbol: "laurel.leading", color: "#fcb315", rgb: "252, 179, 21", value: "147.0", unit: "g", subtitle: "of 329 g", style: "segmented", size: "small", fraction: 0.45 },
    { id: "protein", title: "Protein", short: "Protein", symbol: "fork.knife", color: "#f37f94", rgb: "243, 127, 148", value: "106.0", unit: "g", subtitle: "of 100 g", style: "strength", size: "medium", fraction: 1 },
    { id: "fat", title: "Fat", short: "Fat", symbol: "drop.fill", color: "#b2b73e", rgb: "178, 183, 62", value: "40.0", unit: "g", subtitle: "of 88 g", style: "segmented", size: "small", fraction: 0.45 },
    { id: "fiber", title: "Fiber", short: "Fiber", symbol: "leaf.fill", color: "#30c759", rgb: "48, 199, 89", value: "11.0", unit: "g", subtitle: "of 30 g", style: "leaves", size: "medium", fraction: 0.37 },
    { id: "sugar", title: "Sugar", short: "Sugar", symbol: "cube.fill", color: "#f27593", rgb: "242, 117, 147", value: "36.0", unit: "g", subtitle: "limit 50 g", style: "ceiling", size: "small", fraction: 0.72 },
    { id: "sat-fat", title: "Saturated Fat", short: "Sat. Fat", symbol: "drop.triangle.fill", color: "#997333", rgb: "153, 115, 51", value: "8.0", unit: "g", subtitle: "limit 20 g", style: "ceiling", size: "medium", fraction: 0.4 },
    { id: "sodium", title: "Sodium", short: "Sodium", symbol: "s.circle.fill", color: "#6f75f5", rgb: "111, 117, 245", value: "1,561", unit: "mg", subtitle: "limit 2,300 mg", style: "ceiling", size: "small", fraction: 0.68 },
    { id: "magnesium", title: "Magnesium", short: "Magnesium", symbol: "bolt.fill", color: "#bf5af2", rgb: "191, 90, 242", value: "343", unit: "mg", subtitle: "of 400 mg", style: "radial", size: "medium", fraction: 0.86 },
    { id: "potassium", title: "Potassium", short: "Potassium", symbol: "k.circle.fill", color: "#30b0c7", rgb: "48, 176, 199", value: "2,922", unit: "mg", subtitle: "of 3,500 mg", style: "radial", size: "small", fraction: 0.83 },
    { id: "water", title: "Water", short: "Water", symbol: "waterbottle.fill", color: "#409cff", rgb: "64, 156, 255", value: "2,258", unit: "ml", subtitle: "of 2,905 ml", style: "wave", size: "medium", fraction: 0.78 },
  ],
};

const ratingColors = {
  Watch: "#db3d2e",
  Fair: "#d99926",
  Good: "#299e4d",
  Excellent: "#28a0a8",
};

const vitalZoneFractions = {
  rhr: [0.25, 0.2, 0.25, 0.3],
  hrv: [15 / 90, 20 / 90, 25 / 90, 30 / 90],
  steps: [4000 / 12000, 3500 / 12000, 2500 / 12000, 2000 / 12000],
  sleep: [2 / 7, 2 / 7, 2 / 7, 1 / 7],
  energy: [150 / 800, 200 / 800, 250 / 800, 200 / 800],
  exercise: [10 / 60, 10 / 60, 20 / 60, 20 / 60],
  vo2: [0.25, 0.25, 0.25, 0.25],
  oxygen: [0.2, 0.3, 0.2, 0.3],
  resp: [0.125, 0.125, 0.5, 0.25],
};

// Direct web counterparts of MetricDetailView and NutrientDetailView. The
// hierarchy, prose, range order, influence/source rows and day values mirror
// the app; only HealthKit fetching is replaced by the resolved demo snapshot.
const vitalDetails = {
  rhr: {
    status: "Excellent", line: "Very low, a hallmark of strong cardiovascular fitness.",
    explainer: "Your resting heart rate is how many times your heart beats per minute when you’re fully at rest. A lower number usually means a fit heart that pumps efficiently.",
    zones: [
      ["Excellent", "40–50", "Very low, a hallmark of strong cardiovascular fitness."],
      ["Good", "50–58", "A healthy resting rate. Your heart is pumping efficiently."],
      ["Fair", "58–68", "Slightly high. Usually fine, watch it if it keeps climbing."],
      ["Watch", "68–80", "Elevated. Can follow stress, poor sleep, illness, or low fitness."],
    ],
    influences: [["figure.run", "Endurance training lowers it over time"], ["moon.zzz.fill", "Poor sleep, stress, and alcohol raise it"], ["cup.and.saucer.fill", "Caffeine and dehydration nudge it up"]],
  },
  hrv: {
    status: "Excellent", line: "High variability, excellent recovery and adaptability.",
    explainer: "Heart rate variability is the small change in timing between heartbeats. More variation is generally a sign your nervous system is well-recovered and ready to adapt.",
    zones: [["Watch", "10–25", "Low variability, often tied to fatigue or high stress."], ["Fair", "25–45", "Moderate. Recovery is okay but has room to improve."], ["Good", "45–70", "Healthy variability, a sign of good recovery."], ["Excellent", "70–100", "High variability, excellent recovery and adaptability."]],
    influences: [["bed.double.fill", "Rises with good sleep and recovery"], ["exclamationmark.triangle.fill", "Drops with stress, illness, or overtraining"], ["wineglass.fill", "Alcohol the night before lowers it"]],
  },
  steps: {
    status: "Excellent", line: "Excellent, well past the usual 10k goal.",
    explainer: "Steps are a simple picture of how much you moved today. Regular walking supports your heart, mood, and metabolism. 7–10k a day is a common goal.",
    zones: [["Watch", "0–4,000", "A quiet day. A short walk would help."], ["Fair", "4,000–7,500", "Moving, but below the common daily target."], ["Good", "7,500–10,000", "A solid, active day on your feet."], ["Excellent", "10,000–12,000", "Excellent, well past the usual 10k goal."]],
    influences: [["figure.walk", "A short walk after meals adds up fast"], ["laptopcomputer", "Desk-bound days tend to run low"], ["figure.stairs", "Errands and stairs count too"]],
  },
  sleep: {
    status: "Good", line: "A full night in the healthy range.",
    explainer: "This is how long you actually slept last night, split into deep, core, and REM stages. Most adults feel their best on 7–9 hours.",
    zones: [["Watch", "3–5", "Short sleep. Recovery and focus usually suffer."], ["Fair", "5–7", "A little under. Most adults do best with 7–9 hours."], ["Good", "7–9", "A full night in the healthy range."], ["Fair", "9–10", "Long sleep, occasionally normal, watch if it’s a pattern."]],
    influences: [["clock.fill", "A consistent bedtime improves it"], ["cup.and.saucer.fill", "Late caffeine and alcohol fragment it"], ["iphone", "Screens and bright light before bed delay it"]],
  },
  energy: {
    status: "Excellent", line: "A very active day, great work.",
    explainer: "Active energy is the calories you burned by moving today, on top of what your body uses at rest. It reflects how physically active your day was.",
    zones: [["Watch", "0–150", "Low active energy today."], ["Fair", "150–350", "A moderate amount of movement."], ["Good", "350–600", "A good, active burn for the day."], ["Excellent", "600–800", "A very active day, great work."]],
    influences: [["figure.run", "Workouts and brisk walks add the most"], ["house.fill", "Standing and chores contribute too"], ["bed.double.fill", "Rest days will naturally be lower"]],
  },
  exercise: {
    status: "Excellent", line: "An excellent amount of exercise.",
    explainer: "Exercise minutes count time spent at a brisk pace or harder. Around 30 minutes on most days is a widely used guideline for staying healthy.",
    zones: [["Watch", "0–10", "Little dedicated exercise so far."], ["Fair", "10–20", "A short session, every bit counts."], ["Good", "20–40", "A solid workout for the day."], ["Excellent", "40–60", "An excellent amount of exercise."]],
    influences: [["figure.run", "Any brisk, continuous activity counts"], ["flame.fill", "Intensity matters as much as time"], ["bed.double.fill", "Rest days are part of a healthy pattern"]],
  },
  vo2: {
    status: "Excellent", line: "Excellent aerobic capacity.",
    explainer: "VO₂ max estimates how well your body uses oxygen when working hard. It’s one of the strongest markers of aerobic fitness and long-term health.",
    zones: [["Watch", "20–30", "Below-average aerobic fitness."], ["Fair", "30–40", "Average aerobic fitness for most adults."], ["Good", "40–50", "Good aerobic fitness."], ["Excellent", "50–60", "Excellent aerobic capacity."]],
    influences: [["figure.run", "Improves with regular cardio"], ["hourglass", "Declines slowly with age"], ["flame.fill", "Higher-intensity efforts raise it most"]],
  },
  oxygen: {
    status: "Excellent", line: "Excellent oxygen saturation.",
    explainer: "Blood oxygen (SpO₂) is the percentage of oxygen your red blood cells are carrying. Healthy readings usually sit between 95 and 100%.",
    zones: [["Watch", "90–92", "Low. Persistent readings here are worth a doctor’s look."], ["Fair", "92–95", "Slightly low, often normal at altitude or during sleep."], ["Good", "95–97", "A healthy blood-oxygen level."], ["Excellent", "97–100", "Excellent oxygen saturation."]],
    influences: [["moon.zzz.fill", "Often dips slightly during sleep"], ["mountain.2.fill", "Lower at high altitude"], ["applewatch", "Sensor fit affects the reading"]],
  },
  resp: {
    status: "Good", line: "Within the normal resting range.",
    explainer: "Respiratory rate is how many breaths you take per minute at rest. For most adults that’s about 12–20, and it’s often measured while you sleep.",
    zones: [["Watch", "8–10", "Low breathing rate, unusual while awake."], ["Fair", "10–12", "On the low side of the normal range."], ["Good", "12–20", "Within the normal resting range."], ["Watch", "20–24", "Elevated, can follow exertion, stress, or illness."]],
    influences: [["flame.fill", "Rises with exertion, stress, or fever"], ["lungs.fill", "Steady and low at rest is typical"], ["figure.run", "Fitness can lower your baseline"]],
  },
};

const nutrientDetails = {
  calories: { target: 2630, explainer: "Calories are the energy your food gives you. Balancing what you eat with what you burn is what keeps your weight steady over time.", sourcesTitle: "Good sources", sources: [["leaf.fill", "Whole foods keep you full for fewer calories"], ["fork.knife", "Protein and fiber curb appetite"], ["cup.and.saucer.fill", "Liquid calories add up fast"]] },
  carbs: { target: 329, explainer: "Carbohydrates are your body’s main and quickest source of energy, fueling your brain and muscles through the day.", sourcesTitle: "Good sources", sources: [["laurel.leading", "Oats, rice, and whole grains"], ["leaf.fill", "Fruit and starchy vegetables"], ["circle.grid.2x2.fill", "Beans and lentils"]] },
  protein: { target: 100, explainer: "Protein builds and repairs muscle, skin, and nearly every tissue. Spreading it across your meals helps your body use it best.", sourcesTitle: "Good sources", sources: [["fork.knife", "Chicken, fish, and eggs"], ["leaf.fill", "Beans, lentils, and tofu"], ["drop.fill", "Dairy and yogurt"]] },
  fat: { target: 88, explainer: "Dietary fat carries vitamins, supports your hormones, and keeps you full. The type matters more than the amount.", sourcesTitle: "Good sources", sources: [["fish.fill", "Oily fish and seafood"], ["leaf.fill", "Nuts, seeds, and avocado"], ["drop.fill", "Olive and other plant oils"]] },
  fiber: { target: 30, explainer: "Fiber keeps your digestion moving and feeds the good bacteria in your gut. Most people get less than they need.", sourcesTitle: "Good sources", sources: [["laurel.leading", "Whole grains and oats"], ["leaf.fill", "Vegetables and fruit with skin"], ["circle.grid.2x2.fill", "Beans, lentils, and nuts"]] },
  sugar: { target: 50, limit: true, explainer: "Sugar is fast energy, but added sugar brings calories with little else. Keeping it modest protects your teeth and metabolism.", sourcesTitle: "Where it hides", sources: [["cup.and.saucer.fill", "Soft drinks and juice"], ["birthday.cake.fill", "Sweets, pastries, and desserts"], ["takeoutbag.and.cup.and.straw.fill", "Hidden in sauces and cereals"]], note: "Too much added sugar spikes calories and feeds tooth decay. Around 50 g a day is a sensible ceiling." },
  "sat-fat": { target: 20, limit: true, explainer: "Saturated fat is fine in small amounts, but a lot of it can raise cholesterol. Swapping some for unsaturated fats helps your heart.", sourcesTitle: "Where it hides", sources: [["fork.knife", "Fatty and processed meats"], ["cube.fill", "Butter, cheese, and cream"], ["birthday.cake.fill", "Pastries and fried foods"]], note: "A lot of saturated fat can raise LDL cholesterol. Under about 20 g a day is a good cap for most adults." },
  sodium: { target: 2300, limit: true, explainer: "Sodium balances fluids and nerve signals, but most of us get far too much, mostly from processed food and salt.", sourcesTitle: "Where it hides", sources: [["takeoutbag.and.cup.and.straw.fill", "Processed and fast food"], ["fork.knife", "Cured meats and cheese"], ["cube.fill", "Table salt and sauces"]], note: "Consistently high sodium raises blood pressure and heart risk. The WHO suggests staying under 2,000 mg." },
  magnesium: { target: 400, explainer: "Magnesium powers hundreds of reactions in your body, from muscle and nerve function to steady energy.", sourcesTitle: "Good sources", sources: [["leaf.fill", "Nuts, seeds, and whole grains"], ["circle.grid.2x2.fill", "Leafy greens and legumes"], ["square.fill", "Dark chocolate"]] },
  potassium: { target: 3500, explainer: "Potassium balances fluids and blood pressure and keeps your heart and muscles working smoothly.", sourcesTitle: "Good sources", sources: [["leaf.fill", "Bananas, potatoes, and greens"], ["circle.grid.2x2.fill", "Beans and lentils"], ["fish.fill", "Fish and dairy"]] },
  water: { target: 2905, explainer: "Water runs almost everything in your body, temperature, joints, circulation. Even mild dehydration dents your focus and energy.", sourcesTitle: "Good sources", sources: [["waterbottle.fill", "Water and unsweetened drinks"], ["leaf.fill", "Fruit and vegetables"], ["cup.and.saucer.fill", "Tea and coffee count too"]] },
};

const allWidgetItems = [...widgetRows.vitals, ...widgetRows.nutrition];
const widgetItemById = new Map(allWidgetItems.map((item) => [item.id, item]));

function widgetSymbol(name) {
  return `<span class="widget-sf-symbol" style="--symbol: url('assets/sf-symbols/${name}.png')"></span>`;
}

function widgetHeader(item) {
  const title = item.size === "small" ? item.short : item.title;
  return `<header class="widget-header"><span class="widget-icon">${widgetSymbol(item.symbol)}</span><span>${title}</span>${item.size === "medium" ? '<i class="widget-chevron">›</i>' : ''}</header>`;
}

function widgetValue(item, showRating = true) {
  const rating = showRating && item.size !== "small" && item.rating
    ? `<em style="--rating-color:${item.ratingColor}">${item.rating}</em>`
    : "";
  return `<div class="widget-value"><strong>${item.value}</strong>${item.unit ? `<small>${item.unit}</small>` : ""}${rating}</div>`;
}

function segmentMeter(fraction, count = 22) {
  const lit = Math.round(Math.min(Math.max(fraction, 0), 1) * count);
  return `<div class="widget-segment-meter" aria-hidden="true">${Array.from({ length: count }, (_, index) => {
    const opacity = index < lit ? 0.45 + (0.55 * index) / Math.max(lit - 1, 1) : 0.14;
    return `<span><i class="${index < lit ? `is-lit${index === lit - 1 ? " is-last-lit" : ""}` : ""}" style="--fill-opacity:${opacity.toFixed(3)}"></i></span>`;
  }).join("")}</div>`;
}

function radialDots(fraction) {
  const count = 32;
  const lit = Math.round(Math.min(Math.max(fraction, 0), 1) * count);
  return `<div class="widget-radial" aria-hidden="true">${Array.from({ length: count }, (_, index) => `<i class="${index < lit ? "is-lit" : ""}" style="--dot-index:${index}"></i>`).join("")}</div>`;
}

function arcVisual(item) {
  const clamped = Math.min(Math.max(item.fraction, 0), 1);
  const angle = Math.PI + clamped * Math.PI;
  const x = 52 + 46 * Math.cos(angle);
  const y = 76 + 46 * Math.sin(angle);
  const gradientId = `arc-${item.id}`;
  return `<svg class="widget-arc" viewBox="0 0 104 78" aria-hidden="true"><defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--widget-accent)" stop-opacity=".5"></stop><stop offset="1" stop-color="var(--widget-accent)"></stop></linearGradient></defs><path d="M6 76a46 46 0 0 1 92 0" pathLength="1"></path><path class="widget-arc-value" d="M6 76a46 46 0 0 1 92 0" pathLength="1" style="stroke:url(#${gradientId});stroke-dasharray:${clamped} 1"></path><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="6.5"></circle></svg>`;
}

function stepTrail(count, fraction) {
  const lit = Math.max(Math.round(Math.min(Math.max(fraction, 0), 1) * count), fraction > 0 ? 1 : 0);
  return `<div class="widget-step-trail ${count > 8 ? "widget-step-trail--wide" : ""}" aria-hidden="true">${Array.from({ length: count }, (_, index) => {
    const opacity = index < lit ? 0.5 + (0.5 * index) / Math.max(lit - 1, 1) : 0.12;
    return `<span><i class="widget-shoe ${index < lit ? "is-lit" : ""}" style="--symbol:url('assets/sf-symbols/shoeprints.fill.png');--fill-opacity:${opacity.toFixed(3)}"></i></span>`;
  }).join("")}</div>`;
}

function waveVisual(item) {
  const height = item.size === "small" ? 30 : 44;
  const width = item.size === "small" ? 140 : 316;
  const level = height * (1 - Math.min(Math.max(item.fraction, 0.04), 1));
  const shape = (y, amplitude, waves, phase) => {
    const points = [];
    for (let x = 0; x <= width; x += 3) {
      points.push(`L${x} ${(y + Math.sin((x / width) * Math.PI * 2 * waves + phase) * amplitude).toFixed(2)}`);
    }
    return `M0 ${height}L0 ${y.toFixed(2)}${points.join("")}L${width} ${height}Z`;
  };
  const gradientId = `wave-${item.id}`;
  return `<svg class="widget-wave" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--widget-accent)"></stop><stop offset="1" stop-color="var(--widget-accent)" stop-opacity=".7"></stop></linearGradient></defs><path class="widget-wave-rear" d="${shape(level + 3, 4, 2.2, Math.PI)}"></path><path class="widget-wave-front" fill="url(#${gradientId})" d="${shape(level, 5, 1.8, 0)}"></path></svg>`;
}

function macroRing(size = 78) {
  const radius = (size - 15) / 2;
  const circumference = 2 * Math.PI * radius;
  const bands = [
    { fraction: 588 / 1372, color: "#fcb315", offset: 0 },
    { fraction: 424 / 1372, color: "#f37f94", offset: -(588 / 1372) },
    { fraction: 360 / 1372, color: "#b2b73e", offset: -(1012 / 1372) },
  ];
  return `<svg class="widget-macro-ring" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle class="widget-macro-track" cx="${size / 2}" cy="${size / 2}" r="${radius}" pathLength="1"></circle>${bands.map((band) => `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" pathLength="1" style="--ring-color:${band.color};stroke-dasharray:${band.fraction} ${1 - band.fraction};stroke-dashoffset:${band.offset}"></circle>`).join("")}</svg>`;
}

function sparklineVisual(item) {
  const values = item.series || [51, 49, 50, 48, 49, 47, 48];
  const width = 316;
  const height = 46;
  const padding = 7;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = Math.max(high - low, 0.0001);
  const points = values.map((value, index) => ({
    x: (index * width) / (values.length - 1),
    y: height - padding - ((value - low) / span) * (height - padding * 2),
  }));
  let line = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let index = 1; index < points.length; index += 1) {
    const p0 = points[index - 1];
    const p1 = points[index];
    const previous = points[Math.max(index - 2, 0)];
    const next = points[Math.min(index + 1, points.length - 1)];
    const c1 = { x: p0.x + (p1.x - previous.x) / 6, y: p0.y + (p1.y - previous.y) / 6 };
    const c2 = { x: p1.x - (next.x - p0.x) / 6, y: p1.y - (next.y - p0.y) / 6 };
    line += `C${c1.x.toFixed(2)} ${c1.y.toFixed(2)} ${c2.x.toFixed(2)} ${c2.y.toFixed(2)} ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }
  const last = points.at(-1);
  const gradientId = `spark-${item.id}`;
  return `<svg class="widget-sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--widget-accent)" stop-opacity=".48"></stop><stop offset="1" stop-color="var(--widget-accent)" stop-opacity=".03"></stop></linearGradient></defs><path class="sparkline-area" fill="url(#${gradientId})" d="M${points[0].x.toFixed(2)} ${height}L${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}${line.slice(line.indexOf("C"))}L${last.x.toFixed(2)} ${height}Z"></path><path class="sparkline-line" d="${line}"></path><circle class="sparkline-dot" cx="${last.x.toFixed(2)}" cy="${last.y.toFixed(2)}" r="4.5"></circle></svg>`;
}

function widgetVisual(item) {
  switch (item.style) {
    case "sparkline": return sparklineVisual(item);
    case "steps": return stepTrail(item.size === "small" ? 8 : 12, item.fraction);
    case "arc": return arcVisual(item);
    case "radial": return radialDots(item.fraction);
    case "wave": return waveVisual(item);
    case "gauge": return `<div class="widget-zone-bar" aria-hidden="true">${vitalZoneFractions[item.id].map((fraction, index) => `<span style="flex-basis:${fraction * 100}%;background:${["#db3d2e", "#d99926", "#299e4d", "#28a0a8"][index]}"></span>`).join("")}<i style="left:88%"></i></div>`;
    case "sleep": return '<div class="widget-sleep" aria-hidden="true"><div><i></i><i></i><i></i><i></i></div><p><span>Deep</span><span>Core</span><span>REM</span></p></div>';
    case "segmented": return segmentMeter(item.fraction);
    case "ceiling": return `<div class="widget-ceiling" aria-hidden="true"><i style="width:${Math.min(item.fraction * 84, 100)}%"></i><b></b></div>`;
    case "strength": return `<div class="widget-strength" aria-hidden="true">${Array.from({ length: 6 }, (_, index) => `<i class="${index < Math.max(1, Math.round(item.fraction * 6)) ? "is-lit" : ""}"></i>`).join("")}</div>`;
    case "leaves": {
      const count = item.size === "small" ? 6 : 9;
      const lit = Math.max(1, Math.round(item.fraction * count));
      return `<div class="widget-leaves" aria-hidden="true">${Array.from({ length: count }, (_, index) => `<span><i class="${index < lit ? "is-lit" : ""}" style="--symbol:url('assets/sf-symbols/leaf.fill.png');--fill-opacity:${index < lit ? (0.5 + (0.5 * index) / Math.max(lit - 1, 1)).toFixed(3) : 0.14}"></i></span>`).join("")}</div>`;
    }
    default: return "";
  }
}

function widgetBody(item) {
  if (item.style === "macro") {
    return `<div class="widget-split"><div>${widgetValue(item, false)}<p>${item.subtitle}</p></div>${macroRing()}</div><div class="widget-macro-legend"><span><i></i>Carbs <b>147 g</b></span><span><i></i>Protein <b>106 g</b></span><span><i></i>Fat <b>40 g</b></span></div>`;
  }

  const visual = widgetVisual(item);
  if (["arc", "radial"].includes(item.style) && item.size === "medium") {
    return `<div class="widget-split widget-split--center"><div>${widgetValue(item)}${item.subtitle ? `<p>${item.subtitle}</p>` : ""}</div>${visual}</div>`;
  }

  if (item.size === "medium" && item.subtitle) {
    return `<div class="widget-nutrition-value">${widgetValue(item)}<p>${item.subtitle}</p></div>${visual}`;
  }

  return `${widgetValue(item)}${item.subtitle && item.size === "medium" ? `<p>${item.subtitle}</p>` : ""}${visual}`;
}

function renderWidget(item) {
  return `<article class="widget widget--${item.size} track-widget track-widget--${item.id} track-widget--${item.style} akari-glass akari-glass--subdued" data-widget-id="${item.id}" role="button" tabindex="0" aria-label="Open ${item.title} detail" style="--widget-accent:${item.color};--widget-accent-rgb:${item.rgb};">${widgetHeader(item)}${widgetBody(item)}</article>`;
}

function detailSymbol(name) {
  return `<i class="detail-symbol" style="--symbol:url('assets/sf-symbols/${name}.png')" aria-hidden="true"></i>`;
}

function detailZoneGauge(item, detail) {
  return `<div class="detail-zone-gauge" style="--detail-knob:${ratingColors[detail.status]}" aria-hidden="true">${detail.zones.map((zone, index) => `<span style="flex-basis:${vitalZoneFractions[item.id][index] * 100}%;background:${ratingColors[zone[0]]}"></span>`).join("")}<i style="left:${Math.min(Math.max(item.fraction, 0), 1) * 100}%;background:${ratingColors[detail.status]}"></i></div>`;
}

function detailSleepVisual() {
  return '<div class="widget-sleep" aria-hidden="true"><div><i></i><i></i><i></i><i></i></div><p><span>Deep</span><span>Core</span><span>REM</span></p></div>';
}

function detailArcVisual(item) {
  const fraction = Math.min(Math.max(item.fraction, 0), 1);
  const radius = 124;
  const centerX = 130;
  const centerY = 138;
  const angle = Math.PI + fraction * Math.PI;
  const x = centerX + radius * Math.cos(angle);
  const y = centerY + radius * Math.sin(angle);
  const gradientId = `detail-arc-${item.id}`;
  const centerText = item.id === "energy" ? `${Math.round(fraction * 100)}%` : "";
  return `<div class="detail-arc-wrap"><svg class="detail-arc" viewBox="0 0 260 140" aria-hidden="true"><defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--detail-accent)" stop-opacity=".5"></stop><stop offset="1" stop-color="var(--detail-accent)"></stop></linearGradient></defs><path d="M6 138a124 124 0 0 1 248 0" pathLength="1"></path><path class="detail-arc-value" d="M6 138a124 124 0 0 1 248 0" pathLength="1" style="stroke:url(#${gradientId});stroke-dasharray:${fraction} 1"></path><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="6.5"></circle></svg>${centerText ? `<strong>${centerText}</strong>` : ""}</div>`;
}

function detailWaveVisual(item, height) {
  const width = 342;
  const level = height * (1 - Math.min(Math.max(item.fraction, 0.04), 1));
  const shape = (y, amplitude, waves, phase) => {
    const points = [];
    for (let x = 0; x <= width; x += 3) points.push(`L${x} ${(y + Math.sin((x / width) * Math.PI * 2 * waves + phase) * amplitude).toFixed(2)}`);
    return `M0 ${height}L0 ${y.toFixed(2)}${points.join("")}L${width} ${height}Z`;
  };
  const gradientId = `detail-wave-${item.id}`;
  return `<svg class="widget-wave" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--detail-accent)"></stop><stop offset="1" stop-color="var(--detail-accent)" stop-opacity=".7"></stop></linearGradient></defs><path class="widget-wave-rear" d="${shape(level + 3, 4, 2.2, Math.PI)}"></path><path class="widget-wave-front" fill="url(#${gradientId})" d="${shape(level, 5, 1.8, 0)}"></path></svg>`;
}

function detailHeroVisual(item, detail) {
  if (vitalDetails[item.id]) {
    if (["rhr", "hrv"].includes(item.id)) return detailZoneGauge(item, detail);
    if (item.id === "sleep") return detailSleepVisual();
    if (item.style === "steps") return stepTrail(14, item.fraction);
    if (item.style === "arc") return detailArcVisual(item);
    if (item.style === "radial") return `<div class="detail-radial-wrap">${radialDots(item.fraction)}${item.id === "exercise" ? `<strong>${Math.round(item.fraction * 100)}%</strong>` : ""}</div>`;
    if (item.style === "wave") return detailWaveVisual(item, 80);
    return widgetVisual(item);
  }

  if (item.style === "macro") {
    return `${macroRing(148)}<div class="detail-macro-legend"><span><i></i>Carbs</span><span><i></i>Protein</span><span><i></i>Fat</span></div>`;
  }
  if (item.style === "wave") return detailWaveVisual(item, 92);
  return widgetVisual(item);
}

function detailSection(kicker, title, content) {
  return `<section class="detail-section"><span class="detail-section-kicker">${kicker}</span><h3>${title}</h3>${content}</section>`;
}

function detailList(items) {
  return `<div class="detail-list">${items.map(([symbol, text]) => `<div class="detail-list-item"><span class="detail-list-icon">${detailSymbol(symbol)}</span><span>${text}</span></div>`).join("")}</div>`;
}

function detailStats(stats) {
  return `<div class="detail-stat-card">${stats.map(({ label, value, unit = "" }) => `<div class="detail-stat"><strong>${value}${unit ? ` <small>${unit}</small>` : ""}</strong><span>${label}</span></div>`).join("")}</div>`;
}

function detailValueMarkup(item) {
  if (item.id === "sleep") {
    const match = item.value.match(/(\d+)h\s*(\d+)m/);
    if (match) return `<strong>${match[1]}</strong><small>h</small><strong>${match[2]}</strong><small>m</small>`;
  }
  return `<strong>${item.value}</strong>${item.unit ? `<small>${item.unit}</small>` : ""}`;
}

function trendHero(item, detail, span) {
  const values = [0.26, 0.34, 0.31, 0.49, 0.44, 0.61, 0.58, 0.73, 0.69, 0.82];
  const points = values.map((value, index) => `${24 + index * 36},${136 - value * 112}`).join(" ");
  const line = `M${points.replaceAll(" ", " L")}`;
  const area = `${line} L348 144 L24 144 Z`;
  return `<div class="detail-hero"><div class="detail-hero-value">${detailValueMarkup(item)}</div><p class="detail-hero-status" style="--detail-status:${ratingColors[detail.status] || item.color}">${span[0].toUpperCase() + span.slice(1)} view</p><p class="detail-hero-line">Your ${span} trend stays close to the range shown in Akari.</p><svg class="detail-trend" viewBox="0 0 372 150" aria-hidden="true"><path d="${area}"></path><path d="${line}"></path></svg>${detailStats([{ label: "Lowest", value: item.value }, { label: "Highest", value: item.value }, { label: "Average", value: item.value }])}</div>`;
}

function nutrientStatus(item, detail) {
  if (detail.limit) {
    if (item.fraction <= 0.8) return ["Good", ratingColors.Good];
    if (item.fraction <= 1) return ["Watch", ratingColors.Fair];
    return ["Over", ratingColors.Watch];
  }
  if (item.fraction < 0.7) return ["Room to go", ratingColors.Fair];
  if (item.fraction <= 1.1) return ["On track", ratingColors.Good];
  return ["Plenty", ratingColors.Excellent];
}

function itemNumber(item) {
  return Number.parseFloat(item.value.replaceAll(",", "")) || 0;
}

function tidyNumber(value) {
  return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function renderVitalDetail(item, detail, span) {
  const hero = span === "day"
    ? `<div class="detail-hero"><div class="detail-hero-value">${detailValueMarkup(item)}</div><p class="detail-hero-status" style="--detail-status:${ratingColors[detail.status]}">${detail.status}</p><p class="detail-hero-line">${detail.line}</p><div class="detail-hero-visual detail-hero-visual--${item.style}">${detailHeroVisual(item, detail)}</div>${item.id === "sleep" ? detailStats([{ label: "Deep", value: "1h 22m" }, { label: "Core", value: "4h 46m" }, { label: "REM", value: "1h 34m" }, { label: "Awake", value: "18m" }]) : ""}</div>`
    : trendHero(item, detail, span);
  const zones = `<div class="detail-zones">${detail.zones.map(([label, range, blurb]) => `<article class="detail-zone-row ${blurb === detail.line ? "is-current" : ""}" style="--zone-color:${ratingColors[label]}"><header><strong>${label}</strong><span>${range}${item.unit && item.id !== "sleep" ? `<small>${item.unit}</small>` : ""}</span></header><p>${blurb}</p></article>`).join("")}</div>`;
  return `${hero}${detailSection(span === "day" ? "The basics" : `This ${span}`, "What it means", `<p>${detail.explainer}</p>`)}${detailSection("Your range", "Where you land", zones)}${detailSection("Factors", "What affects it", detailList(detail.influences))}`;
}

function renderNutrientDetail(item, detail, span) {
  const [status, statusColor] = nutrientStatus(item, detail);
  const value = itemNumber(item);
  const target = detail.target;
  const difference = Math.max(target - value, 0);
  const line = detail.limit
    ? `${tidyNumber(difference)} ${item.unit} below the limit`
    : value < target ? `${tidyNumber(difference)} ${item.unit} to your target` : "Target reached";
  const hero = span === "day"
    ? `<div class="detail-hero"><div class="detail-hero-value">${detailValueMarkup(item)}</div><p class="detail-hero-status" style="--detail-status:${statusColor}">${status}</p><p class="detail-hero-line">${line}</p><div class="detail-hero-visual detail-hero-visual--nutrient detail-hero-visual--${item.style}">${detailHeroVisual(item, detail)}</div></div>`
    : trendHero(item, { ...detail, status }, span);
  const targetStats = detailStats([
    { label: detail.limit ? "Daily limit" : "Daily target", value: tidyNumber(target), unit: item.unit },
    { label: "So far", value: Math.round((value / target) * 100), unit: "%" },
    { label: detail.limit ? "Headroom" : "Left", value: tidyNumber(difference), unit: item.unit },
  ]);
  return `${hero}${detailSection(span === "day" ? "The basics" : `This ${span}`, "What it means", `<p>${detail.explainer}</p>`)}${detailSection(detail.limit ? "The ceiling" : "The goal", "Your target", `${targetStats}${detail.note ? `<p>${detail.note}</p>` : ""}`)}${detailSection(detail.limit ? "Watch for" : "Eat this", detail.sourcesTitle, detailList(detail.sources))}`;
}

function detailContentMarkup(item, span, spanAttribute = "data-detail-span") {
  const detail = vitalDetails[item.id] || nutrientDetails[item.id];
  const picker = `<nav class="detail-span-picker" aria-label="Trend span">${["day", "week", "month", "year"].map((option) => `<button type="button" ${spanAttribute}="${option}" class="${option === span ? "is-active" : ""}">${option[0].toUpperCase() + option.slice(1)}</button>`).join("")}</nav>`;
  const body = vitalDetails[item.id]
    ? renderVitalDetail(item, detail, span)
    : renderNutrientDetail(item, detail, span);
  return `${picker}${body}`;
}

const detailModal = document.querySelector("[data-detail-modal]");
const detailContent = document.querySelector("[data-detail-content]");
const detailScroll = document.querySelector("[data-detail-scroll]");
const detailTitle = document.querySelector(".detail-nav-title");
let activeDetailItem;
let activeDetailSpan = "day";
let detailReturnFocus;
let detailCloseTimer;

function renderDetailScreen() {
  if (!activeDetailItem) return;
  const item = activeDetailItem;
  const detail = vitalDetails[item.id] || nutrientDetails[item.id];
  detailModal.style.setProperty("--detail-accent", item.color);
  detailModal.style.setProperty("--detail-accent-rgb", item.rgb);
  detailTitle.innerHTML = `${detailSymbol(item.symbol)}<span>${item.title}</span>`;
  detailContent.innerHTML = detailContentMarkup(item, activeDetailSpan);
}

function openDetail(item) {
  window.clearTimeout(detailCloseTimer);
  activeDetailItem = item;
  activeDetailSpan = "day";
  detailReturnFocus = document.activeElement;
  renderDetailScreen();
  detailScroll.scrollTop = 0;
  detailModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("detail-modal-open");
  requestAnimationFrame(() => {
    detailModal.classList.add("is-open");
    detailModal.querySelector(".detail-close").focus({ preventScroll: true });
  });
}

function closeDetail() {
  if (!detailModal.classList.contains("is-open")) return;
  detailModal.classList.remove("is-open");
  document.body.classList.remove("detail-modal-open");
  detailCloseTimer = window.setTimeout(() => {
    detailModal.setAttribute("aria-hidden", "true");
    detailReturnFocus?.focus?.({ preventScroll: true });
    activeDetailItem = undefined;
  }, 380);
}

detailModal.addEventListener("click", (event) => {
  const close = event.target.closest("[data-detail-close]");
  if (close) {
    closeDetail();
    return;
  }
  const spanButton = event.target.closest("[data-detail-span]");
  if (!spanButton || !activeDetailItem) return;
  activeDetailSpan = spanButton.dataset.detailSpan;
  renderDetailScreen();
  detailScroll.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
});

document.addEventListener("keydown", (event) => {
  if (!detailModal.classList.contains("is-open")) return;
  if (event.key === "Escape") {
    closeDetail();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = [...detailModal.querySelectorAll(".detail-close, [data-detail-span], [data-detail-scroll]")];
  const current = focusable.indexOf(document.activeElement);
  const next = event.shiftKey
    ? (current <= 0 ? focusable.length - 1 : current - 1)
    : (current === focusable.length - 1 ? 0 : current + 1);
  event.preventDefault();
  focusable[next].focus({ preventScroll: true });
});

document.querySelectorAll("[data-widget-row]").forEach((sequence) => {
  sequence.innerHTML = (widgetRows[sequence.dataset.widgetRow] || []).map(renderWidget).join("");
});

const widgetEcosystem = document.querySelector(".widget-ecosystem");
const ecosystemPhone = document.querySelector("[data-ecosystem-phone]");
const ecosystemDetail = document.querySelector("[data-ecosystem-detail]");
const ecosystemDetailTitle = document.querySelector("[data-ecosystem-title]");
const ecosystemDetailContent = document.querySelector("[data-ecosystem-content]");
const ecosystemDetailScroll = document.querySelector("[data-ecosystem-scroll]");
let ecosystemDetailItem;
let ecosystemDetailSpan = "day";
let ecosystemActiveWidget;

document.querySelectorAll("[data-ecosystem-widget]").forEach((slot) => {
  const item = widgetItemById.get(slot.dataset.ecosystemWidget);
  if (item) slot.innerHTML = renderWidget(item);
});

function renderEcosystemDetail() {
  if (!ecosystemDetailItem) return;
  const item = ecosystemDetailItem;
  ecosystemPhone.style.setProperty("--detail-accent", item.color);
  ecosystemPhone.style.setProperty("--detail-accent-rgb", item.rgb);
  ecosystemDetailTitle.innerHTML = `${detailSymbol(item.symbol)}<span>${item.title}</span>`;
  ecosystemDetailContent.innerHTML = detailContentMarkup(item, ecosystemDetailSpan, "data-ecosystem-span");
  ecosystemDetailContent.classList.remove("is-changing");
  requestAnimationFrame(() => ecosystemDetailContent.classList.add("is-changing"));
}

function showEcosystemDetail(item, widget) {
  ecosystemDetailItem = item;
  ecosystemDetailSpan = "day";
  ecosystemActiveWidget?.classList.remove("is-selected");
  ecosystemActiveWidget = widget.closest("[data-ecosystem-widget]");
  ecosystemActiveWidget?.classList.add("is-selected");
  renderEcosystemDetail();
  ecosystemDetailScroll.scrollTop = 0;
  ecosystemDetail.setAttribute("aria-hidden", "false");
  ecosystemPhone.classList.add("is-showing-detail");
}

function showEcosystemToday() {
  ecosystemPhone.classList.remove("is-showing-detail");
  ecosystemDetail.setAttribute("aria-hidden", "true");
  ecosystemActiveWidget?.classList.remove("is-selected");
  const returnTarget = ecosystemActiveWidget?.querySelector(".widget");
  ecosystemActiveWidget = undefined;
  ecosystemDetailItem = undefined;
  window.setTimeout(() => returnTarget?.focus({ preventScroll: true }), reduceMotion.matches ? 0 : 320);
}

if (widgetEcosystem) {
  widgetEcosystem.addEventListener("click", (event) => {
    if (event.target.closest("[data-ecosystem-back]")) {
      showEcosystemToday();
      return;
    }
    const spanButton = event.target.closest("[data-ecosystem-span]");
    if (spanButton && ecosystemDetailItem) {
      ecosystemDetailSpan = spanButton.dataset.ecosystemSpan;
      renderEcosystemDetail();
      ecosystemDetailScroll.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
      return;
    }
    const widget = event.target.closest("[data-widget-id]");
    if (!widget) return;
    const item = widgetItemById.get(widget.dataset.widgetId);
    if (item) showEcosystemDetail(item, widget);
  });

  widgetEcosystem.addEventListener("keydown", (event) => {
    const widget = event.target.closest("[data-widget-id]");
    if (!widget || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    const item = widgetItemById.get(widget.dataset.widgetId);
    if (item) showEcosystemDetail(item, widget);
  });
}

// Continuously wrap each widget row by one exact sequence, so there is never an end.
const marquee = document.querySelector(".widget-marquee");
let widgetClickSuppressedUntil = 0;

if (marquee) {
  const tickers = [...marquee.querySelectorAll(".widget-row")].map((row, index) => ({
    row,
    track: row.querySelector(".widget-track"),
    sequenceWidth: 0,
    offset: 0,
    direction: index % 2 === 0 ? -1 : 1,
    speed: index % 2 === 0 ? 18 : 15,
    pointerId: null,
    pointerX: 0,
    dragDistance: 0,
    pressedWidgetId: undefined,
  }));
  let isHovered = false;
  let lastFrame = performance.now();

  function wrapOffset(ticker) {
    if (!ticker.sequenceWidth) return;
    ticker.offset = ((ticker.offset % ticker.sequenceWidth) - ticker.sequenceWidth) % ticker.sequenceWidth;
  }

  function fillTicker(ticker) {
    const firstSequence = ticker.track.querySelector(".widget-sequence");
    if (!firstSequence) return;

    [...ticker.track.querySelectorAll(".widget-sequence")]
      .slice(1)
      .forEach((sequence) => sequence.remove());

    ticker.sequenceWidth = firstSequence.getBoundingClientRect().width;
    if (!ticker.sequenceWidth) return;

    const sequenceCount = Math.max(3, Math.ceil(ticker.row.clientWidth / ticker.sequenceWidth) + 2);
    for (let count = 1; count < sequenceCount; count += 1) {
      ticker.track.append(firstSequence.cloneNode(true));
    }

    ticker.offset = ticker.direction > 0 ? -ticker.sequenceWidth * 0.55 : 0;
    wrapOffset(ticker);
    ticker.track.style.transform = `translate3d(${ticker.offset}px, 0, 0)`;
  }

  tickers.forEach((ticker) => {
    fillTicker(ticker);

    ticker.row.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      ticker.pointerId = event.pointerId;
      ticker.pointerX = event.clientX;
      ticker.dragDistance = 0;
      ticker.pressedWidgetId = event.target.closest("[data-widget-id]")?.dataset.widgetId;
      ticker.row.classList.add("is-dragging");
      ticker.row.setPointerCapture(event.pointerId);
    });

    ticker.row.addEventListener("pointermove", (event) => {
      if (event.pointerId !== ticker.pointerId) return;
      const delta = event.clientX - ticker.pointerX;
      ticker.offset += delta;
      ticker.dragDistance += Math.abs(delta);
      ticker.pointerX = event.clientX;
      wrapOffset(ticker);
      ticker.track.style.transform = `translate3d(${ticker.offset}px, 0, 0)`;
    });

    const finishDrag = (event, shouldOpen) => {
      if (event.pointerId !== ticker.pointerId) return;
      const wasDrag = ticker.dragDistance > 7;
      if (wasDrag || ticker.pressedWidgetId) widgetClickSuppressedUntil = performance.now() + 280;
      ticker.pointerId = null;
      ticker.row.classList.remove("is-dragging");
      if (shouldOpen && !wasDrag && ticker.pressedWidgetId) {
        const item = widgetItemById.get(ticker.pressedWidgetId);
        if (item) openDetail(item);
      }
      ticker.pressedWidgetId = undefined;
    };

    ticker.row.addEventListener("pointerup", (event) => finishDrag(event, true));
    ticker.row.addEventListener("pointercancel", (event) => finishDrag(event, false));
  });

  marquee.addEventListener("click", (event) => {
    const widget = event.target.closest("[data-widget-id]");
    if (!widget || performance.now() < widgetClickSuppressedUntil) return;
    const item = widgetItemById.get(widget.dataset.widgetId);
    if (item) openDetail(item);
  });

  marquee.addEventListener("keydown", (event) => {
    const widget = event.target.closest("[data-widget-id]");
    if (!widget || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    const item = widgetItemById.get(widget.dataset.widgetId);
    if (item) openDetail(item);
  });

  marquee.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") isHovered = true;
  });

  marquee.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") isHovered = false;
  });

  const resizeObserver = new ResizeObserver(() => tickers.forEach(fillTicker));
  resizeObserver.observe(marquee);

  function animateWidgets(now) {
    const elapsed = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;

    tickers.forEach((ticker) => {
      const isDragging = ticker.pointerId !== null;
      if (!reduceMotion.matches && marquee.classList.contains("is-visible") && !isHovered && !isDragging) {
        ticker.offset += ticker.direction * ticker.speed * elapsed;
        wrapOffset(ticker);
        ticker.track.style.transform = `translate3d(${ticker.offset}px, 0, 0)`;
      }
    });

    requestAnimationFrame(animateWidgets);
  }

  requestAnimationFrame(animateWidgets);
}

const revealItems = document.querySelectorAll("[data-reveal]");
const storyScenes = document.querySelectorAll("[data-story]");

if (reduceMotion.matches || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -10%", threshold: 0.12 });

  revealItems.forEach((item) => revealObserver.observe(item));
}

// Once each scene assembles, a tiny amount of scroll-linked depth keeps the
// data feeling spatial without competing with the story or the reader.
if (!reduceMotion.matches && storyScenes.length) {
  let storyMotionFrame;

  const updateStoryMotion = () => {
    const viewportHeight = window.innerHeight;

    storyScenes.forEach((scene) => {
      const bounds = scene.getBoundingClientRect();
      const centerOffset = (bounds.top + bounds.height / 2 - viewportHeight / 2) / viewportHeight;
      const shift = Math.max(-1, Math.min(1, centerOffset));
      scene.style.setProperty("--story-shift", shift.toFixed(3));
    });

    storyMotionFrame = undefined;
  };

  const requestStoryMotion = () => {
    if (storyMotionFrame) return;
    storyMotionFrame = requestAnimationFrame(updateStoryMotion);
  };

  window.addEventListener("scroll", requestStoryMotion, { passive: true });
  window.addEventListener("resize", requestStoryMotion);
  updateStoryMotion();
}
