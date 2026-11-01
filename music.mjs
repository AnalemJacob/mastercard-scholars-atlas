const button=document.createElement('button');
button.type='button';button.className='atlas-music-button';button.textContent='♫ Africa Arise';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','atlasMusic');
const widget=document.createElement('div');widget.className='atlas-music-widget';
const handle=document.createElement('button');handle.type='button';handle.className='music-move-handle';handle.textContent='⠿';handle.title='Drag to move music player';handle.setAttribute('aria-label','Move music player: drag or use arrow keys');
widget.append(handle,button);
const panel=document.createElement('section');panel.id='atlasMusic';panel.className='atlas-music-panel';panel.hidden=true;panel.setAttribute('aria-label','Africa Arise music player');
panel.innerHTML='<div class="music-heading" title="Drag here to move player"><strong><span aria-hidden="true">⠿</span> Africa Arise</strong><button type="button" aria-label="Close music player">×</button></div><audio preload="none" src="media/africa-arise.mp3"></audio><div class="music-playback"><button type="button" class="music-play" aria-label="Play song">▶</button><input class="music-seek" type="range" min="0" max="164" step="0.1" value="0" aria-label="Song position"><span class="music-time">0:00</span></div><div class="music-options"><small>Ngoma Empire</small><button type="button" class="music-loop" aria-label="Repeat song" aria-pressed="false" title="Repeat song">↻</button><button type="button" class="music-mute" aria-label="Mute song" title="Mute song">♪</button><input class="music-volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume"></div><span class="music-message" role="status" hidden></span>';
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
button.onclick=()=>{if(suppressClick){suppressClick=false;return;}if(!panel.hidden){close();return;}panel.hidden=false;button.setAttribute('aria-expanded','true');if(audio.readyState===0){audio.preload='metadata';audio.load();}placePanel();};
handle.onclick=()=>{suppressClick=false;};
panel.querySelector('button').onclick=close;
const play=panel.querySelector('.music-play'),seek=panel.querySelector('.music-seek'),time=panel.querySelector('.music-time'),loop=panel.querySelector('.music-loop'),mute=panel.querySelector('.music-mute');
const clock=n=>Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
play.onclick=async()=>{if(audio.paused){try{await audio.play();}catch{const msg=panel.querySelector('.music-message');msg.hidden=false;msg.textContent='Unable to play. Please try again.';}}else audio.pause();};
function updatePlayback(){play.textContent=audio.paused?'▶':'Ⅱ';play.setAttribute('aria-label',audio.paused?'Play song':'Pause song');}
for(const event of ['play','pause','ended'])audio.addEventListener(event,updatePlayback);
audio.addEventListener('loadedmetadata',()=>{seek.max=audio.duration;});
audio.addEventListener('timeupdate',()=>{seek.value=audio.currentTime;time.textContent=clock(audio.currentTime);});
seek.oninput=e=>{if(Number.isFinite(audio.duration))audio.currentTime=Number(e.target.value);};
loop.onclick=()=>{audio.loop=!audio.loop;loop.setAttribute('aria-pressed',String(audio.loop));};
mute.onclick=()=>{audio.muted=!audio.muted;mute.textContent=audio.muted?'×':'♪';mute.setAttribute('aria-label',audio.muted?'Unmute song':'Mute song');};
panel.querySelector('.music-volume').oninput=e=>{audio.volume=Number(e.target.value);audio.muted=false;mute.textContent='♪';mute.setAttribute('aria-label','Mute song');};
audio.addEventListener('error',()=>{const msg=panel.querySelector('.music-message');msg.hidden=false;msg.textContent='Song unavailable. Please refresh and retry.';});
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
