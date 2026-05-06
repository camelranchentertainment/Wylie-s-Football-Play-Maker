'use strict';

/**
 * Validate a new/edited signal assignment against the existing set.
 * Returns { valid: bool, errors: string[] }
 *
 * Rules:
 *  1. Two non-dummy cells cannot share the same body zone + finger combo.
 *  2. A play cannot occupy more than one cell in the same series rotation
 *     (series 0 = "All" conflicts with every specific quarter).
 */
function sigValidate(assignments, candidate, excludeId = null) {
  const errors = [];
  const others = assignments.filter(a => a.id !== excludeId);

  if (!candidate.is_dummy) {
    // Rule 1: unique signal among non-dummy cells
    const signalConflict = others.find(a =>
      !a.is_dummy &&
      a.signal_body_zone === candidate.signal_body_zone &&
      a.signal_fingers   === Number(candidate.signal_fingers)
    );
    if (signalConflict) {
      const cid = sigCellId(signalConflict.wristband_row, signalConflict.wristband_col);
      errors.push(
        `Signal ${SIG_ZONE_LABELS[candidate.signal_body_zone]} + ` +
        `${candidate.signal_fingers} finger(s) is already used by cell ${cid}.`
      );
    }

    // Rule 2: same play, overlapping series
    if (candidate.play_id) {
      const playConflict = others.find(a =>
        !a.is_dummy &&
        String(a.play_id) === String(candidate.play_id) &&
        (
          a.series_rotation === 0 ||
          candidate.series_rotation === 0 ||
          a.series_rotation === Number(candidate.series_rotation)
        )
      );
      if (playConflict) {
        const cid = sigCellId(playConflict.wristband_row, playConflict.wristband_col);
        errors.push(`This play is already assigned to cell ${cid} for the same series.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
