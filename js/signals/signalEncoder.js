'use strict';

// ── Fixed encoding constants ──────────────────────────────────
const SIG_ROWS  = ['A','B','C','D'];
const SIG_COLS  = [1,2,3,4];

// ── Locked signaling methodology ────────────────────────────────
// Every row has ONE fixed body zone for its entire life -- a coach never
// picks a body zone from a dropdown, it's simply "whatever row this play
// lives in." Finger count is the box's column position (1-4, 4=Fist) and
// repeats identically on every row. Together (row's zone) + (column's
// finger count) is a single, unambiguous, memorized signal: e.g. "touch
// CHEST, hold up 3 fingers" can only ever mean row C, box 3. This replaced
// an earlier design where body zone AND finger count were both editable
// per cell via dropdowns in the assignment modal -- that let two coaches
// (or one coach on a rushed Friday night) assign the same cell two
// different signals, or the same signal to two different cells, which is
// exactly the kind of mistake a live signaling system can't afford.
const ZONE_TO_ROW = { head:'A', shoulder:'B', chest:'C', waist:'D' };
const ROW_TO_ZONE = { A:'head', B:'shoulder', C:'chest', D:'waist' };
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

// Locked-in zone for a row / finger count for a column (no rotation).
// These are the ONLY inputs to a cell's signal -- never user-editable.
function sigDefaultZone(row)    { return ROW_TO_ZONE[row]; }
function sigDefaultFingers(col) { return COL_TO_FINGER[col]; }

// Apply display rotation to a body zone.
// rotation=1 → head now belongs to row B, so row A shows shoulder, etc.
// This is the ONLY thing rotation changes -- it lets a coach shift which
// row means which body part between series/quarters to keep an opposing
// scout from picking up the pattern, without ever touching the fixed
// row->zone / column->finger methodology itself.
function sigRotateZone(zone, rotation) {
  if (!rotation) return zone;
  const idx    = SIG_ROWS.indexOf(ZONE_TO_ROW[zone]);
  const newIdx = (idx + rotation) % 4;
  return ROW_TO_ZONE[SIG_ROWS[newIdx]];
}

// What body zone to show for row r's header given current rotation offset
function sigRowHeader(row, rotation) {
  // Inverse rotation: find which stored zone now maps to this row
  const idx     = SIG_ROWS.indexOf(row);
  const origIdx = ((idx - rotation) % 4 + 4) % 4;
  return ROW_TO_ZONE[SIG_ROWS[origIdx]];
}

// HTML escape helper (used across all signal modules)
function sigEsc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
