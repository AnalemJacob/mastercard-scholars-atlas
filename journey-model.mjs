// A named place may appear in several chapters without requiring another trip.
export function sameJourneyPlace(a,b){
 if(!a||!b)return false;
 if(a.place_id&&b.place_id)return a.place_id===b.place_id;
 const x=a.coordinates||a.point,y=b.coordinates||b.point;
 return !!(x&&y&&Math.abs(x[0]-y[0])<1e-5&&Math.abs(x[1]-y[1])<1e-5);
}
