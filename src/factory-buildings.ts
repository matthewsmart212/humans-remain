import {ROOMS,type Room} from './factory-map';
/** Roof reveal is driven by position, never by a different visual-only doorway. */
export function roofOpacity(room:Room,p:{x:number;y:number},overview=false){
 if(overview)return 1;
 const dx=Math.max(room.x-p.x,0,p.x-room.x-room.width),dy=Math.max(room.y-p.y,0,p.y-room.y-room.height);
 return Math.min(1,Math.hypot(dx,dy)/85);
}
const themes=['#4f7770','#966346','#555e65','#737452','#337b79'];
export function buildingFloors(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>){
 ROOMS.forEach((r,i)=>{
  // Raised concrete apron and bright, distinct indoor flooring.
  ctx.fillStyle='#182d3440';ctx.fillRect(r.x-30,r.y+20,r.width+90,r.height+50);
  ctx.fillStyle='#b3a88c';ctx.fillRect(r.x-28,r.y-28,r.width+56,r.height+56);
  ctx.drawImage(imgs.floor,160,250,650,950,r.x,r.y,r.width,r.height);
  ctx.fillStyle=themes[i]+'30';ctx.fillRect(r.x,r.y,r.width,r.height);
  ctx.fillStyle='#413c2a22';
  for(let x=r.x+65;x<r.x+r.width;x+=65){ctx.fillRect(x,r.y,2,r.height)}
  for(let y=r.y+65;y<r.y+r.height;y+=65){ctx.fillRect(r.x,y,r.width,2)}
  for(const d of r.doors){const h=d.side==='n'||d.side==='s';const x=h?r.x+d.at:r.x+(d.side==='e'?r.width:0),y=h?r.y+(d.side==='s'?r.height:0):r.y+d.at;
   ctx.save();ctx.translate(x,y);if(!h)ctx.rotate(Math.PI/2);ctx.fillStyle='#253c3c';ctx.fillRect(-d.width/2,-28,d.width,56);ctx.fillStyle='#ddb957';for(let k=-d.width/2;k<d.width/2;k+=26)ctx.fillRect(k,-26,12,52);ctx.fillStyle='#b6a27c';ctx.fillRect(-d.width/2,-13,d.width,26);ctx.restore();
  }
 });
}
export function buildingRoofs(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,p:{x:number;y:number},overview=false){
 ROOMS.forEach((r,i)=>{
  const alpha=roofOpacity(r,p,overview),base=i===4;
  // Base stays open as a ruined workshop; surrounding buildings have full roofs.
  if(base){ctx.drawImage(imgs.roofs,0,0,627,110,r.x-22,r.y-70,r.width+44,75);return;}
  ctx.save();ctx.globalAlpha=alpha;
  ctx.fillStyle='#08242b66';ctx.fillRect(r.x+22,r.y+28,r.width+30,r.height+30);
  // Southern facade gives the building physical height, while door apertures stay legible.
  ctx.fillStyle='#18363b';ctx.fillRect(r.x-18,r.y+r.height-66,r.width+36,72);
  ctx.drawImage(imgs.floor,0,260,48,1000,r.x-18,r.y+r.height-66,r.width+36,72);
  ctx.fillStyle=themes[i]+'77';ctx.fillRect(r.x-18,r.y+r.height-66,r.width+36,72);
  const q=627;ctx.drawImage(imgs.roofs,(i%2)*q,Math.floor(i/2)*q,q,q,r.x-22,r.y-85,r.width+44,r.height+28);
  ctx.strokeStyle='#102e35';ctx.lineWidth=9;ctx.strokeRect(r.x-22,r.y-85,r.width+44,r.height+28);
  ctx.strokeStyle='#dac394';ctx.lineWidth=3;ctx.strokeRect(r.x-18,r.y-81,r.width+36,r.height+20);
  // Building name is mounted on the facade, not written across the floor.
  ctx.fillStyle='#102f37';ctx.fillRect(r.x+r.width/2-118,r.y+r.height-40,236,40);
  ctx.strokeStyle='#c5a87b';ctx.lineWidth=2;ctx.strokeRect(r.x+r.width/2-118,r.y+r.height-40,236,40);
  ctx.font="900 26px 'Barlow Condensed'";ctx.textAlign='center';ctx.fillStyle='#ffe2a7';ctx.fillText(r.name,r.x+r.width/2,r.y+r.height-12);
  for(const d of r.doors.filter(d=>d.side==='s')){ctx.fillStyle='#09292e';ctx.fillRect(r.x+d.at-d.width/2,r.y+r.height-54,d.width,62);ctx.fillStyle='#b89c66';ctx.fillRect(r.x+d.at-d.width/2,r.y+r.height+4,d.width,6);}
  ctx.restore();
  // Lamps mark actual entrances; leave them visible during the cutaway.
  for(const d of r.doors){const h=d.side==='n'||d.side==='s';const x=h?r.x+d.at:r.x+(d.side==='e'?r.width:0),y=h?r.y+(d.side==='s'?r.height:0):r.y+d.at;
   const glow=ctx.createRadialGradient(x,y,2,x,y,65);glow.addColorStop(0,'#ffc35e50');glow.addColorStop(1,'#ffc35e00');ctx.fillStyle=glow;ctx.fillRect(x-65,y-65,130,130);
   ctx.fillStyle='#163840';ctx.fillRect(x-12,y-32,24,13);ctx.fillStyle='#ffcf75';ctx.fillRect(x-8,y-29,16,6);
  }
 });
}
