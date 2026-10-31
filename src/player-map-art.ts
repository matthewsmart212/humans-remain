import atlas from './player-map-art.json';
import {placementBounds,placementPoint,type Placement} from './world-layout';
import type {WorldAsset} from './world-assets';

export const PLAYER_MAP_ART_URL='/maps/camp-atlas-v2.webp';
// Exact pixels from the stats bar portrait, with the map's circular brass rim.
export const PLAYER_MAP_PORTRAIT_URL='/maps/survivor-map-portrait-v2.webp';
// Portrait stays upright; only this north-facing pointer follows heading.
// Its 31px reach fits inside playerMapView's 32px boundary inset.
export const PLAYER_MAP_MARKER={size:44,pointer:'M-8 -18L0 -31L8 -18Z'};
const symbolLayout:Partial<Record<MapArtKind,{scale:number;dx:number;dy:number}>>={
 headquarters:{scale:.68,dx:-70,dy:70},well:{scale:.58,dx:-22,dy:-87},
 'medical-tent':{scale:.65,dx:-143,dy:0},warehouse:{scale:.65,dx:-35,dy:0},
 bunker:{scale:.6,dx:23,dy:-30},
};
export type MapArtKind=keyof typeof atlas.sprites;
export type MapIllustration={id:string;kind:MapArtKind;x:number;y:number;width:number;height:number;rotation:number;flipX:boolean;flipY:boolean;source:{x:number;y:number;width:number;height:number}};

/** The overview always retains one readable camp symbol. Other artwork uses world scale. */
export const mapArtDisplayFactor=(item:MapIllustration,scale:number)=>item.kind==='camp'?Math.max(1,28/(item.width*scale)):1;

/** Authored illustration spines in the original wall artwork's frame.
 * They locate a slim drawn palisade, not a filled gameplay collision hull.
 * Keeping each section independent preserves the camp's road openings. */
const WALL_LINES:Record<string,readonly (readonly [number,number])[]>={
 'Base wall 8':[[.10,.39],[.30,.33],[.55,.27],[.78,.23],[.95,.21]],
 'Base wall 2':[[.72,.22],[.75,.40],[.80,.58],[.84,.75],[.86,.91]],
 'Base wall 3':[[.91,.26],[.89,.45],[.80,.64],[.66,.81],[.52,.90]],
 'Base wall 4':[[.08,.91],[.30,.88],[.54,.78],[.76,.62]],
 'Base wall 5':[[.22,.74],[.40,.81],[.65,.89],[.88,.90]],
 'Base wall 6':[[.11,.13],[.16,.34],[.24,.50],[.36,.64],[.55,.77]],
 'Base wall 7':[[.44,.22],[.36,.42],[.28,.63],[.19,.91]],
};

export function mapBuildingArt(p:Placement,kind:MapArtKind):MapIllustration{
 const b=placementBounds(p),source=atlas.sprites[kind];
 const adjustment=symbolLayout[kind];
 const width=(kind==='camp'?Math.max(240,b.width*.8):b.width*(kind==='headquarters'?.84:kind==='storage'?.64:.88))*(adjustment?.scale??1);
 const height=width*source.height/source.width;
 const [x,y]=kind==='camp'?placementPoint(p,p.x,p.y):placementPoint(p,b.x+b.width*.5,b.y+b.height*.53);
 const angle=(p.rotation||0)*Math.PI/180,dx=(adjustment?.dx??0)*(p.flipX?-1:1),dy=(adjustment?.dy??0)*(p.flipY?-1:1);
 return{id:p.id,kind,x:x+dx*Math.cos(angle)-dy*Math.sin(angle),y:y+dx*Math.sin(angle)+dy*Math.cos(angle),width,height,rotation:angle,flipX:!!p.flipX,flipY:!!p.flipY,source};
}

function wallSpine(p:Placement,a:WorldAsset){
 if(a.perimeterCurve?.length)return a.perimeterCurve.map(([x,y])=>{const point=placementPoint(p,p.x+x*p.scale,p.y+y*p.scale);return{x:point[0],y:point[1]}});
 const b=placementBounds(p);
 const spine=WALL_LINES[a.name];
 // New unregistered walls get a narrow fence along their visual base, never
 // the former large rectangular stand-in (even for non-solid decorations).
 const local=spine??[[.1,.8],[.9,.8]];
 return local.map(([u,v])=>{const [x,y]=placementPoint(p,b.x+u*b.width,b.y+v*b.height);return{x,y}});
}

export function mapWallsArt(walls:{p:Placement;a:WorldAsset}[]):MapIllustration[]{
 const runs=walls.map(({p,a})=>({p,a,points:wallSpine(p,a)}));
 const ends=runs.flatMap(run=>[0,run.points.length-1].map(i=>({run,i,used:false})));
 const joins=ends.flatMap((a,i)=>ends.slice(i+1).filter(b=>a.run!==b.run&&WALL_LINES[a.run.a.name]&&WALL_LINES[b.run.a.name]).map(b=>({a,b,d:Math.hypot(a.run.points[a.i].x-b.run.points[b.i].x,a.run.points[a.i].y-b.run.points[b.i].y)}))).filter(j=>j.d<120).sort((a,b)=>a.d-b.d);
 // Join only small seams between neighbouring artwork frames. The much wider
 // gaps at camp roads remain open; gameplay collisions are never consulted.
 for(const {a,b}of joins){if(a.used||b.used)continue;const p=a.run.points[a.i],q=b.run.points[b.i],join={x:(p.x+q.x)/2,y:(p.y+q.y)/2};a.run.points[a.i]=join;b.run.points[b.i]=join;a.used=b.used=true}
 return runs.flatMap(({p,points})=>wallTiles(p,points));
}

function wallTiles(p:Placement,points:{x:number;y:number}[]):MapIllustration[]{
 const source=atlas.sprites.palisade;
 const lengths=[0];
 for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
 const length=lengths[lengths.length-1],count=Math.max(1,Math.ceil(length/320));
 const at=(distance:number)=>{
  let i=1;while(i<lengths.length-1&&lengths[i]<distance)i++;
  const a=points[i-1],b=points[i],t=(distance-lengths[i-1])/(lengths[i]-lengths[i-1]||1);
  return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
 };
 const result:MapIllustration[]=[];
 for(let i=0;i<count;i++){
  const a=at(length*i/count),b=at(length*(i+1)/count),width=Math.hypot(b.x-a.x,b.y-a.y)+12;
  result.push({id:p.id+':fence:'+i,kind:'palisade',x:(a.x+b.x)/2,y:(a.y+b.y)/2,width,height:width*source.height/source.width,rotation:Math.atan2(b.y-a.y,b.x-a.x),flipX:false,flipY:false,source});
 }
 return result;
}
