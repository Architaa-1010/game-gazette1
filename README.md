# The Game Gazette 🎮

A brutalist newspaper-themed browser arcade featuring two classic strategy games — **Connect Four** and **Gomoku** — built with vanilla HTML, CSS, and JavaScript. Zero dependencies. Zero build step.

---

## Live Demo

🔗 **[Architaa-1010.github.io/game-gazette]

![Demo](demo.gif)


---

## Games

### Connect Four
Drop coloured discs into a 7-column grid. Gravity fills from the bottom up. First player to connect four in a row — horizontally, vertically, or diagonally — wins.

### Gomoku
An ancient Japanese strategy game on a 15×15 grid. Players alternate placing stones on intersections. First to align exactly five in a row (any direction) wins.

Both games feature:
- Persistent scoreboard across rematches
- Live move log with chess-style notation
- Win highlighting / line animation
- Hover preview before placing

---

## Project Structure

```
game-gazette/
├── index.html          # Markup + shared UI controller
├── styles/
│   └── main.css        # All styles — brutalist newspaper aesthetic
├── js/
│   ├── connect-four.js # Connect Four logic + DOM rendering
│   └── gomoku.js       # Gomoku logic + Canvas rendering
└── README.md
```

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | HTML5 |
| Styling | CSS3 (Flexbox, Grid, CSS Variables, Animations) |
| Programming Language | JavaScript (ES6+) |
| Graphics | HTML5 Canvas API (Gomoku) |
| Typography | Google Fonts (Playfair Display, Bebas Neue, Courier Prime) |
| Version Control | Git & GitHub |
| Deployment | GitHub Pages |

---

## Design

The visual language is inspired by **vintage sports broadsheets** — Playfair Display for editorial headlines, Bebas Neue for section tags, Courier Prime for body copy and the move log. Ink-black rules, warm paper tones, and zero gradients.

Intentionally no frameworks, no AI-generated palettes, no generic UI kits.

---

## Run Locally

```bash
git clone https://github.com/yourusername/game-gazette.git
cd game-gazette
# Open index.html in any browser — no server needed
open index.html
```

---

## Deploy to GitHub Pages

1. Push to a GitHub repo
2. Go to **Settings → Pages**
3. Source: `main` branch, `/root`
4. Your site is live in ~60 seconds

---

## Tech Stack

| Layer      | Choice                        |
|------------|-------------------------------|
| Markup     | Semantic HTML5                |
| Styles     | Vanilla CSS (custom properties, grid, animations) |
| Logic      | Vanilla JavaScript (ES6+)     |
| Canvas     | HTML5 Canvas API (Gomoku board) |
| Fonts      | Google Fonts (Playfair Display, Bebas Neue, Courier Prime) |
| Build      | None                          |
| Dependencies | None                        |

---

## How the Game Logic Works

### Connect Four
- Board modelled as a `6 × 7` 2D array
- Gravity: scan the column bottom-up for the first empty row
- Win check: walk outward in all 4 directions from the last placed piece, count consecutive same-colour cells

### Gomoku
- Board modelled as a `15 × 15` 2D array
- Drawn entirely on `<canvas>` — grid lines, star points, coordinate labels, stones with highlights
- Win check: same directional walk as Connect Four, threshold is 5
- Hover preview drawn at 38% opacity before committing a move

---

## Commit History Pattern

```
feat: initial project structure
feat: connect four board render + drop logic
feat: connect four win detection + flash animation
feat: gomoku canvas board + stone rendering
feat: gomoku win detection + line draw
feat: shared scoreboard + move log
feat: result modal with rematch flow
fix: prevent clicks after game over
style: hover arrow colour tracks active player
docs: README with setup + deploy instructions
```

---

## License

MIT — use it, remix it, ship it.

---

## Author

Architaa A