export const UBC = 'University of British Columbia';
export const CSV_FIELDS = ['id','name','country','country_code','hometown','region','latitude','longitude','university','programme','cohort','theme','bio','aspiration','photo','audio','source_url','linkedin_url','photo_source_url','location_verified'];
export const clean = value => String(value ?? '').trim();
export const escapeHTML = value => clean(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const hasLocation = r => typeof r.latitude === 'number' && Number.isFinite(r.latitude) && Math.abs(r.latitude) <= 90 && typeof r.longitude === 'number' && Number.isFinite(r.longitude) && Math.abs(r.longitude) <= 180;
export function safeURL(value, media = false) {
  const url = clean(value);
  if (!url) return '';
  if (/^https:\/\//i.test(url)) return url;
  if (media && /^media\/[a-z\d_./ -]+$/i.test(url) && !url.includes('..')) return url;
  return '';
}
export function normalizeRecords(rows, countries, {demo = false} = {}) {
  const errors = [], warnings = [], ids = new Set();
  const codes = new Map(), names = new Map();
  for (const c of countries) { codes.set(c.iso3,c); names.set(c.name.toLowerCase(),c); }
  for (const [alias, code] of Object.entries({'dr congo':'COD','drc':'COD','democratic republic of the congo':'COD','democratic republic of congo':'COD','republic of the congo':'COG','republic of congo':'COG','ivory coast':'CIV','cote d’ivoire':'CIV',"cote d'ivoire":'CIV','côte d’ivoire':'CIV','cape verde':'CPV','sao tome and principe':'STP','the gambia':'GMB','tanzania':'TZA','south korea':'KOR'})) {
    if(codes.has(code)) names.set(alias,codes.get(code));
  }
  const records = [];
  rows.forEach((input,index) => {
    if(!input || Object.values(input).every(v => !clean(v))) return;
    const row = {}; for(const key of CSV_FIELDS) row[key] = clean(input[key]);
    if(!row.id || !row.name) {errors.push(`Row ${index+2}: id and name are required.`);return;}
    if(ids.has(row.id)) {errors.push(`Row ${index+2}: duplicate id “${row.id}”.`);return;}
    ids.add(row.id);
    let country;
    if(row.country_code) {
      country = codes.get(row.country_code.toUpperCase());
      if(!country) {errors.push(`Row ${index+2}: unrecognised ISO3 country_code “${row.country_code}”.`);return;}
    } else if(row.country && !['country not recorded','unknown'].includes(row.country.toLowerCase())) {
      country = names.get(row.country.toLowerCase());
      if(!country) {errors.push(`Row ${index+2}: could not match “${row.country}”; supply its three-letter country_code.`);return;}
    }
    if(country) {row.country = country.name; row.country_code = country.iso3;} else {row.country = 'Country not recorded'; row.country_code = '';}
    const latText=row.latitude,lonText=row.longitude;
    row.latitude = latText === '' ? null : Number(latText);
    row.longitude = lonText === '' ? null : Number(lonText);
    if(!hasLocation(row)) {
      if(latText || lonText) warnings.push(`Row ${index+2}: incomplete or invalid coordinates; included in totals, not town markers.`);
      row.latitude=null;row.longitude=null;
    } else if(!row.hometown) warnings.push(`Row ${index+2}: coordinates supplied without a hometown name.`);
    row.location_verified = /^(true|yes|1)$/i.test(row.location_verified);
    row.demo=demo;
    row.photo=safeURL(row.photo,true);row.audio=safeURL(row.audio,true);row.source_url=safeURL(row.source_url);row.linkedin_url=safeURL(row.linkedin_url);row.photo_source_url=safeURL(row.photo_source_url);
    records.push(row);
  });
  if(!records.length && !errors.length) errors.push('No scholar records found. Fill at least one row below the header.');
  return {records,errors,warnings};
}
export function summarize(records, eligibleCountries) {
  const counts=new Map();
  for(const r of records) counts.set(r.country_code,(counts.get(r.country_code)||0)+1);
  const all=new Map(eligibleCountries.map(c=>[c.iso3,{...c,count:0,share:0,eligible:true}]));
  for(const r of records) if(!all.has(r.country_code)) all.set(r.country_code,{iso3:r.country_code,name:r.country,eligible:false,count:0,share:0});
  for(const [code,count] of counts) {const c=all.get(code);c.count=count;c.share=records.length?count/records.length*100:0;}
  const rows=[...all.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
  const towns=new Set(records.filter(hasLocation).map(townKey));
  return {total:records.length,represented:[...counts.keys()].filter(Boolean).length,mapped:records.filter(hasLocation).length,towns:towns.size,unknown:counts.get('')||0,rows,counts};
}
export const townKey = r => `${Number(r.longitude).toFixed(4)}|${Number(r.latitude).toFixed(4)}`;
export function makeTownFeatures(records) {
  const towns=new Map();
  for(const r of records.filter(hasLocation)) {
    const key=townKey(r);
    if(!towns.has(key)) towns.set(key,{key,longitude:r.longitude,latitude:r.latitude,hometown:r.hometown||'Town location',country:r.country,scholars:[]});
    towns.get(key).scholars.push(r);
  }
  return {towns,geojson:{type:'FeatureCollection',features:[...towns.values()].map(t=>({type:'Feature',geometry:{type:'Point',coordinates:[t.longitude,t.latitude]},properties:{town_key:t.key,scholar_count:t.scholars.length,label:t.hometown,country:t.country}}))}};
}
export function greatCircle(start,end,steps=80) {
  const rad=Math.PI/180,toV=([lng,lat])=>[Math.cos(lat*rad)*Math.cos(lng*rad),Math.cos(lat*rad)*Math.sin(lng*rad),Math.sin(lat*rad)];
  const a=toV(start),b=toV(end),dot=Math.max(-1,Math.min(1,a.reduce((s,v,i)=>s+v*b[i],0))),angle=Math.acos(dot),sin=Math.sin(angle);
  if(Math.abs(sin)<1e-8) return {type:'MultiLineString',coordinates:[[start,end]]};
  const lines=[[]];let previous;
  for(let i=0;i<=steps;i++) {
    const t=i/steps,wa=Math.sin((1-t)*angle)/sin,wb=Math.sin(t*angle)/sin,v=a.map((n,j)=>wa*n+wb*b[j]);
    const p=[Math.atan2(v[1],v[0])/rad,Math.atan2(v[2],Math.hypot(v[0],v[1]))/rad];
    if(previous && Math.abs(p[0]-previous[0])>180) {
      const adjusted=p[0]+(p[0]<previous[0]?360:-360),edge=previous[0]>0?180:-180;
      const y=previous[1]+(p[1]-previous[1])*((edge-previous[0])/(adjusted-previous[0]));
      lines.at(-1).push([edge,y]);lines.push([[-edge,y]]);
    }
    lines.at(-1).push(p);previous=p;
  }
  return {type:'MultiLineString',coordinates:lines.filter(l=>l.length>=2)};
}
