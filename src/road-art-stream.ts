import {TERRAIN_CHUNK_IMAGES,streamPatches} from './terrain-stream-art';
import {EAST_TERRAIN_SCALE} from './east-approach';
import {terrainIntersects,type TerrainView} from './outdoor-terrain';
import {artworkFailureDetails,type ArtworkPriority} from './artwork-loading';
import type {GamePerformanceRecorder} from './performance-recording';
export const ROAD_DETAIL_LIMIT=10; // retained for older diagnostic callers
type Patch={key:string;x:number;y:number;width:number;height:number;bytes?:number;minPixelsPerWorldUnit?:number;maxPixelsPerWorldUnit?:number};
export type ArtworkStreamConfig={patches:readonly Patch[];sources:Record<string,string>;maxBytes?:number;limit?:number;name?:string};
const PREFETCH_MARGIN=650,RETAIN_MARGIN=1600,LOOKAHEAD_MS=1600;
const PREFETCH_RESIDENCY_MS=1500,PREFETCH_RELOAD_MS=2000;
/** Visible texels are mandatory. Speculative work and recent textures share a
 * byte budget; the number of overlapping paintings never limits coverage. */
export class RoadArtStream{
 private wanted:string[]=[];
 private visible=new Set<string>();
 private kept=new Set<string>();
 private ready=new Set<string>();
 private residentSince=new Map<string,number>();
 private evictedAt=new Map<string,number>();
 private pending=new Map<string,ArtworkPriority>();
 private pendingSince=new Map<string,number>();
 private failed=new Map<string,number>();
 private counters={requested:0,completed:0,failures:0,evictions:0,rapidEvictions:0,recentReloads:0};
 private disposed=false;
 private lastUpdate=-Infinity;
 private lastView?:TerrainView;
 private budget:number;
 private sizes=new Map<string,number>();
 private patches:(Patch&{b:TerrainView})[];
 constructor(private load:(sources:Record<string,string>,priority:ArtworkPriority)=>Promise<void>,private release:(keys:string[])=>void,private config:ArtworkStreamConfig={patches:streamPatches('road'),sources:TERRAIN_CHUNK_IMAGES,maxBytes:48*1024*1024,name:'roads'},private promote?:(keys:string[])=>void,private diagnostics?:GamePerformanceRecorder){
  const s=EAST_TERRAIN_SCALE;this.budget=config.maxBytes??config.limit??48*1024*1024;
  this.patches=config.patches.map(p=>{this.sizes.set(p.key,p.bytes??1);return {...p,b:{x:(p.x-600)*s,y:(p.y-600)*s,width:p.width*s,height:p.height*s}}});
 }
 update(view:TerrainView,pixelsPerWorldUnit:number,now=Date.now()){
  if(this.disposed||now-this.lastUpdate<150)return;
  const elapsed=now-this.lastUpdate,previous=this.lastView;this.lastUpdate=now;this.lastView={...view};
  let dx=0,dy=0;
  if(previous&&elapsed<1000&&Math.abs(previous.width-view.width)<view.width*.05&&Math.abs(previous.height-view.height)<view.height*.05){
   const mx=view.x-previous.x,my=view.y-previous.y,d=Math.hypot(mx,my);
   if(d&&d/elapsed<1){const lead=Math.min(750,d*LOOKAHEAD_MS/elapsed);dx=mx/d*lead;dy=my/d*lead}
  }
  const ahead={...view,x:view.x+dx,y:view.y+dy},cx=ahead.x+view.width/2,cy=ahead.y+view.height/2;
  const eligible=this.patches.filter(p=>pixelsPerWorldUnit>=(p.minPixelsPerWorldUnit??(this.ready.has(p.key)?.4:.45))&&pixelsPerWorldUnit<(p.maxPixelsPerWorldUnit??Infinity));
  this.kept=new Set(this.patches.filter(p=>pixelsPerWorldUnit>=.12&&terrainIntersects(p.b,view,RETAIN_MARGIN)).map(p=>p.key));
  const candidates=eligible.filter(p=>terrainIntersects(p.b,view,PREFETCH_MARGIN)||terrainIntersects(p.b,ahead,PREFETCH_MARGIN))
   .map(p=>({...p,priority:terrainIntersects(p.b,view)?0:terrainIntersects(p.b,ahead)?1:2,distance:Math.hypot(p.b.x+p.b.width/2-cx,p.b.y+p.b.height/2-cy)-(this.ready.has(p.key)||this.pending.has(p.key)?180:0)}))
   .sort((a,b)=>a.priority-b.priority||a.distance-b.distance);
  this.visible=new Set(candidates.filter(p=>p.priority===0).map(p=>p.key));
  // Visible footprint is naturally bounded by viewport and selected mip level.
  // Never strand an on-screen section because several paintings overlap.
  this.budget=Math.max(this.config.maxBytes??this.config.limit??0,[...this.visible].reduce((n,k)=>n+this.bytes(k),0));
  for(const key of this.ready)if(!this.kept.has(key))this.evict(key,now,'outside-retain');
  for(const [key,at]of this.evictedAt)if(!this.kept.has(key)||now-at>=PREFETCH_RELOAD_MS)this.evictedAt.delete(key);
  // Reserve work already paid for before selecting more speculative requests.
  // Visible candidates always enter the list, even when they must reclaim space.
  const reserved=new Set([...this.pending.keys(),...[...this.ready].filter(key=>this.isRecent(key,now))]);
  let bytes=0;for(const key of reserved)bytes+=this.bytes(key);this.wanted=[];
  for(const p of candidates){
   if(p.priority!==0&&this.evictedAt.has(p.key))continue;
   const size=reserved.has(p.key)?0:this.bytes(p.key);
   if(p.priority===0||bytes+size<=this.budget){this.wanted.push(p.key);bytes+=size}
  }
  for(const key of this.failed.keys())if(!this.kept.has(key))this.failed.delete(key);
  for(const key of this.wanted)if(this.ready.delete(key))this.ready.add(key);
  for(const [key,priority]of this.pending)if(priority==='background'&&this.visible.has(key)){this.pending.set(key,'foreground');this.promote?.([key])}
  this.pump(now);
 }
 private bytes(key:string){return this.sizes.get(key)??1}
 private isRecent(key:string,now:number){const since=this.residentSince.get(key);return since!==undefined&&now-since<PREFETCH_RESIDENCY_MS}
 private evict(key:string,now:number,reason:string){
  const ageMs=Math.max(0,now-(this.residentSince.get(key)??now));
  this.ready.delete(key);this.residentSince.delete(key);this.evictedAt.set(key,now);this.counters.evictions++;
  if(ageMs<PREFETCH_RESIDENCY_MS)this.counters.rapidEvictions++;
  if(this.diagnostics?.recording)this.diagnostics.trace(performance.now(),'stream-evict',0,{layer:this.config.name||'terrain',key,bytes:this.bytes(key),ageMs,reason});this.release([key]);
 }
 private pump(now=Date.now()){
  if(this.disposed)return;
  for(const key of this.wanted){
   if(this.pending.size>=2)break;
   if(this.ready.has(key)||this.pending.has(key)||(this.failed.get(key)||0)>now)continue;
   const foreground=this.visible.has(key),needed=this.residentBytes+this.pendingBytes+this.bytes(key)-this.budget;
   if(!foreground&&this.evictedAt.has(key)&&now-this.evictedAt.get(key)!<PREFETCH_RELOAD_MS)continue;
   if(needed>0){
    const victims:string[]=[];let reclaimed=0;
    for(const candidate of this.ready){
     if(this.visible.has(candidate)||(!foreground&&(this.wanted.includes(candidate)||this.isRecent(candidate,now))))continue;
     victims.push(candidate);reclaimed+=this.bytes(candidate);if(reclaimed>=needed)break;
    }
    // Do not destroy useful cached tiles when pending work still prevents the
    // new request from fitting. Visible work may bypass the residency grace.
    if(reclaimed<needed)continue;
    for(const victim of victims)this.evict(victim,now,foreground?'visible-priority':'prefetch-budget');
   }
   if(this.residentBytes+this.pendingBytes+this.bytes(key)>this.budget)continue;
   const priority=foreground?'foreground':'background';this.pending.set(key,priority);this.pendingSince.set(key,Date.now());this.counters.requested++;
   if(this.evictedAt.has(key)&&now-this.evictedAt.get(key)!<PREFETCH_RELOAD_MS)this.counters.recentReloads++;
   const trace=this.diagnostics,started=trace?.recording?performance.now():undefined,session=trace?.session;
   if(started!==undefined)trace!.trace(started,'stream-request',0,{layer:this.config.name||'terrain',key,priority,bytes:this.bytes(key)},session);
   void this.load({[key]:this.config.sources[key]},priority).then(()=>{
    // Completion moves bytes atomically from pending to resident. Otherwise
    // another completion's pump can count the same image twice and evict it.
    this.pending.delete(key);this.pendingSince.delete(key);
    if(this.disposed||!this.kept.has(key)){this.release([key]);return}
    this.ready.add(key);this.residentSince.set(key,Date.now());this.failed.delete(key);this.counters.completed++;
    if(started!==undefined)trace!.trace(started,'stream-ready',performance.now()-started,{layer:this.config.name||'terrain',key},session);
   }).catch(error=>{if(!this.disposed){this.failed.set(key,Date.now()+5000);this.counters.failures++;if(started!==undefined)trace!.trace(started,'stream-failed',performance.now()-started,{layer:this.config.name||'terrain',key,retryMs:5000,...artworkFailureDetails(error)},session)}}).finally(()=>{this.pending.delete(key);this.pendingSince.delete(key);this.pump()});
  }
 }
 get residentCount(){return this.ready.size}
 get pendingCount(){return this.pending.size}
 get residentBytes(){let n=0;for(const k of this.ready)n+=this.bytes(k);return n}
 get pendingBytes(){let n=0;for(const k of this.pending.keys())n+=this.bytes(k);return n}
 get visibleMissing(){return [...this.visible].filter(k=>!this.ready.has(k)).length}
 stats(now=Date.now()){
  const missingKeys=[...this.visible].filter(k=>!this.ready.has(k));
  return {bytes:this.residentBytes+this.pendingBytes,missing:missingKeys.length,residentBytes:this.residentBytes,pendingBytes:this.pendingBytes,budgetBytes:this.budget,resident:this.ready.size,pending:this.pending.size,wanted:this.wanted.length,visible:this.visible.size,...this.counters,
   missingDetails:missingKeys.slice(0,12).map(key=>({key,state:this.pending.has(key)?'loading-or-warming':(this.failed.get(key)||0)>now?'retry-backoff':this.pending.size>=2?'waiting-for-slot':'waiting-for-budget',pendingMs:this.pendingSince.has(key)?Math.max(0,now-this.pendingSince.get(key)!):0,retryInMs:Math.max(0,(this.failed.get(key)||0)-now),bytes:this.bytes(key)})),missingDetailsOmitted:Math.max(0,missingKeys.length-12)};
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.release([...this.ready]);this.ready.clear();this.residentSince.clear();this.evictedAt.clear();this.wanted=[];this.kept.clear();this.failed.clear()}
}
