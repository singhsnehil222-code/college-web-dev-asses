const LEVELS = [
  { size: 7, randomBlockers: 14, time: 55, pulse: 1600 },
  { size: 7, randomBlockers: 13, time: 53, pulse: 1560 },
  { size: 8, randomBlockers: 15, time: 50, pulse: 1500 },
  { size: 8, randomBlockers: 13, time: 48, pulse: 1450 },
  { size: 9, randomBlockers: 14, time: 44, pulse: 1380 },
  { size: 9, randomBlockers: 15, time: 42, pulse: 1320 },
  { size: 10, randomBlockers: 16, time: 39, pulse: 1260 },
  { size: 10, randomBlockers: 17, time: 36, pulse: 1200 },
  { size: 11, randomBlockers: 19, time: 33, pulse: 1130 },
  { size: 12, randomBlockers: 21, time: 30, pulse: 1060 },
];

const HINTS = [
  "Hint: Build a wall in front of the dot's direction.",
  "Hint: Close one side first instead of spreading blockers.",
  "Hint: Protect the nearest edge openings.",
  "Hint: Leave no single-tile tunnel open.",
  "Hint: Create a curved cage around the center.",
  "Hint: Avoid random clicks; think in rings.",
  "Hint: Watch two exits ahead of the dot.",
  "Hint: Seal diagonal-style lanes on odd rows.",
  "Hint: In late game, block where the path narrows.",
  "Hint: Final level: deny all edge approach lanes early.",
];

const CELL = { EMPTY: 0, BLOCKED: 1, DOT: 2 };
const SVG_NS = "http://www.w3.org/2000/svg";

const startScreenEl = document.getElementById("startScreen");
const instructionScreenEl = document.getElementById("instructionScreen");
const gameScreenEl = document.getElementById("gameScreen");
const levelPickerEl = document.getElementById("levelPicker");
const modePickerEl = document.getElementById("modePicker");
const instructionTitleEl = document.getElementById("instructionTitle");
const instructionListEl = document.getElementById("instructionList");
const instructionHintEl = document.getElementById("instructionHint");
const goToInstructionsBtn = document.getElementById("goToInstructionsBtn");
const backToStartBtn = document.getElementById("backToStartBtn");
const startGameBtn = document.getElementById("startGameBtn");

const boardEl = document.getElementById("gameBoard");
const modeValueEl = document.getElementById("modeValue");
const levelLabelEl = document.getElementById("levelLabel");
const levelValueEl = document.getElementById("levelValue");
const clearedValueEl = document.getElementById("clearedValue");
const movesValueEl = document.getElementById("movesValue");
const timeValueEl = document.getElementById("timeValue");
const bestValueEl = document.getElementById("bestValue");
const messageEl = document.getElementById("message");
const hintTextEl = document.getElementById("hintText");
const restartLevelBtn = document.getElementById("restartLevelBtn");
const nextLevelBtn = document.getElementById("nextLevelBtn");
const menuBtn = document.getElementById("menuBtn");
const bgCanvas = document.getElementById("bgCanvas");

let state = {
  selectedLevelIndex: 0,
  selectedMode: "normal",
  levelIndex: 0,
  mode: "normal",
  board: [],
  size: 0,
  dot: { row: 0, col: 0 },
  moves: 0,
  isGameOver: false,
  bestByKey: {},
  timeLeftMs: 0,
  pulseIntervalId: null,
  timerIntervalId: null,
  stageClearedCount: 0,
  stageNumber: 1,
};

function showScreen(name) {
  startScreenEl.classList.remove("active");
  instructionScreenEl.classList.remove("active");
  gameScreenEl.classList.remove("active");

  if (name === "start") startScreenEl.classList.add("active");
  if (name === "instructions") instructionScreenEl.classList.add("active");
  if (name === "game") gameScreenEl.classList.add("active");
}

function setupLevel(levelIndex) {
  clearModeTimers();

  const level = LEVELS[levelIndex];
  state.levelIndex = levelIndex;
  state.mode = state.selectedMode;
  state.size = level.size;
  state.moves = 0;
  state.isGameOver = false;
  state.stageClearedCount = 0;
  state.stageNumber = 1;
  state.timeLeftMs = level.time * 1000;
  state.board = Array.from({ length: level.size }, () => Array(level.size).fill(CELL.EMPTY));

  const center = Math.floor(level.size / 2);
  state.dot = { row: center, col: center };
  state.board[center][center] = CELL.DOT;

  placeRandomBlockers(level.randomBlockers);
  renderBoard();
  updateHud();
  setMessage(`Level ${levelIndex + 1}: Trap the dot before it reaches the edge.`, "");
  hintTextEl.textContent = HINTS[levelIndex];
  updateNextButton();

  if (state.mode === "timed") {
    startTimedSession();
  }
}

function setupTimedStage(stageNumber) {
  const difficulty = Math.min(LEVELS.length - 1, Math.floor((stageNumber - 1) / 2));
  const base = LEVELS[difficulty];
  const size = Math.min(12, base.size + Math.floor((stageNumber - 1) / 4));
  const blockers = Math.min(size * size - 1, base.randomBlockers + Math.floor((stageNumber - 1) * 1.5));

  state.size = size;
  state.moves = 0;
  state.isGameOver = false;
  state.board = Array.from({ length: size }, () => Array(size).fill(CELL.EMPTY));

  const center = Math.floor(size / 2);
  state.dot = { row: center, col: center };
  state.board[center][center] = CELL.DOT;

  placeRandomBlockers(blockers);
  renderBoard();
  updateHud();
  setMessage(`Stage ${stageNumber}: trap fast and move to next stage.`, "");
  hintTextEl.textContent = "Timed mode: trap quickly, close blocks add bonus time.";
  updateNextButton();
}

function placeRandomBlockers(count) {
  let placed = 0;
  let guard = 0;

  while (placed < count && guard < 5000) {
    guard += 1;
    const row = randInt(0, state.size - 1);
    const col = randInt(0, state.size - 1);

    if (state.board[row][col] !== CELL.EMPTY) continue;
    if (isCenter(row, col)) continue;

    state.board[row][col] = CELL.BLOCKED;
    placed += 1;
  }
}

function renderBoard() {
  boardEl.innerHTML = "";

  const radius = 17;
  const gap = 5;
  const xStep = radius * 2 + gap;
  const yStep = Math.sqrt(3) * radius + gap;
  const margin = radius + 8;

  const totalWidth = margin * 2 + (state.size - 1) * xStep + radius;
  const totalHeight = margin * 2 + (state.size - 1) * yStep + radius;
  boardEl.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);

  for (let row = 0; row < state.size; row += 1) {
    for (let col = 0; col < state.size; col += 1) {
      const cx = margin + col * xStep + (row % 2 === 1 ? xStep / 2 : 0);
      const cy = margin + row * yStep;

      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("cx", String(cx));
      circle.setAttribute("cy", String(cy));
      circle.setAttribute("r", String(radius));
      circle.classList.add("cell");
      circle.dataset.row = String(row);
      circle.dataset.col = String(col);

      const cell = state.board[row][col];
      if (cell === CELL.BLOCKED) circle.classList.add("blocker");
      if (cell === CELL.DOT) circle.classList.add("dot");

      boardEl.appendChild(circle);
    }
  }
}

function onCellClick(target) {
  if (state.isGameOver) return;

  const row = Number(target.dataset.row);
  const col = Number(target.dataset.col);
  if (!isInside(row, col)) return;
  if (state.board[row][col] !== CELL.EMPTY) return;

  state.board[row][col] = CELL.BLOCKED;
  state.moves += 1;

  if (state.mode === "timed" && isNearDot(row, col)) {
    // Creative timed rule: high-risk close blocks earn bonus time.
    state.timeLeftMs += 1200;
    setMessage("Close block bonus: +1.2s", "");
  }

  if (isDotTrapped()) {
    onLevelWon();
    return;
  }

  if (state.mode === "normal") {
    moveDot();

    if (isEdge(state.dot.row, state.dot.col)) {
      onLevelLost("The dot escaped. Restart and try a tighter block.");
      renderBoard();
      return;
    }

    if (isDotTrapped()) {
      onLevelWon();
      return;
    }

    setMessage("Nice move. Keep closing the nearest exits.", "");
  } else {
    setMessage("Timer running. Keep building fast walls.", "");
  }

  updateHud();
  renderBoard();
}

function moveDot() {
  const path = findPathToNearestEdge(state.dot.row, state.dot.col);
  if (!path || path.length < 2) return;

  const next = path[1];
  state.board[state.dot.row][state.dot.col] = CELL.EMPTY;
  state.dot = { row: next.row, col: next.col };
  state.board[state.dot.row][state.dot.col] = CELL.DOT;
}

function findPathToNearestEdge(startRow, startCol) {
  const queue = [{ row: startRow, col: startCol }];
  const seen = new Set([key(startRow, startCol)]);
  const parent = new Map();

  while (queue.length > 0) {
    const current = queue.shift();
    if (isEdge(current.row, current.col)) {
      return rebuildPath(current, parent);
    }

    for (const next of getHexNeighbors(current.row, current.col)) {
      if (!isInside(next.row, next.col)) continue;
      if (state.board[next.row][next.col] === CELL.BLOCKED) continue;

      const nextKey = key(next.row, next.col);
      if (seen.has(nextKey)) continue;
      seen.add(nextKey);
      parent.set(nextKey, current);
      queue.push(next);
    }
  }

  return null;
}

function rebuildPath(endNode, parent) {
  const path = [endNode];
  let cursor = endNode;

  while (!(cursor.row === state.dot.row && cursor.col === state.dot.col)) {
    const previous = parent.get(key(cursor.row, cursor.col));
    if (!previous) break;
    path.push(previous);
    cursor = previous;
  }

  return path.reverse();
}

function isDotTrapped() {
  return !findPathToNearestEdge(state.dot.row, state.dot.col);
}

function onLevelWon() {
  if (state.mode === "timed") {
    state.stageClearedCount += 1;
    updateBestScore();
    updateHud();
    setMessage(`Stage cleared! Total cleared: ${state.stageClearedCount}`, "win");
    state.stageNumber += 1;
    window.setTimeout(() => {
      if (state.timeLeftMs <= 0) return;
      setupTimedStage(state.stageNumber);
    }, 260);
    return;
  }

  state.isGameOver = true;
  clearModeTimers();
  updateBestScore();

  if (state.levelIndex === LEVELS.length - 1) {
    setMessage("You cleared all 10 levels. Arcade champion!", "win");
  } else {
    setMessage(`Level ${state.levelIndex + 1} cleared!`, "win");
  }

  updateHud();
  updateNextButton();
  renderBoard();
}

function onLevelLost(text) {
  if (state.mode === "timed") {
    // Timed mode continues until 60 seconds end. Escapes cost time.
    state.timeLeftMs = Math.max(0, state.timeLeftMs - 5000);
    state.stageNumber += 1;
    setMessage("Dot escaped: -5.0s penalty. Next stage!", "lose");
    updateHud();
    window.setTimeout(() => {
      if (state.timeLeftMs <= 0) return;
      setupTimedStage(state.stageNumber);
    }, 260);
    return;
  }

  state.isGameOver = true;
  clearModeTimers();
  setMessage(text, "lose");
  updateHud();
  updateNextButton();
}

function updateBestScore() {
  const bestKey = state.mode === "timed" ? "timed-run" : `${state.mode}-${state.levelIndex}`;
  const prev = state.bestByKey[bestKey];

  if (state.mode === "normal") {
    if (prev === undefined || state.moves < prev) state.bestByKey[bestKey] = state.moves;
    return;
  }

  if (prev === undefined || state.stageClearedCount > prev) state.bestByKey[bestKey] = state.stageClearedCount;
}

function updateHud() {
  modeValueEl.textContent = state.mode === "timed" ? "TIMED" : "NORMAL";
  levelLabelEl.textContent = state.mode === "timed" ? "STAGE" : "LEVEL";
  levelValueEl.textContent = state.mode === "timed" ? String(state.stageNumber) : String(state.levelIndex + 1);
  clearedValueEl.textContent = state.mode === "timed" ? String(state.stageClearedCount) : "--";
  movesValueEl.textContent = String(state.moves);

  if (state.mode === "timed") {
    timeValueEl.textContent = `${Math.max(0, state.timeLeftMs / 1000).toFixed(1)}s`;
    const timedBest = state.bestByKey["timed-run"];
    bestValueEl.textContent = timedBest === undefined ? "-" : `${timedBest} stg`;
  } else {
    timeValueEl.textContent = "--";
    const normalBest = state.bestByKey[`normal-${state.levelIndex}`];
    bestValueEl.textContent = normalBest === undefined ? "-" : String(normalBest);
  }
}

function setMessage(text, typeClass) {
  messageEl.textContent = text;
  messageEl.classList.remove("win", "lose");
  if (typeClass) messageEl.classList.add(typeClass);
}

function updateNextButton() {
  if (state.mode === "timed") {
    nextLevelBtn.disabled = true;
    nextLevelBtn.textContent = "Auto";
    return;
  }

  const lastLevel = state.levelIndex === LEVELS.length - 1;
  const canProceed = state.isGameOver && messageEl.classList.contains("win") && !lastLevel;

  nextLevelBtn.disabled = !canProceed;
  nextLevelBtn.textContent = lastLevel ? "Final Level" : "Next Level";
}

function startTimedSession() {
  state.timeLeftMs = 60000;
  state.stageClearedCount = 0;
  state.stageNumber = 1;
  setupTimedStage(state.stageNumber);

  const timedPulseMs = 1100;

  // In timed mode the dot moves automatically on each pulse.
  state.pulseIntervalId = window.setInterval(() => {
    if (state.timeLeftMs <= 0) return;

    moveDot();
    renderBoard();

    if (isEdge(state.dot.row, state.dot.col)) {
      onLevelLost("Time mode: the dot pulsed to the edge and escaped.");
      return;
    }

    if (isDotTrapped()) {
      onLevelWon();
      return;
    }

    setMessage("Timed pulse: dot moved. Place blockers fast.", "");
  }, timedPulseMs);

  state.timerIntervalId = window.setInterval(() => {
    if (state.timeLeftMs <= 0) return;

    state.timeLeftMs -= 100;
    if (state.timeLeftMs <= 0) {
      state.timeLeftMs = 0;
      clearModeTimers();
      state.isGameOver = true;
      updateBestScore();
      setMessage(
        `Time up! You cleared ${state.stageClearedCount} stage${state.stageClearedCount === 1 ? "" : "s"}.`,
        "win"
      );
      updateHud();
      updateNextButton();
      return;
    }

    updateHud();
  }, 100);
}

function clearModeTimers() {
  if (state.pulseIntervalId) {
    window.clearInterval(state.pulseIntervalId);
    state.pulseIntervalId = null;
  }

  if (state.timerIntervalId) {
    window.clearInterval(state.timerIntervalId);
    state.timerIntervalId = null;
  }
}

function getHexNeighbors(row, col) {
  const evenRowOffsets = [
    { dr: -1, dc: -1 },
    { dr: -1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
    { dr: 1, dc: -1 },
    { dr: 1, dc: 0 },
  ];

  const oddRowOffsets = [
    { dr: -1, dc: 0 },
    { dr: -1, dc: 1 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
  ];

  const offsets = row % 2 === 0 ? evenRowOffsets : oddRowOffsets;
  return offsets.map((offset) => ({ row: row + offset.dr, col: col + offset.dc }));
}

function isNearDot(row, col) {
  return getHexNeighbors(state.dot.row, state.dot.col).some(
    (neighbor) => neighbor.row === row && neighbor.col === col
  );
}

function isCenter(row, col) {
  const center = Math.floor(state.size / 2);
  return row === center && col === center;
}

function isInside(row, col) {
  return row >= 0 && row < state.size && col >= 0 && col < state.size;
}

function isEdge(row, col) {
  const last = state.size - 1;
  return row === 0 || col === 0 || row === last || col === last;
}

function key(row, col) {
  return `${row},${col}`;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function renderLevelButtons() {
  levelPickerEl.innerHTML = "";

  for (let i = 0; i < LEVELS.length; i += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "level-chip";
    if (i === state.selectedLevelIndex) button.classList.add("active");
    button.dataset.level = String(i);
    button.textContent = `Level ${i + 1}`;
    levelPickerEl.appendChild(button);
  }
}

function updateStartScreenByMode() {
  if (state.selectedMode === "timed") {
    levelPickerEl.style.display = "none";
    return;
  }
  levelPickerEl.style.display = "grid";
}

function updateInstructionsForMode() {
  if (state.selectedMode === "timed") {
    instructionTitleEl.textContent = "Timed Mode Rules";
    instructionListEl.innerHTML = "";
    [
      "You get exactly 60 seconds to clear as many stages as possible.",
      "Dot moves automatically every pulse (not after your click).",
      "Place blockers near the dot for +1.2s bonus time.",
      "If dot escapes, you lose 5 seconds and a new stage starts.",
    ].forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      instructionListEl.appendChild(li);
    });
    instructionHintEl.textContent = "Creative tip: close-risk blocks buy time and control.";
    return;
  }

  instructionTitleEl.textContent = "Normal Mode Rules";
  instructionListEl.innerHTML = "";
  [
    "Click gray circles to place orange blockers.",
    "After each blocker, the blue dot moves one step.",
    "Use strategy to block every possible path.",
    "If dot reaches edge, you lose that level.",
  ].forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    instructionListEl.appendChild(li);
  });
  instructionHintEl.textContent = "Hint: Close nearby routes first, then seal edges.";
}

function initBackgroundCanvas() {
  const ctx = bgCanvas.getContext("2d");
  if (!ctx) return;

  const stars = [];
  const maxStars = 70;

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    bgCanvas.width = Math.floor(width * dpr);
    bgCanvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (stars.length === 0) {
      for (let i = 0; i < maxStars; i += 1) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.8 + 0.5,
          speed: Math.random() * 0.35 + 0.12,
        });
      }
    }
  }

  function drawBackground() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    ctx.clearRect(0, 0, width, height);

    for (const star of stars) {
      star.y += star.speed;
      if (star.y > height + 4) {
        star.y = -4;
        star.x = Math.random() * width;
      }

      ctx.beginPath();
      ctx.fillStyle = "rgba(255, 244, 195, 0.68)";
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let y = 0; y < height; y += 18) {
      ctx.fillStyle = "rgba(41, 22, 109, 0.08)";
      ctx.fillRect(0, y, width, 7);
    }

    window.requestAnimationFrame(drawBackground);
  }

  resizeCanvas();
  drawBackground();
  window.addEventListener("resize", resizeCanvas);
}

goToInstructionsBtn.addEventListener("click", () => {
  updateInstructionsForMode();
  showScreen("instructions");
});

backToStartBtn.addEventListener("click", () => {
  showScreen("start");
});

startGameBtn.addEventListener("click", () => {
  setupLevel(state.selectedLevelIndex);
  showScreen("game");
});

modePickerEl.addEventListener("click", (event) => {
  const target = event.target.closest(".mode-chip");
  if (!target) return;

  state.selectedMode = target.dataset.mode;
  if (state.selectedMode === "timed") {
    state.selectedLevelIndex = 0;
  }
  modePickerEl.querySelectorAll(".mode-chip").forEach((chip) => chip.classList.remove("active"));
  target.classList.add("active");
  updateStartScreenByMode();
});

levelPickerEl.addEventListener("click", (event) => {
  const target = event.target.closest(".level-chip");
  if (!target) return;

  const index = Number(target.dataset.level);
  state.selectedLevelIndex = index;

  levelPickerEl.querySelectorAll(".level-chip").forEach((chip) => chip.classList.remove("active"));
  target.classList.add("active");
});

boardEl.addEventListener("click", (event) => {
  const target = event.target.closest(".cell");
  if (!target) return;
  onCellClick(target);
});

restartLevelBtn.addEventListener("click", () => {
  if (state.mode === "timed") {
    setupLevel(state.levelIndex);
    return;
  }
  setupLevel(state.levelIndex);
});

nextLevelBtn.addEventListener("click", () => {
  const won = messageEl.classList.contains("win");
  if (!state.isGameOver || !won) return;
  if (state.levelIndex >= LEVELS.length - 1) return;

  state.selectedLevelIndex = state.levelIndex + 1;
  setupLevel(state.levelIndex + 1);
});

menuBtn.addEventListener("click", () => {
  clearModeTimers();
  showScreen("start");
});

renderLevelButtons();
updateStartScreenByMode();
updateInstructionsForMode();
initBackgroundCanvas();
