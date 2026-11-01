const button=document.createElement('button');
button.type='button';button.className='atlas-music-button';button.textContent='♫ Africa Arise';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','atlasMusic');
const panel=document.createElement('section');panel.id='atlasMusic';panel.className='atlas-music-panel';panel.hidden=true;panel.setAttribute('aria-label','Africa Arise music player');
panel.innerHTML='<div class="music-heading"><div><strong>Africa Arise</strong><small>Ngoma Empire</small></div><button type="button" aria-label="Close music player">×</button></div><audio controls preload="none" aria-label="Play Africa Arise" src="media/africa-arise.mp3"></audio><label class="music-repeat"><input type="checkbox"> Repeat song</label><p class="music-message" role="status">Play while you explore the map.</p>';
const area=document.querySelector('.map-area');area.append(button,panel);
const audio=panel.querySelector('audio');
function close(){audio.pause();panel.hidden=true;button.setAttribute('aria-expanded','false');button.focus();}
button.onclick=()=>{if(!panel.hidden){close();return;}panel.hidden=false;button.setAttribute('aria-expanded','true');};
panel.querySelector('button').onclick=close;
panel.querySelector('input').onchange=e=>{audio.loop=e.target.checked;};
audio.addEventListener('error',()=>{panel.querySelector('.music-message').textContent='The song could not load. Refresh the page and try again.';});
panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}});
