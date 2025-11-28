/* ------------------------------------------------------
   BLOODLINER PRIME HUB • LIFE x BODY x GHOST
   Netflix carousels + Ghost line + Bayesian/MonteCarlo-style projections
------------------------------------------------------ */

const STORAGE_KEY = "bloodliner_prime_hub_v1";

// Life orbits (12) – menestyjän samurai-alueet
const LIFE_ORBITS = [
  "Blade Focus",
  "Iron Discipline",
  "Warrior Recovery",
  "Strategic Life Moves",
  "Spirit Expansion",
  "Income Mastery",
  "Creative Forge",
  "Social Presence",
  "Love & Bonding",
  "Life Administration",
  "Minimalism & Purity",
  "High-Value Self"
];

// Body orbits (10) – lihasryhmät
const BODY_ORBITS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Core / Abs",
  "Quads",
  "Hamstrings",
  "Calves",
  "Cardio Engine"
];

// INITIAL DATA
let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  days: {},
  currentDay: 1,
  lastCompletedDay: null,
  streak: 0,
  ghostDistance: 1.0 // AU
};

// init 90 days
for (let i = 1; i <= 90; i++) {
  if (!data.days[i]) data.days[i] = createEmptyDay(i);
}
if (typeof data.ghostDistance !== "number") data.ghostDistance = 1.0;

save();

/* ------------------------------------------------------
   HELPERS
------------------------------------------------------ */

function createEmptyDay(n) {
  return {
    dayNumber: n,
    lifeDone: {},   // { orbitName: true }
    bodyDone: {},   // { orbitName: true }
    lifeScore: 0,
    bodyScore: 0,
    totalScore: 0,
    locked: false,
    pr: false,
    ghostDelta: 0,
    ghostDistanceAfter: null
  };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function recomputeDay(n) {
  const d = data.days[n];
  d.lifeScore = Object.values(d.lifeDone).filter(Boolean).length * 10;
  d.bodyScore = Object.values(d.bodyDone).filter(Boolean).length * 10;
  d.totalScore = d.lifeScore + d.bodyScore;
}

function computeGhostDelta(day) {
  // Negative delta = ghost closer (good day)
  let normalized = day.totalScore / 100;
  if (normalized > 1) normalized = 1;
  if (normalized < -1) normalized = -1;
  let delta = -normalized * 0.04;

  const hasAny =
    day.lifeScore !== 0 ||
    day.bodyScore !== 0 ||
    Object.values(day.lifeDone).some(Boolean) ||
    Object.values(day.bodyDone).some(Boolean);
  if (!hasAny) delta = 0;
  return delta;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/* Bayesian-ish intensity for Life/Body */
function computeLifeBodyIntensity() {
  let totalLife = 0;
  let totalBody = 0;
  let usedDays = 0;

  for (let i = 1; i <= 90; i++) {
    const d = data.days[i];
    const used =
      d.lifeScore !== 0 ||
      d.bodyScore !== 0 ||
      Object.values(d.lifeDone).some(Boolean) ||
      Object.values(d.bodyDone).some(Boolean);
    if (!used) continue;
    usedDays++;
    totalLife += d.lifeScore;
    totalBody += d.bodyScore;
  }

  if (usedDays === 0) {
    return { lifeInt: 0, bodyInt: 0, usedDays: 0 };
  }

  const maxDailyLife = LIFE_ORBITS.length * 10;
  const maxDailyBody = BODY_ORBITS.length * 10;

  const avgLife = totalLife / usedDays;
  const avgBody = totalBody / usedDays;

  const lifeInt = clamp(avgLife / maxDailyLife, 0, 1);
  const bodyInt = clamp(avgBody / maxDailyBody, 0, 1);

  return { lifeInt, bodyInt, usedDays, totalLife, totalBody };
}

/* Monte Carlo style projection: if current trend continues to 90 days */
function computeProjection() {
  const { lifeInt, bodyInt, usedDays, totalLife, totalBody } =
    computeLifeBodyIntensity();
  if (usedDays === 0) {
    return {
      lifeProb: null,
      bodyProb: null,
      overallProb: null,
      projectedScore: null
    };
  }

  // “Bayesian” style: probability = 40% + intensity * 60
  const lifeProb = Math.round(40 + lifeInt * 60);
  const bodyProb = Math.round(40 + bodyInt * 60);
  const overallProb = Math.round((lifeProb + bodyProb) / 2);

  const currentTotalScore = totalLife + totalBody;
  const avgPerDay = currentTotalScore / usedDays;
  const projectedScore = Math.round(avgPerDay * 90);

  return {
    lifeProb,
    bodyProb,
    overallProb,
    projectedScore
  };
}

/* ------------------------------------------------------
   DOM ELEMENTS
------------------------------------------------------ */

// HUD
const hudDay = document.getElementById("hud-day");
const hudStreak = document.getElementById("hud-streak");
const hudLifeXp = document.getElementById("hud-life-xp");
const hudBodyXp = document.getElementById("hud-body-xp");
const hudGhost = document.getElementById("hud-ghost");
const btnReset = document.getElementById("btn-reset");

// Hologram line
const holoLine = document.getElementById("hologram-line");

// Life carousel
const lifePrev = document.getElementById("life-prev");
const lifeNext = document.getElementById("life-next");
const lifeCircle = document.getElementById("life-orbit-circle");
const lifeNameEl = document.getElementById("life-orbit-name");
const lifeTodayEl = document.getElementById("life-orbit-today");
const lifeXpEl = document.getElementById("life-orbit-xp");
const lifeTags = document.getElementById("life-orbit-tags");

// Body carousel
const bodyPrev = document.getElementById("body-prev");
const bodyNext = document.getElementById("body-next");
const bodyCircle = document.getElementById("body-orbit-circle");
const bodyNameEl = document.getElementById("body-orbit-name");
const bodyTodayEl = document.getElementById("body-orbit-today");
const bodyXpEl = document.getElementById("body-orbit-xp");
const bodyTags = document.getElementById("body-orbit-tags");

// Season card
const dayGrid = document.getElementById("day-grid");
const predLifeEl = document.getElementById("pred-life");
const predBodyEl = document.getElementById("pred-body");
const predOverallEl = document.getElementById("pred-overall");
const btnFinalizeDay = document.getElementById("btn-finalize-day");

// Modal
const modalBackdrop = document.getElementById("day-modal-backdrop");
const modalDayTitle = document.getElementById("modal-day-title");
const modalLifeScore = document.getElementById("modal-life-score");
const modalBodyScore = document.getElementById("modal-body-score");
const modalTotalScore = document.getElementById("modal-total-score");
const modalLifeList = document.getElementById("modal-life-list");
const modalBodyList = document.getElementById("modal-body-list");
const modalGhostDistance = document.getElementById("modal-ghost-distance");
const modalGhostShift = document.getElementById("modal-ghost-shift");
const modalClose = document.getElementById("modal-close");

// Ticker
const tickerInner = document.getElementById("ticker-inner");

/* Carousel state */
let currentLifeIndex = 0;
let currentBodyIndex = 0;

/* Double-tap detection */
let lastTap = { type: null, index: null, time: 0 };

/* ------------------------------------------------------
   RENDERING
------------------------------------------------------ */

function renderHUD() {
  hudDay.textContent = `${data.currentDay} / 90`;
  hudStreak.textContent = data.streak || 0;

  // Total life/body XP across season
  let totalLife = 0;
  let totalBody = 0;
  for (let i = 1; i <= 90; i++) {
    const d = data.days[i];
    totalLife += d.lifeScore || 0;
    totalBody += d.bodyScore || 0;
  }
  hudLifeXp.textContent = totalLife;
  hudBodyXp.textContent = totalBody;

  hudGhost.textContent = `${data.ghostDistance.toFixed(2)} AU`;
}

function computeOrbitCompletionRatio(isLife, orbitName) {
  let count = 0;
  for (let i = 1; i <= 90; i++) {
    const d = data.days[i];
    if (isLife) {
      if (d.lifeDone && d.lifeDone[orbitName]) count++;
    } else {
      if (d.bodyDone && d.bodyDone[orbitName]) count++;
    }
  }
  return count / 90;
}

function renderLifeOrbit() {
  const orbit = LIFE_ORBITS[currentLifeIndex];
  const d = data.days[data.currentDay];
  const doneToday = !!d.lifeDone[orbit];
  const ratio = computeOrbitCompletionRatio(true, orbit);
  const deg = Math.round(ratio * 360);
  lifeCircle.style.setProperty("--progress", `${deg}deg`);

  lifeNameEl.textContent = orbit;
  lifeTodayEl.textContent = `Tänään: ${doneToday ? "DONE" : "—"}`;
  lifeXpEl.textContent = `XP: ${Math.round(ratio * 100)}% (${Math.round(
    ratio * 90
  )}/90)`;

  lifeTags.innerHTML = "";
  LIFE_ORBITS.forEach((name, idx) => {
    const tag = document.createElement("div");
    tag.className = "orbit-tag";
    tag.textContent = name;
    if (idx === currentLifeIndex) {
      tag.style.borderColor = "#22c55e";
      tag.style.color = "#bbf7d0";
    }
    lifeTags.appendChild(tag);
  });
}

function renderBodyOrbit() {
  const orbit = BODY_ORBITS[currentBodyIndex];
  const d = data.days[data.currentDay];
  const doneToday = !!d.bodyDone[orbit];
  const ratio = computeOrbitCompletionRatio(false, orbit);
  const deg = Math.round(ratio * 360);
  bodyCircle.style.setProperty("--progress", `${deg}deg`);

  bodyNameEl.textContent = orbit;
  bodyTodayEl.textContent = `Tänään: ${doneToday ? "DONE" : "—"}`;
  bodyXpEl.textContent = `XP: ${Math.round(ratio * 100)}% (${Math.round(
    ratio * 90
  )}/90)`;

  bodyTags.innerHTML = "";
  BODY_ORBITS.forEach((name, idx) => {
    const tag = document.createElement("div");
    tag.className = "orbit-tag";
    tag.textContent = name;
    if (idx === currentBodyIndex) {
      tag.style.borderColor = "#38bdf8";
      tag.style.color = "#bae6fd";
    }
    bodyTags.appendChild(tag);
  });
}

function renderSeasonGrid() {
  dayGrid.innerHTML = "";

  let maxScore = 0;
  for (let i = 1; i <= 90; i++) {
    maxScore = Math.max(maxScore, data.days[i].totalScore || 0);
  }

  for (let i = 1; i <= 90; i++) {
    const d = data.days[i];
    const cell = document.createElement("div");
    cell.className = "day-cell";
    cell.dataset.day = i;

    let cls = "day-empty";
    if (d.totalScore > 0 && maxScore > 0) {
      const r = d.totalScore / maxScore;
      if (r < 0.25) cls = "day-low";
      else if (r < 0.5) cls = "day-mid";
      else if (r < 0.8) cls = "day-high";
      else cls = "day-elite";
    }
    cell.classList.add(cls);

    if (i === data.currentDay) cell.classList.add("current");
    if (d.pr) cell.classList.add("pr");

    cell.innerHTML = `<span>${i}</span>`;
    cell.addEventListener("click", () => openDay(i));
    dayGrid.appendChild(cell);
  }
}

function renderPredictions() {
  const proj = computeProjection();
  if (proj.lifeProb == null) {
    predLifeEl.textContent = "—";
    predBodyEl.textContent = "—";
    predOverallEl.textContent = "—";
    return;
  }
  predLifeEl.textContent = `${proj.lifeProb}%`;
  predBodyEl.textContent = `${proj.bodyProb}%`;
  predOverallEl.textContent = `${proj.overallProb}% • proj. score ${proj.projectedScore}`;
}

/* Hologrammi-lanka visual */
function getLastFinalizedDay() {
  let last = null;
  for (let i = 1; i <= 90; i++) {
    if (data.days[i].locked) last = data.days[i];
  }
  return last;
}

function updateHologramLine() {
  if (!holoLine) return;

  const lastDay = getLastFinalizedDay();
  if (!lastDay) {
    holoLine.style.width = "80px";
    holoLine.style.opacity = "0.25";
    holoLine.style.transform = "rotate(0deg)";
    holoLine.classList.remove("flash");
    return;
  }

  let momentum = lastDay.totalScore;
  momentum = clamp(momentum, -50, 200);
  const baseWidth = 80;
  const width = baseWidth + momentum * 0.5;

  const delta = lastDay.ghostDelta || 0;
  let angle = delta * -80;
  angle = clamp(angle, -25, 25);

  const finalWidth = Math.max(40, width);

  holoLine.style.width = `${finalWidth}px`;
  holoLine.style.opacity = "0.9";
  holoLine.style.transform = `rotate(${angle}deg)`;

  // color bias: more life vs body
  const { lifeInt, bodyInt } = computeLifeBodyIntensity();
  if (lifeInt === 0 && bodyInt === 0) {
    holoLine.style.filter = "hue-rotate(0deg)";
  } else {
    const diff = bodyInt - lifeInt;
    const hueShift = diff * 40; // + = blueish, - = greenish
    holoLine.style.filter = `hue-rotate(${hueShift}deg)`;
  }
}

function flashHologram() {
  if (!holoLine) return;
  holoLine.classList.add("flash");
  setTimeout(() => holoLine.classList.remove("flash"), 350);
}

/* XP burst on orbit */
function orbitXpBurst(circle, label) {
  const span = document.createElement("div");
  span.className = "xp-burst";
  span.textContent = label || "+10";
  span.style.left = "50%";
  span.style.top = "50%";
  circle.appendChild(span);
  setTimeout(() => {
    if (span.parentNode) span.parentNode.removeChild(span);
  }, 600);
}

/* Ticker */
function updateTicker() {
  const segments = [];
  for (let i = 1; i <= 90; i++) {
    const d = data.days[i];
    const used =
      d.totalScore !== 0 ||
      Object.values(d.lifeDone).some(Boolean) ||
      Object.values(d.bodyDone).some(Boolean);
    if (!used) continue;

    let s = `DAY ${i} • LIFE ${d.lifeScore} • BODY ${d.bodyScore} • TOTAL ${d.totalScore}`;
    if (d.pr) s += " • PR🔥";
    if (typeof d.ghostDistanceAfter === "number") {
      s += ` • GHOST ${d.ghostDistanceAfter.toFixed(2)} AU`;
    }
    segments.push(s);
  }

  const proj = computeProjection();
  if (proj.lifeProb != null) {
    segments.push(
      `PROJ: LIFE ${proj.lifeProb}% • BODY ${proj.bodyProb}% • OVERALL ${proj.overallProb}% • SCORE~${proj.projectedScore}`
    );
  }

  tickerInner.textContent =
    segments.length === 0
      ? "BLOODLINER PRIME HUB • READY"
      : " | " + segments.join(" | ") + " | ";

  tickerInner.style.animation = "none";
  void tickerInner.offsetWidth;
  tickerInner.style.animation = "ticker-scroll 30s linear infinite";
}

/* ------------------------------------------------------
   DAY MODAL
------------------------------------------------------ */

function openDay(n) {
  data.currentDay = n;
  save();
  updateAll();

  const d = data.days[n];
  modalDayTitle.textContent = `Päivä ${n}`;
  modalLifeScore.textContent = d.lifeScore;
  modalBodyScore.textContent = d.bodyScore;
  modalTotalScore.textContent = d.totalScore;

  modalLifeList.innerHTML = "";
  const lifeDone = Object.entries(d.lifeDone).filter(([_, v]) => v);
  if (lifeDone.length === 0) {
    modalLifeList.innerHTML = "<li>Ei suoritettuja Life-orbiteja.</li>";
  } else {
    lifeDone.forEach(([name]) => {
      const li = document.createElement("li");
      li.textContent = name;
      modalLifeList.appendChild(li);
    });
  }

  modalBodyList.innerHTML = "";
  const bodyDone = Object.entries(d.bodyDone).filter(([_, v]) => v);
  if (bodyDone.length === 0) {
    modalBodyList.innerHTML = "<li>Ei treenattuja Body-orbiteja.</li>";
  } else {
    bodyDone.forEach(([name]) => {
      const li = document.createElement("li");
      li.textContent = name;
      modalBodyList.appendChild(li);
    });
  }

  if (typeof d.ghostDistanceAfter === "number") {
    modalGhostDistance.textContent = `${d.ghostDistanceAfter.toFixed(2)} AU`;
  } else {
    modalGhostDistance.textContent = "—";
  }

  if (typeof d.ghostDelta === "number" && d.ghostDelta !== 0) {
    if (d.ghostDelta < 0) {
      modalGhostShift.textContent = `Closer ${Math.abs(d.ghostDelta).toFixed(3)} AU`;
    } else {
      modalGhostShift.textContent = `Farther ${d.ghostDelta.toFixed(3)} AU`;
    }
  } else {
    modalGhostShift.textContent = "—";
  }

  modalBackdrop.style.display = "flex";
}

modalClose.addEventListener("click", () => {
  modalBackdrop.style.display = "none";
});

modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) modalBackdrop.style.display = "none";
});

/* ------------------------------------------------------
   EVENTS – CAROUSELS, DOUBLE TAP, FINALIZE, RESET
------------------------------------------------------ */

// Life carousel navigation
lifePrev.addEventListener("click", () => {
  currentLifeIndex =
    (currentLifeIndex - 1 + LIFE_ORBITS.length) % LIFE_ORBITS.length;
  renderLifeOrbit();
});

lifeNext.addEventListener("click", () => {
  currentLifeIndex = (currentLifeIndex + 1) % LIFE_ORBITS.length;
  renderLifeOrbit();
});

// Body carousel navigation
bodyPrev.addEventListener("click", () => {
  currentBodyIndex =
    (currentBodyIndex - 1 + BODY_ORBITS.length) % BODY_ORBITS.length;
  renderBodyOrbit();
});

bodyNext.addEventListener("click", () => {
  currentBodyIndex = (currentBodyIndex + 1) % BODY_ORBITS.length;
  renderBodyOrbit();
});

// Life orbit double-tap
lifeCircle.addEventListener("click", () => {
  const now = Date.now();
  const idx = currentLifeIndex;
  if (
    lastTap.type === "life" &&
    lastTap.index === idx &&
    now - lastTap.time < 350
  ) {
    toggleLifeOrbitDone(idx);
    lastTap = { type: null, index: null, time: 0 };
  } else {
    lastTap = { type: "life", index: idx, time: now };
  }
});

function toggleLifeOrbitDone(index) {
  const name = LIFE_ORBITS[index];
  const d = data.days[data.currentDay];
  if (d.locked) {
    alert("Päivä on lukittu.");
    return;
  }
  d.lifeDone[name] = !d.lifeDone[name];
  recomputeDay(data.currentDay);
  save();
  renderLifeOrbit();
  renderSeasonGrid();
  renderHUD();
  renderPredictions();
  updateTicker();
  updateHologramLine();
  orbitXpBurst(lifeCircle, d.lifeDone[name] ? "+10" : "0");
}

// Body orbit double-tap
bodyCircle.addEventListener("click", () => {
  const now = Date.now();
  const idx = currentBodyIndex;
  if (
    lastTap.type === "body" &&
    lastTap.index === idx &&
    now - lastTap.time < 350
  ) {
    toggleBodyOrbitDone(idx);
    lastTap = { type: null, index: null, time: 0 };
  } else {
    lastTap = { type: "body", index: idx, time: now };
  }
});

function toggleBodyOrbitDone(index) {
  const name = BODY_ORBITS[index];
  const d = data.days[data.currentDay];
  if (d.locked) {
    alert("Päivä on lukittu.");
    return;
  }
  d.bodyDone[name] = !d.bodyDone[name];
  recomputeDay(data.currentDay);
  save();
  renderBodyOrbit();
  renderSeasonGrid();
  renderHUD();
  renderPredictions();
  updateTicker();
  updateHologramLine();
  orbitXpBurst(bodyCircle, d.bodyDone[name] ? "+10" : "0");
}

// Finalize day
btnFinalizeDay.addEventListener("click", () => {
  const d = data.days[data.currentDay];
  if (d.locked) {
    alert("Päivä on jo finalized.");
    return;
  }

  if (
    d.lifeScore === 0 &&
    d.bodyScore === 0 &&
    !Object.values(d.lifeDone).some(Boolean) &&
    !Object.values(d.bodyDone).some(Boolean)
  ) {
    const ok = confirm(
      "Tälle päivälle ei ole Life- tai Body-suorituksia. Finalize silti?"
    );
    if (!ok) return;
  }

  // PR check
  let best = -Infinity;
  for (let i = 1; i <= 90; i++) {
    if (i === data.currentDay) continue;
    best = Math.max(best, data.days[i].totalScore);
  }
  d.pr = d.totalScore > best && d.totalScore > 0;

  // Ghost update
  const delta = computeGhostDelta(d);
  data.ghostDistance += delta;
  data.ghostDistance = clamp(data.ghostDistance, 0.2, 3.0);
  d.ghostDelta = delta;
  d.ghostDistanceAfter = data.ghostDistance;

  d.locked = true;

  // streak
  if (data.lastCompletedDay === data.currentDay - 1) {
    data.streak++;
  } else {
    data.streak = 1;
  }
  data.lastCompletedDay = data.currentDay;

  if (data.currentDay < 90) data.currentDay++;

  save();
  flashHologram();
  flashHUD();
  updateAll();
});

// HUD flash
function flashHUD() {
  const chips = document.querySelectorAll(".hud-chip");
  chips.forEach((c) => c.classList.add("flash"));
  setTimeout(() => chips.forEach((c) => c.classList.remove("flash")), 300);
}

// RESET
btnReset.addEventListener("click", () => {
  if (!confirm("Reset Bloodliner Prime Hub? Kaikki data poistetaan.")) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

/* ------------------------------------------------------
   UPDATE ALL
------------------------------------------------------ */

function updateAll() {
  for (let i = 1; i <= 90; i++) {
    recomputeDay(i);
  }
  save();
  renderHUD();
  renderLifeOrbit();
  renderBodyOrbit();
  renderSeasonGrid();
  renderPredictions();
  updateTicker();
  updateHologramLine();
}

/* INIT */
updateAll();
