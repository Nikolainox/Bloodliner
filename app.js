/* ------------------------------------------------------
   BLOODLINER 90 — Netflix + ESPN Edition + Move Mode Picker
------------------------------------------------------ */

let data = JSON.parse(localStorage.getItem("bloodlinerDataV4")) || {
  habits: [],
  days: {},
  xp: 0,
  level: 1,
  streak: 0,
  lastCompleted: null,
  globalShots: 0,
  currentBoss: null
};

function save() {
  localStorage.setItem("bloodlinerDataV4", JSON.stringify(data));
}

/* INIT DAYS + BACKFILL */
for (let i = 1; i <= 90; i++) {
  if (!data.days[i]) {
    data.days[i] = {
      habits: {},
      goal: null,
      goalResult: null,
      mood: null,
      focus: null,
      energy: [],
      shots: 0,
      score: null,
      pr: null,
      behaviorValue: 0,
      status: "open"
    };
  } else {
    const d = data.days[i];
    if (!d.habits) d.habits = {};
    if (!d.energy) d.energy = [];
    if (d.shots === undefined) d.shots = 0;
    if (d.score === undefined) d.score = null;
    if (d.pr === undefined) d.pr = null;
    if (d.behaviorValue === undefined) d.behaviorValue = 0;
    if (!d.status) d.status = "open";
  }
}
save();

/* ELEMENTS */
const dayGrid = document.getElementById("day-grid");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalTitle = document.getElementById("modal-title");
const modalHabits = document.getElementById("modal-habits");
const modalStatus = document.getElementById("modal-status");
const modalScore = document.getElementById("modal-score");
const modalPR = document.getElementById("modal-pr");
const modalGoalResult = document.getElementById("modal-goal-result");
const modalBehaviorValue = document.getElementById("modal-behavior-value");

const moodInput = document.getElementById("mood-input");
const focusInput = document.getElementById("focus-input");
const goalTargetInput = document.getElementById("goal-target-input");

const btnFinalize = document.getElementById("btn-finalize");
const btnCloseModal = document.getElementById("btn-close-modal");

const modalDayShots = document.getElementById("modal-day-shots");
const btnDayShot = document.getElementById("btn-day-shot");
const btnGlobalShot = document.getElementById("btn-global-shot");

const energyButtons = document.querySelectorAll(".energy-btn");
const energyBreakdown = document.getElementById("energy-breakdown");

/* QUICK BAR & QA */
const qaButtons = document.querySelectorAll(".qa-btn");
const qaShotBtn = document.getElementById("qa-shot");
const qaActiveDay = document.getElementById("qa-active-day");

/* HABITS */
const addHabitForm = document.getElementById("add-habit-form");
const habitInput = document.getElementById("habit-input");
const habitsList = document.getElementById("habits-list");
const habitCount = document.getElementById("habit-count");
const habitsBody = document.getElementById("habits-body");
const toggleHabitsBtn = document.getElementById("toggle-habits");

/* REVIEW */
const reviewBackdrop = document.getElementById("review-backdrop");
const btnOpenReview = document.getElementById("open-review");
const btnCloseReview = document.getElementById("btn-close-review");

/* HUD */
const hudAvg = document.getElementById("hud-avg");
const hudPR = document.getElementById("hud-pr");
const hudXP = document.getElementById("hud-xp");
const hudLevel = document.getElementById("hud-level");
const hudStreak = document.getElementById("hud-streak");
const hudHabits = document.getElementById("hud-habits");
const hudShots = document.getElementById("hud-shots");

/* QUICK SNAPSHOT */
const pcLastScore = document.getElementById("pc-last-score");
const pcEnergy = document.getElementById("pc-energy");
const pcBehaviorAvg = document.getElementById("pc-behavior-avg");
const pcMoodFocus = document.getElementById("pc-mood-focus");

/* Optional (not in DOM but safe) */
const pcGoalAccuracy = document.getElementById("pc-goal-accuracy");
const pcGoalAmbition = document.getElementById("pc-goal-ambition");
const pcGoalRealism = document.getElementById("pc-goal-realism");
const pcBoss = document.getElementById("pc-boss");

/* BOSS */
const bossName = document.getElementById("boss-name");
const bossWeakness = document.getElementById("boss-weakness");
const bossGoal = document.getElementById("boss-goal");
const bossReward = document.getElementById("boss-reward");

/* TICKER */
const tickerText = document.getElementById("ticker-text");

/* MOVE MODE PICKER */
const moveModeBackdrop = document.getElementById("move-mode-backdrop");
const moveModeButtons = document.querySelectorAll(".move-mode-btn");
const moveModeCancel = document.getElementById("move-mode-cancel");

let activeDay = 1;

/* HABITS */
function renderHabits() {
  habitsList.innerHTML = "";
  data.habits.forEach(h => {
    const div = document.createElement("div");
    div.className = "habit-pill";
    div.innerHTML = `
      <span>${h}</span>
      <button data-habit="${h}">&times;</button>
    `;
    habitsList.appendChild(div);
  });
  habitCount.textContent = `${data.habits.length} habits`;
  hudHabits.textContent = data.habits.length;
  save();
}

habitsList.addEventListener("click", e => {
  if (e.target.tagName === "BUTTON") {
    const h = e.target.dataset.habit;
    data.habits = data.habits.filter(x => x !== h);
    for (let i = 1; i <= 90; i++) delete data.days[i].habits[h];
    renderHabits();
    renderArena();
    updateHUD();
    updateQuickCard();
    updateTicker();
    save();
  }
});

addHabitForm.addEventListener("submit", e => {
  e.preventDefault();
  const h = habitInput.value.trim();
  if (!h) return;
  if (!data.habits.includes(h)) data.habits.push(h);
  habitInput.value = "";
  renderHabits();
  renderArena();
  updateHUD();
  updateQuickCard();
  updateTicker();
  save();
});

toggleHabitsBtn.addEventListener("click", () => {
  if (habitsBody.style.display === "none") {
    habitsBody.style.display = "block";
  } else {
    habitsBody.style.display = "none";
  }
});

/* ARENA */
function renderArena() {
  dayGrid.innerHTML = "";
  for (let i = 1; i <= 90; i++) {
    const d = data.days[i];
    const tile = document.createElement("div");
    tile.className = "day";
    tile.innerHTML = `
      <div class="day-inner ${d.status === "done" ? "flipped" : ""}" data-day="${i}">
        <div class="day-front">${i}</div>
        <div class="day-back">${d.score ?? ""}</div>
      </div>
    `;
    dayGrid.appendChild(tile);
  }
}

dayGrid.addEventListener("click", e => {
  const inner = e.target.closest(".day-inner");
  if (!inner) return;
  activeDay = parseInt(inner.dataset.day, 10);
  qaActiveDay.textContent = `Day ${activeDay}`;
  openDayModal(activeDay);
});

/* MODAL OPEN/CLOSE */
function openDayModal(n) {
  const d = data.days[n];
  modalTitle.textContent = `DAY ${n}`;
  modalStatus.textContent = d.status;
  modalScore.textContent = d.score ?? "—";
  modalPR.textContent = d.pr ?? "—";
  modalBehaviorValue.textContent = d.behaviorValue ?? 0;

  modalGoalResult.textContent = d.goalResult ?? "—";
  modalGoalResult.className = "goal-tag";
  if (d.goalResult === "PASS") modalGoalResult.classList.add("goal-pass");
  if (d.goalResult === "OVERDRIVE") modalGoalResult.classList.add("goal-overdrive");
  if (d.goalResult === "FAIL") modalGoalResult.classList.add("goal-fail");
  if (d.goalResult === "NEAR MISS") modalGoalResult.classList.add("goal-near-miss");

  modalHabits.innerHTML = "";
  data.habits.forEach(h => {
    const lbl = document.createElement("label");
    const checked = d.habits[h] === 1 ? "checked" : "";
    lbl.innerHTML = `
      <input type="checkbox" data-habit="${h}" ${checked}>
      ${h}
    `;
    modalHabits.appendChild(lbl);
  });

  goalTargetInput.value = d.goal ?? "";
  moodInput.value = d.mood ?? "";
  focusInput.value = d.focus ?? "";
  modalDayShots.textContent = d.shots;

  renderEnergyBreakdown(d);

  modalBackdrop.style.display = "flex";
  qaActiveDay.textContent = `Day ${n}`;
}

btnCloseModal.addEventListener("click", () => {
  modalBackdrop.style.display = "none";
});

/* HABITS IN MODAL */
modalHabits.addEventListener("change", e => {
  if (e.target.type === "checkbox") {
    const h = e.target.dataset.habit;
    data.days[activeDay].habits[h] = e.target.checked ? 1 : 0;
    save();
  }
});

/* GOAL SET */
document.getElementById("btn-set-goal").addEventListener("click", () => {
  const v = parseInt(goalTargetInput.value);
  if (!v || v < 1 || v > 100) return;
  data.days[activeDay].goal = v;
  save();
});

/* BEHAVIOR VALUE FUNCTION */
function computeBehaviorValue(d) {
  let value = 0;
  (d.energy || []).forEach(ev => {
    if (ev.type === "Water") value += 0.5;
    if (ev.type === "Protein") value += 2;
    if (ev.type === "Coffee") value -= 1.5;
    if (ev.type === "Meal") value -= 9;
    if (ev.type === "Nicotine") value -= 0.5;
    if (ev.type === "Move") {
      const mode = ev.mode || "Walk";
      if (mode === "Walk") value += 1;
      else if (mode === "Run") value += 2;
      else if (mode === "Gym") value += 4;
      else if (mode === "Sport") value += 5;
      else if (mode === "Mobility") value += 1.5;
      else value += 1;
    }
  });
  value -= (d.shots || 0) * 20;
  return Math.round(value * 10) / 10;
}

/* PÄIVÄN ENERGIA-BREAKDOWN */
function renderEnergyBreakdown(d) {
  if (!energyBreakdown) return;
  const counts = {
    Water: 0,
    Move: 0,
    Protein: 0,
    Coffee: 0,
    Meal: 0,
    Nicotine: 0
  };
  const moveModes = {
    Walk: 0,
    Run: 0,
    Gym: 0,
    Sport: 0,
    Mobility: 0
  };

  (d.energy || []).forEach(ev => {
    if (counts[ev.type] !== undefined) counts[ev.type]++;
    if (ev.type === "Move") {
      const m = ev.mode || "Walk";
      if (moveModes[m] !== undefined) moveModes[m]++;
    }
  });
  const shots = d.shots || 0;

  const emojis = {
    Water: "💧",
    Move: "🏃‍♂️",
    Protein: "🍫💪",
    Coffee: "☕",
    Meal: "🍽️",
    Nicotine: "🚬❌"
  };

  energyBreakdown.innerHTML = "";

  Object.entries(counts).forEach(([type, count]) => {
    if (!count) return;
    if (type === "Move") {
      const total = count;
      const parts = [];
      Object.entries(moveModes).forEach(([mode, c]) => {
        if (c) parts.push(`${mode}:${c}`);
      });
      const li = document.createElement("li");
      li.textContent = `${emojis.Move} Move: ${total}` + (parts.length ? ` (${parts.join(", ")})` : "");
      energyBreakdown.appendChild(li);
    } else {
      const li = document.createElement("li");
      li.textContent = `${emojis[type]} ${type}: ${count}`;
      energyBreakdown.appendChild(li);
    }
  });

  const liShots = document.createElement("li");
  liShots.textContent = `💣 Shots: ${shots}`;
  energyBreakdown.appendChild(liShots);
}

/* MOVE MODE PICKER */
function openMoveModePicker() {
  moveModeBackdrop.style.display = "flex";
}
function closeMoveModePicker() {
  moveModeBackdrop.style.display = "none";
}

moveModeBackdrop.addEventListener("click", e => {
  if (e.target === moveModeBackdrop) closeMoveModePicker();
});
moveModeCancel.addEventListener("click", () => {
  closeMoveModePicker();
});

moveModeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    const d = data.days[activeDay];
    d.energy.push({
      type: "Move",
      mode,
      time: Date.now()
    });
    d.behaviorValue = computeBehaviorValue(d);
    if (modalBackdrop.style.display === "flex") {
      modalBehaviorValue.textContent = d.behaviorValue.toFixed(1);
      renderEnergyBreakdown(d);
    }
    updateQuickCard();
    updateTicker();
    save();
    closeMoveModePicker();
  });
});

/* ENERGY EVENTS IN MODAL */
energyButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const t = btn.dataset.type;
    const d = data.days[activeDay];
    if (t === "Move") {
      openMoveModePicker();
      return;
    }
    d.energy.push({
      type: t,
      time: Date.now()
    });
    btn.classList.add("flash");
    setTimeout(() => btn.classList.remove("flash"), 180);
    d.behaviorValue = computeBehaviorValue(d);
    modalBehaviorValue.textContent = d.behaviorValue.toFixed(1);
    renderEnergyBreakdown(d);
    updateQuickCard();
    updateTicker();
    save();
  });
});

/* QUICK BAR EMOJI BUTTONS (log to active day) */
qaButtons.forEach(btn => {
  const t = btn.dataset.type;
  if (!t) return;
  btn.addEventListener("click", () => {
    const d = data.days[activeDay];
    if (t === "Move") {
      openMoveModePicker();
      return;
    }
    d.energy.push({
      type: t,
      time: Date.now()
    });
    btn.classList.add("flash");
    setTimeout(() => btn.classList.remove("flash"), 160);
    d.behaviorValue = computeBehaviorValue(d);
    if (modalBackdrop.style.display === "flex") {
      modalBehaviorValue.textContent = d.behaviorValue.toFixed(1);
      renderEnergyBreakdown(d);
    }
    updateQuickCard();
    updateTicker();
    save();
  });
});

/* SHOTS */
btnDayShot.addEventListener("click", () => {
  const d = data.days[activeDay];
  d.shots++;
  modalDayShots.textContent = d.shots;
  d.behaviorValue = computeBehaviorValue(d);
  modalBehaviorValue.textContent = d.behaviorValue.toFixed(1);
  renderEnergyBreakdown(d);
  updateQuickCard();
  updateTicker();
  save();
});

qaShotBtn.addEventListener("click", () => {
  const d = data.days[activeDay];
  d.shots++;
  d.behaviorValue = computeBehaviorValue(d);
  qaShotBtn.classList.add("flash");
  setTimeout(() => qaShotBtn.classList.remove("flash"), 160);
  if (modalBackdrop.style.display === "flex") {
    modalDayShots.textContent = d.shots;
    modalBehaviorValue.textContent = d.behaviorValue.toFixed(1);
    renderEnergyBreakdown(d);
  }
  updateQuickCard();
  updateTicker();
  save();
});

btnGlobalShot.addEventListener("click", () => {
  data.globalShots++;
  hudShots.textContent = data.globalShots;
  save();
});

/* FINALIZE DAY */
btnFinalize.addEventListener("click", () => {
  finalizeDay(activeDay);
  modalBackdrop.style.display = "none";
  renderArena();
  updateHUD();
  updateQuickCard();
  updateBoss();
  updateTicker();
});

function finalizeDay(n) {
  const d = data.days[n];
  if (d.status === "done") return;

  d.mood = parseInt(moodInput.value) || 0;
  d.focus = parseInt(focusInput.value) || 0;

  const habitCount = Object.values(d.habits).filter(x => x === 1).length;
  d.score = Math.round((habitCount / (data.habits.length || 1)) * 100);

  if (!d.goal) d.goalResult = "NO GOAL";
  else if (d.score >= d.goal * 1.15) d.goalResult = "OVERDRIVE";
  else if (d.score >= d.goal) d.goalResult = "PASS";
  else if (d.score >= d.goal * 0.8) d.goalResult = "NEAR MISS";
  else d.goalResult = "FAIL";

  const prevScores = [];
  for (let i = 1; i < n; i++) {
    if (data.days[i].score !== null) prevScores.push(data.days[i].score);
  }
  const avgPrev = prevScores.length
    ? prevScores.reduce((a,b)=>a+b)/prevScores.length
    : 0;
  d.pr = prevScores.length ? Math.round(d.score - avgPrev) : 0;

  d.behaviorValue = computeBehaviorValue(d);

  const xpGain = d.score + (d.goalResult === "OVERDRIVE" ? 20 : 0) + d.pr;
  data.xp += Math.max(0, xpGain);

  while (data.xp >= data.level * 120) {
    data.xp -= data.level * 120;
    data.level++;
  }

  if (data.lastCompleted === n - 1) data.streak++;
  else data.streak = 1;
  data.lastCompleted = n;

  d.status = "done";
  save();
}

/* PREDICT ENERGY (avg mood/focus) */
function predictEnergy() {
  const moods = [];
  const focs = [];
  for (let i = 1; i <= 90; i++) {
    const d = data.days[i];
    if (d.mood && d.focus) {
      moods.push(d.mood);
      focs.push(d.focus);
    }
  }
  if (!moods.length) return "—";
  const mAvg = moods.reduce((a,b)=>a+b)/moods.length;
  const fAvg = focs.reduce((a,b)=>a+b)/focs.length;
  return Math.round((mAvg + fAvg) / 2);
}

/* HUD */
function updateHUD() {
  const scores = [];
  const prs = [];
  for (let i = 1; i <= 90; i++) {
    const d = data.days[i];
    if (d.score !== null) scores.push(d.score);
    if (d.pr !== null) prs.push(d.pr);
  }
  const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b)/scores.length) : "—";
  const prAvg = prs.length ? Math.round(prs.reduce((a,b)=>a+b)/prs.length) : "—";

  hudAvg.textContent = avg;
  hudPR.textContent = prAvg;
  hudXP.textContent = data.xp;
  hudLevel.textContent = data.level;
  hudStreak.textContent = data.streak;
  hudHabits.textContent = data.habits.length;
  hudShots.textContent = data.globalShots;
}

/* QUICK CARD / SNAPSHOT */
function updateQuickCard() {
  const scores = [];
  const behaviors = [];
  const moods = [];
  const focs = [];
  let lastScore = "—";

  for (let i = 1; i <= 90; i++) {
    const d = data.days[i];
    if (d.score !== null) {
      scores.push(d.score);
      lastScore = d.score;
    }
    if (typeof d.behaviorValue === "number") behaviors.push(d.behaviorValue);
    if (d.mood) moods.push(d.mood);
    if (d.focus) focs.push(d.focus);
  }

  const bAvg = behaviors.length
    ? Math.round((behaviors.reduce((a,b)=>a+b)/behaviors.length)*10)/10
    : "—";

  pcLastScore.textContent = lastScore;
  pcBehaviorAvg.textContent = bAvg;
  pcEnergy.textContent = predictEnergy();

  const mAvg = moods.length ? Math.round(moods.reduce((a,b)=>a+b)/moods.length) : "—";
  const fAvg = focs.length ? Math.round(focs.reduce((a,b)=>a+b)/focs.length) : "—";
  pcMoodFocus.textContent = `${mAvg}/${fAvg}`;

  const gRes = { PASS:0, OVERDRIVE:0, FAIL:0, "NEAR MISS":0 };
  let gSet = 0;
  for (let i = 1; i <= 90; i++) {
    const r = data.days[i].goalResult;
    if (!r || r === "NO GOAL") continue;
    gRes[r] = (gRes[r] || 0) + 1;
    gSet++;
  }
  const acc =
    gSet ? Math.round((gRes.PASS+gRes.OVERDRIVE)/gSet*100) : 0;
  const amb =
    gSet ? Math.round(gRes.OVERDRIVE/gSet*100) : 0;
  const real =
    gSet ? Math.round((gRes.PASS+gRes["NEAR MISS"])/gSet*100) : 0;

  if (pcGoalAccuracy && pcGoalAmbition && pcGoalRealism) {
    pcGoalAccuracy.textContent = acc + "%";
    pcGoalAmbition.textContent = amb + "%";
    pcGoalRealism.textContent = real + "%";
  }
  if (pcBoss) pcBoss.textContent = data.currentBoss ?? "—";
}

/* BOSS SYSTEM */
function updateBoss() {
  if (data.lastCompleted == null) {
    data.currentBoss = "Kerää dataa…";
    bossName.textContent = data.currentBoss;
    bossWeakness.textContent = "";
    bossGoal.textContent = "";
    bossReward.textContent = "";
    return;
  }

  const moods = [], focs = [], shots = [], scores = [];
  for (let i = 1; i <= data.lastCompleted; i++) {
    const d = data.days[i];
    if (d.mood) moods.push(d.mood);
    if (d.focus) focs.push(d.focus);
    if (d.shots) shots.push(d.shots);
    if (d.score !== null) scores.push(d.score);
  }
  const avg = arr => arr.length ? arr.reduce((a,b)=>a+b)/arr.length : 0;
  const avgMood = avg(moods);
  const avgFocus = avg(focs);
  const avgShots = avg(shots);
  const avgScore = avg(scores);

  let boss = "Momentum Reaper";
  if (avgShots > 4) boss = "Distraction Kraken";
  else if (avgMood < 4) boss = "Mood Serpent";
  else if (avgFocus < 4) boss = "Procrastination Specter";
  else if (avgScore > 80) boss = "Glass Cannon Mirror";
  else if (avgScore < 50) boss = "Binary Trap Serpent";
  else boss = "Supernova Warden";

  data.currentBoss = boss;
  bossName.textContent = boss;

  if (boss === "Distraction Kraken") {
    bossWeakness.textContent = "Weakness: Shot discipline";
    bossGoal.textContent = "Goal: Max 3 shots/day";
    bossReward.textContent = "Reward: +30 XP";
  } else if (boss === "Mood Serpent") {
    bossWeakness.textContent = "Weakness: Mood rituals";
    bossGoal.textContent = "Goal: Mood ≥6 three days";
    bossReward.textContent = "Reward: +40 XP";
  } else if (boss === "Procrastination Specter") {
    bossWeakness.textContent = "Weakness: Focus blocks";
    bossGoal.textContent = "Goal: Focus ≥6 three days";
    bossReward.textContent = "Reward: +40 XP";
  } else if (boss === "Glass Cannon Mirror") {
    bossWeakness.textContent = "Weakness: Consistency";
    bossGoal.textContent = "Goal: Five days score ≥75";
    bossReward.textContent = "Reward: +50 XP";
  } else if (boss === "Binary Trap Serpent") {
    bossWeakness.textContent = "Weakness: Minimum wins";
    bossGoal.textContent = "Goal: Score 60+ four days";
    bossReward.textContent = "Reward: +30 XP";
  } else if (boss === "Supernova Warden") {
    bossWeakness.textContent = "Weakness: Overdrive pushes";
    bossGoal.textContent = "Goal: 1 Overdrive this week";
    bossReward.textContent = "Reward: +60 XP";
  }
  save();
}

/* TICKER (ESPN BAR) */
function updateTicker() {
  if (!tickerText) return;
  if (data.lastCompleted == null) {
    tickerText.textContent = "Season ready. No games played yet.";
    return;
  }
  const n = data.lastCompleted;
  const d = data.days[n];
  const parts = [];
  parts.push(`DAY ${n}`);
  if (d.goalResult && d.goalResult !== "NO GOAL") parts.push(d.goalResult);
  if (d.score !== null) parts.push(`Score ${d.score}%`);
  parts.push(`Shots ${d.shots || 0}`);
  if (typeof d.behaviorValue === "number") parts.push(`BV ${d.behaviorValue}`);
  if (typeof d.pr === "number") {
    const prText = d.pr >= 0 ? `PR +${d.pr}` : `PR ${d.pr}`;
    parts.push(prText);
  }
  tickerText.textContent = parts.join(" · ");
}

/* REVIEW MODAL */
btnOpenReview.addEventListener("click", () => {
  renderReview();
  reviewBackdrop.style.display = "flex";
});

btnCloseReview.addEventListener("click", () => {
  reviewBackdrop.style.display = "none";
});

let charts = {
  score: null,
  moodfocus: null,
  behavior: null
};

function renderReview() {
  const scores = [];
  const mood = [];
  const focus = [];
  const behavior = [];

  for (let i = 1; i <= 90; i++) {
    const d = data.days[i];
    scores.push(d.score ?? 0);
    mood.push(d.mood ?? 0);
    focus.push(d.focus ?? 0);
    behavior.push(d.behaviorValue ?? 0);
  }

  if (charts.score) charts.score.destroy();
  if (charts.moodfocus) charts.moodfocus.destroy();
  if (charts.behavior) charts.behavior.destroy();

  charts.score = new Chart(document.getElementById("chart-score"), {
    type: "line",
    data: {
      labels: [...Array(90).keys()].map(x => x + 1),
      datasets: [{
        label: "Score",
        data: scores,
        borderWidth: 2,
        tension: 0.35
      }]
    }
  });

  charts.moodfocus = new Chart(document.getElementById("chart-moodfocus"), {
    type: "line",
    data: {
      labels: [...Array(90).keys()].map(x => x + 1),
      datasets: [
        { label: "Mood", data: mood, borderWidth: 2, tension: 0.3 },
        { label: "Focus", data: focus, borderWidth: 2, tension: 0.3 }
      ]
    }
  });

  charts.behavior = new Chart(document.getElementById("chart-behavior"), {
    type: "line",
    data: {
      labels: [...Array(90).keys()].map(x => x + 1),
      datasets: [{
        label: "Behavior Value",
        data: behavior,
        borderWidth: 2,
        tension: 0.35
      }]
    }
  });

  renderInsights();
}

/* INSIGHTS */
function renderInsights() {
  const ul = document.getElementById("insights-list");
  ul.innerHTML = "";

  let best = { score: -1, day: null };
  let worst = { score: 999, day: null };
  let totalShots = 0;

  const energyTotals = {
    Water: 0,
    Move: 0,
    Protein: 0,
    Coffee: 0,
    Meal: 0,
    Nicotine: 0
  };

  for (let i = 1; i <= 90; i++) {
    const d = data.days[i];
    if (d.score !== null) {
      if (d.score > best.score) { best.score = d.score; best.day = i; }
      if (d.score < worst.score) { worst.score = d.score; worst.day = i; }
    }
    (d.energy || []).forEach(ev => {
      if (energyTotals[ev.type] !== undefined) energyTotals[ev.type]++;
    });
    totalShots += d.shots || 0;
  }

  if (best.day !== null) {
    const li1 = document.createElement("li");
    li1.textContent = `Paras päivä: Day ${best.day} (${best.score}%)`;
    ul.appendChild(li1);
  }
  if (worst.day !== null) {
    const li2 = document.createElement("li");
    li2.textContent = `Heikoin päivä: Day ${worst.day} (${worst.score}%)`;
    ul.appendChild(li2);
  }

  const moodList = [], focusList = [];
  for (let i = 1; i <= 90; i++) {
    if (data.days[i].mood) moodList.push(data.days[i].mood);
    if (data.days[i].focus) focusList.push(data.days[i].focus);
  }
  if (moodList.length) {
    const li3 = document.createElement("li");
    li3.textContent =
      `Keskimääräinen mood: ${Math.round(moodList.reduce((a,b)=>a+b)/moodList.length)}`;
    ul.appendChild(li3);
  }
  if (focusList.length) {
    const li4 = document.createElement("li");
    li4.textContent =
      `Keskimääräinen focus: ${Math.round(focusList.reduce((a,b)=>a+b)/focusList.length)}`;
    ul.appendChild(li4);
  }

  Object.entries(energyTotals).forEach(([type, count]) => {
    const li = document.createElement("li");
    li.textContent = `${type} painalluksia: ${count}`;
    ul.appendChild(li);
  });

  const liShots = document.createElement("li");
  liShots.textContent = `Shots yhteensä: ${totalShots}`;
  ul.appendChild(liShots);
}

/* INIT */
renderHabits();
renderArena();
updateHUD();
updateQuickCard();
updateBoss();
updateTicker();
qaActiveDay.textContent = `Day ${activeDay}`;
