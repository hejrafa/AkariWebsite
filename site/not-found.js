// The 404 page (404.html) as a playground. Its zero is a bitten doughnut: each tap takes another bite and
// throws crumbs, and once it's gone a fresh one arrives. The app's food stickers rain onto the band and pile
// up at its bottom, behind the words; the mouse bounces them around, and a click or tap kicks the ones
// nearby. legal.js does the words, themes and sticker files (updateStickers); this file only moves things,
// and the page reads and works without it.
(() => {
  const stage = document.querySelector(".not-found");
  const doughnut = document.querySelector(".not-found__doughnut");
  if (!stage || !doughnut) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The doughnut ------------------------------------------------------------------------------------------

  // Its states in order; null is the moment it's all gone. tools/bite_doughnut.py makes the bitten ones.
  const doughnutStates = ["stickers/doughnut-bitten-1", "stickers/doughnut-bitten-2", "stickers/doughnut-bitten-3", null, "stickers/doughnut"];
  // Where each bite is, as fractions of the 256px picture: BITES in tools/bite_doughnut.py.
  const doughnutBites = [[214 / 256, 42 / 256], [240 / 256, 158 / 256], [42 / 256, 56 / 256]];
  const crumbColours = ["#7a4330", "#5e3324", "#f6d49a", "#eebf7e", "#ff6fb5", "#3f8cff"];
  const doughnutImage = doughnut.querySelector("img");
  let doughnutState = 0;

  function stickerName(sticker) {
    return sticker.split("/").pop();
  }

  // The next picture is fetched before it's needed, so a bite never shows an empty frame.
  function preloadDoughnut(state) {
    const sticker = doughnutStates[state];
    const source = doughnutImage.getAttribute("src");
    if (!sticker || !source) return;
    const from = `/${stickerName(doughnutImage.dataset.sticker)}-`;
    const to = `/${stickerName(sticker)}-`;
    const image = new Image();
    image.srcset = doughnutImage.srcset.replaceAll(from, to);
    image.src = source.replace(from, to);
  }

  function showDoughnut(state) {
    doughnutState = state;
    if (doughnutStates[state]) {
      doughnutImage.dataset.sticker = doughnutStates[state];
      updateStickers();
    }
    preloadDoughnut((state + 1) % doughnutStates.length);
  }

  function throwCrumbs(x, y, count) {
    if (reducedMotion) return;
    for (let index = 0; index < count; index++) {
      const crumb = document.createElement("span");
      const sprinkle = index % 4 === 0;
      const angle = (-0.95 + Math.random() * 0.9) * Math.PI;
      const distance = 30 + Math.random() * 50;
      crumb.className = sprinkle ? "crumb crumb--sprinkle" : "crumb";
      crumb.style.left = `${x}px`;
      crumb.style.top = `${y}px`;
      crumb.style.setProperty("--size", `${4 + Math.random() * 5}px`);
      crumb.style.setProperty("--colour", sprinkle ? crumbColours[4 + (index % 2)] : crumbColours[Math.floor(Math.random() * 4)]);
      crumb.style.setProperty("--pop-x", `${Math.cos(angle) * distance}px`);
      crumb.style.setProperty("--pop-y", `${Math.sin(angle) * distance}px`);
      crumb.style.setProperty("--fall-x", `${-20 + Math.random() * 40}px`);
      crumb.style.setProperty("--fall-y", `${90 + Math.random() * 80}px`);
      crumb.style.setProperty("--spin", `${-200 + Math.random() * 400}deg`);
      document.body.append(crumb);
      crumb.addEventListener("animationend", () => crumb.remove());
    }
  }

  doughnut.addEventListener("click", () => {
    if (doughnut.classList.contains("is-eaten")) return;
    const box = doughnut.querySelector(".cut").getBoundingClientRect();
    const next = (doughnutState + 1) % doughnutStates.length;
    const [fx, fy] = doughnutBites[next] ?? [0.5, 0.5];
    throwCrumbs(box.left + fx * box.width, box.top + fy * box.height, doughnutStates[next] ? 12 : 24);
    navigator.vibrate?.(10);
    doughnut.classList.remove("is-chomping", "is-fresh");
    void doughnut.offsetWidth;
    if (doughnutStates[next]) {
      showDoughnut(next);
      doughnut.classList.add("is-chomping");
      return;
    }
    // All gone. A moment later, a fresh one.
    doughnut.classList.add("is-eaten");
    doughnutState = next;
    window.setTimeout(() => {
      showDoughnut((next + 1) % doughnutStates.length);
      doughnut.classList.remove("is-eaten");
      doughnut.classList.add("is-fresh");
    }, 900);
  });

  preloadDoughnut(1);

  // The falling food ---------------------------------------------------------------------------------------

  // The app's food stickers (assets/welcome/stickers), and a whole doughnut or two.
  const foods = [
    "avocado", "banana", "broccoli", "carrot", "coffee", "croissant", "egg", "fish", "green-apple", "orange",
    "salad", "strawberry", "water",
  ].map((name) => `welcome/stickers/${name}`);
  const GRAVITY = 2600; // px/s²
  const BOUNCE = 0.32;
  const STEP = 1 / 120;
  const POINTER_RADIUS = 34;
  const KICK_RADIUS = 190;
  // Stickers turn when they're hit or roll, but only a little, and settle quickly: they're flat, not balls.
  const MAX_SPIN = 300; // degrees a second
  const SPIN_DAMPING = 0.03; // what's left of a spin after a second
  const ROLL = 0.15; // how much of a true roll a sticker sliding on the floor makes
  const KNOCK = 220; // px/s: two stickers meeting faster than this bounce and turn; slower, they just touch
  const REST_WINDOW = 0.4; // s
  const REST_DISTANCE = 2.5; // px a sticker may jiggle within a window and still be at rest

  const layer = document.createElement("div");
  layer.className = "food-fall";
  layer.setAttribute("aria-hidden", "true");
  stage.append(layer);

  const bodies = [];
  const pointer = { x: 0, y: 0, vx: 0, vy: 0, time: 0, inside: false };
  let width = 0;
  let floor = 0;
  let frame = 0;
  let last = 0;
  let calm = 0; // windows in a row in which nothing went anywhere
  let restClock = 0; // seconds into the current window
  let visible = true;

  function measure() {
    width = stage.clientWidth;
    // A little above the band's bottom, so the stickers' shadows fit inside it.
    floor = stage.clientHeight - 22;
  }

  function addFood(sticker, size, x, y) {
    const item = document.createElement("span");
    item.className = "food-fall__item cut";
    item.style.width = `${size}px`;
    const image = document.createElement("img");
    image.className = "cut__image";
    image.alt = "";
    image.width = 256;
    image.height = 256;
    image.decoding = "async";
    image.dataset.sticker = sticker;
    item.append(image);
    layer.append(item);
    bodies.push({
      item, size, r: size * 0.4, x, y, lastX: x, lastY: y,
      vx: -60 + Math.random() * 120, vy: 0,
      angle: -30 + Math.random() * 60, spin: -40 + Math.random() * 80,
    });
  }

  // A good heap: rows of them from side to side, as many rows as fit under the button, two to three. Smaller
  // and fewer on a phone.
  function fill() {
    measure();
    const words = stage.querySelector(".legal-header").getBoundingClientRect();
    const room = Math.max(60, floor - (words.bottom - stage.getBoundingClientRect().top));
    const size = Math.min(80, Math.max(46, width * 0.045 + 30));
    const row = width / (size * 0.8);
    const rows = Math.min(3, Math.max(2, (room + 40) / (size * 0.75)));
    const count = Math.round(Math.min(80, row * rows));
    for (let index = 0; index < count; index++) {
      const sticker = index % 9 === 4 ? "stickers/doughnut" : foods[Math.floor(Math.random() * foods.length)];
      const itemSize = Math.round(size * (0.85 + Math.random() * 0.3));
      const x = itemSize / 2 + Math.random() * (width - itemSize);
      const y = -itemSize - Math.random() * stage.clientHeight * 1.1;
      addFood(sticker, itemSize, x, y);
    }
    updateStickers();
  }

  function collide(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const reach = a.r + b.r;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= reach * reach || distanceSquared === 0) return;
    const distance = Math.sqrt(distanceSquared);
    const nx = dx / distance;
    const ny = dy / distance;
    const overlap = (reach - distance) / 2;
    a.x -= nx * overlap;
    a.y -= ny * overlap;
    b.x += nx * overlap;
    b.y += ny * overlap;
    const along = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (along >= 0) return;
    // Lying in a heap, gravity presses them together a little every step: those meet without a bounce.
    const knock = along < -KNOCK;
    const impulse = (-(1 + (knock ? BOUNCE : 0)) * along) / 2;
    a.vx -= impulse * nx;
    a.vy -= impulse * ny;
    b.vx += impulse * nx;
    b.vy += impulse * ny;
    // A real knock sets them turning a little.
    if (!knock) return;
    const across = (b.vx - a.vx) * -ny + (b.vy - a.vy) * nx;
    a.spin -= across * 0.08;
    b.spin += across * 0.08;
  }

  function step(dt) {
    const drag = Math.pow(0.6, dt);
    for (const body of bodies) {
      body.vy += GRAVITY * dt;
      body.vx *= drag;
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.spin = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, body.spin)) * Math.pow(SPIN_DAMPING, dt);
      body.angle += body.spin * dt;
    }

    // The moving mouse is a ball that shoves whatever it touches, harder the faster it goes. Its speed wears
    // off within a moment of stopping, and a mouse at rest lets the heap settle around it.
    const still = Math.pow(1e-8, dt);
    pointer.vx *= still;
    pointer.vy *= still;
    if (pointer.inside && Math.hypot(pointer.vx, pointer.vy) > 60) {
      for (const body of bodies) {
        const dx = body.x - pointer.x;
        const dy = body.y - pointer.y;
        const reach = body.r + POINTER_RADIUS;
        const distance = Math.hypot(dx, dy);
        if (distance >= reach || distance === 0) continue;
        const nx = dx / distance;
        const ny = dy / distance;
        body.x = pointer.x + nx * reach;
        body.y = pointer.y + ny * reach;
        const into = body.vx * nx + body.vy * ny;
        if (into < 0) {
          body.vx -= into * nx;
          body.vy -= into * ny;
        }
        const push = Math.max(0, pointer.vx * nx + pointer.vy * ny) * 1.2;
        body.vx += nx * push;
        body.vy += ny * push;
        body.spin += (pointer.vx * -ny + pointer.vy * nx) * 0.05;
      }
    }

    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) collide(bodies[i], bodies[j]);
      }
    }

    for (const body of bodies) {
      if (body.y + body.r > floor) {
        body.y = floor - body.r;
        body.vy = body.vy > 120 ? -body.vy * BOUNCE : 0;
        body.vx *= Math.pow(0.05, dt);
        // On the ground, a sliding sticker turns a little the way it goes.
        body.spin = ((body.vx / body.r) * 180 * ROLL) / Math.PI;
      }
      if (body.x - body.r < 0) {
        body.x = body.r;
        body.vx = Math.abs(body.vx) * BOUNCE;
      } else if (body.x + body.r > width) {
        body.x = width - body.r;
        body.vx = -Math.abs(body.vx) * BOUNCE;
      }
      body.vy = Math.max(body.vy, -2400);
    }
  }

  function render() {
    for (const body of bodies) {
      body.item.style.transform = `translate(${body.x - body.size / 2}px, ${body.y - body.size / 2}px) rotate(${body.angle}deg)`;
    }
  }

  function tick(now) {
    frame = 0;
    const elapsed = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (let remaining = elapsed; remaining > 1e-6; remaining -= STEP) step(Math.min(STEP, remaining));
    render();
    // At rest is having gone nowhere over a little while: a heap jiggles in place forever, so neither speed
    // nor a single frame will do. A sticker at rest stops turning, and once all are, so does the page.
    restClock += elapsed;
    if (restClock >= REST_WINDOW) {
      let moving = false;
      for (const body of bodies) {
        const moved = Math.abs(body.x - body.lastX) + Math.abs(body.y - body.lastY);
        if (moved > REST_DISTANCE || body.y < 0) moving = true;
        else body.spin *= 0.2;
        body.lastX = body.x;
        body.lastY = body.y;
      }
      calm = moving ? 0 : calm + 1;
      restClock = 0;
    }
    if (calm < 2 && visible) frame = requestAnimationFrame(tick);
  }

  function wake() {
    calm = 0;
    restClock = 0;
    if (frame || !visible || reducedMotion) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function stagePoint(event) {
    const box = stage.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  stage.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || reducedMotion) return;
    const point = stagePoint(event);
    const elapsed = Math.max(0.008, (event.timeStamp - pointer.time) / 1000);
    if (pointer.inside) {
      pointer.vx = Math.max(-3000, Math.min(3000, (point.x - pointer.x) / elapsed));
      pointer.vy = Math.max(-3000, Math.min(3000, (point.y - pointer.y) / elapsed));
    }
    Object.assign(pointer, point, { time: event.timeStamp, inside: true });
    wake();
  });

  stage.addEventListener("pointerleave", () => {
    pointer.inside = false;
    pointer.vx = 0;
    pointer.vy = 0;
  });

  // A click or tap kicks what's near it up and away. On a phone, where nothing hovers, this is the game.
  stage.addEventListener("pointerdown", (event) => {
    if (reducedMotion || event.button > 0 || event.target.closest("a, button")) return;
    const point = stagePoint(event);
    for (const body of bodies) {
      const dx = body.x - point.x;
      const dy = body.y - point.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance > KICK_RADIUS) continue;
      const strength = 1 - distance / KICK_RADIUS;
      body.vx += (dx / distance) * 900 * strength;
      body.vy += (dy / distance) * 700 * strength - 1100 * strength;
      body.spin += (-240 + Math.random() * 480) * strength;
    }
    wake();
  });

  // With reduced motion nothing falls: the food is simply lying where it would have landed.
  function settle() {
    for (let index = 0; index < 900; index++) step(STEP);
    render();
  }

  // A new size moves the floor and walls: the food falls or is pushed to where they now are.
  new ResizeObserver(() => {
    measure();
    for (const body of bodies) {
      body.x = Math.max(body.r, Math.min(width - body.r, body.x));
      body.y = Math.min(floor - body.r, body.y);
    }
    if (reducedMotion && bodies.length) {
      settle();
      return;
    }
    render();
    wake();
  }).observe(stage);

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
  }).observe(stage);

  function start() {
    fill();
    if (reducedMotion) {
      settle();
      return;
    }
    render();
    wake();
  }

  // The words rise first; then the food comes down.
  document.fonts.ready.then(() => window.setTimeout(start, reducedMotion ? 0 : 450));
})();
