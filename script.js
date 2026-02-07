"use strict";

(() => {
  const STORAGE_KEY = "snakeGame.highScore";

  const CONFIG = {
    rows: 18,
    cols: 30,
    foods: 5,
    cell: 20,
    tickMs: 150,
    inputBuffer: 3,
  };

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const highScoreEl = document.getElementById("highScore");
  const overlayEl = document.getElementById("overlay");
  const finalScoreEl = document.getElementById("finalScore");
  const finalHighScoreEl = document.getElementById("finalHighScore");
  const recordMessageEl = document.getElementById("recordMessage");
  const restartBtn = document.getElementById("restartBtn");

  const totalRows = CONFIG.rows + 1;
  const totalCols = CONFIG.cols + 1;
  canvas.width = totalCols * CONFIG.cell;
  canvas.height = totalRows * CONFIG.cell;

  const DIRS = {
    up: { r: -1, c: 0 },
    down: { r: 1, c: 0 },
    left: { r: 0, c: -1 },
    right: { r: 0, c: 1 },
  };

  const game = {
    snake: [],
    snakeSet: new Set(),
    foods: [],
    dir: null,
    queue: [],
    running: false,
    lastTime: 0,
    acc: 0,
    prevSnake: null,
    score: 0,
    highScore: loadHighScore(),
    hasBrokenHighScore: false,
  };

  function keyFor(pos) {
    return `${pos.r},${pos.c}`;
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function loadHighScore() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = Number.parseInt(raw ?? "0", 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch {
      return 0;
    }
  }

  function persistHighScore() {
    try {
      window.localStorage.setItem(STORAGE_KEY, game.highScore.toString());
    } catch {
      // Ignore storage failures
    }
  }

  function isOpposite(next, current) {
    if (!current) return false;
    return (
      (next === "up" && current === "down") ||
      (next === "down" && current === "up") ||
      (next === "left" && current === "right") ||
      (next === "right" && current === "left")
    );
  }

  function queueDirection(dir) {
    const base =
      game.queue.length > 0 ? game.queue[game.queue.length - 1] : game.dir;
    if (dir === base) return;
    if (isOpposite(dir, base)) return;
    if (game.queue.length < CONFIG.inputBuffer) {
      game.queue.push(dir);
    }
  }

  function updateHud() {
    scoreEl.textContent = game.score.toString();
    highScoreEl.textContent = game.highScore.toString();
  }

  function setRecordMessage(text, isRecord) {
    recordMessageEl.textContent = text;
    recordMessageEl.classList.toggle("record", isRecord);
    recordMessageEl.classList.toggle("info", !isRecord);
  }

  function refreshHighScore() {
    game.hasBrokenHighScore = game.score > game.highScore;
    if (!game.hasBrokenHighScore) return;
    game.highScore = game.score;
    persistHighScore();
  }

  function addScore(points) {
    game.score += points;
    updateHud();
  }

  function showOverlay() {
    finalScoreEl.textContent = game.score.toString();
    finalHighScoreEl.textContent = game.highScore.toString();

    if (game.hasBrokenHighScore) {
      setRecordMessage(`High score broken! New best: ${game.highScore}.`, true);
    } else if (game.highScore === 0) {
      setRecordMessage(
        "No high score yet. Eat food to set your first record.",
        false,
      );
    } else if (game.score === game.highScore) {
      setRecordMessage("You tied your best. Break it next run.", false);
    } else {
      const pointsNeeded = game.highScore - game.score + 1;
      const suffix = pointsNeeded === 1 ? "" : "s";
      setRecordMessage(
        `Need ${pointsNeeded} more point${suffix} to break your high score.`,
        false,
      );
    }

    overlayEl.classList.remove("hidden");
    overlayEl.setAttribute("aria-hidden", "false");
  }

  function hideOverlay() {
    overlayEl.classList.add("hidden");
    overlayEl.setAttribute("aria-hidden", "true");
  }

  function isBorder(pos) {
    return (
      pos.r === 0 ||
      pos.r === CONFIG.rows ||
      pos.c === 0 ||
      pos.c === CONFIG.cols
    );
  }

  function isOccupied(pos) {
    return game.snakeSet.has(keyFor(pos));
  }

  function spawnFood() {
    const maxTries = (CONFIG.rows - 1) * (CONFIG.cols - 1);
    for (let i = 0; i < maxTries; i++) {
      const pos = {
        r: randInt(1, CONFIG.rows - 1),
        c: randInt(1, CONFIG.cols - 1),
      };
      if (
        !isOccupied(pos) &&
        !game.foods.some((f) => f.r === pos.r && f.c === pos.c)
      ) {
        return pos;
      }
    }
    return null;
  }

  function resetGame() {
    game.snake = [
      { r: Math.floor(CONFIG.rows / 2), c: Math.floor(CONFIG.cols / 2) },
    ];
    game.snakeSet = new Set([keyFor(game.snake[0])]);
    game.foods = [];
    game.dir = null;
    game.queue = [];
    game.prevSnake = null;
    game.score = 0;
    game.hasBrokenHighScore = false;

    for (let i = 0; i < CONFIG.foods; i++) {
      const food = spawnFood();
      if (food) game.foods.push(food);
    }

    hideOverlay();
    updateHud();
    draw(1);
    start();
  }

  function start() {
    if (game.running) return;
    game.running = true;
    game.lastTime = performance.now();
    game.acc = 0;
    requestAnimationFrame(loop);
  }

  function stop() {
    game.running = false;
  }

  function gameOver() {
    stop();
    refreshHighScore();
    updateHud();
    showOverlay();
  }

  function step() {
    if (game.queue.length > 0) {
      const queued = game.queue.shift();
      if (!isOpposite(queued, game.dir)) {
        game.dir = queued;
      }
    }

    if (!game.dir) return;

    game.prevSnake = game.snake.map((seg) => ({ r: seg.r, c: seg.c }));

    const head = game.snake[0];
    const delta = DIRS[game.dir];
    const next = { r: head.r + delta.r, c: head.c + delta.c };

    if (isBorder(next)) {
      gameOver();
      return;
    }

    const foodIndex = game.foods.findIndex(
      (f) => f.r === next.r && f.c === next.c,
    );
    const willGrow = foodIndex !== -1;
    const tail = game.snake[game.snake.length - 1];

    if (isOccupied(next)) {
      const nextIsTail = next.r === tail.r && next.c === tail.c;
      if (!(nextIsTail && !willGrow)) {
        gameOver();
        return;
      }
    }

    game.snake.unshift(next);
    game.snakeSet.add(keyFor(next));

    if (willGrow) {
      addScore(1);
      const replacement = spawnFood();
      if (replacement) {
        game.foods[foodIndex] = replacement;
      } else {
        game.foods.splice(foodIndex, 1);
      }
    } else {
      const removed = game.snake.pop();
      game.snakeSet.delete(keyFor(removed));
    }
  }

  function drawCell(r, c, color) {
    ctx.fillStyle = color;
    ctx.fillRect(c * CONFIG.cell, r * CONFIG.cell, CONFIG.cell, CONFIG.cell);
  }

  function draw(alpha) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0b1225";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row <= CONFIG.rows; row++) {
      for (let col = 0; col <= CONFIG.cols; col++) {
        if (
          row === 0 ||
          row === CONFIG.rows ||
          col === 0 ||
          col === CONFIG.cols
        ) {
          drawCell(row, col, "#1f2937");
        }
      }
    }

    for (const food of game.foods) {
      drawCell(food.r, food.c, "#d35e34");
    }

    const canLerp =
      game.prevSnake &&
      game.prevSnake.length === game.snake.length &&
      alpha >= 0 &&
      alpha <= 1;

    game.snake.forEach((segment, index) => {
      let r = segment.r;
      let c = segment.c;
      if (canLerp) {
        const prev = game.prevSnake[index];
        r = prev.r + (segment.r - prev.r) * alpha;
        c = prev.c + (segment.c - prev.c) * alpha;
      }
      drawCell(r, c, index === 0 ? "#22eeb8" : "#0ee99c");
    });
  }

  function loop(now) {
    if (!game.running) return;
    const elapsed = now - game.lastTime;
    game.lastTime = now;
    game.acc += elapsed;

    while (game.acc >= CONFIG.tickMs) {
      step();
      game.acc -= CONFIG.tickMs;
      if (!game.running) break;
    }

    const alpha = CONFIG.tickMs > 0 ? Math.min(1, game.acc / CONFIG.tickMs) : 1;
    draw(alpha);
    requestAnimationFrame(loop);
  }

  function handleKey(event) {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    const isArrow = [
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
    ].includes(key);
    if (isArrow || ["w", "a", "s", "d", "q", "r"].includes(key)) {
      event.preventDefault();
    }

    if (key === "q") {
      gameOver();
      return;
    }

    if (key === "r") {
      resetGame();
      return;
    }

    if (key === "w" || key === "arrowup") queueDirection("up");
    if (key === "s" || key === "arrowdown") queueDirection("down");
    if (key === "a" || key === "arrowleft") queueDirection("left");
    if (key === "d" || key === "arrowright") queueDirection("right");
  }

  window.addEventListener("keydown", handleKey, { passive: false });
  restartBtn.addEventListener("click", resetGame);

  resetGame();
})();
