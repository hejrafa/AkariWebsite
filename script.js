// The app's headline emoji is a tiny toy: drag it, or tap it to make a heart pop.
const emoji = document.querySelector(".headline-emoji");
let startPoint;
let wasDragged = false;
let ignoreClick = false;

function popHeart() {
  const bounds = emoji.getBoundingClientRect();
  const angle = (-0.88 + Math.random() * 0.76) * Math.PI;
  const distance = 42 + Math.random() * 36;
  const particle = document.createElement("span");
  particle.className = "emoji-particle";
  particle.textContent = "❤️";
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

emoji.addEventListener("pointerup", () => {
  if (!startPoint) return;
  if (wasDragged) {
    emoji.classList.remove("is-dragging");
    emoji.style.removeProperty("--drag-x");
    emoji.style.removeProperty("--drag-y");
    ignoreClick = true;
  } else {
    popHeart();
    ignoreClick = true;
  }
  startPoint = undefined;
});

emoji.addEventListener("click", (event) => {
  if (ignoreClick) {
    event.preventDefault();
    ignoreClick = false;
  } else {
    popHeart();
  }
});
