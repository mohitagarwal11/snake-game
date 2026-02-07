"use strict";

// for starting the game instantly i am using a immediate Invoked arrow fn here
// this should make everything private and not accesible globally for custom changes
// encapsulation basically
(() => {
  // Stores the game config here which can be changed directly
  const CONFIG = {
    rows: 18,
    cols: 30,
    foods: 5,
    cell: 20,
    tickMs: 150,
    inputBuffer: 3,
  };
  // using a html5 canvas api inplace of grid structure (like in c) to get the background and draw
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const overlayEl = document.getElementById("overlay");
  const finalScoreEl = document.getElementById("finalScore");
  const restartBtn = document.getElementById("restartBtn");

  const totalRows = CONFIG.rows + 1;
  const totalCols = CONFIG.cols + 1;
  canvas.width = totalCols * CONFIG.cell;
  canvas.height = totalRows * CONFIG.cell;

  // this is a map that stores the direction vector for the snake movement
  const DIRS = {
    up: { r: -1, c: 0 },
    down: { r: 1, c: 0 },
    left: { r: 0, c: -1 },
    right: { r: 0, c: 1 },
  };
  // game state obj to initialise the game state on start or restart
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
  };

  function keyFor(pos) {
    return `${pos.r},${pos.c}`;
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  // Prevents opposite direction changes (up/down, left/right)
  function isOpposite(next, current) {
    if (!current) return false;
    return (
      (next === "up" && current === "down") ||
      (next === "down" && current === "up") ||
      (next === "left" && current === "right") ||
      (next === "right" && current === "left")
    );
  }
  // Uses a queue to buffer direction inputs for smooth movement
  // Simplifies body segment animation as well
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
    const score = Math.max(0, game.snake.length - 1);
    scoreEl.textContent = score.toString();
    finalScoreEl.textContent = score.toString();
  }
  // Checks if a position is on the border
  function isBorder(pos) {
    return (
      pos.r === 0 ||
      pos.r === CONFIG.rows ||
      pos.c === 0 ||
      pos.c === CONFIG.cols
    );
  }
  // Checks if a position is occupied by the snake body
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
    for (let i = 0; i < CONFIG.foods; i++) {
      const food = spawnFood();
      if (food) game.foods.push(food);
    }
    overlayEl.classList.add("hidden");
    overlayEl.setAttribute("aria-hidden", "true");
    updateHud();
    draw(1);
    start();
  }
  // starts the game initially and calls for animation frames
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
    overlayEl.classList.remove("hidden");
    overlayEl.setAttribute("aria-hidden", "false");
  }
  // Handles snake movement and logic: manages stepping, collision checks, and growth
  // Core game logic for the snake's behavior
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

    updateHud();
  }
  // Helper function to draw a single cell on the canvas
  function drawCell(r, c, color) {
    ctx.fillStyle = color;
    ctx.fillRect(c * CONFIG.cell, r * CONFIG.cell, CONFIG.cell, CONFIG.cell);
  }
  // Renders the current game state: background, borders, food, and snake
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
  // Main game loop that manages timing and frame updates
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
  // Handles keyboard input for snake direction and game controls
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
