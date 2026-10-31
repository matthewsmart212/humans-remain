import {OUTDOOR_TILES,terrainIntersects,type TerrainView} from './outdoor-terrain';

/** Stream artwork ahead of movement; player, props and round state stay in one world. */
export class OutdoorTerrainStream{
 readonly ready=new Set<string>();
 private pending=new Map<string,Promise<void>>();
 private failed=new Set<string>();
 private wanted=new Set<string>();
 private kept=new Set<string>();
 private visible=new Set<string>();
 private disposed=false;
 private message='';
 constructor(private load:(images:Record<string,string>)=>Promise<void>,private release:(keys:string[])=>void,private status:(message:string)=>void=()=>{}){}
 update(view:TerrainView,player:{x:number;y:number},enabled=true){
  if(this.disposed)return;
  const playerView={...player,width:0,height:0};
  this.wanted=new Set(OUTDOOR_TILES.filter(t=>enabled&&(terrainIntersects(t,view,1400)||terrainIntersects(t,playerView,1400))).map(t=>t.key));
  this.kept=new Set(OUTDOOR_TILES.filter(t=>enabled&&(terrainIntersects(t,view,2200)||terrainIntersects(t,playerView,2200))).map(t=>t.key));
  this.visible=new Set(OUTDOOR_TILES.filter(t=>enabled&&(terrainIntersects(t,view)||terrainIntersects(t,playerView,100))).map(t=>t.key));
  for(const key of this.ready)if(!this.kept.has(key)){this.ready.delete(key);this.release([key])}
  for(const key of this.failed)if(!this.kept.has(key))this.failed.delete(key);
  for(const key of this.wanted)this.prepare(key);
  this.report();
 }
 private prepare(key:string){
  if(this.ready.has(key)||this.pending.has(key)||this.failed.has(key)||this.disposed)return;
  const tile=OUTDOOR_TILES.find(t=>t.key===key);if(!tile)return;
  const task=this.load({[tile.key]:tile.image}).then(()=>{
   if(this.disposed||!this.kept.has(key)){this.release([key]);return}
   this.ready.add(key);
  }).catch(()=>{if(!this.disposed)this.failed.add(key)}).finally(()=>{this.pending.delete(key);this.report()});
  this.pending.set(key,task);
 }
 private report(){
  if(this.disposed)return;
  const message=[...this.visible].some(k=>this.failed.has(k))?'The path ahead could not load. Retry when ready.':[...this.visible].some(k=>!this.ready.has(k))?'Preparing the path ahead…':'';
  if(message!==this.message){this.message=message;this.status(message)}
 }
 get error(){return [...this.visible].some(k=>this.failed.has(k))}
 retry(){this.failed.clear();for(const key of this.wanted)this.prepare(key);this.report()}
 async settled(){await Promise.all([...this.pending.values()])}
 dispose(){if(this.disposed)return;this.disposed=true;this.release([...this.ready]);this.ready.clear();this.failed.clear()}
}
