
import {buildingRestored} from './camp-restoration';
import {potatoGrowth,potatoPatch,potatoSlots} from './potato-farming';
import {placementBounds,type Placement} from './world-layout';
import type {World} from './survival-engine';

type Ctx=CanvasRenderingContext2D;
const ellipse=(c:Ctx,x:number,y:number,rx:number,ry:number,color:string)=>{
 c.save();c.translate(x,y);c.scale(Math.max(.01,rx),Math.max(.01,ry));c.beginPath();c.arc(0,0,1,0,Math.PI*2);c.fillStyle=color;c.fill();c.restore();
};
const line=(c:Ctx,a:[number,number],b:[number,number],width:number,color:string)=>{
 c.beginPath();c.moveTo(...a);c.lineTo(...b);c.lineWidth=width;c.strokeStyle=color;c.stroke();
};
const poly=(c:Ctx,coords:readonly (readonly [number,number])[],color:string)=>{
 c.beginPath();coords.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();
};
const leaf=(c:Ctx,x:number,y:number,rx:number,ry:number,angle:number,color:string)=>{
 c.save();c.translate(x,y);c.rotate(angle);ellipse(c,0,0,rx,ry,color);line(c,[0,-ry*.8],[0,ry*.8],Math.max(.7,rx*.12),'#536e37');c.restore();
};
function potatoBush(c:Ctx,x:number,y:number,r:number,growth:number){
 if(growth<=0)return;
 const age=Math.max(.15,growth),size=r*(.34+age*.66);
 ellipse(c,x,y+size*.35,size*.72,size*.32,'#3a2719');
 if(growth>.9){
  for(let i=0;i<3;i++)ellipse(c,x+(i-1)*size*.53,y+size*.52,size*.23,size*.18,i===1?'#e1ae52':'#b98134');
 }
 const leaves=3+Math.floor(age*5);
 for(let i=0;i<leaves;i++){
  const a=(i/leaves)*Math.PI*2,dist=size*.32;
  leaf(c,x+Math.cos(a)*dist,y+Math.sin(a)*dist*.68,size*.37,size*.23,a+Math.PI/2,i%2?'#58752f':'#789845');
 }
 ellipse(c,x,y,size*.19,size*.14,'#acc164');
 if(growth>.76)for(let i=0;i<3;i++){
  const angle=i*Math.PI*2/3;ellipse(c,x+Math.sin(angle)*size*.25,y+Math.cos(angle)*size*.2,size*.09,size*.075,'#f5ecd0');
 }
}
function timber(c:Ctx,ax:number,ay:number,bx:number,by:number,w:number,broken=false){
 line(c,[ax+1,ay+3],[bx+1,by+3],w+4,'#30261d');
 line(c,[ax,ay],[bx,by],w,'#654126');
 line(c,[ax-w*.09,ay-w*.13],[bx-w*.09,by-w*.13],Math.max(2,w*.42),broken?'#876441':'#a0794a');
 line(c,[ax+2,ay+2],[bx+2,by+2],Math.max(1,w*.12),'#3c2d1d');
}
function post(c:Ctx,x:number,y:number,unit:number){
 const w=unit*.62,h=unit*1.3;
 poly(c,[[x-w/2,y],[x-w/2,y-h],[x+w/2,y-h],[x+w/2,y]],'#52371f');
 poly(c,[[x-w/2,y-h],[x,y-h-unit*.18],[x+w/2,y-h],[x+w/2,y-h+unit*.1]],'#ad8551');
 line(c,[x-w*.52,y-unit*.4],[x+w*.52,y-unit*.4],Math.max(1,unit*.12),'#c2a16a');
}
function stoneSoil(c:Ctx,x:number,y:number,w:number,h:number){
 poly(c,[[x+w*.12,y+h*.46],[x+w*.5,y+h*.25],[x+w*.9,y+h*.48],[x+w*.56,y+h*.82],[x+w*.08,y+h*.68]],'#372718');
 poly(c,[[x+w*.13,y+h*.45],[x+w*.5,y+h*.28],[x+w*.88,y+h*.48],[x+w*.55,y+h*.78],[x+w*.1,y+h*.65]],'#60432a');
 for(let i=0;i<38;i++){
  const xx=x+w*(.2+((i*37)%67)/110), yy=y+h*(.42+((i*19)%46)/125);
  ellipse(c,xx,yy,w*.0035+(i%3)*.5,h*.003+(i%2)*.4,i%4===0?'#a8864c':i%2?'#44301e':'#6c5132');
 }
}
export function drawPotatoPatch(ctx:Ctx,w:World,p:Placement){
 if(!p.assetId.startsWith('art_camp_garden_'))return false;
 const bounds=placementBounds(p),{x,y,width:W,height:H}=bounds;
 const broken=!buildingRestored(w,'garden')||p.assetId==='art_camp_garden_broken'&&!w.progression;
 const tier=broken?0:(w.editorPreview&&p.assetId==='art_camp_garden_t2'?2:potatoPatch(w).tier);
 ctx.save();
 stoneSoil(ctx,x,y,W,H);
 // Viewed from the road at screen right. The front-right fence stops early,
 // making a visible opening accessible without collision.
 const pts:[[number,number],[number,number],[number,number],[number,number],[number,number]]=[
 [x+W*.14,y+H*.64],[x+W*.14,y+H*.46],[x+W*.51,y+H*.28],[x+W*.88,y+H*.49],[x+W*.59,y+H*.78]];
 for(let i=0;i<3;i++)timber(ctx,...pts[i],...pts[i+1],W*.033,broken);
 timber(ctx,...pts[4],...pts[0],W*.034,broken);
 // The EAST edge between points 3 and 4 is the road-facing entrance.
 timber(ctx,...pts[3],x+W*.80,y+H*.60,W*.029,broken);
 timber(ctx,x+W*.65,y+H*.73,...pts[4],W*.029,broken);
 const posts=[pts[0],pts[1],pts[2],pts[3],pts[4]];posts.forEach(([px,py],i)=>{if(broken&&i===0)return;post(ctx,px,py,W*.045)});
 const slots=tier===2?4:2;
 if(broken){
  for(let i=0;i<4;i++){const px=x+W*(.32+(i%2)*.19),py=y+H*(.5+Math.floor(i/2)*.09);line(ctx,[px-6,py-10],[px+4,py+5],2,'#897347');}
  timber(ctx,x+W*.20,y+H*.63,x+W*.33,y+H*.68,W*.018,true);
 }else{
  const patch=potatoPatch(w);
  for(let i=0;i<slots;i++){
   const cols=2,px=x+W*(.37+(i%cols)*.18),py=y+H*(.48+Math.floor(i/cols)*.16);
   const g=patch.plantedAt[i]===undefined?0:potatoGrowth(w,patch.plantedAt[i]);
   ellipse(ctx,px,py+H*.015,W*.087,H*.044,'#34271c');
   if(g===0)for(let n=0;n<2;n++)ellipse(ctx,px+(n-.5)*W*.03,py,W*.014,H*.009,'#7b5c39');
   else potatoBush(ctx,px,py,W*.085,g);
  }
  if(tier===2){
   // Visible upgrade: water barrel and stronger timbers, no oversized shed.
   const bx=x+W*.25,by=y+H*.39;
   ellipse(ctx,bx,by,W*.063,H*.036,'#30271d');
   ctx.fillStyle='#76522c';ctx.fillRect(bx-W*.055,by-H*.09,W*.11,H*.09);
   ellipse(ctx,bx,by-H*.09,W*.056,H*.034,'#a1794b');
   ellipse(ctx,bx,by-H*.091,W*.042,H*.023,'#6b9c9e');
  }
 }
 // Small sack in all stages. Its contents are clearly distinct from foliage.
 const sx=x+W*.26,sy=y+H*.64;
 ellipse(ctx,sx,sy,W*.055,H*.07,broken?'#756347':'#b49a67');
 line(ctx,[sx-W*.035,sy-H*.04],[sx+W*.035,sy-H*.04],W*.015,'#5d472d');
 if(!broken&&tier===2){
  poly(ctx,[[x+W*.2,y+H*.76],[x+W*.33,y+H*.77],[x+W*.32,y+H*.82],[x+W*.18,y+H*.82]],'#765033');
  for(let i=0;i<3;i++)ellipse(ctx,x+W*(.22+i*.035),y+H*.775,W*.014,H*.009,'#c59346');
 }
 ctx.restore();return true;
}
export function drawWildPotatoPlant(c:Ctx,w:World,p:Placement,ripe:boolean){
 const b=placementBounds(p),x=b.x+b.width*.5,y=b.y+b.height*.78,unit=b.width*.28;
 c.save();
 ellipse(c,x,y,unit*1.12,unit*.40,'#503c26');
 ellipse(c,x,y-unit*.07,unit*.90,unit*.31,'#76502c');
 if(ripe){
  for(let i=0;i<3;i++)ellipse(c,x+(i-1)*unit*.51,y,unit*.23,unit*.15,'#bc8a42');
  potatoBush(c,x,y-unit*.51,unit*.85,.9);
 }else{
  // Picked plant visibly loses every leaf, leaving disturbed earth and roots.
  line(c,[x-unit*.18,y-unit*.28],[x+unit*.12,y-unit*.05],2,'#8b784e');
  line(c,[x-unit*.05,y-unit*.2],[x+unit*.2,y-unit*.12],1.5,'#8b784e');
  ellipse(c,x,y,unit*.15,unit*.09,'#31251b');
 }
 c.restore();
}
