/* ------------------------------------------------------
   BLOODLINER PRIME HUB • FINAL LAUNCH BUILD
   Life x Body x Ghost x OmniScore
   - 6 Life-orbits (media-mystic)
   - 10 Body-orbits
   - 90 day grid
   - Ghost line
   - OmniScore (0–1000)
------------------------------------------------------ */

const STORAGE_KEY = "bloodliner_prime_hub_v2";

/* LIFE ORBITS – 6 HABITS OF ASCENSION */
const LIFE_ORBITS = [
  "Mindforge Ritual",
  "Discipline Engine",
  "Aura Craft",
  "Wealth Sequence",
  "Creative Arc",
  "Spirit Core"
];

/* BODY ORBITS – MUSCLE SET */
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

/* ------------------------------------------------------
   STATE INIT
------------------------------------------------------ */

let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  days: {},
  currentDay: 1,
  lastCompletedDay: null,
  streak: 0,
  ghostDistance: 1.0
};

// init 90 days if missing
for (let i = 1; i <= 90; i++) {
  if (!data.days[i]) data.days[i] = createEmptyDay(i);
}
if (typeof data.ghostDistance !== "number") data.ghostDistance = 1.0;

save();

/* ------------------------------------------------------
   HELPERS
------------------------------------------------------ */

function createEmptyDay(dayNumber) {
  return {
    dayNumber,
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

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function recomputeDay(n) {
  const d = data.days[n];
  d.lifeScore = Object.values(d.lifeDone).filter(Boolean).length * 10;
  d.bodyScore = Object.values(d.bodyDone).filter(Boolean).length * 10;
  d.totalScore = d.lifeScore + d.bodyScore;
}

/* ghostDelta: negative = ghost closer (good day), positive = further */
function computeGhostDelta(day) {
  let normalized = day.totalScore / 100;
  if (normalized > 1) normalized = 1;
  if (normalized < -1) normalized = -1;

  let delta = -normalized * 0.04;

  const hasAny =
    day.lifeScore !== 0 ||
    day.bodyScore !== 0 ||
    Object.values(day.lifeDone).some(Boolean) ||
    Object.values(day.bodyDone).some(Boolean);

  return hasAny ? delta : 0;
}

/* Life/Body intensity across used days */
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
    return {
      lifeInt: 0,
      bodyInt: 0,
      usedDays: 0,
      totalLife: 0,
      totalBody: 0
    };
  }

  const maxDailyLife = LIFE_ORBITS.length * 10;
  const maxDailyBody = BODY_ORBITS.length * 10;

  const avgLife = totalLife / usedDays;
  const avgBody = totalBody / usedDays;

  const lifeInt = clamp(avgLife / maxDailyLife, 0, 1);
  const bodyInt = clamp(avgBody / maxDailyBody, 0, 1);

  return { lifeInt, bodyInt, usedDays, totalLife, totalBody };
}

/* Monte Carlo-style projection & probabilities */
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

/* OmniScore 0–1000 */
function computeOmniScore() {
  let totalLife = 0;
  let totalBody = 0;

  for (let i = 1; i <= 90; i++) {
    const d = data.days[i];
    totalLife += d.lifeScore || 0;
    totalBody += d.bodyScore || 0;
  }

  const maxLife = LIFE_ORBITS.length * 10 * 90;
  const maxBody = BODY_ORBITS.length * 10 * 90;
  const lifeRatio = maxLife ? clamp(totalLife / maxLife, 0, 1) : 0;
  const bodyRatio = maxBody ? clamp(totalBody / maxBody, 0, 1) : 0;

  let ghostAlignment = 1 - Math.abs(data.ghostDistance - 1.0) / 2;
  ghostAlignment = clamp(ghostAlignment, 0, 1);

  const proj = computeProjection();
  const lifeProb = proj.lifeProb != null ? proj.lifeProb / 100 : 0;
  const bodyProb = proj.bodyProb != null ? proj.bodyProb / 100 : 0;
  const overallProb = proj.overallProb != null ? proj.overallProb / 100 : 0;

  let score =
    lifeRatio * 0.25 +
    bodyRatio * 0.25 +
    ghostAlignment * 0.2 +
    lifeProb * 0.1 +
    bodyProb * 0.1 +
    overallProb * 0.1;

  return Math.round(clamp(score, 0, 1) * 1000);
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
const hudOmni = document.getElementById("hud-omni");
const btnReset = document.getElementById("btn-reset");

// Hologram line
const holoLine = document.getElementById("hologram-line");

// Life orbit
const lifePrev = document.getElementById("life-prev");
const lifeNext = document.getElementById("life-next");
const lifeCircle = document.getElementById("life-orbit-circle");
const lifeNameEl = document.getElementById("life-orbit-name");
const lifeTodayEl = document.getElementById("life-orbit-today");
const lifeXpEl = document.getElementById("life-orbit-xp");
const lifeTags = document.getElementById("life-orbit-tags");

// Body orbit
const bodyPrev = document.getElementById("body-prev");
const bodyNext = document.getElementById("body-next");
const bodyCircle = document.getElementById("body-orbit-circle");
const bodyNameEl = document.getElementById("body-orbit-name");
const bodyTodayEl = document.getElementById("body-orbit-today");
const bodyXpEl = document.getElementById("body-orbit-xp");
const bodyTags = document.getElementById("body-orbit-tags");

// Season
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

/* Local UI state */
let currentLifeIndex = 0;
let currentBodyIndex = 0;
let lastTap = { type: null, index: null, time: 0 };

/* ------------------------------------------------------
   RENDERING
------------------------------------------------------ */

function renderHUD() {
  hudDay.textContent = `${data.currentDay} / 90`;
  hudStreak.textContent = data.streak || 0;

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

  const omni = computeOmniScore();
  hudOmni.textContent = omni;
}

function computeOrbitCompletionRatio(isLife, name) {
  let count = 0;
  for (let i = 1; i <= 90; i++) {
    const d = data.days[i];
    const dict = isLife ? d.lifeDone : d.bodyDone;
    if (dict && dict[name]) count++;
  }
  return count / 90;
}

function renderLifeOrbit() {
  const name = LIFE_ORBITS[currentLifeIndex];
  const d = data.days[data.currentDay];
  const doneToday = !!d.lifeDone[name];
  const ratio = computeOrbitCompletionRatio(true, name);
  const deg = Math.round(ratio * 360);

  lifeCircle.style.setProperty("--progress", `${deg}deg`);
  lifeNameEl.textContent = name;
  lifeTodayEl.textContent = `Tänään: ${doneToday ? "DONE" : "—"}`;
  lifeXpEl.textContent = `XP: ${Math.round(ratio * 100)}% (${Math.round(
    ratio * 90
  )}/90)`;

  lifeTags.innerHTML = "";
  LIFE_ORBITS.forEach((orbitName, idx) => {
    const tag = document.createElement("div");
    tag.className = "orbit-tag";
    tag.textContent = orbitName;
    if (idx === currentLifeIndex) {
      tag.style.borderColor = "#22c55e";
      tag.style.color = "#bbf7d0";
    }
    lifeTags.appendChild(tag);
  });
}

function renderBodyOrbit() {
  const name = BODY_ORBITS[currentBodyIndex];
  const d = data.days[data.currentDay];
  const doneToday = !!d.bodyDone[name];
  const ratio = computeOrbitCompletionRatio(false, name);
  const deg = Math.round(ratio * 360);

  bodyCircle.style.setProperty("--progress", `${deg}deg`);
  bodyNameEl.textContent = name;
  bodyTodayEl.textContent = `Tänään: ${doneToday ? "DONE" : "—"}`;
  bodyXpEl.textContent = `XP: ${Math.round(ratio * 100)}% (${Math.round(
    ratio * 90
  )}/90)`;

  bodyTags.innerHTML = "";
  BODY_ORBITS.forEach((orbitName, idx) => {
    const tag = document.createElement("div");
    tag.className = "orbit-tag";
    tag.textContent = orbitName;
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
    cell.className = "day-cell day-empty";
    cell.dataset.day = i;

    if (d.totalScore > 0 && maxScore > 0) {
      const r = d.totalScore / maxScore;
      cell.classList.remove("day-empty");
      if (r < 0.25) cell.classList.add("day-low");
      else if (r < 0.5) cell.classList.add("day-mid");
      else if (r < 0.8) cell.classList.add("day-high");
      else cell.classList.add("day-elite");
    }

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

/* ------------------------------------------------------
   HOLOGRAM LINE
------------------------------------------------------ */

function getLastFinalizedDay() {
  let last = null;
  for (let i = 1; i <= 90; i++) {
    const d = data.days[i];
    if (d.locked) last = d;
  }
  return last;
}

function updateHologramLine() {
  if (!holoLine) return;

  const last = getLastFinalizedDay();
  if (!last) {
    holoLine.style.width = "80px";
    holoLine.style.opacity = "0.25";
    holoLine.style.transform = "rotate(0deg)";
    holoLine.style.filter = "none";
    return;
  }

  let momentum = last.totalScore;
  momentum = clamp(momentum, -50, 200);
  const width = 80 + momentum * 0.5;
  holoLine.style.width = `${Math.max(40, width)}px`;
  holoLine.style.opacity = "1";

  const angle = clamp(last.ghostDelta * -80, -25, 25);
  holoLine.style.transform = `rotate(${angle}deg)`;

  const { lifeInt, bodyInt } = computeLifeBodyIntensity();
  let hueShift = 0;
  if (lifeInt || bodyInt) {
    hueShift = (bodyInt - lifeInt) * 40;
  }
  holoLine.style.filter = `hue-rotate(${hueShift}deg)`;
}

function flashHologram() {
  holoLine.classList.add("flash");
  setTimeout(() => holoLine.classList.remove("flash"), 350);
}

/* ------------------------------------------------------
   XP BURST
------------------------------------------------------ */

function orbitXpBurst(circle, label) {
  // cleanup old bursts (bugfix)
  circle.querySelectorAll(".xp-burst").forEach((el) => el.remove());

  const span = document.createElement("div");
  span.className = "xp-burst";
  span.textContent = label || "+10";
  span.style.left = "50%";
  span.style.top = "50%";
  circle.appendChild(span);
  setTimeout(() => span.remove(), 600);
}

/* ------------------------------------------------------
   TICKER
------------------------------------------------------ */

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
      `PROJ: LIFE ${proj.lifeProb}% • BODY ${proj.bodyProb}% • OVERALL ${proj.overallProb}%`
    );
  }

  const omni = computeOmniScore();
  segments.push(`OMNISCORE ${omni}/1000`);

  tickerInner.textContent =
    segments.length === 0
      ? "BLOODLINER PRIME HUB • READY"
      : " | " + segments.join(" | ") + " | ";

  tickerInner.style.animation = "none";
  void tickerInner.offsetWidth;
  tickerInner.style.animation = "ticker-scroll 30s linear infinite";
}

/* ------------------------------------------------------
   MODAL
------------------------------------------------------ */

function openDay(dayNumber) {
  data.currentDay = dayNumber;
  save();
  updateAll();

  const d = data.days[dayNumber];
  modalDayTitle.textContent = `Päivä ${dayNumber}`;
  modalLifeScore.textContent = d.lifeScore;
  modalBodyScore.textContent = d.bodyScore;
  modalTotalScore.textContent = d.totalScore;

  modalLifeList.innerHTML = "";
  const lifeDoneEntries = Object.entries(d.lifeDone).filter(([_, v]) => v);
  if (lifeDoneEntries.length === 0) {
    modalLifeList.innerHTML = "<li>Ei suoritettuja Life-orbiteja.</li>";
  } else {
    lifeDoneEntries.forEach(([name]) => {
      const li = document.createElement("li");
      li.textContent = name;
      modalLifeList.appendChild(li);
    });
  }

  modalBodyList.innerHTML = "";
  const bodyDoneEntries = Object.entries(d.bodyDone).filter(([_, v]) => v);
  if (bodyDoneEntries.length === 0) {
    modalBodyList.innerHTML = "<li>Ei treenattuja Body-orbiteja.</li>";
  } else {
    bodyDoneEntries.forEach(([name]) => {
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

  if (typeof d.ghostDelta === "number") {
    if (d.ghostDelta === 0) {
      modalGhostShift.textContent = "0.000 AU";
    } else if (d.ghostDelta < 0) {
      modalGhostShift.textContent = `Closer ${Math.abs(d.ghostDelta).toFixed(
        3
      )} AU`;
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
   EVENTS – ORBIT NAV & DOUBLE TAP
------------------------------------------------------ */

// Life orbit navigation
lifePrev.addEventListener("click", () => {
  currentLifeIndex =
    (currentLifeIndex - 1 + LIFE_ORBITS.length) % LIFE_ORBITS.length;
  renderLifeOrbit();
});

lifeNext.addEventListener("click", () => {
  currentLifeIndex = (currentLifeIndex + 1) % LIFE_ORBITS.length;
  renderLifeOrbit();
});

// Body orbit navigation
bodyPrev.addEventListener("click", () => {
  currentBodyIndex =
    (currentBodyIndex - 1 + BODY_ORBITS.length) % BODY_ORBITS.length;
  renderBodyOrbit();
});

bodyNext.addEventListener("click", () => {
  currentBodyIndex = (currentBodyIndex + 1) % BODY_ORBITS.length;
  renderBodyOrbit();
});

// Double-tap LIFE
lifeCircle.addEventListener("click", () => {
  const now = Date.now();
  const idx = currentLifeIndex;

  if (
    lastTap.type === "life" &&
    lastTap.index === idx &&
    now - lastTap.time < 350
  ) {
    toggleLifeOrbit(idx);
    lastTap = { type: null, index: null, time: 0 };
  } else {
    lastTap = { type: "life", index: idx, time: now };
  }
});

function toggleLifeOrbit(index) {
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

// Double-tap BODY
bodyCircle.addEventListener("click", () => {
  const now = Date.now();
  const idx = currentBodyIndex;

  if (
    lastTap.type === "body" &&
    lastTap.index === idx &&
    now - lastTap.time < 350
  ) {
    toggleBodyOrbit(idx);
    lastTap = { type: null, index: null, time: 0 };
  } else {
    lastTap = { type: "body", index: idx, time: now };
  }
});

function toggleBodyOrbit(index) {
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

/* ------------------------------------------------------
   FINALIZE DAY
------------------------------------------------------ */

btnFinalizeDay.addEventListener("click", () => {
  const d = data.days[data.currentDay];
  if (d.locked) {
    alert("Päivä on jo finalized.");
    return;
  }

  // Varaus jos täysin tyhjä päivä
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

  // varmuuden vuoksi
  recomputeDay(data.currentDay);

  // PR-check
  let best = 0;
  for (let i = 1; i <= 90; i++) {
    if (i === data.currentDay) continue;
    best = Math.max(best, data.days[i].totalScore);
  }
  d.pr = d.totalScore > best && d.totalScore > 0;

  // Ghost update
  const delta = computeGhostDelta(d);
  d.ghostDelta = delta;
  data.ghostDistance = clamp(data.ghostDistance + delta, 0.2, 3.0);
  d.ghostDistanceAfter = data.ghostDistance;

  // streak
  if (data.lastCompletedDay === data.currentDay - 1) data.streak++;
  else data.streak = 1;
  data.lastCompletedDay = data.currentDay;

  d.locked = true;
  if (data.currentDay < 90) data.currentDay++;

  save();
  flashHUD();
  flashHologram();
  updateAll();
});

/* HUD flash */
function flashHUD() {
  document.querySelectorAll(".hud-chip").forEach((chip) => {
    chip.classList.add("flash");
    setTimeout(() => chip.classList.remove("flash"), 300);
  });
}

/* ------------------------------------------------------
   RESET
------------------------------------------------------ */

btnReset.addEventListener("click", () => {
  if (!confirm("Reset Bloodliner Prime Hub? Kaikki data poistetaan.")) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

/* ------------------------------------------------------
   MASTER UPDATE
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
