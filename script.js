// The app's headline emoji is a tiny toy: drag it, or tap it to make a heart pop.
document.documentElement.classList.add("has-js");

const playfulEmojis = document.querySelectorAll(".playful-emoji");
const creditsHeart = document.querySelector(".credits-heart");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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

// Continuously wrap each widget row by one exact sequence, so there is never an end.
const marquee = document.querySelector(".widget-marquee");

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
      ticker.row.classList.add("is-dragging");
      ticker.row.setPointerCapture(event.pointerId);
    });

    ticker.row.addEventListener("pointermove", (event) => {
      if (event.pointerId !== ticker.pointerId) return;
      ticker.offset += event.clientX - ticker.pointerX;
      ticker.pointerX = event.clientX;
      wrapOffset(ticker);
      ticker.track.style.transform = `translate3d(${ticker.offset}px, 0, 0)`;
    });

    const finishDrag = (event) => {
      if (event.pointerId !== ticker.pointerId) return;
      ticker.pointerId = null;
      ticker.row.classList.remove("is-dragging");
    };

    ticker.row.addEventListener("pointerup", finishDrag);
    ticker.row.addEventListener("pointercancel", finishDrag);
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
