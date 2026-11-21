import {chestFrame,placedLootChestId} from './chest-animation';
import {lootChestRemaining} from './loot-chest';
import {WOODEN_LOOT_SPRITE} from './wooden-loot-art';
import type {World} from './survival-engine';

type Bounds={x:number;y:number;width:number;height:number};
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
const seeds=Array.from({length:28},(_,i)=>{
 const value=Math.sin(i*127.1+311.7)*43758.5453;
 return value-Math.floor(value);
});

function amberGlow(ctx:CanvasRenderingContext2D,x:number,y:number,radius:number,alpha:number){
 const gradient=ctx.createRadialGradient(x,y,0,x,y,radius);
 gradient.addColorStop(0,`rgba(255,221,162,${alpha})`);
 gradient.addColorStop(.33,`rgba(255,157,49,${alpha*.64})`);
 gradient.addColorStop(.68,`rgba(255,108,17,${alpha*.20})`);
 gradient.addColorStop(1,'rgba(255,92,12,0)');
 ctx.fillStyle=gradient;
 ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
}

/** The chest shares its animation and effects between the campsite and editor placements. */
export function drawWoodenLootChest(ctx:CanvasRenderingContext2D,sheet:HTMLImageElement,w:World,placementId:string,bounds:Bounds){
 const {width,height,columns,frames}=WOODEN_LOOT_SPRITE;
 const id=placedLootChestId(placementId),state=w.lootChests?.[id];
 const empty=!!state&&lootChestRemaining(w,id)===0;
 const reduced=!!w.weather?.reducedMotion;
 const time=reduced?0:w.tick/60;
 const age=state?Math.max(0,w.tick-state.openedAt):-1;
 const pose=reduced&&state?frames-1:chestFrame(w,placementId,frames);
 const frame=empty&&pose===frames-1?frames:pose;
 const gap=clamp((pose-2)/(frames-4));
 const charge=!reduced&&age>=0&&age<15?Math.sin(age/15*Math.PI*.5):0;
 const elapsed=(age-15)/60;
 const burst=!reduced&&elapsed>=0?clamp(elapsed*15)*Math.exp(-elapsed*5):0;
 const pulse=.83+Math.sin(time*3.1)*.12;
 const power=empty?.15:1;
 const lockX=115,lockY=226,mouthX=151,mouthY=204;
 ctx.save();
 ctx.translate(bounds.x,bounds.y);
 ctx.scale(bounds.width/width,bounds.height/height);

 ctx.save();
 ctx.translate(152,298);
 ctx.scale(1,.26);
 const shadow=ctx.createRadialGradient(0,0,0,0,0,143);
 shadow.addColorStop(0,'rgba(26,13,6,.47)');shadow.addColorStop(1,'rgba(26,13,6,0)');
 ctx.fillStyle=shadow;ctx.fillRect(-143,-143,286,286);
 ctx.globalCompositeOperation='screen';
 amberGlow(ctx,0,0,145,power*(pulse*.27+burst*.25));
 ctx.restore();

 ctx.drawImage(sheet,(frame%columns)*width,Math.floor(frame/columns)*height,width,height,0,0,width,height);
 ctx.globalCompositeOperation='screen';
 const seal=power*(pulse*.61+charge*.39)*(1-gap*.86);
 amberGlow(ctx,lockX,lockY,42,seal);
 amberGlow(ctx,lockX,lockY,10,seal*.93);
 if(gap>0){
  // The orange interior spills up the inner lid as the opening widens.
  ctx.save();ctx.translate(mouthX,mouthY);ctx.scale(1,.60+gap*.30);
  amberGlow(ctx,0,0,108,power*(gap*.71+burst*.48));
  amberGlow(ctx,0,4,46,power*(gap*.62+burst*.3));
  ctx.restore();
 }

 if(!reduced){
  const count=empty?3:gap>.4?15:9;
  ctx.fillStyle='#ffbf59';
  for(let i=0;i<count;i++){
   const phase=(time*(.28+seeds[i]*.17)+seeds[i+12])%1;
   const x=(gap>.2?mouthX:lockX)+(seeds[i]-.5)*(82+phase*74);
   const y=(gap>.2?mouthY:lockY)-phase*(77+gap*89);
   const envelope=Math.sin(phase*Math.PI);
   const size=(1+seeds[i+4]*2.2)*envelope;
   ctx.globalAlpha=power*envelope*(.45+seeds[i]*.48);
   ctx.fillRect(x,y,size,size);
  }
  if(burst>.025&&!empty){
   ctx.fillStyle='#ffda8e';
   ctx.globalAlpha=burst*.95;
   for(let i=0;i<seeds.length;i++){
    const x=mouthX+(seeds[i]-.5)*450*elapsed;
    const y=mouthY-(90+seeds[(i+11)%seeds.length]*225)*elapsed+85*elapsed*elapsed;
    ctx.fillRect(x,y,2+seeds[i]*3,2+seeds[i]*3);
   }
  }
 }
 ctx.restore();
}
