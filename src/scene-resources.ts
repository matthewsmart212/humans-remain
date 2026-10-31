import type {SceneDefinition} from './scene-model';
import {CAMP_SCENE_ID,sceneImages} from './world-scenes';
import {loadingDeadline} from './artwork-loading';
import {requiredImages} from './world-assets';

export interface SceneResources{prepare(id:string):Promise<void>;ready(id:string):boolean;pin(ids:string[]):void}
/** Camp/shared character textures belong to the renderer. Only additional map
 * textures enter this bounded LRU, so expanding the registry cannot preload the world. */
export class SceneResourceCache implements SceneResources{
 private resident=new Map<string,Record<string,string>>();
 private pending=new Map<string,{task:Promise<void>;sources:Record<string,string>}>();
 private pinned=new Set<string>();
 private disposed=false;
 constructor(private scenes:ReadonlyMap<string,SceneDefinition>,private load:(sources:Record<string,string>)=>Promise<void>,private release:(keys:string[])=>void,private maxResident=3){}
 ready(id:string){return id===CAMP_SCENE_ID||this.resident.has(id)}
 pin(ids:string[]){this.pinned=new Set(ids);this.trim()}
 private releaseUnused(keys:string[]){
  const used=new Set([...this.resident.values(),...Array.from(this.pending.values(),p=>p.sources)].flatMap(s=>Object.keys(s)));
  this.release(keys.filter(key=>!used.has(key)));
 }
 private trim(){for(const [id,sources]of this.resident){if(this.resident.size<=this.maxResident)break;if(!this.pinned.has(id)){this.resident.delete(id);this.releaseUnused(Object.keys(sources))}}}
 prepare(id:string):Promise<void>{
  if(this.disposed)return Promise.reject(Error('Map loading was cancelled.'));
  if(id===CAMP_SCENE_ID)return Promise.resolve();
  const current=this.resident.get(id);if(current){this.resident.delete(id);this.resident.set(id,current);return Promise.resolve()}
  const pending=this.pending.get(id);if(pending)return pending.task;
  const scene=this.scenes.get(id);if(!scene)return Promise.reject(Error('This destination is not available yet.'));
  const sources={...sceneImages(scene),...requiredImages(scene.layout?.items.map(p=>p.assetId)||[])};
  const loaded=this.load(sources);
  const task=loadingDeadline(loaded,45000,undefined,'The next map could not load. Stay here and retry.').then(()=>{
   if(this.disposed)return;
   this.resident.set(id,sources);this.trim();
  }).finally(()=>{if(this.pending.get(id)?.task===task)this.pending.delete(id);this.releaseUnused(Object.keys(sources))});
  this.pending.set(id,{task,sources});
  // A late decode after a deadline/disposal must not retain an abandoned map.
  void loaded.then(()=>this.releaseUnused(Object.keys(sources)),()=>{});
  return task;
 }
 dispose(){if(this.disposed)return;this.disposed=true;const keys=new Set([...this.resident.values(),...Array.from(this.pending.values(),p=>p.sources)].flatMap(s=>Object.keys(s)));this.resident.clear();this.pending.clear();this.release([...keys])}
}
