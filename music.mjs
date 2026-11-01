const button=document.createElement('button');
button.type='button';button.className='atlas-music-button';button.textContent='♫ Africa Arise';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','atlasMusic');
const panel=document.createElement('section');panel.id='atlasMusic';panel.className='atlas-music-panel';panel.hidden=true;panel.setAttribute('aria-label','Africa Arise music player');
panel.innerHTML='<div class="music-heading"><div><strong>Africa Arise</strong><small>Ngoma Empire · YouTube</small></div><button type="button" aria-label="Close music player">×</button></div><div class="music-video"></div><p>Press Play to listen. View the words shown in the video, or use CC if available.</p><a href="https://www.youtube.com/watch?v=sUrFklFRhW0" target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a>';
const area=document.querySelector('.map-area');area.append(button,panel);
function close(){panel.hidden=true;button.setAttribute('aria-expanded','false');panel.querySelector('.music-video').replaceChildren();button.focus();}
button.onclick=()=>{if(!panel.hidden){close();return;}panel.hidden=false;button.setAttribute('aria-expanded','true');const iframe=document.createElement('iframe');iframe.title='Africa Arise — Ngoma Empire';iframe.src='https://www.youtube-nocookie.com/embed/sUrFklFRhW0?playsinline=1&cc_load_policy=1&rel=0';iframe.allow='encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';panel.querySelector('.music-video').append(iframe);};
panel.querySelector('button').onclick=close;
panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}});
