/**
 * play-library.js — General Play Template Library
 * Plays are defined in yard coordinates; converted to canvas pixels on load.
 * Canvas constants must match app.html: CW=700, CH=570, LOS=300, CX=350, HPY=CW/53.33, VPY=19
 */
(function () {
  const H = 700 / 53.33; // ~13.125 px per horizontal yard
  const V = 19;           // px per vertical yard
  const CX = 350;         // canvas center x
  const LOS = 300;        // line of scrimmage y

  function px(xYd, yYd) {
    return { x: Math.round(CX + xYd * H), y: Math.round(LOS + yYd * V) };
  }

  function buildPlay(def) {
    // Assign sequential IDs; keep a map so routes can reference them
    const players = def.players.map((d, i) => {
      const pos = px(d.x, d.y);
      return {
        id: def.id * 1000 + i,
        pos: d.pos,
        lbl: d.lbl || d.pos,
        x: pos.x,
        y: pos.y,
        side: d.side || 'offense'
      };
    });

    const routes = (def.routes || []).map((r, i) => ({
      id: def.id * 1000 + 500 + i,
      pid: players[r.pi].id,
      waypoints: r.wpts.map(w => px(w[0], w[1])),
      style: r.style || 'solid',
      color: r.color || '#ffcc00',
      assign: r.assign || 'rush'
    }));

    return {
      id: def.id,
      name: def.name,
      formation: def.formation,
      type: def.type,
      mode: def.mode || 'offense',
      description: def.desc || '',
      players,
      routes,
      labels: [],
      thumb: null,
      ts: 0
    };
  }

  /* ─────────────────────────────────────────────────────────────────────
     RAW PLAY DEFINITIONS  (all coordinates in yards from LOS center)
     Positive y  = behind LOS (toward own end zone)
     Negative y  = upfield (toward opponent end zone)
     Positive x  = right hash; negative x = left hash
  ───────────────────────────────────────────────────────────────────── */
  const RAW = [

    /* ═══════════════════════  PASS PLAYS  ═══════════════════════════ */

    {
      id: 1, name: 'Curl-Flat', formation: 'I-Formation', type: 'Pass',
      desc: 'West Coast classic. FL curls at 8 yds; SE runs flat; HB check-down.',
      players: [
        { pos: 'LT', lbl: 'LT', x: -4,   y: 0 },   // 0
        { pos: 'LG', lbl: 'LG', x: -2,   y: 0 },   // 1
        { pos: 'C',  lbl: 'C',  x:  0,   y: 0 },   // 2
        { pos: 'RG', lbl: 'RG', x:  2,   y: 0 },   // 3
        { pos: 'RT', lbl: 'RT', x:  4,   y: 0 },   // 4
        { pos: 'TE', lbl: 'TE', x:  6.5, y: 0 },   // 5
        { pos: 'WR', lbl: 'FL', x: -18,  y: 0 },   // 6
        { pos: 'WR', lbl: 'SE', x:  18,  y: 0 },   // 7
        { pos: 'QB', lbl: 'QB', x:  0,   y: 1.5 }, // 8
        { pos: 'FB', lbl: 'FB', x:  0,   y: 4 },   // 9
        { pos: 'RB', lbl: 'HB', x:  0,   y: 7 }    // 10
      ],
      routes: [
        { pi: 6,  wpts: [[-18,0],[-18,-8],[-15,-6]],      style: 'solid',  color: '#ffcc00' }, // FL curl
        { pi: 7,  wpts: [[18,0],[13,-3]],                  style: 'solid',  color: '#ffcc00' }, // SE flat
        { pi: 5,  wpts: [[6.5,0],[6.5,-5],[11,-5]],        style: 'solid',  color: '#ff9966' }, // TE out
        { pi: 10, wpts: [[0,7],[-8,-1]],                   style: 'dashed', color: '#ffcc00' }  // HB check-down
      ]
    },

    {
      id: 2, name: 'Four Verticals', formation: 'Shotgun', type: 'Pass',
      desc: 'Stress every level of the secondary. Four receivers streak vertical; RB check-down.',
      players: [
        { pos: 'LT', lbl: 'LT', x: -4,   y: 0 },  // 0
        { pos: 'LG', lbl: 'LG', x: -2,   y: 0 },  // 1
        { pos: 'C',  lbl: 'C',  x:  0,   y: 0 },  // 2
        { pos: 'RG', lbl: 'RG', x:  2,   y: 0 },  // 3
        { pos: 'RT', lbl: 'RT', x:  4,   y: 0 },  // 4
        { pos: 'TE', lbl: 'TE', x:  6.5, y: 0 },  // 5
        { pos: 'WR', lbl: 'X',  x: -16,  y: 0 },  // 6
        { pos: 'WR', lbl: 'Z',  x:  18,  y: 0 },  // 7
        { pos: 'WR', lbl: 'SL', x: -8,   y: 0 },  // 8  slot
        { pos: 'QB', lbl: 'QB', x:  0,   y: 7 },  // 9
        { pos: 'RB', lbl: 'RB', x: -3,   y: 7 }   // 10
      ],
      routes: [
        { pi: 6,  wpts: [[-16,0],[-16,-15]],               style: 'solid',  color: '#ffcc00' }, // X go
        { pi: 7,  wpts: [[18,0],[18,-15]],                  style: 'solid',  color: '#ffcc00' }, // Z go
        { pi: 8,  wpts: [[-8,0],[-8,-12],[-4,-15]],        style: 'solid',  color: '#ffcc00' }, // SL skinny post
        { pi: 5,  wpts: [[6.5,0],[6.5,-14]],               style: 'solid',  color: '#ff9966' }, // TE seam
        { pi: 10, wpts: [[-3,7],[6,-2]],                    style: 'dashed', color: '#ffcc00' }  // RB check-down
      ]
    },

    {
      id: 3, name: 'Mesh', formation: 'Shotgun', type: 'Pass',
      desc: 'Air Raid staple. Two receivers cross at 4 yds creating natural picks; outside receivers clear deep.',
      players: [
        { pos: 'LT', lbl: 'LT', x: -4,   y: 0 },  // 0
        { pos: 'LG', lbl: 'LG', x: -2,   y: 0 },  // 1
        { pos: 'C',  lbl: 'C',  x:  0,   y: 0 },  // 2
        { pos: 'RG', lbl: 'RG', x:  2,   y: 0 },  // 3
        { pos: 'RT', lbl: 'RT', x:  4,   y: 0 },  // 4
        { pos: 'TE', lbl: 'TE', x:  6.5, y: 0 },  // 5
        { pos: 'WR', lbl: 'X',  x: -16,  y: 0 },  // 6
        { pos: 'WR', lbl: 'Z',  x:  18,  y: 0 },  // 7
        { pos: 'WR', lbl: 'SL', x: -8,   y: 0 },  // 8
        { pos: 'QB', lbl: 'QB', x:  0,   y: 7 },  // 9
        { pos: 'RB', lbl: 'RB', x: -3,   y: 7 }   // 10
      ],
      routes: [
        { pi: 8,  wpts: [[-8,0],[-8,-4],[12,-4]],          style: 'solid',  color: '#ffcc00' }, // SL mesh L→R
        { pi: 5,  wpts: [[6.5,0],[6.5,-4],[-10,-4]],       style: 'solid',  color: '#ff9966' }, // TE mesh R→L
        { pi: 6,  wpts: [[-16,0],[-16,-14]],                style: 'solid',  color: '#ffcc00' }, // X clear deep
        { pi: 7,  wpts: [[18,0],[18,-14]],                  style: 'solid',  color: '#ffcc00' }, // Z clear deep
        { pi: 10, wpts: [[-3,7],[5,-3]],                    style: 'dashed', color: '#ffcc00' }  // RB outlet
      ]
    },

    {
      id: 4, name: 'Smash', formation: 'Spread / Trips', type: 'Pass',
      desc: 'Cover 2 beater. Outside WR runs corner route; inside WR hitches underneath to stress the flat defender.',
      players: [
        { pos: 'LT', lbl: 'LT', x: -4,  y: 0 },  // 0
        { pos: 'LG', lbl: 'LG', x: -2,  y: 0 },  // 1
        { pos: 'C',  lbl: 'C',  x:  0,  y: 0 },  // 2
        { pos: 'RG', lbl: 'RG', x:  2,  y: 0 },  // 3
        { pos: 'RT', lbl: 'RT', x:  4,  y: 0 },  // 4
        { pos: 'WR', lbl: 'X',  x: -18, y: 0 },  // 5  isolated left
        { pos: 'WR', lbl: 'Z',  x:  8,  y: 0 },  // 6  inside trips
        { pos: 'WR', lbl: 'Y',  x:  13, y: 0 },  // 7  middle trips
        { pos: 'WR', lbl: 'F',  x:  18, y: 0 },  // 8  outside trips
        { pos: 'QB', lbl: 'QB', x:  0,  y: 7 },  // 9
        { pos: 'RB', lbl: 'RB', x: -3,  y: 7 }   // 10
      ],
      routes: [
        { pi: 5,  wpts: [[-18,0],[-18,-10],[-11,-15]],     style: 'solid',  color: '#ffcc00' }, // X post/clear
        { pi: 6,  wpts: [[8,0],[8,-5],[10,-3]],             style: 'solid',  color: '#ffcc00' }, // Z hitch
        { pi: 7,  wpts: [[13,0],[13,-8],[5,-8]],            style: 'solid',  color: '#ff9966' }, // Y dig
        { pi: 8,  wpts: [[18,0],[18,-6],[22,-12]],          style: 'solid',  color: '#ffcc00' }, // F corner
        { pi: 10, wpts: [[-3,7],[-10,-1]],                  style: 'dashed', color: '#ffcc00' }  // RB swing
      ]
    },

    {
      id: 5, name: 'Spacing', formation: 'Singleback', type: 'Pass',
      desc: 'Horizontal stretch flooding every zone. Five receivers at staggered depths between 4-7 yards.',
      players: [
        { pos: 'LT', lbl: 'LT', x: -4,   y: 0 },  // 0
        { pos: 'LG', lbl: 'LG', x: -2,   y: 0 },  // 1
        { pos: 'C',  lbl: 'C',  x:  0,   y: 0 },  // 2
        { pos: 'RG', lbl: 'RG', x:  2,   y: 0 },  // 3
        { pos: 'RT', lbl: 'RT', x:  4,   y: 0 },  // 4
        { pos: 'TE', lbl: 'TE', x:  6.5, y: 0 },  // 5
        { pos: 'WR', lbl: 'X',  x: -18,  y: 0 },  // 6
        { pos: 'WR', lbl: 'Z',  x:  18,  y: 0 },  // 7
        { pos: 'WR', lbl: 'SL', x: -8,   y: 0 },  // 8
        { pos: 'QB', lbl: 'QB', x:  0,   y: 1.5 },// 9
        { pos: 'RB', lbl: 'RB', x:  0,   y: 6 }   // 10
      ],
      routes: [
        { pi: 6,  wpts: [[-18,0],[-18,-6],[-18,-4]],       style: 'solid',  color: '#ffcc00' }, // X hitch
        { pi: 8,  wpts: [[-8,0],[-8,-5],[-2,-5]],          style: 'solid',  color: '#ffcc00' }, // SL drag
        { pi: 5,  wpts: [[6.5,0],[6.5,-4],[1,-4]],         style: 'solid',  color: '#ff9966' }, // TE drag
        { pi: 7,  wpts: [[18,0],[18,-6],[18,-4]],           style: 'solid',  color: '#ffcc00' }, // Z hitch
        { pi: 10, wpts: [[0,6],[8,-2]],                     style: 'dashed', color: '#ffcc00' }  // RB flat
      ]
    },

    {
      id: 6, name: 'PA Boot Right', formation: 'I-Formation', type: 'Pass',
      desc: 'Play-action fake draws linebackers; QB boots right; TE runs corner; FL drags across field.',
      players: [
        { pos: 'LT', lbl: 'LT', x: -4,   y: 0 },  // 0
        { pos: 'LG', lbl: 'LG', x: -2,   y: 0 },  // 1
        { pos: 'C',  lbl: 'C',  x:  0,   y: 0 },  // 2
        { pos: 'RG', lbl: 'RG', x:  2,   y: 0 },  // 3
        { pos: 'RT', lbl: 'RT', x:  4,   y: 0 },  // 4
        { pos: 'TE', lbl: 'TE', x:  6.5, y: 0 },  // 5
        { pos: 'WR', lbl: 'FL', x: -18,  y: 0 },  // 6
        { pos: 'WR', lbl: 'SE', x:  18,  y: 0 },  // 7
        { pos: 'QB', lbl: 'QB', x:  0,   y: 1.5 },// 8
        { pos: 'FB', lbl: 'FB', x:  0,   y: 4 },  // 9
        { pos: 'RB', lbl: 'HB', x:  0,   y: 7 }   // 10
      ],
      routes: [
        { pi: 5,  wpts: [[6.5,0],[6.5,-6],[10,-11]],       style: 'solid',  color: '#ff9966' }, // TE corner
        { pi: 6,  wpts: [[-18,0],[-18,-5],[-4,-5]],        style: 'solid',  color: '#ffcc00' }, // FL drag
        { pi: 7,  wpts: [[18,0],[18,-12]],                  style: 'solid',  color: '#ffcc00' }, // SE post/go
        { pi: 8,  wpts: [[0,1.5],[5,2]],                    style: 'motion', color: '#ffcc00' }, // QB boot
        { pi: 10, wpts: [[0,7],[3,3]],                      style: 'dashed', color: '#aaaaaa' }  // HB fake
      ]
    },

    /* ═══════════════════════  RUN PLAYS  ════════════════════════════ */

    {
      id: 7, name: 'Power Right', formation: 'I-Formation', type: 'Run',
      desc: 'FB kicks out the DE; LG pulls and leads through the hole; HB runs off-tackle right.',
      players: [
        { pos: 'LT', lbl: 'LT', x: -4,   y: 0 },  // 0
        { pos: 'LG', lbl: 'LG', x: -2,   y: 0 },  // 1
        { pos: 'C',  lbl: 'C',  x:  0,   y: 0 },  // 2
        { pos: 'RG', lbl: 'RG', x:  2,   y: 0 },  // 3
        { pos: 'RT', lbl: 'RT', x:  4,   y: 0 },  // 4
        { pos: 'TE', lbl: 'TE', x:  6.5, y: 0 },  // 5
        { pos: 'WR', lbl: 'FL', x: -18,  y: 0 },  // 6
        { pos: 'WR', lbl: 'SE', x:  18,  y: 0 },  // 7
        { pos: 'QB', lbl: 'QB', x:  0,   y: 1.5 },// 8
        { pos: 'FB', lbl: 'FB', x:  0,   y: 4 },  // 9
        { pos: 'RB', lbl: 'HB', x:  0,   y: 7 }   // 10
      ],
      routes: [
        { pi: 0,  wpts: [[-4,0],[-5,-1.5]],                style: 'block',  color: '#ffcc00' }, // LT down block
        { pi: 1,  wpts: [[-2,0],[-2,2],[4,1],[6,-1]],      style: 'solid',  color: '#ff9966' }, // LG pull
        { pi: 2,  wpts: [[0,0],[0,-1.5]],                   style: 'block',  color: '#ffcc00' }, // C combo
        { pi: 3,  wpts: [[2,0],[2,-1.5]],                   style: 'block',  color: '#ffcc00' }, // RG down
        { pi: 4,  wpts: [[4,0],[5,-1.5]],                   style: 'block',  color: '#ffcc00' }, // RT base
        { pi: 5,  wpts: [[6.5,0],[6,-1.5]],                 style: 'block',  color: '#ffcc00' }, // TE down
        { pi: 9,  wpts: [[0,4],[7,-1]],                     style: 'solid',  color: '#ff6666' }, // FB kick-out
        { pi: 10, wpts: [[0,7],[5,1],[7,4]],                style: 'solid',  color: '#ffffff' }  // HB path
      ]
    },

    {
      id: 8, name: 'Counter Left', formation: 'I-Formation', type: 'Run',
      desc: 'Misdirection. Initial flow goes right; RG and RT pull left and lead through the B-gap.',
      players: [
        { pos: 'LT', lbl: 'LT', x: -4,   y: 0 },  // 0
        { pos: 'LG', lbl: 'LG', x: -2,   y: 0 },  // 1
        { pos: 'C',  lbl: 'C',  x:  0,   y: 0 },  // 2
        { pos: 'RG', lbl: 'RG', x:  2,   y: 0 },  // 3
        { pos: 'RT', lbl: 'RT', x:  4,   y: 0 },  // 4
        { pos: 'TE', lbl: 'TE', x:  6.5, y: 0 },  // 5
        { pos: 'WR', lbl: 'FL', x: -18,  y: 0 },  // 6
        { pos: 'WR', lbl: 'SE', x:  18,  y: 0 },  // 7
        { pos: 'QB', lbl: 'QB', x:  0,   y: 1.5 },// 8
        { pos: 'FB', lbl: 'FB', x:  0,   y: 4 },  // 9
        { pos: 'RB', lbl: 'HB', x:  0,   y: 7 }   // 10
      ],
      routes: [
        { pi: 0,  wpts: [[-4,0],[-5,-1.5]],                style: 'block',  color: '#ffcc00' }, // LT down
        { pi: 1,  wpts: [[-2,0],[-3,-1.5]],                style: 'block',  color: '#ffcc00' }, // LG down
        { pi: 2,  wpts: [[0,0],[-1,-1.5]],                  style: 'block',  color: '#ffcc00' }, // C back
        { pi: 3,  wpts: [[2,0],[2,2],[-4,1],[-5,-1]],      style: 'solid',  color: '#ff9966' }, // RG pull left
        { pi: 4,  wpts: [[4,0],[4,2],[-3,1],[-6,-1]],      style: 'solid',  color: '#ff9966' }, // RT pull left
        { pi: 5,  wpts: [[6.5,0],[6,-1.5]],                 style: 'block',  color: '#ffcc00' }, // TE base
        { pi: 9,  wpts: [[0,4],[-3,2]],                     style: 'solid',  color: '#ff6666' }, // FB lead
        { pi: 10, wpts: [[0,7],[-5,1],[-7,4]],              style: 'solid',  color: '#ffffff' }  // HB counter
      ]
    },

    {
      id: 9, name: 'Inside Zone', formation: 'Shotgun', type: 'Run',
      desc: 'Full-line zone step right. RB reads backside cut or bounces outside based on blocking.',
      players: [
        { pos: 'LT', lbl: 'LT', x: -4,   y: 0 },  // 0
        { pos: 'LG', lbl: 'LG', x: -2,   y: 0 },  // 1
        { pos: 'C',  lbl: 'C',  x:  0,   y: 0 },  // 2
        { pos: 'RG', lbl: 'RG', x:  2,   y: 0 },  // 3
        { pos: 'RT', lbl: 'RT', x:  4,   y: 0 },  // 4
        { pos: 'TE', lbl: 'TE', x:  6.5, y: 0 },  // 5
        { pos: 'WR', lbl: 'X',  x: -16,  y: 0 },  // 6
        { pos: 'WR', lbl: 'Z',  x:  18,  y: 0 },  // 7
        { pos: 'WR', lbl: 'SL', x: -8,   y: 0 },  // 8
        { pos: 'QB', lbl: 'QB', x:  0,   y: 7 },  // 9
        { pos: 'RB', lbl: 'RB', x: -3,   y: 7 }   // 10
      ],
      routes: [
        { pi: 0,  wpts: [[-4,0],[-3,-1.5]],                style: 'block',  color: '#ffcc00' },
        { pi: 1,  wpts: [[-2,0],[-1,-1.5]],                style: 'block',  color: '#ffcc00' },
        { pi: 2,  wpts: [[0,0],[1,-1.5]],                   style: 'block',  color: '#ffcc00' },
        { pi: 3,  wpts: [[2,0],[3,-1.5]],                   style: 'block',  color: '#ffcc00' },
        { pi: 4,  wpts: [[4,0],[5,-1.5]],                   style: 'block',  color: '#ffcc00' },
        { pi: 5,  wpts: [[6.5,0],[7.5,-1.5]],              style: 'block',  color: '#ffcc00' },
        { pi: 10, wpts: [[-3,7],[2,-1],[1,3]],              style: 'solid',  color: '#ffffff' }  // RB path
      ]
    },

    {
      id: 10, name: 'Outside Zone Right', formation: 'Singleback', type: 'Run',
      desc: 'Full-line zone stretch right. WR cracks inside; RB bounces outside or cuts back if backside opens.',
      players: [
        { pos: 'LT', lbl: 'LT', x: -4,   y: 0 },  // 0
        { pos: 'LG', lbl: 'LG', x: -2,   y: 0 },  // 1
        { pos: 'C',  lbl: 'C',  x:  0,   y: 0 },  // 2
        { pos: 'RG', lbl: 'RG', x:  2,   y: 0 },  // 3
        { pos: 'RT', lbl: 'RT', x:  4,   y: 0 },  // 4
        { pos: 'TE', lbl: 'TE', x:  6.5, y: 0 },  // 5
        { pos: 'WR', lbl: 'X',  x: -18,  y: 0 },  // 6
        { pos: 'WR', lbl: 'Z',  x:  18,  y: 0 },  // 7
        { pos: 'WR', lbl: 'SL', x: -8,   y: 0 },  // 8
        { pos: 'QB', lbl: 'QB', x:  0,   y: 1.5 },// 9
        { pos: 'RB', lbl: 'RB', x:  0,   y: 6 }   // 10
      ],
      routes: [
        { pi: 0,  wpts: [[-4,0],[-3,-1.5]],                style: 'block',  color: '#ffcc00' },
        { pi: 1,  wpts: [[-2,0],[-1,-1.5]],                style: 'block',  color: '#ffcc00' },
        { pi: 2,  wpts: [[0,0],[1,-1.5]],                   style: 'block',  color: '#ffcc00' },
        { pi: 3,  wpts: [[2,0],[3,-1.5]],                   style: 'block',  color: '#ffcc00' },
        { pi: 4,  wpts: [[4,0],[5,-1.5]],                   style: 'block',  color: '#ffcc00' },
        { pi: 5,  wpts: [[6.5,0],[8,-1.5]],                style: 'block',  color: '#ffcc00' },
        { pi: 7,  wpts: [[18,0],[14,-2]],                   style: 'block',  color: '#aaaaaa' }, // Z crack
        { pi: 10, wpts: [[0,6],[9,-2],[10,3]],              style: 'solid',  color: '#ffffff' }  // RB bounce
      ]
    },

    /* ═══════════════════════  DEFENSE PLAYS  ════════════════════════ */

    {
      id: 11, name: 'Cover 2', formation: '4-3', type: 'Defense', mode: 'defense',
      desc: 'Two-deep halves. CBs press/flatten to flats; SS and FS each own a deep half; underneath zones.',
      players: [
        { pos: 'DE',  lbl: 'DE',  x: -6.5, y: -1,   side: 'defense' }, // 0
        { pos: 'DT',  lbl: 'DT',  x: -2,   y: -1,   side: 'defense' }, // 1
        { pos: 'DT',  lbl: 'DT',  x:  2,   y: -1,   side: 'defense' }, // 2
        { pos: 'DE',  lbl: 'DE',  x:  6.5, y: -1,   side: 'defense' }, // 3
        { pos: 'OLB', lbl: 'OLB', x: -9,   y: -4,   side: 'defense' }, // 4
        { pos: 'MLB', lbl: 'MLB', x:  0,   y: -4,   side: 'defense' }, // 5
        { pos: 'OLB', lbl: 'OLB', x:  9,   y: -4,   side: 'defense' }, // 6
        { pos: 'CB',  lbl: 'CB',  x: -18,  y: -2,   side: 'defense' }, // 7
        { pos: 'CB',  lbl: 'CB',  x:  18,  y: -2,   side: 'defense' }, // 8
        { pos: 'SS',  lbl: 'SS',  x: -5,   y: -9,   side: 'defense' }, // 9
        { pos: 'FS',  lbl: 'FS',  x:  5,   y: -13,  side: 'defense' }  // 10
      ],
      routes: [
        { pi: 0,  wpts: [[-6.5,-1],[-6.5,-4]],             style: 'solid',  color: '#4a9eff', assign: 'rush'  },
        { pi: 1,  wpts: [[-2,-1],[-2,-4]],                  style: 'solid',  color: '#4a9eff', assign: 'rush'  },
        { pi: 2,  wpts: [[2,-1],[2,-4]],                    style: 'solid',  color: '#4a9eff', assign: 'rush'  },
        { pi: 3,  wpts: [[6.5,-1],[6.5,-4]],               style: 'solid',  color: '#4a9eff', assign: 'rush'  },
        { pi: 4,  wpts: [[-9,-4],[-14,-7]],                 style: 'dashed', color: '#4a9eff', assign: 'zone'  }, // OLB flat
        { pi: 5,  wpts: [[0,-4],[0,-8]],                    style: 'dashed', color: '#4a9eff', assign: 'zone'  }, // MLB hook
        { pi: 6,  wpts: [[9,-4],[14,-7]],                   style: 'dashed', color: '#4a9eff', assign: 'zone'  },
        { pi: 7,  wpts: [[-18,-2],[-15,-5]],                style: 'solid',  color: '#ff9966', assign: 'cover' }, // CB flatten
        { pi: 8,  wpts: [[18,-2],[15,-5]],                  style: 'solid',  color: '#ff9966', assign: 'cover' },
        { pi: 9,  wpts: [[-5,-9],[-12,-14]],                style: 'dashed', color: '#4a9eff', assign: 'zone'  }, // SS deep half
        { pi: 10, wpts: [[5,-13],[12,-14]],                 style: 'dashed', color: '#4a9eff', assign: 'zone'  }  // FS deep half
      ]
    },

    {
      id: 12, name: 'Cover 3', formation: '3-4', type: 'Defense', mode: 'defense',
      desc: 'Three-deep zone. CBs own deep outside thirds; FS covers deep middle; four underneath zones.',
      players: [
        { pos: 'DE',  lbl: 'DE',  x: -5,  y: -1,   side: 'defense' }, // 0
        { pos: 'NT',  lbl: 'NT',  x:  0,  y: -1,   side: 'defense' }, // 1
        { pos: 'DE',  lbl: 'DE',  x:  5,  y: -1,   side: 'defense' }, // 2
        { pos: 'OLB', lbl: 'OLB', x: -8,  y: -3,   side: 'defense' }, // 3
        { pos: 'ILB', lbl: 'ILB', x: -2,  y: -4.5, side: 'defense' }, // 4
        { pos: 'ILB', lbl: 'ILB', x:  2,  y: -4.5, side: 'defense' }, // 5
        { pos: 'OLB', lbl: 'OLB', x:  8,  y: -3,   side: 'defense' }, // 6
        { pos: 'CB',  lbl: 'CB',  x: -18, y: -2,   side: 'defense' }, // 7
        { pos: 'CB',  lbl: 'CB',  x:  18, y: -2,   side: 'defense' }, // 8
        { pos: 'SS',  lbl: 'SS',  x: -4,  y: -9,   side: 'defense' }, // 9
        { pos: 'FS',  lbl: 'FS',  x:  4,  y: -13,  side: 'defense' }  // 10
      ],
      routes: [
        { pi: 0,  wpts: [[-5,-1],[-5,-4]],                 style: 'solid',  color: '#4a9eff', assign: 'rush'  },
        { pi: 1,  wpts: [[0,-1],[0,-4]],                   style: 'solid',  color: '#4a9eff', assign: 'rush'  },
        { pi: 2,  wpts: [[5,-1],[5,-4]],                   style: 'solid',  color: '#4a9eff', assign: 'rush'  },
        { pi: 3,  wpts: [[-8,-3],[-13,-7]],                style: 'dashed', color: '#4a9eff', assign: 'zone'  }, // OLB flat
        { pi: 4,  wpts: [[-2,-4.5],[-4,-8]],              style: 'dashed', color: '#4a9eff', assign: 'zone'  }, // ILB hook
        { pi: 5,  wpts: [[2,-4.5],[4,-8]],                style: 'dashed', color: '#4a9eff', assign: 'zone'  },
        { pi: 6,  wpts: [[8,-3],[13,-7]],                  style: 'dashed', color: '#4a9eff', assign: 'zone'  },
        { pi: 7,  wpts: [[-18,-2],[-18,-14]],              style: 'dashed', color: '#ff9966', assign: 'zone'  }, // CB deep third
        { pi: 8,  wpts: [[18,-2],[18,-14]],                style: 'dashed', color: '#ff9966', assign: 'zone'  },
        { pi: 9,  wpts: [[-4,-9],[-9,-12]],                style: 'dashed', color: '#4a9eff', assign: 'zone'  }, // SS curl-flat
        { pi: 10, wpts: [[4,-13],[0,-14]],                 style: 'dashed', color: '#4a9eff', assign: 'zone'  }  // FS deep middle
      ]
    },

    {
      id: 13, name: 'Quarters (Cover 4)', formation: 'Nickel', type: 'Defense', mode: 'defense',
      desc: 'Four defenders each cover a deep quarter. CBs and safeties match vertical routes; LBs own underneath.',
      players: [
        { pos: 'DE',  lbl: 'DE',  x: -6.5, y: -1,  side: 'defense' }, // 0
        { pos: 'DT',  lbl: 'DT',  x: -2,   y: -1,  side: 'defense' }, // 1
        { pos: 'DT',  lbl: 'DT',  x:  2,   y: -1,  side: 'defense' }, // 2
        { pos: 'DE',  lbl: 'DE',  x:  6.5, y: -1,  side: 'defense' }, // 3
        { pos: 'LB',  lbl: 'LB',  x: -4,   y: -4,  side: 'defense' }, // 4
        { pos: 'LB',  lbl: 'LB',  x:  4,   y: -4,  side: 'defense' }, // 5
        { pos: 'CB',  lbl: 'CB',  x: -18,  y: -2,  side: 'defense' }, // 6
        { pos: 'CB',  lbl: 'CB',  x:  18,  y: -2,  side: 'defense' }, // 7
        { pos: 'NB',  lbl: 'NB',  x: -10,  y: -4,  side: 'defense' }, // 8
        { pos: 'SS',  lbl: 'SS',  x: -4,   y: -9,  side: 'defense' }, // 9
        { pos: 'FS',  lbl: 'FS',  x:  4,   y: -13, side: 'defense' }  // 10
      ],
      routes: [
        { pi: 0,  wpts: [[-6.5,-1],[-6.5,-4]],            style: 'solid',  color: '#4a9eff', assign: 'rush'  },
        { pi: 1,  wpts: [[-2,-1],[-2,-4]],                 style: 'solid',  color: '#4a9eff', assign: 'rush'  },
        { pi: 2,  wpts: [[2,-1],[2,-4]],                   style: 'solid',  color: '#4a9eff', assign: 'rush'  },
        { pi: 3,  wpts: [[6.5,-1],[6.5,-4]],              style: 'solid',  color: '#4a9eff', assign: 'rush'  },
        { pi: 4,  wpts: [[-4,-4],[-8,-8]],                style: 'dashed', color: '#4a9eff', assign: 'zone'  },
        { pi: 5,  wpts: [[4,-4],[8,-8]],                  style: 'dashed', color: '#4a9eff', assign: 'zone'  },
        { pi: 6,  wpts: [[-18,-2],[-18,-12]],             style: 'dashed', color: '#ff9966', assign: 'zone'  }, // CB deep quarter
        { pi: 7,  wpts: [[18,-2],[18,-12]],               style: 'dashed', color: '#ff9966', assign: 'zone'  },
        { pi: 8,  wpts: [[-10,-4],[-14,-9]],              style: 'dashed', color: '#4a9eff', assign: 'zone'  }, // NB quarter
        { pi: 9,  wpts: [[-4,-9],[-9,-14]],               style: 'dashed', color: '#4a9eff', assign: 'zone'  }, // SS quarter
        { pi: 10, wpts: [[4,-13],[9,-14]],                style: 'dashed', color: '#4a9eff', assign: 'zone'  }  // FS quarter
      ]
    },

    {
      id: 14, name: 'Fire Zone Blitz', formation: '4-3', type: 'Defense', mode: 'defense',
      desc: '5-man pressure with 3-deep zone behind. Right DE drops; MLB and OLB blitz A-gaps simultaneously.',
      players: [
        { pos: 'DE',  lbl: 'DE',  x: -6.5, y: -1,  side: 'defense' }, // 0
        { pos: 'DT',  lbl: 'DT',  x: -2,   y: -1,  side: 'defense' }, // 1
        { pos: 'DT',  lbl: 'DT',  x:  2,   y: -1,  side: 'defense' }, // 2
        { pos: 'DE',  lbl: 'DE',  x:  6.5, y: -1,  side: 'defense' }, // 3
        { pos: 'OLB', lbl: 'OLB', x: -9,   y: -4,  side: 'defense' }, // 4
        { pos: 'MLB', lbl: 'MLB', x:  0,   y: -4,  side: 'defense' }, // 5
        { pos: 'OLB', lbl: 'OLB', x:  9,   y: -4,  side: 'defense' }, // 6
        { pos: 'CB',  lbl: 'CB',  x: -18,  y: -2,  side: 'defense' }, // 7
        { pos: 'CB',  lbl: 'CB',  x:  18,  y: -2,  side: 'defense' }, // 8
        { pos: 'SS',  lbl: 'SS',  x: -5,   y: -9,  side: 'defense' }, // 9
        { pos: 'FS',  lbl: 'FS',  x:  5,   y: -13, side: 'defense' }  // 10
      ],
      routes: [
        { pi: 0,  wpts: [[-6.5,-1],[-6.5,-4]],            style: 'solid',  color: '#4a9eff', assign: 'rush'  }, // DE rush
        { pi: 1,  wpts: [[-2,-1],[-2,-4]],                 style: 'solid',  color: '#ff4444', assign: 'blitz' }, // DT rush
        { pi: 2,  wpts: [[2,-1],[2,-4]],                   style: 'solid',  color: '#4a9eff', assign: 'rush'  },
        { pi: 3,  wpts: [[6.5,-1],[6.5,-6]],              style: 'dashed', color: '#4a9eff', assign: 'zone'  }, // DE drops to curl
        { pi: 4,  wpts: [[-9,-4],[-9,-1]],                style: 'solid',  color: '#ff4444', assign: 'blitz' }, // OLB blitz
        { pi: 5,  wpts: [[0,-4],[0,-1]],                   style: 'solid',  color: '#ff4444', assign: 'blitz' }, // MLB blitz A-gap
        { pi: 6,  wpts: [[9,-4],[11,-7]],                  style: 'dashed', color: '#4a9eff', assign: 'zone'  },
        { pi: 7,  wpts: [[-18,-2],[-18,-14]],             style: 'dashed', color: '#ff9966', assign: 'zone'  }, // CB deep third
        { pi: 8,  wpts: [[18,-2],[18,-14]],               style: 'dashed', color: '#ff9966', assign: 'zone'  },
        { pi: 9,  wpts: [[-5,-9],[-12,-14]],              style: 'dashed', color: '#4a9eff', assign: 'zone'  }, // SS deep half
        { pi: 10, wpts: [[5,-13],[0,-14]],                style: 'dashed', color: '#4a9eff', assign: 'zone'  }  // FS deep middle
      ]
    }

  ]; // end RAW

  window.PLAY_LIBRARY = RAW.map(buildPlay);

})();
