/* ------------------------------------------------------
   BLOODLINER 90 • GHOST FUTURE + WAKE + HOLOGRAM + HABIT ORBITS + TAP TEST
------------------------------------------------------ */

const STORAGE_KEY = "bloodliner_v3_orbits_tap";

// PRIME WAKE WINDOW (06:00–08:00)
const PRIME_START_MIN = 6 * 60;
const PRIME_END_MIN = 8 * 60;

// ENERGY SCORE WEIGHTS
const ENERGY_WEIGHTS = {
  nicotine: -2,
  coffee: -1,
  water: 2,
  protein: 2,
  meal: 5,
  shots: -20
};

// MONEY (€) PER EVENT
const MONEY_WEIGHTS = {
  nicotine: 0.5,
  coffee: 1.5,
  water: -0.5,
  protein: 2.0,
  meal: 9.0,
  shots: 5.0
};

// FIXED HABITS – greatness orbits
const DEFAULT_HABITS = [
  "Sovereign Mind",
  "Warpath Discipline",
  "Prime Bodywork",
  "High-Value Creation",
  "Soul Alignment"
];

// INITIAL DATA
let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  days: {},
  currentDay: 1,
  lastCompletedDay: null,
  streak: 0,
  nicCleanStreak: 0,
  ghostDistance: 1.0, // AU
  habits: DEFAULT_HABITS
};

// Init days 1–90
for (let i = 1; i <= 90; i++) {
  if (!data.days[i]) data.days[i] = createEmptyDay(i);
}
if (!Array.isArray(data.habits) || data.habits.length === 0) {
  data.habits = DEFAULT_HABITS;
}
if (typeof data.nicCleanStreak !== "number") data.nicCleanStreak = 0;
if (typeof data.ghostDistance !== "number") data.ghostDistance = 1.0;

save();

/* ------------------------------------------------------
   HELPERS
------------------------------------------------------ */

function createEmptyDay(n) {
  return {
    dayNumber: n,
    wakeTimeMinutes: null,
    wakeScore: 0,
    energy: {
      nicotine: 0,
      coffee: 0,
      water: 0,
      protein: 0,
      meal: 0,
      shots: 0
    },
    moneySpent: 0,
    energyScore: 0,
    habitsDone: {},
    habitScore: 0,
    tap: {
      morningCount: null,
      eveningCount: null
    },
    tapScore: 0,
    totalScore: 0,
    tomorrowEnergy: null,
    locked: false,
    pr: false,
    ghostDelta: 0,
    ghostDistanceAfter: null
  };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function formatTimeFromMinutes(mins) {
  if (mins == null) return "—";
  let h = Math.floor(mins / 60);
  let m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function calculateWakeScore(mins) {
  if (mins == null) return 0;
  if (mins >= PRIME_START_MIN && mins <= PRIME_END_MIN) return 20;
  if (mins <= PRIME_END_MIN + 30) return 5;
  if (mins <= PRIME_END_MIN + 90) return -10;
  return -20;
}

function calculateEnergyScore(e) {
  let score = 0;
  for (const k of Object.keys(ENERGY_WEIGHTS)) {
    score += (e[k] || 0) * ENERGY_WEIGHTS[k];
  }
  return score;
}

function calculateMoney(e) {
  let euro = 0;
  for (const k of Object.keys(MONEY_WEIGHTS)) {
    euro += (e[k] || 0) * MONEY_WEIGHTS[k];
  }
  return euro;
}

function calculateHabitScore(map) {
  return Object.values(map).filter(Boolean).length * 10;
}

function calculateTapScore(tap) {
  if (!tap) return 0;
  const m = tap.morningCount || 0;
  const e = tap.eveningCount || 0;
  const raw = m + e;
  if (raw === 0) return 0;
  // skaalataan suunnilleen 0–20 välille
  const capped = Math.min(raw, 60);
  return Math.round(capped / 3);
}

function calculateTomorrowEnergy(totalScore) {
  let v = 50 + totalScore / 2;
  if (v < 0) v = 0;
  if (v > 100) v = 100;
  return Math.round(v);
}

function recomputeDay(n) {
  const d = data.days[n];
  d.wakeScore = calculateWakeScore(d.wakeTimeMinutes);
  d.energyScore = calculateEnergyScore(d.energy);
  d.moneySpent = calculateMoney(d.energy);
  d.habitScore = calculateHabitScore(d.habitsDone);
  d.tapScore = calculateTapScore(d.tap);
  d.totalScore = d.wakeScore + d.energyScore + d.habitScore + d.tapScore;
  d.tomorrowEnergy = calculateTomorrowEnergy(d.totalScore);
}

/**
 * GHOST FUTURE ENGINE:
 *  negatiivinen delta = ghost tulee lähemmäs
 *  positiivinen delta = ghost loittonee
 */
function computeGhostDelta(day) {
  let normalized = day.totalScore / 100;
  if (normalized > 1) normalized = 1;
  if (normalized < -1) normalized = -1;
  let delta = -normalized * 0.04;

  // Nikotiini rankaisee
  delta += (day.energy.nicotine || 0) * 0.04;
  // Shots rankaisee enemmän
  delta += (day.energy.shots || 0) * 0.06;

  // Tyhjä päivä -> ei liikettä
  const hasAny =
    day.totalScore !== 0 ||
    day.wakeTimeMinutes != null ||
    Object.values(day.energy).some((v) => v > 0) ||
    Object.values(day.habitsDone).some(Boolean);
  if (!hasAny) delta = 0;

  return delta;
}

/* ------------------------------------------------------
   DOM ELEMENTS
------------------------------------------------------ */

const hudDay = document.getElementById("hud-day");
const hudStreak = document.getElementById("hud-streak");
const hudNicStreak = document.getElementById("hud-nic-streak");
const hudGhost = document.getElementById("hud-ghost");
const hudTotalScore = document.getElementById("hud-total-score");

const holoLine = document.getElementById("hologram-line");

const dayGrid = document.getElementById("day-grid");
const btnReset = document.getElementById("btn-reset");

// Tap Test
const btnTapTest = document.getElementById("btn-tap-test");

// Wake
const btnWakeNow = document.getElementById("btn-wake-now");
const btnWakeInput = document.getElementById("btn-wake-input");
const wakeTimeLabel = document.getElementById("wake-time-label");
const wakeScoreLabel = document.getElementById("wake-score-label");

// Wake modal
const wakeModalBackdrop = document.getElementById("wake-modal-backdrop");
const wakeTimeInput = document.getElementById("wake-time-input");
const wakeModalCancel = document.getElementById("wake-modal-cancel");
const wakeModalSave = document.getElementById("wake-modal-save");

// Energy
const energyButtons = document.querySelectorAll(".energy-btn");
const cntNicotine = document.getElementById("cnt-nicotine");
const cntCoffee = document.getElementById("cnt-coffee");
const cntWater = document.getElementById("cnt-water");
const cntProtein = document.getElementById("cnt-protein");
const cntMeal = document.getElementById("cnt-meal");
const cntShots = document.getElementById("cnt-shots");

const energyScoreLabel = document.getElementById("energy-score-label");
const moneySpentLabel = document.getElementById("money-spent-label");
const tomorrowEnergyLabel = document.getElementById("tomorrow-energy-label");

// Habits Orbits
const habitOrbitRow = document.getElementById("habit-orbit-row");

// Summary
const habitScoreLabel = document.getElementById("habit-score-label");
const summaryWakeScoreLabel = document.getElementById("summary-wake-score-label");
const totalScoreLabel = document.getElementById("total-score-label");
const btnFinalizeDay = document.getElementById("btn-finalize-day");

// Modal
const modalBackdrop = document.getElementById("day-modal-backdrop");
const modalDayTitle = document.getElementById("modal-day-title");
const modalWakeTime = document.getElementById("modal-wake-time");
const modalWakeScore = document.getElementById("modal-wake-score");
const modalHabitScore = document.getElementById("modal-habit-score");
const modalEnergyScore = document.getElementById("modal-energy-score");
const modalTapTest = document.getElementById("modal-tap-test");
const modalTotalScore = document.getElementById("modal-total-score");
const modalMoneySpent = document.getElementById("modal-money-spent");
const modalTomorrowEnergy = document.getElementById("modal-tomorrow-energy");
const modalGhostDistance = document.getElementById("modal-ghost-distance");
const modalGhostShift = document.getElementById("modal-ghost-shift");
const modalHabits = document.getElementById("modal-habits");
const modalEnergyList = document.getElementById("modal-energy-list");
const modalClose = document.getElementById("modal-close");

// Ticker
const tickerInner = document.getElementById("ticker-inner");

/* Tap Test State */
let tapTestActive = false;
let tapTestStart = 0;
let tapTestCount = 0;
let tapTestTimerId = null;
let tapTestSlot = null; // "morning" or "evening"

/* ------------------------------------------------------
   RENDERING
------------------------------------------------------ */

function renderHUD() {
  hudDay.textContent = `${data.currentDay} / 90`;
  hudStreak.textContent = data.streak || 0;
  hudNicStreak.textContent = data.nicCleanStreak || 0;
  hudGhost.textContent = `${data.ghostDistance.toFixed(2)} AU`;

  let total = 0;
  for (let i = 1; i <= 90; i++) total += data.days[i].totalScore || 0;
  hudTotalScore.textContent = total;
}

function renderGrid() {
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

    // Score-color
    let cls = "day-empty";
    if (d.totalScore > 0 && maxScore > 0) {
      const r = d.totalScore / maxScore;
      if (r < 0.25) cls = "day-low";
      else if (r < 0.5) cls = "day-mid";
      else if (r < 0.8) cls = "day-high";
      else cls = "day-elite";
    }
    cell.classList.add(cls);

    // Habit marker
    if (Object.values(d.habitsDone).some(Boolean))
      cell.classList.add("day-habits-done");

    // Nicotine clean
    if ((d.energy.nicotine || 0) === 0)
      cell.classList.add("day-clean");

    // Ghost movement visual
    if (typeof d.ghostDelta === "number" && d.ghostDelta !== 0) {
      if (d.ghostDelta < 0) cell.classList.add("day-ghost-closer");
      else cell.classList.add("day-ghost-farther");
    }

    // Current + PR
    if (i === data.currentDay) cell.classList.add("current");
    if (d.pr) cell.classList.add("pr");

    cell.innerHTML = `<span>${i}</span>`;
    cell.addEventListener("click", () => openDay(i));
    dayGrid.appendChild(cell);
  }
}

function renderCurrentDay() {
  const d = data.days[data.currentDay];

  // Wake
  wakeTimeLabel.textContent = formatTimeFromMinutes(d.wakeTimeMinutes);
  wakeScoreLabel.textContent = d.wakeScore;

  // Energy
  cntNicotine.textContent = d.energy.nicotine;
  cntCoffee.textContent = d.energy.coffee;
  cntWater.textContent = d.energy.water;
  cntProtein.textContent = d.energy.protein;
  cntMeal.textContent = d.energy.meal;
  cntShots.textContent = d.energy.shots;

  energyScoreLabel.textContent = d.energyScore;
  moneySpentLabel.textContent = d.moneySpent.toFixed(2);
  tomorrowEnergyLabel.textContent =
    d.tomorrowEnergy == null ? "—" : d.tomorrowEnergy;

  // Habits
  renderHabitOrbits();
  habitScoreLabel.textContent = d.habitScore;
  summaryWakeScoreLabel.textContent = d.wakeScore;
  totalScoreLabel.textContent = d.totalScore;
}

/* ------------------------------------------------------
   HABIT ORBITS
------------------------------------------------------ */

let lastHabitTap = { name: null, time: 0 };

function computeHabitCompletionRatio(habitName) {
  let doneCount = 0;
  for (let i = 1; i <= 90; i++) {
    if (data.days[i].habitsDone && data.days[i].habitsDone[habitName]) {
      doneCount++;
    }
  }
  return doneCount / 90;
}

function renderHabitOrbits() {
  const d = data.days[data.currentDay];
  habitOrbitRow.innerHTML = "";

  data.habits.forEach((habit) => {
    const orb = document.createElement("div");
    orb.className = "habit-orb";

    const circle = document.createElement("div");
    circle.className = "habit-circle";

    const labelSpan = document.createElement("span");
    labelSpan.textContent = d.habitsDone[habit] ? "✓" : "";
    circle.appendChild(labelSpan);

    const nameEl = document.createElement("div");
    nameEl.className = "habit-orb-label";
    nameEl.textContent = habit;

    const ratio = computeHabitCompletionRatio(habit);
    const deg = Math.round(ratio * 360);
    circle.style.setProperty("--progress", `${deg}deg`);

    const percentEl = document.createElement("div");
    percentEl.className = "habit-orb-percent";
    percentEl.textContent = `${Math.round(ratio * 100)}%`;

    if (d.habitsDone[habit]) {
      orb.classList.add("done");
    }

    orb.appendChild(circle);
    orb.appendChild(nameEl);
    orb.appendChild(percentEl);

    orb.addEventListener("click", () => {
      if (d.locked) {
        alert("Päivä on lukittu.");
        return;
      }
      const now = Date.now();
      if (lastHabitTap.name === habit && now - lastHabitTap.time < 350) {
        // double tap → toggle
        const newVal = !d.habitsDone[habit];
        d.habitsDone[habit] = newVal;
        recomputeDay(data.currentDay);
        updateAll();
        habitXpBurst(circle, newVal ? "+10" : "0");
        lastHabitTap = { name: null, time: 0 };
      } else {
        lastHabitTap = { name: habit, time: now };
        circle.classList.remove("pulse-hit");
        void circle.offsetWidth;
        circle.classList.add("pulse-hit");
      }
    });

    habitOrbitRow.appendChild(orb);
  });
}

function habitXpBurst(container, label) {
  const span = document.createElement("div");
  span.className = "xp-burst";
  span.textContent = label || "+10";
  span.style.left = "50%";
  span.style.top = "50%";
  container.appendChild(span);
  setTimeout(() => {
    if (span.parentNode) span.parentNode.removeChild(span);
  }, 600);
}

/* ------------------------------------------------------
   TICKER
------------------------------------------------------ */

function updateTicker() {
  const segs = [];

  for (let i = 1; i <= 90; i++) {
    const d = data.days[i];
    const used =
      d.habitScore !== 0 ||
      d.energyScore !== 0 ||
      d.tapScore !== 0 ||
      d.wakeTimeMinutes != null ||
      Object.values(d.energy).some((v) => v > 0);

    if (!used) continue;

    let s = `DAY ${i} • SCORE ${d.totalScore}`;
    s += ` • WAKE ${formatTimeFromMinutes(d.wakeTimeMinutes)}`;
    s += ` • €${d.moneySpent.toFixed(2)}`;
    if ((d.energy.nicotine || 0) === 0) s += " • CLEAN";
    if (d.pr) s += " • PR🔥";
    if (typeof d.tapScore === "number" && d.tapScore > 0) {
      s += ` • TAP ${d.tapScore}`;
    }
    if (typeof d.ghostDistanceAfter === "number") {
      s += ` • GHOST ${d.ghostDistanceAfter.toFixed(2)} AU`;
    }

    segs.push(s);
  }

  tickerInner.textContent =
    segs.length === 0
      ? "BLOODLINER 90 • READY"
      : " | " + segs.join(" | ") + " | ";

  tickerInner.style.animation = "none";
  void tickerInner.offsetWidth;
  tickerInner.style.animation = "ticker-scroll 30s linear infinite";
}

/* ------------------------------------------------------
   HOLOGRAMMI-LANKA
------------------------------------------------------ */

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

  let momentum =
    lastDay.totalScore +
    ((lastDay.energy.nicotine || 0) === 0 ? 10 : -5);
  if (momentum < -50) momentum = -50;
  if (momentum > 150) momentum = 150;

  const baseWidth = 80;
  const width = baseWidth + momentum * 0.6;
  const delta = lastDay.ghostDelta || 0;

  let angle = delta * -80;
  if (angle > 25) angle = 25;
  if (angle < -25) angle = -25;

  const finalWidth = Math.max(40, width);

  holoLine.style.width = `${finalWidth}px`;
  holoLine.style.opacity = "0.9";
  holoLine.style.transform = `rotate(${angle}deg)`;
}

/* Dopamine flash for hologram */
function flashHologram() {
  if (!holoLine) return;
  holoLine.classList.add("flash");
  setTimeout(() => holoLine.classList.remove("flash"), 350);
}

/* HUD flash on finalize */
function flashHUD() {
  const chips = document.querySelectorAll(".hud-chip");
  chips.forEach((c) => c.classList.add("flash"));
  setTimeout(() => chips.forEach((c) => c.classList.remove("flash")), 300);
}

/* XP burst on energy button */
function energyXpBurst(btn, label) {
  const span = document.createElement("div");
  span.className = "xp-burst";
  span.textContent = label || "+1";
  span.style.left = "50%";
  span.style.top = "45%";
  btn.appendChild(span);
  setTimeout(() => {
    if (span.parentNode) span.parentNode.removeChild(span);
  }, 600);

  btn.classList.remove("pulse-hit");
  void btn.offsetWidth;
  btn.classList.add("pulse-hit");
}

/* ------------------------------------------------------
   DAY MODAL
------------------------------------------------------ */

function openDay(n) {
  data.currentDay = n;
  save();
  renderHUD();
  renderGrid();
  renderCurrentDay();
  updateTicker();
  updateHologramLine();

  const d = data.days[n];

  modalDayTitle.textContent = `Päivä ${n}`;
  modalWakeTime.textContent = formatTimeFromMinutes(d.wakeTimeMinutes);
  modalWakeScore.textContent = d.wakeScore;
  modalHabitScore.textContent = d.habitScore;
  modalEnergyScore.textContent = d.energyScore;
  modalTapTest.textContent = d.tapScore || 0;
  modalTotalScore.textContent = d.totalScore;
  modalMoneySpent.textContent = d.moneySpent.toFixed(2);
  modalTomorrowEnergy.textContent =
    d.tomorrowEnergy == null ? "—" : d.tomorrowEnergy;

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

  // Habits list
  modalHabits.innerHTML = "";
  const done = Object.entries(d.habitsDone).filter(([_, v]) => v);
  if (done.length === 0) {
    modalHabits.innerHTML = "<li>Ei suoritettuja habiteja.</li>";
  } else {
    done.forEach(([name]) => {
      const li = document.createElement("li");
      li.textContent = name;
      modalHabits.appendChild(li);
    });
  }

  // Energy list
  modalEnergyList.innerHTML = "";
  const labels = {
    nicotine: "Nicotine 🚬",
    coffee: "Coffee ☕",
    water: "Water 💧",
    protein: "Protein 🥫",
    meal: "Meal 🍽️",
    shots: "Shots 🧊"
  };
  let any = false;
  for (const k of Object.keys(labels)) {
    if (d.energy[k] > 0) {
      any = true;
      const li = document.createElement("li");
      li.textContent = `${labels[k]}: ${d.energy[k]}`;
      modalEnergyList.appendChild(li);
    }
  }
  if (!any) {
    modalEnergyList.innerHTML = "<li>Ei energia-tapahtumia.</li>";
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
   WAKE TIME INPUT MODAL
------------------------------------------------------ */

btnWakeInput.addEventListener("click", () => {
  const d = data.days[data.currentDay];
  if (d.locked) {
    alert("Päivä on lukittu.");
    return;
  }
  wakeTimeInput.value = "";
  wakeModalBackdrop.style.display = "flex";
});

wakeModalCancel.addEventListener("click", () => {
  wakeModalBackdrop.style.display = "none";
});

wakeModalBackdrop.addEventListener("click", (e) => {
  if (e.target === wakeModalBackdrop) {
    wakeModalBackdrop.style.display = "none";
  }
});

wakeModalSave.addEventListener("click", () => {
  const val = wakeTimeInput.value;
  if (!val) {
    alert("Syötä aika muodossa hh:mm.");
    return;
  }
  const [hhStr, mmStr] = val.split(":");
  const hh = parseInt(hhStr, 10);
  const mm = parseInt(mmStr, 10);
  if (
    Number.isNaN(hh) ||
    Number.isNaN(mm) ||
    hh < 0 ||
    hh > 23 ||
    mm < 0 ||
    mm > 59
  ) {
    alert("Aika ei kelpaa.");
    return;
  }
  const mins = hh * 60 + mm;
  const d = data.days[data.currentDay];
  if (d.locked) {
    alert("Päivä on lukittu.");
    wakeModalBackdrop.style.display = "none";
    return;
  }
  d.wakeTimeMinutes = mins;
  recomputeDay(data.currentDay);
  save();
  updateAll();
  wakeModalBackdrop.style.display = "none";
});

/* ------------------------------------------------------
   TAP TEST
------------------------------------------------------ */

btnTapTest.addEventListener("click", () => {
  const d = data.days[data.currentDay];
  if (d.locked) {
    alert("Päivä on lukittu.");
    return;
  }

  if (!tapTestActive) {
    // päätä slotti: ensin aamu, sitten ilta
    if (!d.tap) d.tap = { morningCount: null, eveningCount: null };
    if (d.tap.morningCount == null) tapTestSlot = "morning";
    else tapTestSlot = "evening";

    tapTestActive = true;
    tapTestStart = Date.now();
    tapTestCount = 0;

    btnTapTest.classList.add("tap-active");
    btnTapTest.textContent = tapTestSlot === "morning" ? "Tap Aamu (3s)" : "Tap Ilta (3s)";

    tapTestTimerId = setTimeout(() => {
      endTapTest();
    }, 3000);
  } else {
    // aktiivinen testi → klikkaus lasketaan
    tapTestCount++;
  }
});

function endTapTest() {
  tapTestActive = false;
  clearTimeout(tapTestTimerId);
  tapTestTimerId = null;

  const d = data.days[data.currentDay];
  if (!d.tap) d.tap = { morningCount: null, eveningCount: null };

  if (tapTestSlot === "morning") {
    d.tap.morningCount = tapTestCount;
  } else {
    d.tap.eveningCount = tapTestCount;
  }

  recomputeDay(data.currentDay);
  save();
  updateAll();

  btnTapTest.classList.remove("tap-active");
  btnTapTest.textContent = "Tap Test";

  tapTestSlot = null;
}

/* ------------------------------------------------------
   EVENTS: WAKE + ENERGY + FINALIZE + RESET
------------------------------------------------------ */

btnWakeNow.addEventListener("click", () => {
  const d = data.days[data.currentDay];
  if (d.locked) {
    alert("Päivä on lukittu.");
    return;
  }
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  d.wakeTimeMinutes = mins;
  recomputeDay(data.currentDay);
  updateAll();
});

energyButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const t = btn.dataset.type;
    const d = data.days[data.currentDay];
    if (d.locked) {
      alert("Päivä on lukittu.");
      return;
    }
    d.energy[t]++;
    recomputeDay(data.currentDay);
    updateAll();
    const labelMap = {
      nicotine: "-1",
      coffee: "+1",
      water: "+1",
      protein: "+1",
      meal: "+3",
      shots: "-10"
    };
    energyXpBurst(btn, labelMap[t] || "+1");
  });
});

btnFinalizeDay.addEventListener("click", () => {
  const d = data.days[data.currentDay];
  if (d.locked) {
    alert("Päivä on jo finalized.");
    return;
  }

  if (
    !d.wakeTimeMinutes &&
    d.habitScore === 0 &&
    d.energyScore === 0 &&
    d.tapScore === 0 &&
    !Object.values(d.energy).some((v) => v > 0)
  ) {
    const ok = confirm(
      "Tälle päivälle ei ole habiteja, wakea, tap testia tai energia-tapahtumia. Finalize silti?"
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

  // Ghost Future update
  const delta = computeGhostDelta(d);
  data.ghostDistance += delta;
  if (data.ghostDistance < 0.1) data.ghostDistance = 0.1;
  if (data.ghostDistance > 2.0) data.ghostDistance = 2.0;
  d.ghostDelta = delta;
  d.ghostDistanceAfter = data.ghostDistance;

  d.locked = true;

  // Streak
  if (data.lastCompletedDay === data.currentDay - 1) {
    data.streak++;
  } else {
    data.streak = 1;
  }
  data.lastCompletedDay = data.currentDay;

  // Nicotine clean streak
  if ((d.energy.nicotine || 0) === 0) data.nicCleanStreak++;
  else data.nicCleanStreak = 0;

  if (data.currentDay < 90) data.currentDay++;

  save();
  updateAll();
  flashHologram();
  flashHUD();
});

// RESET
btnReset.addEventListener("click", () => {
  if (!confirm("Reset Bloodliner 90? Kaikki data poistetaan.")) return;
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
  renderGrid();
  renderCurrentDay();
  updateTicker();
  updateHologramLine();
}

/* INIT */
updateAll();
