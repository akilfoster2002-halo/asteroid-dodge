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

    world.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key=new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(-10, 40, 12); world.add(key);
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
  const key=(k,a,n)=>IF(B('sense.key',{ k }), [ B('motion.changeBy',{ a, n }) ]);

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
    check.up=check.down=check.left=check.right=check.hit=false;
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
  const check={ up:false, down:false, left:false, right:false, hit:false };
  let was=null, wasRunning=false, runStart=0, survived=0, lastRun=-1;
  let best=0; try{ best=parseFloat(localStorage.getItem(BEST_KEY))||0; }catch(e){}
  let over=null;          // how the last run ended: 'hit' | 'stopped' | null

  function anyKey(){ return Object.keys(G.keys).some(k=>G.keys[k]); }
  function watch(){
    const me=actor(ME); if(!me) return;
    const now={ x:rd(me,'x'), y:rd(me,'y') };
    const running=VM.running;

    if(running && VM.runId!==lastRun){           // a fresh press of Run
      lastRun=VM.runId; runStart=performance.now(); over=null; hideOver();
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
  }

  /* ==================================================== the screen */
  const ITEMS=[
    ['up',    'Avatar moves UP when you press a key'],
    ['down',  'Avatar moves DOWN when you press a key'],
    ['left',  'Avatar moves LEFT when you press a key'],
    ['right', 'Avatar moves RIGHT when you press a key'],
    ['hit',   'Game ENDS (stop all) when an Asteroid hits you']
  ];
  function paintChecks(){
    const el=$('#dgChecks'); if(!el) return;
    const done=ITEMS.filter(i=>check[i[0]]).length;
    el.innerHTML=`<div class="dg-h">${T('YOUR TEST')} <b>${done}/${ITEMS.length}</b></div>`+
      ITEMS.map(([k,s])=>`<div class="dg-c ${check[k]?'ok':''}"><i>${check[k]?'✓':''}</i>${T(s)}</div>`).join('');
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
    const h=Math.max(ARENA.y+1.5, (ARENA.x+1.5)/aspect), w=h*aspect;
    cam.left=-w; cam.right=w; cam.top=h; cam.bottom=-h;
    cam.position.set(0,120,0); cam.up.set(0,0,-1); cam.lookAt(0,0,0);
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
    watch();
    camera();
    if(starfield) starfield.position.x = ((starfield.position.x - dt*0.6 + 35) % 70) - 35;
    if(window.CODER) CODER.tick(dt);
    const hud=$('#dodge'); if(hud) hud.classList.toggle('coding', !!(window.CODER && CODER.open));
    paintChecks(); clock(); runBtn();
    if((keepT+=dt)>1){ keepT=0; keep(); }
  }

  return { start, tick, ME, ROCK, ARENA, answer, starter, check,
           get active(){ return on; },
           get survived(){ return survived; },
           get over(){ return over; } };
})();
