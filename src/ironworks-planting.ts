import {FURNACE_ID,IRON_BOULDER_ID} from './ironworks-data';
import {MINEABLE_ROCKS} from './mining-rocks';
import {usesPaintedHomeTerrain} from './terrain-art';
import {campContains} from './world-bounds';
import {riverWaterBlocked} from './river-collision';
import {layoutBlocked,placementBounds,type WorldLayout,type Placement} from './world-layout';
import {MAX_LAYOUT_ITEMS} from './layout-limits';

/** Editable one-time additions on both platforms. A removed furnace or deposit never respawns as a placement. */
export function addCampIronworks(layout:WorldLayout):WorldLayout{
 if(layout.ironworksVersion||!layout.forageVersion||!usesPaintedHomeTerrain(layout.terrainImage))return layout;
 const additions:Placement[]=[],clear=(x:number,y:number,r:number)=>campContains(layout,x,y,r)&&!riverWaterBlocked(x,y,r)&&!layoutBlocked(layout,x,y,r);
 const workshop=layout.items.find(p=>p.assetId==='base_workshop_t1'),centre=workshop??layout.spawn;
 if(!layout.items.some(p=>p.assetId===FURNACE_ID)){
  const candidates:{x:number;y:number;score:number}[]=[];
  for(const radius of [250,330,420,540,680])for(let i=0;i<32;i++){const a=i*Math.PI/16,x=centre.x+Math.cos(a)*radius,y=centre.y+Math.sin(a)*radius;candidates.push({x,y,score:Math.hypot(x-(centre.x+260),y-(centre.y+140))})}
  const at=candidates.sort((a,b)=>a.score-b.score).find(p=>clear(p.x,p.y-25,115)&&clear(p.x,p.y+100,40)&&!layout.items.some(q=>{if(!q.solid)return false;const b=placementBounds(q);return p.x>b.x-90&&p.x<b.x+b.width+90&&p.y>b.y-30&&p.y<b.y+b.height+50}));
  if(at)additions.push({id:'ironworks-v1-camp-furnace',assetId:FURNACE_ID,x:at.x,y:at.y,scale:1,solid:true,roof:'auto',role:'prop',locked:true});
 }
 const sources=layout.items.filter(p=>MINEABLE_ROCKS.has(p.assetId)&&p.assetId!==IRON_BOULDER_ID).sort((a,b)=>a.id.localeCompare(b.id));
 for(const source of sources){
  if(additions.filter(p=>p.assetId===IRON_BOULDER_ID).length>=10)break;
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6,x=source.x+Math.cos(a)*250,y=source.y+Math.sin(a)*250;
   if(Math.hypot(x-layout.spawn.x,y-layout.spawn.y)<1500||!clear(x,y,100)||additions.some(p=>Math.hypot(p.x-x,p.y-y)<1050))continue;
   let approaches=0;for(let j=0;j<8;j++)if(clear(x+Math.cos(j*Math.PI/4)*165,y+Math.sin(j*Math.PI/4)*165,22))approaches++;if(approaches<4)continue;
   additions.push({id:`ironworks-v1-vein-${additions.filter(p=>p.assetId===IRON_BOULDER_ID).length+1}`,assetId:IRON_BOULDER_ID,x,y,scale:1,solid:true,roof:'auto',role:'prop'});break;
  }
 }
 if(!additions.some(p=>p.assetId===FURNACE_ID)&&!layout.items.some(p=>p.assetId===FURNACE_ID)||layout.items.length+additions.length>MAX_LAYOUT_ITEMS)return layout;
 return{...layout,ironworksVersion:1,items:[...layout.items,...additions],updatedAt:new Date().toISOString()};
}
