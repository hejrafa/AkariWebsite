// The 404 page (404.html) as a playground. Its zero is a bitten doughnut: each tap takes another bite and
// throws crumbs, and once it's gone a fresh one arrives. The app's food stickers rain onto the band and pile
// up on its torn edge, behind the words; the mouse bounces them around, and a click or tap kicks the ones
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
  let calm = 0;
  let visible = true;

  function measure() {
    const torn = stage.querySelector(".torn-edge")?.getBoundingClientRect().height ?? 0;
    width = stage.clientWidth;
    // The food lands on the torn paper's fringe, so the band's edge never cuts it off.
    floor = stage.clientHeight - torn * 0.8;
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
      item, size, r: size * 0.4, x, y,
      vx: -60 + Math.random() * 120, vy: 0,
      angle: -30 + Math.random() * 60, spin: -120 + Math.random() * 240,
    });
  }

  // As many as fill the room under the button, but at least a row from side to side: fewer and smaller on
  // a phone.
  function fill() {
    measure();
    const words = stage.querySelector(".legal-header").getBoundingClientRect();
    const room = Math.max(60, floor - (words.bottom - stage.getBoundingClientRect().top) - 12);
    const size = Math.min(88, Math.max(50, width * 0.05 + 34));
    const row = (width / size) * 1.15;
    const count = Math.round(Math.min(44, Math.max(row, (width * room * 0.7) / (size * size))));
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
    const impulse = (-(1 + BOUNCE) * along) / 2;
    a.vx -= impulse * nx;
    a.vy -= impulse * ny;
    b.vx += impulse * nx;
    b.vy += impulse * ny;
    // Rubbing past each other sets them turning.
    const across = (b.vx - a.vx) * -ny + (b.vy - a.vy) * nx;
    a.spin -= across * 0.4;
    b.spin += across * 0.4;
  }

  function step(dt) {
    const drag = Math.pow(0.6, dt);
    for (const body of bodies) {
      body.vy += GRAVITY * dt;
      body.vx *= drag;
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.angle += body.spin * dt;
      body.spin *= Math.pow(0.4, dt);
    }

    // The mouse is a ball that shoves whatever it touches, harder the faster it moves.
    if (pointer.inside) {
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
        const push = Math.max(0, pointer.vx * nx + pointer.vy * ny);
        body.vx += nx * (push * 1.1 + 140);
        body.vy += ny * (push * 1.1 + 140);
        body.spin += (pointer.vx * -ny + pointer.vy * nx) * 0.5;
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
        // On the ground, a sticker rolls.
        body.spin = ((body.vx / body.r) * 180) / Math.PI;
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
    const moving = bodies.some((body) => Math.abs(body.vx) + Math.abs(body.vy) > 14 || body.y < 0);
    calm = moving ? 0 : calm + elapsed;
    // Everything at rest for a moment: stop until something happens.
    if (calm < 0.6 && visible) frame = requestAnimationFrame(tick);
  }

  function wake() {
    calm = 0;
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
      body.spin += (-360 + Math.random() * 720) * strength;
    }
    wake();
  });

  new ResizeObserver(() => {
    measure();
    for (const body of bodies) {
      body.x = Math.max(body.r, Math.min(width - body.r, body.x));
      body.y = Math.min(floor - body.r, body.y);
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
      // No rain: the food is already lying where it would have landed.
      for (let index = 0; index < 900; index++) step(STEP);
      render();
      return;
    }
    render();
    wake();
  }

  // The words rise first; then the food comes down.
  document.fonts.ready.then(() => window.setTimeout(start, reducedMotion ? 0 : 450));
})();
