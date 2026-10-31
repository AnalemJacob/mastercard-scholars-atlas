// One camera flight per leg, with a moving marker and arrival ring.
export function flightScale(distance) {
 if (distance < 250) return {duration: 0};
 if (distance < 15000) return {duration: 4000};
 if (distance < 80000) return {duration: 5000};
 if (distance < 350000) return {duration: 6500};
 if (distance < 1500000) return {duration: 9000};
 return {duration: 12000};
}

export function createJourneyFlight(map, L, onSettled = () => {}) {
 const focus = L.layerGroup().addTo(map);
 let bearing = 0;
 const arrowGraphic = '<svg viewBox="0 0 38 38" aria-hidden="true"><path d="M29 19 10 10 14 19 10 28Z"/></svg>';
 let key = '', moving = false, sample = null, complete = null, head = null;
 const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

 function interrupt() {
  if (sample) map.off('move', sample);
  if (complete) map.off('moveend', complete);
  sample = complete = null;
  // Remove our handlers before stop() can emit a final movement event.
  map.stop();
  moving = false;
  head?.remove(); head = null;
  focus.clearLayers();
  key = '';
 }
 function stay(id) {
  key = id;
 }
 function cancel() {
  interrupt();
 }
 function halo(point) {
  L.marker([point[1], point[0]], {
   interactive: false, zIndexOffset: 800,
   icon: L.divIcon({className: 'location-halo', html: `<span></span><div class="arrival-direction" style="transform:rotate(${bearing}deg)">${arrowGraphic}</div>`, iconSize: [88,88], iconAnchor: [44,44]})
  }).addTo(focus);
 }
 function fly({id, point, zoom = 13, worldStart = false, local = false, valid = () => true}) {
  interrupt();
  key = id;
  const current = map.getCenter();
  const origin = [current.lng, current.lat];
  const distance = map.distance([origin[1], origin[0]], [point[1], point[0]]);
  const {duration} = flightScale(distance);
  if (worldStart || duration === 0 || reduced()) {
   map.setView([point[1], point[0]], zoom, {animate:false});
   halo(point); onSettled(); return;
  }

  moving = true;
  head = L.DomUtil.create('div', 'travelling-scholar tracking-marker', map.getContainer());
  head.setAttribute('aria-hidden', 'true');
  head.innerHTML = `<span class="travel-direction">${arrowGraphic}</span>`;
  // The camera tracks the traveller. Keep its screen position fixed through
  // pan/zoom phases rather than projecting rounded map centres each frame.
  const a = map.project([origin[1], origin[0]], 0);
  const b = map.project([point[1], point[0]], 0);
  const arrow = head.querySelector('.travel-direction');
  bearing = Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
  if (arrow) arrow.style.transform = `rotate(${bearing}deg)`;
  sample = () => {
   if (!valid()) interrupt();
  };
  complete = () => {
   if (!valid()) { interrupt(); return; }
   sample();
   if (!moving) return;
   map.off('move', sample); map.off('moveend', complete);
   sample = complete = null;
   // Add the destination arrow before removing the travelling arrow.
   halo(point);
   moving = false; head?.remove(); head = null;
   onSettled();
  };
  if(local && zoom >= 7) {
   // Establish a readable regional scale, pan there, then approach the town.
   // Each phase ends before the next starts; no per-frame map resets.
   const cruiseZoom = Math.min(zoom, distance < 15000 ? 13 : distance < 80000 ? 11 : distance < 350000 ? 9 : 8);
   const arrive = complete;
   let phase = 0;
   complete = () => {
    if(!valid()){interrupt();return;}
    if(phase === 0){
     phase = 1;map.once('moveend',complete);
     map.panTo([point[1],point[0]],{animate:true,duration:Math.max(3.8,duration/1000*.7),easeLinearity:.5});
    } else if(phase === 1){
     phase = 2;
     if(map.getZoom() === zoom){arrive();return;}
     map.once('moveend',complete);
     map.flyTo([point[1],point[0]],zoom,{duration:Math.max(2.8,Math.min(4.2,Math.abs(map.getZoom()-zoom)*.7))});
    } else arrive();
   };
   map.on('move',sample);
   if(map.getZoom() === cruiseZoom) complete();
   else {
    map.once('moveend',complete);
    map.flyTo([origin[1],origin[0]],cruiseZoom,{duration:Math.max(2.8,Math.min(4.2,Math.abs(map.getZoom()-cruiseZoom)*.7))});
   }
   return;
  }
  map.on('move', sample);
  map.once('moveend', complete);
  // Leaflet coordinates pan AND zoom in this one animation. No timers, no
  // repeated setView(), and no second arrival flight can compete with it.
  map.flyTo([point[1], point[0]], zoom, {duration: duration / 1000});
 }
 return {fly, stay, interrupt, cancel, get key(){return key;}, get moving(){return moving;}};
}
