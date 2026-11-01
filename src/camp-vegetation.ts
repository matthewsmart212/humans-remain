import {ASSET_BY_ID,type WorldAsset} from './world-assets';
import {placementBounds,placementPoint,type Placement,type WorldLayout} from './world-layout';
import {usesPaintedHomeTerrain} from './terrain-art';
import {isFoliageAsset} from './foliage-display';
import plan from './camp-circular-wall-layout.json';
import treeArt from './tree-art.json';

export const CAMP_VEGETATION_VERSION=1;
export const OUTDOOR_FOLIAGE_REDUCTION=.3;
export const CAMP_VEGETATION_WALL_GAP=18;
const TREE_ART=new Map(treeArt.map(a=>[a.id,a]));
type Point=[number,number];
type Shape={points:Point[];left:number;top:number;right:number;bottom:number};
type Wall={id:string;shapes:Shape[];bounds:Shape};

/** Conservative alpha envelopes of the shipped wall sprites: 24 equal-width
 * columns, with [top,bottom] in thousandths of image height. Every nonzero
 * alpha pixel is included, including moss/shadows; transparent corners are
 * excluded. The check script verifies these against the actual artwork. No
 * image decoding or pixel reads run on iOS or in the simulation/render loop. */
export const CAMP_WALL_ALPHA_STRIPS:Record<string,([number,number]|null)[]>={
 "camp_circular_wall_01":[[31,813],[21,625],[63,979],[63,630],[111,641],[111,979],[122,657],[90,662],[60,683],[90,756],[141,919],[156,715],[168,743],[173,963],[191,775],[173,798],[179,832],[264,857],[99,880],[303,910],[328,938],[44,977],[47,979],[409,919]],
 "camp_circular_wall_02_ne_v2":[[44,358],[22,398],[20,975],[61,437],[77,461],[124,485],[145,507],[164,543],[166,560],[165,590],[227,759],[250,645],[264,680],[303,707],[321,739],[330,777],[362,813],[435,852],[463,893],[501,932],[117,974],[572,980],[386,980],[597,960]],
 "camp_circular_wall_03_ne_v2":[null,[70,484],[46,512],[33,535],[26,579],[26,611],[26,640],[48,683],[135,717],[182,764],[214,798],[253,855],[257,881],[269,922],[302,963],[368,974],[400,974],[441,971],[472,968],[488,951],[535,944],[583,944],[793,928],null],
 "camp_circular_wall_04":[[46,293],[33,321],[25,340],[18,372],[9,406],[9,441],[14,478],[21,535],[36,585],[120,651],[148,701],[180,783],[215,868],[250,986],[261,991],[278,991],[386,991],[416,991],[474,991],[499,991],[521,991],[542,991],[755,991],[848,984]],
 "camp_circular_wall_05":[[893,961],[256,973],[740,978],[716,982],[712,985],[675,989],[660,991],[641,991],[614,991],[561,966],[507,951],[482,920],[443,894],[422,942],[220,940],[187,925],[33,925],[19,925],[14,705],[8,664],[8,621],[25,577],[41,519],[223,412]],
 "camp_circular_wall_06":[[674,944],[632,951],[628,967],[630,980],[612,980],[572,967],[552,965],[515,926],[495,903],[456,882],[418,838],[354,817],[311,779],[304,747],[279,710],[243,965],[157,955],[84,809],[25,811],[20,707],[20,486],[33,441],[37,404],[122,348]],
 "camp_circular_wall_07":[[585,899],[524,975],[59,975],[503,967],[489,950],[79,936],[451,926],[437,899],[28,873],[322,855],[318,829],[324,807],[302,782],[284,759],[262,734],[238,936],[167,851],[114,658],[114,894],[61,868],[25,715],[25,877],[37,949],[66,469]],
 "camp_circular_wall_08":[[70,947],[385,966],[398,966],[131,966],[138,966],[421,966],[337,958],[337,947],[73,942],[357,941],[352,927],[339,911],[328,908],[250,886],[220,874],[236,857],[272,838],[217,821],[172,797],[148,773],[101,749],[34,733],[34,697],[70,639]],
 "camp_circular_wall_09":[[133,631],[45,658],[36,680],[68,707],[102,728],[104,749],[146,774],[171,789],[196,814],[211,831],[169,842],[150,858],[173,880],[243,886],[251,905],[272,917],[291,924],[318,941],[329,951],[339,955],[316,962],[283,962],[285,934],[339,919]],
 "camp_circular_wall_10":[[116,503],[59,807],[32,602],[28,895],[56,658],[126,687],[160,719],[190,737],[224,761],[245,779],[239,807],[227,823],[261,841],[328,873],[364,883],[383,902],[369,922],[400,938],[410,959],[430,971],[450,971],[430,965],[437,959],[168,878]],
 "camp_circular_wall_11":[[85,340],[36,888],[18,431],[18,856],[18,831],[95,858],[168,597],[206,633],[254,674],[258,959],[287,740],[342,779],[390,815],[434,839],[465,865],[491,893],[196,920],[21,946],[21,972],[610,977],[101,982],[149,982],[149,967],[42,948]],
 "camp_circular_wall_12":[null,null,[183,512],[50,592],[33,648],[29,716],[23,761],[23,809],[60,840],[69,894],[215,926],[305,942],[339,966],[498,967],[522,970],[573,977],[601,977],[610,975],[610,970],[615,967],[647,960],[699,916],null,null],
 "camp_circular_wall_13":[[826,962],[671,990],[603,990],[20,990],[18,990],[424,990],[273,990],[251,990],[246,990],[219,969],[211,941],[166,752],[138,677],[110,969],[57,587],[36,523],[16,483],[10,985],[10,692],[16,369],[20,666],[37,666],[85,806],[186,803]],
 "camp_circular_wall_14":[[747,956],[714,967],[288,981],[285,982],[579,982],[232,958],[220,925],[433,873],[420,824],[164,783],[340,945],[301,945],[248,942],[202,905],[161,803],[151,819],[137,762],[113,741],[51,647],[18,869],[18,932],[27,821],[47,693],[111,323]],
 "camp_circular_wall_15":[[526,914],[474,950],[453,971],[455,969],[430,965],[413,935],[372,902],[343,873],[306,838],[270,809],[197,780],[162,755],[154,724],[157,968],[162,945],[145,649],[119,628],[96,965],[84,713],[63,945],[29,954],[29,526],[52,954],[159,493]],
 "camp_circular_wall_16":[[366,954],[337,978],[361,978],[344,967],[307,932],[275,904],[246,880],[187,854],[148,845],[174,817],[190,789],[162,769],[127,752],[105,926],[77,721],[22,713],[22,847],[70,845],[94,676],[81,660],[68,838],[53,636],[35,630],[37,619]],
 "camp_circular_wall_02":[[90,470],[32,718],[27,531],[27,547],[65,566],[104,592],[145,605],[170,636],[186,658],[27,674],[223,699],[214,724],[211,750],[255,777],[55,817],[55,834],[360,874],[379,900],[406,936],[223,971],[450,971],[186,971],[473,971],[536,928]],
 "camp_circular_wall_03":[[56,312],[32,368],[19,387],[18,966],[18,444],[50,478],[126,514],[153,539],[178,573],[180,609],[197,649],[259,682],[293,721],[22,757],[351,814],[393,850],[423,909],[442,959],[527,982],[562,982],[617,978],[660,965],[724,959],[862,947]],
};

function shape(points:Point[]):Shape{
 return {points,left:Math.min(...points.map(p=>p[0])),top:Math.min(...points.map(p=>p[1])),right:Math.max(...points.map(p=>p[0])),bottom:Math.max(...points.map(p=>p[1]))};
}
function rectangle(p:Placement,left:number,top:number,right:number,bottom:number){
 return shape([[left,top],[right,top],[right,bottom],[left,bottom]].map(([x,y])=>placementPoint(p,x,y)));
}
const boundsOverlap=(a:Shape,b:Shape)=>a.left<=b.right&&a.right>=b.left&&a.top<=b.bottom&&a.bottom>=b.top;
/** SAT for the transformed sprite rectangles, preceded by a cheap AABB test. */
function overlaps(a:Shape,b:Shape){
 if(!boundsOverlap(a,b))return false;
 for(const points of [a.points,b.points])for(let i=0;i<points.length;i++){
  const p=points[i],q=points[(i+1)%points.length],nx=p[1]-q[1],ny=q[0]-p[0];
  const aa=a.points.map(v=>v[0]*nx+v[1]*ny),bb=b.points.map(v=>v[0]*nx+v[1]*ny);
  if(Math.max(...aa)<Math.min(...bb)||Math.max(...bb)<Math.min(...aa))return false;
 }
 return true;
}
function wallShape(p:Placement):Wall{
 const b=placementBounds(p),strips=CAMP_WALL_ALPHA_STRIPS[p.assetId];
 // Unrecognised/owner-imported wall artwork falls back to its full sprite.
 const shapes=strips?strips.flatMap((range,i)=>range?[rectangle(p,b.x+i*b.width/strips.length,b.y+range[0]*b.height/1000,b.x+(i+1)*b.width/strips.length,b.y+range[1]*b.height/1000)]:[]):[rectangle(p,b.x,b.y,b.x+b.width,b.y+b.height)];
 return {id:p.id,shapes,bounds:shape(shapes.flatMap(s=>s.points))};
}
function vegetationShape(p:Placement,a:WorldAsset){
 const b=placementBounds(p);let left=b.x,top=b.y,right=b.x+b.width,bottom=b.y+b.height;
 const tree=TREE_ART.get(p.assetId);
 if(tree){
  // Chopping uses registered atlas frames, not just the placement's frame.
  const k=b.width/tree.frames[0].crop[2];
  for(const f of tree.frames){
   left=Math.min(left,p.x-f.anchor[0]*k);top=Math.min(top,p.y-f.anchor[1]*k);
   right=Math.max(right,p.x+(f.crop[2]-f.anchor[0])*k);bottom=Math.max(bottom,p.y+(f.crop[3]-f.anchor[1])*k);
  }
 }
 let padX=CAMP_VEGETATION_WALL_GAP,padY=padX;
 if(a.foliage&&!p.assetId.startsWith('art_forage_')){
  // Contact motion clamps both world components to [-1,1]. A rotated sprite
  // can receive sqrt(2) in local axes; cover its mesh's full bending range.
  padX+=b.width*.22*Math.SQRT2;padY+=b.height*(.17+.045)*Math.SQRT2;
 }else{
  // Standing tree hit sway and berry/apple gathering rotate around the root.
  // The brief falling-tree effect is intentionally not a standing footprint.
  const radius=Math.max(...[[left,top],[right,top],[right,bottom],[left,bottom]].map(([x,y])=>Math.hypot(x-p.x,y-p.y)));
  const sway=radius*(p.assetId.startsWith('art_forage_')?.048:.025);
  padX+=sway;padY+=sway;
 }
 return rectangle(p,left-padX,top-padY,right+padX,bottom+padY);
}
function campContext(layout:WorldLayout){
 if(layout.terrain!=='home'||!usesPaintedHomeTerrain(layout.terrainImage))return;
 const hearth=layout.items.find(p=>p.id===plan.hearthPlacementId&&p.role==='hearth');
 if(!hearth)return;
 const walls=layout.items.filter(p=>!!ASSET_BY_ID.get(p.assetId)?.perimeter).map(wallShape);
 if(!walls.length)return;
 return {hearth,walls};
}
const decorative=(a:WorldAsset)=>!!a.foliage&&!a.id.startsWith('art_forage_');
const outside=(p:Placement,hearth:Placement)=>Math.hypot(p.x-hearth.x,p.y-hearth.y)>plan.radius;
export type CampVegetationDiagnostics={
 eligible:boolean;wallCount:number;outdoorFoliage:number;interiorFoliage:number;trees:number;forage:number;
 targetOutdoorRemovals:number;wallOverlapIds:string[];outdoorWallFoliageIds:string[];
 interiorWallFoliageIds:string[];wallTreeIds:string[];wallForageIds:string[];
};
function analyse(layout:WorldLayout){
 const context=campContext(layout),candidates:Placement[]=[];
 const result:CampVegetationDiagnostics={eligible:!!context,wallCount:context?.walls.length??0,outdoorFoliage:0,interiorFoliage:0,trees:0,forage:0,targetOutdoorRemovals:0,wallOverlapIds:[],outdoorWallFoliageIds:[],interiorWallFoliageIds:[],wallTreeIds:[],wallForageIds:[]};
 if(!context)return {result,candidates};
 for(const p of layout.items){
  const a=ASSET_BY_ID.get(p.assetId);if(!a||!isFoliageAsset(a))continue;
  const decor=decorative(a),out=outside(p,context.hearth),forage=p.assetId.startsWith('art_forage_');
  if(decor){if(out){result.outdoorFoliage++;candidates.push(p)}else result.interiorFoliage++}
  else if(forage)result.forage++;else result.trees++;
  const plant=vegetationShape(p,a);
  if(!context.walls.some(w=>boundsOverlap(plant,w.bounds)&&w.shapes.some(s=>overlaps(plant,s))))continue;
  result.wallOverlapIds.push(p.id);
  if(decor)(out?result.outdoorWallFoliageIds:result.interiorWallFoliageIds).push(p.id);
  else if(forage)result.wallForageIds.push(p.id);else result.wallTreeIds.push(p.id);
 }
 result.targetOutdoorRemovals=Math.round(result.outdoorFoliage*OUTDOOR_FOLIAGE_REDUCTION);
 return {result,candidates};
}
/** Explicit audit only; this scan is never registered as a per-frame hook. */
export function campVegetationDiagnostics(layout:WorldLayout){return analyse(layout).result}
function rank(id:string){let hash=2166136261;for(const c of 'camp-vegetation-v1:'+id){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619)}return hash>>>0}

/** One-time authored-camp refinement shared by native startup and saved runs.
 * Keep original objects/IDs and all nonvegetation state. Wall removals count
 * towards the outdoor 30%, rather than performing two independent thinnings.
 * Food plants and trees participate only in the required wall clearance. */
export function refineCampVegetation(layout:WorldLayout):WorldLayout{
 if((layout.campVegetationVersion??0)>=CAMP_VEGETATION_VERSION)return layout;
 const {result,candidates}=analyse(layout);if(!result.eligible)return layout;
 const removed=new Set(result.wallOverlapIds);
 const remaining=Math.max(0,result.targetOutdoorRemovals-result.outdoorWallFoliageIds.length);
 candidates.filter(p=>!removed.has(p.id)).sort((a,b)=>rank(a.id)-rank(b.id)||(a.id<b.id?-1:a.id>b.id?1:0)).slice(0,remaining).forEach(p=>removed.add(p.id));
 return {...layout,campVegetationVersion:CAMP_VEGETATION_VERSION,items:layout.items.filter(p=>!removed.has(p.id)),updatedAt:new Date().toISOString()};
}
