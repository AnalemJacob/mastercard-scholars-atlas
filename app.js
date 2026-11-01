import {setupExperience,placeCountryLabels} from './atlas-experience.mjs?v=20261101-experience';
import {sameJourneyPlace} from './journey-model.mjs?v=20261031-github';
import {createJourneyFlight} from './flight.mjs?v=20261031-github';
import {STUDY_AREAS,studyAreas,matchesStudyArea,routeWidth,storySteps} from './explorer.mjs';
import {UBC,CSV_FIELDS,clean,escapeHTML as esc,hasLocation,safeURL,normalizeRecords,summarize,makeTownFeatures,greatCircle} from './core.mjs';
import {countryColor,countryReference,countryConnections,connectionFeatures,UNIVERSITY_DESTINATIONS,universityConnections} from './map-model.mjs';
const $=id=>document.getElementById(id);
const nf=new Intl.NumberFormat('en');
const percent=n=>`${n.toFixed(1).replace(/\.0$/,'')}%`;
const state={records:[],demo:[],countries:[],eligibility:null,university:'',cohort:'',query:'',tab:'overview',mode:'journeys',focusCountry:null,detail:null,sort:'count',sample:true,storage:false,map:null,mapReady:false,towns:new Map(),hover:null,detailed:false,mapErrors:0,renderer:'maplibre',background:'atlas',interest:'',story:null,storyEvidence:{},trialJourneys:{},routeEntries:[]};
const STORAGE_KEY='scholars-atlas-v2-records';
let toastTimer,searchTimer;
let refreshExperience=()=>{};
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
const scopeRecords=()=>state.records.filter(r=>(!state.university||r.university===state.university)&&(!state.cohort||r.cohort===state.cohort)&&matchesStudyArea(r,state.interest));
const matches=r=>!state.query||[r.name,r.hometown,r.region,r.country,r.programme,r.theme].join(' ').toLowerCase().includes(state.query.toLowerCase());
function visibleRecords(){return scopeRecords().filter(r=>matches(r)&&(!state.focusCountry||r.country_code===state.focusCountry));}
const scopeLabel=()=>`${state.university===UBC?'UBC':state.university||'All universities'} · ${state.cohort||'All cohorts'}${state.interest?' · '+state.interest:''}`;
const summary=()=>summarize(scopeRecords(),state.eligibility.countries);
function avatar(r){const initials=r.demo?r.id.replace('demo',''):(r.name.split(/\s+/).filter(Boolean).map(s=>s[0]).slice(0,2).join(''));return `<span class="avatar" style="--country:${countryColor(r.country_code)}"><span class="avatar-initials">${esc(initials)}</span>${safeURL(r.photo,true)?`<img src="${esc(r.photo)}" alt="Portrait of ${esc(r.name)}" loading="lazy" onerror="this.remove()">`:''}</span>`;}
function scholarButton(r){return `<button class="scholar-item" data-scholar="${esc(r.id)}">${avatar(r)}<span class="scholar-item-info"><strong>${esc(r.name)}</strong><small>${esc([r.hometown,r.country_code?r.country:''].filter(Boolean).join(', ')||'Home country not recorded')}<br>${esc(r.programme||'Programme not supplied')}</small></span><span class="arrow" aria-hidden="true">↗</span></button>`;}
function populateFilters(){
  const unis=[...new Set(state.records.map(r=>r.university).filter(Boolean))].sort();
  const cohorts=[...new Set(state.records.map(r=>r.cohort).filter(Boolean))].sort().reverse();
  if(!unis.includes(state.university)) state.university='';if(!cohorts.includes(state.cohort)) state.cohort='';
  $('universityFilter').innerHTML='<option value="">All universities</option>'+unis.map(u=>`<option value="${esc(u)}">${esc(u===UBC?'UBC':u)}</option>`).join('');
  $('cohortFilter').innerHTML='<option value="">All cohorts</option>'+cohorts.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  $('universityFilter').value=state.university;$('cohortFilter').value=state.cohort;
}
function render(){
  const s=summary();
  $('followScholar').disabled=!visibleRecords().length;
  $('totalStat').textContent=nf.format(s.total);$('countryStat').textContent=s.represented;$('eligibleStat').textContent=state.eligibility.country_count;$('townStat').textContent=new Set(scopeRecords().map(r=>r.university).filter(Boolean)).size;
  $('datasetBanner').classList.toggle('imported',!state.sample);
  $('datasetBanner').querySelector('strong').textContent=state.sample?'Sample data':'2026 scholar community';
  $('datasetDescription').textContent=state.sample?'Fictional profiles for exploring the design. These are not programme statistics.':`${nf.format(state.records.length)} scholar profiles · ${Object.keys(state.trialJourneys).length} confirmed scholar journeys`;
  $('bannerImport').innerHTML=state.sample?'Replace with your CSV ↗':'Manage your data ↗';
  $('coverageText').textContent=Object.keys(state.trialJourneys).length+' confirmed journeys · location precision labelled';
  $('mapCount').textContent=`${s.represented} countries · ${s.total} scholars`;
  $('originLegend').innerHTML=s.rows.filter(c=>c.count>0).map(c=>`<button class="origin-legend-item" data-country="${esc(c.iso3)}"><i style="background:${countryColor(c.iso3)}"></i><span>${esc(c.name)}</span><b>${c.count}</b></button>`).join('');
  document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===state.tab)));
  $('sidebarContent').setAttribute('aria-labelledby',`tab-${state.tab}`);
  renderSidebar(s);renderDetail(s);updateMap(s);refreshExperience();
}
function renderSidebar(s){
  const root=$('sidebarContent');
  if(state.focusCountry && state.tab!=='countries'){
    const c=state.countries.find(c=>c.iso3===state.focusCountry),row=s.rows.find(c=>c.iso3===state.focusCountry);
    const list=visibleRecords();
    root.innerHTML=`<button class="text-link" data-clear-country>← All countries</button><div class="section-heading" style="margin-top:12px"><h2>${esc(c?.name||state.focusCountry)}</h2><span class="badge">${row?.count||0} · ${percent(row?.share||0)}</span></div><p class="section-caption">Share of ${s.total} scholars · ${esc(scopeLabel())}</p>${list.length?list.map(scholarButton).join(''):`<p class="empty-state">${state.query?'No profiles match your search here.':'No scholars recorded from this country in the selected dataset.'}</p>`}<p class="scope-source">Selecting a country keeps the overall percentage denominator unchanged.</p>`;
    return;
  }
  if(state.tab==='overview'){
    const rows=s.rows.filter(c=>c.count>0&&(!state.query||c.name.toLowerCase().includes(state.query.toLowerCase())));
    const top=rows.slice(0,20),max=Math.max(1,...top.map(c=>c.count));
    root.innerHTML=`<div class="section-heading"><h2>Where we come from</h2><button data-tab="countries">Country table ↗</button></div><p class="section-caption">Share of ${nf.format(s.total)} scholars · ${esc(scopeLabel())}</p>${top.length?top.map(c=>`<button class="country-bar" data-country="${esc(c.iso3||'UNKNOWN')}"><span class="bar-label"><i class="country-dot" style="background:${countryColor(c.iso3)}"></i><b>${esc(c.name)}</b><span class="country-number"><small>${c.count}</small> ${percent(c.share)}</span></span><span class="bar-track"><span class="bar-fill" style="width:${c.count/max*100}%;background:${countryColor(c.iso3)}"></span></span></button>`).join(''):`<p class="empty-state">${state.query?'No countries match this search. Try the Scholars tab to search names and towns.':'No scholars in this selection. Change the cohort or university.'}</p>`}<div class="insight-note"><span aria-hidden="true">◎</span><p><strong>Every country counts.</strong><br>All represented countries have a distinct colour, even those with one scholar.</p></div><span class="scope-source">Country scope: <strong>UBC · Winter 2027</strong><br><a href="#" data-about>54 countries under the geographic criterion ↗</a></span>`;
  }else if(state.tab==='scholars'){
    const list=visibleRecords();
    root.innerHTML=`<div class="section-heading"><h2>Meet the scholars</h2><span class="badge">${list.length} profiles</span></div><p class="section-caption">${state.sample?'Fictional examples · replace with your community':'Profiles included in your current selection'}</p>${list.length?list.map(scholarButton).join(''):'<p class="empty-state">No scholars match. Try another search, university or cohort.</p>'}`;
  }else{
    let rows=s.rows.filter(c=>!state.query||c.name.toLowerCase().includes(state.query.toLowerCase()));
    if(state.sort==='name') rows.sort((a,b)=>a.name.localeCompare(b.name));
    root.innerHTML=`<div class="section-heading"><h2>Country representation</h2><button class="table-sort" data-sort>${state.sort==='count'?'Ranked ↓':'A–Z ↓'}</button></div><p class="section-caption">All 54 countries in the UBC geographic scope, plus other recorded origins. Shares use ${nf.format(s.total)} scholars.</p><table class="country-table"><thead><tr><th>Country</th><th>Scholars</th><th>Share</th></tr></thead><tbody>${rows.map(c=>`<tr class="${c.count?'':'zero'} ${state.focusCountry===c.iso3?'focused':''}"><td><button data-country="${esc(c.iso3||'UNKNOWN')}" title="${esc(c.eligible?'UBC geographic scope':'Other origin or unrecorded country')}">${esc(c.name)}${!c.eligible?' *':''}</button></td><td>${c.count}</td><td>${percent(c.share)}</td></tr>`).join('')}</tbody></table>${!rows.length?'<p class="empty-state">No countries match that search.</p>':''}<p class="scope-source">0 = no records in this dataset. * Other recorded origin or country not supplied. <a href="#" data-about>Scope and sources ↗</a></p>`;
  }
}
function fitJourneyMap(records=routeRecords(),detail=false){
 if(!state.mapReady)return;
 const connections=universityConnections(records,state.countries),points=connections.flatMap(c=>greatCircle(c.coordinates,c.destination.coordinates).coordinates.flat().map(p=>[p[1],p[0]]));
 for(const r of records){const d=UNIVERSITY_DESTINATIONS[r.university];if(d)points.push([d.coordinates[1],d.coordinates[0]]);}
 if(!points.length)return;
 state.map.fitBounds(L.latLngBounds(points),{paddingTopLeft:[45,35],paddingBottomRight:[40,65],maxZoom:connections.length?3.5:5,animate:true});
}
function fitConnection(code){
 if(!state.mapReady)return;
 if(state.mode==='journeys')fitJourneyMap(routeRecords().filter(r=>r.country_code===code),true);
 else{const f=state.geo.features.find(f=>f.properties.iso3===code);if(f)state.map.fitBounds(L.geoJSON(f).getBounds(),{paddingTopLeft:[45,85],paddingBottomRight:[40,110],maxZoom:5,animate:true});}
}
function selectCountry(code,{fly=true}={}){
 state.story=null;
  if(code==='UNKNOWN'){state.focusCountry=null;state.tab='scholars';state.query='';$('searchInput').value='';render();return;}
  state.focusCountry=code;state.detail={type:'country',code};state.query='';$('searchInput').value='';render();if(fly)fitConnection(code);
}
function clearCountry(){state.focusCountry=null;state.detail=null;render();}
function selectScholar(id,{fly=true}={}){
 state.story=null;
  const r=state.records.find(r=>r.id===id);if(!r)return;
  state.detail={type:'scholar',id};render();
  if(fly&&state.mapReady){if(personalJourney()){const points=journeyPoints().filter(s=>s.point);state.map.fitBounds(points.map(s=>[s.point[1],s.point[0]]),{paddingTopLeft:[40,40],paddingBottomRight:[40,45],maxZoom:7});return;}if(hasLocation(r)&&state.mode==='origins')state.map.flyTo([r.latitude,r.longitude],10,{duration:1});else fitConnection(r.country_code);}
}
function renderDetail(s){
  const card=$('detailCard');if(state.story){renderStory(card);return;}if(!state.detail){card.hidden=true;return;}
  card.hidden=false;
  const close='<button class="close-button" data-close-detail aria-label="Close selected place">×</button>';
  if(state.detail.type==='country'){
    const c=state.countries.find(c=>c.iso3===state.detail.code);if(!c){card.hidden=true;return;}
    const row=s.rows.find(r=>r.iso3===c.iso3),list=visibleRecords();
    card.innerHTML=`<div class="detail-top">${close}<span class="eyebrow">A PLACE IN OUR COMMUNITY</span><h2>${esc(c.name)}</h2><p>${c.eligibility==='geographic'?'Within UBC’s geographic criterion':c.eligibility==='unverified'?'Geographic eligibility unverified':'Outside UBC’s geographic reference scope'}</p><div class="detail-metrics"><div><strong>${row?.count||0}</strong><span>scholars recorded</span></div><div><strong>${percent(row?.share||0)}</strong><span>of ${s.total} selected scholars</span></div></div></div><div class="detail-body"><p class="reference-note">Map point: illustrative reference within the country. Exact hometowns have not been mapped.</p><h3>Meet the people behind the place</h3>${list.length?list.map(scholarButton).join(''):'<p class="no-records">No scholars recorded from this country in this dataset. This does not mean there are no scholars from this country.</p>'}</div>`;
  }else if(state.detail.type==='town'){
    const town=state.towns.get(state.detail.key);if(!town){card.hidden=true;return;}
    card.innerHTML=`<div class="detail-top">${close}<span class="eyebrow">A HOMETOWN, MANY POSSIBILITIES</span><h2>${esc(town.hometown)}</h2><p>${esc(town.country)} · ${town.scholars.length} scholar${town.scholars.length===1?'':'s'} featured</p></div><div class="detail-body">${town.scholars.map(scholarButton).join('')}</div>`;
  }else{
    const r=state.records.find(r=>r.id===state.detail.id);if(!r){card.hidden=true;return;}
    card.innerHTML=`<div class="detail-top profile-top">${close}<span class="eyebrow">${r.demo?'SAMPLE SCHOLAR PROFILE':'MEET A SCHOLAR'}</span><div class="profile-heading">${avatar(r)}<div><h2>${esc(r.name)}</h2><p>${esc([r.hometown,r.country_code?r.country:''].filter(Boolean).join(', ')||'Home country not recorded')}</p></div></div></div><div class="detail-body"><dl class="profile-fields"><dt>University</dt><dd>${esc(r.university||'Not supplied')}</dd><dt>Programme</dt><dd>${esc(r.programme||'Not supplied')}</dd><dt>Cohort</dt><dd>${esc(r.cohort||'Not supplied')}</dd>${r.theme?`<dt>Focus</dt><dd>${esc(r.theme)}</dd>`:''}</dl>${r.bio?`<p>${esc(r.bio)}</p>`:''}${r.aspiration?`<h3>One change I hope to contribute to</h3><blockquote class="quote">${esc(r.aspiration)}</blockquote>`:''}<p><span class="badge ${r.demo?'sample':''}">${r.demo?'Fictional profile · approximate town centre':hasLocation(r)?r.location_verified?'Town location verified':'Town coordinates supplied · not yet verified':'Country reference point · hometown to follow'}</span></p>${r.audio?`<h3>Hear my story</h3><audio controls preload="none" src="${esc(r.audio)}"></audio>`:''}<p class="interest-note">Study-area matches: ${esc(studyAreas(r).join(' · ')||'Not classified')} · based on programme</p>${projectDetails(r)}<div class="profile-actions"><button class="button primary" data-story="${esc(r.id)}">Follow this scholar ↗</button>${hasLocation(r)?`<button class="button primary" data-town-zoom="${esc(r.id)}">Explore hometown ↗</button>`:''}${countryReference(r.country_code,state.countries)&&UNIVERSITY_DESTINATIONS[r.university]?`<button class="button secondary" data-journey="${esc(r.id)}">Show country → ${esc(UNIVERSITY_DESTINATIONS[r.university]?.label)}</button>`:''}</div>${r.photo_source_url?`<a class="source-link portrait-source" href="${esc(safeURL(r.photo_source_url))}" target="_blank" rel="noopener noreferrer">Portrait source ↗</a>`:''}${r.linkedin_url?`<a class="button primary" href="${esc(safeURL(r.linkedin_url))}" target="_blank" rel="noopener noreferrer" style="margin-top:14px">Connect on LinkedIn ↗</a>`:''}${!r.linkedin_url?'<p class="scope-source">LinkedIn profile not yet verified.</p>':''}${r.source_url?`<a class="source-link" href="${esc(r.source_url)}" target="_blank" rel="noopener noreferrer" style="display:block;margin-top:14px">Read the published story ↗</a>`:''}</div>`;
  }
}
function createMap(){createLeafletMap();}
function atRepeatedJourneyStop(){const points=journeyPoints(),i=state.story?.index;return sameJourneyPlace(points[i-1],points[i]);}
function updateMap(s){if(state.mapReady){if(state.flight?.key&&state.flight.key!==state.story?.id+':'+state.story?.index){if(state.story&&state.flight.key.startsWith(state.story.id+':')){if(!state.flight.moving&&atRepeatedJourneyStop())state.flight.stay(state.story.id+':'+state.story.index);else {state.resumeRepeat=!!(state.flight.moving&&atRepeatedJourneyStop());state.flight.interrupt();}}else state.flight.cancel();}state.map.invalidateSize({pan:false});updateLeafletMap(s);updateMapHeadings();}}
function updateMapHeadings(){
 document.querySelector('.map-area').classList.toggle('personal-journey',!!personalJourney());
 const records=routeRecords(),destinations=[...new Set(records.map(r=>r.university).filter(u=>UNIVERSITY_DESTINATIONS[u]))],missing=records.filter(r=>!countryReference(r.country_code,state.countries)).length;
 $('journeysMode').textContent=state.university?'Connections to '+(UNIVERSITY_DESTINATIONS[state.university]?.label||'university'):'Connections to universities';
 $('mapTitle').innerHTML=state.mode==='journeys'?(destinations.length===1?'Many roots. <br>One shared destination.':'Many roots. <br>Connected campuses.'):'Our countries. <br>Our community.';
 const target=state.university?(UNIVERSITY_DESTINATIONS[state.university]?.label||state.university):'each scholar’s university';
 $('mapSubtitle').textContent=state.mode==='journeys'?`Country connections to ${target} · ${state.cohort||'all cohorts'}.${missing?' '+missing+' scholar'+(missing===1?' has':'s have')+' no country origin recorded; no line is drawn for them.':''}`:'Select a coloured country to meet its scholars.';
 if(personalJourney()){ $('mapTitle').textContent=personalJourney().name+' · life journey';$('mapSubtitle').textContent='Home → schools → universities → experiences → UBC. Markers use mapped sites or clearly labelled representative points.';}
 $('mapScope').textContent=state.focusCountry?state.countries.find(c=>c.iso3===state.focusCountry)?.name.toUpperCase()||'COUNTRY CONNECTIONS':'THE SCHOLARS NETWORK';
}
function changeMode(mode){
 state.story=null;
 state.mode=mode;$('originsMode').classList.toggle('selected',mode==='origins');$('journeysMode').classList.toggle('selected',mode==='journeys');$('originsMode').setAttribute('aria-pressed',String(mode==='origins'));$('journeysMode').setAttribute('aria-pressed',String(mode==='journeys'));render();
 if(state.mapReady){if(mode==='journeys')fitJourneyMap();else state.map.fitBounds([[-29,-20],[22,55]],{paddingTopLeft:[25,70],paddingBottomRight:[30,120],animate:true});}
}
function download(name,data,type){const blob=new Blob([data],{type});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportStats(){const s=summary();download('country_representation.csv',Papa.unparse(s.rows.map(c=>({country:c.name,country_code:c.iso3,scholars:c.count,share_percent:Number(c.share.toFixed(4)),denominator:s.total,university:state.university||'All universities',cohort:state.cohort||'All cohorts',ubc_geographic_scope:c.eligible,mode:state.sample?'FICTIONAL SAMPLE':'Imported dataset'}))),'text/csv;charset=utf-8');toast('Country statistics downloaded.');}
function storeRecords(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({records:state.records,saved:new Date().toISOString()}));state.storage=true;}catch{state.storage=false;toast('Imported for this session. Browser storage was unavailable; keep your CSV.');}}
function importFile(file){
  if(!file)return;const result=$('importResult');result.className='import-result';result.textContent='Checking your CSV…';
  if(file.size>5*1024*1024){result.className='import-result error';result.textContent='Please use a CSV smaller than 5 MB.';return;}
  Papa.parse(file,{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.replace(/^\uFEFF/,'').trim().toLowerCase(),complete:parsed=>{
    const fieldErrors=parsed.errors.filter(e=>e.code!=='UndetectableDelimiter');
    if(fieldErrors.length){result.className='import-result error';result.textContent=`CSV could not be read: ${fieldErrors[0].message}. Check for commas or quotes in text fields.`;return;}
    const out=normalizeRecords(parsed.data,state.countries);
    if(out.errors.length){result.className='import-result error';result.innerHTML='<strong>Please fix these rows and import again.</strong><br>'+out.errors.slice(0,8).map(esc).join('<br>');return;}
    state.interest='';$('interestFilter').value='';state.story=null;state.records=out.records;state.sample=false;state.focusCountry=null;state.detail=null;state.query='';state.university='';state.cohort='';$('searchInput').value='';storeRecords();populateFilters();render();
    result.className='import-result success';result.innerHTML=`<strong>${out.records.length} profiles imported.</strong> ${out.records.filter(hasLocation).length} have town coordinates. The sample has been replaced.${out.warnings.length?'<br>'+out.warnings.slice(0,4).map(esc).join('<br>'):''}`;
    toast('Your scholars are now on the map.');
  },error:error=>{result.className='import-result error';result.textContent=`Could not open the file: ${error.message}`;}});
}
function startStory(id){
 const r=visibleRecords().find(r=>r.id===id);if(!r)return;
 state.journeyOverview=false;state.story={id,index:0};state.detail={type:'scholar',id};state.mode='journeys';$('journeysMode').classList.add('selected');$('originsMode').classList.remove('selected');$('journeysMode').setAttribute('aria-pressed','true');$('originsMode').setAttribute('aria-pressed','false');state.background='street';$('basemapSelect').value='street';render();frameStory(true);
}
function personalJourney(){const id=state.story?.id||(state.detail?.type==='scholar'?state.detail.id:null);return id&&state.mode==='journeys'?state.trialJourneys[id]:null;}
function journeyPoints(){return personalJourney()?.steps.map((step,i)=>{const ref=countryReference(step.country_code,state.countries);return {...step,index:i,point:step.coordinates||ref?.coordinates,approximate:!step.coordinates};})||[];}
function currentStorySteps(r){return state.trialJourneys[r.id]?.steps||storySteps(r,state.storyEvidence[r.id]);}
function frameStory(worldStart=false){const r=state.records.find(r=>r.id===state.story?.id);if(!r||!state.mapReady)return;
 const trial=state.trialJourneys[r.id];
 const step=trial?journeyPoints()[state.story.index]:null,ref=countryReference(step?.country_code||r.country_code,state.countries),d=UNIVERSITY_DESTINATIONS[r.university];
 const point=step?.point||(state.story.index===0?ref?.coordinates:d?.coordinates);if(!point)return;
 const id=r.id+':'+state.story.index;
 const resumeRepeat=state.resumeRepeat;state.resumeRepeat=false;
 if(!resumeRepeat&&!worldStart&&!state.flight.moving&&atRepeatedJourneyStop()){state.flight.stay(id);return;}
 const previous=trial?journeyPoints()[state.story.index-1]:null;
 const local=!!(step&&previous&&step.country_code===previous.country_code);
 // An unresolved domestic stop must not pull the camera back to a country reference.
 if(local&&step.approximate){const center=state.map.getCenter();state.flight.fly({id,point:[center.lng,center.lat],zoom:state.map.getZoom()});return;}
 state.flight.fly({id,point,zoom:step?.zoom??(step?.approximate?4:step?13:state.story.index===0?4:13),worldStart,local,valid:()=>state.story?.id===r.id&&r.id+':'+state.story.index===id});
}

function projectDetails(r){const data=state.trialJourneys[r.id];if(!data?.projects?.length)return '';return `<details class="trial-review"><summary>Project information</summary><p>${esc(data.project_status||'')}</p>${data.projects.map(p=>`<p><strong>${esc(p.title||'Additional project')}</strong><br>${esc([p.location,p.country,p.role,p.description].filter(Boolean).join(' · '))}</p>`).join('')}<p class="interest-note">Profile information · excluded from the journey.</p></details>`;}
function renderStory(card){const r=state.records.find(r=>r.id===state.story.id);if(!r){state.story=null;card.hidden=true;return;}const steps=currentStorySteps(r),step=steps[state.story.index];card.hidden=false;
 card.innerHTML=`<div class="detail-top"><button class="close-button" data-end-story aria-label="Close scholar story">×</button><span class="eyebrow">FOLLOW A SCHOLAR · ${state.story.index+1} OF ${steps.length}</span><div class="profile-heading">${avatar(r)}<div><h2>${esc(r.name)}</h2><p>${esc(r.university)}</p></div></div></div><div class="detail-body"><div class="story-steps" aria-label="Story chapters">${steps.map((x,i)=>`<button data-story-step="${i}" aria-current="${i===state.story.index?'step':'false'}">${i+1}. ${esc(x.title)}</button>`).join('')}</div><div class="story-copy" aria-live="polite"><h3>${esc(step.title)}</h3><p>${esc(step.text)}</p><span class="badge">${esc(step.evidence||'Country and programme record')}</span></div>${safeURL(step.source)?`<a class="source-link" href="${esc(step.source)}" target="_blank" rel="noopener">Read the source ↗</a>`:`<p class="interest-note">${state.trialJourneys[r.id]?'Source: final scholar-confirmed responses.':'Source: supplied project roster/profile.'}</p>`}${state.trialJourneys[r.id]?`<details class="trial-review"><summary>Location notes</summary><p>${state.trialJourneys[r.id].notes.map(esc).join('<br>')}</p><p>${esc(step.name||'')} · ${esc(step.precision||'')}${step.selection_note?'<br>'+esc(step.selection_note):''}</p><p>${step.coordinates?.map(v=>Number(v).toFixed(5)).join(', ')||''} · longitude, latitude</p>${safeURL(step.coordinate_source)?`<a class="source-link" href="${esc(safeURL(step.coordinate_source))}" target="_blank" rel="noopener">Map reference ↗</a>`:''}</details>`:''}${projectDetails(r)}<div class="story-navigation"><button class="button secondary" data-story-step="${state.story.index-1}" ${state.story.index===0?'disabled':''}>← Back</button>${state.story.index<steps.length-1?`<button class="button primary" data-story-step="${state.story.index+1}">Next →</button>`:'<button class="button primary" data-full-journey>View full journey ↗</button>'}</div><p class="interest-note">${state.trialJourneys[r.id]?esc('Final response. Dates were not supplied for every stop. '+step.precision):'A factual profile summary, not a first-person testimony. Country and university points are representative locations.'}</p></div>`;
}
function highlightConnections(kind,value){
 state.routeHighlight=value?{kind,value}:null;
 for(const entry of state.routeEntries||[]){const active=!value||(kind==='country'?entry.country===value:entry.university===value);entry.line.setStyle({opacity:active?.94:.08,weight:entry.width+(value&&active?1:0)});entry.glow.setStyle({opacity:active?.08:.01});}
}
function wireEvents(){
 $('interestFilter').innerHTML='<option value="">All study areas</option>'+STUDY_AREAS.map(([label])=>`<option>${esc(label)}</option>`).join('');
 $('interestFilter').onchange=e=>{state.interest=e.target.value;state.story=null;state.detail=null;state.focusCountry=null;state.tab='scholars';render();if(state.mode==='journeys')fitJourneyMap();};
 $('followScholar').onclick=()=>{clearTimeout(searchTimer);state.query=$('searchInput').value;const list=visibleRecords();startStory((list.find(r=>r.id==='ubc2026_032')||list[0])?.id);};
 document.addEventListener('focusin',e=>{const b=e.target.closest('[data-country],[data-university]');if(b)highlightConnections(b.dataset.country?'country':'university',b.dataset.country||b.dataset.university);});
 document.addEventListener('focusout',()=>highlightConnections());
 document.addEventListener('mouseover',e=>{const b=e.target.closest('[data-country]');if(b)highlightConnections('country',b.dataset.country);});
 document.addEventListener('mouseout',e=>{if(e.target.closest('[data-country]'))highlightConnections();});
  $('manageButton').onclick=$('bannerImport').onclick=()=>$('manageDialog').showModal();
  $('aboutButton').onclick=$('eligibilityInfo').onclick=()=>$('aboutDialog').showModal();
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
  for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();}});
  $('searchInput').addEventListener('input',e=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{state.story=null;state.detail=null;state.query=e.target.value;render();},160);});
  $('universityFilter').onchange=e=>{state.story=null;state.university=e.target.value;state.focusCountry=null;state.detail=null;render();if(state.mode==='journeys')fitJourneyMap();};$('cohortFilter').onchange=e=>{state.story=null;state.cohort=e.target.value;state.focusCountry=null;state.detail=null;render();if(state.mode==='journeys')fitJourneyMap();};
  document.addEventListener('click',e=>{
    const b=e.target.closest('button,a');if(!b)return;
    if(b.dataset.story)startStory(b.dataset.story);
    if(b.hasAttribute('data-story-step')&&state.story){const index=Number(b.dataset.storyStep);if(index>=0&&index<currentStorySteps(state.records.find(r=>r.id===state.story.id)).length){state.journeyOverview=false;state.story.index=index;render();frameStory();}}
    if(b.hasAttribute('data-full-journey')&&state.story){state.flight.cancel();state.journeyOverview=true;render();const points=journeyPoints().filter(s=>s.point);if(points.length)state.map.fitBounds(points.map(s=>[s.point[1],s.point[0]]),{padding:[45,45],maxZoom:7});}
    if(b.hasAttribute('data-end-story')){state.story=null;state.detail=null;render();if(state.mapReady)fitJourneyMap();}
    if(b.dataset.tab){state.tab=b.dataset.tab;render();}
    if(b.dataset.country)selectCountry(b.dataset.country);
    if(b.dataset.scholar)selectScholar(b.dataset.scholar);
    if(b.hasAttribute('data-clear-country'))clearCountry();
    if(b.hasAttribute('data-close-detail')){state.story=null;state.detail=null;state.focusCountry=null;render();}
    if(b.hasAttribute('data-sort')){state.sort=state.sort==='count'?'name':'count';render();}
    if(b.hasAttribute('data-about')){e.preventDefault();$('aboutDialog').showModal();}
    if(b.dataset.townZoom)selectScholar(b.dataset.townZoom);
    if(b.dataset.journey){const r=state.records.find(r=>r.id===b.dataset.journey);state.mode='journeys';changeMode('journeys');if(r)state.detail={type:'scholar',id:r.id};render();fitJourneyMap(routeRecords(),true);}
  });
  $('originsMode').onclick=()=>changeMode('origins');$('journeysMode').onclick=()=>changeMode('journeys');
  $('africaButton').onclick=()=>{clearCountry();changeMode('origins');};
  $('worldButton').onclick=()=>{clearCountry();changeMode('journeys');};
  $('fullscreenButton').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Full-screen mode is unavailable in this browser.');}};
  document.addEventListener('fullscreenchange',()=>{if(state.renderer==='leaflet')state.map?.invalidateSize();else state.map?.resize();});
  $('basemapSelect').onchange=e=>{state.background=e.target.value;updateBackground();updateLeafletMap(summary());};
  $('retryMap').onclick=()=>{if(state.mapReady){updateBackground();Object.values(state.baseLayers||{}).forEach(l=>{l.redraw?.();l.getMaplibreMap?.()?.triggerRepaint();});}else createMap();};
  $('exportStats').onclick=exportStats;
  $('csvInput').onchange=e=>importFile(e.target.files[0]);
  const drop=$('fileDrop');['dragenter','dragover'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('dragover');}));['dragleave','drop'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('dragover');}));drop.addEventListener('drop',e=>importFile(e.dataTransfer.files[0]));
  $('exportData').onclick=()=>{download('scholars.json',JSON.stringify(state.records,null,2),'application/json');toast('Scholar data exported.');};
  $('resetDemo').onclick=()=>{state.interest='';$('interestFilter').value='';state.story=null;state.records=state.demo;state.sample=true;state.storage=false;state.focusCountry=null;state.detail=null;state.query='';state.cohort='';state.university='';$('searchInput').value='';try{localStorage.removeItem(STORAGE_KEY);}catch{}populateFilters();render();$('importResult').className='import-result';$('importResult').textContent='Sample profiles restored. Your original CSV has not been changed.';};
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();$('searchInput').focus();}if(e.key==='Escape'&&!document.querySelector('dialog[open]')){state.story=null;state.detail=null;state.focusCountry=null;render();}});
  const tabs=[...document.querySelectorAll('.sidebar-tabs [role=tab]')];tabs.forEach((b,i)=>b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[n].click();tabs[n].focus();}}));
}
function supportsStreetVector(){try{const gl=document.createElement('canvas').getContext('webgl2');if(!gl)return false;gl.getExtension('WEBGL_lose_context')?.loseContext();return true;}catch{return false;}}
function createLeafletMap(){
 if(typeof L==='undefined'){$('mapLoading').hidden=true;$('mapFallback').hidden=false;return;}
 try{
  state.renderer='leaflet';
  const map=L.map('map',{zoomControl:false,preferCanvas:false,minZoom:1,maxZoom:18,worldCopyJump:false,maxBounds:[[-82,-180],[85,180]],maxBoundsViscosity:.7}).setView([25,-35],2);
  state.map=map;state.mapReady=true;state.flight=createJourneyFlight(map,L,()=>{updateBackground();updateLeafletMap(summary());});map.on('dragstart',()=>state.flight.interrupt());
  map.getContainer().addEventListener('wheel',()=>{if(state.flight.moving)state.flight.interrupt();},{passive:true});
  map.getContainer().addEventListener('pointerdown',event=>{if(state.flight.moving&&event.target.closest('.leaflet-control-zoom'))state.flight.interrupt();});
  L.control.zoom({position:'topright'}).addTo(map);map.attributionControl.setPrefix('');
  map.attributionControl.addAttribution('<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> · Illustrative country reference points');
  const streetFallback=()=>L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{attribution:'Tiles &copy; Esri · Sources: Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS User Community',maxNativeZoom:19,maxZoom:19,noWrap:true});
  state.streetFallback=streetFallback;
  state.baseLayers={
   // Use one Leaflet renderer for tiles, stops and flights on every browser.
   street:streetFallback(),
   satellite:L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'Imagery &copy; Esri, Vantor, Earthstar Geographics, and the GIS User Community · <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer" target="_blank" rel="noopener">Sources</a>',maxNativeZoom:19,maxZoom:19,noWrap:true})
  };
  const backgroundError=name=>{if(state.activeBackground===name){$('basemapStatus').hidden=false;$('basemapStatus').textContent='Some background details could not load. Check your connection or choose another background.';}};
  state.baseLayers.satellite.on('tileerror',()=>backgroundError('satellite'));
  state.baseLayers.street.on('add',()=>{const gl=state.baseLayers.street.getMaplibreMap?.();if(gl){gl.on('error',()=>backgroundError('street'));gl.on('idle',()=>{if(state.activeBackground==='street')$('basemapStatus').hidden=true;});}});
  state.leafCountries=L.geoJSON(state.geo,{style:f=>leafCountryStyle(f,summary()),onEachFeature:(f,layer)=>{layer.on('click',()=>selectCountry(f.properties.iso3));layer.on('mouseover',()=>highlightConnections('country',f.properties.iso3));layer.on('mouseout',()=>highlightConnections());layer.bindTooltip(()=>{const n=summary().counts.get(f.properties.iso3)||0;return `<strong>${esc(f.properties.name)}</strong><br>${n} scholar${n===1?'':'s'} in this cohort`;},{sticky:true,direction:'top',className:'atlas-tooltip'});}}).addTo(map);
  state.leafGraticule=L.layerGroup().addTo(map);
  for(let lon=-150;lon<=150;lon+=30)L.polyline([[-75,lon],[82,lon]],{color:'#38506c',weight:.5,opacity:.25,interactive:false}).addTo(state.leafGraticule);
  for(let lat=-60;lat<=75;lat+=15)L.polyline([[lat,-180],[lat,180]],{color:'#38506c',weight:.5,opacity:.25,interactive:false}).addTo(state.leafGraticule);
  state.leafRoutes=L.layerGroup().addTo(map);state.leafLabels=L.layerGroup().addTo(map);state.leafMarkers=L.layerGroup().addTo(map);
  map.on('zoomend moveend',()=>{if(state.flight?.moving)return;updateBackground();updateLeafletMap(summary());});
  map.fitBounds([[-30,-137],[76,58]],{paddingTopLeft:[35,85],paddingBottomRight:[45,145],animate:false});
  updateBackground();updateLeafletMap(summary());updateMapHeadings();if(state.mode==='journeys')fitJourneyMap();$('mapLoading').hidden=true;$('mapFallback').hidden=true;
 }catch(error){$('mapLoading').hidden=true;$('mapFallback').hidden=false;console.error('Map initialization failed',error);}
}
function updateBackground(){
 if(!state.mapReady||!state.baseLayers)return;
 const map=state.map,active=state.background==='atlas'?(map.getZoom()>=6?'street':'atlas'):state.background;
 if(state.activeBackground!==active){$('basemapStatus').hidden=true;state.activeBackground=active;}
 for(const [name,layer] of Object.entries(state.baseLayers)){if(name===active&&!map.hasLayer(layer)){try{layer.addTo(map);}catch(error){if(name!=='street')throw error;const remove=layer.onRemove;if(!layer.getMaplibreMap?.())layer.onRemove=()=>layer.getContainer?.()?.remove();map.removeLayer(layer);layer.onRemove=remove;state.baseLayers.street=state.streetFallback().addTo(map);}}else if(name!==active&&map.hasLayer(layer))map.removeLayer(layer);}
 if(state.leafGraticule){if(active==='atlas'&&!map.hasLayer(state.leafGraticule))state.leafGraticule.addTo(map);else if(active!=='atlas'&&map.hasLayer(state.leafGraticule))map.removeLayer(state.leafGraticule);}
 document.querySelector('.map-area').dataset.background=active;
}
function leafCountryStyle(feature,s){
 const c=feature.properties,n=s.counts.get(c.iso3)||0,z=state.map?.getZoom?.()||2,selected=state.focusCountry===c.iso3;
 if(state.story)return {fillOpacity:0,color:'#9ac4b5',weight:.5,opacity:.25};
 return {fillColor:n?countryColor(c.iso3):c.eligibility==='geographic'?'#2b3d55':'#182a40',fillOpacity:state.activeBackground!=='atlas'?(z>=5?0:n?.12:0):z>=7?.12:n?.88:.84,color:selected?'#ffffff':n?countryColor(c.iso3):'#4a5a70',weight:selected?2.8:n?1.4:.55,opacity:n?1:.7};
}
function routeRecords(){return state.detail?.type==='scholar'?scopeRecords().filter(r=>r.id===state.detail.id):visibleRecords();}
function updateLeafletMap(s){
 if(!state.mapReady||state.renderer!=='leaflet')return;
 const map=state.map;state.leafCountries?.setStyle(f=>leafCountryStyle(f,s));state.leafMarkers?.clearLayers();state.leafRoutes?.clearLayers();state.leafLabels?.clearLayers();
 const mapped=makeTownFeatures(visibleRecords());state.towns=mapped.towns;
 state.routeEntries=[];
 const records=routeRecords(),refs=universityConnections(records,state.countries),zoom=map.getZoom();
 if(state.mode==='journeys'&&!personalJourney()){
  for(const c of refs){
   const geom=greatCircle(c.coordinates,c.destination.coordinates);
   for(const line of geom.coordinates){
    const coords=line.map(p=>[p[1],p[0]]);
    const width=routeWidth(c.count),glow=L.polyline(coords,{color:c.color,weight:width+6,opacity:.08,interactive:false}).addTo(state.leafRoutes);
    const routeLine=L.polyline(coords,{color:c.color,weight:width,opacity:.94,dashArray:'7 7',className:'connection-flow',interactive:true}).addTo(state.leafRoutes).bindTooltip(`${esc(c.name)} → ${esc(c.destination.label)} · ${c.count} scholar${c.count===1?'':'s'}`,{className:'atlas-tooltip'});
    routeLine.on('mouseover',()=>highlightConnections('university',c.destination.name)).on('mouseout',()=>highlightConnections());state.routeEntries.push({line:routeLine,glow,width,country:c.code,university:c.destination.name});
   }
  }
 }
 const allRefs=countryConnections(state.story?records:visibleRecords(),state.countries,{ubcOnly:false});
 const labelSize=map.getSize();
 const labelPlacements=placeCountryLabels(allRefs.map(c=>{const p=map.latLngToContainerPoint([c.coordinates[1],c.coordinates[0]]);return {...c,x:p.x,y:p.y};}),labelSize.x,labelSize.y);
 for(const c of personalJourney()?[]:allRefs){
  const marker=L.marker([c.coordinates[1],c.coordinates[0]],{icon:L.divIcon({className:'country-reference-marker',html:`<span class="reference-dot" style="--country:${c.color}"></span>`,iconSize:[18,18],iconAnchor:[9,9]}),title:`${c.name}: ${c.count} scholar${c.count===1?'':'s'}. Country reference point.`,keyboard:true}).addTo(state.leafMarkers);
  marker.bindTooltip(`<strong>${esc(c.name)} · ${c.count}</strong><br><span>Country reference point · not a hometown</span>`,{direction:'top',className:'atlas-tooltip'});
  marker.on('click',()=>selectCountry(c.code));marker.on('mouseover',()=>highlightConnections('country',c.code)).on('mouseout',()=>highlightConnections());
  const placement=labelPlacements.get(c.code);
  if((state.mode==='origins'||zoom>=3.2)&&placement){
   marker.bindTooltip(`<b style="color:${c.color}">${esc(c.name)}</b> <span>${c.count}</span>`,{permanent:true,direction:placement.direction,offset:placement.offset,opacity:1,className:'country-name-tooltip'});
  }
 }
 if(state.mode==='journeys'&&!personalJourney()){
  for(const name of new Set(records.map(r=>r.university))){
   const d=UNIVERSITY_DESTINATIONS[name];if(!d)continue;
   const compact=new Set(records.map(r=>r.university)).size>1;
   const n=records.filter(r=>r.university===name).length,mapped=refs.filter(c=>c.destination.name===name).reduce((n,c)=>n+c.count,0);
   const campusMarker=L.marker([d.coordinates[1],d.coordinates[0]],{icon:L.divIcon({className:'campus-marker'+(compact?' campus-compact campus-'+d.label.toLowerCase():''),html:`<span class="campus-pulse"></span><span class="campus-dot"></span><span class="campus-label"><b>${esc(d.label)}</b><small>${esc(d.place)}</small><em>${n} scholar${n===1?'':'s'} · ${mapped} with country origins</em></span>`,iconSize:[180,60],iconAnchor:[10,12]}),title:d.name+' · representative university location'}).addTo(state.leafMarkers).bindTooltip(`${esc(d.name)}<br>${esc(d.place)} · ${n} scholars · ${mapped} country origins`,{direction:'top',className:'atlas-tooltip'}).on('click',()=>toast(d.name+' · '+d.place+' · university reference point'));campusMarker.on('mouseover',()=>highlightConnections('university',name)).on('mouseout',()=>highlightConnections());campusMarker.getElement()?.setAttribute('data-university',name);
  }
 }
 if(personalJourney()){
  const points=journeyPoints(),current=state.story?.index??-1;
  const groups=new Map();
  for(const step of points){if(!step.point)continue;const key=step.point.join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(step);}
  for(const group of groups.values()){
   const active=group.some(s=>s.index===current),p=group[0].point,label=group.map(s=>s.index+1).join('·');
   L.marker([p[1],p[0]],{icon:L.divIcon({className:'journey-stop',html:`<span class="${active?'active':''}">${label}</span>`,iconSize:[34,34],iconAnchor:[17,17]}),keyboard:true,title:group.map(s=>`${s.index+1}. ${s.title}`).join(' / ')}).addTo(state.leafMarkers).bindTooltip(group.map(s=>`<strong>${s.index+1}. ${esc(s.title)}</strong><br>${esc(s.text)}<br>${esc(s.precision||'Country reference only · exact location pending')}`).join('<hr>'),{className:'atlas-tooltip'}).on('click',()=>{if(!state.story)startStory(state.detail.id);state.journeyOverview=false;state.story.index=group[0].index;render();frameStory();});
  }
 }
 highlightConnections(state.routeHighlight?.kind,state.routeHighlight?.value);
 if(state.mode==='origins'&&zoom>=6){for(const town of mapped.towns.values())L.circleMarker([town.latitude,town.longitude],{radius:6,color:'#fff',weight:2,fillColor:countryColor(town.scholars[0].country_code),fillOpacity:1}).bindTooltip(`${esc(town.hometown)} · supplied hometown`).addTo(state.leafMarkers);}
}
async function init(){
  try{
    const [geo,eligibility,rows,demo]=await Promise.all(['data/countries.geojson','data/eligibility.json','data/scholars.json?v=20261031-github','data/demo.json'].map(async url=>{const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw Error(`Could not load ${url}`);return r.json();}));
    state.geo=geo;state.eligibility=eligibility;state.countries=geo.features.map(f=>f.properties).filter(c=>c.iso3);
    state.storyEvidence=await fetch('data/story_evidence.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
    state.trialJourneys=await fetch('data/journeys.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
    state.demo=demo;state.records=rows;state.sample=rows.every(r=>r.demo===true);
    try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(saved?.records?.length){const valid=normalizeRecords(saved.records,state.countries);if(!valid.errors.length){state.records=valid.records.map(r=>{const latest=rows.find(p=>p.id===r.id);if(latest&&state.trialJourneys[r.id])return {...r,...latest};const published=rows.find(p=>p.id===r.id&&p.name===r.name);return published?{...r,hometown:published.hometown||r.hometown,region:published.region||r.region,photo:published.photo||r.photo,photo_source_url:published.photo_source_url,linkedin_url:published.linkedin_url||r.linkedin_url}:r;});const ids=new Set(state.records.map(r=>r.id));state.records.push(...rows.filter(r=>!ids.has(r.id)));state.sample=false;state.storage=true;}}}catch{}
    populateFilters();wireEvents();render();createMap();
    refreshExperience=setupExperience({state,render,currentStorySteps,startStory,selectScholar,frameStory,toast});
    window.atlas={state,summary,normalizeRecords:rows=>normalizeRecords(rows,state.countries),selectCountry,selectScholar,render};
  }catch(error){$('sidebarContent').innerHTML=`<p class="empty-state">The atlas could not load its data. Refresh the page and check that the data folder is present in the GitHub Pages repository.</p>`;$('mapLoading').hidden=true;toast(error.message);console.error(error);}
}
init();
