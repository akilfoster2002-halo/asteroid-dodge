/* =====================================================================
   BOOT — the renderer, the keyboard and the frame loop, and nothing else.

   The same shim Pong's standalone page uses in place of KORO's game.js:
   blocks.js, vm.js and coder.js only need a scene, a camera, somewhere to
   read the keyboard and something calling them sixty times a second.
   Everything that is the game is in dodge.js.
   ===================================================================== */
(function(){
  const $ = s => document.querySelector(s);

  const G = window.G = {
    renderer:null, scene:null, camera:null, roomGroup:null,
    solids:[], hits:[], ceiling:null, ground:()=>0,
    keys:{}, pos:{ x:0, y:0, z:0 },
    running:false, firstPerson:false,
    room:null, hudOwner:null, missionId:null, focused:null, selected:null
  };

  /* `say` draws its bubble in the page's typeface and asks uiFont() which
     that is; game.js defines it in the full game, so it is defined here */
  let _face=null;
  window.uiFont = window.uiFont || function uiFont(){
    if(_face===null){
      try{ _face=getComputedStyle(document.documentElement).getPropertyValue('--font').trim(); }
      catch(e){ _face=''; }
      if(!_face) _face='ui-monospace,Menlo,Consolas,monospace';
    }
    return _face;
  };

  const typing = el => !!(el && (el.tagName==='INPUT' || el.tagName==='TEXTAREA' ||
                                 el.tagName==='SELECT' || el.isContentEditable));
  const STEER=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space',
               'KeyW','KeyA','KeyS','KeyD'];

  function boot(){
    const canvas=$('#view');
    G.renderer=new THREE.WebGLRenderer({ canvas, antialias:true });
    G.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.5));
    G.scene=new THREE.Scene();
    G.camera=new THREE.PerspectiveCamera(60,1,0.3,400);
    size(); addEventListener('resize', size);

    addEventListener('keydown', e=>{
      if(typing(e.target)) return;
      G.keys[e.code]=true;
      if(e.code==='KeyC' && window.CODER){ e.preventDefault(); CODER.toggle(); }
      if(STEER.includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e=>{ G.keys[e.code]=false; });
    addEventListener('blur', ()=>{ for(const k in G.keys) G.keys[k]=false; });

    DODGE.start();

    let last=performance.now();
    (function frame(now){
      requestAnimationFrame(frame);
      const dt=Math.min(0.05, (now-last)/1000); last=now;
      if(DODGE.active) DODGE.tick(dt);
      if(G.scene && G.camera) G.renderer.render(G.scene, G.camera);
    })(last);
  }
  function size(){
    G.renderer.setSize(innerWidth, innerHeight, false);
    if(G.camera && G.camera.isPerspectiveCamera){
      G.camera.aspect=innerWidth/Math.max(1,innerHeight);
      G.camera.updateProjectionMatrix();
    }
  }

  if(!window.THREE){ fail('The 3D library did not load.'); return; }
  try{ boot(); }
  catch(e){ fail(e && e.message ? e.message : String(e)); }

  function fail(why){
    const el=document.createElement('div');
    el.className='dg-sorry';
    el.innerHTML='<b>Asteroid Dodge could not start</b><small>'+
      String(why).replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+
      '</small><small>Try a different browser, or ask a teacher.</small>';
    document.body.appendChild(el);
    console.error('[dodge]', why);
  }
})();
