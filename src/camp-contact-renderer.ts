import profiles from './camp-ground-profiles.json';
import type {WorldAsset} from './world-assets';
import {placementBounds,type Placement} from './world-layout';

const bySource=new Map(profiles.flatMap(p=>p.sources.map(s=>[s,p] as const)));
/** Small, feathered contact shadows follow the authored feet/foundations.
 * Draw in the asset's own layer so indoor props sit on their wooden floor,
 * and the bonfire shadow remains above the separate clearing decal. The
 * caller applies the same rotation/mirror transform as the artwork. */
export function drawCampContact(ctx:CanvasRenderingContext2D,p:Placement,a:WorldAsset){
 const profile=bySource.get(a.image);if(!profile)return;
 const b=placementBounds(p);ctx.save();ctx.strokeStyle='#302516';ctx.lineJoin='round';ctx.lineCap='round';
 for(const [spread,strength] of [[2.5,.12],[1.8,.19],[1.2,.27],[.65,.42]]){
  ctx.globalAlpha=profile.contactOpacity*strength;
  ctx.lineWidth=b.width*profile.contactWidth*spread;
  ctx.beginPath();for(const path of profile.paths)path.forEach(([u,v],i)=>i?ctx.lineTo(b.x+u*b.width,b.y+v*b.height):ctx.moveTo(b.x+u*b.width,b.y+v*b.height));ctx.stroke();
 }
 ctx.restore();
}
