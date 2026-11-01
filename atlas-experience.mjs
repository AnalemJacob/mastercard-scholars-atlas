import {escapeHTML as esc,safeURL} from './core.mjs';

// Keep permanent labels within the viewport and clear of each other.
export function placeCountryLabels(points,width,height){
 const occupied=[],result=new Map();
 for(const p of [...points].sort((a,b)=>b.count-a.count||a.code.localeCompare(b.code))){
  const w=p.name.length*6.4+34,h=25;
  for(const [direction,dx,dy] of [['right',14,0],['left',-14,0],['right',14,-29],['left',-14,29],['right',14,29],['left',-14,-29]]){
   const x=direction==='right'?p.x+dx:p.x+dx-w,y=p.y+dy-h/2;
   const rect={x,y,w,h};
   if(x<8||y<8||x+w>width-8||y+h>height-8)continue;
   if(occupied.some(a=>x<a.x+a.w+7&&x+w+7>a.x&&y<a.y+a.h+5&&y+h+5>a.y))continue;
   occupied.push(rect);result.set(p.code,{direction,offset:[dx,dy]});break;
  }
 }
 return result;
}

export function setupExperience(api){
 const {state,render,currentStorySteps,startStory,selectScholar,frameStory,toast}=api;
 const $=id=>document.getElementById(id),area=document.querySelector('.map-area');
 let playing=false,playKey='',timer=null,arrivalAt=0,arrivalKey='',previousStory='';
 const controls=document.createElement('section');controls.className='journey-dock';controls.hidden=true;controls.setAttribute('aria-label','Journey progress and playback');area.append(controls);
 const legend=document.querySelector('.legend'),heading=legend.querySelector('.legend-heading');
 const toggle=document.createElement('button');toggle.className='legend-toggle';toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-controls','countryLegendBody');toggle.textContent='Show countries +';toggle.setAttribute('aria-expanded','false');heading.append(toggle);
 const body=document.createElement('div');body.id='countryLegendBody';while(heading.nextSibling)body.append(heading.nextSibling);legend.append(body);body.hidden=true;
 toggle.onclick=()=>{body.hidden=!body.hidden;toggle.setAttribute('aria-expanded',String(!body.hidden));toggle.textContent=body.hidden?'Show countries +':'Hide countries −';layout();};
 let resizeFrame,initialFrame=true;
 function layout(){cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{
  const mobile=matchMedia('(max-width:760px)').matches;
  const detail=!$('detailCard').hidden;
  const dockHeight=controls.hidden?0:controls.offsetHeight;
  const bottom=state.story?mobile&&detail?area.clientHeight*.34+dockHeight+35:dockHeight+38:mobile&&detail?Math.max(area.clientHeight*.34+20,legend.offsetHeight+40):legend.offsetHeight+40;
  area.style.setProperty('--map-bottom',bottom+'px');
  state.map?.invalidateSize({pan:false});
  if(initialFrame){initialFrame=false;if(!state.story&&!state.detail&&state.mode==='journeys')api.fitJourneyMap();}
 });}
 const layoutObserver=new ResizeObserver(layout);layoutObserver.observe(legend);layoutObserver.observe(controls);window.addEventListener('resize',layout);
 function stop(){playing=false;clearTimeout(timer);timer=null;arrivalAt=0;arrivalKey='';}
 function go(index){const r=state.records.find(r=>r.id===state.story?.id);if(!r||index<0||index>=currentStorySteps(r).length)return;state.journeyOverview=false;state.story.index=index;arrivalAt=0;render();frameStory();}
 function tick(){
  clearTimeout(timer);
  if(!playing||!state.story||state.story.id!==playKey){stop();return;}
  if(document.hidden||state.flight?.moving||document.querySelector('dialog[open]')){arrivalAt=0;timer=setTimeout(tick,250);return;}
  const key=state.story.id+':'+state.story.index;
  if(arrivalKey!==key){arrivalKey=key;arrivalAt=Date.now();}
  if(!arrivalAt)arrivalAt=Date.now();
  if(Date.now()-arrivalAt>=4200){const r=state.records.find(r=>r.id===state.story.id);if(state.story.index>=currentStorySteps(r).length-1){stop();refresh();return;}go(state.story.index+1);}
  timer=setTimeout(tick,250);
 }
 function refresh(){
  const id=state.story?.id||'';
  if(!id||id!==previousStory){stop();previousStory=id;}
  controls.hidden=!id;
  if(id){const r=state.records.find(r=>r.id===id),steps=currentStorySteps(r),index=state.story.index;
   controls.innerHTML=`<div class="journey-dock-heading"><strong>${esc(r.name)}</strong><span>Stop ${index+1} of ${steps.length}</span><button type="button" data-play aria-pressed="${playing}">${playing?'Ⅱ Pause':'▶ Play'}</button><button type="button" data-replay>↺ Replay</button></div><nav class="journey-progress" aria-label="Journey stops">${steps.map((s,i)=>`<button type="button" data-story-step="${i}" title="${esc(s.title)}${s.name?' · '+esc(s.name):''}" aria-current="${i===index?'step':'false'}" class="${i<index?'visited':''}"><span>${i+1}</span>${esc(s.title)}</button>`).join('')}</nav>`;
   controls.querySelector('[aria-current="step"]')?.scrollIntoView({block:'nearest',inline:'nearest'});
   if(playing&&!timer)timer=setTimeout(tick,250);
  }
  const profile=state.records.find(r=>r.id===(state.story?.id||(state.detail?.type==='scholar'?state.detail.id:null)));
  if(profile&&!$('detailCard').hidden){const parent=$('detailCard').querySelector('.detail-body');if(parent&&!parent.querySelector('[data-share-scholar]')){const row=document.createElement('div');row.className='experience-actions';row.innerHTML=`<button class="button secondary" data-share-scholar="${esc(profile.id)}">Share this scholar ↗</button><button class="button secondary" data-person-media="${esc(profile.id)}">View media</button>`;parent.append(row);}}
  layout();
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-story-step')||b.hasAttribute('data-full-journey')){stop();}
  if(b.hasAttribute('data-play')){if(playing){stop();refresh();}else{playing=true;playKey=state.story.id;const r=state.records.find(r=>r.id===playKey);if(state.story.index===currentStorySteps(r).length-1)go(0);refresh();timer=setTimeout(tick,250);}}
  if(b.hasAttribute('data-replay')){stop();go(0);}
  if(b.dataset.shareScholar)shareScholar(b.dataset.shareScholar);
  if(b.dataset.personMedia)openGallery(b.dataset.personMedia);
 },true);
 area.addEventListener('pointerdown',e=>{if(e.target.closest('#map')&&!e.target.closest('.leaflet-control-attribution')){stop();refresh();}},{passive:true});
 async function shareScholar(id){const url=new URL(location.href);url.hash='';url.search='';url.searchParams.set('scholar',id);if(state.story?.id===id){url.searchParams.set('journey','1');url.searchParams.set('stop',String(state.story.index+1));}
  try{await navigator.clipboard.writeText(url.href);toast('Scholar link copied.');}catch{const d=$('shareDialog');$('shareLink').value=url.href;d.showModal();$('shareLink').select();}
 }
 // Gallery combines existing portraits with explicitly supplied album entries.
 let galleryItems=[],filtered=[],active=0;
 const gallery=document.createElement('dialog');gallery.id='mediaGallery';gallery.className='media-gallery';gallery.innerHTML=`<div class="dialog-header"><div><span class="eyebrow">OUR COMMUNITY IN PICTURES</span><h2>Media gallery</h2></div><button class="close-button" aria-label="Close media gallery" data-gallery-close>×</button></div><p>Meet the people behind the map. Browse portraits and community memories.</p><div class="gallery-filters"><label>Search<input id="gallerySearch" type="search" placeholder="Name, place or caption"></label><label>Collection<select id="galleryCollection"><option value="">All media</option><option>Scholars</option><option>Leadership</option><option>Community & journeys</option></select></label><button id="galleryClear" class="button secondary">Clear filters</button></div><p id="galleryCount" role="status"></p><div id="galleryGrid" class="gallery-grid"></div>`;document.body.append(gallery);
 const viewer=document.createElement('dialog');viewer.id='mediaViewer';viewer.className='media-viewer';viewer.innerHTML='<button class="close-button" aria-label="Close photo viewer">×</button><div id="viewerContent"></div><div class="viewer-navigation"><button id="previousMedia" class="button secondary">← Previous</button><span id="viewerCount"></span><button id="nextMedia" class="button secondary">Next →</button></div>';document.body.append(viewer);
 const share=document.createElement('dialog');share.id='shareDialog';share.className='dialog';share.innerHTML='<div class="dialog-header"><h2>Share this scholar</h2><button class="close-button" aria-label="Close share dialog">×</button></div><label>Copy this link<input id="shareLink" readonly style="width:100%;padding:12px"></label>';document.body.append(share);
 for(const d of [gallery,viewer,share]){d.querySelector('.close-button').onclick=()=>d.close();d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});d.addEventListener('close',()=>d.querySelectorAll('video,audio').forEach(v=>v.pause()));}
 async function loadGallery(){
  const [leaders,extra]=await Promise.all([fetch('data/leaders.json',{cache:'no-cache'}).then(r=>r.ok?r.json():[]).catch(()=>[]),fetch('data/gallery.json',{cache:'no-cache'}).then(r=>r.ok?r.json():[]).catch(()=>[])]);
  galleryItems=state.records.filter(r=>safeURL(r.photo,true)).map(r=>({src:r.photo,title:r.name,caption:[r.university,r.country].filter(Boolean).join(' · '),collection:'Scholars',scholar_id:r.id,source:r.photo_source_url||''}));
  const list=Array.isArray(leaders)?leaders:leaders.leaders||[];
  galleryItems.push(...list.filter(r=>safeURL(r.photo,true)).map(r=>({src:r.photo,title:r.name,caption:r.role||r.title||'',collection:'Leadership',source:r.photo_source_url||r.source_url||r.sources?.[0]||''})),...(Array.isArray(extra)?extra:[]).filter(r=>r.type==='album'?safeURL(r.url):safeURL(r.src,true)).map(r=>({...r,collection:'Community & journeys'})));
  galleryItems.sort((a,b)=>(b.type==='album')-(a.type==='album'));
  drawGallery();
 }
 function drawGallery(){const q=$('gallerySearch').value.toLowerCase().trim(),collection=$('galleryCollection').value;filtered=galleryItems.filter(r=>(!collection||r.collection===collection)&&(!q||[r.title,r.caption,r.place,r.scholar_id].join(' ').toLowerCase().includes(q)));
  $('galleryCount').textContent=`${filtered.length} media items`;
  $('galleryGrid').innerHTML=filtered.map((r,i)=>r.type==='album'?`<a class="gallery-tile gallery-album" href="${esc(safeURL(r.url))}" target="_blank" rel="noopener noreferrer"><span class="album-cover" aria-hidden="true"><span>▧</span><small>COMMUNITY PHOTO ALBUM</small></span><span><strong>${esc(r.title)}</strong><small>${esc(r.caption||'')}</small><b class="album-open">Open full album ↗</b></span></a>`:`<button class="gallery-tile" data-media-index="${i}">${r.type==='video'?'<span class="media-placeholder">▶ Video</span>':r.type==='audio'?'<span class="media-placeholder">♫ Audio</span>':`<img src="${esc(r.src)}" alt="${esc(r.title||r.caption||'Community photograph')}" loading="lazy">`}<span><strong>${esc(r.title||'Community memory')}</strong><small>${esc(r.caption||r.place||r.collection)}</small></span></button>`).join('')||'<p>No media matches these filters.</p>';
 }
 function openGallery(id){stop();refresh();$('gallerySearch').value=id?state.records.find(r=>r.id===id)?.name||'':'';$('galleryCollection').value='';drawGallery();gallery.showModal();}
 function showMedia(i){active=i;const r=filtered[i];if(!r)return;const tag=r.type==='video'?'video':r.type==='audio'?'audio':'img';$('viewerContent').innerHTML=`<${tag} src="${esc(r.src)}" ${tag==='img'?`alt="${esc(r.title||r.caption||'Community photograph')}"`:'controls preload="metadata"'}>${tag==='img'?'':`</${tag}>`}<h2>${esc(r.title||'Community memory')}</h2><p>${esc(r.caption||r.place||'')}</p>${safeURL(r.source)?`<a href="${esc(safeURL(r.source))}" target="_blank" rel="noopener">Photo / media source ↗</a>`:''}${r.scholar_id?`<button class="button primary" data-gallery-profile="${esc(r.scholar_id)}">Open scholar on map ↗</button>`:''}`;
  $('viewerCount').textContent=`${i+1} of ${filtered.length}`;$('previousMedia').disabled=i===0;$('nextMedia').disabled=i===filtered.length-1;if(!viewer.open)viewer.showModal();
 }
 gallery.onclick=e=>{const tile=e.target.closest('[data-media-index]');if(tile)showMedia(Number(tile.dataset.mediaIndex));};
 viewer.addEventListener('click',e=>{const b=e.target.closest('[data-gallery-profile]');if(b){viewer.close();gallery.close();selectScholar(b.dataset.galleryProfile);}});
 $('previousMedia').onclick=()=>showMedia(active-1);$('nextMedia').onclick=()=>showMedia(active+1);
 viewer.addEventListener('keydown',e=>{if(e.key==='ArrowRight'&&active<filtered.length-1){e.preventDefault();showMedia(active+1);}if(e.key==='ArrowLeft'&&active>0){e.preventDefault();showMedia(active-1);}});
 $('gallerySearch').oninput=drawGallery;$('galleryCollection').onchange=drawGallery;$('galleryClear').onclick=()=>{$('gallerySearch').value='';$('galleryCollection').value='';drawGallery();};
 $('galleryButton').onclick=()=>openGallery();loadGallery();
 function readLink(){const p=new URLSearchParams(location.search),id=p.get('scholar');if(id&&state.records.some(r=>r.id===id)){if(p.get('journey')==='1'){startStory(id);const r=state.records.find(r=>r.id===id),n=Number(p.get('stop')||1);if(Number.isInteger(n)&&n>1&&n<=currentStorySteps(r).length)go(n-1);}else selectScholar(id);}if(location.hash==='#gallery')openGallery();}
 window.addEventListener('popstate',readLink);readLink();refresh();return refresh;
}
