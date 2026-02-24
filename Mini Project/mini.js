const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const weaponEl = document.getElementById("weapon");
const shieldEl = document.getElementById("shield");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");

const W = canvas.width;
const H = canvas.height;

const keys = new Set();
const pointer = {
  active: false,
  x: W / 2,
  firing: false,
};

const WEAPON_NAMES = {
  1: "BLASTER",
  2: "DUAL",
  3: "TRIPLE",
};

const POWERUPS = [
  { type: "rapid", color: "#5ec2ff", label: "R" },
  { type: "spread", color: "#ff6bde", label: "W" },
  { type: "shield", color: "#7dff8e", label: "S" },
  { type: "life", color: "#ffd46a", label: "1" },
  { type: "bomb", color: "#ff7b7b", label: "B" },
];

function svgSprite(width, height, body) {
  const markup = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}' shape-rendering='crispEdges'>${body}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`;
}

function createSprite(width, height, body) {
  const img = new Image();
  img.src = svgSprite(width, height, body);
  return img;
}

const SPRITES = {
  playerBase: createSprite(
    26,
    20,
    "<rect x='10' y='0' width='6' height='6' fill='#49d8ff'/><rect x='7' y='6' width='12' height='4' fill='#49d8ff'/><rect x='4' y='10' width='18' height='6' fill='#49d8ff'/><rect x='1' y='13' width='4' height='7' fill='#ea50ff'/><rect x='21' y='13' width='4' height='7' fill='#ea50ff'/>"
  ),
  playerBoost: createSprite(
    26,
    20,
    "<rect x='10' y='0' width='6' height='6' fill='#49d8ff'/><rect x='7' y='6' width='12' height='4' fill='#49d8ff'/><rect x='4' y='10' width='18' height='6' fill='#49d8ff'/><rect x='1' y='13' width='4' height='7' fill='#ff6bde'/><rect x='21' y='13' width='4' height='7' fill='#ff6bde'/>"
  ),
  enemies: {
    scout: createSprite(
      20,
      16,
      "<rect x='6' y='0' width='8' height='3' fill='#ff9f63'/><rect x='2' y='3' width='16' height='10' fill='#ff9f63'/><rect x='6' y='13' width='8' height='3' fill='#ff9f63'/>"
    ),
    zigzag: createSprite(
      22,
      18,
      "<rect x='8' y='0' width='6' height='3' fill='#69ffb5'/><rect x='4' y='3' width='14' height='3' fill='#69ffb5'/><rect x='0' y='6' width='22' height='12' fill='#69ffb5'/>"
    ),
    shooter: createSprite(
      24,
      22,
      "<rect x='6' y='0' width='12' height='4' fill='#f5d26a'/><rect x='2' y='4' width='20' height='14' fill='#f5d26a'/><rect x='10' y='16' width='4' height='6' fill='#2b1822'/>"
    ),
    tank: createSprite(
      36,
      30,
      "<rect x='2' y='0' width='32' height='6' fill='#ff6d57'/><rect x='0' y='6' width='36' height='20' fill='#ff6d57'/><rect x='4' y='26' width='28' height='4' fill='#ff6d57'/><rect x='8' y='10' width='20' height='6' fill='#1e0e14'/>"
    ),
    splitter: createSprite(
      26,
      24,
      "<rect x='3' y='0' width='20' height='4' fill='#c68dff'/><rect x='0' y='4' width='26' height='16' fill='#c68dff'/><rect x='5' y='20' width='16' height='4' fill='#c68dff'/><rect x='4' y='8' width='18' height='4' fill='#28193a'/>"
    ),
  },
  powerupFrame: createSprite(
    16,
    16,
    "<rect x='0' y='0' width='16' height='16' fill='#ffffff'/><rect x='2' y='2' width='12' height='12' fill='#1a1125'/>"
  ),
};

const state = {
  running: false,
  ended: false,
  score: 0,
  level: 1,
  lives: 3,
  time: 0,
  spawnClock: 0,
  levelClock: 0,
  flashClock: 0,
  levelBannerClock: 0,
  stars: [],
  particles: [],
  bullets: [],
  enemyBullets: [],
  enemies: [],
  powerups: [],
  player: {
    x: W / 2,
    y: H - 64,
    w: 26,
    h: 20,
    speed: 350,
    cooldown: 0,
    baseFireRate: 0.18,
    fireRate: 0.18,
    hurtClock: 0,
    weaponLevel: 1,
    weaponTimer: 0,
    rapidTimer: 0,
    shield: 0,
  },
};

function resetStars() {
  state.stars = Array.from({ length: 100 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    z: 0.3 + Math.random() * 2.3,
  }));
}

function resetGame() {
  state.running = true;
  state.ended = false;
  state.score = 0;
  state.level = 1;
  state.lives = 3;
  state.time = 0;
  state.spawnClock = 0;
  state.levelClock = 0;
  state.flashClock = 0;
  state.levelBannerClock = 1.3;
  state.particles = [];
  state.bullets = [];
  state.enemyBullets = [];
  state.enemies = [];
  state.powerups = [];

  state.player.x = W / 2;
  state.player.cooldown = 0;
  state.player.hurtClock = 0;
  state.player.weaponLevel = 1;
  state.player.weaponTimer = 0;
  state.player.rapidTimer = 0;
  state.player.shield = 0;
  state.player.fireRate = state.player.baseFireRate;

  resetStars();
  updateHUD();
  hideOverlay();
}

function updateHUD() {
  scoreEl.textContent = state.score;
  levelEl.textContent = state.level;
  livesEl.textContent = state.lives;
  weaponEl.textContent = WEAPON_NAMES[state.player.weaponLevel];
  shieldEl.textContent = state.player.shield > 0 ? "ON" : "OFF";
}

function showOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function weightedChoice(items) {
  let total = 0;
  for (const item of items) total += item.weight;
  let pick = Math.random() * total;
  for (const item of items) {
    pick -= item.weight;
    if (pick <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function enemyTypeForLevel() {
  const lvl = state.level;
  const table = [{ value: "scout", weight: 55 }];

  if (lvl >= 2) table.push({ value: "zigzag", weight: 20 + lvl * 1.5 });
  if (lvl >= 3) table.push({ value: "shooter", weight: 14 + lvl * 1.2 });
  if (lvl >= 4) table.push({ value: "tank", weight: 10 + lvl * 0.8 });
  if (lvl >= 5) table.push({ value: "splitter", weight: 8 + lvl * 0.9 });

  return weightedChoice(table);
}

function makeEnemy(type, xOverride = null, yOverride = null, splitGen = 0) {
  const lvl = state.level;
  if (type === "tank") {
    const w = 36;
    const h = 30;
    return {
      type,
      x: xOverride ?? Math.random() * (W - w),
      y: yOverride ?? -h,
      w,
      h,
      hp: 3 + Math.floor(lvl / 3),
      maxHp: 3 + Math.floor(lvl / 3),
      speed: 40 + lvl * 8,
      drift: 35 + Math.random() * 45,
      value: 24,
      shootCooldown: 0,
      splitGen,
    };
  }

  if (type === "shooter") {
    const w = 24;
    const h = 22;
    return {
      type,
      x: xOverride ?? Math.random() * (W - w),
      y: yOverride ?? -h,
      w,
      h,
      hp: 2 + Math.floor(lvl / 5),
      maxHp: 2 + Math.floor(lvl / 5),
      speed: 62 + lvl * 10,
      drift: 30 + Math.random() * 90,
      value: 18,
      shootCooldown: 0.6 + Math.random() * 0.9,
      splitGen,
    };
  }

  if (type === "splitter") {
    const w = 26;
    const h = 24;
    return {
      type,
      x: xOverride ?? Math.random() * (W - w),
      y: yOverride ?? -h,
      w,
      h,
      hp: 2,
      maxHp: 2,
      speed: 70 + lvl * 12,
      drift: 45 + Math.random() * 110,
      value: 20,
      shootCooldown: 0,
      splitGen,
    };
  }

  if (type === "zigzag") {
    const w = 22;
    const h = 18;
    return {
      type,
      x: xOverride ?? Math.random() * (W - w),
      y: yOverride ?? -h,
      w,
      h,
      hp: 1,
      maxHp: 1,
      speed: 96 + lvl * 16,
      drift: 130 + Math.random() * 140,
      value: 14,
      shootCooldown: 0,
      splitGen,
    };
  }

  const w = 20;
  const h = 16;
  return {
    type: "scout",
    x: xOverride ?? Math.random() * (W - w),
    y: yOverride ?? -h,
    w,
    h,
    hp: 1,
    maxHp: 1,
    speed: 84 + lvl * 14,
    drift: 20 + Math.random() * 75,
    value: 10,
    shootCooldown: 0,
    splitGen,
  };
}

function spawnEnemyWave() {
  const baseCount = 1 + Math.floor(state.level / 3);
  const extra = Math.random() < Math.min(0.6, state.level * 0.06) ? 1 : 0;
  const count = Math.min(5, baseCount + extra);

  for (let i = 0; i < count; i += 1) {
    const type = enemyTypeForLevel();
    state.enemies.push(makeEnemy(type));
  }
}

function burst(x, y, color, amount = 12, speedMul = 1) {
  for (let i = 0; i < amount; i += 1) {
    const angle = (Math.PI * 2 * i) / amount + Math.random() * 0.5;
    const speed = (40 + Math.random() * 180) * speedMul;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + Math.random() * 0.35,
      t: 0,
      size: 1 + Math.random() * 3,
      color,
    });
  }
}

function maybeDropPowerup(enemy) {
  const chance = 0.12 + Math.min(0.12, state.level * 0.01);
  if (Math.random() > chance) return;

  const choices = [
    { value: "rapid", weight: 25 },
    { value: "spread", weight: 22 },
    { value: "shield", weight: 18 },
    { value: "life", weight: state.lives < 4 ? 14 : 6 },
    { value: "bomb", weight: 12 },
  ];

  const type = weightedChoice(choices);
  const visual = POWERUPS.find((p) => p.type === type);
  state.powerups.push({
    type,
    color: visual.color,
    label: visual.label,
    x: enemy.x + enemy.w / 2 - 8,
    y: enemy.y,
    w: 16,
    h: 16,
    speed: 120,
    wobble: Math.random() * Math.PI * 2,
  });
}

function clearEnemiesByBomb() {
  if (state.enemies.length === 0) return;
  let bounty = 0;
  for (const enemy of state.enemies) {
    bounty += enemy.value;
    burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#ff7b7b", 8);
  }
  state.enemies = [];
  state.enemyBullets = [];
  state.score += bounty;
  updateHUD();
}

function applyPowerup(type) {
  if (type === "rapid") {
    state.player.rapidTimer = Math.max(state.player.rapidTimer, 10);
    state.player.fireRate = state.player.baseFireRate * 0.55;
  }

  if (type === "spread") {
    state.player.weaponLevel = clamp(state.player.weaponLevel + 1, 1, 3);
    state.player.weaponTimer = Math.max(state.player.weaponTimer, 12);
  }

  if (type === "shield") {
    state.player.shield = 1;
  }

  if (type === "life") {
    state.lives = clamp(state.lives + 1, 1, 5);
  }

  if (type === "bomb") {
    clearEnemiesByBomb();
  }

  updateHUD();
}

function loseLife() {
  state.lives -= 1;
  state.player.hurtClock = 1;
  state.flashClock = 0.16;
  burst(
    state.player.x + state.player.w / 2,
    state.player.y + state.player.h / 2,
    "#ff5d6c",
    18
  );
  updateHUD();

  if (state.lives <= 0) {
    state.running = false;
    state.ended = true;
    showOverlay(
      "GAME OVER",
      `Final Score: ${state.score} · Level ${state.level} · Press Enter`
    );
  }
}

function hitPlayer() {
  if (state.player.hurtClock > 0) return;

  if (state.player.shield > 0) {
    state.player.shield = 0;
    state.player.hurtClock = 0.4;
    state.flashClock = 0.1;
    burst(
      state.player.x + state.player.w / 2,
      state.player.y + state.player.h / 2,
      "#7dff8e",
      16,
      1.2
    );
    updateHUD();
    return;
  }

  loseLife();
}

function spawnPlayerShots() {
  if (state.player.cooldown > 0) return;

  state.player.cooldown = state.player.fireRate;
  const center = state.player.x + state.player.w / 2;

  if (state.player.weaponLevel === 1) {
    state.bullets.push({ x: center - 2, y: state.player.y - 8, w: 4, h: 10, vx: 0, speed: 520 });
    return;
  }

  if (state.player.weaponLevel === 2) {
    state.bullets.push({ x: center - 9, y: state.player.y - 8, w: 4, h: 10, vx: -60, speed: 520 });
    state.bullets.push({ x: center + 5, y: state.player.y - 8, w: 4, h: 10, vx: 60, speed: 520 });
    return;
  }

  state.bullets.push({ x: center - 2, y: state.player.y - 8, w: 4, h: 10, vx: 0, speed: 550 });
  state.bullets.push({ x: center - 11, y: state.player.y - 8, w: 4, h: 10, vx: -120, speed: 520 });
  state.bullets.push({ x: center + 7, y: state.player.y - 8, w: 4, h: 10, vx: 120, speed: 520 });
}

function handleEnemyDeath(enemy, index) {
  state.enemies.splice(index, 1);
  state.score += enemy.value + state.level * 2;
  burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#8bf27b", 12);
  maybeDropPowerup(enemy);

  if (enemy.type === "splitter" && enemy.splitGen < 1) {
    const left = makeEnemy("scout", enemy.x - 10, enemy.y, 1);
    const right = makeEnemy("scout", enemy.x + 10, enemy.y, 1);
    left.w = 14;
    left.h = 12;
    left.speed += 40;
    right.w = 14;
    right.h = 12;
    right.speed += 40;
    state.enemies.push(left, right);
  }

  updateHUD();
}

function updatePlayerControl(dt) {
  const movingLeft = keys.has("ArrowLeft") || keys.has("a") || keys.has("A");
  const movingRight = keys.has("ArrowRight") || keys.has("d") || keys.has("D");

  if (movingLeft) state.player.x -= state.player.speed * dt;
  if (movingRight) state.player.x += state.player.speed * dt;

  if (pointer.active) {
    const target = clamp(pointer.x - state.player.w / 2, 8, W - state.player.w - 8);
    const delta = target - state.player.x;
    const maxStep = state.player.speed * 1.5 * dt;
    state.player.x += clamp(delta, -maxStep, maxStep);
  }

  state.player.x = clamp(state.player.x, 8, W - state.player.w - 8);

  const keyboardFire = keys.has(" ") || keys.has("Space") || keys.has("Spacebar");
  if (keyboardFire || pointer.firing) {
    spawnPlayerShots();
  }
}

function update(dt) {
  if (!state.running) return;

  state.time += dt;
  state.levelClock += dt;
  state.spawnClock += dt;
  state.player.cooldown -= dt;
  state.player.hurtClock -= dt;
  state.flashClock -= dt;
  state.levelBannerClock -= dt;

  if (state.levelClock >= 14) {
    state.level += 1;
    state.levelClock = 0;
    state.levelBannerClock = 1.6;
    updateHUD();
  }

  if (state.player.rapidTimer > 0) {
    state.player.rapidTimer -= dt;
    if (state.player.rapidTimer <= 0) {
      state.player.fireRate = state.player.baseFireRate;
    }
  }

  if (state.player.weaponTimer > 0) {
    state.player.weaponTimer -= dt;
    if (state.player.weaponTimer <= 0) {
      state.player.weaponLevel = 1;
      updateHUD();
    }
  }

  for (const s of state.stars) {
    s.y += s.z * (35 + state.level * 9) * dt;
    if (s.y > H) {
      s.y = -2;
      s.x = Math.random() * W;
    }
  }

  updatePlayerControl(dt);

  const spawnRate = Math.max(0.22, 1.05 - state.level * 0.06);
  if (state.spawnClock >= spawnRate) {
    state.spawnClock = 0;
    spawnEnemyWave();
  }

  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    bullet.y -= bullet.speed * dt;
    bullet.x += (bullet.vx || 0) * dt;
    if (bullet.y + bullet.h < 0 || bullet.x < -12 || bullet.x > W + 12) {
      state.bullets.splice(i, 1);
    }
  }

  for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.enemyBullets[i];
    bullet.y += bullet.speed * dt;
    bullet.x += bullet.vx * dt;
    if (bullet.y > H + 10 || bullet.x < -8 || bullet.x > W + 8) {
      state.enemyBullets.splice(i, 1);
      continue;
    }

    if (rectsOverlap(bullet, state.player)) {
      state.enemyBullets.splice(i, 1);
      hitPlayer();
    }
  }

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    enemy.y += enemy.speed * dt;

    if (enemy.type === "zigzag") {
      enemy.x += Math.sin(state.time * 9 + enemy.y * 0.04) * enemy.drift * dt;
    } else {
      enemy.x += Math.sin(state.time * 2 + enemy.y * 0.01) * enemy.drift * dt;
    }

    enemy.x = clamp(enemy.x, 0, W - enemy.w);

    if (enemy.type === "shooter" || enemy.type === "tank") {
      enemy.shootCooldown -= dt;
      if (enemy.shootCooldown <= 0) {
        enemy.shootCooldown = enemy.type === "tank" ? 1.6 : 1.2;
        const aim = (state.player.x + state.player.w / 2 - (enemy.x + enemy.w / 2)) / 280;
        state.enemyBullets.push({
          x: enemy.x + enemy.w / 2 - 2,
          y: enemy.y + enemy.h,
          w: 4,
          h: 8,
          speed: 210 + state.level * 9,
          vx: clamp(aim * 95, -85, 85),
        });
      }
    }

    if (enemy.y > H + 24) {
      state.enemies.splice(i, 1);
      continue;
    }

    if (rectsOverlap(enemy, state.player)) {
      state.enemies.splice(i, 1);
      hitPlayer();
      continue;
    }

    let removed = false;
    for (let j = state.bullets.length - 1; j >= 0; j -= 1) {
      if (rectsOverlap(enemy, state.bullets[j])) {
        state.bullets.splice(j, 1);
        enemy.hp -= 1;
        burst(
          enemy.x + enemy.w / 2,
          enemy.y + enemy.h / 2,
          enemy.hp <= 0 ? "#8bf27b" : "#ffd86a",
          enemy.hp <= 0 ? 10 : 4,
          0.8
        );

        if (enemy.hp <= 0) {
          handleEnemyDeath(enemy, i);
          removed = true;
        }
        break;
      }
    }
    if (removed) continue;
  }

  for (let i = state.powerups.length - 1; i >= 0; i -= 1) {
    const item = state.powerups[i];
    item.y += item.speed * dt;
    item.x += Math.sin(state.time * 4 + item.wobble) * 30 * dt;

    if (item.y > H + 20) {
      state.powerups.splice(i, 1);
      continue;
    }

    if (rectsOverlap(item, state.player)) {
      applyPowerup(item.type);
      burst(item.x + item.w / 2, item.y + item.h / 2, item.color, 14, 0.9);
      state.powerups.splice(i, 1);
    }
  }

  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.t += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;

    if (p.t >= p.life) state.particles.splice(i, 1);
  }
}

function drawPlayer() {
  const p = state.player;
  const blink = p.hurtClock > 0 && Math.floor(state.time * 20) % 2 === 0;
  if (blink) return;

  const x = Math.round(p.x);
  const y = Math.round(p.y);
  const playerSprite = state.player.weaponLevel > 1 ? SPRITES.playerBoost : SPRITES.playerBase;
  if (playerSprite.complete) {
    ctx.drawImage(playerSprite, x, y, p.w, p.h);
  } else {
    ctx.fillStyle = "#49d8ff";
    ctx.fillRect(x + 10, y, 6, 6);
    ctx.fillRect(x + 7, y + 6, 12, 4);
    ctx.fillRect(x + 4, y + 10, 18, 6);
  }

  if (state.player.shield > 0) {
    ctx.strokeStyle = "#7dff8e";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 4, y - 4, p.w + 8, p.h + 8);
  }
}

function drawEnemy(enemy) {
  const x = Math.round(enemy.x);
  const y = Math.round(enemy.y);
  const sprite = SPRITES.enemies[enemy.type] || SPRITES.enemies.scout;
  if (sprite.complete) {
    ctx.drawImage(sprite, x, y, enemy.w, enemy.h);
    return;
  }

  ctx.fillStyle = "#ff9f63";
  ctx.fillRect(x, y, enemy.w, enemy.h);
}

function drawPowerup(item) {
  const x = Math.round(item.x);
  const y = Math.round(item.y);
  if (SPRITES.powerupFrame.complete) {
    ctx.drawImage(SPRITES.powerupFrame, x, y, item.w, item.h);
    ctx.fillStyle = item.color;
    ctx.fillRect(x, y, 16, 2);
  } else {
    ctx.fillStyle = item.color;
    ctx.fillRect(x, y, item.w, item.h);
    ctx.fillStyle = "#1a1125";
    ctx.fillRect(x + 2, y + 2, item.w - 4, item.h - 4);
  }
  ctx.fillStyle = item.color;
  ctx.font = "10px monospace";
  ctx.fillText(item.label, x + 5, y + 11);
}

function draw() {
  ctx.fillStyle = "#05040b";
  ctx.fillRect(0, 0, W, H);

  for (const s of state.stars) {
    ctx.fillStyle = s.z > 1.8 ? "#b6f5ff" : s.z > 1.2 ? "#8fbcff" : "#516184";
    const size = s.z > 1.6 ? 2 : 1;
    ctx.fillRect(Math.round(s.x), Math.round(s.y), size, size);
  }

  for (const bullet of state.bullets) {
    ctx.fillStyle = "#8bf27b";
    ctx.fillRect(Math.round(bullet.x), Math.round(bullet.y), bullet.w, bullet.h);
  }

  for (const bullet of state.enemyBullets) {
    ctx.fillStyle = "#ff7b7b";
    ctx.fillRect(Math.round(bullet.x), Math.round(bullet.y), bullet.w, bullet.h);
  }

  for (const item of state.powerups) drawPowerup(item);
  for (const enemy of state.enemies) drawEnemy(enemy);

  for (const p of state.particles) {
    const alpha = 1 - p.t / p.life;
    ctx.fillStyle = `rgba(${p.color === "#8bf27b" ? "139,242,123" : p.color === "#ff5d6c" ? "255,93,108" : p.color === "#ff7b7b" ? "255,123,123" : p.color === "#7dff8e" ? "125,255,142" : p.color === "#ffd86a" ? "255,216,106" : p.color === "#5ec2ff" ? "94,194,255" : p.color === "#ff6bde" ? "255,107,222" : "180,160,255"},${alpha})`;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }

  drawPlayer();

  if (state.levelBannerClock > 0) {
    ctx.fillStyle = "rgba(14,8,28,0.32)";
    ctx.fillRect(0, H / 2 - 20, W, 40);
    ctx.fillStyle = "#5ec2ff";
    ctx.font = "16px monospace";
    ctx.fillText(`LEVEL ${state.level}`, W / 2 - 45, H / 2 + 6);
  }

  if (state.flashClock > 0) {
    ctx.fillStyle = `rgba(255, 70, 90, ${Math.min(0.2, state.flashClock)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

let lastTs = performance.now();
function loop(ts) {
  const dt = Math.min(0.033, (ts - lastTs) / 1000);
  lastTs = ts;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

function pointerXFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  return (event.clientX - rect.left) * scaleX;
}

canvas.addEventListener("pointermove", (event) => {
  pointer.active = true;
  pointer.x = pointerXFromEvent(event);
});

canvas.addEventListener("pointerdown", (event) => {
  pointer.active = true;
  pointer.firing = true;
  pointer.x = pointerXFromEvent(event);

  if (!state.running) {
    resetGame();
  }
});

canvas.addEventListener("pointerup", () => {
  pointer.firing = false;
});

canvas.addEventListener("pointerleave", () => {
  pointer.firing = false;
});

window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", " ", "Space", "Spacebar", "a", "A", "d", "D", "Enter"].includes(e.key)) {
    e.preventDefault();
  }

  keys.add(e.key);

  if (e.key === "Enter" && !state.running) {
    resetGame();
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key);
});

resetStars();
showOverlay(
  "PRESS ENTER",
  "Move: A/D/Arrows or Trackpad/Mouse · Shoot: Space or Click/Hold"
);
requestAnimationFrame(loop);
