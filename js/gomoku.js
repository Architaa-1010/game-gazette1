/* ============================================================
   gomoku.js
   Handles all Gomoku game logic and Canvas rendering.

   Board model: 2D array [row][col], 0 = empty, 1 = Black, 2 = White
   The board is drawn on an HTML5 <canvas> element.
   Intersections (not squares) are the play positions.

   Board size: 15 × 15  (225 intersections)
   Win condition: exactly 5 in a row in any direction

   Coordinate labels:
     Columns → A–O  (left to right)
     Rows    → 1–15 (top to bottom)

   Public API (called from index.html):
     initGM()   — reset and start a new game
   ============================================================ */


/* ─── Board & canvas constants ─── */
const GM_SIZE  = 15;        // intersections per side
const GM_CELL  = 34;        // pixels between intersections
const GM_PAD   = 24;        // padding around the grid on the canvas
const GM_PX    = GM_PAD * 2 + (GM_SIZE - 1) * GM_CELL; // total canvas size

// Column labels A–O
const GM_COL_LABELS = 'ABCDEFGHIJKLMNO';

// The three "star point" positions (handicap dots) on each axis
const GM_STAR_POINTS = [3, 7, 11];


/* ─── Game state ─── */
let gmBoard   = [];     // 2D array — 0 empty, 1 black, 2 white
let gmTurn    = 1;      // 1 = Black, 2 = White
let gmOver    = false;
let gmCtx     = null;   // canvas 2D rendering context
let gmHover   = null;   // {row, col} of the intersection under the cursor


/* ============================================================
   INIT — reset state, wire up canvas events, draw empty board
   ============================================================ */
function initGM() {
  gmBoard = Array.from({ length: GM_SIZE }, () => Array(GM_SIZE).fill(0));
  gmTurn  = 1;
  gmOver  = false;
  gmHover = null;

  // Clear move log
  document.getElementById('move-log').innerHTML = '— match begins —';
  moveLogLines = []; // shared var from index.html

  // Set up canvas
  const canvas   = document.getElementById('gm-canvas');
  canvas.width   = GM_PX;
  canvas.height  = GM_PX;
  gmCtx          = canvas.getContext('2d');

  // Remove old listeners by replacing the element with a clone
  // (simplest way to avoid stacking duplicate listeners on re-init)
  const fresh = canvas.cloneNode(true);
  canvas.parentNode.replaceChild(fresh, canvas);

  fresh.addEventListener('click',      gmHandleClick);
  fresh.addEventListener('mousemove',  gmHandleHover);
  fresh.addEventListener('mouseleave', gmHandleLeave);

  // Re-grab context after clone
  gmCtx = fresh.getContext('2d');

  drawGMBoard();
  setTurn('<span style="font-weight:700">⬤ BLACK</span> — place your stone');
}


/* ============================================================
   EVENT HANDLERS
   ============================================================ */

function gmHandleClick(e) {
  if (gmOver) return;

  const pos = gmScreenToIntersection(e);
  if (!pos) return;                         // click was off-grid
  if (gmBoard[pos.row][pos.col] !== 0) return; // intersection already taken

  // Place the stone
  gmBoard[pos.row][pos.col] = gmTurn;
  gmHover = null;

  // Log the move using chess-style notation (e.g. "BLACK → G8")
  log(
    `<span class="${gmTurn === 1 ? 'c4' : 'gm'}">${gmTurn === 1 ? 'BLACK' : 'WHITE'}</span>` +
    ` → ${GM_COL_LABELS[pos.col]}${pos.row + 1}`
  );

  // Check win before redrawing so we can pass lastRow/lastCol for the marker
  const winLine = gmCheckWin(pos.row, pos.col);
  drawGMBoard(pos.row, pos.col); // redraw with "last move" marker

  if (winLine) {
    gmOver = true;
    gmDrawWinLine(winLine);

    const blackWon = gmTurn === 1;
    scores[blackWon ? 'p1' : 'p2']++;
    updateScores();

    setTimeout(() => {
      showModal(
        `<span>${blackWon ? 'Black' : 'White'}<br>Wins!</span>`,
        'Five in a row — the board is conquered.'
      );
    }, 500);
    return;
  }

  // Draw — all 225 intersections filled
  if (gmBoard.every(row => row.every(v => v !== 0))) {
    gmOver = true;
    scores.d++;
    updateScores();
    setTimeout(() => showModal("It's a<br><em>Draw.</em>", 'All 225 intersections filled. No winner.'), 300);
    return;
  }

  // Switch turns
  gmTurn = gmTurn === 1 ? 2 : 1;
  setTurn(
    `<span style="font-weight:700">${gmTurn === 1 ? '⬤ BLACK' : '○ WHITE'}</span> — place your stone`
  );
}

function gmHandleHover(e) {
  if (gmOver) return;

  const pos = gmScreenToIntersection(e);

  // Only show preview if hovering an empty intersection
  if (pos && gmBoard[pos.row][pos.col] === 0) {
    gmHover = pos;
  } else {
    gmHover = null;
  }

  drawGMBoard(); // redraw to update the ghost preview
}

function gmHandleLeave() {
  gmHover = null;
  drawGMBoard();
}


/* ============================================================
   COORDINATE HELPER
   Convert mouse event → nearest grid intersection {row, col}
   Returns null if the nearest intersection is off the board.
   ============================================================ */
function gmScreenToIntersection(e) {
  const canvas = document.getElementById('gm-canvas');
  const rect   = canvas.getBoundingClientRect();

  // Account for CSS scaling (canvas resolution vs displayed size)
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (e.clientX - rect.left)  * scaleX;
  const y = (e.clientY - rect.top)   * scaleY;

  // Snap to nearest intersection
  const col = Math.round((x - GM_PAD) / GM_CELL);
  const row = Math.round((y - GM_PAD) / GM_CELL);

  if (col < 0 || col >= GM_SIZE || row < 0 || row >= GM_SIZE) return null;
  return { row, col };
}


/* ============================================================
   WIN CHECK
   Checks all 4 axes through the last-placed stone.
   Returns array of {row, col} for the winning 5 cells, or null.
   ============================================================ */
function gmCheckWin(row, col) {
  const directions = [
    [0,  1],  // horizontal
    [1,  0],  // vertical
    [1,  1],  // diagonal ↘
    [1, -1],  // diagonal ↗
  ];

  const player = gmBoard[row][col];

  for (const [dr, dc] of directions) {
    const line = [{ row, col }];

    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;

      while (
        r >= 0 && r < GM_SIZE &&
        c >= 0 && c < GM_SIZE &&
        gmBoard[r][c] === player
      ) {
        line.push({ row: r, col: c });
        r += dr * sign;
        c += dc * sign;
      }
    }

    if (line.length >= 5) return line;
  }

  return null;
}


/* ============================================================
   CANVAS DRAWING
   ============================================================ */

/**
 * Full board redraw.
 * @param {number} [lastRow] - row of the most recently placed stone (for marker)
 * @param {number} [lastCol] - col of the most recently placed stone (for marker)
 */
function drawGMBoard(lastRow, lastCol) {
  const ctx = gmCtx;
  ctx.clearRect(0, 0, GM_PX, GM_PX);

  gmDrawBackground(ctx);
  gmDrawGrid(ctx);
  gmDrawStarPoints(ctx);
  gmDrawCoordLabels(ctx);
  gmDrawAllStones(ctx, lastRow, lastCol);
  gmDrawHoverPreview(ctx);
}

/** Warm paper-coloured background with faint ruled lines */
function gmDrawBackground(ctx) {
  ctx.fillStyle = '#d4c9b0';
  ctx.fillRect(0, 0, GM_PX, GM_PX);

  // Subtle horizontal texture
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth   = 0.4;
  for (let y = 0; y < GM_PX; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(GM_PX, y);
    ctx.stroke();
  }
}

/** Draw the 15×15 grid lines and a heavier border */
function gmDrawGrid(ctx) {
  ctx.strokeStyle = '#0a0a08';
  ctx.lineWidth   = 0.8;

  for (let i = 0; i < GM_SIZE; i++) {
    const x = GM_PAD + i * GM_CELL;
    const y = GM_PAD + i * GM_CELL;
    const end = GM_PAD + (GM_SIZE - 1) * GM_CELL;

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(x, GM_PAD);
    ctx.lineTo(x, end);
    ctx.stroke();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(GM_PAD, y);
    ctx.lineTo(end, y);
    ctx.stroke();
  }

  // Heavier outer border (double-rule effect)
  ctx.lineWidth = 2;
  ctx.strokeRect(
    GM_PAD, GM_PAD,
    (GM_SIZE - 1) * GM_CELL,
    (GM_SIZE - 1) * GM_CELL
  );
}

/** Draw the 9 traditional star-point dots */
function gmDrawStarPoints(ctx) {
  ctx.fillStyle = '#0a0a08';

  for (const r of GM_STAR_POINTS) {
    for (const c of GM_STAR_POINTS) {
      ctx.beginPath();
      ctx.arc(GM_PAD + c * GM_CELL, GM_PAD + r * GM_CELL, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Draw A–O column labels and 1–15 row labels */
function gmDrawCoordLabels(ctx) {
  ctx.font          = `bold 9px 'Courier Prime', monospace`;
  ctx.fillStyle     = 'rgba(0,0,0,0.4)';
  ctx.textAlign     = 'center';
  ctx.textBaseline  = 'middle';

  for (let i = 0; i < GM_SIZE; i++) {
    const x = GM_PAD + i * GM_CELL;
    const y = GM_PAD + i * GM_CELL;

    ctx.fillText(GM_COL_LABELS[i], x, GM_PAD - 13); // column letter (top)
    ctx.fillText(i + 1, GM_PAD - 14, y);             // row number   (left)
  }
}

/** Draw every placed stone on the board */
function gmDrawAllStones(ctx, lastRow, lastCol) {
  for (let row = 0; row < GM_SIZE; row++) {
    for (let col = 0; col < GM_SIZE; col++) {
      if (gmBoard[row][col] !== 0) {
        const isLast = (row === lastRow && col === lastCol);
        gmDrawStone(ctx, row, col, gmBoard[row][col], isLast);
      }
    }
  }
}

/** Draw a ghost preview stone at the hovered intersection */
function gmDrawHoverPreview(ctx) {
  if (!gmHover || gmOver) return;

  ctx.globalAlpha = 0.38;
  gmDrawStone(ctx, gmHover.row, gmHover.col, gmTurn, false);
  ctx.globalAlpha = 1;
}

/**
 * Draw a single stone at the given intersection.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} row
 * @param {number} col
 * @param {number} player  1 = black, 2 = white
 * @param {boolean} isLast — draw a red centre dot to mark the last move
 */
function gmDrawStone(ctx, row, col, player, isLast = false) {
  const x   = GM_PAD + col * GM_CELL;
  const y   = GM_PAD + row * GM_CELL;
  const rad = GM_CELL * 0.41;

  if (player === 1) {
    // ── Black stone ──
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a08';
    ctx.fill();

    // Subtle highlight to give a 3-D feel
    ctx.beginPath();
    ctx.arc(x - rad * 0.28, y - rad * 0.28, rad * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();

  } else {
    // ── White stone ──
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fillStyle = '#f5f0e6';
    ctx.fill();

    // Thin border
    ctx.strokeStyle = '#333';
    ctx.lineWidth   = 1;
    ctx.stroke();

    // Highlight
    ctx.beginPath();
    ctx.arc(x - rad * 0.25, y - rad * 0.25, rad * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
  }

  // ── Last-move marker (small red dot in the centre) ──
  if (isLast) {
    ctx.beginPath();
    ctx.arc(x, y, rad * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = '#c0392b';
    ctx.fill();
  }
}

/**
 * Draw a red line through the five winning stones.
 * Called once after a win is confirmed.
 */
function gmDrawWinLine(winLine) {
  const ctx = gmCtx;

  // Sort cells so we draw the line from one end to the other
  const sorted = [...winLine].sort((a, b) => a.col - b.col || a.row - b.row);

  const startX = GM_PAD + sorted[0].col * GM_CELL;
  const startY = GM_PAD + sorted[0].row * GM_CELL;
  const endX   = GM_PAD + sorted[sorted.length - 1].col * GM_CELL;
  const endY   = GM_PAD + sorted[sorted.length - 1].row * GM_CELL;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth   = 4;
  ctx.lineCap     = 'round';
  ctx.stroke();
}
