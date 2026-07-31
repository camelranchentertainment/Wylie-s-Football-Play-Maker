'use strict';

// ── Fixed encoding constants ──────────────────────────────────
const SIG_ROWS  = ['A','B','C','D'];
const SIG_COLS  = [1,2,3,4];

const ZONE_TO_COL = { head:1, shoulder:2, chest:3, waist:4 };
const COL_TO_ZONE = { 1:'head', 2:'shoulder', 3:'chest', 4:'waist' };
// Finger count is the box's column position, 1-4, and repeats identically
// on every row (Box 1 = 1 finger, Box 2 = 2 fingers, ... on rows A, B, C,
// and D alike) -- it used to be fixed per-row instead (A=1f, B=2f, ...),
// which meant every cell in a row defaulted to the same finger count
// regardless of which box a coach tapped.
const COL_TO_FINGER = { 1:1, 2:2, 3:3, 4:4 };

const SIG_ZONE_LABELS = { head:'Head', shoulder:'Shoulder', chest:'Chest', waist:'Waist' };
const SIG_ZONE_ABBR   = { head:'HD',  shoulder:'SH',        chest:'CH',   waist:'WA'  };

const SIG_COLORS = {
  green: { label:'Base / Pro Set',    hex:'#22c55e', bg:'rgba(34,197,94,.13)'   },
  blue:  { label:'Shotgun / Spread',  hex:'#4a9eff', bg:'rgba(74,158,255,.13)'  },
  red:   { label:'Goal Line / Power', hex:'#e63946', bg:'rgba(230,57,70,.13)'   },
  gold:  { label:'Trick / Special',   hex:'#f0a500', bg:'rgba(240,165,0,.13)'   },
};

// Unique cell identifier e.g. 'B3'
function sigCellId(row, col) { return row + col; }

// Default zone / finger count for a column position (no rotation)
function sigDefaultZone(col)    { return COL_TO_ZONE[col]; }
function sigDefaultFingers(col) { return COL_TO_FINGER[col]; }

// Apply display rotation to a body zone.
// rotation=1 → head now maps to col 2, so col 1 header shows shoulder, etc.
function sigRotateZone(zone, rotation) {
  if (!rotation) return zone;
  const col    = ZONE_TO_COL[zone];
  const newCol = ((col - 1 + rotation) % 4) + 1;
  return COL_TO_ZONE[newCol];
}

// What body zone label to show for column c given current rotation offset
function sigColHeader(col, rotation) {
  // Inverse rotation: find which stored zone now maps to this column
  const origCol = ((col - 1 - rotation + 4) % 4) + 1;
  return COL_TO_ZONE[origCol];
}

// HTML escape helper (used across all signal modules)
function sigEsc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
