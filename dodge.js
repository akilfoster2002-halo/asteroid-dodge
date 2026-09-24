/* =====================================================================
   ASTEROID DODGE — the test.

   Two objects and one job. The Asteroids already work: a hidden spawner
   makes a copy of itself every half-second or so, and every copy flies
   in from the right at its own speed, tumbling, and deletes itself when
   it has gone off the left. Click one and read it — nothing is hidden.

   The Avatar does NOTHING. That is the exam. It arrives with a hat and a
   `go to`, and the student has to write the rest in blocks:

     1. up, down, left and right on the keys — which means an `if` for
        each key, and all four inside a `forever`, or it checks once and
        never again;
     2. `if touching Asteroid? then stop all` — the rule that makes it a
        game. Leave it out and the rocks sail straight through you and
        the clock never stops, which is the loudest way to find out.

   WHAT THE ROOM OWNS is the boring half, the same division Pong draws: a
   floor, a camera, a clock and a checklist. The room never moves the
   Avatar, never ends the game and never decides a hit counts — it only
   WATCHES, and ticks a box when it sees the student's program do the
   thing. A student cannot get a tick for code they did not write.
   ===================================================================== */
window.DODGE = (function(){
  const $ = s => document.querySelector(s);
  const T = s => (window.t ? t(s) : s);

  const ME='Avatar', ROCK='Asteroid';
  /* THE ARENA, in the language's axes. x runs ±16 across, y ±9 up the
     screen; the rocks are born just past the right edge and die just past
     the left, so they are never seen appearing or vanishing. */
  const ARENA={ x:16, y:9 };
  const SPAWN_X=20, GONE_X=-20;
  const STEP=0.3;                         // what `change x by` arrives set to
  const START={ x:-10, y:0 };
  const SAVE_KEY='asteroid-dodge.avatar.v1';
  const BEST_KEY='asteroid-dodge.best.v1';

  const AX = k => (window.BLOCKS ? BLOCKS.AXES.find(a=>a.v===k) : null);
  const rd = (a,k)=>{ const x=AX(k); return (a&&x) ? x.sign*(+a[x.field]||0) : 0; };
  const wr = (a,k,v)=>{ const x=AX(k); if(a&&x) a[x.field]=x.sign*v; };
  const actor = n => (window.VM ? VM.actorByName(n) : null);

  /* ----------------------------------------------------- the palette
     Everything the test needs and a little more, so the answer is not
     simply "every block on the shelf". Keys and `touching` are the two
     sensing blocks the exam is about; `stop` is the one control block it
     cannot be passed without. */
  const PALETTE={
    locked:true,
    cats:['events','control','motion','looks','sensing','ops','data'],
    ops:[
      'event.flag','event.key','event.clone',
      'ctrl.wait','ctrl.repeat','ctrl.forever','ctrl.if','ctrl.ifelse',
      'ctrl.waitUntil','ctrl.repeatUntil','ctrl.stop','ctrl.clone','ctrl.delclone',
      'motion.changeBy','motion.setTo','motion.goto','motion.pos','motion.turn',
      'looks.say','looks.sayFor','looks.show','looks.hide','looks.size','looks.colour',
      'sense.key','sense.touch','sense.posOf','sense.timer','sense.resetTimer',
      'op.add','op.sub','op.mul','op.div','op.lt','op.gt','op.eq',
      'op.and','op.or','op.not','op.random',
      'data.set','data.change','data.get'
    ]
  };
  /* WHAT A BLOCK ARRIVES SET TO. `touching` arrives on the Asteroid and
     `stop` arrives on `all`, because the palette's own defaults (`player`
     and `this script`) are both wrong in this room — but the student
     still has to know to reach for them. */
  const SET={
    'motion.changeBy': { a:'y', n:STEP },
    'motion.setTo':    { a:'y', n:0 },
    'motion.goto':     { x:START.x, y:START.y, z:1 },
    'sense.key':       { k:'up' },
    'event.key':       { k:'up' },
    'sense.touch':     { o:ROCK },
    'sense.posOf':     { a:'y', o:ROCK },
    'ctrl.stop':       { w:'all' },
    'looks.say':       { s:'Game over!' }
  };

  /* ==================================================== the scene */
  let starfield=null;
  function build(){
    if(G.roomGroup) G.scene.remove(G.roomGroup);
    G.roomGroup=new THREE.Group(); G.scene.add(G.roomGroup);
    G.scene.background=new THREE.Color(0x07060f);
    const world=G.roomGroup;

    /* the floor is space: a dark slab with stars drifting under it */
    const floor=new THREE.Mesh(new THREE.BoxGeometry(80, 1, 50),
      new THREE.MeshBasicMaterial({color:0x0b0918}));
    floor.position.y=-3;
    world.add(floor);
    const pts=[], col=[], c=new THREE.Color();
    for(let i=0;i<700;i++){
      pts.push((Math.random()-0.5)*70, -2 + Math.random()*0.5, (Math.random()-0.5)*40);
      c.setHSL(0.6+Math.random()*0.15, 0.4, 0.45+Math.random()*0.5);
      col.push(c.r,c.g,c.b);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts,3));
    g.setAttribute('color',    new THREE.Float32BufferAttribute(col,3));
    starfield=new THREE.Points(g, new THREE.PointsMaterial({ size:0.12, vertexColors:true }));
    world.add(starfield);

    /* THE EDGE OF THE ARENA, drawn so a student can see where ±16 and ±9
       are — the numbers they will need if they want to keep the Avatar
       on the screen (a bonus, not part of the test). */
    const edge=(x,z,w,d)=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,0.05,d),
        new THREE.MeshBasicMaterial({color:0x4a3f7a, transparent:true, opacity:0.8}));
      m.position.set(x,0,z); world.add(m);
    };
    edge(0,-ARENA.y, ARENA.x*2, 0.08); edge(0, ARENA.y, ARENA.x*2, 0.08);
    edge(-ARENA.x,0, 0.08, ARENA.y*2); edge( ARENA.x,0, 0.08, ARENA.y*2);
    coordinates(world);

    world.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key=new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(-10, 40, 12); world.add(key);
  }

  /* ================================================ the coordinates
     THE NUMBERS ARE ON THE MAP. A faint grid every 2 units with the two
     axes a little brighter, x values along the bottom, y values down the
     left, and the four edge values in yellow — so a student reading
     `touching [right edge]?` can look across and see that the right edge
     is x = 16. Everything here is drawn in the language's axes (y up the
     screen) and turned into the engine's (z down it) at the last moment. */
  const GRID_STEP=2, X_TICK=4, Y_TICK=3;
  function coordinates(world){
    /* the grid lines, below the objects and above the stars */
    const pts=[], col=[], c=new THREE.Color();
    const line=(x1,y1,x2,y2,hex)=>{ c.setHex(hex);
      pts.push(x1,-0.05,-y1, x2,-0.05,-y2); col.push(c.r,c.g,c.b, c.r,c.g,c.b); };
    for(let x=-ARENA.x+GRID_STEP; x<ARENA.x; x+=GRID_STEP)
      line(x,-ARENA.y, x,ARENA.y, x===0 ? 0x4c4380 : 0x201b38);
    for(let y=-ARENA.y+1; y<ARENA.y; y+=1){
      if(y%GRID_STEP && y!==0) continue;
      line(-ARENA.x,y, ARENA.x,y, y===0 ? 0x4c4380 : 0x201b38);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts,3));
    g.setAttribute('color',    new THREE.Float32BufferAttribute(col,3));
    world.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors:true })));

    /* the numbers: little flat signs lying on the floor, facing the camera */
    const label=(text, x, y, colour, align, size)=>{
      const cv=document.createElement('canvas'), H=64;
      const ctx=cv.getContext('2d');
      const font=`700 44px ${window.uiFont ? uiFont() : 'monospace'}`;
      ctx.font=font;
      cv.width=Math.ceil(ctx.measureText(text).width)+16; cv.height=H;
      ctx.font=font; ctx.fillStyle=colour; ctx.textBaseline='middle';
      ctx.textAlign='center'; ctx.fillText(text, cv.width/2, H/2+2);
      const tex=new THREE.CanvasTexture(cv);
      const h=size||0.75, w=h*cv.width/H;
      const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),
        new THREE.MeshBasicMaterial({ map:tex, transparent:true, depthWrite:false }));
      m.rotation.x=-Math.PI/2;                         // lie flat, readable from above
      const dx = align==='right' ? -w/2 : align==='left' ? w/2 : 0;
      m.position.set(x+dx, 0.05, -y);
      world.add(m);
    };
    const DIM='#8f84b8', EDGE='#ffe9a8';
    const minus = v => v<0 ? '−'+(-v) : String(v);     // a real minus sign
    /* x along the bottom */
    for(let x=-ARENA.x; x<=ARENA.x; x+=X_TICK){
      const atEdge=Math.abs(x)===ARENA.x;
      label(atEdge ? 'x = '+minus(x) : minus(x), x, -ARENA.y-0.7, atEdge?EDGE:DIM);
    }
    /* y down the left */
    for(let y=-ARENA.y; y<=ARENA.y; y+=Y_TICK){
      const atEdge=Math.abs(y)===ARENA.y;
      label(atEdge ? 'y = '+minus(y) : minus(y), -ARENA.x-0.35, y, atEdge?EDGE:DIM, 'right');
    }
    /* EACH EDGE NAMED WHERE IT IS: at the middle of the line, just inside,
       with the block's own word for it. The corners are where the HUD
       sits, so the midpoints are the places that are always in view. */
    const EDGE_FAINT='rgba(255,233,168,.75)';
    label('y = 9 · up edge',        0,  ARENA.y-0.6, EDGE_FAINT, null, 0.7);
    label('y = −9 · down edge',     0, -ARENA.y+0.6, EDGE_FAINT, null, 0.7);
    label('x = −16 · left edge',   -ARENA.x+0.35, 0.7, EDGE_FAINT, 'left', 0.7);
    label('x = 16 · right edge',    ARENA.x-0.35, 0.7, EDGE_FAINT, 'right', 0.7);
    /* and the axis names, at the far end of each */
    label('x →', ARENA.x+0.4, -ARENA.y-0.7, DIM, 'left');
    label('y ↑', -ARENA.x-0.35, ARENA.y+0.75, DIM, 'right');
  }

  /* ==================================================== the two */
  function cast(){
    const make=(name, shape, colour, lx, ly, size, visible)=>{
      const a=VM.addActor({ name, shape, colour, size });
      a.dir=0; a.tilt=0; a.roll=0; a.visible=visible;
      wr(a,'x',lx); wr(a,'y',ly); a.y=1;
      VM.build(a); VM.setHome(a);
      return a;
    };
    make(ME,   'cone', '#7ee8ff', START.x, START.y, 1.1, true);
    const rock=make(ROCK, 'cube', '#9c8d7c', SPAWN_X, 0, 1.4, false);
    /* each copy carries its own speed — a sprite-only variable, so every
       rock keeps the number it was born with */
    rock.vars={ speed:0 };
  }

  /* ================================================ the given scripts */
  const B=(op,args,body)=>{ const b={ op, args:args||{} }; if(body) b.body=body; return b; };
  const IF=(cond,body)=>B('ctrl.if',{ c:cond }, body);
  /* one arrow key, fenced: move, and if that put you on THAT side's edge,
     move straight back. Up is fenced by the up edge, left by the left edge
     and so on round — the `touching [..] edge?` half is part 2 of the test. */
  const key=(k,a,n)=>IF(B('sense.key',{ k }), [
    B('motion.changeBy',{ a, n }),
    IF(B('sense.touch',{ o:k+' edge' }), [ B('motion.changeBy',{ a, n:-n }) ])
  ]);

  /* THE ASTEROIDS, finished. Harder the longer you last: every rock adds
     timer ÷ 300 to its speed, so a minute in they are roughly twice as fast. */
  function rockScripts(){
    return [
      { hat:B('event.flag'), body:[
        B('looks.hide'),
        B('motion.goto',{ x:SPAWN_X, y:0, z:1 }),
        B('ctrl.forever',{},[
          B('ctrl.clone'),
          B('ctrl.wait',{ n:B('op.random',{ a:0.25, b:0.7 }) })
        ])
      ]},
      { hat:B('event.clone'), body:[
        B('motion.goto',{ x:SPAWN_X, y:B('op.random',{ a:-8, b:8 }), z:1 }),
        B('looks.size',{ n:B('op.random',{ a:0.8, b:2.2 }) }),
        B('data.set',{ v:'speed', n:B('op.add',{
          a:B('op.div',{ a:B('op.random',{ a:12, b:28 }), b:100 }),
          b:B('op.div',{ a:B('sense.timer'), b:300 }) }) }),
        B('looks.show'),
        B('ctrl.repeatUntil',{ c:B('op.lt',{ a:B('motion.pos',{ a:'x' }), b:GONE_X }) },[
          B('motion.changeBy',{ a:'x', n:B('op.sub',{ a:0, b:B('data.get',{ v:'speed' }) }) }),
          B('motion.turn',{ a:'z', n:4 })
        ]),
        B('ctrl.delclone')
      ]}
    ];
  }
  /* THE AVATAR, as the student is handed it: where to stand, and nothing
     else. Everything after this line is the test. */
  function starter(){
    return [{ hat:B('event.flag'), body:[
      B('motion.goto',{ x:START.x, y:START.y, z:1 })
    ]}];
  }
  /* THE ANSWER KEY, for a teacher: open the page with ?answer. Never
     saved over a student's work. */
  function answer(){
    return [{ hat:B('event.flag'), body:[
      B('motion.goto',{ x:START.x, y:START.y, z:1 }),
      B('ctrl.forever',{},[
        key('up',    'y',  STEP),
        key('down',  'y', -STEP),
        key('left',  'x', -STEP),
        key('right', 'x',  STEP),
        IF(B('sense.touch',{ o:ROCK }), [
          B('looks.say',{ s:'Game over!' }),
          B('ctrl.stop',{ w:'all' })
        ])
      ])
    ]}];
  }

  /* ------------------------------------------------- keeping the work
     An exam lost to a refreshed tab is not an exam anybody sits twice,
     so the Avatar's blocks are kept in this browser. Only the Avatar's:
     the Asteroids are put back to the given scripts on every load. */
  const teacher = /[?&]answer\b/.test(location.search);
  function restore(){
    if(teacher) return answer();
    try{
      const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
      if(Array.isArray(s)) return s;
    }catch(e){}
    return starter();
  }
  let lastSaved='';
  function keep(){
    if(teacher) return;
    const a=actor(ME); if(!a) return;
    const s=JSON.stringify(a.scripts||[]);
    if(s===lastSaved) return;
    lastSaved=s;
    try{ localStorage.setItem(SAVE_KEY, s); }catch(e){}
  }
  function resetMine(){
    if(!confirm(T('Throw away your Avatar code and start again?'))) return;
    VM.stopAll();
    const a=actor(ME);
    a.scripts=starter();
    keep();
    if(window.CODER) CODER.render();
    check.up=check.down=check.left=check.right=check.edge=check.hit=false;
    SIDES.forEach(d=>{ side[d]=false; });
    paintChecks();
  }

  /* ==================================================== watching
     THE ROOM'S ONLY JUDGEMENT, and it is a measurement, not a rule. It
     uses the same reach `touching` does — (a + b) × 0.6 — so the room
     and the student's program cannot disagree about whether a rock hit. */
  const hitting = ()=>{
    const me=actor(ME); if(!me) return false;
    return VM.project.actors.some(o=>o.name===ROCK && o.visible!==false &&
      Math.hypot(o.x-me.x, o.z-me.z) < (me.size+o.size)*0.6);
  };
  const check={ up:false, down:false, left:false, right:false, edge:false, hit:false };

  /* THE EDGE, measured the way `touching edge?` measures it. vm.js puts
     the walls at ±(w/2 − 0.5) and a thing touches once its skin reaches
     one, so w = 2·16 + 1 puts them exactly on the drawn border. */
  window.LEVELS = Object.assign(window.LEVELS||{}, {
    dodge:{ w:ARENA.x*2+1, d:ARENA.y*2+1 } });
  /* FOUR WALLS, FOUR BLOCKS. Each side is judged on its own: the program
     has to contain `touching [up edge]?` for the top to count, and so on.
     A fence built out of `y position > 9` is a fence, but it is not this
     question. */
  const SIDES=['up','down','left','right'];
  const usesEdge = d=>{
    const walk=v=>{
      if(!v || typeof v!=='object') return false;
      if(Array.isArray(v)) return v.some(walk);
      if(v.op==='sense.touch' && v.args && v.args.o===d+' edge') return true;
      return Object.keys(v).some(k=>walk(v[k]));
    };
    const me=actor(ME); return !!(me && walk(me.scripts));
  };
  /* outside means the Avatar's middle is past the drawn line */
  const outside = p => Math.abs(p.x)>ARENA.x || Math.abs(p.y)>ARENA.y;
  /* against means pressed up against that one wall: within a step or so
     of where `touching [..] edge?` starts saying yes */
  const against = (p,me,d)=>{ const r=(me.size||1)*0.5+1;
    return d==='up'   ? p.y>= ARENA.y-r : d==='down'  ? p.y<=-(ARENA.y-r)
         : d==='left' ? p.x<=-(ARENA.x-r) : p.x>= ARENA.x-r; };
  const side={ up:false, down:false, left:false, right:false };   // walls passed
  let edgeTime={}, escaped=false;
  let was=null, wasRunning=false, runStart=0, survived=0, lastRun=-1;
  let best=0; try{ best=parseFloat(localStorage.getItem(BEST_KEY))||0; }catch(e){}
  let over=null;          // how the last run ended: 'hit' | 'stopped' | null

  function anyKey(){ return Object.keys(G.keys).some(k=>G.keys[k]); }
  function watch(dt){
    const me=actor(ME); if(!me) return;
    const now={ x:rd(me,'x'), y:rd(me,'y') };
    const running=VM.running;

    if(running && VM.runId!==lastRun){           // a fresh press of Run
      lastRun=VM.runId; runStart=performance.now(); over=null; hideOver();
      edgeTime={}; escaped=false;
      /* a `say` from the run that ended by `stop all` is still up — a
         restart does not clear bubbles, so the room says nothing for it */
      VM.project.actors.forEach(x=>{ if(x.saying) VM.runBlock({ op:'looks.say', args:{ s:'' } }, x); });
    }
    if(running){
      survived=(performance.now()-runStart)/1000;
      if(was && anyKey()){
        const dx=now.x-was.x, dy=now.y-was.y, e=1e-4;
        if(dy> e) check.up=true;    if(dy<-e) check.down=true;
        if(dx<-e) check.left=true;  if(dx> e) check.right=true;
      }
      /* STAYS INSIDE, one wall at a time: half a second pushed up against
         that wall, with a key held, without once getting past any wall
         this run — and with that wall's own `touching [..] edge?` in the
         program doing the stopping. Without a fence the Avatar crosses
         the edge zone in a few frames and is gone, so the half-second
         cannot be earned by accident. All four walls = the tick. */
      if(outside(now)) escaped=true;
      if(!escaped && anyKey()) SIDES.forEach(d=>{
        if(!against(now,me,d)) return;
        edgeTime[d]=(edgeTime[d]||0)+dt;
        if(edgeTime[d]>=0.5 && usesEdge(d)) side[d]=true;
      });
      check.edge = SIDES.every(d=>side[d]);
    }
    if(wasRunning && !running){                  // the program just stopped
      over = hitting() ? 'hit' : 'stopped';
      if(over==='hit'){
        check.hit=true;
        if(survived>best){ best=survived; try{ localStorage.setItem(BEST_KEY, String(best)); }catch(e){} }
      }
      showOver();
    }
    wasRunning=running;
    was=now;

    /* A HIT THE PROGRAM IGNORED is shown, not scored: the Avatar flashes
       red while a rock is inside it. It is the evidence that step 2 is
       missing, and it is all the room says about it. */
    const red = running && hitting();
    if(me.mesh && me.mesh.material && me.mesh.material.color)
      me.mesh.material.color.set(red ? '#ff5a5a' : me.colour);
    const warn=$('#dgWarn'); if(warn) warn.classList.toggle('hidden', !red);
    const out=$('#dgOut'); if(out) out.classList.toggle('hidden', !(running && outside(now)));
  }

  /* ============================================= the script, as a PDF
     WHAT A STUDENT HANDS IN: their Avatar's blocks written out as text,
     one block to a line and indented the way they nest, under their name,
     the date, their best time and the checklist as it stands.

     THE PDF IS WRITTEN HERE, by hand. The whole folder runs with no
     network and no install, and a PDF library off a CDN would break that
     on the first lab machine without internet. Text in Courier is the
     simplest PDF there is: a few objects, a content stream per page, and
     a table of byte offsets at the end. */
  const ASCII = str => String(str==null?'':str)
    .replace(/▶ */g,'').replace(/[−–—]/g,'-').replace(/×/g,'*').replace(/÷/g,'/')
    .replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/…/g,'...')
    .replace(/[^\x20-\x7e]/g,'?');
  function inline(bk){
    const bd=window.BLOCKS && BLOCKS.of(bk.op); if(!bd) return bk.op;
    return BLOCKS.parts(bd.label).map(seg=>{
      if(seg[0]!=='%') return seg;
      const k=seg[1], sp=bd.args[k]||{}, v=(bk.args||{})[k];
      if(v && typeof v==='object' && v.op){
        const kd=(BLOCKS.of(v.op)||{}).kind;
        return kd==='bool' ? '<'+inline(v)+'>' : '('+inline(v)+')';
      }
      if(sp.type==='bool') return '< >';
      if(sp.type==='num' || sp.type==='str') return '('+(v==null?'':v)+')';
      return '['+(v==null?'':v)+']';
    }).join('');
  }
  function lines(list, depth, out){
    const pad='    '.repeat(depth);
    (list||[]).forEach(bk=>{
      out.push(pad+inline(bk));
      const kd=(BLOCKS.of(bk.op)||{}).kind;
      if(kd==='c' || kd==='c2'){
        lines(bk.body, depth+1, out);
        if(kd==='c2'){ out.push(pad+'else'); lines(bk.body2, depth+1, out); }
        out.push(pad+'end');
      }
    });
    return out;
  }
  function scriptText(){
    const me=actor(ME), out=[];
    (me && me.scripts || []).forEach((sc,i)=>{
      if(i) out.push('');
      if(sc.hat){ out.push(inline(sc.hat)); lines(sc.body, 1, out); }
      else lines(sc.body, 0, out);
    });
    return out.length ? out : ['(no blocks yet)'];
  }
  /* a hundred lines of PDF: pages of Courier, a bold line where asked */
  function pdf(rows){
    const W=612, H=792, M=54, LH=13, COLS=84, PER=Math.floor((H-2*M)/LH);
    const wrapped=[];
    rows.forEach(r=>{
      let t=ASCII(r.t), lead=(t.match(/^ */)||[''])[0]+'      ';
      if(!t.length){ wrapped.push({ t:'', b:r.b }); return; }
      while(t.length>COLS){ wrapped.push({ t:t.slice(0,COLS), b:r.b }); t=lead+t.slice(COLS); }
      wrapped.push({ t, b:r.b });
    });
    const pages=[];
    for(let i=0;i<wrapped.length;i+=PER) pages.push(wrapped.slice(i,i+PER));
    const esc=t=>t.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
    const objs=[];                                   // index 0 is object 1
    objs[0]='<< /Type /Catalog /Pages 2 0 R >>';
    objs[2]='<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>';
    objs[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>';
    const kids=[];
    pages.forEach((pg,n)=>{
      const pageNo=6+n*2, streamNo=pageNo+1;   // 1-4 fonts and tree, 5 is Info
      let body='BT\n'+LH+' TL\n'+M+' '+(H-M)+' Td\n';
      pg.forEach(r=>{ body+=(r.b?'/F2':'/F1')+' 10 Tf\n('+esc(r.t)+') Tj T*\n'; });
      body+='/F1 8 Tf\nET\nBT /F1 8 Tf '+(W-M-60)+' '+(M/2)+' Td (page '+(n+1)+' of '+pages.length+') Tj ET\n';
      objs[pageNo-1]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+'] '+
        '/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+streamNo+' 0 R >>';
      objs[streamNo-1]='<< /Length '+body.length+' >>\nstream\n'+body+'endstream';
      kids.push(pageNo+' 0 R');
    });
    objs[1]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>';
    objs[4]='<< /Producer (Asteroid Dodge) >>';
    let out='%PDF-1.4\n'; const at=[];
    objs.forEach((o,i)=>{ at[i]=out.length; out+=(i+1)+' 0 obj\n'+o+'\nendobj\n'; });
    const xref=out.length;
    out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n'+
      at.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+
      'trailer\n<< /Size '+(objs.length+1)+' /Root 1 0 R /Info 5 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
    return out;
  }
  const NAME_KEY='asteroid-dodge.name';
  function download(){
    let name=''; try{ name=localStorage.getItem(NAME_KEY)||''; }catch(e){}
    const typed=prompt(T('Your name, for the top of the page:'), name);
    if(typed===null) return;                   // cancelled
    name=typed.trim();
    try{ localStorage.setItem(NAME_KEY, name); }catch(e){}
    const done=ITEMS.filter(i=>check[i[0]]).length;
    const rows=[
      { t:'ASTEROID DODGE - Block Coding Test', b:true },
      { t:'' },
      { t:'Student:     '+(name||'(no name)') },
      { t:'Date:        '+new Date().toLocaleString() },
      { t:'Best time:   '+best.toFixed(1)+' s' },
      { t:'' },
      { t:'CHECKLIST  '+done+'/'+ITEMS.length, b:true },
      ...ITEMS.map(([k,txt])=>({ t:(check[k]?'[x] ':'[ ] ')+txt })),
      { t:'' },
      { t:'AVATAR SCRIPT', b:true },
      { t:'' },
      ...scriptText().map(t=>({ t }))
    ];
    const blob=new Blob([pdf(rows)], { type:'application/pdf' });
    const a=document.createElement('a');
    const slug=(name||'student').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'student';
    a.href=URL.createObjectURL(blob);
    a.download='asteroid-dodge-'+slug+'.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
  }

  /* ==================================================== the screen */
  const ITEMS=[
    ['up',    'Avatar moves UP when you press a key'],
    ['down',  'Avatar moves DOWN when you press a key'],
    ['left',  'Avatar moves LEFT when you press a key'],
    ['right', 'Avatar moves RIGHT when you press a key'],
    ['edge',  'Avatar can\'t leave the arena — touching up / down / left / right edge?'],
    ['hit',   'Game ENDS (stop all) when an Asteroid hits you']
  ];
  function paintChecks(){
    const el=$('#dgChecks'); if(!el) return;
    const done=ITEMS.filter(i=>check[i[0]]).length;
    el.innerHTML=`<div class="dg-h">${T('YOUR TEST')} <b>${done}/${ITEMS.length}</b></div>`+
      ITEMS.map(([k,s])=>`<div class="dg-c ${check[k]?'ok':''}"><i>${check[k]?'✓':''}</i><span>${T(s)}${
        k==='edge' ? `<span class="dg-sides">${SIDES.map(d=>
          `<em class="${side[d]?'ok':''}">${({up:'↑ up',down:'↓ down',left:'← left',right:'→ right'})[d]}</em>`).join('')}</span>` : ''
      }</span></div>`).join('');
  }
  function clock(){
    const el=$('#dgClock'); if(!el) return;
    el.innerHTML=`<span>${T('SURVIVED')} <b>${survived.toFixed(1)}s</b></span>`+
                 `<span class="dg-best">${T('BEST')} <b>${best.toFixed(1)}s</b></span>`;
  }
  function runBtn(){
    const b=$('#dgRun'); if(!b) return;
    const live=VM.running;
    b.textContent = live ? '■ '+T('STOP') : '▶ '+T('RUN');
    b.classList.toggle('live', live);
  }
  function showOver(){
    const el=$('#dgOver'); if(!el) return;
    el.innerHTML = over==='hit'
      ? `<b>💥 ${T('GAME OVER')}</b><span>${T('You survived')} <em>${survived.toFixed(1)}s</em></span>
         <span class="dg-sub">${T('Best')}: ${best.toFixed(1)}s</span>
         <button class="btn good" id="dgAgain">▶ ${T('Play again')}</button>`
      : `<b>■ ${T('STOPPED')}</b><span>${T('The program stopped, but not because an Asteroid hit you.')}</span>
         <button class="btn good" id="dgAgain">▶ ${T('Run again')}</button>`;
    el.classList.remove('hidden');
    const again=$('#dgAgain'); if(again) again.onclick=()=>{ VM.greenFlag(); };
  }
  function hideOver(){ const el=$('#dgOver'); if(el) el.classList.add('hidden'); }

  /* THE CAMERA, straight down and orthographic like Pong's — but framed
     on the ARENA rather than on whatever the project contains, so the
     rocks enter from exactly the right edge on every screen shape. Same
     orientation as VM.stageCam: x across, y up the screen. */
  let cam=null;
  function camera(){
    const aspect=innerWidth/Math.max(1,innerHeight);
    if(!cam) cam=new THREE.OrthographicCamera(-1,1,1,-1,0.1,400);
    /* room round the arena for the numbers: y values on the left, x values
       underneath. Nudged left and down so the arena sits in the middle of
       what is left over. */
    const h=Math.max(ARENA.y+2.2, (ARENA.x+3.6)/aspect), w=h*aspect;
    cam.left=-w; cam.right=w; cam.top=h; cam.bottom=-h;
    cam.position.set(-0.8,120,0.4); cam.up.set(0,0,-1); cam.lookAt(-0.8,0,0.4);
    cam.updateProjectionMatrix();
    G.camera=cam;
  }

  /* clicking an object opens its blocks — both of them are readable */
  function pickAt(ev){
    if(window.CODER && CODER.open) return;
    const c=$('#view'); if(!c || !G.camera) return;
    const b=c.getBoundingClientRect();
    const ndc=new THREE.Vector2(((ev.clientX-b.left)/b.width)*2-1, -((ev.clientY-b.top)/b.height)*2+1);
    const ray=new THREE.Raycaster(); ray.setFromCamera(ndc, G.camera);
    const hit=ray.intersectObjects(G.hits||[], true).find(h=>h.object.userData && h.object.userData.actor);
    let a=hit ? hit.object.userData.actor : null;
    if(a && a.isClone) a=actor(a.name);          // a copy's code IS the spawner's
    if(a && window.CODER){ CODER.setActor(a); CODER.show(); }
  }

  /* ==================================================== in */
  let on=false;
  function start(){
    on=true;
    G.room='dodge';
    build();
    G.hits=[];            // the VM fills this with every object's aim box
    VM.useScratch();
    VM.enter(G.roomGroup);
    VM.project.actors.slice().forEach(a=>VM.delActor(a));
    cast();
    actor(ROCK).scripts=rockScripts();
    actor(ME).scripts=restore();
    lastSaved=JSON.stringify(actor(ME).scripts);
    camera();
    if(window.CODER){
      CODER.restrict(Object.assign({ defaults:SET }, PALETTE));
      CODER.setActor(actor(ME));
    }
    $('#view').addEventListener('pointerdown', pickAt);
    $('#dgOpen').onclick=()=>{ if(window.CODER) CODER.toggle(); };
    $('#dgRun').onclick=()=>{ if(VM.running) VM.stopAll(); else VM.greenFlag(); };
    $('#dgReset').onclick=resetMine;
    $('#dgPdf').onclick=download;
    $('#dgGo').onclick=()=>{
      $('#dgBrief').classList.add('hidden');
      if(window.CODER){ CODER.setActor(actor(ME)); CODER.show(); }
    };
    $('#dgHelp').onclick=()=>$('#dgBrief').classList.remove('hidden');
    if(teacher) $('#dgTeacher').classList.remove('hidden');
    paintChecks(); clock(); runBtn();
  }

  let keepT=0;
  function tick(dt){
    if(!on) return;
    VM.step(dt);
    /* everything lives at one height, so `touching` is a 2D question */
    VM.project.actors.forEach(a=>{ if(a.y!==1){ a.y=1; VM.sync(a); } });
    watch(dt);
    camera();
    if(starfield) starfield.position.x = ((starfield.position.x - dt*0.6 + 35) % 70) - 35;
    if(window.CODER) CODER.tick(dt);
    const hud=$('#dodge'); if(hud) hud.classList.toggle('coding', !!(window.CODER && CODER.open));
    paintChecks(); clock(); runBtn();
    if((keepT+=dt)>1){ keepT=0; keep(); }
  }

  return { start, tick, ME, ROCK, ARENA, answer, starter, check, scriptText, pdf, download,
           get active(){ return on; },
           get survived(){ return survived; },
           get over(){ return over; } };
})();
