/* BLOODLINER PRIME HUB • v4
   Life x Body x Ghost x Avatar x Destiny Whisper x Holo Console
*/

const STORAGE_KEY = "bloodliner_prime_hub_v4";

const LIFE_ORBITS = [
  "Mindforge Ritual",
  "Discipline Engine",
  "Aura Craft",
  "Wealth Sequence",
  "Creative Arc",
  "Spirit Core"
];

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

/* STATE INIT */

let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  days: {},
  currentDay: 1,
  lastCompletedDay: null,
  streak: 0,
  ghostDistance: 1.0
};

for (let i = 1; i <= 90; i++) {
  if (!data.days[i]) data.days[i] = createEmptyDay(i);
}
if (typeof data.ghostDistance !== "number") data.ghostDistance = 1.0;

save();

function createEmptyDay(dayNumber) {
  return {
    dayNumber,
    lifeDone: {},
    bodyDone: {},
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

/* Ghost delta */

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

/* Life/Body intensity */

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
    return { lifeInt: 0, bodyInt: 0, usedDays: 0, totalLife: 0, totalBody: 0 };
  }

  const maxDailyLife = LIFE_ORBITS.length * 10;
  const maxDailyBody = BODY_ORBITS.length * 10;

  const avgLife = totalLife / usedDays;
  const avgBody = totalBody / usedDays;

  return {
    lifeInt: clamp(avgLife / maxDailyLife, 0, 1),
    bodyInt: clamp(avgBody / maxDailyBody, 0, 1),
    usedDays,
    totalLife,
    totalBody
  };
}

/* Projection */

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

  return { lifeProb, bodyProb, overallProb, projectedScore };
}

/* OmniScore */

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

/* DOM ELEMENTS */

const hudDay = document.getElementById("hud-day");
const hudStreak = document.getElementById("hud-streak");
const hudLifeXp = document.getElementById("hud-life-xp");
const hudBodyXp = document.getElementById("hud-body-xp");
const hudGhost = document.getElementById("hud-ghost");
const hudOmni = document.getElementById("hud-omni");
const btnReset = document.getElementById("btn-reset");

const holoWrapper = document.getElementById("holo-wrapper");
const holoLine = document.getElementById("hologram-line");
const destinyWhisper = document.getElementById("destiny-whisper");
const holoAvatar = document.getElementById("holo-avatar");
const holoConsoleToggle = document.getElementById("holo-console-toggle");
const holoConsole = document.getElementById("holo-console");

const lifePrev = document.getElementById("life-prev");
const lifeNext = document.getElementById("life-next");
const lifeCircle = document.getElementById("life-orbit-circle");
const lifeNameEl = document.getElementById("life-orbit-name");
const lifeTodayEl = document.getElementById("life-orbit-today");
const lifeXpEl = document.getElementById("life-orbit-xp");
const lifeTags = document.getElementById("life-orbit-tags");

const bodyPrev = document.getElementById("body-prev");
const bodyNext = document.getElementById("body-next");
const bodyCircle = document.getElementById("body-orbit-circle");
const bodyNameEl = document.getElementById("body-orbit-name");
const bodyTodayEl = document.getElementById("body-orbit-today");
const bodyXpEl = document.getElementById("body-orbit-xp");
const bodyTags = document.getElementById("body-orbit-tags");

const dayGrid = document.getElementById("day-grid");
const predLifeEl = document.getElementById("pred-life");
const predBodyEl = document.getElementById("pred-body");
const predOverallEl = document.getElementById("pred-overall");
const btnFinalizeDay = document.getElementById("btn-finalize-day");

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

const tickerInner = document.getElementById("ticker-inner");

/* Holo Console DOM */

const hcOmni = document.getElementById("hc-omni");
const hcGhost = document.getElementById("hc-ghost");
const hcStreak = document.getElementById("hc-streak");
const hcToday = document.getElementById("hc-today");
const hcLastPr = document.getElementById("hc-last-pr");
const hcLifeProb = document.getElementById("hc-life-prob");
const hcBodyProb = document.getElementById("hc-body-prob");
const hcOverallProb = document.getElementById("hc-overall-prob");
const hcProjected = document.getElementById("hc-projected");
const hcGhostRange = document.getElementById("hc-ghost-range");
const hcLifeLoad = document.getElementById("hc-life-load");
const hcBodyLoad = document.getElementById("hc-body-load");
const ghostSparkline = document.getElementById("ghost-sparkline");

/* LOCAL UI STATE */

let currentLifeIndex = 0;
let currentBodyIndex = 0;
let lastTap = { type: null, index: null, time: 0 };
let holoConsoleOpen = false;

/* RENDER HUD */

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

/* Orbit ratios */

function computeOrbitCompletionRatio(isLife, name) {
  let count = 0;
  for (let i = 1; i <= 90; i++) {
    const d = data.days[i];
    const dict = isLife ? d.lifeDone : d.bodyDone;
    if (dict && dict[name]) count++;
  }
  return count / 90;
}

/* Life Orbit */

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

/* Body Orbit */

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

/* Season Grid */

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

/* Predictions */

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

/* Hologram + Avatar */

function getLastFinalizedDay() {
  let last = null;
  for (let i = 1; i <= 90; i++) if (data.days[i].locked) last = data.days[i];
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
    updateAvatarState();
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
  if (lifeInt || bodyInt) hueShift = (bodyInt - lifeInt) * 40;
  holoLine.style.filter = `hue-rotate(${hueShift}deg)`;

  updateAvatarState();
}

function flashHologram() {
  if (!holoLine) return;
  holoLine.classList.add("flash");
  setTimeout(() => holoLine.classList.remove("flash"), 350);
}

/* Avatar state */

function updateAvatarState() {
  if (!holoAvatar) return;

  const omni = computeOmniScore();
  const ghost = data.ghostDistance;
  const streak = data.streak || 0;

  holoAvatar.classList.remove(
    "avatar-state-base",
    "avatar-state-align",
    "avatar-state-momentum",
    "avatar-state-ascend"
  );

  let stateClass = "avatar-state-base";
  const closeGhost = ghost < 0.8;
  const farGhost = ghost > 1.5;

  if (omni < 400) {
    stateClass = "avatar-state-base";
  } else if (omni >= 400 && omni < 700) {
    if (closeGhost) stateClass = "avatar-state-align";
    else if (farGhost) stateClass = "avatar-state-base";
    else stateClass = "avatar-state-align";
  } else if (omni >= 700 && omni < 850) {
    if (streak >= 3) stateClass = "avatar-state-momentum";
    else stateClass = "avatar-state-align";
  } else if (omni >= 850) {
    stateClass = "avatar-state-ascend";
  }

  holoAvatar.classList.add(stateClass);
}

function pulseAvatar() {
  if (!holoAvatar) return;
  holoAvatar.classList.remove("avatar-pulse");
  void holoAvatar.offsetWidth;
  holoAvatar.classList.add("avatar-pulse");
  setTimeout(() => holoAvatar.classList.remove("avatar-pulse"), 600);
}

/* Destiny Whisper */

function computeDestinyWhisper() {
  const omni = computeOmniScore();
  const ghost = data.ghostDistance;
  const streak = data.streak || 0;
  const today = data.days[data.currentDay];

  const lifeToday = today.lifeScore || 0;
  const bodyToday = today.bodyScore || 0;

  const lowOmni = omni < 350;
  const midOmni = omni >= 350 && omni < 700;
  const highOmni = omni >= 700;

  const farGhost = ghost > 1.5;
  const closeGhost = ghost < 0.8;

  if (lowOmni && farGhost) {
    if (lifeToday === 0)
      return "Destiny: One Mindforge Ritual. Return to path.";
    if (bodyToday === 0)
      return "Destiny: One Body Core set. Anchor the day.";
    return "Destiny: Lock one Life orbit, then breathe slow.";
  }

  if (midOmni && farGhost) {
    return "Destiny: Tighten Discipline Engine. Trim one distraction.";
  }

  if (closeGhost && highOmni && streak >= 3) {
    if (bodyToday === 0)
      return "Destiny: Push Body Core. One strong set for future self.";
    return "Destiny: Refine Aura. Small improvement, big compounding.";
  }

  if (midOmni && streak <= 1) {
    return "Destiny: One small Life rep. Break hesitation.";
  }

  if (lifeToday === 0 && bodyToday === 0) {
    return "Destiny: Choose one orbit. Start with the smallest move.";
  }

  if (lifeToday > 0 && bodyToday === 0) {
    return "Destiny: Body wants in. One simple set is enough.";
  }

  if (bodyToday > 0 && lifeToday === 0) {
    return "Destiny: Forge the mind once before sleep.";
  }

  return "Destiny: You are on path. Protect the streak.";
}

function showDestinyWhisper() {
  if (!destinyWhisper) return;

  const msg = computeDestinyWhisper();
  destinyWhisper.textContent = msg || "Destiny: Listen. Then move once.";

  destinyWhisper.classList.remove("destiny-show");
  void destinyWhisper.offsetWidth;
  destinyWhisper.classList.add("destiny-show");

  pulseAvatar();

  setTimeout(() => {
    destinyWhisper.classList.remove("destiny-show");
  }, 2600);
}

/* XP Burst */

function orbitXpBurst(circle, label) {
  circle.querySelectorAll(".xp-burst").forEach((el) => el.remove());
  const span = document.createElement("div");
  span.className = "xp-burst";
  span.textContent = label || "+10";
  span.style.left = "50%";
  span.style.top = "50%";
  circle.appendChild(span);
  setTimeout(() => span.remove(), 600);
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

/* Modal */

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

/* Holo Console */

if (holoConsoleToggle && holoConsole) {
  holoConsoleToggle.addEventListener("click", () => {
    holoConsoleOpen = !holoConsoleOpen;
    holoConsole.classList.toggle("open", holoConsoleOpen);
    if (holoConsoleOpen) {
      updateHoloConsole();
      showDestinyWhisper();
    }
  });
}

function updateHoloConsole() {
  const omni = computeOmniScore();
  const ghost = data.ghostDistance;
  const streak = data.streak || 0;
  const today = data.days[data.currentDay];
  const proj = computeProjection();

  const todayLife = today.lifeScore || 0;
  const todayBody = today.bodyScore || 0;

  if (hcOmni) hcOmni.textContent = omni;
  if (hcGhost) hcGhost.textContent = `${ghost.toFixed(2)} AU`;
  if (hcStreak) hcStreak.textContent = streak;
  if (hcToday) hcToday.textContent = `${todayLife} / ${todayBody}`;

  if (hcLifeProb)
    hcLifeProb.textContent =
      proj.lifeProb == null ? "—" : `${proj.lifeProb}%`;
  if (hcBodyProb)
    hcBodyProb.textContent =
      proj.bodyProb == null ? "—" : `${proj.bodyProb}%`;
  if (hcOverallProb)
    hcOverallProb.textContent =
      proj.overallProb == null ? "—" : `${proj.overallProb}%`;
  if (hcProjected)
    hcProjected.textContent =
      proj.projectedScore == null ? "—" : proj.projectedScore;

  // Last PR
  let lastPrDay = null;
  for (let i = 1; i <= 90; i++) {
    if (data.days[i].pr) lastPrDay = i;
  }
  if (hcLastPr)
    hcLastPr.textContent = lastPrDay ? `Day ${lastPrDay}` : "—";

  // Ghost range & sparkline
  if (ghostSparkline && hcGhostRange) {
    ghostSparkline.innerHTML = "";
    const values = [];
    for (let i = 1; i <= 90; i++) {
      const d = data.days[i];
      if (typeof d.ghostDistanceAfter === "number") {
        values.push(d.ghostDistanceAfter);
      }
    }
    if (values.length === 0) {
      hcGhostRange.textContent = "—";
    } else {
      const first = values[0];
      const last = values[values.length - 1];
      hcGhostRange.textContent = `${first.toFixed(2)} → ${last.toFixed(2)} AU`;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const steps = 30;
      for (let i = 0; i < steps; i++) {
        const idx = Math.floor((i / (steps - 1)) * (values.length - 1));
        const v = values[idx];
        const bar = document.createElement("div");
        bar.className = "ghost-bar";
        const norm = max === min ? 0.5 : (v - min) / (max - min);
        const h = 12 + norm * 24;
        bar.style.height = `${h}px`;
        if (idx === values.length - 1) bar.classList.add("active");
        ghostSparkline.appendChild(bar);
      }
    }
  }

  // Life / Body load bars
  let totalLife = 0;
  let totalBody = 0;
  for (let i = 1; i <= 90; i++) {
    const d = data.days[i];
    totalLife += d.lifeScore || 0;
    totalBody += d.bodyScore || 0;
  }
  const maxLife = LIFE_ORBITS.length * 10 * 90;
  const maxBody = BODY_ORBITS.length * 10 * 90;
  const lifeLoadRatio = maxLife ? clamp(totalLife / maxLife, 0, 1) : 0;
  const bodyLoadRatio = maxBody ? clamp(totalBody / maxBody, 0, 1) : 0;

  if (hcLifeLoad)
    hcLifeLoad.style.width = `${Math.round(lifeLoadRatio * 100)}%`;
  if (hcBodyLoad)
    hcBodyLoad.style.width = `${Math.round(bodyLoadRatio * 100)}%`;
}

/* Orbit navigation & double tap */

lifePrev.addEventListener("click", () => {
  currentLifeIndex =
    (currentLifeIndex - 1 + LIFE_ORBITS.length) % LIFE_ORBITS.length;
  renderLifeOrbit();
});

lifeNext.addEventListener("click", () => {
  currentLifeIndex = (currentLifeIndex + 1) % LIFE_ORBITS.length;
  renderLifeOrbit();
});

bodyPrev.addEventListener("click", () => {
  currentBodyIndex =
    (currentBodyIndex - 1 + BODY_ORBITS.length) % BODY_ORBITS.length;
  renderBodyOrbit();
});

bodyNext.addEventListener("click", () => {
  currentBodyIndex = (currentBodyIndex + 1) % BODY_ORBITS.length;
  renderBodyOrbit();
});

/* Double-tap Life */

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
  updateHoloConsole();
  orbitXpBurst(lifeCircle, d.lifeDone[name] ? "+10" : "0");
}

/* Double-tap Body */

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
  updateHoloConsole();
  orbitXpBurst(bodyCircle, d.bodyDone[name] ? "+10" : "0");
}

/* Hologram Destiny Whisper trigger */

if (holoLine) {
  holoLine.addEventListener("click", showDestinyWhisper);
}

/* Finalize Day */

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

  recomputeDay(data.currentDay);

  let best = 0;
  for (let i = 1; i <= 90; i++) {
    if (i === data.currentDay) continue;
    best = Math.max(best, data.days[i].totalScore);
  }
  d.pr = d.totalScore > best && d.totalScore > 0;

  const delta = computeGhostDelta(d);
  d.ghostDelta = delta;
  data.ghostDistance = clamp(data.ghostDistance + delta, 0.2, 3.0);
  d.ghostDistanceAfter = data.ghostDistance;

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

function flashHUD() {
  document.querySelectorAll(".hud-chip").forEach((chip) => {
    chip.classList.add("flash");
    setTimeout(() => chip.classList.remove("flash"), 300);
  });
}

/* Reset */

btnReset.addEventListener("click", () => {
  if (!confirm("Reset Bloodliner Prime Hub? Kaikki data poistetaan.")) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

/* Master update */

function updateAll() {
  for (let i = 1; i <= 90; i++) recomputeDay(i);
  save();
  renderHUD();
  renderLifeOrbit();
  renderBodyOrbit();
  renderSeasonGrid();
  renderPredictions();
  updateTicker();
  updateHologramLine();
  updateHoloConsole();
}

/* INIT */

updateAll();
