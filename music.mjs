const button=document.createElement('button');
button.type='button';button.className='atlas-music-button';button.textContent='♫ Africa Arise';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','atlasMusic');
const panel=document.createElement('section');panel.id='atlasMusic';panel.className='atlas-music-panel';panel.hidden=true;panel.setAttribute('aria-label','Africa Arise music player');
panel.innerHTML='<div class="music-heading"><div><strong>Africa Arise</strong><small>Ngoma Empire</small></div><button type="button" aria-label="Close music player">×</button></div><audio controls preload="none" aria-label="Play Africa Arise" src="media/africa-arise.mp3"></audio><label class="music-repeat"><input type="checkbox"> Repeat song</label><p class="music-message" role="status">Play while you explore the map.</p>';
const area=document.querySelector('.map-area');area.append(button,panel);
const audio=panel.querySelector('audio');
function close(){audio.pause();panel.hidden=true;button.setAttribute('aria-expanded','false');button.focus();}
button.onclick=()=>{if(suppressClick){suppressClick=false;return;}if(!panel.hidden){close();return;}panel.hidden=false;button.setAttribute('aria-expanded','true');placePanel();};
panel.querySelector('button').onclick=close;
panel.querySelector('input').onchange=e=>{audio.loop=e.target.checked;};
audio.addEventListener('error',()=>{panel.querySelector('.music-message').textContent='The song could not load. Refresh the page and try again.';});
panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}});

// Pointer capture keeps dragging smooth even when the pointer leaves the button.
let drag=null,suppressClick=false,position=null;
button.title='Drag to move · click to open · arrow keys to reposition';
function clamp(n,min,max){return Math.max(min,Math.min(n,Math.max(min,max)));}
function placePanel(){
 if(panel.hidden)return;
 const a=area.getBoundingClientRect(),b=button.getBoundingClientRect();
 const x=clamp(b.left-a.left,8,area.clientWidth-panel.offsetWidth-8);
 const above=b.top-a.top-panel.offsetHeight-10;
 const y=clamp(above>=8?above:b.bottom-a.top+10,8,area.clientHeight-panel.offsetHeight-8);
 Object.assign(panel.style,{left:x+'px',top:y+'px',right:'auto',bottom:'auto'});
}
function placeButton(x,y){
 x=clamp(x,8,area.clientWidth-button.offsetWidth-8);
 y=clamp(y,8,area.clientHeight-button.offsetHeight-8);
 Object.assign(button.style,{left:x+'px',top:y+'px',right:'auto',bottom:'auto'});
 position={x:x/Math.max(1,area.clientWidth-button.offsetWidth),y:y/Math.max(1,area.clientHeight-button.offsetHeight)};
 placePanel();
}
button.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 suppressClick=false;
 const a=area.getBoundingClientRect(),b=button.getBoundingClientRect();
 drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:b.left-a.left,top:b.top-a.top,moved:false};
 button.setPointerCapture(e.pointerId);
});
button.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.id)return;
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(!drag.moved&&Math.hypot(dx,dy)<5)return;
 drag.moved=true;button.classList.add('is-dragging');
 placeButton(drag.left+dx,drag.top+dy);
});
function endDrag(e){
 if(!drag||e.pointerId!==drag.id)return;
 suppressClick=drag.moved;drag=null;button.classList.remove('is-dragging');
 if(button.hasPointerCapture(e.pointerId))button.releasePointerCapture(e.pointerId);
}
button.addEventListener('pointerup',endDrag);button.addEventListener('pointercancel',endDrag);
button.addEventListener('keydown',e=>{
 const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
 const d=moves[e.key];if(!d)return;e.preventDefault();
 const a=area.getBoundingClientRect(),b=button.getBoundingClientRect(),step=e.shiftKey?30:10;
 placeButton(b.left-a.left+d[0]*step,b.top-a.top+d[1]*step);
});
new ResizeObserver(()=>{if(position){const p={...position};placeButton(p.x*(area.clientWidth-button.offsetWidth),p.y*(area.clientHeight-button.offsetHeight));}else placePanel();}).observe(area);
