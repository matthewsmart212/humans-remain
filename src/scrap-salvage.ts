import type {World} from './survival-engine';
import {usesPaintedHomeTerrain} from './terrain-art';
import {campBounds,campContains} from './world-bounds';
import {layoutBlocked} from './world-layout';
import {riverWaterBlocked} from './river-collision';
export const SCRAP_IMAGES={salvagePipes:'/survival/scrap-salvage-v1/pipes.webp',salvageSheet:'/survival/scrap-salvage-v1/sheet.webp',salvageMachine:'/survival/scrap-salvage-v1/machine.webp'};
export const SCRAP_KEYS=Object.keys(SCRAP_IMAGES) as (keyof typeof SCRAP_IMAGES)[];
/** One bounded scattering pass per round, owned by the session, never the draft. */
export function seedScrapSalvage(w:World,seed=Math.floor(Math.random()*0xffffffff)){
 if(w.scene||!w.layout||!usesPaintedHomeTerrain(w.layout.terrainImage)||w.loot.some(l=>l.salvageVariant!==undefined))return 0;
 let state=seed>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 const bounds=campBounds(w.layout),placed:{x:number;y:number}[]=[];
 const clear=(x:number,y:number,r=30)=>campContains(w.layout,x,y,r)&&!riverWaterBlocked(x,y,r)&&!layoutBlocked(w.layout!,x,y,r);
 for(let attempt=0;attempt<7000&&placed.length<64;attempt++){
  // A useful handful near camp; the rest reward exploring the whole map.
  const near=placed.length<12,angle=random()*Math.PI*2,radius=1100+random()*2300;
  const x=near?w.layout.spawn.x+Math.cos(angle)*radius:bounds.left+random()*bounds.width,y=near?w.layout.spawn.y+Math.sin(angle)*radius:bounds.top+random()*bounds.height;
  if(!clear(x,y)||placed.some(p=>Math.hypot(p.x-x,p.y-y)<230))continue;
  let approaches=0;for(let i=0;i<8;i++)if(clear(x+Math.cos(i*Math.PI/4)*65,y+Math.sin(i*Math.PI/4)*65,19))approaches++;
  if(approaches<4)continue;
  placed.push({x,y});w.loot.push({id:w.serial++,x,y,kind:'scrap',amount:2+Math.floor(random()*3),salvageVariant:Math.floor(random()*3) as 0|1|2,returned:true});
 }
 return placed.length;
}
export function scrapDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,view:{x:number;y:number;width:number;height:number}){
 return w.loot.filter(l=>l.salvageVariant!==undefined&&l.amount>0&&l.x>view.x-90&&l.x<view.x+view.width+90&&l.y>view.y-90&&l.y<view.y+view.height+90).map(l=>({y:l.y,draw:()=>{
  const image=imgs[SCRAP_KEYS[l.salvageVariant!]];if(!image)return;ctx.save();ctx.fillStyle='#231a123d';ctx.beginPath();ctx.ellipse(l.x,l.y,30,10,0,0,Math.PI*2);ctx.fill();ctx.drawImage(image,l.x-43,l.y-59,86,68);ctx.restore();
 }}));
}
