import {UBC,greatCircle} from './core.mjs';

// Colour identifies a country. It never fades when the country has fewer scholars.
export const COUNTRY_COLORS={GHA:'#f4bd50',NGA:'#ff896e',ETH:'#51d4b4',RWA:'#f497be',KEN:'#71b9ff',UGA:'#ab9cff',SOM:'#71dce7',SLE:'#c6db70',CMR:'#f6aa71',ZWE:'#d3a3f5',ERI:'#e986ce',GMB:'#78dd9d',MWI:'#e7c080'};
export function countryColor(code){return COUNTRY_COLORS[code]||'#73cdd2';}
export const CAMPUS=[-123.246,49.2606];
export function countryReference(code,countries){
 const c=countries.find(c=>c.iso3===code&&Number.isFinite(c.label_lon)&&Number.isFinite(c.label_lat));
 return c?{code,name:c.name,coordinates:[c.label_lon,c.label_lat],kind:'country-reference'}:null;
}
export function countryConnections(records,countries,{ubcOnly=true}={}){
 const grouped=new Map();
 for(const r of records){
  if(ubcOnly&&r.university!==UBC)continue;
  const ref=countryReference(r.country_code,countries);if(!ref)continue;
  if(!grouped.has(ref.code))grouped.set(ref.code,{...ref,count:0,scholars:[],color:countryColor(ref.code)});
  const g=grouped.get(ref.code);g.count++;g.scholars.push(r.id);
 }
 return [...grouped.values()];
}
// Representative university points; not individual scholars' buildings or residences.
export const UNIVERSITY_DESTINATIONS={
 [UBC]:{name:UBC,label:'UBC',place:'Vancouver, Canada',coordinates:CAMPUS,source:'https://www.ubc.ca/our-campuses/vancouver/'},
 'McGill University':{name:'McGill University',label:'McGill',place:'Montréal, Canada',coordinates:[-73.5772,45.5048],source:'https://www.mcgill.ca/transport/downtown-campus'},
 'University of Cambridge':{name:'University of Cambridge',label:'Cambridge',place:'Cambridge, United Kingdom',coordinates:[.117,52.2053],source:'https://www.cam.ac.uk/about-the-university/contact-the-university'},
 'University of the Western Cape':{name:'University of the Western Cape',label:'UWC',place:'Bellville, South Africa',coordinates:[18.629,-33.9335],source:'https://www.uwc.ac.za/about/uwc-at-a-glance/campus-tour'}
};
export function universityConnections(records,countries){
 const grouped=new Map();
 for(const r of records){const destination=UNIVERSITY_DESTINATIONS[r.university],ref=countryReference(r.country_code,countries);if(!destination||!ref)continue;
 const key=r.university+'|'+ref.code;
 if(!grouped.has(key))grouped.set(key,{...ref,destination,count:0,scholars:[],color:countryColor(ref.code)});
 const g=grouped.get(key);g.count++;g.scholars.push(r.id);
 }return [...grouped.values()];
}
export function connectionFeatures(records,countries){return {type:'FeatureCollection',features:universityConnections(records,countries).map(c=>({type:'Feature',geometry:greatCircle(c.coordinates,c.destination.coordinates),properties:{country_code:c.code,country:c.name,scholar_count:c.count,color:c.color,origin_type:'country-reference',destination:c.destination.name}}))};}
