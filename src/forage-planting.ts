import {FORAGE_ART} from './forage-art';
import {usesPaintedHomeTerrain} from './terrain-art';
import {campBounds,campContains} from './world-bounds';
import {ASSET_BY_ID} from './world-assets';
import {layoutBlocked,placementBounds,type WorldLayout,type Placement} from './world-layout';
import {visiblePlacements} from './layout-views';
import {riverWaterBlocked} from './river-collision';
import {MAX_LAYOUT_ITEMS} from './layout-limits';

/** One deterministic, editable planting pass on the authored woodland. Existing props take priority. */
export function addForagingPlants(layout:WorldLayout):WorldLayout{
 if(layout.forageVersion||!usesPaintedHomeTerrain(layout.terrainImage)||!layout.worldPlantingVersion)return layout;
 const additions:Placement[]=[],bounds=campBounds(layout);let seed=0xbed1e5;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const clear=(x:number,y:number,r:number)=>campContains(layout,x,y,r)&&!riverWaterBlocked(x,y,r)&&!layoutBlocked(layout,x,y,r);
 const tryPlant=(kind:0|1,x:number,y:number)=>{
  const art=FORAGE_ART[kind],r=kind?42:24;
  if(!clear(x,y,r)||additions.some(p=>Math.hypot(p.x-x,p.y-y)<(kind||p.assetId===FORAGE_ART[1].id?210:120)))return false;
  const nearby=visiblePlacements(layout,{x:x-300,y:y-350,width:600,height:650});
  if(nearby.some(p=>{const a=ASSET_BY_ID.get(p.assetId);if(!a||!p.solid||a.foliage||a.puddle||a.groundDetail||a.perimeter||a.group==='Perimeter walls')return false;const b=placementBounds(p);return x>b.x-50&&x<b.x+b.width+50&&y>b.y-25&&y<b.y+b.height+70}))return false;
  let approaches=0;for(let i=0;i<8;i++){const a=i*Math.PI/4;if(clear(x+Math.cos(a)*82,y+Math.sin(a)*82,19))approaches++}if(approaches<5)return false;
  additions.push({id:`forage-v1-${kind?'apple':'berry'}-${additions.length}`,assetId:art.id,x,y,scale:.88+random()*.24,flipX:random()>.5,solid:!!kind,roof:'auto',role:'prop'});return true;
 };
 // Discoverable patches near the camp fringes, with fruit trees just beyond them.
 const centres=[{x:layout.spawn.x-350,y:layout.spawn.y+180},{x:650,y:2050},{x:3200,y:2200},{x:1900,y:3400},{x:-450,y:1300},{x:4100,y:1400}];
 for(const [index,c]of centres.entries()){
  const kind=index%3===2?1:0,before=additions.length,wanted=kind?2:4;
  for(let i=0;i<90&&additions.length-before<wanted;i++){
   const a=random()*Math.PI*2,r=90+random()*380;tryPlant(kind,c.x+Math.cos(a)*r,c.y+Math.sin(a)*r);
  }
 }
 // Small groves throughout the connected world, away from water, walls and buildings.
 for(const kind of [0,1] as const){
  const target=kind?18:48;
  for(let grove=0;grove<180&&additions.filter(p=>p.assetId===FORAGE_ART[kind].id).length<target;grove++){
   const cx=bounds.left+random()*bounds.width,cy=bounds.top+random()*bounds.height;
   for(let i=0;i<(kind?3:4)&&additions.filter(p=>p.assetId===FORAGE_ART[kind].id).length<target;i++){
    const a=random()*Math.PI*2,r=random()*310;tryPlant(kind,cx+Math.cos(a)*r,cy+Math.sin(a)*r);
   }
  }
 }
 if(layout.items.length+additions.length>MAX_LAYOUT_ITEMS)return layout;
 return{...layout,forageVersion:1,items:[...layout.items,...additions],updatedAt:new Date().toISOString()};
}
