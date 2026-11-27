import {IRON_MINE_ENTRANCE_ID} from './iron-mine-entrance';
import {NORTHWEST_IRON_MINE} from './iron-mine-placement';
import {campLootChest} from './loot-chest';
import {PATCH_ROUTE_ART,PATCH_SCENERY_FRAMES,type PatchRouteKind} from './patch-art';
import {patchRouteSite} from './patch-placement';
import type {Vec,World} from './survival-engine';
import {placementArtPoint,placementBounds,type Placement,type WorldLayout} from './world-layout';

export {PATCH_SCENERY_FRAMES,PATCH_SCENERY_IMAGE} from './patch-art';

type SceneryName=keyof typeof PATCH_SCENERY_FRAMES;
type Viewport=Vec&{width:number;height:number};
export type PatchScenerySprite=Vec&{
 crop:readonly [number,number,number,number];width:number;height:number;angle:number;
 flipX:boolean;flipY:boolean;alpha:number;ground:boolean;sortY?:number;
};

/** Standing point at the blanket edge, independent of the scripted actor position. */
export function patchCotPosition(layout?:WorldLayout){
 const shelter=patchRouteSite(layout,'shelter')?.placement;
 return shelter?placementArtPoint(shelter,.60,1.01):undefined;
}

const mineCache=new WeakMap<WorldLayout,{items:Placement[];length:number;index:number}>();
function refuge(layout:WorldLayout){
 let cached=mineCache.get(layout);
 if(!cached||cached.items!==layout.items||cached.length!==layout.items.length||
    cached.index>=0&&layout.items[cached.index]?.id!==NORTHWEST_IRON_MINE){
  cached={items:layout.items,length:layout.items.length,index:layout.items.findIndex(p=>p.id===NORTHWEST_IRON_MINE)};
  mineCache.set(layout,cached);
 }
 const p=layout.items[cached.index];
 return p?.assetId===IRON_MINE_ENTRANCE_ID?p:undefined;
}
const nearView=(p:Vec,v:Viewport,pad:number)=>p.x>=v.x-pad&&p.x<=v.x+v.width+pad&&p.y>=v.y-pad&&p.y<=v.y+v.height+pad;

/** Scenery follows each authored placement's transform. It never modifies a layout or run. */
export function patchScenerySprites(world:World,view:Viewport):PatchScenerySprite[]{
 const sprites:PatchScenerySprite[]=[];
 if(world.scene||!world.layout)return sprites;
 const layout=world.layout;
 function atSite(p:Placement,kind:PatchRouteKind){
  const nominal=PATCH_ROUTE_ART[kind].width,bounds=placementBounds(p);
  const sx=bounds.width/nominal,sy=bounds.height/(nominal*.75),rotation=(p.rotation??0)*Math.PI/180;
  return (name:SceneryName,dx:number,dy:number,width:number,height:number,options:{
   ground?:boolean;alpha?:number;angle?:number;flip?:boolean;inFront?:boolean;underTracks?:boolean;
  }={})=>{
   const point=placementArtPoint(p,.5+dx/nominal,.88+dy/(nominal*.75));
   const flipX=!!p.flipX!==!!options.flip,flipY=!!p.flipY;
   sprites.push({...point,crop:PATCH_SCENERY_FRAMES[name],width:width*sx,height:height*sy,
    angle:rotation+(!!p.flipX!==!!p.flipY?-1:1)*(options.angle??0),flipX,flipY,
    ground:!!options.ground,alpha:options.alpha??1,
    ...(options.underTracks?{sortY:-Infinity}:options.inFront?{sortY:Math.max(p.y+.8,point.y)}:{})});
  };
 }
 const shelter=patchRouteSite(layout,'shelter')?.placement;
 if(shelter&&nearView(shelter,view,535*shelter.scale)){
  const add=atSite(shelter,'shelter');
  // A worn link back to the shed and a wider patch of soft earth on the
  // approach. Paint these beneath the registered impressions on both renderers.
  add('path',-47,-136,191,62,{angle:1.48,ground:true,underTracks:true,alpha:.47});
  add('path',139,129,281,99,{flip:true,ground:true,underTracks:true,alpha:.97});
  add('fern',-158,36,105,65);
  add('fern',-195,-197,126,75,{flip:true});
  add('fern',-116,-158,65,43);
  // The original woodland birch and hollow trunk frame the clearing. Their
  // feet stay on the bank and out of the first meeting's playable approach.
  add('birch',259,-119,225,262);
  add('log',-215,-74,96,48,{angle:-.18});
  add('reeds',185,-91,87,87);
  add('reeds',231,-67,49,55,{flip:true});
  add('reeds',382,263,112,98,{flip:true});
  add('reeds',437,242,61,62);
  // Dry canvas and folded bedding are part of the original painting. Put
  // runoff underneath the outboard pail and leave the cot surface readable.
  add('puddle',139,-15,67,19,{ground:true,alpha:.91});
  add('hoist',128,-19,70,106);
  if(!world.patchQuest?.scannerLoaned)add('scanner',24,-21,26,23,{inFront:true});
  // One weight-bearing foot, one rake. Spacing tightens as the knee gives way.
  for(const [x,y,angle] of [[84,62,.45],[122,77,.38],[174,96,.31]]){
   add('tread',x,y,30,16,{angle,ground:true,alpha:.90});
   add('scrape',x+4,y+13,37,12,{angle:angle-.06,ground:true,alpha:.83});
  }
 }
 const post=patchRouteSite(layout,'dispatch')?.placement;
 if(post&&nearView(post,view,240*post.scale)&&!world.patchQuest?.dispatchRead&&!world.patchQuest?.servoClaimed&&world.patchQuest?.footprintsFound===3){
  atSite(post,'dispatch')('gear',75,41,52,49,{inFront:true});
 }
 const hauler=patchRouteSite(layout,'hauler')?.placement;
 if(hauler&&nearView(hauler,view,420*hauler.scale)){
  const add=atSite(hauler,'hauler'),released=!!world.patchQuest?.dispatchRead&&!!world.patchQuest.servoClaimed;
  add('gantry',-151,-46,338,270);
  add('sled',-229,46,143,68);
  // The forward lamp and panel are baked into the vehicle painting. The eye
  // of the painted cable runs from the empty stretcher to that existing drum.
  add(released?'slack':'taut',-81,-16,214,released?34:13,{angle:-.69,inFront:true});
  add(released?'socket':'gear',-46,-11,released?29:35,released?29:34,{inFront:true});
  add('brake',-120,54,39,29);
  add('crawler',-100,26,62,24,{ground:true,angle:.18,alpha:.74});
  add('ropeDrag',-170,42,61,10,{ground:true,angle:.12,alpha:.74});
  const mine=refuge(layout);
  if(mine){
   const sign=placementArtPoint(hauler,.5-294/PATCH_ROUTE_ART.hauler.width,.88-49/(PATCH_ROUTE_ART.hauler.width*.75));
   // Face the actual mine if an editor moves or mirrors the cable works.
   const pointRight=(mine.x-sign.x)*Math.cos((hauler.rotation??0)*Math.PI/180)+
    (mine.y-sign.y)*Math.sin((hauler.rotation??0)*Math.PI/180)>0;
   add('sign',-294,-49,58,88,{flip:pointRight!==!!hauler.flipX});
  }
  // A few older pad marks on the outer approach leave the inspection lee clear.
  for(const [x,y] of [[151,122],[167,110],[177,91]])add('paw',x,y,14,11,{ground:true,angle:-.90,alpha:.74});
 }
 if(world.patchQuest?.suppliesDelivered){
  const chest=campLootChest(world);
  if(chest&&nearView(chest,view,230)){
   // Two even sets converge at the original parcel. Human boot and machine
   // sole keep distinct gauges, stagger and lengths even at phone zoom.
   for(let i=0;i<4;i++){
    const stagger=i%2?4:-4,x=chest.x-127+i*30,y=chest.y+96-i*19;
    for(const [name,dx,dy,width,height] of [['human',-12,-9,18,10],['tread',10,5,27,15]] as const){
     sprites.push({x:x+dx+stagger,y:y+dy+stagger*.5,crop:PATCH_SCENERY_FRAMES[name],
      width,height,angle:-.57,flipX:false,flipY:false,ground:true,alpha:.90});
    }
   }
  }
 }
 return sprites;
}
