const button=document.createElement('button');
button.type='button';button.className='atlas-music-button';button.textContent='♫ Africa Arise';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','atlasMusic');
const widget=document.createElement('div');widget.className='atlas-music-widget';
const handle=document.createElement('button');handle.type='button';handle.className='music-move-handle';handle.textContent='⠿';handle.title='Drag to move music player';handle.setAttribute('aria-label','Move music player: drag or use arrow keys');
widget.append(handle,button);
const panel=document.createElement('section');panel.id='atlasMusic';panel.className='atlas-music-panel';panel.hidden=true;panel.setAttribute('aria-label','Africa Arise music player');
panel.innerHTML='<div class="music-heading" title="Drag here to move player"><div><strong><span aria-hidden="true">⠿</span> Africa Arise</strong><small>Ngoma Empire · drag this bar to move</small></div><button type="button" aria-label="Close music player">×</button></div><audio controls preload="none" aria-label="Play Africa Arise" src="media/africa-arise.mp3"></audio><label class="music-repeat"><input type="checkbox"> Repeat song</label><p class="music-message" role="status">Play while you explore the map.</p>';
const area=document.querySelector('.map-area');area.append(widget,panel);
const audio=panel.querySelector('audio');
let drag=null,suppressClick=false,position=null;
function clamp(n,min,max){return Math.max(min,Math.min(n,Math.max(min,max)));}
function placePanel(){
 if(panel.hidden)return;
 const a=area.getBoundingClientRect(),b=widget.getBoundingClientRect();
 const x=clamp(b.left-a.left,8,area.clientWidth-panel.offsetWidth-8);
 const above=b.top-a.top-panel.offsetHeight-10;
 const y=clamp(above>=8?above:b.bottom-a.top+10,8,area.clientHeight-panel.offsetHeight-8);
 Object.assign(panel.style,{left:x+'px',top:y+'px',right:'auto',bottom:'auto'});
}
function placeWidget(x,y){
 x=clamp(x,8,area.clientWidth-widget.offsetWidth-8);y=clamp(y,8,area.clientHeight-widget.offsetHeight-8);
 Object.assign(widget.style,{left:x+'px',top:y+'px',right:'auto',bottom:'auto'});
 position={x:x/Math.max(1,area.clientWidth-widget.offsetWidth),y:y/Math.max(1,area.clientHeight-widget.offsetHeight)};
 placePanel();
}
function close(){audio.pause();panel.hidden=true;button.setAttribute('aria-expanded','false');button.focus();}
button.onclick=()=>{if(suppressClick){suppressClick=false;return;}if(!panel.hidden){close();return;}panel.hidden=false;button.setAttribute('aria-expanded','true');placePanel();};
handle.onclick=()=>{suppressClick=false;};
panel.querySelector('button').onclick=close;
panel.querySelector('input').onchange=e=>{audio.loop=e.target.checked;};
audio.addEventListener('error',()=>{panel.querySelector('.music-message').textContent='The song could not load. Refresh the page and try again.';});
panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}});
button.title='Click to play · drag using the dotted handle';
function begin(e){
 if(e.button!==0||e.target.closest('[aria-label="Close music player"]'))return;
 const a=area.getBoundingClientRect(),b=widget.getBoundingClientRect();
 suppressClick=false;drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:b.left-a.left,top:b.top-a.top,moved:false};
 // Listen on the document as well: dragging must survive leaving the handle.
 if(e.currentTarget!==button)e.preventDefault();
 e.stopPropagation();
 try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}
}
for(const el of [button,handle,panel.querySelector('.music-heading')]){
 el.addEventListener('pointerdown',begin);el.addEventListener('dragstart',e=>e.preventDefault());
}
document.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.id)return;
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(!drag.moved&&Math.hypot(dx,dy)<4)return;
 drag.moved=true;widget.classList.add('is-dragging');e.preventDefault();
 placeWidget(drag.left+dx,drag.top+dy);
},{passive:false,capture:true});
function end(e){if(!drag||e.pointerId!==drag.id)return;suppressClick=drag.moved;drag=null;widget.classList.remove('is-dragging');}
document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true);
for(const el of [button,handle])el.addEventListener('keydown',e=>{
 const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
 if(!d)return;e.preventDefault();const a=area.getBoundingClientRect(),b=widget.getBoundingClientRect(),step=e.shiftKey?30:10;
 placeWidget(b.left-a.left+d[0]*step,b.top-a.top+d[1]*step);
});
new ResizeObserver(()=>{if(position){const p={...position};placeWidget(p.x*(area.clientWidth-widget.offsetWidth),p.y*(area.clientHeight-widget.offsetHeight));}else placePanel();}).observe(area);
