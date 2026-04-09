/**
 * play-library.js — General Play Template Library  (60 plays)
 * Coordinates are in YARDS from the center of the line of scrimmage.
 *   x: positive = right hash, negative = left hash
 *   y: positive = behind LOS (own end zone), negative = upfield (opponent)
 * Canvas constants (must match app.html): CW=700 CH=570 LOS=300 CX=350 HPY≈13.125 VPY=19
 *
 * Play IDs: 101-120 Pass | 201-220 Run | 301-320 Defense
 */
(function () {
  const H = 700 / 53.33;   // ~13.125 px per horizontal yard
  const V = 19;             // px per vertical yard
  const CX = 350, LOS = 300;

  function pt(x, y) { return { x: Math.round(CX + x * H), y: Math.round(LOS + y * V) }; }

  function buildPlay(def) {
    const players = def.players.map((d, i) => {
      const p = pt(d.x, d.y);
      return { id: def.id * 1000 + i, pos: d.pos, lbl: d.lbl || d.pos, x: p.x, y: p.y, side: d.side || 'offense' };
    });
    const routes = (def.routes || []).map((r, i) => ({
      id: def.id * 1000 + 500 + i,
      pid: players[r.pi].id,
      waypoints: r.wpts.map(w => pt(w[0], w[1])),
      style: r.style || 'solid',
      color: r.color || '#ffcc00',
      assign: r.assign || 'rush'
    }));
    return { id: def.id, name: def.name, formation: def.formation, type: def.type,
      category: def.cat, mode: def.mode || 'offense', description: def.desc || '',
      players, routes, labels: [], thumb: null, ts: 0 };
  }

  /* ═══════════════════════════════════════════════════════════════════
     COMMON FORMATION TEMPLATES (yard coords, referenced by each play)
  ═══════════════════════════════════════════════════════════════════ */

  // I-Formation (11 players, pi 0-10)
  const IF = [
    {pos:'LT',lbl:'LT',x:-4,y:0},{pos:'LG',lbl:'LG',x:-2,y:0},{pos:'C',lbl:'C',x:0,y:0},
    {pos:'RG',lbl:'RG',x:2,y:0},{pos:'RT',lbl:'RT',x:4,y:0},{pos:'TE',lbl:'TE',x:6.5,y:0},
    {pos:'WR',lbl:'FL',x:-18,y:0},{pos:'WR',lbl:'SE',x:18,y:0},
    {pos:'QB',lbl:'QB',x:0,y:1.5},{pos:'FB',lbl:'FB',x:0,y:4},{pos:'RB',lbl:'HB',x:0,y:7}
  ];

  // Shotgun (11 players, pi 0-10)
  const SG = [
    {pos:'LT',lbl:'LT',x:-4,y:0},{pos:'LG',lbl:'LG',x:-2,y:0},{pos:'C',lbl:'C',x:0,y:0},
    {pos:'RG',lbl:'RG',x:2,y:0},{pos:'RT',lbl:'RT',x:4,y:0},{pos:'TE',lbl:'TE',x:6.5,y:0},
    {pos:'WR',lbl:'X',x:-16,y:0},{pos:'WR',lbl:'Z',x:18,y:0},{pos:'WR',lbl:'SL',x:-8,y:0},
    {pos:'QB',lbl:'QB',x:0,y:7},{pos:'RB',lbl:'RB',x:-3,y:7}
  ];

  // Spread / Trips (no TE, 4 WRs bunched right, pi 0-10)
  const TR = [
    {pos:'LT',lbl:'LT',x:-4,y:0},{pos:'LG',lbl:'LG',x:-2,y:0},{pos:'C',lbl:'C',x:0,y:0},
    {pos:'RG',lbl:'RG',x:2,y:0},{pos:'RT',lbl:'RT',x:4,y:0},
    {pos:'WR',lbl:'X',x:-18,y:0},{pos:'WR',lbl:'Z',x:8,y:0},
    {pos:'WR',lbl:'Y',x:13,y:0},{pos:'WR',lbl:'F',x:18,y:0},
    {pos:'QB',lbl:'QB',x:0,y:7},{pos:'RB',lbl:'RB',x:-3,y:7}
  ];

  // Singleback (pi 0-10)
  const SB = [
    {pos:'LT',lbl:'LT',x:-4,y:0},{pos:'LG',lbl:'LG',x:-2,y:0},{pos:'C',lbl:'C',x:0,y:0},
    {pos:'RG',lbl:'RG',x:2,y:0},{pos:'RT',lbl:'RT',x:4,y:0},{pos:'TE',lbl:'TE',x:6.5,y:0},
    {pos:'WR',lbl:'X',x:-18,y:0},{pos:'WR',lbl:'Z',x:18,y:0},{pos:'WR',lbl:'SL',x:-8,y:0},
    {pos:'QB',lbl:'QB',x:0,y:1.5},{pos:'RB',lbl:'RB',x:0,y:6}
  ];

  // Pistol (pi 0-10)
  const PS = [
    {pos:'LT',lbl:'LT',x:-4,y:0},{pos:'LG',lbl:'LG',x:-2,y:0},{pos:'C',lbl:'C',x:0,y:0},
    {pos:'RG',lbl:'RG',x:2,y:0},{pos:'RT',lbl:'RT',x:4,y:0},{pos:'TE',lbl:'TE',x:6.5,y:0},
    {pos:'WR',lbl:'X',x:-16,y:0},{pos:'WR',lbl:'Z',x:18,y:0},{pos:'WR',lbl:'SL',x:-8,y:0},
    {pos:'QB',lbl:'QB',x:0,y:4},{pos:'RB',lbl:'RB',x:0,y:8}
  ];

  // Power I (double-TE, power formation, pi 0-10)
  const PI = [
    {pos:'LT',lbl:'LT',x:-4,y:0},{pos:'LG',lbl:'LG',x:-2,y:0},{pos:'C',lbl:'C',x:0,y:0},
    {pos:'RG',lbl:'RG',x:2,y:0},{pos:'RT',lbl:'RT',x:4,y:0},
    {pos:'TE',lbl:'TE',x:6.5,y:0},{pos:'TE',lbl:'TE',x:-6.5,y:0},
    {pos:'WR',lbl:'WR',x:18,y:0},
    {pos:'QB',lbl:'QB',x:0,y:1.5},{pos:'FB',lbl:'FB',x:0,y:4},{pos:'RB',lbl:'HB',x:0,y:7}
  ];

  // Pro Set (pi 0-10)
  const PRO = [
    {pos:'LT',lbl:'LT',x:-4,y:0},{pos:'LG',lbl:'LG',x:-2,y:0},{pos:'C',lbl:'C',x:0,y:0},
    {pos:'RG',lbl:'RG',x:2,y:0},{pos:'RT',lbl:'RT',x:4,y:0},{pos:'TE',lbl:'TE',x:6.5,y:0},
    {pos:'WR',lbl:'FL',x:-18,y:0},{pos:'WR',lbl:'SE',x:18,y:0},
    {pos:'QB',lbl:'QB',x:0,y:1.5},{pos:'FB',lbl:'FB',x:-2,y:5},{pos:'HB',lbl:'HB',x:2,y:5}
  ];

  // 4-3 Defense (pi 0-10)
  const D43 = [
    {pos:'DE',lbl:'DE',x:-6.5,y:-1,side:'defense'},{pos:'DT',lbl:'DT',x:-2,y:-1,side:'defense'},
    {pos:'DT',lbl:'DT',x:2,y:-1,side:'defense'},{pos:'DE',lbl:'DE',x:6.5,y:-1,side:'defense'},
    {pos:'OLB',lbl:'OLB',x:-9,y:-4,side:'defense'},{pos:'MLB',lbl:'MLB',x:0,y:-4,side:'defense'},
    {pos:'OLB',lbl:'OLB',x:9,y:-4,side:'defense'},
    {pos:'CB',lbl:'CB',x:-18,y:-2,side:'defense'},{pos:'CB',lbl:'CB',x:18,y:-2,side:'defense'},
    {pos:'SS',lbl:'SS',x:-5,y:-9,side:'defense'},{pos:'FS',lbl:'FS',x:5,y:-13,side:'defense'}
  ];

  // 3-4 Defense (pi 0-10)
  const D34 = [
    {pos:'DE',lbl:'DE',x:-5,y:-1,side:'defense'},{pos:'NT',lbl:'NT',x:0,y:-1,side:'defense'},
    {pos:'DE',lbl:'DE',x:5,y:-1,side:'defense'},
    {pos:'OLB',lbl:'OLB',x:-8,y:-3,side:'defense'},{pos:'ILB',lbl:'ILB',x:-2,y:-4.5,side:'defense'},
    {pos:'ILB',lbl:'ILB',x:2,y:-4.5,side:'defense'},{pos:'OLB',lbl:'OLB',x:8,y:-3,side:'defense'},
    {pos:'CB',lbl:'CB',x:-18,y:-2,side:'defense'},{pos:'CB',lbl:'CB',x:18,y:-2,side:'defense'},
    {pos:'SS',lbl:'SS',x:-4,y:-9,side:'defense'},{pos:'FS',lbl:'FS',x:4,y:-13,side:'defense'}
  ];

  // Nickel Defense (pi 0-10)
  const DNK = [
    {pos:'DE',lbl:'DE',x:-6.5,y:-1,side:'defense'},{pos:'DT',lbl:'DT',x:-2,y:-1,side:'defense'},
    {pos:'DT',lbl:'DT',x:2,y:-1,side:'defense'},{pos:'DE',lbl:'DE',x:6.5,y:-1,side:'defense'},
    {pos:'LB',lbl:'LB',x:-4,y:-4,side:'defense'},{pos:'LB',lbl:'LB',x:4,y:-4,side:'defense'},
    {pos:'CB',lbl:'CB',x:-18,y:-2,side:'defense'},{pos:'CB',lbl:'CB',x:18,y:-2,side:'defense'},
    {pos:'NB',lbl:'NB',x:-10,y:-4,side:'defense'},
    {pos:'SS',lbl:'SS',x:-4,y:-9,side:'defense'},{pos:'FS',lbl:'FS',x:4,y:-13,side:'defense'}
  ];

  // Dime Defense (pi 0-10)
  const DDM = [
    {pos:'DE',lbl:'DE',x:-6.5,y:-1,side:'defense'},{pos:'DT',lbl:'DT',x:-1.5,y:-1,side:'defense'},
    {pos:'DT',lbl:'DT',x:1.5,y:-1,side:'defense'},{pos:'DE',lbl:'DE',x:6.5,y:-1,side:'defense'},
    {pos:'LB',lbl:'LB',x:0,y:-4,side:'defense'},
    {pos:'CB',lbl:'CB',x:-18,y:-2,side:'defense'},{pos:'CB',lbl:'CB',x:18,y:-2,side:'defense'},
    {pos:'DB',lbl:'DB',x:-11,y:-4,side:'defense'},{pos:'DB',lbl:'DB',x:11,y:-4,side:'defense'},
    {pos:'SS',lbl:'SS',x:-5,y:-9,side:'defense'},{pos:'FS',lbl:'FS',x:5,y:-12,side:'defense'}
  ];

  /* ═══════════════════════════════════════════════════════════════════
                          PASS PLAYS  (IDs 101-120)
  ═══════════════════════════════════════════════════════════════════ */

  /* ── QUICK GAME ───────────────────────────────────────────────── */

  const PASS = [
  {
    id:101, name:'Quick Slant', formation:'Shotgun', type:'Pass', cat:'Quick Game',
    desc:'1-step drop. All three skill receivers slant inside simultaneously on the snap.',
    players: SG,
    routes:[
      {pi:6, wpts:[[-16,0],[-16,-2],[-6,-6]],    style:'solid', color:'#ffcc00'}, // X slant
      {pi:8, wpts:[[-8,0],[-8,-2],[2,-6]],        style:'solid', color:'#ffcc00'}, // SL slant
      {pi:7, wpts:[[18,0],[18,-2],[8,-6]],        style:'solid', color:'#ffcc00'}, // Z slant
      {pi:5, wpts:[[6.5,0],[6.5,-3]],             style:'block', color:'#ffcc00'}, // TE chip-block
      {pi:10,wpts:[[-3,7],[4,-2]],                style:'dashed',color:'#ffcc00'}  // RB check-down
    ]
  },
  {
    id:102, name:'Bubble Screen', formation:'Spread / Trips', type:'Pass', cat:'Quick Game',
    desc:'Quick throw to slot receiver bubbling outside; outer WRs stalk-block DBs.',
    players: TR,
    routes:[
      {pi:6, wpts:[[8,0],[5,2],[-3,-3]],          style:'solid', color:'#ffcc00'}, // Z bubble catch→run
      {pi:7, wpts:[[13,0],[11,-2]],               style:'block', color:'#aaaaaa'}, // Y stalk
      {pi:8, wpts:[[18,0],[16,-2]],               style:'block', color:'#aaaaaa'}, // F stalk
      {pi:5, wpts:[[-18,0],[-16,-2]],             style:'block', color:'#aaaaaa'}, // X stalk
      {pi:10,wpts:[[-3,7],[-3,4]],                style:'block', color:'#ffcc00'}  // RB protect
    ]
  },
  {
    id:103, name:'Stick', formation:'Singleback', type:'Pass', cat:'Quick Game',
    desc:'Quick-game horizontal flood. WRs hitch at 5 yds; TE sticks at 5; RB flares to flat.',
    players: SB,
    routes:[
      {pi:6, wpts:[[-18,0],[-18,-5],[-18,-3]],   style:'solid', color:'#ffcc00'}, // X hitch
      {pi:8, wpts:[[-8,0],[-8,-5],[-8,-3]],      style:'solid', color:'#ffcc00'}, // SL hitch
      {pi:5, wpts:[[6.5,0],[8,-4]],               style:'solid', color:'#ff9966'}, // TE stick/out
      {pi:7, wpts:[[18,0],[18,-5],[18,-3]],       style:'solid', color:'#ffcc00'}, // Z hitch
      {pi:10,wpts:[[0,6],[8,-2]],                 style:'dashed',color:'#ffcc00'}  // RB flat
    ]
  },
  {
    id:104, name:'Fade / Back Shoulder', formation:'Singleback', type:'Pass', cat:'Quick Game',
    desc:'Red-zone fade. WRs push outside toward the pylon; TE drags across the middle as safety valve.',
    players: SB,
    routes:[
      {pi:6, wpts:[[-18,0],[-20,-14]],            style:'solid', color:'#ffcc00'}, // X fade
      {pi:7, wpts:[[18,0],[20,-14]],              style:'solid', color:'#ffcc00'}, // Z fade
      {pi:5, wpts:[[6.5,0],[6.5,-6],[-4,-6]],    style:'solid', color:'#ff9966'}, // TE drag
      {pi:8, wpts:[[-8,0],[-8,-6]],               style:'solid', color:'#ffcc00'}, // SL sit route
      {pi:10,wpts:[[0,6],[5,-2]],                 style:'dashed',color:'#ffcc00'}  // RB check-down
    ]
  },
  {
    id:105, name:'Quick Out', formation:'Shotgun', type:'Pass', cat:'Quick Game',
    desc:'3-step drop. Outside WRs break to the out at 3-4 yards; slot runs a drag underneath.',
    players: SG,
    routes:[
      {pi:6, wpts:[[-16,0],[-16,-3],[-22,-3]],   style:'solid', color:'#ffcc00'}, // X quick out
      {pi:7, wpts:[[18,0],[18,-3],[24,-3]],       style:'solid', color:'#ffcc00'}, // Z quick out
      {pi:8, wpts:[[-8,0],[-8,-2],[4,-2]],        style:'solid', color:'#ffcc00'}, // SL drag
      {pi:5, wpts:[[6.5,0],[6.5,-5]],             style:'solid', color:'#ff9966'}, // TE seam/out
      {pi:10,wpts:[[-3,7],[4,-2]],                style:'dashed',color:'#ffcc00'}  // RB outlet
    ]
  },

  /* ── TIMING ROUTES / WEST COAST ──────────────────────────────── */

  {
    id:106, name:'Curl-Flat', formation:'I-Formation', type:'Pass', cat:'Timing Routes / West Coast',
    desc:'West Coast classic. FL curls at 8 yds; SE runs flat; TE works seam-out; HB check-down.',
    players: IF,
    routes:[
      {pi:6, wpts:[[-18,0],[-18,-8],[-15,-6]],   style:'solid', color:'#ffcc00'}, // FL curl
      {pi:7, wpts:[[18,0],[13,-3]],               style:'solid', color:'#ffcc00'}, // SE flat
      {pi:5, wpts:[[6.5,0],[6.5,-5],[11,-5]],     style:'solid', color:'#ff9966'}, // TE out
      {pi:10,wpts:[[0,7],[-8,-1]],                style:'dashed',color:'#ffcc00'}  // HB check-down
    ]
  },
  {
    id:107, name:'Spacing', formation:'Singleback', type:'Pass', cat:'Timing Routes / West Coast',
    desc:'Horizontal flood at every level. Five receivers spaced 4-7 yards deep across the field.',
    players: SB,
    routes:[
      {pi:6, wpts:[[-18,0],[-18,-6],[-18,-4]],   style:'solid', color:'#ffcc00'}, // X hitch
      {pi:8, wpts:[[-8,0],[-8,-5],[-2,-5]],      style:'solid', color:'#ffcc00'}, // SL drag
      {pi:5, wpts:[[6.5,0],[6.5,-4],[1,-4]],     style:'solid', color:'#ff9966'}, // TE drag
      {pi:7, wpts:[[18,0],[18,-6],[18,-4]],       style:'solid', color:'#ffcc00'}, // Z hitch
      {pi:10,wpts:[[0,6],[8,-2]],                 style:'dashed',color:'#ffcc00'}  // RB flat
    ]
  },
  {
    id:108, name:'Smash', formation:'Spread / Trips', type:'Pass', cat:'Timing Routes / West Coast',
    desc:'Cover-2 beater. Outside WR runs corner; inside WR hitches underneath the flat defender.',
    players: TR,
    routes:[
      {pi:5, wpts:[[-18,0],[-18,-10],[-11,-15]], style:'solid', color:'#ffcc00'}, // X post/go
      {pi:6, wpts:[[8,0],[8,-5],[10,-3]],         style:'solid', color:'#ffcc00'}, // Z hitch
      {pi:7, wpts:[[13,0],[13,-8],[5,-8]],        style:'solid', color:'#ff9966'}, // Y dig
      {pi:8, wpts:[[18,0],[18,-6],[22,-12]],      style:'solid', color:'#ffcc00'}, // F corner
      {pi:10,wpts:[[-3,7],[-10,-1]],              style:'dashed',color:'#ffcc00'}  // RB swing
    ]
  },
  {
    id:109, name:'All-Curls', formation:'Shotgun', type:'Pass', cat:'Timing Routes / West Coast',
    desc:'Every receiver curls at 6-8 yards. Quarterback reads weak-side to strong-side.',
    players: SG,
    routes:[
      {pi:6, wpts:[[-16,0],[-16,-8],[-14,-6]],   style:'solid', color:'#ffcc00'}, // X curl
      {pi:8, wpts:[[-8,0],[-8,-6],[-6,-4]],      style:'solid', color:'#ffcc00'}, // SL curl
      {pi:5, wpts:[[6.5,0],[6.5,-6],[8,-4]],     style:'solid', color:'#ff9966'}, // TE curl
      {pi:7, wpts:[[18,0],[18,-8],[16,-6]],       style:'solid', color:'#ffcc00'}, // Z curl
      {pi:10,wpts:[[-3,7],[4,-2]],                style:'dashed',color:'#ffcc00'}  // RB check-down
    ]
  },
  {
    id:110, name:'Shallow Cross (Drive)', formation:'Shotgun', type:'Pass', cat:'Timing Routes / West Coast',
    desc:'X runs a shallow cross at 3 yds; TE drives across high at 10 yds; Z clears the coverage.',
    players: SG,
    routes:[
      {pi:6, wpts:[[-16,0],[-16,-3],[16,-3]],    style:'solid', color:'#ffcc00'}, // X shallow cross
      {pi:5, wpts:[[6.5,0],[6.5,-10],[-12,-10]], style:'solid', color:'#ff9966'}, // TE high cross
      {pi:7, wpts:[[18,0],[18,-14]],              style:'solid', color:'#ffcc00'}, // Z go/clear
      {pi:8, wpts:[[-8,0],[-8,-8],[-18,-8]],     style:'solid', color:'#ffcc00'}, // SL sit in window
      {pi:10,wpts:[[-3,7],[4,-2]],                style:'dashed',color:'#ffcc00'}  // RB outlet
    ]
  },

  /* ── DROPBACK / VERTICAL ──────────────────────────────────────── */

  {
    id:111, name:'Four Verticals', formation:'Shotgun', type:'Pass', cat:'Dropback / Vertical',
    desc:'Stress all three levels. Four receivers streak verticals; RB check-down in the middle.',
    players: SG,
    routes:[
      {pi:6, wpts:[[-16,0],[-16,-15]],            style:'solid', color:'#ffcc00'},
      {pi:7, wpts:[[18,0],[18,-15]],              style:'solid', color:'#ffcc00'},
      {pi:8, wpts:[[-8,0],[-8,-12],[-4,-15]],    style:'solid', color:'#ffcc00'}, // SL skinny post
      {pi:5, wpts:[[6.5,0],[6.5,-14]],            style:'solid', color:'#ff9966'}, // TE seam
      {pi:10,wpts:[[-3,7],[6,-2]],                style:'dashed',color:'#ffcc00'}
    ]
  },
  {
    id:112, name:'Mesh', formation:'Shotgun', type:'Pass', cat:'Dropback / Vertical',
    desc:'Air Raid staple. SL and TE cross at 4 yards creating natural rub/pick; outside receivers clear.',
    players: SG,
    routes:[
      {pi:8, wpts:[[-8,0],[-8,-4],[12,-4]],      style:'solid', color:'#ffcc00'}, // SL mesh L→R
      {pi:5, wpts:[[6.5,0],[6.5,-4],[-10,-4]],   style:'solid', color:'#ff9966'}, // TE mesh R→L
      {pi:6, wpts:[[-16,0],[-16,-14]],            style:'solid', color:'#ffcc00'}, // X clear
      {pi:7, wpts:[[18,0],[18,-14]],              style:'solid', color:'#ffcc00'}, // Z clear
      {pi:10,wpts:[[-3,7],[5,-3]],                style:'dashed',color:'#ffcc00'}
    ]
  },
  {
    id:113, name:'Mills (Dig + Post)', formation:'Shotgun', type:'Pass', cat:'Dropback / Vertical',
    desc:'Two-level vertical combo. X runs a 10-yard dig; Z runs a post behind to create a high-low on the safety.',
    players: SG,
    routes:[
      {pi:6, wpts:[[-16,0],[-16,-10],[0,-10]],   style:'solid', color:'#ffcc00'}, // X dig
      {pi:7, wpts:[[18,0],[18,-8],[10,-14]],      style:'solid', color:'#ffcc00'}, // Z post
      {pi:8, wpts:[[-8,0],[-8,-8],[2,-8]],        style:'solid', color:'#ffcc00'}, // SL dig
      {pi:5, wpts:[[6.5,0],[6.5,-12]],            style:'solid', color:'#ff9966'}, // TE seam
      {pi:10,wpts:[[-3,7],[5,-2]],                style:'dashed',color:'#ffcc00'}
    ]
  },
  {
    id:114, name:'Y-Cross', formation:'Singleback', type:'Pass', cat:'Dropback / Vertical',
    desc:'TE runs a 12-yard crossing route; Z runs a post behind; X runs a dig to occupy the backside.',
    players: SB,
    routes:[
      {pi:5, wpts:[[6.5,0],[6.5,-12],[-14,-12]], style:'solid', color:'#ff9966'}, // TE 12-yd cross
      {pi:7, wpts:[[18,0],[18,-8],[10,-14]],      style:'solid', color:'#ffcc00'}, // Z post
      {pi:6, wpts:[[-18,0],[-18,-10],[-6,-10]],  style:'solid', color:'#ffcc00'}, // X dig
      {pi:8, wpts:[[-8,0],[-8,-6]],               style:'solid', color:'#ffcc00'}, // SL hitch/sit
      {pi:10,wpts:[[0,6],[8,-2]],                 style:'dashed',color:'#ffcc00'}
    ]
  },
  {
    id:115, name:'Flood Right', formation:'I-Formation', type:'Pass', cat:'Dropback / Vertical',
    desc:'Three-level flood to the right: SE goes deep; TE runs a corner; FB flares to the flat.',
    players: IF,
    routes:[
      {pi:7, wpts:[[18,0],[18,-15]],              style:'solid', color:'#ffcc00'}, // SE go/clear
      {pi:5, wpts:[[6.5,0],[6.5,-6],[12,-12]],   style:'solid', color:'#ff9966'}, // TE corner
      {pi:9, wpts:[[0,4],[8,0]],                  style:'dashed',color:'#ffcc00'}, // FB flare flat
      {pi:6, wpts:[[-18,0],[-18,-5],[-4,-5]],    style:'solid', color:'#ffcc00'}, // FL drag across
      {pi:10,wpts:[[0,7],[-5,-1]],                style:'dashed',color:'#ffcc00'}  // HB outlet
    ]
  },

  /* ── PLAY ACTION ──────────────────────────────────────────────── */

  {
    id:116, name:'PA Boot Right', formation:'I-Formation', type:'Pass', cat:'Play Action',
    desc:'Fake to HB, QB boots right. TE runs corner; FL drags across; SE stretches deep.',
    players: IF,
    routes:[
      {pi:5, wpts:[[6.5,0],[6.5,-6],[10,-11]],   style:'solid', color:'#ff9966'}, // TE corner
      {pi:6, wpts:[[-18,0],[-18,-5],[-4,-5]],    style:'solid', color:'#ffcc00'}, // FL drag
      {pi:7, wpts:[[18,0],[18,-12]],              style:'solid', color:'#ffcc00'}, // SE go
      {pi:8, wpts:[[0,1.5],[5,2]],               style:'motion',color:'#ffcc00'}, // QB boot
      {pi:10,wpts:[[0,7],[3,3]],                  style:'dashed',color:'#aaaaaa'}  // HB fake
    ]
  },
  {
    id:117, name:'PA Waggle Left', formation:'I-Formation', type:'Pass', cat:'Play Action',
    desc:'Mirror of Boot Right. Fake right; QB rolls left; FL runs flag/corner; TE drags opposite.',
    players: IF,
    routes:[
      {pi:6, wpts:[[-18,0],[-18,-6],[-22,-12]], style:'solid', color:'#ffcc00'}, // FL corner/flag
      {pi:5, wpts:[[6.5,0],[6.5,-4],[-6,-4]],   style:'solid', color:'#ff9966'}, // TE drag
      {pi:7, wpts:[[18,0],[18,-6],[6,-12]],      style:'solid', color:'#ffcc00'}, // SE post
      {pi:8, wpts:[[0,1.5],[-5,2]],             style:'motion',color:'#ffcc00'}, // QB waggle
      {pi:10,wpts:[[0,7],[-3,3]],               style:'dashed',color:'#aaaaaa'}  // HB fake
    ]
  },
  {
    id:118, name:'PA Deep Seam', formation:'Pistol', type:'Pass', cat:'Play Action',
    desc:'RB fake draws linebackers; TE shoots the seam; WRs run deep routes to occupy safeties.',
    players: PS,
    routes:[
      {pi:5, wpts:[[6.5,0],[6.5,-6],[3,-14]],   style:'solid', color:'#ff9966'}, // TE seam post
      {pi:6, wpts:[[-16,0],[-16,-8],[-6,-14]],  style:'solid', color:'#ffcc00'}, // X post
      {pi:7, wpts:[[18,0],[18,-8],[22,-14]],     style:'solid', color:'#ffcc00'}, // Z corner
      {pi:8, wpts:[[-8,0],[-8,-6]],              style:'solid', color:'#ffcc00'}, // SL sit
      {pi:10,wpts:[[0,8],[3,5]],                 style:'dashed',color:'#aaaaaa'}  // RB fake
    ]
  },

  /* ── SCREEN PLAYS ─────────────────────────────────────────────── */

  {
    id:119, name:'RB Swing Screen', formation:'Shotgun', type:'Pass', cat:'Screen Plays',
    desc:'RB drifts right as OL releases to lead-block. QB waits and dumps to the flats.',
    players: SG,
    routes:[
      {pi:10,wpts:[[-3,7],[6,5],[12,0]],          style:'solid', color:'#ffcc00'}, // RB swing/screen
      {pi:3, wpts:[[2,0],[2,2],[8,0]],            style:'solid', color:'#ff9966'}, // RG release lead
      {pi:4, wpts:[[4,0],[4,2],[10,0]],           style:'solid', color:'#ff9966'}, // RT release lead
      {pi:7, wpts:[[18,0],[18,-12]],              style:'solid', color:'#ffcc00'}, // Z go/clear
      {pi:6, wpts:[[-16,0],[-16,-10]],            style:'solid', color:'#ffcc00'}  // X go/clear
    ]
  },
  {
    id:120, name:'WR Tunnel Screen', formation:'Spread / Trips', type:'Pass', cat:'Screen Plays',
    desc:'Inside slot (Z) runs tunnel screen back through the inside gap; Y and F block outside.',
    players: TR,
    routes:[
      {pi:6, wpts:[[8,0],[3,2],[-2,-2]],          style:'solid', color:'#ffcc00'}, // Z tunnel catch→run
      {pi:7, wpts:[[13,0],[10,-2]],               style:'block', color:'#aaaaaa'}, // Y block
      {pi:8, wpts:[[18,0],[15,-1]],               style:'block', color:'#aaaaaa'}, // F block
      {pi:5, wpts:[[-18,0],[-16,-2]],             style:'block', color:'#aaaaaa'}, // X stalk
      {pi:10,wpts:[[-3,7],[-3,4]],                style:'block', color:'#ffcc00'}  // RB protect
    ]
  },


  /* ── QUICK GAME (cont.) ───────────────────────────────────── */

  {
    id:121, name:'Hitch & Go', formation:'Shotgun', type:'Pass', cat:'Quick Game',
    desc:'Pump-fake to X on the hitch; defender bites; X breaks vertical for the big play.',
    players: SG,
    routes:[
      {pi:6, wpts:[[-16,0],[-16,-5],[-10,-16]],    style:'solid', color:'#ffcc00'}, // X hitch-and-go
      {pi:7, wpts:[[18,0],[18,-10],[10,-15]],       style:'solid', color:'#ffcc00'}, // Z post clear
      {pi:8, wpts:[[-8,0],[-8,-4],[4,-4]],          style:'solid', color:'#ffcc00'}, // SL drag
      {pi:5, wpts:[[6.5,0],[6.5,-8]],               style:'solid', color:'#ff9966'}, // TE seam
      {pi:10,wpts:[[-3,7],[4,-2]],                  style:'dashed',color:'#ffcc00'}  // RB check-down
    ]
  },
  {
    id:122, name:'Slant-Flat', formation:'Shotgun', type:'Pass', cat:'Quick Game',
    desc:'Classic high-low on linebackers: X slants inside; RB releases to the flat; TE reads the void.',
    players: SG,
    routes:[
      {pi:6, wpts:[[-16,0],[-16,-2],[-4,-6]],      style:'solid', color:'#ffcc00'}, // X slant
      {pi:7, wpts:[[18,0],[18,-3],[24,-3]],         style:'solid', color:'#ffcc00'}, // Z out/clear
      {pi:5, wpts:[[6.5,0],[6.5,-5],[11,-5]],       style:'solid', color:'#ff9966'}, // TE seam high-low
      {pi:10,wpts:[[-3,7],[-10,-1]],                style:'dashed',color:'#ffcc00'}, // RB flat
      {pi:8, wpts:[[-8,0],[-8,-4]],                 style:'dashed',color:'#ffcc00'}  // SL sit/option
    ]
  },

  /* ── TIMING ROUTES / WEST COAST (cont.) ─────────────────────── */

  {
    id:123, name:'Corner Route', formation:'Singleback', type:'Pass', cat:'Timing Routes / West Coast',
    desc:'WRs run 8-yd post fake then break to corner at 45°. Beats Cover 3 deep outside.',
    players: SB,
    routes:[
      {pi:6, wpts:[[-18,0],[-18,-8],[-22,-14]],    style:'solid', color:'#ffcc00'}, // X corner
      {pi:7, wpts:[[18,0],[18,-8],[22,-14]],        style:'solid', color:'#ffcc00'}, // Z corner
      {pi:5, wpts:[[6.5,0],[6.5,-5],[3,-10]],       style:'solid', color:'#ff9966'}, // TE post
      {pi:8, wpts:[[-8,0],[-8,-5],[-2,-5]],         style:'solid', color:'#ffcc00'}, // SL sit
      {pi:10,wpts:[[0,6],[7,-2]],                   style:'dashed',color:'#ffcc00'}  // RB check-down
    ]
  },
  {
    id:124, name:'Comeback / Bench', formation:'Shotgun', type:'Pass', cat:'Timing Routes / West Coast',
    desc:'WRs sprint 12 yds then break back to the sideline. Exploits CB over-running the route.',
    players: SG,
    routes:[
      {pi:6, wpts:[[-16,0],[-16,-12],[-20,-10]],   style:'solid', color:'#ffcc00'}, // X comeback
      {pi:7, wpts:[[18,0],[18,-12],[22,-10]],       style:'solid', color:'#ffcc00'}, // Z comeback
      {pi:8, wpts:[[-8,0],[-8,-6],[-6,-4]],         style:'solid', color:'#ffcc00'}, // SL curl
      {pi:5, wpts:[[6.5,0],[6.5,-9]],               style:'solid', color:'#ff9966'}, // TE seam
      {pi:10,wpts:[[-3,7],[5,-2]],                  style:'dashed',color:'#ffcc00'}  // RB outlet
    ]
  },
  {
    id:125, name:'Double Post', formation:'Shotgun', type:'Pass', cat:'Timing Routes / West Coast',
    desc:'Both outside WRs run posts simultaneously, stressing both safeties. TE seam splits the middle.',
    players: SG,
    routes:[
      {pi:6, wpts:[[-16,0],[-16,-8],[-8,-15]],     style:'solid', color:'#ffcc00'}, // X post
      {pi:7, wpts:[[18,0],[18,-8],[10,-15]],        style:'solid', color:'#ffcc00'}, // Z post
      {pi:5, wpts:[[6.5,0],[4,-12]],                style:'solid', color:'#ff9966'}, // TE seam split
      {pi:8, wpts:[[-8,0],[-8,-7],[-1,-7]],         style:'solid', color:'#ffcc00'}, // SL dig underneath
      {pi:10,wpts:[[-3,7],[4,-2]],                  style:'dashed',color:'#ffcc00'}
    ]
  },
  {
    id:126, name:'Drive Concept', formation:'Shotgun', type:'Pass', cat:'Timing Routes / West Coast',
    desc:'SL crosses at 5 yds; TE drives high at 10 yds creating a high-low; outside WRs clear.',
    players: SG,
    routes:[
      {pi:8, wpts:[[-8,0],[-8,-5],[12,-5]],         style:'solid', color:'#ffcc00'}, // SL shallow drive
      {pi:5, wpts:[[6.5,0],[6.5,-10],[-8,-10]],     style:'solid', color:'#ff9966'}, // TE high drive cross
      {pi:7, wpts:[[18,0],[18,-15]],                style:'solid', color:'#ffcc00'}, // Z go/clear
      {pi:6, wpts:[[-16,0],[-16,-5],[-14,-3]],      style:'solid', color:'#ffcc00'}, // X hitch
      {pi:10,wpts:[[-3,7],[-7,-2]],                 style:'dashed',color:'#ffcc00'}  // RB swing
    ]
  },
  {
    id:127, name:'Switch Concept', formation:'Spread / Trips', type:'Pass', cat:'Timing Routes / West Coast',
    desc:'Inside receivers cross/switch at the LOS creating natural picks. Stresses zone and man alike.',
    players: TR,
    routes:[
      {pi:6, wpts:[[8,0],[8,-1],[14,-5]],           style:'solid', color:'#ffcc00'}, // Z out after switch
      {pi:7, wpts:[[13,0],[13,-1],[5,-6]],          style:'solid', color:'#ff9966'}, // Y in after switch
      {pi:8, wpts:[[18,0],[18,-14]],                style:'solid', color:'#ffcc00'}, // F go/clear
      {pi:5, wpts:[[-18,0],[-18,-5],[-14,-3]],      style:'solid', color:'#ffcc00'}, // X out
      {pi:10,wpts:[[-3,7],[-8,-2]],                 style:'dashed',color:'#ffcc00'}  // RB flat
    ]
  },

  /* ── DROPBACK / VERTICAL (cont.) ─────────────────────────────── */

  {
    id:128, name:'Post Route', formation:'Singleback', type:'Pass', cat:'Dropback / Vertical',
    desc:'Primary read is Z on the deep post; X digs underneath to hold the safety; TE seams the middle.',
    players: SB,
    routes:[
      {pi:7, wpts:[[18,0],[18,-8],[10,-16]],        style:'solid', color:'#ffcc00'}, // Z post primary
      {pi:6, wpts:[[-18,0],[-18,-10],[-5,-10]],     style:'solid', color:'#ffcc00'}, // X dig
      {pi:8, wpts:[[-8,0],[-8,-5],[5,-5]],          style:'solid', color:'#ffcc00'}, // SL cross
      {pi:5, wpts:[[6.5,0],[5,-9]],                 style:'solid', color:'#ff9966'}, // TE seam
      {pi:10,wpts:[[0,6],[7,-2]],                   style:'dashed',color:'#ffcc00'}
    ]
  },
  {
    id:129, name:'Sail Route', formation:'Singleback', type:'Pass', cat:'Dropback / Vertical',
    desc:'Three-level stretch: WR sails deep flag-corner; TE runs a 7-yd corner; FL hitches underneath.',
    players: SB,
    routes:[
      {pi:7, wpts:[[18,0],[22,-5],[25,-13]],        style:'solid', color:'#ffcc00'}, // Z sail (flag-corner)
      {pi:5, wpts:[[6.5,0],[8,-6],[13,-11]],        style:'solid', color:'#ff9966'}, // TE corner
      {pi:6, wpts:[[-18,0],[-18,-7],[-16,-5]],      style:'solid', color:'#ffcc00'}, // X curl
      {pi:8, wpts:[[-8,0],[-8,-3],[-14,-3]],        style:'solid', color:'#ffcc00'}, // SL flat
      {pi:10,wpts:[[0,6],[7,-2]],                   style:'dashed',color:'#ffcc00'}
    ]
  },
  {
    id:130, name:'Levels (H-Cross)', formation:'Singleback', type:'Pass', cat:'Dropback / Vertical',
    desc:'High-low crossing concept: TE shallow at 3 yds; X digs at 8 yds — two levels over the middle.',
    players: SB,
    routes:[
      {pi:5, wpts:[[6.5,0],[6.5,-3],[-12,-3]],     style:'solid', color:'#ff9966'}, // TE shallow cross
      {pi:6, wpts:[[-18,0],[-18,-8],[6,-8]],        style:'solid', color:'#ffcc00'}, // X dig
      {pi:7, wpts:[[18,0],[14,-13]],                style:'solid', color:'#ffcc00'}, // Z post clear
      {pi:8, wpts:[[-8,0],[-8,-3],[-14,-3]],        style:'solid', color:'#ffcc00'}, // SL out
      {pi:10,wpts:[[0,6],[6,-2]],                   style:'dashed',color:'#ffcc00'}
    ]
  },
  {
    id:131, name:'Comeback Route', formation:'Shotgun', type:'Pass', cat:'Dropback / Vertical',
    desc:'X runs a 14-yd comeback to the boundary; Z runs a post to hold the safety; TE corners flat.',
    players: SG,
    routes:[
      {pi:6, wpts:[[-16,0],[-20,-12],[-22,-9]],    style:'solid', color:'#ffcc00'}, // X comeback boundary
      {pi:7, wpts:[[18,0],[18,-8],[10,-14]],        style:'solid', color:'#ffcc00'}, // Z post
      {pi:8, wpts:[[-8,0],[-8,-7],[-3,-7]],         style:'solid', color:'#ffcc00'}, // SL dig
      {pi:5, wpts:[[6.5,0],[9,-6],[13,-11]],        style:'solid', color:'#ff9966'}, // TE corner
      {pi:10,wpts:[[-3,7],[5,-2]],                  style:'dashed',color:'#ffcc00'}
    ]
  },
  {
    id:132, name:'Divide (Hi-Lo Verts)', formation:'Spread / Trips', type:'Pass', cat:'Dropback / Vertical',
    desc:'Inside/outside verticals on both sides create hi-lo reads on every safety. Air Raid staple.',
    players: TR,
    routes:[
      {pi:6, wpts:[[8,0],[8,-14]],                  style:'solid', color:'#ffcc00'}, // Z seam
      {pi:7, wpts:[[13,0],[13,-14]],                style:'solid', color:'#ffcc00'}, // Y go
      {pi:8, wpts:[[18,0],[18,-8],[12,-14]],        style:'solid', color:'#ffcc00'}, // F post
      {pi:5, wpts:[[-18,0],[-18,-8],[-10,-14]],     style:'solid', color:'#ffcc00'}, // X post
      {pi:10,wpts:[[-3,7],[4,-3]],                  style:'dashed',color:'#ffcc00'}
    ]
  },

  /* ── PLAY ACTION (cont.) ──────────────────────────────────────── */

  {
    id:133, name:'PA Cross', formation:'I-Formation', type:'Pass', cat:'Play Action',
    desc:'Fake to HB; TE drags across at 8 yds; SE runs a post; FL clears underneath.',
    players: IF,
    routes:[
      {pi:5, wpts:[[6.5,0],[6.5,-8],[-10,-8]],     style:'solid', color:'#ff9966'}, // TE drag cross
      {pi:7, wpts:[[18,0],[18,-10],[8,-16]],        style:'solid', color:'#ffcc00'}, // SE post
      {pi:6, wpts:[[-18,0],[-18,-5],[-4,-5]],       style:'solid', color:'#ffcc00'}, // FL shallow cross
      {pi:10,wpts:[[0,7],[3,3]],                    style:'dashed',color:'#aaaaaa'}, // HB fake
      {pi:8, wpts:[[0,1.5],[6,2]],                  style:'motion',color:'#ffcc00'}  // QB boot right
    ]
  },
  {
    id:134, name:'PA Pop Pass', formation:'Singleback', type:'Pass', cat:'Play Action',
    desc:'Short-yardage play action: TE pops over the linebackers after fake; WRs clear vertically.',
    players: SB,
    routes:[
      {pi:5, wpts:[[6.5,0],[6.5,-5]],              style:'solid', color:'#ff9966'}, // TE pop (quick throw)
      {pi:6, wpts:[[-18,0],[-18,-12]],              style:'solid', color:'#ffcc00'}, // X fade/clear
      {pi:7, wpts:[[18,0],[14,-12]],                style:'solid', color:'#ffcc00'}, // Z post clear
      {pi:8, wpts:[[-8,0],[-8,-4],[4,-4]],          style:'solid', color:'#ffcc00'}, // SL drag
      {pi:10,wpts:[[0,6],[4,2]],                    style:'dashed',color:'#aaaaaa'}  // RB fake
    ]
  },
  {
    id:135, name:'Naked Bootleg Left', formation:'I-Formation', type:'Pass', cat:'Play Action',
    desc:'No OL protection — QB sprints left alone on the boot. FL runs corner; TE drags opposite.',
    players: IF,
    routes:[
      {pi:6, wpts:[[-18,0],[-18,-8],[-22,-13]],    style:'solid', color:'#ffcc00'}, // FL corner/flag
      {pi:5, wpts:[[6.5,0],[6.5,-5],[-4,-5]],      style:'solid', color:'#ff9966'}, // TE drag
      {pi:7, wpts:[[18,0],[18,-15]],               style:'solid', color:'#ffcc00'}, // SE go clear
      {pi:8, wpts:[[0,1.5],[-6,2]],               style:'motion',color:'#ffcc00'}, // QB naked boot left
      {pi:10,wpts:[[0,7],[4,3]],                   style:'dashed',color:'#aaaaaa'}  // HB fake right
    ]
  },

  /* ── SCREEN PLAYS (cont.) ─────────────────────────────────────── */

  {
    id:136, name:'TE Screen', formation:'Singleback', type:'Pass', cat:'Screen Plays',
    desc:'TE releases to the flat behind the line; tackle and guard release to lead-block.',
    players: SB,
    routes:[
      {pi:5, wpts:[[6.5,0],[6.5,3],[10,1]],        style:'solid', color:'#ff9966'}, // TE screen catch
      {pi:4, wpts:[[4,0],[4,2],[9,0]],              style:'solid', color:'#ff9966'}, // RT release lead
      {pi:3, wpts:[[2,0],[2,2],[7,0]],              style:'solid', color:'#ff9966'}, // RG release lead
      {pi:7, wpts:[[18,0],[18,-12]],               style:'solid', color:'#ffcc00'}, // Z go/clear
      {pi:6, wpts:[[-18,0],[-16,-3]],              style:'solid', color:'#ffcc00'}  // X stalk
    ]
  },
  {
    id:137, name:'Middle Screen', formation:'Shotgun', type:'Pass', cat:'Screen Plays',
    desc:'RB drifts up the middle as OL engages pass-rush; QB waits and dumps into the A-gap.',
    players: SG,
    routes:[
      {pi:10,wpts:[[-3,7],[0,4],[0,-1]],            style:'solid', color:'#ffcc00'}, // RB set up middle
      {pi:1, wpts:[[-2,0],[-2,2],[-1,-3]],          style:'solid', color:'#ff9966'}, // LG release lead
      {pi:3, wpts:[[2,0],[2,2],[1,-3]],             style:'solid', color:'#ff9966'}, // RG release lead
      {pi:6, wpts:[[-16,0],[-16,-12]],              style:'solid', color:'#ffcc00'}, // X go/clear
      {pi:7, wpts:[[18,0],[18,-12]],               style:'solid', color:'#ffcc00'}  // Z go/clear
    ]
  },
  {
    id:138, name:'Slip Screen', formation:'Shotgun', type:'Pass', cat:'Screen Plays',
    desc:'OL initially pass-blocks hard then releases to lead; RB swings right into open space.',
    players: SG,
    routes:[
      {pi:10,wpts:[[-3,7],[4,4],[12,2]],            style:'solid', color:'#ffcc00'}, // RB swing screen
      {pi:3, wpts:[[2,0],[2,2],[8,2]],              style:'solid', color:'#ff9966'}, // RG slip/lead
      {pi:4, wpts:[[4,0],[4,2],[10,0]],             style:'solid', color:'#ff9966'}, // RT slip/lead
      {pi:7, wpts:[[18,0],[16,-2]],                style:'block', color:'#aaaaaa'}, // Z stalk
      {pi:6, wpts:[[-16,0],[-14,-3]],              style:'solid', color:'#ffcc00'}  // X go/clear
    ]
  },
  {
    id:139, name:'Army Screen', formation:'I-Formation', type:'Pass', cat:'Screen Plays',
    desc:'Classic HB screen right; FB leads block; LG pulls to escort the ball carrier.',
    players: IF,
    routes:[
      {pi:10,wpts:[[0,7],[8,3],[12,0]],             style:'solid', color:'#ffcc00'}, // HB screen right
      {pi:9, wpts:[[0,4],[6,0]],                    style:'solid', color:'#ff6666'}, // FB lead block
      {pi:1, wpts:[[-2,0],[-2,2],[4,1]],            style:'solid', color:'#ff9966'}, // LG pull right
      {pi:6, wpts:[[-18,0],[-14,-2]],               style:'block', color:'#aaaaaa'}, // FL stalk
      {pi:7, wpts:[[18,0],[14,-2]],                style:'block', color:'#aaaaaa'}  // SE crack
    ]
  },
  {
    id:140, name:'Jailbreak Screen', formation:'Spread / Trips', type:'Pass', cat:'Screen Plays',
    desc:'Quick boundary screen to the outside WR; inside trio cracks and stalks to spring him free.',
    players: TR,
    routes:[
      {pi:8, wpts:[[18,0],[18,2],[12,0]],           style:'solid', color:'#ffcc00'}, // F boundary screen
      {pi:7, wpts:[[13,0],[12,-2]],                style:'block', color:'#aaaaaa'}, // Y crack inside
      {pi:6, wpts:[[8,0],[8,-2]],                  style:'block', color:'#aaaaaa'}, // Z crack inside
      {pi:5, wpts:[[-18,0],[-18,-12]],              style:'solid', color:'#ffcc00'}, // X go/clear
      {pi:10,wpts:[[-3,7],[-4,4]],                 style:'block', color:'#ffcc00'}  // RB protect
    ]
  },

  ]; // end PASS

  /* ═══════════════════════════════════════════════════════════════════
                           RUN PLAYS  (IDs 201-220)
  ═══════════════════════════════════════════════════════════════════ */

  const RUN = [

  /* ── INSIDE RUN / GAP SCHEME ──────────────────────────────────── */

  {
    id:201, name:'Power Right', formation:'I-Formation', type:'Run', cat:'Inside Run / Gap Scheme',
    desc:'LG pulls and leads through the hole; FB kicks out DE; HB runs off-tackle right.',
    players: IF,
    routes:[
      {pi:0, wpts:[[-4,0],[-5,-1.5]],             style:'block', color:'#ffcc00'}, // LT down
      {pi:1, wpts:[[-2,0],[-2,2],[4,1],[6,-1]],   style:'solid', color:'#ff9966'}, // LG pull right
      {pi:2, wpts:[[0,0],[0,-1.5]],               style:'block', color:'#ffcc00'}, // C combo
      {pi:3, wpts:[[2,0],[2,-1.5]],               style:'block', color:'#ffcc00'}, // RG down
      {pi:4, wpts:[[4,0],[5,-1.5]],               style:'block', color:'#ffcc00'}, // RT base
      {pi:5, wpts:[[6.5,0],[6,-1.5]],             style:'block', color:'#ffcc00'}, // TE down
      {pi:9, wpts:[[0,4],[7,-1]],                 style:'solid', color:'#ff6666'}, // FB kick-out
      {pi:10,wpts:[[0,7],[5,1],[7,4]],            style:'solid', color:'#ffffff'}  // HB path
    ]
  },
  {
    id:202, name:'Power Left', formation:'I-Formation', type:'Run', cat:'Inside Run / Gap Scheme',
    desc:'RG pulls and leads left; FB kicks out backside DE; HB runs off-tackle left.',
    players: IF,
    routes:[
      {pi:3, wpts:[[2,0],[2,2],[-4,1],[-6,-1]],  style:'solid', color:'#ff9966'}, // RG pull left
      {pi:2, wpts:[[0,0],[0,-1.5]],               style:'block', color:'#ffcc00'}, // C combo
      {pi:1, wpts:[[-2,0],[-2,-1.5]],             style:'block', color:'#ffcc00'}, // LG down
      {pi:0, wpts:[[-4,0],[-5,-1.5]],             style:'block', color:'#ffcc00'}, // LT base
      {pi:4, wpts:[[4,0],[4,-1.5]],               style:'block', color:'#ffcc00'}, // RT down
      {pi:5, wpts:[[6.5,0],[5,-1.5]],             style:'block', color:'#ffcc00'}, // TE base
      {pi:9, wpts:[[0,4],[-7,-1]],                style:'solid', color:'#ff6666'}, // FB kick-out
      {pi:10,wpts:[[0,7],[-5,1],[-7,4]],          style:'solid', color:'#ffffff'}  // HB path
    ]
  },
  {
    id:203, name:'ISO Right', formation:'I-Formation', type:'Run', cat:'Inside Run / Gap Scheme',
    desc:'FB leads through the A or B gap right; HB follows directly behind the lead block.',
    players: IF,
    routes:[
      {pi:0, wpts:[[-4,0],[-5,-1.5]],             style:'block', color:'#ffcc00'}, // LT base
      {pi:1, wpts:[[-2,0],[-2,-1.5]],             style:'block', color:'#ffcc00'}, // LG combo
      {pi:2, wpts:[[0,0],[1,-1.5]],               style:'block', color:'#ffcc00'}, // C combo
      {pi:3, wpts:[[2,0],[2,-1.5]],               style:'block', color:'#ffcc00'}, // RG base
      {pi:4, wpts:[[4,0],[4,-1.5]],               style:'block', color:'#ffcc00'}, // RT base
      {pi:5, wpts:[[6.5,0],[6,-1.5]],             style:'block', color:'#ffcc00'}, // TE base
      {pi:9, wpts:[[0,4],[2,-1]],                 style:'solid', color:'#ff6666'}, // FB ISO lead
      {pi:10,wpts:[[0,7],[2,1],[3,4]],            style:'solid', color:'#ffffff'}  // HB path
    ]
  },
  {
    id:204, name:'Trap Right', formation:'I-Formation', type:'Run', cat:'Inside Run / Gap Scheme',
    desc:'OL lets backside DE through; LG traps him; HB hits the open B-gap right.',
    players: IF,
    routes:[
      {pi:0, wpts:[[-4,0],[-4,-1.5]],             style:'block', color:'#ffcc00'}, // LT base
      {pi:1, wpts:[[-2,0],[-2,2],[3,1],[4,-1]],  style:'solid', color:'#ff9966'}, // LG trap block
      {pi:2, wpts:[[0,0],[-1,-1.5]],              style:'block', color:'#ffcc00'}, // C base
      {pi:3, wpts:[[2,0],[2,-1.5]],               style:'block', color:'#ffcc00'}, // RG double
      {pi:4, wpts:[[4,0],[4,-1.5]],               style:'block', color:'#ffcc00'}, // RT base
      {pi:5, wpts:[[6.5,0],[6,-1.5]],             style:'block', color:'#ffcc00'}, // TE base
      {pi:10,wpts:[[0,7],[3,1],[4,4]],            style:'solid', color:'#ffffff'}  // HB through hole
    ]
  },
  {
    id:205, name:'Fullback Dive', formation:'Power I', type:'Run', cat:'Inside Run / Gap Scheme',
    desc:'FB hits the A-gap directly behind the center. Short-yardage or goal-line dive play.',
    players: PI,
    routes:[
      {pi:0, wpts:[[-4,0],[-4,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-1,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[1,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[4,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[6,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:6, wpts:[[-6.5,0],[-5,-1.5]],           style:'block', color:'#ffcc00'}, // left TE
      {pi:9, wpts:[[0,4],[0,-1]],                 style:'solid', color:'#ffffff'}  // FB dive
    ]
  },
  {
    id:206, name:'Wedge', formation:'Power I', type:'Run', cat:'Inside Run / Gap Scheme',
    desc:'Goal-line or short-yardage: all interior OL and TEs wedge-block; HB follows QB sneak.',
    players: PI,
    routes:[
      {pi:0, wpts:[[-4,0],[-3,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-1,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[1,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[3,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[5,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:6, wpts:[[-6.5,0],[-5,-1.5]],           style:'block', color:'#ffcc00'},
      {pi:10,wpts:[[0,7],[0,1]],                  style:'solid', color:'#ffffff'}  // HB through wedge
    ]
  },

  /* ── ZONE SCHEME ──────────────────────────────────────────────── */

  {
    id:207, name:'Inside Zone Right', formation:'Shotgun', type:'Run', cat:'Zone Scheme',
    desc:'Full-line zone step right. RB reads playside or cuts backside based on the blocking angles.',
    players: SG,
    routes:[
      {pi:0, wpts:[[-4,0],[-3,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-1,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[1,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[3,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[5,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[7.5,-1.5]],           style:'block', color:'#ffcc00'},
      {pi:10,wpts:[[-3,7],[2,-1],[1,3]],           style:'solid', color:'#ffffff'}
    ]
  },
  {
    id:208, name:'Outside Zone Right', formation:'Singleback', type:'Run', cat:'Zone Scheme',
    desc:'Zone stretch right. WR cracks inside; RB bounces outside or cuts back to daylight.',
    players: SB,
    routes:[
      {pi:0, wpts:[[-4,0],[-3,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-1,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[1,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[3,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[5,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[8,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:7, wpts:[[18,0],[15,-2]],               style:'block', color:'#aaaaaa'}, // Z crack block
      {pi:10,wpts:[[0,6],[9,-2],[10,3]],           style:'solid', color:'#ffffff'}
    ]
  },
  {
    id:209, name:'Outside Zone Left', formation:'Singleback', type:'Run', cat:'Zone Scheme',
    desc:'Zone stretch left. WR cracks inside; RB bounces outside left or cuts back.',
    players: SB,
    routes:[
      {pi:0, wpts:[[-4,0],[-5,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-3,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[-1,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[1,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[3,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[5,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:6, wpts:[[-18,0],[-15,-2]],             style:'block', color:'#aaaaaa'}, // X crack block
      {pi:10,wpts:[[0,6],[-9,-2],[-10,3]],        style:'solid', color:'#ffffff'}
    ]
  },
  {
    id:210, name:'Wide Zone', formation:'Spread / Trips', type:'Run', cat:'Zone Scheme',
    desc:'Extra-wide stretch zone from spread look. OL stretches laterally; RB aims outside the hip of the tackle.',
    players: TR,
    routes:[
      {pi:0, wpts:[[-4,0],[-3,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-1,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[1,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[3,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[5,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[-18,0],[-16,-2]],             style:'block', color:'#aaaaaa'}, // X stalk
      {pi:7, wpts:[[13,0],[10,-2]],               style:'block', color:'#aaaaaa'}, // Y crack
      {pi:10,wpts:[[-3,7],[10,-2],[12,3]],         style:'solid', color:'#ffffff'}
    ]
  },

  /* ── MISDIRECTION ─────────────────────────────────────────────── */

  {
    id:211, name:'Counter Left', formation:'I-Formation', type:'Run', cat:'Misdirection',
    desc:'Initial flow right; RG and RT pull left to lead through the B-gap. HB counters back.',
    players: IF,
    routes:[
      {pi:0, wpts:[[-4,0],[-5,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-3,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[-1,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[2,2],[-4,1],[-5,-1]],  style:'solid', color:'#ff9966'}, // RG pull left
      {pi:4, wpts:[[4,0],[4,2],[-3,1],[-6,-1]],  style:'solid', color:'#ff9966'}, // RT pull left
      {pi:5, wpts:[[6.5,0],[6,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:9, wpts:[[0,4],[-3,2]],                 style:'solid', color:'#ff6666'}, // FB lead
      {pi:10,wpts:[[0,7],[-5,1],[-7,4]],          style:'solid', color:'#ffffff'}
    ]
  },
  {
    id:212, name:'Counter Right', formation:'I-Formation', type:'Run', cat:'Misdirection',
    desc:'Initial flow left; LG and LT pull right to lead through the B-gap. HB counters back.',
    players: IF,
    routes:[
      {pi:3, wpts:[[2,0],[3,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[1,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-2,2],[4,1],[5,-1]],   style:'solid', color:'#ff9966'}, // LG pull right
      {pi:0, wpts:[[-4,0],[-4,2],[3,1],[6,-1]],   style:'solid', color:'#ff9966'}, // LT pull right
      {pi:4, wpts:[[4,0],[4,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[6,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:9, wpts:[[0,4],[3,2]],                  style:'solid', color:'#ff6666'}, // FB lead
      {pi:10,wpts:[[0,7],[5,1],[7,4]],            style:'solid', color:'#ffffff'}
    ]
  },
  {
    id:213, name:'Jet Sweep Right', formation:'Spread / Trips', type:'Run', cat:'Misdirection',
    desc:'WR goes in motion pre-snap and receives a jet handoff at full speed; OL seals inside.',
    players: TR,
    routes:[
      {pi:5, wpts:[[-18,0],[-18,1],[0,1],[18,-3]], style:'motion',color:'#ffcc00'}, // X jet motion
      {pi:0, wpts:[[-4,0],[-5,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-2,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[2,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[4,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:7, wpts:[[13,0],[10,-2]],                style:'block', color:'#aaaaaa'}  // Y seal block
    ]
  },
  {
    id:214, name:'Reverse Right', formation:'Spread / Trips', type:'Run', cat:'Misdirection',
    desc:'QB fakes handoff to RB going left; hands to WR coming right on the reverse.',
    players: TR,
    routes:[
      {pi:10,wpts:[[-3,7],[-8,-2]],               style:'dashed',color:'#aaaaaa'}, // RB fake left
      {pi:5, wpts:[[-18,0],[-18,1],[0,1],[14,-2]], style:'motion',color:'#ffffff'}, // X reverse carry
      {pi:0, wpts:[[-4,0],[-5,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-2,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[2,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[4,-1.5]],                style:'block', color:'#ffcc00'}
    ]
  },

  /* ── OPTION / PERIMETER ───────────────────────────────────────── */

  {
    id:215, name:'Read Option', formation:'Pistol', type:'Run', cat:'Option / Perimeter',
    desc:'QB reads the unblocked DE: if DE crashes, QB keeps and runs outside; if DE holds, RB gets the hand-off.',
    players: PS,
    routes:[
      {pi:0, wpts:[[-4,0],[-5,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-2,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[2,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[4,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[6,-1.5]],             style:'block', color:'#ffcc00'}, // TE (read key — not blocked)
      {pi:10,wpts:[[0,8],[4,1],[6,4]],            style:'solid', color:'#ffffff'}, // RB hand-off path
      {pi:9, wpts:[[0,4],[8,-1]],                 style:'dashed',color:'#ffcc00'}  // QB keep path
    ]
  },
  {
    id:216, name:'Speed Option Right', formation:'Shotgun', type:'Run', cat:'Option / Perimeter',
    desc:'QB and RB run speed option to the right. QB pitches if the pitch-key defender attacks.',
    players: SG,
    routes:[
      {pi:0, wpts:[[-4,0],[-4,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-2,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[2,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[4,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:6, wpts:[[-16,0],[-14,-2]],             style:'block', color:'#aaaaaa'}, // X stalk
      {pi:9, wpts:[[0,7],[8,-2],[10,2]],          style:'solid', color:'#ffcc00'}, // QB option run
      {pi:10,wpts:[[-3,7],[5,-2],[12,0]],         style:'dashed',color:'#ffffff'}  // RB pitch path
    ]
  },
  {
    id:217, name:'Toss Sweep Right', formation:'I-Formation', type:'Run', cat:'Option / Perimeter',
    desc:'QB tosses to HB sweeping right; FL blocks inside; TE kicks out the DE.',
    players: IF,
    routes:[
      {pi:0, wpts:[[-4,0],[-5,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-2,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[2,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[4,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[8,-2]],               style:'block', color:'#ffcc00'}, // TE kick-out
      {pi:6, wpts:[[-18,0],[-12,-2]],             style:'block', color:'#aaaaaa'}, // FL crack/block
      {pi:9, wpts:[[0,4],[3,2]],                  style:'solid', color:'#ff6666'}, // FB lead
      {pi:10,wpts:[[0,7],[12,-3],[14,2]],         style:'solid', color:'#ffffff'}  // HB sweep
    ]
  },
  {
    id:218, name:'Toss Sweep Left', formation:'I-Formation', type:'Run', cat:'Option / Perimeter',
    desc:'QB tosses to HB sweeping left; SE blocks inside; left TE kicks out DE.',
    players: IF,
    routes:[
      {pi:0, wpts:[[-4,0],[-5,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-3,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[2,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[4,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:7, wpts:[[18,0],[12,-2]],               style:'block', color:'#aaaaaa'}, // SE crack/block
      {pi:9, wpts:[[0,4],[-3,2]],                 style:'solid', color:'#ff6666'}, // FB lead
      {pi:10,wpts:[[0,7],[-12,-3],[-14,2]],       style:'solid', color:'#ffffff'}  // HB sweep
    ]
  },

  /* ── SPECIAL / GOAL LINE ──────────────────────────────────────── */

  {
    id:219, name:'QB Draw', formation:'Shotgun', type:'Run', cat:'Special / Goal Line',
    desc:'QB fakes pass, waits for OL to engage pass-rushers, then runs through the vacated A-gap.',
    players: SG,
    routes:[
      {pi:0, wpts:[[-4,0],[-3,-2]],               style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-1,-2]],               style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-2]],                 style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[1,-2]],                 style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[3,-2]],                 style:'block', color:'#ffcc00'},
      {pi:6, wpts:[[-16,0],[-16,-8]],             style:'solid', color:'#ffcc00'}, // X go/clear
      {pi:7, wpts:[[18,0],[18,-8]],               style:'solid', color:'#ffcc00'}, // Z go/clear
      {pi:9, wpts:[[0,7],[0,-3],[2,2]],           style:'solid', color:'#ffffff'}  // QB draw
    ]
  },
  {
    id:220, name:'QB Sneak', formation:'Power I', type:'Run', cat:'Special / Goal Line',
    desc:'Short-yardage / goal-line. QB sneaks directly behind the center into the A-gap.',
    players: PI,
    routes:[
      {pi:0, wpts:[[-4,0],[-4,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-1,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[1,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[4,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[5,-1.5]],             style:'block', color:'#ffcc00'},
      {pi:6, wpts:[[-6.5,0],[-5,-1.5]],           style:'block', color:'#ffcc00'},
      {pi:8, wpts:[[0,1.5],[0,-1]],               style:'solid', color:'#ffffff'}  // QB sneak
    ]
  },


  /* ── INSIDE RUN / GAP SCHEME (cont.) ─────────────────────── */

  {
    id:221, name:'G-T Counter Right', formation:'I-Formation', type:'Run', cat:'Inside Run / Gap Scheme',
    desc:'Guard and tackle pull right through the C-gap; FB seals backside; HB counters off their blocks.',
    players: IF,
    routes:[
      {pi:0, wpts:[[-4,0],[-5,-1.5]],              style:'block', color:'#ffcc00'}, // LT down
      {pi:1, wpts:[[-2,0],[-3,-1.5]],              style:'block', color:'#ffcc00'}, // LG down
      {pi:2, wpts:[[0,0],[-1,-1.5]],               style:'block', color:'#ffcc00'}, // C base
      {pi:3, wpts:[[2,0],[2,2],[7,0],[8,-1]],      style:'solid', color:'#ff9966'}, // RG pull right
      {pi:4, wpts:[[4,0],[4,2],[8,0],[9,-1]],      style:'solid', color:'#ff9966'}, // RT pull right
      {pi:5, wpts:[[6.5,0],[5,-1.5]],              style:'block', color:'#ffcc00'}, // TE release
      {pi:9, wpts:[[0,4],[5,0]],                   style:'solid', color:'#ff6666'}, // FB lead seal
      {pi:10,wpts:[[0,7],[6,1],[8,4]],             style:'solid', color:'#ffffff'}  // HB counter right
    ]
  },
  {
    id:222, name:'Double-Team Blast', formation:'I-Formation', type:'Run', cat:'Inside Run / Gap Scheme',
    desc:'C and RG combo double-team the nose; FB isolates the linebacker; HB hits the gap hard.',
    players: IF,
    routes:[
      {pi:0, wpts:[[-4,0],[-5,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-2,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[1,-2]],                  style:'block', color:'#ff9966'}, // C combo double
      {pi:3, wpts:[[2,0],[1,-2]],                  style:'block', color:'#ff9966'}, // RG combo double
      {pi:4, wpts:[[4,0],[5,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[6,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:9, wpts:[[0,4],[2,-1]],                  style:'solid', color:'#ff6666'}, // FB iso LB
      {pi:10,wpts:[[0,7],[2,1],[3,4]],             style:'solid', color:'#ffffff'}
    ]
  },
  {
    id:223, name:'Lead Draw', formation:'Singleback', type:'Run', cat:'Inside Run / Gap Scheme',
    desc:'OL shows pass-block; QB delays; RB takes draw with SL as a crack-blocker on the MIKE.',
    players: SB,
    routes:[
      {pi:0, wpts:[[-4,0],[-4,-2]],                style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-1,-2]],                style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-2]],                  style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[1,-2]],                  style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[4,-2]],                  style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[6,-2]],                style:'block', color:'#ffcc00'},
      {pi:8, wpts:[[-8,0],[-5,-2]],                style:'block', color:'#aaaaaa'}, // SL crack block
      {pi:10,wpts:[[0,6],[0,3],[2,-3]],            style:'solid', color:'#ffffff'}  // RB delayed draw
    ]
  },
  {
    id:224, name:'Belly Right', formation:'I-Formation', type:'Run', cat:'Inside Run / Gap Scheme',
    desc:'FB takes the belly path off-tackle right; HB fakes outside to freeze the defense.',
    players: IF,
    routes:[
      {pi:0, wpts:[[-4,0],[-5,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-2,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[1,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[3,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[5,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[8,-1.5]],              style:'block', color:'#ffcc00'}, // TE kick-out
      {pi:9, wpts:[[0,4],[5,0],[6,3]],             style:'solid', color:'#ffffff'}, // FB belly right
      {pi:10,wpts:[[0,7],[8,-1]],                  style:'dashed',color:'#aaaaaa'}  // HB fake outside
    ]
  },

  /* ── ZONE SCHEME (cont.) ──────────────────────────────────────── */

  {
    id:225, name:'Cut-Back Zone', formation:'Singleback', type:'Run', cat:'Zone Scheme',
    desc:'Zone left; RB reads the backside and cuts back against the grain into the open crease.',
    players: SB,
    routes:[
      {pi:0, wpts:[[-4,0],[-5,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-3,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[-1,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[1,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[3,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[5,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:6, wpts:[[-18,0],[-15,-2]],              style:'block', color:'#aaaaaa'}, // X stalk
      {pi:10,wpts:[[0,6],[-3,-1],[4,3]],           style:'solid', color:'#ffffff'}  // RB zone then cut-back
    ]
  },
  {
    id:226, name:'Split Zone', formation:'Singleback', type:'Run', cat:'Zone Scheme',
    desc:'OL zones right; H-back (slot) kicks out the backside DE; RB reads and bounces or cuts.',
    players: SB,
    routes:[
      {pi:0, wpts:[[-4,0],[-3,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-1,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[1,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[3,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[5,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[7.5,-1.5]],            style:'block', color:'#ffcc00'},
      {pi:8, wpts:[[-8,0],[-5,-1.5]],              style:'block', color:'#ff9966'}, // H-back kick-out DE
      {pi:10,wpts:[[0,6],[7,-1],[8,3]],            style:'solid', color:'#ffffff'}
    ]
  },
  {
    id:227, name:'Duo Run', formation:'Shotgun', type:'Run', cat:'Zone Scheme',
    desc:'Double-team zone blocking scheme: every down lineman fires a combo with his neighbor.',
    players: SG,
    routes:[
      {pi:0, wpts:[[-4,0],[-3,-2]],                style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-3,-2]],                style:'block', color:'#ff9966'}, // LG doubles with LT
      {pi:2, wpts:[[0,0],[1,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[1,-2]],                  style:'block', color:'#ff9966'}, // RG doubles with C
      {pi:4, wpts:[[4,0],[5,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[5,-2]],                style:'block', color:'#ff9966'}, // TE doubles with RT
      {pi:10,wpts:[[-3,7],[3,-2],[5,2]],           style:'solid', color:'#ffffff'}
    ]
  },
  {
    id:228, name:'Zone-Read Left', formation:'Pistol', type:'Run', cat:'Zone Scheme',
    desc:'Mirror of standard read option: OL zones left; QB reads the backside DE and keeps or hands.',
    players: PS,
    routes:[
      {pi:0, wpts:[[-4,0],[-5,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-3,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[-1,-1.5]],               style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[1,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[3,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[6,-1.5]],              style:'block', color:'#ffcc00'}, // TE read key (unblocked)
      {pi:10,wpts:[[0,8],[-6,-2],[-7,3]],          style:'solid', color:'#ffffff'}, // RB zone left
      {pi:9, wpts:[[0,4],[8,-2]],                  style:'dashed',color:'#ffcc00'}  // QB keep right (read)
    ]
  },

  /* ── MISDIRECTION (cont.) ─────────────────────────────────────── */

  {
    id:229, name:'Fly Sweep Left', formation:'Spread / Trips', type:'Run', cat:'Misdirection',
    desc:'F goes in motion from right to left at full speed and receives a jet handoff going left.',
    players: TR,
    routes:[
      {pi:8, wpts:[[18,0],[18,1],[-2,1],[-20,-3]], style:'motion',color:'#ffffff'}, // F fly sweep left
      {pi:5, wpts:[[-18,0],[-14,-2]],              style:'block', color:'#aaaaaa'}, // X stalk
      {pi:0, wpts:[[-4,0],[-5,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-2,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[2,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[4,-1.5]],                style:'block', color:'#ffcc00'}
    ]
  },
  {
    id:230, name:'Halfback Pass', formation:'I-Formation', type:'Run', cat:'Misdirection',
    desc:'Trick play: HB receives a pitch and throws a deep strike to the SE. Defense expects run.',
    players: IF,
    routes:[
      {pi:10,wpts:[[0,7],[10,-1]],                 style:'solid', color:'#ffcc00'}, // HB receives pitch, rolls right
      {pi:7, wpts:[[18,0],[10,-14]],               style:'solid', color:'#ff9966'}, // SE go deep post
      {pi:6, wpts:[[-18,0],[-18,-12]],             style:'solid', color:'#ffcc00'}, // FL go/clear
      {pi:5, wpts:[[6.5,0],[8,-8]],                style:'solid', color:'#ff9966'}, // TE flat outlet
      {pi:9, wpts:[[0,4],[3,0]],                   style:'solid', color:'#ff6666'}  // FB lead/protect
    ]
  },
  {
    id:231, name:'End-Around Left', formation:'Singleback', type:'Run', cat:'Misdirection',
    desc:'Z goes in motion from right; QB hands to Z running left; LG pulls to lead the way.',
    players: SB,
    routes:[
      {pi:7, wpts:[[18,0],[18,1],[0,1],[-14,-3]], style:'motion',color:'#ffffff'}, // Z end-around left
      {pi:1, wpts:[[-2,0],[-2,2],[-8,1]],          style:'solid', color:'#ff9966'}, // LG pull left
      {pi:0, wpts:[[-4,0],[-5,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[1,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:6, wpts:[[-18,0],[-15,-2]],              style:'block', color:'#aaaaaa'}, // X crack block
      {pi:10,wpts:[[0,6],[6,-1]],                  style:'dashed',color:'#aaaaaa'}  // RB fake inside
    ]
  },
  {
    id:232, name:'Statue of Liberty', formation:'Singleback', type:'Run', cat:'Misdirection',
    desc:'QB raises arm in throwing motion; RB sweeps left taking a hand-off behind him. Classic trick.',
    players: SB,
    routes:[
      {pi:10,wpts:[[0,6],[-8,-3],[-12,0]],         style:'solid', color:'#ffffff'}, // RB Statue sweep left
      {pi:1, wpts:[[-2,0],[-2,2],[-6,1]],           style:'solid', color:'#ff9966'}, // LG pull left
      {pi:0, wpts:[[-4,0],[-5,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:8, wpts:[[-8,0],[-8,-2]],                style:'block', color:'#aaaaaa'}, // SL inside crack
      {pi:6, wpts:[[-18,0],[-15,-2]],              style:'block', color:'#aaaaaa'}, // X stalk
      {pi:5, wpts:[[6.5,0],[5,-1.5]],              style:'block', color:'#ffcc00'}  // TE seal inside
    ]
  },

  /* ── OPTION / PERIMETER (cont.) ───────────────────────────────── */

  {
    id:233, name:'Triple Option', formation:'Power I', type:'Run', cat:'Option / Perimeter',
    desc:'QB reads two defenders: first gives to FB on dive; if he crashes, QB keeps or pitches to HB.',
    players: PI,
    routes:[
      {pi:0, wpts:[[-4,0],[-5,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-2,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[2,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[4,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:9, wpts:[[0,4],[0,-2]],                  style:'solid', color:'#ffffff'}, // FB dive (give)
      {pi:8, wpts:[[0,1.5],[8,-2]],                style:'dashed',color:'#ffcc00'}, // QB keep path
      {pi:10,wpts:[[0,7],[10,-1],[12,2]],           style:'dashed',color:'#aaaaaa'}  // HB pitch path
    ]
  },
  {
    id:234, name:'Inverted Veer', formation:'Pistol', type:'Run', cat:'Option / Perimeter',
    desc:'TE kicks out the DE (not left unblocked); RB reads inside; QB reads outside DE and keeps.',
    players: PS,
    routes:[
      {pi:5, wpts:[[6.5,0],[8,-1.5]],              style:'block', color:'#ff9966'}, // TE kick-out
      {pi:0, wpts:[[-4,0],[-4,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-2,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[2,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[4,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:10,wpts:[[0,8],[3,-2],[4,2]],            style:'solid', color:'#ffffff'}, // RB inside read
      {pi:9, wpts:[[0,4],[8,-2]],                  style:'dashed',color:'#ffcc00'}  // QB keep outside
    ]
  },
  {
    id:235, name:'Arc Option Left', formation:'Power I', type:'Run', cat:'Option / Perimeter',
    desc:'QB sprints left with HB as the pitch man; left TE seals; FB arcs to lead block the CB.',
    players: PI,
    routes:[
      {pi:0, wpts:[[-4,0],[-5,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-3,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[2,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[4,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:6, wpts:[[-6.5,0],[-5,-1.5]],            style:'block', color:'#ffcc00'}, // left TE seal
      {pi:9, wpts:[[0,4],[-8,-1]],                 style:'solid', color:'#ff6666'}, // FB arc lead
      {pi:8, wpts:[[0,1.5],[-8,-2]],               style:'dashed',color:'#ffcc00'}, // QB option left
      {pi:10,wpts:[[0,7],[-12,-3],[-14,1]],        style:'dashed',color:'#aaaaaa'}  // HB pitch path
    ]
  },
  {
    id:236, name:'Rocket Toss', formation:'Shotgun', type:'Run', cat:'Option / Perimeter',
    desc:'QB immediately tosses to RB sweeping hard right; TE kicks out the DE; OL zones.',
    players: SG,
    routes:[
      {pi:0, wpts:[[-4,0],[-3,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-1,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[1,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[3,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[5,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[8,-1.5]],              style:'block', color:'#ff9966'}, // TE kick-out
      {pi:6, wpts:[[-16,0],[-14,-2]],              style:'block', color:'#aaaaaa'}, // X stalk
      {pi:10,wpts:[[-3,7],[8,-3],[12,2]],           style:'solid', color:'#ffffff'}  // RB toss sweep right
    ]
  },

  /* ── SPECIAL / GOAL LINE (cont.) ─────────────────────────────── */

  {
    id:237, name:'Sprint Draw', formation:'Shotgun', type:'Run', cat:'Special / Goal Line',
    desc:'QB sprints right showing pass; hands back to RB on a draw cutting opposite through the vacated gap.',
    players: SG,
    routes:[
      {pi:0, wpts:[[-4,0],[-4,-2]],                style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-2,-2]],                style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-2]],                  style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[2,-2]],                  style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[4,-2]],                  style:'block', color:'#ffcc00'},
      {pi:6, wpts:[[-16,0],[-16,-10]],             style:'solid', color:'#ffcc00'}, // X go/clear
      {pi:9, wpts:[[0,7],[5,5]],                   style:'dashed',color:'#ffcc00'}, // QB sprint right
      {pi:10,wpts:[[-3,7],[0,5],[3,-2]],           style:'solid', color:'#ffffff'}  // RB draw cutback
    ]
  },
  {
    id:238, name:'Bootleg Run', formation:'I-Formation', type:'Run', cat:'Special / Goal Line',
    desc:'QB keeps on a pure bootleg right — no pass fake — and runs for the corner with FB escort.',
    players: IF,
    routes:[
      {pi:0, wpts:[[-4,0],[-5,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-2,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[3,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:4, wpts:[[4,0],[4,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[8,-1.5]],              style:'block', color:'#ffcc00'}, // TE kick-out
      {pi:7, wpts:[[18,0],[14,-2]],                style:'block', color:'#aaaaaa'}, // SE crack
      {pi:9, wpts:[[0,4],[5,0]],                   style:'solid', color:'#ff6666'}, // FB lead right
      {pi:8, wpts:[[0,1.5],[8,-2],[10,2]],         style:'solid', color:'#ffffff'}, // QB bootleg right
      {pi:10,wpts:[[0,7],[-4,2]],                  style:'dashed',color:'#aaaaaa'}  // HB fake left
    ]
  },
  {
    id:239, name:'Shovel Pass Option', formation:'Pistol', type:'Run', cat:'Special / Goal Line',
    desc:'QB rolls out with the option to keep or shovel pass to RB running underneath through the gap.',
    players: PS,
    routes:[
      {pi:9, wpts:[[0,4],[5,1]],                   style:'motion',color:'#ffcc00'}, // QB roll right
      {pi:10,wpts:[[0,8],[2,3],[3,-1]],            style:'solid', color:'#ffffff'}, // RB shovel target
      {pi:5, wpts:[[6.5,0],[7,-1.5]],              style:'block', color:'#ffcc00'}, // TE seal
      {pi:0, wpts:[[-4,0],[-4,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-2,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[2,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:8, wpts:[[-8,0],[-8,-10]],               style:'solid', color:'#ffcc00'}  // SL go/clear
    ]
  },
  {
    id:240, name:'QB Keeper Right', formation:'Singleback', type:'Run', cat:'Special / Goal Line',
    desc:'Designed QB keeper right; RG pulls to lead; RB fakes inside to freeze linebackers.',
    players: SB,
    routes:[
      {pi:0, wpts:[[-4,0],[-5,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:1, wpts:[[-2,0],[-2,-1.5]],              style:'block', color:'#ffcc00'},
      {pi:2, wpts:[[0,0],[0,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:3, wpts:[[2,0],[2,2],[7,0]],             style:'solid', color:'#ff9966'}, // RG pull right
      {pi:4, wpts:[[4,0],[5,-1.5]],                style:'block', color:'#ffcc00'},
      {pi:5, wpts:[[6.5,0],[8,-1.5]],              style:'block', color:'#ffcc00'}, // TE kick-out
      {pi:6, wpts:[[-18,0],[-14,-2]],              style:'block', color:'#aaaaaa'}, // X stalk
      {pi:8, wpts:[[-8,0],[-5,-2]],                style:'block', color:'#aaaaaa'}, // SL crack
      {pi:9, wpts:[[0,1.5],[8,-2],[10,2]],         style:'solid', color:'#ffffff'}, // QB keeper right
      {pi:10,wpts:[[0,6],[0,2]],                   style:'dashed',color:'#aaaaaa'}  // RB fake inside
    ]
  },

  ]; // end RUN

  /* ═══════════════════════════════════════════════════════════════════
                         DEFENSE PLAYS  (IDs 301-320)
  ═══════════════════════════════════════════════════════════════════ */

  const DEF = [

  /* ── ZONE COVERAGE ────────────────────────────────────────────── */

  {
    id:301, name:'Cover 2', formation:'4-3', type:'Defense', cat:'Zone Coverage', mode:'defense',
    desc:'Two-deep halves. CBs press and flatten to flats; SS/FS split deep field; underneath zones.',
    players: D43,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],          style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],             style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-9,-4],[-14,-7]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:5, wpts:[[0,-4],[0,-8]],                 style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:6, wpts:[[9,-4],[14,-7]],                style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:7, wpts:[[-18,-2],[-15,-5]],             style:'solid', color:'#ff9966',assign:'cover'},
      {pi:8, wpts:[[18,-2],[15,-5]],               style:'solid', color:'#ff9966',assign:'cover'},
      {pi:9, wpts:[[-5,-9],[-12,-14]],             style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[5,-13],[12,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:302, name:'Cover 3', formation:'3-4', type:'Defense', cat:'Zone Coverage', mode:'defense',
    desc:'Three-deep zone. CBs own deep outside thirds; FS covers deep middle; four underneath zones.',
    players: D34,
    routes:[
      {pi:0, wpts:[[-5,-1],[-5,-4]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[0,-1],[0,-4]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[5,-1],[5,-4]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[-8,-3],[-13,-7]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:4, wpts:[[-2,-4.5],[-4,-8]],            style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:5, wpts:[[2,-4.5],[4,-8]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:6, wpts:[[8,-3],[13,-7]],                style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:7, wpts:[[-18,-2],[-18,-14]],            style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:8, wpts:[[18,-2],[18,-14]],              style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:9, wpts:[[-4,-9],[-9,-12]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[4,-13],[0,-14]],               style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:303, name:'Quarters (Cover 4)', formation:'Nickel', type:'Defense', cat:'Zone Coverage', mode:'defense',
    desc:'Four deep defenders each own a quarter. CBs and safeties match vertical routes; LBs underneath.',
    players: DNK,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],          style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],             style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-4,-4],[-8,-8]],               style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:5, wpts:[[4,-4],[8,-8]],                 style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:6, wpts:[[-18,-2],[-18,-12]],            style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:7, wpts:[[18,-2],[18,-12]],              style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:8, wpts:[[-10,-4],[-14,-9]],             style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:9, wpts:[[-4,-9],[-9,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[4,-13],[9,-14]],               style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:304, name:'Tampa 2', formation:'4-3', type:'Defense', cat:'Zone Coverage', mode:'defense',
    desc:'Cover 2 variation: MLB drops to the deep middle seam; CBs and safeties play normal Cover 2.',
    players: D43,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],          style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],             style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-9,-4],[-14,-7]],              style:'dashed',color:'#4a9eff',assign:'zone'}, // OLB flat
      {pi:5, wpts:[[0,-4],[0,-12]],                style:'dashed',color:'#ff9966',assign:'zone'}, // MLB drops deep middle
      {pi:6, wpts:[[9,-4],[14,-7]],                style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:7, wpts:[[-18,-2],[-15,-5]],             style:'solid', color:'#ff9966',assign:'cover'},
      {pi:8, wpts:[[18,-2],[15,-5]],               style:'solid', color:'#ff9966',assign:'cover'},
      {pi:9, wpts:[[-5,-9],[-12,-14]],             style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[5,-13],[12,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:305, name:'Cover 6', formation:'Nickel', type:'Defense', cat:'Zone Coverage', mode:'defense',
    desc:'Quarter-Quarter-Half: boundary CB plays quarter coverage; field side plays Cover 2 half.',
    players: DNK,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],          style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],             style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-4,-4],[-8,-7]],               style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:5, wpts:[[4,-4],[8,-7]],                 style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:6, wpts:[[-18,-2],[-18,-12]],            style:'dashed',color:'#ff9966',assign:'zone'}, // CB quarter
      {pi:7, wpts:[[18,-2],[16,-6]],               style:'solid', color:'#ff9966',assign:'cover'}, // CB flatten
      {pi:8, wpts:[[-10,-4],[-14,-9]],             style:'dashed',color:'#4a9eff',assign:'zone'}, // NB quarter
      {pi:9, wpts:[[-4,-9],[-9,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'}, // SS quarter
      {pi:10,wpts:[[4,-13],[10,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'}  // FS deep half
    ]
  },
  {
    id:306, name:'Cover 3 Buzz', formation:'Nickel', type:'Defense', cat:'Zone Coverage', mode:'defense',
    desc:'Cover 3 with SS rotating to the boundary flat. FS holds middle; CBs take deep thirds.',
    players: DNK,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],          style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],             style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-4,-4],[-6,-7]],               style:'dashed',color:'#4a9eff',assign:'zone'}, // LB hook
      {pi:5, wpts:[[4,-4],[6,-7]],                 style:'dashed',color:'#4a9eff',assign:'zone'}, // LB hook
      {pi:6, wpts:[[-18,-2],[-18,-14]],            style:'dashed',color:'#ff9966',assign:'zone'}, // CB deep third
      {pi:7, wpts:[[18,-2],[18,-14]],              style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:8, wpts:[[-10,-4],[-14,-7]],             style:'dashed',color:'#4a9eff',assign:'zone'}, // NB flat
      {pi:9, wpts:[[-4,-9],[-14,-7]],              style:'dashed',color:'#4a9eff',assign:'zone'}, // SS buzz to flat
      {pi:10,wpts:[[4,-13],[0,-14]],               style:'dashed',color:'#4a9eff',assign:'zone'}  // FS deep middle
    ]
  },

  /* ── MAN COVERAGE ─────────────────────────────────────────────── */

  {
    id:307, name:'Cover 1 Robber', formation:'4-3', type:'Defense', cat:'Man Coverage', mode:'defense',
    desc:'Man coverage across the board with one free safety. MLB lurks underneath as a "robber" on crossing routes.',
    players: D43,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],          style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],             style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-9,-4],[-18,-4]],              style:'solid', color:'#4a9eff',assign:'cover'}, // OLB man WR
      {pi:5, wpts:[[0,-4],[0,-7]],                 style:'dashed',color:'#ff9966',assign:'zone'},  // MLB robber zone
      {pi:6, wpts:[[9,-4],[6.5,-4]],               style:'solid', color:'#4a9eff',assign:'cover'}, // OLB man TE
      {pi:7, wpts:[[-18,-2],[-18,-6]],             style:'solid', color:'#ff9966',assign:'cover'}, // CB man
      {pi:8, wpts:[[18,-2],[18,-6]],               style:'solid', color:'#ff9966',assign:'cover'},
      {pi:9, wpts:[[-5,-9],[0,-4]],                style:'dashed',color:'#4a9eff',assign:'zone'},  // SS rotates
      {pi:10,wpts:[[5,-13],[0,-14]],               style:'dashed',color:'#4a9eff',assign:'zone'}   // FS deep
    ]
  },
  {
    id:308, name:'Cover 1 Press', formation:'4-3', type:'Defense', cat:'Man Coverage', mode:'defense',
    desc:'Tight press man coverage; CBs jam at the line; single-high FS plays center field.',
    players: D43,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],          style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],             style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-9,-4],[-16,-4]],              style:'solid', color:'#4a9eff',assign:'cover'},
      {pi:5, wpts:[[0,-4],[6.5,-4]],               style:'solid', color:'#4a9eff',assign:'cover'},
      {pi:6, wpts:[[9,-4],[-1,-4]],                style:'solid', color:'#4a9eff',assign:'cover'},
      {pi:7, wpts:[[-18,-2],[-18,-8]],             style:'solid', color:'#ff9966',assign:'cover'}, // CB press trail
      {pi:8, wpts:[[18,-2],[18,-8]],               style:'solid', color:'#ff9966',assign:'cover'},
      {pi:9, wpts:[[-5,-9],[-2,-12]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[5,-13],[0,-14]],               style:'dashed',color:'#4a9eff',assign:'zone'}   // FS center field
    ]
  },
  {
    id:309, name:'Cover 0 Man', formation:'4-3', type:'Defense', cat:'Man Coverage', mode:'defense',
    desc:'Pure man coverage with no deep safety. All 11 defenders assigned; maximum pressure package.',
    players: D43,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],          style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],             style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-9,-4],[-17,-4]],              style:'solid', color:'#4a9eff',assign:'cover'},
      {pi:5, wpts:[[0,-4],[7,-4]],                 style:'solid', color:'#4a9eff',assign:'cover'}, // MLB on TE
      {pi:6, wpts:[[9,-4],[-1,-4]],                style:'solid', color:'#4a9eff',assign:'cover'},
      {pi:7, wpts:[[-18,-2],[-18,-8]],             style:'solid', color:'#ff9966',assign:'cover'},
      {pi:8, wpts:[[18,-2],[18,-8]],               style:'solid', color:'#ff9966',assign:'cover'},
      {pi:9, wpts:[[-5,-9],[-8,-4]],               style:'solid', color:'#4a9eff',assign:'cover'}, // SS man
      {pi:10,wpts:[[5,-13],[0,-5]],                style:'solid', color:'#4a9eff',assign:'cover'}  // FS man
    ]
  },
  {
    id:310, name:'Cover 2 Man Under', formation:'Nickel', type:'Defense', cat:'Man Coverage', mode:'defense',
    desc:'Two deep safeties (zone) with man coverage underneath. CBs and LBs in tight man; safeties help over top.',
    players: DNK,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],          style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],             style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-4,-4],[-4,-8]],               style:'solid', color:'#4a9eff',assign:'cover'}, // LB man RB
      {pi:5, wpts:[[4,-4],[6.5,-4]],               style:'solid', color:'#4a9eff',assign:'cover'}, // LB man TE
      {pi:6, wpts:[[-18,-2],[-18,-8]],             style:'solid', color:'#ff9966',assign:'cover'}, // CB man
      {pi:7, wpts:[[18,-2],[18,-8]],               style:'solid', color:'#ff9966',assign:'cover'},
      {pi:8, wpts:[[-10,-4],[-14,-8]],             style:'solid', color:'#4a9eff',assign:'cover'}, // NB man slot
      {pi:9, wpts:[[-4,-9],[-12,-14]],             style:'dashed',color:'#4a9eff',assign:'zone'},  // SS deep half
      {pi:10,wpts:[[4,-13],[12,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:311, name:'2-Man (Dime)', formation:'Dime', type:'Defense', cat:'Man Coverage', mode:'defense',
    desc:'Dime package: man coverage underneath with two-deep safety help over the top.',
    players: DDM,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],          style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-1.5,-1],[-1.5,-4]],          style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[1.5,-1],[1.5,-4]],            style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],             style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[0,-4],[0,-6]],                 style:'solid', color:'#4a9eff',assign:'cover'}, // LB man RB
      {pi:5, wpts:[[-18,-2],[-18,-9]],             style:'solid', color:'#ff9966',assign:'cover'}, // CB man
      {pi:6, wpts:[[18,-2],[18,-9]],               style:'solid', color:'#ff9966',assign:'cover'},
      {pi:7, wpts:[[-11,-4],[-8,-8]],              style:'solid', color:'#4a9eff',assign:'cover'}, // DB man slot
      {pi:8, wpts:[[11,-4],[8,-8]],                style:'solid', color:'#4a9eff',assign:'cover'},
      {pi:9, wpts:[[-5,-9],[-12,-14]],             style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[5,-12],[12,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },

  /* ── BLITZ / PRESSURE ─────────────────────────────────────────── */

  {
    id:312, name:'Fire Zone Blitz', formation:'4-3', type:'Defense', cat:'Blitz / Pressure', mode:'defense',
    desc:'5-man pressure; right DE drops to curl zone; MLB and OLB blitz A-gaps; Cover 3 shell behind.',
    players: D43,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],          style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],               style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:2, wpts:[[2,-1],[2,-4]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-6]],             style:'dashed',color:'#4a9eff',assign:'zone'}, // DE drops
      {pi:4, wpts:[[-9,-4],[-9,-1]],               style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:5, wpts:[[0,-4],[0,-1]],                 style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:6, wpts:[[9,-4],[11,-7]],                style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:7, wpts:[[-18,-2],[-18,-14]],            style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:8, wpts:[[18,-2],[18,-14]],              style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:9, wpts:[[-5,-9],[-12,-14]],             style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[5,-13],[0,-14]],               style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:313, name:'Zero Blitz', formation:'4-3', type:'Defense', cat:'Blitz / Pressure', mode:'defense',
    desc:'All-out pressure. 6+ rushers with man coverage and no safety help. High risk/reward.',
    players: D43,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],          style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],               style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:2, wpts:[[2,-1],[2,-4]],                 style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],             style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:4, wpts:[[-9,-4],[-9,-1]],               style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:5, wpts:[[0,-4],[0,-1]],                 style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:6, wpts:[[9,-4],[9,-1]],                 style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:7, wpts:[[-18,-2],[-18,-8]],             style:'solid', color:'#ff9966',assign:'cover'},
      {pi:8, wpts:[[18,-2],[18,-8]],               style:'solid', color:'#ff9966',assign:'cover'},
      {pi:9, wpts:[[-5,-9],[-12,-5]],              style:'solid', color:'#4a9eff',assign:'cover'},
      {pi:10,wpts:[[5,-13],[12,-5]],               style:'solid', color:'#4a9eff',assign:'cover'}
    ]
  },
  {
    id:314, name:'Overload Blitz Right', formation:'4-3', type:'Defense', cat:'Blitz / Pressure', mode:'defense',
    desc:'Extra rushers sent from the right side overwhelming the protection. CB rotates down to cover flat.',
    players: D43,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],          style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                 style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],             style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:4, wpts:[[-9,-4],[-9,-7]],               style:'dashed',color:'#4a9eff',assign:'zone'}, // OLB drops
      {pi:5, wpts:[[0,-4],[0,-7]],                 style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:6, wpts:[[9,-4],[9,-1]],                 style:'solid', color:'#ff4444',assign:'blitz'}, // OLB blitz
      {pi:7, wpts:[[-18,-2],[-18,-14]],            style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:8, wpts:[[18,-2],[14,-5]],               style:'solid', color:'#ff9966',assign:'cover'}, // CB rotates flat
      {pi:9, wpts:[[-5,-9],[-12,-14]],             style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[5,-13],[0,-14]],               style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:315, name:'3-4 Fire Zone', formation:'3-4', type:'Defense', cat:'Blitz / Pressure', mode:'defense',
    desc:'3-4 fire zone: ILB and OLB blitz; NT stunts; two OLBs drop to underneath zones.',
    players: D34,
    routes:[
      {pi:0, wpts:[[-5,-1],[-5,-4]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[0,-1],[0,-4]],                 style:'solid', color:'#ff4444',assign:'blitz'}, // NT stunt
      {pi:2, wpts:[[5,-1],[5,-4]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[-8,-3],[-12,-6]],              style:'dashed',color:'#4a9eff',assign:'zone'}, // OLB drops
      {pi:4, wpts:[[-2,-4.5],[-2,-1]],            style:'solid', color:'#ff4444',assign:'blitz'}, // ILB blitz
      {pi:5, wpts:[[2,-4.5],[2,-1]],              style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:6, wpts:[[8,-3],[12,-6]],                style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:7, wpts:[[-18,-2],[-18,-14]],            style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:8, wpts:[[18,-2],[18,-14]],              style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:9, wpts:[[-4,-9],[-12,-14]],             style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[4,-13],[0,-14]],               style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:316, name:'Safety Blitz', formation:'4-3', type:'Defense', cat:'Blitz / Pressure', mode:'defense',
    desc:'SS walks down and blitzes off the edge; FS rotates to cover the vacated deep half.',
    players: D43,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],          style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],             style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-9,-4],[-14,-7]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:5, wpts:[[0,-4],[0,-7]],                 style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:6, wpts:[[9,-4],[14,-7]],                style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:7, wpts:[[-18,-2],[-18,-10]],            style:'solid', color:'#ff9966',assign:'cover'},
      {pi:8, wpts:[[18,-2],[18,-10]],              style:'solid', color:'#ff9966',assign:'cover'},
      {pi:9, wpts:[[-5,-9],[-5,-1]],               style:'solid', color:'#ff4444',assign:'blitz'}, // SS blitzes
      {pi:10,wpts:[[5,-13],[0,-14]],               style:'dashed',color:'#4a9eff',assign:'zone'}   // FS rotates
    ]
  },

  /* ── SPECIALTY / GOAL LINE ────────────────────────────────────── */

  {
    id:317, name:'Goal Line 6-2', formation:'Goal Line', type:'Defense', cat:'Specialty / Goal Line', mode:'defense',
    desc:'Goal-line: six defenders on the line of scrimmage; two LBs fill the gaps; two CBs man up.',
    players:[
      {pos:'DE', lbl:'DE', x:-5,   y:-0.5, side:'defense'},
      {pos:'DT', lbl:'DT', x:-3,   y:-0.5, side:'defense'},
      {pos:'DT', lbl:'NT', x:-1,   y:-0.5, side:'defense'},
      {pos:'DT', lbl:'NT', x: 1,   y:-0.5, side:'defense'},
      {pos:'DT', lbl:'DT', x: 3,   y:-0.5, side:'defense'},
      {pos:'DE', lbl:'DE', x: 5,   y:-0.5, side:'defense'},
      {pos:'LB', lbl:'LB', x:-2.5, y:-3.5, side:'defense'},
      {pos:'LB', lbl:'LB', x: 2.5, y:-3.5, side:'defense'},
      {pos:'CB', lbl:'CB', x:-12,  y:-2,   side:'defense'},
      {pos:'CB', lbl:'CB', x: 12,  y:-2,   side:'defense'},
      {pos:'S',  lbl:'S',  x:  0,  y:-8,   side:'defense'}
    ],
    routes:[
      {pi:0, wpts:[[-5,-0.5],[-5,-2]],             style:'solid', color:'#ff4444',assign:'rush'},
      {pi:1, wpts:[[-3,-0.5],[-3,-2]],             style:'solid', color:'#ff4444',assign:'rush'},
      {pi:2, wpts:[[-1,-0.5],[-1,-2]],             style:'solid', color:'#ff4444',assign:'rush'},
      {pi:3, wpts:[[1,-0.5],[1,-2]],               style:'solid', color:'#ff4444',assign:'rush'},
      {pi:4, wpts:[[3,-0.5],[3,-2]],               style:'solid', color:'#ff4444',assign:'rush'},
      {pi:5, wpts:[[5,-0.5],[5,-2]],               style:'solid', color:'#ff4444',assign:'rush'},
      {pi:6, wpts:[[-2.5,-3.5],[-4,-1]],           style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:7, wpts:[[2.5,-3.5],[4,-1]],             style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:8, wpts:[[-12,-2],[-12,-6]],             style:'solid', color:'#ff9966',assign:'cover'},
      {pi:9, wpts:[[12,-2],[12,-6]],               style:'solid', color:'#ff9966',assign:'cover'},
      {pi:10,wpts:[[0,-8],[0,-10]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:318, name:'4-4 Stack', formation:'4-4', type:'Defense', cat:'Specialty / Goal Line', mode:'defense',
    desc:'Eight-man front stacking four LBs behind four linemen. Strong run-stop base for short yardage.',
    players:[
      {pos:'DE', lbl:'DE', x:-6,  y:-1,  side:'defense'},
      {pos:'DT', lbl:'DT', x:-2,  y:-1,  side:'defense'},
      {pos:'DT', lbl:'DT', x: 2,  y:-1,  side:'defense'},
      {pos:'DE', lbl:'DE', x: 6,  y:-1,  side:'defense'},
      {pos:'LB', lbl:'LB', x:-5,  y:-3.5,side:'defense'},
      {pos:'LB', lbl:'LB', x:-1,  y:-3.5,side:'defense'},
      {pos:'LB', lbl:'LB', x: 1,  y:-3.5,side:'defense'},
      {pos:'LB', lbl:'LB', x: 5,  y:-3.5,side:'defense'},
      {pos:'CB', lbl:'CB', x:-18, y:-2,  side:'defense'},
      {pos:'CB', lbl:'CB', x: 18, y:-2,  side:'defense'},
      {pos:'S',  lbl:'S',  x:  0, y:-9,  side:'defense'}
    ],
    routes:[
      {pi:0, wpts:[[-6,-1],[-6,-3]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-3]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-3]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6,-1],[6,-3]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-5,-3.5],[-7,-1]],             style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:5, wpts:[[-1,-3.5],[-1,-1]],             style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:6, wpts:[[1,-3.5],[1,-1]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:7, wpts:[[5,-3.5],[7,-1]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:8, wpts:[[-18,-2],[-18,-8]],             style:'solid', color:'#ff9966',assign:'cover'},
      {pi:9, wpts:[[18,-2],[18,-8]],               style:'solid', color:'#ff9966',assign:'cover'},
      {pi:10,wpts:[[0,-9],[0,-12]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:319, name:'Prevent Defense', formation:'Dime', type:'Defense', cat:'Specialty / Goal Line', mode:'defense',
    desc:'Late-game deep protection. Rushes only 3; drops 8 into deep coverage preventing the big play.',
    players: DDM,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],          style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-1.5,-1],[-1.5,-4]],          style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[1.5,-1],[1.5,-4]],            style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-6]],             style:'dashed',color:'#4a9eff',assign:'zone'}, // DE drops
      {pi:4, wpts:[[0,-4],[0,-9]],                 style:'dashed',color:'#4a9eff',assign:'zone'}, // LB deep hook
      {pi:5, wpts:[[-18,-2],[-18,-14]],            style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:6, wpts:[[18,-2],[18,-14]],              style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:7, wpts:[[-11,-4],[-14,-12]],            style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:8, wpts:[[11,-4],[14,-12]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:9, wpts:[[-5,-9],[-8,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[5,-12],[8,-14]],               style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:320, name:'Bear Front', formation:'4-3', type:'Defense', cat:'Specialty / Goal Line', mode:'defense',
    desc:'Historically dominant Buddy Ryan front. NT shaded on center; DEs on guards; OLBs walk inside.',
    players:[
      {pos:'OLB',lbl:'OLB',x:-7,  y:-1,  side:'defense'},
      {pos:'DE', lbl:'DE', x:-3.5,y:-1,  side:'defense'},
      {pos:'NT', lbl:'NT', x: 0,  y:-1,  side:'defense'},
      {pos:'DE', lbl:'DE', x: 3.5,y:-1,  side:'defense'},
      {pos:'OLB',lbl:'OLB',x: 7,  y:-1,  side:'defense'},
      {pos:'LB', lbl:'LB', x:-3,  y:-4,  side:'defense'},
      {pos:'MLB',lbl:'MLB',x: 0,  y:-5,  side:'defense'},
      {pos:'LB', lbl:'LB', x: 3,  y:-4,  side:'defense'},
      {pos:'CB', lbl:'CB', x:-18, y:-2,  side:'defense'},
      {pos:'CB', lbl:'CB', x: 18, y:-2,  side:'defense'},
      {pos:'S',  lbl:'S',  x:  0, y:-12, side:'defense'}
    ],
    routes:[
      {pi:0, wpts:[[-7,-1],[-7,-3]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-3.5,-1],[-3.5,-3]],           style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[0,-1],[0,-3]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[3.5,-1],[3.5,-3]],             style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[7,-1],[7,-3]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:5, wpts:[[-3,-4],[-5,-1]],               style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:6, wpts:[[0,-5],[0,-3]],                 style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:7, wpts:[[3,-4],[5,-1]],                 style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:8, wpts:[[-18,-2],[-18,-10]],            style:'solid', color:'#ff9966',assign:'cover'},
      {pi:9, wpts:[[18,-2],[18,-10]],              style:'solid', color:'#ff9966',assign:'cover'},
      {pi:10,wpts:[[0,-12],[0,-14]],               style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },


  /* ── ZONE COVERAGE (cont.) ────────────────────────────────────── */

  {
    id:321, name:'Cover 2 Sink', formation:'4-3', type:'Defense', cat:'Zone Coverage', mode:'defense',
    desc:'CBs sink inside/underneath instead of flattening — better against crossing routes than standard Cover 2.',
    players: D43,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],           style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],                style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],              style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-9,-4],[-14,-7]],               style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:5, wpts:[[0,-4],[0,-8]],                  style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:6, wpts:[[9,-4],[14,-7]],                 style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:7, wpts:[[-18,-2],[-12,-7]],              style:'dashed',color:'#ff9966',assign:'zone'}, // CB sinks inside
      {pi:8, wpts:[[18,-2],[12,-7]],                style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:9, wpts:[[-5,-9],[-12,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[5,-13],[12,-14]],               style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:322, name:'Cover 3 Sky', formation:'3-4', type:'Defense', cat:'Zone Coverage', mode:'defense',
    desc:'SS rotates down to boundary flat; FS holds deep middle; CBs own the deep outside thirds.',
    players: D34,
    routes:[
      {pi:0, wpts:[[-5,-1],[-5,-4]],                style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[0,-1],[0,-4]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[5,-1],[5,-4]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[-8,-3],[-14,-7]],               style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:4, wpts:[[-2,-4.5],[-4,-8]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:5, wpts:[[2,-4.5],[4,-8]],                style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:6, wpts:[[8,-3],[14,-7]],                 style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:7, wpts:[[-18,-2],[-18,-14]],             style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:8, wpts:[[18,-2],[18,-14]],               style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:9, wpts:[[-4,-9],[-14,-6]],               style:'dashed',color:'#4a9eff',assign:'zone'}, // SS sky/flat
      {pi:10,wpts:[[4,-13],[0,-14]],                style:'dashed',color:'#4a9eff',assign:'zone'}  // FS deep middle
    ]
  },
  {
    id:323, name:'Cloud Coverage', formation:'Nickel', type:'Defense', cat:'Zone Coverage', mode:'defense',
    desc:'Boundary CB rotates short to flat; field safety takes the outside third. Inverted from standard.',
    players: DNK,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],           style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],                style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],              style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-4,-4],[-8,-7]],                style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:5, wpts:[[4,-4],[6,-7]],                  style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:6, wpts:[[-18,-2],[-14,-5]],              style:'solid', color:'#ff9966',assign:'cover'}, // CB cloud (short flat)
      {pi:7, wpts:[[18,-2],[18,-12]],               style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:8, wpts:[[-10,-4],[-12,-7]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:9, wpts:[[-4,-9],[-18,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'}, // SS deep outside
      {pi:10,wpts:[[4,-13],[0,-14]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:324, name:'Palms Coverage', formation:'Nickel', type:'Defense', cat:'Zone Coverage', mode:'defense',
    desc:'CBs read the #1 receiver; safeties pattern-match #2. Quarters-based zone that adjusts to formation.',
    players: DNK,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],           style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],                style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],              style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-4,-4],[-6,-8]],                style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:5, wpts:[[4,-4],[6,-8]],                  style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:6, wpts:[[-18,-2],[-18,-10]],             style:'solid', color:'#ff9966',assign:'cover'}, // CB read #1
      {pi:7, wpts:[[18,-2],[18,-10]],               style:'solid', color:'#ff9966',assign:'cover'},
      {pi:8, wpts:[[-10,-4],[-10,-12]],             style:'dashed',color:'#4a9eff',assign:'zone'}, // NB read #2
      {pi:9, wpts:[[-4,-9],[-12,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[4,-13],[0,-14]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },

  /* ── MAN COVERAGE (cont.) ────────────────────────────────────── */

  {
    id:325, name:'Pattern Match', formation:'4-3', type:'Defense', cat:'Man Coverage', mode:'defense',
    desc:'Starts as zone but defenders lock to receivers based on route pattern. Blends man and zone benefits.',
    players: D43,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],           style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],                style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],              style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-9,-4],[-18,-6]],               style:'solid', color:'#4a9eff',assign:'cover'}, // OLB match WR
      {pi:5, wpts:[[0,-4],[0,-7]],                  style:'dashed',color:'#4a9eff',assign:'zone'},  // MLB pattern read
      {pi:6, wpts:[[9,-4],[6.5,-5]],                style:'solid', color:'#4a9eff',assign:'cover'}, // OLB match TE
      {pi:7, wpts:[[-18,-2],[-18,-9]],              style:'solid', color:'#ff9966',assign:'cover'},
      {pi:8, wpts:[[18,-2],[18,-9]],                style:'solid', color:'#ff9966',assign:'cover'},
      {pi:9, wpts:[[-5,-9],[-12,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[5,-13],[0,-14]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:326, name:'Banjo (Switch Man)', formation:'Nickel', type:'Defense', cat:'Man Coverage', mode:'defense',
    desc:'Two defenders "banjo" — they call out switches based on receiver routes, preventing natural picks.',
    players: DNK,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],           style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],                style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],              style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-4,-4],[-4,-7]],                style:'solid', color:'#4a9eff',assign:'cover'}, // LB banjo
      {pi:5, wpts:[[4,-4],[7,-5]],                  style:'solid', color:'#4a9eff',assign:'cover'},
      {pi:6, wpts:[[-18,-2],[-18,-6]],              style:'solid', color:'#ff9966',assign:'cover'},
      {pi:7, wpts:[[18,-2],[18,-6]],                style:'solid', color:'#ff9966',assign:'cover'},
      {pi:8, wpts:[[-10,-4],[-6,-7]],               style:'dashed',color:'#4a9eff',assign:'zone'}, // NB switch
      {pi:9, wpts:[[-4,-9],[0,-13]],                style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[4,-13],[0,-14]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:327, name:'Trail Man', formation:'4-3', type:'Defense', cat:'Man Coverage', mode:'defense',
    desc:'CBs play trail technique — staying inside-out behind the WR. Good against back-shoulder fades.',
    players: D43,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],           style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],                style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],              style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-9,-4],[-18,-5]],               style:'solid', color:'#4a9eff',assign:'cover'},
      {pi:5, wpts:[[0,-4],[0,-7]],                  style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:6, wpts:[[9,-4],[6.5,-5]],                style:'solid', color:'#4a9eff',assign:'cover'},
      {pi:7, wpts:[[-18,-2],[-18,-8]],              style:'dashed',color:'#ff9966',assign:'cover'}, // trail (inside-out)
      {pi:8, wpts:[[18,-2],[18,-8]],                style:'dashed',color:'#ff9966',assign:'cover'},
      {pi:9, wpts:[[-5,-9],[-8,-5]],                style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[5,-13],[0,-14]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:328, name:'Press-Quarter', formation:'4-3', type:'Defense', cat:'Man Coverage', mode:'defense',
    desc:'Boundary CB presses man; field CB plays quarters — half the field man, half zone in one call.',
    players: D43,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],           style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],                style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],              style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-9,-4],[-14,-7]],               style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:5, wpts:[[0,-4],[0,-7]],                  style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:6, wpts:[[9,-4],[14,-7]],                 style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:7, wpts:[[-18,-2],[-18,-8]],              style:'solid', color:'#ff9966',assign:'cover'}, // boundary press man
      {pi:8, wpts:[[18,-2],[18,-10]],               style:'dashed',color:'#ff9966',assign:'zone'},  // field quarters
      {pi:9, wpts:[[-5,-9],[-12,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[5,-13],[0,-14]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },

  /* ── BLITZ / PRESSURE (cont.) ─────────────────────────────────── */

  {
    id:329, name:'CB Blitz', formation:'Nickel', type:'Defense', cat:'Blitz / Pressure', mode:'defense',
    desc:'Boundary CB walks down and blitzes off the edge; NB rotates to cover his vacated deep third.',
    players: DNK,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],           style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],                style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],              style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-4,-4],[-8,-7]],                style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:5, wpts:[[4,-4],[8,-7]],                  style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:6, wpts:[[-18,-2],[-18,-0.5]],            style:'solid', color:'#ff4444',assign:'blitz'}, // CB blitzes
      {pi:7, wpts:[[18,-2],[18,-12]],               style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:8, wpts:[[-10,-4],[-14,-9]],              style:'dashed',color:'#4a9eff',assign:'zone'},  // NB rotates cover
      {pi:9, wpts:[[-4,-9],[-12,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[4,-13],[0,-14]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:330, name:'A-Gap Pressure', formation:'4-3', type:'Defense', cat:'Blitz / Pressure', mode:'defense',
    desc:'Both DTs slant aggressively into A-gaps; MLB follows through the same gap. Maximum interior pressure.',
    players: D43,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],           style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[0,-3]],                 style:'solid', color:'#ff4444',assign:'blitz'}, // DT A-gap slant
      {pi:2, wpts:[[2,-1],[0,-3]],                  style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],              style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-9,-4],[-14,-7]],               style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:5, wpts:[[0,-4],[0,-1]],                  style:'solid', color:'#ff4444',assign:'blitz'}, // MLB through A-gap
      {pi:6, wpts:[[9,-4],[14,-7]],                 style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:7, wpts:[[-18,-2],[-18,-8]],              style:'solid', color:'#ff9966',assign:'cover'},
      {pi:8, wpts:[[18,-2],[18,-8]],                style:'solid', color:'#ff9966',assign:'cover'},
      {pi:9, wpts:[[-5,-9],[-12,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[5,-13],[0,-14]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:331, name:'Double A-Gap Blitz', formation:'3-4', type:'Defense', cat:'Blitz / Pressure', mode:'defense',
    desc:'Both ILBs attack the A-gaps simultaneously — the most dangerous interior blitz in the game.',
    players: D34,
    routes:[
      {pi:0, wpts:[[-5,-1],[-5,-4]],                style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[0,-1],[0,-4]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[5,-1],[5,-4]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[-8,-3],[-13,-7]],               style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:4, wpts:[[-2,-4.5],[-2,-1]],              style:'solid', color:'#ff4444',assign:'blitz'}, // ILB A-gap
      {pi:5, wpts:[[2,-4.5],[2,-1]],                style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:6, wpts:[[8,-3],[13,-7]],                 style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:7, wpts:[[-18,-2],[-18,-9]],              style:'solid', color:'#ff9966',assign:'cover'},
      {pi:8, wpts:[[18,-2],[18,-9]],                style:'solid', color:'#ff9966',assign:'cover'},
      {pi:9, wpts:[[-4,-9],[-10,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[4,-13],[0,-14]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:332, name:'Edge Overload Left', formation:'4-3', type:'Defense', cat:'Blitz / Pressure', mode:'defense',
    desc:'Three rushers from the left edge overwhelm the protection. OLB wraps, DE wide, DT slants.',
    players: D43,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],           style:'solid', color:'#ff4444',assign:'blitz'}, // DE rush wide
      {pi:1, wpts:[[-2,-1],[-5,-4]],                style:'solid', color:'#ff4444',assign:'blitz'}, // DT slant outside
      {pi:2, wpts:[[2,-1],[2,-4]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],              style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-9,-4],[-9,-1]],                style:'solid', color:'#ff4444',assign:'blitz'}, // OLB blitz left
      {pi:5, wpts:[[0,-4],[0,-7]],                  style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:6, wpts:[[9,-4],[14,-7]],                 style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:7, wpts:[[-18,-2],[-18,-10]],             style:'solid', color:'#ff9966',assign:'cover'},
      {pi:8, wpts:[[18,-2],[18,-12]],               style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:9, wpts:[[-5,-9],[-14,-7]],               style:'dashed',color:'#4a9eff',assign:'zone'}, // SS fills vacated flat
      {pi:10,wpts:[[5,-13],[0,-14]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:333, name:'Simulated Pressure', formation:'4-3', type:'Defense', cat:'Blitz / Pressure', mode:'defense',
    desc:'Show max blitz pre-snap to force a quick throw; LBs show then drop to underneath zones. Deception over pressure.',
    players: D43,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],           style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-2,-4]],                style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[2,-1],[2,-4]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],              style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-9,-4],[-9,-2],[-14,-7]],       style:'dashed',color:'#4a9eff',assign:'zone'}, // show then drop
      {pi:5, wpts:[[0,-4],[0,-2],[0,-8]],           style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:6, wpts:[[9,-4],[9,-2],[14,-7]],          style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:7, wpts:[[-18,-2],[-18,-12]],             style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:8, wpts:[[18,-2],[18,-12]],               style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:9, wpts:[[-5,-9],[-12,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[5,-13],[0,-14]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:334, name:'DL Twist / Stunt', formation:'4-3', type:'Defense', cat:'Blitz / Pressure', mode:'defense',
    desc:'DTs and DEs twist responsibilities: DE crashes inside while DT loops outside to create confusion.',
    players: D43,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-3,-4]],              style:'solid', color:'#ff4444',assign:'blitz'}, // DE crash inside
      {pi:1, wpts:[[-2,-1],[-6,-4]],                style:'solid', color:'#ff4444',assign:'blitz'}, // DT loop outside
      {pi:2, wpts:[[2,-1],[6,-4]],                  style:'solid', color:'#ff4444',assign:'blitz'}, // DT loop
      {pi:3, wpts:[[6.5,-1],[3,-4]],                style:'solid', color:'#ff4444',assign:'blitz'}, // DE crash inside
      {pi:4, wpts:[[-9,-4],[-14,-7]],               style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:5, wpts:[[0,-4],[0,-8]],                  style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:6, wpts:[[9,-4],[14,-7]],                 style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:7, wpts:[[-18,-2],[-18,-8]],              style:'solid', color:'#ff9966',assign:'cover'},
      {pi:8, wpts:[[18,-2],[18,-8]],                style:'solid', color:'#ff9966',assign:'cover'},
      {pi:9, wpts:[[-5,-9],[-12,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[5,-13],[0,-14]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },

  /* ── SPECIALTY / GOAL LINE (cont.) ───────────────────────────── */

  {
    id:335, name:'5-2 Monster', formation:'5-2', type:'Defense', cat:'Specialty / Goal Line', mode:'defense',
    desc:'Classic 5-2 with a "monster" safety walked up to the strong side. Dominant run-stop formation.',
    players:[
      {pos:'DE', lbl:'DE', x:-6,  y:-1,  side:'defense'},
      {pos:'DT', lbl:'DT', x:-3,  y:-1,  side:'defense'},
      {pos:'NT', lbl:'NT', x: 0,  y:-1,  side:'defense'},
      {pos:'DT', lbl:'DT', x: 3,  y:-1,  side:'defense'},
      {pos:'DE', lbl:'DE', x: 6,  y:-1,  side:'defense'},
      {pos:'LB', lbl:'LB', x:-3,  y:-3.5,side:'defense'},
      {pos:'LB', lbl:'LB', x: 3,  y:-3.5,side:'defense'},
      {pos:'CB', lbl:'CB', x:-18, y:-2,  side:'defense'},
      {pos:'CB', lbl:'CB', x: 18, y:-2,  side:'defense'},
      {pos:'S',  lbl:'M',  x: 8,  y:-4,  side:'defense'}, // monster safety
      {pos:'FS', lbl:'FS', x: 0,  y:-12, side:'defense'}
    ],
    routes:[
      {pi:0, wpts:[[-6,-1],[-6,-3]],                style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-3,-1],[-3,-3]],                style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[0,-1],[0,-3]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[3,-1],[3,-3]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[6,-1],[6,-3]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:5, wpts:[[-3,-3.5],[-5,-1]],              style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:6, wpts:[[3,-3.5],[5,-1]],                style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:7, wpts:[[-18,-2],[-18,-8]],              style:'solid', color:'#ff9966',assign:'cover'},
      {pi:8, wpts:[[18,-2],[18,-8]],                style:'solid', color:'#ff9966',assign:'cover'},
      {pi:9, wpts:[[8,-4],[8,-2]],                  style:'solid', color:'#4a9eff',assign:'rush'},  // monster fills
      {pi:10,wpts:[[0,-12],[0,-14]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:336, name:'46 Defense', formation:'46', type:'Defense', cat:'Specialty / Goal Line', mode:'defense',
    desc:'Buddy Ryan\'s famous 46: eight defenders in the box, overloading one side. Suffocates the run.',
    players:[
      {pos:'NT', lbl:'NT', x:-1,  y:-1,  side:'defense'},
      {pos:'DT', lbl:'DT', x: 2,  y:-1,  side:'defense'},
      {pos:'DE', lbl:'DE', x: 5,  y:-1,  side:'defense'},
      {pos:'DE', lbl:'DE', x:-5,  y:-1,  side:'defense'},
      {pos:'OLB',lbl:'SLB',x:-7,  y:-2,  side:'defense'}, // walked in
      {pos:'OLB',lbl:'WLB',x: 7,  y:-2,  side:'defense'},
      {pos:'ILB',lbl:'MLB',x: 0,  y:-4,  side:'defense'},
      {pos:'ILB',lbl:'ILB',x: 3,  y:-3,  side:'defense'},
      {pos:'CB', lbl:'CB', x:-18, y:-2,  side:'defense'},
      {pos:'CB', lbl:'CB', x: 18, y:-2,  side:'defense'},
      {pos:'FS', lbl:'FS', x: 0,  y:-12, side:'defense'}
    ],
    routes:[
      {pi:0, wpts:[[-1,-1],[-1,-3]],                style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[2,-1],[2,-3]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[5,-1],[5,-3]],                  style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:3, wpts:[[-5,-1],[-5,-3]],                style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:4, wpts:[[-7,-2],[-7,-0.5]],              style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:5, wpts:[[7,-2],[7,-0.5]],                style:'solid', color:'#ff4444',assign:'blitz'},
      {pi:6, wpts:[[0,-4],[0,-2]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:7, wpts:[[3,-3],[3,-1]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:8, wpts:[[-18,-2],[-18,-8]],              style:'solid', color:'#ff9966',assign:'cover'},
      {pi:9, wpts:[[18,-2],[18,-8]],                style:'solid', color:'#ff9966',assign:'cover'},
      {pi:10,wpts:[[0,-12],[0,-14]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:337, name:'3-3-5 Stack', formation:'3-3-5', type:'Defense', cat:'Specialty / Goal Line', mode:'defense',
    desc:'Three DL, three stacked LBs, five DBs. Versatile against spread formations — can blitz or drop all 8.',
    players:[
      {pos:'DE', lbl:'DE', x:-5,  y:-1,  side:'defense'},
      {pos:'NT', lbl:'NT', x: 0,  y:-1,  side:'defense'},
      {pos:'DE', lbl:'DE', x: 5,  y:-1,  side:'defense'},
      {pos:'LB', lbl:'LB', x:-4,  y:-3,  side:'defense'},
      {pos:'LB', lbl:'LB', x: 0,  y:-3,  side:'defense'},
      {pos:'LB', lbl:'LB', x: 4,  y:-3,  side:'defense'},
      {pos:'CB', lbl:'CB', x:-18, y:-2,  side:'defense'},
      {pos:'CB', lbl:'CB', x: 18, y:-2,  side:'defense'},
      {pos:'SS', lbl:'SS', x:-8,  y:-6,  side:'defense'},
      {pos:'FS', lbl:'FS', x: 0,  y:-10, side:'defense'},
      {pos:'DB', lbl:'DB', x: 8,  y:-6,  side:'defense'}
    ],
    routes:[
      {pi:0, wpts:[[-5,-1],[-5,-4]],                style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[0,-1],[0,-4]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[5,-1],[5,-4]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[-4,-3],[-8,-6]],                style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:4, wpts:[[0,-3],[0,-6]],                  style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:5, wpts:[[4,-3],[8,-6]],                  style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:6, wpts:[[-18,-2],[-18,-12]],             style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:7, wpts:[[18,-2],[18,-12]],               style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:8, wpts:[[-8,-6],[-12,-12]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:9, wpts:[[0,-10],[0,-13]],                style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[8,-6],[12,-12]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:338, name:'Cover 3 Cloud Variant', formation:'3-4', type:'Defense', cat:'Specialty / Goal Line', mode:'defense',
    desc:'Boundary CB plays cloud (short flat); SS rotates to cover boundary deep third; field CB owns his third.',
    players: D34,
    routes:[
      {pi:0, wpts:[[-5,-1],[-5,-4]],                style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[0,-1],[0,-4]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:2, wpts:[[5,-1],[5,-4]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[-8,-3],[-13,-7]],               style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:4, wpts:[[-2,-4.5],[-4,-8]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:5, wpts:[[2,-4.5],[4,-8]],                style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:6, wpts:[[8,-3],[13,-7]],                 style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:7, wpts:[[-18,-2],[-14,-5]],              style:'solid', color:'#ff9966',assign:'cover'}, // CB cloud short
      {pi:8, wpts:[[18,-2],[18,-14]],               style:'dashed',color:'#ff9966',assign:'zone'},  // field CB deep
      {pi:9, wpts:[[-4,-9],[-18,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'},  // SS rotates boundary deep
      {pi:10,wpts:[[4,-13],[0,-14]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:339, name:'Two-Gap 3-4', formation:'3-4', type:'Defense', cat:'Specialty / Goal Line', mode:'defense',
    desc:'NT controls both A-gaps by reading and shedding; DEs two-gap their C-gaps. Disciplined run defense.',
    players: D34,
    routes:[
      {pi:0, wpts:[[-5,-1],[-5,-3]],                style:'solid', color:'#4a9eff',assign:'rush'},  // DE two-gap hold
      {pi:1, wpts:[[0,-1],[0,-3]],                  style:'solid', color:'#4a9eff',assign:'rush'},   // NT both A-gaps
      {pi:2, wpts:[[5,-1],[5,-3]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[-8,-3],[-13,-7]],               style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:4, wpts:[[-2,-4.5],[-2,-2]],              style:'solid', color:'#4a9eff',assign:'rush'},   // ILB fill
      {pi:5, wpts:[[2,-4.5],[2,-2]],                style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:6, wpts:[[8,-3],[13,-7]],                 style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:7, wpts:[[-18,-2],[-18,-12]],             style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:8, wpts:[[18,-2],[18,-12]],               style:'dashed',color:'#ff9966',assign:'zone'},
      {pi:9, wpts:[[-4,-9],[-10,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[4,-13],[0,-14]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },
  {
    id:340, name:'Eagle Front', formation:'4-3', type:'Defense', cat:'Specialty / Goal Line', mode:'defense',
    desc:'DTs shade outside the guards; OLBs walk inside the C-gap — compresses every running lane.',
    players: D43,
    routes:[
      {pi:0, wpts:[[-6.5,-1],[-6.5,-4]],           style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:1, wpts:[[-2,-1],[-4,-3]],                style:'solid', color:'#4a9eff',assign:'rush'},   // DT shade outside
      {pi:2, wpts:[[2,-1],[4,-3]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:3, wpts:[[6.5,-1],[6.5,-4]],              style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:4, wpts:[[-9,-4],[-5,-2]],                style:'solid', color:'#4a9eff',assign:'rush'},   // OLB walk inside
      {pi:5, wpts:[[0,-4],[0,-2]],                  style:'solid', color:'#4a9eff',assign:'rush'},   // MLB A-gap
      {pi:6, wpts:[[9,-4],[5,-2]],                  style:'solid', color:'#4a9eff',assign:'rush'},
      {pi:7, wpts:[[-18,-2],[-18,-8]],              style:'solid', color:'#ff9966',assign:'cover'},
      {pi:8, wpts:[[18,-2],[18,-8]],                style:'solid', color:'#ff9966',assign:'cover'},
      {pi:9, wpts:[[-5,-9],[-12,-14]],              style:'dashed',color:'#4a9eff',assign:'zone'},
      {pi:10,wpts:[[5,-13],[0,-14]],                style:'dashed',color:'#4a9eff',assign:'zone'}
    ]
  },

  ]; // end DEF

  /* ───────────────────────────────────────────────────────────────── */
  window.PLAY_LIBRARY = [...PASS, ...RUN, ...DEF].map(buildPlay);

})();
