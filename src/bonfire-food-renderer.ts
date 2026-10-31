import {isProvision} from './food-provisions-data';
import {provisionImageKey} from './food-provisions-art';
import {timeOf,type World,type Vec} from './survival-engine';
import {placementBounds} from './world-layout';
import {FOOD_RECIPES,isCookedFood,type FoodSpecies} from './food-items';
import {FIRE_CAPACITY} from './camp-kitchen';
import {campfireServingLayout} from './campfire-layout';
import {assetImageKey,TREE_LOG_IMAGE} from './world-assets';

const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const meatKey=(species:FoodSpecies,cooked=false)=>species==='venison'?(cooked?'venisonCooked':'venisonRaw'):species==='rabbit'?(cooked?'rabbitCooked':'rabbitRaw'):(cooked?'bonfireCooked':'bonfireRaw');
function fireShape(w:World){const p=w.layout?.items.find(p=>p.role==='hearth'),b=p?placementBounds(p):{width:112,height:112};return{...w.camp.hearth,width:b.width,height:b.height}}
function plank(ctx:CanvasRenderingContext2D,x:number,y:number,width:number,height:number){
 ctx.beginPath();ctx.moveTo(x+5,y);ctx.lineTo(x+width-5,y);ctx.lineTo(x+width,y+5);ctx.lineTo(x+width-2,y+height-4);ctx.lineTo(x+width-6,y+height);ctx.lineTo(x+3,y+height);ctx.lineTo(x,y+height-4);ctx.lineTo(x,y+5);ctx.closePath();
}

export function bonfireFoodDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World){
 const t=timeOf(w),out:{y:number;draw:()=>void}[]=[],shape=fireShape(w),{height,width}=shape;
 const flame={x:w.camp.hearth.x,y:w.camp.hearth.y-height*.5};
 const food=(key:'bonfireRaw'|'bonfireCooked'|'rabbitRaw'|'rabbitCooked'|'venisonRaw'|'venisonCooked',p:Vec,alpha=1)=>{const im=imgs[key];if(!im)return;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(im,p.x-29,p.y-44,58,48);ctx.restore()};
 for(const l of w.loot.filter(l=>isCookedFood(l.kind)))out.push({y:l.y,draw:()=>{
  const u=l.flight?Math.max(0,Math.min(1,(t-l.flight.born)/(l.flight.lands-l.flight.born))):1;
  const p=l.flight?{x:l.flight.from.x+(l.x-l.flight.from.x)*u,y:l.flight.from.y+(l.y-l.flight.from.y)*u-Math.sin(u*Math.PI)*65}:l;
  ctx.fillStyle='#37281038';ctx.beginPath();ctx.ellipse(l.x,l.y,23,8,0,0,Math.PI*2);ctx.fill();food(l.kind==='cookedVenison'?'venisonCooked':l.kind==='cookedRabbit'?'rabbitCooked':'bonfireCooked',p);
 }});
 for(const l of w.loot.filter(l=>isProvision(l.kind)))out.push({y:l.y,draw:()=>{
  if(!isProvision(l.kind))return;const image=imgs[provisionImageKey(l.kind)];if(!image)return;
  ctx.save();ctx.fillStyle='#37281038';ctx.beginPath();ctx.ellipse(l.x,l.y,19,6,0,0,Math.PI*2);ctx.fill();ctx.drawImage(image,l.x-24,l.y-43,48,48);ctx.restore();
 }});
 // Loose supplies dropped from the bag share cached item artwork on web and
 // native. Placed pickups and log bundles already have their own renderers.
 for(const l of w.loot.filter(l=>!l.placementId&&l.salvageVariant===undefined&&l.appearance!=='logs'&&['rawMeat','rawRabbit','rawVenison','scrap','fuel'].includes(l.kind)))out.push({y:l.y,draw:()=>{
  const image=imgs[l.kind==='rawVenison'?'venisonRaw':l.kind==='rawRabbit'?'rabbitRaw':l.kind==='rawMeat'?'bonfireRaw':l.kind==='scrap'?'bagScrap':'bagFuel'];if(!image)return;
  ctx.save();ctx.fillStyle='#37281038';ctx.beginPath();ctx.ellipse(l.x,l.y,19,6,0,0,Math.PI*2);ctx.fill();ctx.drawImage(image,l.x-24,l.y-39,48,40);ctx.restore();
 }});
 if(w.fire.thrown){const f=w.fire.thrown,u=Math.max(0,Math.min(1,(t-f.born)/.45));if(u<1)out.push({y:w.camp.hearth.y+250,draw:()=>food((f.species??w.fire.species)==='venison'?'venisonRaw':(f.species??w.fire.species)==='rabbit'?'rabbitRaw':'bonfireRaw',{x:f.from.x+(flame.x-f.from.x)*u,y:f.from.y+(flame.y-f.from.y)*u-Math.sin(u*Math.PI)*75},u>.85?(1-u)/.15:1)})}
 if(!w.scene){
  const job=w.fire.queue?.[0],burning=shape.fuel>0,rack=w.fire.rack??[],table=campfireServingLayout(shape,width,height),rackX=table.collect.x,rackY=table.collect.y;
  out.push({y:shape.y+3,draw:()=>{const spit=imgs.campSpit,sw=width*.94,sh=sw*866/1816;if(spit)ctx.drawImage(spit,shape.x-sw/2,shape.y-height*.44-sh*.18,sw,sh)}});
  if(job)out.push({y:shape.y+3,draw:()=>{
   const y=shape.y-height*.44,progress=clamp(1-job.remaining/FOOD_RECIPES[job.species].seconds),turn=w.weather?.reducedMotion?0:Math.sin(t*2)*.055;
   ctx.save();
   ctx.translate(shape.x,y);ctx.rotate(turn);const fw=Math.min(85,width*.29),fh=fw*.82,raw=imgs[meatKey(job.species)],cooked=imgs[meatKey(job.species,true)];
   if(raw)ctx.drawImage(raw,-fw/2,-fh*.67,fw,fh);if(cooked){ctx.globalAlpha=progress;ctx.drawImage(cooked,-fw/2,-fh*.67,fw,fh)}ctx.restore();
   if(burning&&rack.length<6){ctx.save();ctx.strokeStyle='#fff0c3';ctx.lineWidth=2;for(let i=0;i<3;i++){const phase=(t*.7+i*.33)%1,x=shape.x+(i-1)*17,top=y-30-phase*42;ctx.globalAlpha=(1-phase)*.45;ctx.beginPath();for(let j=0;j<=8;j++){const xx=x+Math.sin(j*.6+t*2+i)*4,yy=top+j*2;j?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.stroke()}ctx.restore()}
  }});
  out.push({y:table.top+table.height,draw:()=>{
   ctx.save();ctx.fillStyle='#37241355';ctx.beginPath();ctx.ellipse(table.left+84,table.top+96,74,17,0,0,Math.PI*2);ctx.fill();const board=imgs.campServing;if(board)ctx.drawImage(board,table.left,table.top,table.width,table.height);
   rack.forEach((species,i)=>{const im=imgs[meatKey(species,true)],slot=table.meals[i];if(im&&slot)ctx.drawImage(im,slot.x,slot.y,table.mealWidth,table.mealHeight)});ctx.restore();
  }});
  const logImage=imgs[assetImageKey(TREE_LOG_IMAGE)];
  for(const log of w.fire.logs??[]){const u=clamp((t-log.born)/(log.lands-log.born));out.push({y:shape.y+240,draw:()=>{
   if(!logImage)return;const x=log.from.x+(shape.x-log.from.x)*u,y=log.from.y+(shape.y-height*.2-log.from.y)*u-(w.weather?.reducedMotion?0:Math.sin(u*Math.PI)*95);
   ctx.save();ctx.translate(x,y);if(!w.weather?.reducedMotion)ctx.rotate(-.5+u*1.1);ctx.drawImage(logImage,-34,-23,68,46);ctx.restore();
  }})}
  const flare=t-(w.fire.flaredAt??-100);if(flare>=0&&flare<.75&&burning&&!w.weather?.reducedMotion)out.push({y:shape.y+240,draw:()=>{
   ctx.save();ctx.globalAlpha=1-flare/.75;for(let i=0;i<9;i++){const a=i*2.399,x=shape.x+Math.cos(a)*(20+flare*70),y=shape.y-height*.23-Math.abs(Math.sin(a))*flare*130;ctx.fillStyle=i%2?'#ffb342':'#fff0a2';ctx.beginPath();ctx.arc(x,y,2+((i%3)*.8),0,Math.PI*2);ctx.fill()}ctx.restore();
  }});
  for(const [i,meal] of (w.fire.taken??[]).entries()){const u=clamp((t-meal.born)/.55);if(u>=1)continue;out.push({y:shape.y+250,draw:()=>food(meatKey(meal.species,true),{x:rackX+(meal.to.x-rackX)*u+i*3,y:rackY+(meal.to.y-rackY)*u-Math.sin(u*Math.PI)*65},1-u*.45)})}
 }
 return out;
}

/** Brief successful firewood feedback; ongoing fuel status lives beside the action. */
export function drawCampfireHud(ctx:CanvasRenderingContext2D,_imgs:Record<string,HTMLImageElement>,w:World,scale:number){
 const t=timeOf(w),flare=t-(w.fire.flaredAt??-100);
 if(w.scene||flare<0||flare>=1.5||w.camp.hearth.fuel<=0||Math.hypot(w.player.x-w.camp.hearth.x,w.player.y-w.camp.hearth.y)>700)return;
 const f=fireShape(w),s=Math.max(.1,scale);
 ctx.save();ctx.translate(f.x,f.y-f.height*.94-39/s);ctx.scale(1/s,1/s);ctx.globalAlpha=1-flare/1.5;ctx.fillStyle='#ffe0a0';ctx.textAlign='center';ctx.font="900 13px 'Barlow Condensed'";ctx.strokeStyle='#342517';ctx.lineWidth=3;
 const y=w.weather?.reducedMotion?0:-flare*12;ctx.strokeText('+1:30',0,y);ctx.fillText('+1:30',0,y);ctx.restore();
}
