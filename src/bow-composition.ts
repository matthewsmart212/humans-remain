import {SURVIVOR_ART} from './survivor-art';
import {RUNNER_COMBAT_HEADS} from './runner-combat-head';
import registered from './bow-registration.json';
import headOutlines from './bow-head-outlines.json';
import type {WeaponView} from './weapon-grip';
type Point=readonly [number,number];type Polygon=readonly Point[];
const HEADS:Record<WeaponView,Polygon>={
 ...RUNNER_COMBAT_HEADS,
 up:[[-2,-2],[196,-2],[196,124],[180,130],[173,139],[151,147],[120,153],[92,154],[65,149],[45,143],[30,139],[19,130],[-2,129]],
 'up-right':[[-2,-2],[199,-2],[199,131],[183,137],[169,144],[152,153],[131,159],[111,160],[93,157],[76,155],[60,155],[44,153],[24,148],[-2,145]]
};
// Resting sleeves leave the shoulder; the original core keeps its scale.
const ARMS:Record<WeaponView,Polygon[]>={
 down:[[[0,145],[31,144],[47,156],[52,177],[41,199],[36,219],[0,219]],[[152,144],[177,148],[200,168],[200,216],[156,216],[145,190],[150,178]]],
 'down-right':[[[0,154],[39,153],[57,166],[66,183],[59,199],[53,215],[40,229],[0,229]],[[170,147],[203,147],[210,210],[178,210],[166,193]]],
 right:[[[64,159],[94,159],[116,168],[123,187],[120,207],[112,226],[77,226],[66,208],[63,189]]],
 'up-right':[[[0,143],[29,143],[42,161],[43,181],[33,202],[0,202]],[[130,150],[158,146],[184,167],[199,191],[198,220],[162,228],[145,211],[138,193]]],
 up:[[[0,135],[38,136],[53,157],[45,177],[40,198],[0,198]],[[154,134],[194,134],[200,200],[162,200],[146,176]]]
};
const OUTER:Polygon=[[-300,-300],[300,-300],[300,100],[-300,100]];
function path(ctx:CanvasRenderingContext2D,points:Polygon){points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath()}
function mapped(points:readonly number[][],x:number,y:number,k:number):Point[]{return points.map(p=>[x+p[0]*k,y+p[1]*k])}
function exclude(ctx:CanvasRenderingContext2D,poly:Polygon){ctx.beginPath();path(ctx,OUTER);path(ctx,poly.slice().reverse());ctx.clip()}
const HEAD_LEAN:Record<WeaponView,Point>={up:[0,1.5],'up-right':[2.2,1.4],right:[2.6,1.5],'down-right':[2,1.8],down:[0,1.8]};
const HEAD_KEYS:readonly Point[]=[[0,0],[.12,.3],[.30,1],[.42,1],[.49,-.22],[.60,.12],[.84,0]];
/** A rigid translation of the approved head: no scale, rotation or redraw. */
export function bowHeadOffset(view:WeaponView,age:number):Point{
 if(age<=0||age>=.84)return [0,0];
 const i=HEAD_KEYS.findIndex(([time])=>time>=age),[a,av]=HEAD_KEYS[i-1],[b,bv]=HEAD_KEYS[i];
 const t=(age-a)/(b-a),blend=t*t*(3-2*t),amount=av+(bv-av)*blend;
 return [HEAD_LEAN[view][0]*amount,HEAD_LEAN[view][1]*amount];
}
export function drawBowLayers(ctx:CanvasRenderingContext2D,images:Record<string,HTMLImageElement>,view:WeaponView,frame:number,action:HTMLImageElement,nocked=false,age=[0,.1,.2,.34,.47,.65][frame]){
 const sprite=SURVIVOR_ART[view].idle,k=sprite.scale,[sx,sy,sw,sh]=sprite.crop,r=registered[view][frame];
 const base=images[sprite.sheet];if(!base)return false;
 const x=-sprite.anchor[0]*k,y=-sprite.anchor[1]*k;
 const drawBase=()=>ctx.drawImage(base,sx,sy,sw,sh,x,y,sw*k,sh*k);
 const head=HEADS[view].map(([px,py]):Point=>[x+px*k,y+py*k]);
 const offset=bowHeadOffset(view,age),silhouette=mapped(headOutlines[view],x,y,k);
 const movingSilhouette=silhouette.map(([px,py]):Point=>[px+offset[0],py+offset[1]]);
 const oldArms=ARMS[view].map(poly=>poly.map(([px,py]):Point=>[x+px*k,y+py*k]));
 // The original extended-arm drawing supplies the shirt behind the side sleeve.
 if(view==='right'){
  const p=SURVIVOR_ART.right.punch,[px,py,pw,ph]=p.crop;
  ctx.save();ctx.beginPath();path(ctx,[[-14,-48],[7,-48],[7,-25],[-14,-25]]);ctx.clip();
  ctx.drawImage(images[p.sheet],px,py,pw,ph,-p.anchor[0]*p.scale,-p.anchor[1]*p.scale,pw*p.scale,ph*p.scale);ctx.restore();
 }
 ctx.save();exclude(ctx,head);
 for(const poly of oldArms)exclude(ctx,poly);
 drawBase();ctx.restore();
 // Only arms/equipment enter the action layer; no action torso, face or boots.
 ctx.save();exclude(ctx,silhouette);exclude(ctx,movingSilhouette);
 ctx.save();ctx.beginPath();
 for(const poly of r.layers)path(ctx,mapped(poly,r.x,r.y,r.scale));
 ctx.clip();ctx.drawImage(action,frame*384,0,384,384,r.x,r.y,384*r.scale,384*r.scale);ctx.restore();
 const string=mapped(r.string,r.x,r.y,r.scale);
 ctx.save();ctx.strokeStyle='#3b2b1a';ctx.lineWidth=1.35;ctx.beginPath();string.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.stroke();
 ctx.strokeStyle='#c6a576';ctx.lineWidth=.55;ctx.stroke();ctx.restore();
 if(nocked&&images.bowArrow&&r.arrow.length===2){
  const [tail,tip]=mapped(r.arrow,r.x,r.y,r.scale),dx=tip[0]-tail[0],dy=tip[1]-tail[1],length=Math.hypot(dx,dy);
  ctx.save();ctx.translate((tail[0]+tip[0])/2,(tail[1]+tip[1])/2);ctx.rotate(Math.atan2(dy,dx)+Math.PI);
  ctx.drawImage(images.bowArrow,-length/2,-length/20,length,length/10);ctx.restore();
 }
 ctx.restore();
 ctx.save();ctx.translate(...offset);ctx.beginPath();path(ctx,head);ctx.clip();drawBase();ctx.restore();
 return true;
}
