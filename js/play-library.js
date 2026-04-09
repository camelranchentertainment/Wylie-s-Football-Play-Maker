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

  ]; // end DEF

  /* ───────────────────────────────────────────────────────────────── */
  window.PLAY_LIBRARY = [...PASS, ...RUN, ...DEF].map(buildPlay);

})();
