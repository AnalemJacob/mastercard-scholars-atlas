export const STUDY_AREAS=[
 ['Mapping & data',/geomatics|data science|biostatistics/i],
 ['Climate & forests',/forest|environment|conservation|resilience|sustainable development/i],
 ['Food & agriculture',/food|bioresource|animal|nutrition/i],
 ['Health & biosciences',/health|biotechnology|nutrition|biostatistics/i],
 ['Policy & leadership',/policy|leadership|economics|global risk/i],
 ['Education & community',/education/i],
 ['Engineering & infrastructure',/engineering/i]
];
export function studyAreas(record){return STUDY_AREAS.filter(([,rule])=>rule.test(record.programme||'')).map(([label])=>label);}
export function matchesStudyArea(record,area){return !area||studyAreas(record).includes(area);}
export function routeWidth(count){return 1.6+Math.sqrt(Math.max(1,count))*.7;}
export function storySteps(record,extra={}){return [
 {title:'Country roots',text:record.country_code?`${record.name} is listed from ${record.country}. The map uses a country reference point; an exact hometown has not been confirmed.`:`A home country has not yet been confirmed for ${record.name}. No origin or route is invented.`,source:record.source_url||''},
 {title:'University connection',text:`${record.name} studies ${record.programme||'a programme not yet recorded'} at ${record.university}. Cohort: ${record.cohort||'not recorded'}. The line represents an education connection, not a travel itinerary.`,source:record.source_url||''},
 {title:'Study & purpose',text:extra.text||record.bio||`The published profile lists ${record.programme||'no programme yet'}. A personal story or future goal has not yet been documented.`,source:extra.source||record.source_url||'',evidence:extra.text?'Published story':record.bio?'Project profile summary':'Programme record'}
 ];}
