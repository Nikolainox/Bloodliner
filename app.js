/* ------------------------------------------------------
   BLOODLINER 90 • GHOST FUTURE + WAKE TIME INPUT
   - 90-day habit + energy + economy scoreboard
   - A+ Prime Wake (nappi + manuaalinen aika)
   - Nicotine Reduction Line (clean streak)
   - Ghost Future Engine (HUD + ticker + grid + modal)
   - Bayes-tyylinen huomisen energian ennuste
   - LocalStorage only
------------------------------------------------------ */

const STORAGE_KEY = "bloodliner_v3_ghost_wakeinput";

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

// DEFAULT HABITS
const DEFAULT_HABITS = [
  "Treeni",
  "Deep Work",
  "Päiväkirja",
  "Ei some-scrollia"
];

// INITIAL DATA
let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  days: {},
  currentDay: 1,
  lastCompletedDay: null,
  streak: 0,
  nicCleanStreak: 0,
  ghostDistance: 1.0, // AU (astronomical-style unit)
  habits: DEFAULT_HABITS
};

// Init days 1–90
for (let i = 1; i <= 90; i++) {
  if (!data.days[i]) data.days[i] = createEmptyDay(i);
}
if (!Array.isArray(data.habits)) data.habits = DEFAULT_HABITS;
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
    totalScore: 0,
    tomorrowEnergy: null,
    locked: false,
    pr: false,
    // Ghost Future data for this day
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
  d.totalScore = d.wakeScore + d.energyScore + d.habitScore;
  d.tomorrowEnergy = calculateTomorrowEnergy(d.totalScore);
}

/**
 * GHOST FUTURE ENGINE:
 * Laskee kuinka paljon ghost-liikettä tapahtuu tänä päivänä.
 * Palauttaa delta AU-yksiköissä:
 *  - negatiivinen = ghost tulee lähemmäs
 *  - positiivinen = ghost loittonee
 */
function computeGhostDelta(day) {
  let normalized = day.totalScore / 100;
  if (normalized > 1) normalized = 1;
  if (normalized < -1) normalized = -1;
  let delta = -normalized * 0.04; // hyvät pisteet -> lähemmäs (negatiivinen)

  // Nikotiini rankaisee
  delta += (day.energy.nicotine || 0) * 0.04;

  // Shots vielä rankempi
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

const dayGrid = document.getElementById("day-grid");
const btnReset = document.getElementById("btn-reset");

// Wake
const btnWakeNow = document.getElementById("btn-wake-now");
const btnWakeInput = document.getElementById("btn-wake-input");
const wakeTimeLabel = document.getElementById("wake-time-label");
const wakeScoreLabel = document.getElementById("wake-score-label");

// Wake modal
const wakeModalBackdrop = document.getElementById("wake-modal-backdrop");
const wakeModal = document.getElementById("wake-modal");
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

// Habits
const habitInput = document.getElementById("habit-input");
const habitAddBtn = document.getElementById("habit-add-btn");
const habitListEl = document.getElementById("habit-list");

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
  renderHabitList();
  habitScoreLabel.textContent = d.habitScore;
  summaryWakeScoreLabel.textContent = d.wakeScore;
  totalScoreLabel.textContent = d.totalScore;
}

function renderHabitList() {
  const d = data.days[data.currentDay];
  habitListEl.innerHTML = "";

  data.habits.forEach((habit) => {
    const li = document.createElement("li");
    li.className = "habit-item";

    const left = document.createElement("div");
    left.className = "habit-left";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!d.habitsDone[habit];
    cb.addEventListener("change", () => {
      if (d.locked) {
        cb.checked = !cb.checked;
        alert("Päivä on lukittu.");
        return;
      }
      d.habitsDone[habit] = cb.checked;
      recomputeDay(data.currentDay);
      updateAll();
    });

    const span = document.createElement("span");
    span.textContent = habit;

    left.appendChild(cb);
    left.appendChild(span);

    const delBtn = document.createElement("button");
    delBtn.className = "habit-delete";
    delBtn.textContent = "✕";
    delBtn.addEventListener("click", () => {
      if (!confirm("Poistetaanko habit kaikilta päiviltä?")) return;
      data.habits = data.habits.filter((h) => h !== habit);
      for (let i = 1; i <= 90; i++) {
        delete data.days[i].habitsDone[habit];
        recomputeDay(i);
      }
      save();
      updateAll();
    });

    li.appendChild(left);
    li.appendChild(delBtn);
    habitListEl.appendChild(li);
  });
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
      d.wakeTimeMinutes != null ||
      Object.values(d.energy).some((v) => v > 0);

    if (!used) continue;

    let s = `DAY ${i} • SCORE ${d.totalScore}`;
    s += ` • WAKE ${formatTimeFromMinutes(d.wakeTimeMinutes)}`;
    s += ` • €${d.moneySpent.toFixed(2)}`;
    if ((d.energy.nicotine || 0) === 0) s += " • CLEAN";
    if (d.pr) s += " • PR🔥";
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
   DAY MODAL
------------------------------------------------------ */

function openDay(n) {
  data.currentDay = n;
  save();
  renderHUD();
  renderGrid();
  renderCurrentDay();
  updateTicker();

  const d = data.days[n];

  modalDayTitle.textContent = `Päivä ${n}`;
  modalWakeTime.textContent = formatTimeFromMinutes(d.wakeTimeMinutes);
  modalWakeScore.textContent = d.wakeScore;
  modalHabitScore.textContent = d.habitScore;
  modalEnergyScore.textContent = d.energyScore;
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
  wakeTimeInput.value = ""; // tyhjäksi
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
   EVENTS
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
  });
});

habitAddBtn.addEventListener("click", () => {
  const name = habitInput.value.trim();
  if (!name) return;
  if (data.habits.includes(name)) {
    alert("Habit jo olemassa.");
    return;
  }
  data.habits.push(name);
  habitInput.value = "";
  save();
  updateAll();
});

btnFinalizeDay.addEventListener("click", () => {
  const d = data.days[data.currentDay];
  if (d.locked) {
    alert("Päivä on jo finalized.");
    return;
  }

  // Tyhjä päivä? Varmistus
  if (
    !d.wakeTimeMinutes &&
    d.habitScore === 0 &&
    d.energyScore === 0 &&
    !Object.values(d.energy).some((v) => v > 0)
  ) {
    const ok = confirm(
      "Tälle päivälle ei ole habiteja, wakea tai energia-tapahtumia. Finalize silti?"
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

  // Siirry seuraavaan päivään
  if (data.currentDay < 90) data.currentDay++;

  save();
  updateAll();
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
}

/* INIT */
updateAll();
