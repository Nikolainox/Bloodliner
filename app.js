/* ------------------------------------------------------
   BLOODLINER 90 • Project 1 (B + ESPN TICKER)
   - 90-day habit + energy + economy scoreboard
   - A+ Prime Wake: yksi nappi, logiikka taustalla
   - Habits näkyvät päiväkortilla (✓) + modalissa
   - Bayes-tyylinen huomisen energian ennuste
   - ESPN-tyylinen ticker, joka päivittyy datasta
   - LocalStorage only
------------------------------------------------------ */

const STORAGE_KEY = "bloodliner_v1_AplusWake";

// Oletus prime window: 06:00–08:00
const PRIME_START_MIN = 6 * 60;
const PRIME_END_MIN = 8 * 60;

// Energy-kertoimet (score)
const ENERGY_WEIGHTS = {
  nicotine: -2,
  coffee: -1,
  water: 2,
  protein: 2,
  meal: 5,
  shots: -20
};

// Money (€ per click), water positiivisena "minuskulutuksena"
const MONEY_WEIGHTS = {
  nicotine: 0.5,
  coffee: 1.5,
  water: -0.5,
  protein: 2.0,
  meal: 9.0,
  shots: 5.0
};

// Default habits
const DEFAULT_HABITS = [
  "Treeni",
  "Deep Work",
  "Päiväkirja",
  "Ei some-scrollia illalla"
];

let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  days: {},
  currentDay: 1,
  lastCompletedDay: null,
  streak: 0,
  habits: DEFAULT_HABITS
};

// Init päivät 1–90
for (let i = 1; i <= 90; i++) {
  if (!data.days[i]) {
    data.days[i] = createEmptyDay(i);
  }
}
if (!Array.isArray(data.habits)) {
  data.habits = DEFAULT_HABITS;
}
if (!data.currentDay || data.currentDay < 1 || data.currentDay > 90) {
  data.currentDay = 1;
}
save();

/* HELPERS */

function createEmptyDay(dayNumber) {
  return {
    dayNumber,
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
    habitsDone: {}, // {habitName: true}
    habitScore: 0,
    totalScore: 0,
    tomorrowEnergy: null,
    locked: false,
    pr: false
  };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function formatTimeFromMinutes(mins) {
  if (mins == null) return "—";
  let h = Math.floor(mins / 60);
  let m = mins % 60;
  if (h < 0) h = 0;
  if (h > 23) h = h % 24;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function calculateWakeScore(minutes) {
  if (minutes == null) return 0;
  if (minutes >= PRIME_START_MIN && minutes <= PRIME_END_MIN) {
    return 20; // prime hit
  }
  if (minutes > PRIME_END_MIN && minutes <= PRIME_END_MIN + 30) {
    return 5; // vähän myöhässä
  }
  if (minutes > PRIME_END_MIN + 30 && minutes <= PRIME_END_MIN + 90) {
    return -10; // liikaa nukuttu
  }
  // muuten reippaasti yli -> rankempi miinus
  return -20;
}

function calculateEnergyScore(energy) {
  let score = 0;
  for (const key of Object.keys(ENERGY_WEIGHTS)) {
    const reps = energy[key] || 0;
    score += reps * ENERGY_WEIGHTS[key];
  }
  return score;
}

function calculateMoneySpent(energy) {
  let total = 0;
  for (const key of Object.keys(MONEY_WEIGHTS)) {
    const reps = energy[key] || 0;
    total += reps * MONEY_WEIGHTS[key];
  }
  return total;
}

function calculateHabitScore(habitsDone) {
  const count = Object.values(habitsDone || {}).filter(Boolean).length;
  return count * 10;
}

function calculateTomorrowEnergy(totalScore) {
  // Shadow-Bayes: 50 baseline + totalScore/2, capped 0–100
  let val = 50 + totalScore / 2;
  if (val < 0) val = 0;
  if (val > 100) val = 100;
  return Math.round(val);
}

function recomputeDay(dayNumber) {
  const day = data.days[dayNumber];
  if (!day) return;

  day.wakeScore = calculateWakeScore(day.wakeTimeMinutes);
  day.energyScore = calculateEnergyScore(day.energy);
  day.moneySpent = calculateMoneySpent(day.energy);
  day.habitScore = calculateHabitScore(day.habitsDone);
  day.totalScore = day.wakeScore + day.energyScore + day.habitScore;
  day.tomorrowEnergy = calculateTomorrowEnergy(day.totalScore);
}

/* DOM ELEMENTS */

const hudDay = document.getElementById("hud-day");
const hudStreak = document.getElementById("hud-streak");
const hudTotalScore = document.getElementById("hud-total-score");
const btnReset = document.getElementById("btn-reset");

const dayGrid = document.getElementById("day-grid");

// Ticker
const tickerInner = document.getElementById("ticker-inner");

// Wake
const btnWakeNow = document.getElementById("btn-wake-now");
const wakeTimeLabel = document.getElementById("wake-time-label");
const wakeScoreLabel = document.getElementById("wake-score-label");

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
const dayModalBackdrop = document.getElementById("day-modal-backdrop");
const modalDayTitle = document.getElementById("modal-day-title");
const modalWakeTime = document.getElementById("modal-wake-time");
const modalWakeScore = document.getElementById("modal-wake-score");
const modalHabitScore = document.getElementById("modal-habit-score");
const modalEnergyScore = document.getElementById("modal-energy-score");
const modalTotalScore = document.getElementById("modal-total-score");
const modalMoneySpent = document.getElementById("modal-money-spent");
const modalTomorrowEnergy = document.getElementById("modal-tomorrow-energy");
const modalHabitsList = document.getElementById("modal-habits");
const modalEnergyList = document.getElementById("modal-energy-list");
const modalCloseBtn = document.getElementById("modal-close");

/* RENDER FUNCTIONS */

function renderHUD() {
  hudDay.textContent = `${data.currentDay} / 90`;
  hudStreak.textContent = data.streak || 0;

  let total = 0;
  for (let i = 1; i <= 90; i++) {
    total += data.days[i].totalScore || 0;
  }
  hudTotalScore.textContent = total;
}

function renderGrid() {
  dayGrid.innerHTML = "";
  let maxScore = 0;
  for (let i = 1; i <= 90; i++) {
    const score = data.days[i].totalScore || 0;
    if (score > maxScore) maxScore = score;
  }

  for (let i = 1; i <= 90; i++) {
    const day = data.days[i];
    const cell = document.createElement("div");
    cell.classList.add("day-cell");
    cell.dataset.day = i;

    const score = day.totalScore;
    let cls = "day-empty";
    if (score > 0 && maxScore > 0) {
      const ratio = score / maxScore;
      if (ratio < 0.25) cls = "day-low";
      else if (ratio < 0.5) cls = "day-mid";
      else if (ratio < 0.8) cls = "day-high";
      else cls = "day-elite";
    }
    cell.classList.add(cls);
    if (i === data.currentDay) cell.classList.add("current");
    if (day.pr) cell.classList.add("pr");

    // Habits marker (for cell class)
    const hasHabitsDone = Object.values(day.habitsDone || {}).some(Boolean);
    if (hasHabitsDone) {
      cell.classList.add("day-habits-done");
    }

    cell.innerHTML = `<span>${i}</span>`;
    cell.addEventListener("click", () => handleDayClick(i));
    dayGrid.appendChild(cell);
  }
}

function renderCurrentDay() {
  const day = data.days[data.currentDay];

  // Wake
  wakeTimeLabel.textContent = formatTimeFromMinutes(day.wakeTimeMinutes);
  wakeScoreLabel.textContent = day.wakeScore.toString();

  // Energy counts
  cntNicotine.textContent = day.energy.nicotine || 0;
  cntCoffee.textContent = day.energy.coffee || 0;
  cntWater.textContent = day.energy.water || 0;
  cntProtein.textContent = day.energy.protein || 0;
  cntMeal.textContent = day.energy.meal || 0;
  cntShots.textContent = day.energy.shots || 0;

  energyScoreLabel.textContent = day.energyScore.toString();
  moneySpentLabel.textContent = day.moneySpent.toFixed(2);
  tomorrowEnergyLabel.textContent =
    day.tomorrowEnergy == null ? "—" : `${day.tomorrowEnergy}`;

  // Habits summary
  habitScoreLabel.textContent = day.habitScore.toString();
  summaryWakeScoreLabel.textContent = day.wakeScore.toString();
  totalScoreLabel.textContent = day.totalScore.toString();

  // Habits list
  renderHabitList();
}

function renderHabitList() {
  const day = data.days[data.currentDay];
  habitListEl.innerHTML = "";

  data.habits.forEach((habit) => {
    const li = document.createElement("li");
    li.className = "habit-item";

    const left = document.createElement("div");
    left.className = "habit-left";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!day.habitsDone[habit];
    checkbox.addEventListener("change", () => {
      if (day.locked) {
        checkbox.checked = !checkbox.checked;
        alert("Päivä on lukittu (finalized). Et voi muuttaa habiteja.");
        return;
      }
      day.habitsDone[habit] = checkbox.checked;
      recomputeDay(data.currentDay);
      updateAll();
    });

    const span = document.createElement("span");
    span.className = "habit-name";
    span.textContent = habit;

    left.appendChild(checkbox);
    left.appendChild(span);

    const delBtn = document.createElement("button");
    delBtn.className = "habit-delete";
    delBtn.textContent = "✕";
    delBtn.addEventListener("click", () => {
      if (!confirm(`Poistetaanko habit "${habit}" kaikilta päiviltä?`)) return;
      // Remove from global list
      data.habits = data.habits.filter((h) => h !== habit);
      // Remove from each day
      for (let i = 1; i <= 90; i++) {
        if (data.days[i].habitsDone[habit]) {
          delete data.days[i].habitsDone[habit];
          recomputeDay(i);
        }
      }
      save();
      updateAll();
    });

    li.appendChild(left);
    li.appendChild(delBtn);
    habitListEl.appendChild(li);
  });
}

/* ESPN TICKER */

function updateTicker() {
  let segments = [];

  for (let i = 1; i <= 90; i++) {
    const day = data.days[i];
    if (!day) continue;
    const score = day.totalScore || 0;
    const money = day.moneySpent || 0;
    const tomorrow = day.tomorrowEnergy;
    const wake = formatTimeFromMinutes(day.wakeTimeMinutes);

    // Näytetään vain päivät, joissa on jotain (score tai wake tai energy)
    const hasAny =
      score !== 0 ||
      day.wakeTimeMinutes != null ||
      Object.values(day.energy || {}).some((v) => v > 0) ||
      Object.values(day.habitsDone || {}).some(Boolean);

    if (!hasAny) continue;

    let label = `DAY ${i} • SCORE ${score} • WAKE ${wake} • €${money.toFixed(
      2
    )}`;
    if (tomorrow != null) {
      label += ` • TOMORROW ${tomorrow}`;
    }
    if (day.pr) {
      label += " • PR🔥";
    }
    segments.push(label);
  }

  if (segments.length === 0) {
    tickerInner.textContent = "BLOODLINER 90 • NO DATA YET • START DAY 1 TODAY";
  } else {
    const text = "  |  " + segments.join("  |  ") + "  |  ";
    tickerInner.textContent = text;
  }

  // Reset animation (jos sisältö muuttuu, restart)
  tickerInner.style.animation = "none";
  // force reflow
  void tickerInner.offsetWidth;
  tickerInner.style.animation = "";
  tickerInner.style.animation = "ticker-scroll 30s linear infinite";
}

/* EVENTS */

// Reset
btnReset.addEventListener("click", () => {
  const ok = confirm("Reset Bloodliner 90? Kaikki data poistetaan.");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

// Wake now
btnWakeNow.addEventListener("click", () => {
  const day = data.days[data.currentDay];
  if (day.locked) {
    alert("Päivä on lukittu (finalized). Wake-merkintää ei voi muuttaa.");
    return;
  }
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  day.wakeTimeMinutes = mins;
  recomputeDay(data.currentDay);
  updateAll();
});

// Energy click
energyButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.type;
    const day = data.days[data.currentDay];
    if (day.locked) {
      alert("Päivä on lukittu (finalized). Energy-tapahtumia ei voi lisätä.");
      return;
    }
    if (!day.energy[type] && day.energy[type] !== 0) {
      day.energy[type] = 0;
    }
    day.energy[type] += 1;
    recomputeDay(data.currentDay);
    updateAll();
  });
});

// Habit add
habitAddBtn.addEventListener("click", () => {
  const name = habitInput.value.trim();
  if (!name) return;
  if (data.habits.includes(name)) {
    alert("Tämä habit on jo listalla.");
    return;
  }
  data.habits.push(name);
  habitInput.value = "";
  save();
  renderHabitList();
  updateTicker();
});

// Finalize day
btnFinalizeDay.addEventListener("click", () => {
  const day = data.days[data.currentDay];
  if (day.locked) {
    alert("Päivä on jo finalized.");
    return;
  }

  // Jos ei mitään, varmistetaan
  if (
    !day.wakeTimeMinutes &&
    day.habitScore === 0 &&
    day.energyScore === 0
  ) {
    const ok = confirm(
      "Tälle päivälle ei ole habiteja, wakea tai energia-tapahtumia. Finalize silti?"
    );
    if (!ok) return;
  }

  // PR-tarkistus (score vs aiemmat)
  let best = -Infinity;
  for (let i = 1; i <= 90; i++) {
    if (i === data.currentDay) continue;
    const s = data.days[i].totalScore || 0;
    if (s > best) best = s;
  }
  day.pr = day.totalScore > best && day.totalScore > 0;

  day.locked = true;

  // Streak
  if (data.lastCompletedDay === data.currentDay - 1) {
    data.streak = (data.streak || 0) + 1;
  } else {
    data.streak = 1;
  }
  data.lastCompletedDay = data.currentDay;

  // Siirry seuraavaan päivään jos mahdollinen
  if (data.currentDay < 90) {
    data.currentDay++;
  }

  save();
  updateAll();
});

// Modal close
dayModalBackdrop.addEventListener("click", (e) => {
  if (e.target === dayModalBackdrop) {
    dayModalBackdrop.style.display = "none";
  }
});
modalCloseBtn.addEventListener("click", () => {
  dayModalBackdrop.style.display = "none";
});

/* DAY CLICK */

function handleDayClick(dayNumber) {
  data.currentDay = dayNumber;
  save();
  updateAll();
  openDayModal(dayNumber);
}

function openDayModal(dayNumber) {
  const day = data.days[dayNumber];
  modalDayTitle.textContent = `Päivä ${dayNumber}`;
  modalWakeTime.textContent = formatTimeFromMinutes(day.wakeTimeMinutes);
  modalWakeScore.textContent = day.wakeScore.toString();
  modalHabitScore.textContent = day.habitScore.toString();
  modalEnergyScore.textContent = day.energyScore.toString();
  modalTotalScore.textContent = day.totalScore.toString();
  modalMoneySpent.textContent = day.moneySpent.toFixed(2);
  modalTomorrowEnergy.textContent =
    day.tomorrowEnergy == null ? "—" : `${day.tomorrowEnergy}`;

  modalHabitsList.innerHTML = "";
  const habitsDone = Object.entries(day.habitsDone || {})
    .filter(([_, done]) => done)
    .map(([habit]) => habit);

  if (habitsDone.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Ei merkittyjä habiteja.";
    modalHabitsList.appendChild(li);
  } else {
    habitsDone.forEach((h) => {
      const li = document.createElement("li");
      li.textContent = h;
      modalHabitsList.appendChild(li);
    });
  }

  modalEnergyList.innerHTML = "";
  const energy = day.energy || {};
  const labels = {
    nicotine: "Nicotine 🚬",
    coffee: "Coffee ☕",
    water: "Water 💧",
    protein: "Protein 🥫",
    meal: "Meal 🍽️",
    shots: "Shot / Huono 🧊"
  };
  let anyEnergy = false;
  for (const key of Object.keys(labels)) {
    const count = energy[key] || 0;
    if (count > 0) {
      anyEnergy = true;
      const li = document.createElement("li");
      li.textContent = `${labels[key]}: ${count}`;
      modalEnergyList.appendChild(li);
    }
  }
  if (!anyEnergy) {
    const li = document.createElement("li");
    li.textContent = "Ei energia-/kulutustapahtumia.";
    modalEnergyList.appendChild(li);
  }

  dayModalBackdrop.style.display = "flex";
}

/* UPDATE ALL */

function updateAll() {
  // Recompute all days to keep consistency (esim. habit-poistot)
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

