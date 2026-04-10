const fs = require('fs');
const zlib = require('zlib');

const buf = fs.readFileSync('Youth-Offense-Playbook-2-Formations-Calling-a-Play.pdf');
const text = buf.toString('binary');

// Try to decompress flate streams and extract text
const results = [];
let pos = 0;

while (pos < text.length) {
  // Find FlateDecode streams
  const filterPos = text.indexOf('FlateDecode', pos);
  if (filterPos < 0) break;

  const streamStart = text.indexOf('stream\n', filterPos);
  if (streamStart < 0) { pos = filterPos + 10; continue; }

  const streamEnd = text.indexOf('endstream', streamStart);
  if (streamEnd < 0) { pos = filterPos + 10; continue; }

  const compressed = buf.slice(streamStart + 7, streamEnd);

  try {
    const decompressed = zlib.inflateSync(compressed).toString('binary');
    // Extract BT...ET text blocks
    let bpos = 0;
    while (bpos < decompressed.length) {
      const bs = decompressed.indexOf('BT', bpos);
      if (bs < 0) break;
      const be = decompressed.indexOf('ET', bs + 2);
      if (be < 0) break;
      const block = decompressed.slice(bs + 2, be);
      // Find (text) patterns
      let mp = 0;
      while (mp < block.length) {
        const ps = block.indexOf('(', mp);
        if (ps < 0) break;
        const pe = block.indexOf(')', ps + 1);
        if (pe < 0) break;
        const s = block.slice(ps + 1, pe);
        if (/^[\x20-\x7E\s]+$/.test(s) && s.trim().length > 1) {
          results.push(s.trim());
        }
        mp = pe + 1;
      }
      bpos = be + 2;
    }
  } catch(e) {
    // not a valid deflate stream, skip
  }

  pos = streamEnd + 9;
}

console.log(results.join('\n'));
