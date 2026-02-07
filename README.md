# Snake Game

A classic Snake game implementation with both C (terminal-based) and JavaScript (web-based) versions.

## Overview

This project contains two implementations of the popular Snake game:

- **C Version** (`snakeGame.c`): Terminal-based game for Linux/macOS
- **Web Version** (`index.html`, `script.js`, `style.css`): Modern browser-based game with smooth animations

## Features

### Web Version

- 🎮 Smooth gameplay with interpolated animations
- 📊 Score tracking with persistent high score (localStorage)
- ⌨️ WASD and arrow key support
- 🎨 Dark theme with cyan and emerald colors
- 📱 Responsive design
- ⚡ Configurable game speed and grid size
- 🔄 Game state management with restart functionality

### C Version

- Terminal-based snake game (for linux mainly)
- Real-time keyboard input
- Collision detection (borders and self)
- Multiple food spawning
- Score tracking

## How to Play

### Web Version

1. Open `index.html` in a web browser
2. Use **W/A/S/D** or **Arrow Keys** to control the snake
3. **Q** to quit the game
4. **R** to restart
5. Eat the food (red squares) to grow and gain points
6. Avoid hitting the borders and yourself!

### C Version

1. Compile and run on Linux/macOS:
   ```bash
   gcc snakeGame.c -o snakeGame
   ./snakeGame
   ```
2. Use **W/A/S/D** to move
3. **Q** to quit
4. Avoid borders and self-collision

## Configuration

Web version settings can be adjusted in `script.js`:

```javascript
const CONFIG = {
  rows: 18, // Game grid height
  cols: 30, // Game grid width
  foods: 5, // Number of foods
  cell: 20, // Pixel size per cell
  tickMs: 150, // Game speed (ms per tick)
  inputBuffer: 3, // Input queue length
};
```

## Technical Details

- **Canvas Rendering**: HTML5 Canvas with interpolated animation
- **Game Loop**: RequestAnimationFrame with fixed timestep
- **Data Structures**: Set-based collision detection for O(1) lookup
- **Input Handling**: Direction queuing to prevent immediate reversal

## License

Feel free to use and modify for your own projects!
