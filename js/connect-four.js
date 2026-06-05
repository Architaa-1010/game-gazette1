/* ============================================================
   connect-four.js
   Handles all Connect Four game logic and DOM rendering.

   Board model: 2D array [row][col], 0 = empty, 1 = P1, 2 = P2
   Origin is top-left. Pieces fall to the highest empty row
   in a column (gravity = last empty row from bottom).

   Public API (called from index.html):
     initC4()   — reset and start a new game
   ============================================================ */


/* ─── Constants ─── */
const C4_ROWS = 6;
const C4_COLS = 7;

// Column letter labels for the move log
const C4_COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];


/* ─── Game state ─── */
let c4Board = [];   // 2D array representing the grid
let c4Turn  = 1;    // 1 = Red, 2 = Blue
let c4Over  = false;


/* ============================================================
   INIT — reset state and rebuild the DOM board
   ============================================================ */
function initC4() {
  // Build a fresh empty board
  c4Board = Array.from({ length: C4_ROWS }, () => Array(C4_COLS).fill(0));
  c4Turn  = 1;
  c4Over  = false;

  // Clear move log
  document.getElementById('move-log').innerHTML = '— match begins —';
  moveLogLines = []; // shared var from index.html

  buildC4DOM();
  setTurn('<span style="color:var(--red);font-weight:700">● RED</span> — drop your disc');
}


/* ============================================================
   DOM — build the hover-arrow row and the cell grid
   ============================================================ */
function buildC4DOM() {
  const arrowRow = document.getElementById('c4-arrows');
  const boardEl  = document.getElementById('c4-board');

  arrowRow.innerHTML = '';
  boardEl.innerHTML  = '';

  // ── Hover arrows (one per column) ──
  for (let col = 0; col < C4_COLS; col++) {
    const arrow = document.createElement('div');
    arrow.className    = 'c4-hover-cell';
    arrow.dataset.col  = col;
    arrow.innerHTML    = '▼';
    arrow.style.color  = c4Turn === 1 ? 'var(--red)' : 'var(--blue)';

    // Clicking an arrow drops into that column
    arrow.addEventListener('click', () => c4Drop(col));
    arrowRow.appendChild(arrow);
  }

  // ── Cell grid (row by row, top to bottom) ──
  for (let row = 0; row < C4_ROWS; row++) {
    for (let col = 0; col < C4_COLS; col++) {
      const cell = document.createElement('div');

      // Assign filled class if the board already has a piece here
      // (used after a reset when re-rendering mid-game — not typical,
      //  but keeps buildC4DOM() safe to call at any time)
      const val = c4Board[row][col];
      cell.className = 'c4-cell' + (val === 1 ? ' p1' : val === 2 ? ' p2' : '');

      // Store position for the click handler
      cell.dataset.row = row;
      cell.dataset.col = col;

      // Clicking a cell drops into that column (same as clicking arrow)
      cell.addEventListener('click', () => c4Drop(parseInt(cell.dataset.col)));
      boardEl.appendChild(cell);
    }
  }
}


/* ============================================================
   DROP — handle a player placing a disc in a column
   ============================================================ */
function c4Drop(col) {
  if (c4Over) return; // game already finished

  // Find the lowest empty row in this column (gravity)
  const row = c4FindRow(col);
  if (row === -1) return; // column is full

  // Update the board model
  c4Board[row][col] = c4Turn;

  // Update the DOM cell
  const cells   = document.getElementById('c4-board').children;
  const cellIdx = row * C4_COLS + col;
  const cell    = cells[cellIdx];

  cell.className = `c4-cell ${c4Turn === 1 ? 'p1' : 'p2'} drop`;

  // Log the move
  log(
    `<span class="${c4Turn === 1 ? 'c4' : 'gm'}">${c4Turn === 1 ? 'RED' : 'BLUE'}</span>` +
    ` → col ${C4_COL_LABELS[col]}`
  );

  // Check for a win
  const winningCells = c4CheckWin(row, col);
  if (winningCells) {
    c4Over = true;
    c4HighlightWin(winningCells);

    const redWon = c4Turn === 1;
    scores[redWon ? 'p1' : 'p2']++; // shared scores from index.html
    updateScores();

    setTimeout(() => {
      showModal(
        `<span style="color:var(--${redWon ? 'red' : 'blue'})">${redWon ? 'Red' : 'Blue'}<br>Wins!</span>`,
        `${redWon ? 'Red' : 'Blue'} player connected four — match decided.`
      );
    }, 600);
    return;
  }

  // Check for a draw (top row fully occupied)
  if (c4Board[0].every(v => v !== 0)) {
    c4Over = true;
    scores.d++;
    updateScores();
    setTimeout(() => showModal("It's a<br><em>Draw.</em>", 'Board full. No winner this round.'), 300);
    return;
  }

  // Switch turns
  c4Turn = c4Turn === 1 ? 2 : 1;

  // Update turn indicator
  setTurn(
    `<span style="color:var(--${c4Turn === 1 ? 'red' : 'blue'});font-weight:700">` +
    `● ${c4Turn === 1 ? 'RED' : 'BLUE'}</span> — drop your disc`
  );

  // Update arrow colours to match the new active player
  document.querySelectorAll('.c4-hover-cell').forEach(arrow => {
    arrow.style.color = c4Turn === 1 ? 'var(--red)' : 'var(--blue)';
  });
}


/* ============================================================
   HELPERS
   ============================================================ */

/**
 * Find the lowest empty row in a column (gravity).
 * Returns -1 if the column is full.
 */
function c4FindRow(col) {
  for (let row = C4_ROWS - 1; row >= 0; row--) {
    if (c4Board[row][col] === 0) return row;
  }
  return -1;
}


/**
 * Check whether the last move created a winning line of 4.
 *
 * Checks all 4 directions from the placed piece:
 *   horizontal  [0, 1]
 *   vertical    [1, 0]
 *   diagonal ↘  [1, 1]
 *   diagonal ↗  [1,-1]
 *
 * Returns an array of {row, col} objects for the winning cells,
 * or null if no win.
 */
function c4CheckWin(row, col) {
  const directions = [
    [0,  1],  // horizontal
    [1,  0],  // vertical
    [1,  1],  // diagonal ↘
    [1, -1],  // diagonal ↗
  ];

  const player = c4Board[row][col];

  for (const [dr, dc] of directions) {
    // Start with the placed cell
    const line = [{ row, col }];

    // Walk in both directions along this axis
    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;

      while (
        r >= 0 && r < C4_ROWS &&
        c >= 0 && c < C4_COLS &&
        c4Board[r][c] === player
      ) {
        line.push({ row: r, col: c });
        r += dr * sign;
        c += dc * sign;
      }
    }

    if (line.length >= 4) return line;
  }

  return null;
}


/**
 * Add the win-flash animation class to each winning cell.
 */
function c4HighlightWin(winningCells) {
  const cells = document.getElementById('c4-board').children;

  winningCells.forEach(({ row, col }) => {
    const idx = row * C4_COLS + col;
    cells[idx].classList.add('win-flash');
  });
}
