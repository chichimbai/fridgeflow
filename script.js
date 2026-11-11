const hero = document.querySelector(".hero");
const stars = document.querySelector(".stars");
const motionOk = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;
const STAR_COUNT = 32;

function addStars() {
  if (!stars) {
    return;
  }

  for (let index = 0; index < STAR_COUNT; index += 1) {
    const star = document.createElement("span");
    const size = (1 + Math.random() * 2).toFixed(1);

    star.className = "star";
    star.style.left = `${Math.random() * 100}%`;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.setProperty("--drift", `${(Math.random() * 48 - 24).toFixed(0)}px`);
    star.style.setProperty("--star-opacity", (0.35 + Math.random() * 0.5).toFixed(2));

    if (motionOk) {
      star.classList.add("is-moving");
      star.style.animationDuration = `${14 + Math.random() * 18}s`;
      star.style.animationDelay = `${(-Math.random() * 24).toFixed(2)}s`;
    } else {
      star.style.top = `${Math.random() * 100}%`;
      star.style.opacity = star.style.getPropertyValue("--star-opacity");
    }

    stars.append(star);
  }
}

const BEND_RADIUS = 180;

function splitIntoChars(element) {
  const text = element.textContent.replace(/\s+/g, " ").trim();
  const fragment = document.createDocumentFragment();

  element.setAttribute("aria-label", text);

  text.split(" ").forEach((word, index) => {
    if (index > 0) {
      fragment.append(" ");
    }

    const wordEl = document.createElement("span");
    wordEl.className = "word";
    wordEl.setAttribute("aria-hidden", "true");

    for (const char of word) {
      const charEl = document.createElement("span");
      charEl.className = "char";
      charEl.textContent = char;
      wordEl.append(charEl);
    }

    fragment.append(wordEl);
  });

  element.replaceChildren(fragment);
}

function bendChars(chars, pointer, bent) {
  if (!pointer) {
    bent.forEach((char) => {
      char.style.transform = "";
    });
    bent.clear();
    return;
  }

  chars.forEach((char) => {
    const rect = char.getBoundingClientRect();
    const dx = pointer.x - (rect.left + rect.width / 2);
    const dy = pointer.y - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);

    if (distance >= BEND_RADIUS || distance === 0) {
      if (bent.has(char)) {
        char.style.transform = "";
        bent.delete(char);
      }
      return;
    }

    const influence = 1 - distance / BEND_RADIUS;
    const nx = dx / distance;
    const ny = dy / distance;
    const rotate = nx * -22 * influence;
    const skew = ny * 16 * influence;
    const shiftX = nx * -14 * influence;
    const lift = -10 * influence;

    char.style.transform = `translate(${shiftX.toFixed(2)}px, ${lift.toFixed(2)}px) rotate(${rotate.toFixed(2)}deg) skewX(${skew.toFixed(2)}deg)`;
    bent.add(char);
  });
}

function followCursor() {
  const restX = () => window.innerWidth * 0.5;
  const restY = () => window.innerHeight * 0.38;
  const chars = [];
  const bent = new Set();

  if (hero) {
    hero.querySelectorAll(".logo, h1, .lead, .cta").forEach((element) => {
      splitIntoChars(element);
    });
    chars.push(...hero.querySelectorAll(".char"));
  }

  const place = (x, y, pointer) => {
    document.documentElement.style.setProperty("--x", `${x}px`);
    document.documentElement.style.setProperty("--y", `${y}px`);
    bendChars(chars, pointer, bent);
  };

  place(restX(), restY(), null);

  window.addEventListener("pointermove", (event) => {
    place(event.clientX, event.clientY, { x: event.clientX, y: event.clientY });
  });

  document.addEventListener("pointerleave", () => {
    place(restX(), restY(), null);
  });
}

addStars();
openChapters();

if (motionOk && finePointer) {
  followCursor();
}

function openChapters() {
  const button = document.querySelector("#open-chapters");
  const chapters = document.querySelector(".chapters");

  if (!button || !chapters) {
    return;
  }

  button.addEventListener("click", () => {
    chapters.classList.add("is-open");
    button.setAttribute("aria-expanded", "true");
    chapters.scrollIntoView({ behavior: motionOk ? "smooth" : "auto", block: "start" });
  });
}

showExpiryNotice();

function showExpiryNotice() {
  const notice = document.querySelector("#expiry-notice");
  if (!notice) return;

  let products = [];
  try {
    const saved = JSON.parse(localStorage.getItem("fridgeflow-products") || "[]");
    if (Array.isArray(saved)) products = saved;
  } catch {
    products = [];
  }

  const urgent = products
    .filter((product) => product && product.name && !product.used)
    .map((product) => ({ product, days: noticeDaysUntil(product.expiry) }))
    .filter((entry) => entry.days <= 2);

  if (!urgent.length) return;

  const nearest = Math.min(...urgent.map((entry) => entry.days));
  const tone = noticeTone(nearest);
  notice.style.setProperty("--notice-bg", tone.background);
  notice.style.setProperty("--notice-ink", tone.ink);
  notice.hidden = false;

  const soon = urgent.filter((entry) => entry.days >= 0).map((entry) => entry.product.name);
  const expired = urgent.filter((entry) => entry.days < 0).map((entry) => entry.product.name);
  const text = document.createElement("p");
  const parts = [];
  if (soon.length) parts.push(`Вот-вот просрочится: ${soon.join(", ")}.`);
  if (expired.length) parts.push(`Срок уже истёк: ${expired.join(", ")}.`);
  text.textContent = `${parts.join(" ")} `;
  const link = document.createElement("a");
  link.href = "dashboard.html";
  link.textContent = "Открыть холодильник";
  text.append(link);
  notice.replaceChildren(text);
}

function noticeTone(days) {
  if (days >= 2) return { background: "#f5c400", ink: "#1b2410" };
  if (days === 1) return { background: "#f08a12", ink: "#1b2410" };
  if (days === 0) return { background: "#e23b2f", ink: "#fff8f4" };
  if (days === -1) return { background: "#c62828", ink: "#fff8f4" };
  return { background: "#8e1515", ink: "#fff8f4" };
}

function noticeDaysUntil(isoDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${isoDate}T00:00:00`);
  return Math.round((expiry - today) / 86400000);
}
