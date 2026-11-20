import {EAST_TERRAIN_SCALE} from './east-approach';
import {terrainColourAt} from './terrain-colour-field';
import type {RockBounds,RockMaterial} from './rock-surface';
import type {WorldAsset} from './world-assets';
import type {Placement} from './world-layout';

type Point=readonly [number,number];
type Bed={x:number;y:number;material:RockMaterial;chips:Point[][];faces:Point[][];blades:Point[][]};
const beds=new WeakMap<Placement,Bed>();
const ironFoot:Point[]=[[.03,.66],[.14,.84],[.35,.97],[.59,.99],[.84,.86],[.97,.64]];
const chipColours={
 woodland:['#594f40','#948d73'],river:['#515856','#9a9d8d'],dry:['#79654e','#b29b7b'],
 exposed:['#545452','#96948a'],iron:['#655146','#9e7960'],
} as const;

function buildBed(p:Placement,a:WorldAsset,material:RockMaterial):Bed{
 const bed:Bed={x:p.x,y:p.y,material,chips:[],faces:[],blades:[]};
 let seed=2166136261;
 for(let i=0;i<p.id.length;i++)seed=Math.imul(seed^p.id.charCodeAt(i),16777619);
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const foot=a.collision?.paths[0]?.points??ironFoot;
 const groundLine=(u:number)=>{
  let v=0;
  for(let i=0;i<foot.length;i++){
   const [x,y]=foot[i],[ex,ey]=foot[(i+1)%foot.length];
   if((u-x)*(u-ex)<=0&&x!==ex)v=Math.max(v,y+(ey-y)*(u-x)/(ex-x));
  }
  return v||.77;
 };
 const [clearSoil]=terrainColourAt(p.x/EAST_TERRAIN_SCALE+600,p.y/EAST_TERRAIN_SCALE+600);
 for(let side=0;side<2;side++){
  const root=side===0 ? .11+random()*.19 : .71+random()*.16;
  const count=2+Math.floor(random()*4);
  for(let i=0;i<count;i++){
   const x=root+(random()-.5)*.20,y=groundLine(x)+.025+random()*.065;
   const r=.006+random()*.013,h=r*(.45+random()*.35)*a.width/a.height;
   bed.chips.push([[x-r,y],[x-.45*r,y-h],[x+.32*r,y-h*1.2],[x+r,y-h*.20],[x+r*.37,y+h*.42],[x-r*.72,y+h*.38]]);
   bed.faces.push([[x-r,y],[x-.45*r,y-h],[x+.32*r,y-h*1.2],[x+r*.57,y-h*.59],[x-r*.10,y-h*.18]]);
  }
  if(clearSoil<.78&&(material==='woodland'||material==='river')&&random()<.72){
   const y=groundLine(root)+.04;
   for(let i=0;i<5;i++){
    const lean=(i-2)*(.006+.003*random()),height=(.018+.027*random())*a.width/a.height,x=root+lean*.35;
    bed.blades.push([[x-.003,y],[x+lean*.43-.003,y-height*.60],[x+lean,y-height],[x+lean*.46+.003,y-height*.47],[x+.003,y]]);
   }
  }
 }
 beds.set(p,bed);
 return bed;
}

function fillShapes(ctx:CanvasRenderingContext2D,shapes:Point[][],colour:string){
 if(!shapes.length)return;
 ctx.beginPath();
 for(const shape of shapes){
  ctx.moveTo(...shape[0]);
  for(let i=1;i<shape.length;i++)ctx.lineTo(...shape[i]);
  ctx.closePath();
 }
 ctx.fillStyle=colour;ctx.fill();
}

/** A few weathered chips sit at the actual lower footprint, with tufts in
 * pockets of uncleared soil. Cache their positions while the placement is still. */
export function drawRockGround(ctx:CanvasRenderingContext2D,p:Placement,a:WorldAsset,b:RockBounds,material:RockMaterial,hideFoliage=false){
 if(a.groundDetail)return;
 const old=beds.get(p);
 const bed=old&&old.x===p.x&&old.y===p.y&&old.material===material?old:buildBed(p,a,material);
 const [stone,edge]=chipColours[material];
 ctx.save();ctx.translate(b.x,b.y);ctx.scale(b.width,b.height);
 ctx.globalAlpha*=.83;
 fillShapes(ctx,bed.chips,stone);
 fillShapes(ctx,bed.faces,edge);
 if(!hideFoliage)fillShapes(ctx,bed.blades,material==='river'?'#687250':'#737342');
 ctx.restore();
}
