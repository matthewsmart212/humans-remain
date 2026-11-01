import {FilterMode,MipmapMode,PaintStyle} from '@shopify/react-native-skia/lib/module/skia/types';
import type {SkCanvas,SkImage,SkPaint,SkPath,SkPathBuilder,SkPicture,SkSurface,Skia as SkiaApi} from '@shopify/react-native-skia';
import type {PlayerMapPath,PlayerMapView} from '../src/player-map';
import type {GamePerformanceRecorder} from '../src/performance-recording';
import type {WorldBounds} from '../src/world-bounds';
import type {NativeFrameWorkHint,NativeWorkPriority} from './frame-work-scheduler';

/** iOS Skia draws without MSAA, so anti-aliased paths are filled through CPU
 * coverage masks. Drawing the engraved batches directly re-rasterized ~8k
 * subpaths on every frame the map moved; tiles rasterize each region once at
 * a fixed density and pinching only resamples textures. */
export const MAP_TILE_SIZE=512;
/** The finest level kept for a view holds at least this many texels per device pixel. */
export const MAP_TILE_MIN_TEXELS=.75;
/** Skia's CPU anti-aliasing misjudges coverage a few texels inside a clip
 * edge, and along rows where it culls subpaths beyond the right edge. Tiles
 * draw only the subpaths reaching them, with this margin, and keep the inside. */
const PAD=32;
/** Subpaths parsed or appended per unit of work. */
const CHUNK=96;
const MAX_LEVEL=10,CELL=1024,LEVEL_KEY=1<<20,ROW_KEY=1<<10;

type Api=Pick<typeof SkiaApi,'Surface'|'Paint'|'Path'|'PathBuilder'|'Color'|'PictureRecorder'>;
type Rect={x:number;y:number;width:number;height:number};
type Box={l:number;t:number;r:number;b:number};
type Range={i0:number;i1:number;j0:number;j1:number};
/** `boxes` holds each subpath's ink bounds; small subpaths are indexed by the
 * cell holding their centre. A subpath is parsed the first time it is drawn. */
type Batch={item:PlayerMapPath;parts:readonly string[];boxes:Float64Array;cells:Map<number,number[]>;large:number[];paths:(SkPath|null|undefined)[];fill?:Float32Array;stroke?:Float32Array;strokeWidth:number};
type Tile={key:number;level:number;i:number;j:number;image:SkImage|null;used:number};
type Job={tile:Tile;surface:SkSurface;canvas:SkCanvas;region:Box;batch:number;list?:number[];next:number;added:number;started:number;drawn:number};
export type MapTileDraw={level:number;i:number;j:number;src:Rect;dst:Rect};

export function createMapTiles(Skia:Api,paths:readonly PlayerMapPath[],area:WorldBounds,diagnostics?:GamePerformanceRecorder){
 const extent=Math.max(area.width,area.height,1),base=MAP_TILE_SIZE/extent;
 const cols=Math.max(1,Math.ceil(area.width/CELL)),rows=Math.max(1,Math.ceil(area.height/CELL));
 const cellOf=(value:number,start:number,count:number)=>Math.max(0,Math.min(count-1,Math.floor((value-start)/CELL)));
 const batches:Batch[]=paths.map(item=>{
  const strokeWidth=item.stroke&&item.strokeWidth?item.strokeWidth:0,cells=new Map<number,number[]>(),large:number[]=[];
  const bounds=item.parts&&item.bounds?.length===item.parts.length*4?item.bounds:undefined,parts=bounds?item.parts!:[item.path];
  // Miter joins reach twice the stroke width at Skia's default limit of 4.
  const margin=strokeWidth*2+.01,boxes=new Float64Array(parts.length*4);
  for(let k=0;k<parts.length;k++){
   const l=bounds?bounds[k*4]-margin:-Infinity,t=bounds?bounds[k*4+1]-margin:-Infinity,r=bounds?bounds[k*4+2]+margin:Infinity,b=bounds?bounds[k*4+3]+margin:Infinity;
   boxes[k*4]=l;boxes[k*4+1]=t;boxes[k*4+2]=r;boxes[k*4+3]=b;
   if(!(l<=r&&t<=b))continue;
   if(r-l>CELL||b-t>CELL){large.push(k);continue}
   const key=cellOf((t+b)/2,area.top,rows)*cols+cellOf((l+r)/2,area.left,cols),list=cells.get(key);
   if(list)list.push(k);else cells.set(key,[k]);
  }
  return{item,parts,boxes,cells,large,paths:new Array<SkPath|null|undefined>(parts.length),fill:item.fill!=='transparent'?Skia.Color(item.fill):undefined,stroke:strokeWidth?Skia.Color(item.stroke!):undefined,strokeWidth};
 });
 /** A batch's subpaths whose ink can reach a region, in their original order.
  * A small subpath's centre lies within a cell of any region it reaches. */
 const select=(batch:Batch,region:Box)=>{
  const found:number[]=[],box=batch.boxes;
  const reaches=(k:number)=>box[k*4]<=region.r&&box[k*4+2]>=region.l&&box[k*4+1]<=region.b&&box[k*4+3]>=region.t;
  for(let cy=cellOf(region.t-CELL,area.top,rows),y1=cellOf(region.b+CELL,area.top,rows);cy<=y1;cy++)for(let cx=cellOf(region.l-CELL,area.left,cols),x1=cellOf(region.r+CELL,area.left,cols);cx<=x1;cx++){
   const list=batch.cells.get(cy*cols+cx);if(list)for(const k of list)if(reaches(k))found.push(k);
  }
  for(const k of batch.large)if(reaches(k))found.push(k);
  return found.sort((a,b)=>a-b);
 };

 const density=(level:number)=>base*2**level,span=(level:number)=>extent/2**level;
 // Anti-aliasing reaches about a texel past an edge; two keep every edge texel exact.
 const region=(level:number,i:number,j:number):Box=>{const s=span(level),reach=2/density(level),l=area.left+i*s-reach,t=area.top+j*s-reach;return{l,t,r:l+s+2*reach,b:t+s+2*reach}};
 const grid=(level:number)=>({cols:Math.max(1,Math.ceil(area.width/span(level)-1e-9)),rows:Math.max(1,Math.ceil(area.height/span(level)-1e-9))});
 const keyOf=(level:number,i:number,j:number)=>level*LEVEL_KEY+j*ROW_KEY+i;
 const levelFor=(scale:number,pixelRatio:number)=>{const need=scale*pixelRatio*MAP_TILE_MIN_TEXELS/base;return need<=1?0:Math.min(MAX_LEVEL,Math.ceil(Math.log2(need)-1e-9))};
 const range=(level:number,view:PlayerMapView,ring=0):Range|null=>{
  const s=span(level),size=grid(level);
  const i0=Math.max(0,Math.floor((view.x-area.left)/s)-ring),i1=Math.min(size.cols-1,Math.floor((view.x+view.width-area.left)/s)+ring);
  const j0=Math.max(0,Math.floor((view.y-area.top)/s)-ring),j1=Math.min(size.rows-1,Math.floor((view.y+view.height-area.top)/s)+ring);
  return i0>i1||j0>j1?null:{i0,i1,j0,j1};
 };

 // Tiles meet on exact shared edges, so their own draws must not be anti-aliased.
 const tiles=new Map<number,Tile>(),ink:SkPaint=Skia.Paint(),tilePaint:SkPaint=Skia.Paint(),clear=Skia.Color('transparent');
 ink.setAntiAlias(true);tilePaint.setAntiAlias(false);
 let builder:SkPathBuilder|undefined;
 let wanted:number[]=[],wantedSet=new Set<number>(),wantedView='',job:Job|undefined,revision=0,clock=0,disposed=false;
 let requestBuilds=0,cancelledJobs=0,allocationFailures=0;
 let pictureKey='',current:SkPicture|null=null,retired:SkPicture|null=null;
 let presentationRevision=-1,presentation:SkPicture|null=null,retiredPresentation:SkPicture|null=null;
 const ready=(level:number,i:number,j:number)=>{const tile=tiles.get(keyOf(level,i,j));return tile?.image?tile:undefined};

 /** Tiles this view should hold, in render order: the base, then the
  * visible tiles from the centre out, the next coarser level, then a ring. */
 const want=(view:PlayerMapView,pixelRatio:number,limit:number)=>{
  if(disposed)return;
  const level=levelFor(view.scale,pixelRatio),visible=range(level,view),coarse=level>1?range(level-1,view):null,prefetch=range(level,view,1);
  // The coverage is unchanged between tile boundaries. Preserve its request
  // order instead of sorting/allocating queues on every subpixel pinch update.
  const rangeKey=(r:Range|null)=>r?`${r.i0},${r.i1},${r.j0},${r.j1}`:'-';
  const id=`${level}|${rangeKey(visible)}|${rangeKey(coarse)}|${rangeKey(prefetch)}|${limit}`;if(id===wantedView)return;wantedView=id;requestBuilds++;
  const cx=view.x+view.width/2,cy=view.y+view.height/2,list=[keyOf(0,0,0)],seen=new Set(list);
  const add=(lv:number,r:Range|null)=>{
   if(!r)return;const s=span(lv),fresh:{key:number;d:number}[]=[];
   for(let j=r.j0;j<=r.j1;j++)for(let i=r.i0;i<=r.i1;i++){const key=keyOf(lv,i,j);if(!seen.has(key)){seen.add(key);fresh.push({key,d:Math.hypot(area.left+(i+.5)*s-cx,area.top+(j+.5)*s-cy)})}}
   fresh.sort((a,b)=>a.d-b.d);for(const f of fresh)list.push(f.key);
  };
  add(level,visible);
  if(level>1)add(level-1,coarse);
  add(level,prefetch);
  wanted=list.slice(0,limit);wantedSet=new Set(wanted);
  // During a fast pan/zoom a tile can leave even the prefetch ring before it
  // finishes. Keep completed tiles for reuse, but spend no more CPU on stale work.
  if(job&&!wantedSet.has(job.tile.key)){
   job.surface.dispose();tiles.delete(job.tile.key);job=undefined;builder?.reset();cancelledJobs++;
  }
 };
 const begin=(tile:Tile):Job|undefined=>{
  const surface=Skia.Surface.Make(MAP_TILE_SIZE+2*PAD,MAP_TILE_SIZE+2*PAD);if(!surface)return undefined;
  const canvas=surface.getCanvas(),d=density(tile.level),s=span(tile.level);
  canvas.clear(clear);canvas.translate(PAD,PAD);canvas.scale(d,d);canvas.translate(-(area.left+tile.i*s),-(area.top+tile.j*s));
  builder?.reset();
  return{tile,surface,canvas,region:region(tile.level,tile.i,tile.j),batch:0,next:0,added:0,started:performance.now(),drawn:0};
 };
 /** Selection, bounded append, indivisible raster and image snapshot each get
  * their own admission/cost sample. The raster retains the original complete
  * fill-then-stroke batch: splitting translucent draws changes the artwork. */
 const advance=(work:Job)=>{
  if(work.batch<batches.length){
   const batch=batches[work.batch];
   if(!work.list){work.list=select(batch,work.region);return false}
   const list=work.list;
   if(work.next<list.length){
    const shapes=builder??=Skia.PathBuilder.Make();
    for(const end=Math.min(list.length,work.next+CHUNK);work.next<end;work.next++){
     const k=list[work.next];let path=batch.paths[k];
     if(path===undefined)path=batch.paths[k]=Skia.Path.MakeFromSVGString(batch.parts[k]);
     if(path){shapes.addPath(path);work.added++}
    }
    return false;
   }
   work.batch++;work.list=undefined;work.next=0;
   if(!work.added)return false;
   work.added=0;
   // One path per batch keeps translucent overlaps blended once, as before.
   const path=builder!.detach();
   try{
    if(batch.fill){ink.setStyle(PaintStyle.Fill);ink.setColor(batch.fill);work.canvas.drawPath(path,ink)}
    if(batch.stroke){ink.setStyle(PaintStyle.Stroke);ink.setColor(batch.stroke);ink.setStrokeWidth(batch.strokeWidth);work.canvas.drawPath(path,ink)}
   }finally{path.dispose()}
   work.drawn++;
   return false;
  }
  work.tile.image=work.surface.makeImageSnapshot({x:PAD,y:PAD,width:MAP_TILE_SIZE,height:MAP_TILE_SIZE});work.surface.dispose();
  if(diagnostics?.recording)diagnostics.trace(work.started,'native-map-tile',performance.now()-work.started,{level:work.tile.level,i:work.tile.i,j:work.tile.j,batches:work.drawn});
  return true;
 };
 const trim=(limit:number)=>{
  if(tiles.size<=limit)return;
  const spare=[...tiles.values()].filter(t=>t.level>0&&!wantedSet.has(t.key)&&t!==job?.tile).sort((a,b)=>a.used-b.used);
  for(const tile of spare){if(tiles.size<=limit)break;tiles.delete(tile.key);tile.image?.dispose();revision++}
 };
 const nextWork=(priority:NativeWorkPriority='prefetch'):NativeFrameWorkHint|null=>{
  if(disposed)return null;
  if(!job)return wanted.some(k=>!tiles.has(k))?{kind:'allocate',priority,initialMs:.5}:null;
  if(job.batch>=batches.length)return{kind:'snapshot',priority,initialMs:1};
  const batch=batches[job.batch],phase=!job.list?'select':job.next<job.list.length?'append':'raster';
  return{kind:phase+':'+batch.item.id,priority,initialMs:phase==='raster'?1:.5};
 };
 /** One admitted operation; unlike step(...,true), it never hides additional
  * allocation/selection/raster work behind an append cost estimate. */
 const runWork=(limit=64)=>{
  if(disposed)return false;
  if(!job){
   const key=wanted.find(k=>!tiles.has(k));if(key===undefined)return false;
   const level=Math.floor(key/LEVEL_KEY),j=Math.floor(key%LEVEL_KEY/ROW_KEY),i=key%ROW_KEY,tile:Tile={key,level,i,j,image:null,used:clock};
   job=begin(tile);
   if(!job){allocationFailures++;return false}
   tiles.set(key,tile);return false;
  }
  const started=diagnostics?.recording?performance.now():undefined,kind=started!==undefined?nextWork()!.kind:undefined;
  const finished=advance(job);
  if(finished){job=undefined;revision++;trim(limit)}
  if(started!==undefined){const ms=performance.now()-started;if(ms>=1)diagnostics!.trace(started,'native-map-tile-work',ms,{units:1,finished,tiles:tiles.size,level:job?.tile.level??-1,kind:kind??'unknown'})}
  return finished;
 };

 /** Tile draws covering a view exactly once: each visible tile, else its four
  * finer children, else the matching region of its nearest coarser ancestor. */
 const plan=(view:PlayerMapView,pixelRatio:number):MapTileDraw[]=>{
  const level=levelFor(view.scale,pixelRatio),r=range(level,view),out:MapTileDraw[]=[];if(!r)return out;
  const full={x:0,y:0,width:MAP_TILE_SIZE,height:MAP_TILE_SIZE};
  const place=(lv:number,i:number,j:number)=>{const s=span(lv);return{x:area.left+i*s,y:area.top+j*s,width:s,height:s}};
  const children=level<MAX_LEVEL?grid(level+1):undefined;
  for(let j=r.j0;j<=r.j1;j++)for(let i=r.i0;i<=r.i1;i++){
   if(ready(level,i,j)){out.push({level,i,j,src:full,dst:place(level,i,j)});continue}
   if(children){
    const kids:[number,number][]=[];
    for(const [ci,cj] of [[2*i,2*j],[2*i+1,2*j],[2*i,2*j+1],[2*i+1,2*j+1]])if(ci<children.cols&&cj<children.rows)kids.push([ci,cj]);
    if(kids.every(([ci,cj])=>ready(level+1,ci,cj))){for(const [ci,cj] of kids)out.push({level:level+1,i:ci,j:cj,src:full,dst:place(level+1,ci,cj)});continue}
   }
   for(let a=level-1;a>=0;a--){
    const shift=level-a,ai=i>>shift,aj=j>>shift;if(!ready(a,ai,aj))continue;
    const part=MAP_TILE_SIZE/2**shift;
    out.push({level:a,i:ai,j:aj,src:{x:(i-(ai<<shift))*part,y:(j-(aj<<shift))*part,width:part,height:part},dst:place(level,i,j)});break;
   }
  }
  return out;
 };
 /** Entire-map coverage for a camera animated independently on the UI thread.
  * Every quadtree leaf draws exactly once; a missing child samples its nearest
  * complete ancestor. Cached detail never paints over a translucent base. */
 const presentationPlan=():MapTileDraw[]=>{
  const branches=new Set<number>(),out:MapTileDraw[]=[];
  for(const tile of tiles.values())if(tile.image)for(let level=tile.level-1;level>=0;level--){const shift=tile.level-level;branches.add(keyOf(level,tile.i>>shift,tile.j>>shift))}
  const visit=(level:number,i:number,j:number,parent:Tile|undefined)=>{
   const size=grid(level);if(i>=size.cols||j>=size.rows)return;
   const tile=ready(level,i,j)??parent,key=keyOf(level,i,j);
   if(branches.has(key)&&level<MAX_LEVEL){for(const [x,y]of [[0,0],[1,0],[0,1],[1,1]])visit(level+1,i*2+x,j*2+y,tile);return}
   if(!tile)return;
   const ratio=2**(level-tile.level),part=MAP_TILE_SIZE/ratio,s=span(level);
   out.push({level:tile.level,i:tile.i,j:tile.j,src:{x:(i-tile.i*ratio)*part,y:(j-tile.j*ratio)*part,width:part,height:part},dst:{x:area.left+i*s,y:area.top+j*s,width:s,height:s}});
  };
  visit(0,0,0,undefined);return out;
 };

 return{
  /** Requests the tiles for a view; repeated calls with the same view are free. */
  want,nextWork,runWork,
  /** Renders queued tiles until `until`, optionally at least one unit. True when a tile finished. */
  step(until:number,atLeastOne=false,limit=64){
   if(disposed)return false;
   const started=diagnostics?.recording?performance.now():undefined;
   let finished=false,first=atLeastOne,units=0;
   while(first||performance.now()<until){
    first=false;
    if(!nextWork())break;
    const failures=allocationFailures;
    units++;if(runWork(limit))finished=true;
    // A transient allocation failure must neither poison the cache nor spin.
    if(allocationFailures!==failures)break;
   }
   if(finished)trim(limit);
   // Unlike native-map-tile (wall time across many frames), this measures the
   // synchronous CPU slice charged to this callback, including queue/trim work.
   if(started!==undefined){const ms=performance.now()-started;if(ms>=1)diagnostics!.trace(started,'native-map-tile-work',ms,{units,finished,tiles:tiles.size,level:job?.tile.level??-1})}
   return finished;
  },
  /** True while any requested tile is missing. */
  pending:()=>!!job||wanted.some(k=>!tiles.has(k)),
  trim,
  plan,presentationPlan,
  /** Retained until cache content changes, rather than every UI camera move. */
  presentationPicture():SkPicture|null{
   if(disposed)return null;
   if(presentationRevision===revision)return presentation;
   presentationRevision=revision;clock++;
   retiredPresentation?.dispose();retiredPresentation=presentation;
   const draws=presentationPlan();if(!draws.length)return presentation=null;
   const recorder=Skia.PictureRecorder(),canvas=recorder.beginRecording({x:area.left,y:area.top,width:area.width,height:area.height});
   try{
    for(const draw of draws){const tile=tiles.get(keyOf(draw.level,draw.i,draw.j))!;tile.used=clock;canvas.drawImageRectOptions(tile.image!,draw.src,draw.dst,FilterMode.Linear,MipmapMode.None,tilePaint)}
    return presentation=recorder.finishRecordingAsPicture();
   }finally{recorder.dispose()}
  },
  /** One retained picture of the view's tile draws, re-recorded only when they change. */
  picture(view:PlayerMapView,pixelRatio:number):SkPicture|null{
   const level=levelFor(view.scale,pixelRatio),r=range(level,view);
   const key=r?`${level}|${r.i0}|${r.i1}|${r.j0}|${r.j1}|${revision}`:'';
   if(key===pictureKey)return current;
   pictureKey=key;clock++;
   // A canvas may still hold the picture being replaced until it re-renders.
   retired?.dispose();retired=current;
   if(!r||disposed)return current=null;
   const recorder=Skia.PictureRecorder(),canvas=recorder.beginRecording({x:area.left,y:area.top,width:area.width,height:area.height});
   try{
    for(const draw of plan(view,pixelRatio)){const tile=tiles.get(keyOf(draw.level,draw.i,draw.j))!;tile.used=clock;canvas.drawImageRectOptions(tile.image!,draw.src,draw.dst,FilterMode.Linear,MipmapMode.None,tilePaint)}
    return current=recorder.finishRecordingAsPicture();
   }finally{recorder.dispose()}
  },
  /** Each batch's subpath indices drawn into one tile. */
  selection:(level:number,i:number,j:number)=>{const box=region(level,i,j);return batches.map(batch=>select(batch,box))},
  stats:()=>({tiles:tiles.size,ready:[...tiles.values()].filter(t=>t.image).length,revision,requestBuilds,cancelledJobs,allocationFailures}),
  dispose(){
   disposed=true;job?.surface.dispose();job=undefined;
   current?.dispose();retired?.dispose();current=retired=null;
   presentation?.dispose();retiredPresentation?.dispose();presentation=retiredPresentation=null;
   for(const tile of tiles.values())tile.image?.dispose();
   tiles.clear();
   for(const batch of batches)for(const path of batch.paths)path?.dispose();
   builder?.dispose();ink.dispose();tilePaint.dispose();
  },
 };
}
export type MapTiles=ReturnType<typeof createMapTiles>;
