import {decodeRun,runSaveValue,RUN_SAVE_KEY} from '../src/run-save';
import type {SceneTravel,TravelSnapshot} from '../src/scene-travel';
import type {WorldLayout} from '../src/world-layout';

export const NATIVE_LAYOUT_SAVE_KEYS={a:RUN_SAVE_KEY+'-layouts-a',b:RUN_SAVE_KEY+'-layouts-b'} as const;
const FORMAT='native-split-layouts',MAX_SAVE_CHARACTERS=12_000_000;
type Slot=keyof typeof NATIVE_LAYOUT_SAVE_KEYS;
type Storage={getItem:(key:string)=>Promise<string|null>;setItem:(key:string,value:string)=>Promise<unknown>};
type ObservedNode={source:Record<string,unknown>;keys:string[];values:unknown[];arrayLength?:number};
type LayoutEncoding={text:string;nodes:ObservedNode[];identity:object};
export type PreparedNativeRun={readonly text:string;readonly layouts:readonly LayoutEncoding[];readonly layoutCharacters:number;readonly serializedLayouts:number};
type Manifest={nativeStorage:typeof FORMAT;version:2;slot:Slot;generation:string;run:{version:1;worlds:[string,Record<string,unknown>][];[key:string]:unknown}};
const own=(object:object,key:string)=>Object.prototype.hasOwnProperty.call(object,key);

/** Observe once; subsequent saves compare cached fields without building JSON,
 * property arrays, fingerprints or object copies for thousands of placements.
 * Pointer changes and nested in-place edits both invalidate the cached text. */
function observe(root:unknown):ObservedNode[]{
 const nodes:ObservedNode[]=[],seen=new Set<object>(),stack=[root];
 while(stack.length){
  const value=stack.pop();if(!value||typeof value!=='object'||seen.has(value))continue;
  seen.add(value);const source=value as Record<string,unknown>,keys=Object.keys(source),values=keys.map(key=>source[key]);
  nodes.push({source,keys,values,...(Array.isArray(value)?{arrayLength:value.length}:{})});
  for(const child of values)if(child&&typeof child==='object')stack.push(child);
 }
 return nodes;
}
function unchanged(nodes:ObservedNode[]){
 for(const node of nodes){
  const {source,keys,values,arrayLength}=node;
  if(arrayLength!==undefined&&(source as unknown as unknown[]).length!==arrayLength)return false;
  for(let i=0;i<keys.length;i++)if(source[keys[i]]!==values[i]||!own(source,keys[i]))return false;
  // Added keys are significant too. for-in avoids per-placement Object.keys
  // allocation on the normal unchanged-layout path.
  let count=0;for(const key in source)if(own(source,key))count++;
  if(count!==keys.length)return false;
 }
 return true;
}
function readJson(text:string){
 if(text.length>MAX_SAVE_CHARACTERS)throw Error('The saved expedition is too large to open.');
 try{return JSON.parse(text)}catch{throw Error('The saved expedition could not be read.')}
}
function manifest(value:any):value is Manifest{
 return value?.nativeStorage===FORMAT&&value.version===2&&(value.slot==='a'||value.slot==='b')&&typeof value.generation==='string'&&value.generation.length>0&&value.generation.length<120&&value.run?.version===1&&Array.isArray(value.run.worlds)&&value.run.worlds.length>=1&&value.run.worlds.length<=12;
}
function decodeCompact(value:Manifest,layoutText:string|null,manifestCharacters:number){
 if(!layoutText)throw Error('The saved expedition map is missing.');
 const bundle=readJson(layoutText);
 if(bundle?.version!==1||bundle.generation!==value.generation||!Array.isArray(bundle.layouts)||bundle.layouts.length<1||bundle.layouts.length>12||manifestCharacters+layoutText.length>MAX_SAVE_CHARACTERS)throw Error('The saved expedition map is incomplete.');
 const worlds=value.run.worlds.map(pair=>{
  if(!Array.isArray(pair)||pair.length!==2||!pair[1]||typeof pair[1]!=='object')throw Error('The saved world is incomplete.');
  const [id,world]=pair,ref=world.layout as {nativeLayout?:unknown}|undefined,index=ref?.nativeLayout;
  if(!Number.isSafeInteger(index)||Number(index)<0||Number(index)>=bundle.layouts.length)throw Error('The saved expedition map is missing.');
  return [id,{...world,layout:bundle.layouts[index as number]}];
 });
 return {snapshot:decodeRun(JSON.stringify({...value.run,worlds})),layouts:bundle.layouts as WorldLayout[]};
}

/** Native saves use two bounded layout slots and one atomic run manifest.
 * Layouts reach storage before their manifest can reference them. A layout
 * change writes the inactive slot; failed saves cannot overwrite the active
 * slot. Each prepared run already owns immutable strings, so delayed writes
 * never capture a later player state or overtake a newer checkpoint.
 *
 * AsyncStorage's per-key setItem completion is the commit boundary. This is
 * not an OS fsync guarantee; the previous valid manifest remains authoritative
 * when a write fails or the process stops before the final setItem.
 */
export class NativeRunSaveStore{
 private pending:Promise<void>=Promise.resolve();
 private cache=new WeakMap<WorldLayout,LayoutEncoding>();
 private initialized=false;
 private committed:{slot:Slot;generation:string;layoutCharacters:number;layouts?:readonly LayoutEncoding[]}|undefined;
 private serial=0;
 private lastSerializedLayouts=0;
 private replaceUnreadableUntilCommit=false;
 error='';
 constructor(private storage:Storage){}

 private layout(layout:WorldLayout){
  const cached=this.cache.get(layout);if(cached&&unchanged(cached.nodes))return cached;
  const text=JSON.stringify(layout,runSaveValue);
  if(text.length>MAX_SAVE_CHARACTERS)throw Error('The saved expedition is too large to save.');
  const encoded={text,nodes:observe(layout),identity:{}};this.cache.set(layout,encoded);this.lastSerializedLayouts++;return encoded;
 }
 /** Call synchronously at the checkpoint. Only the small changing state is
  * encoded on subsequent saves; storage work remains ordered and asynchronous. */
 prepare(travel:SceneTravel):PreparedNativeRun|null{
  if(travel.busy||!travel.current.progression)return null;
  this.lastSerializedLayouts=0;
  const snapshot=travel.capture(),layouts:LayoutEncoding[]=[],indexes=new Map<object,number>(),observed=new Map<WorldLayout,LayoutEncoding>();
  let expandedLayoutCharacters=0;
  const worlds=snapshot.worlds.map(([id,world])=>{
   if(!world.layout)throw Error('The saved world is incomplete.');
   let encoded=observed.get(world.layout);if(!encoded){encoded=this.layout(world.layout);observed.set(world.layout,encoded)}
   let index=indexes.get(encoded.identity);
   if(index===undefined){index=layouts.length;indexes.set(encoded.identity,index);layouts.push(encoded)}
   expandedLayoutCharacters+=encoded.text.length-JSON.stringify({nativeLayout:index}).length;
   return [id,{...world,layout:{nativeLayout:index}}];
  });
  const text=JSON.stringify({version:1,savedAt:new Date().toISOString(),...snapshot,worlds},runSaveValue),layoutCharacters=layouts.reduce((sum,layout)=>sum+layout.text.length,0);
  if(text.length+layoutCharacters>MAX_SAVE_CHARACTERS||text.length+expandedLayoutCharacters>MAX_SAVE_CHARACTERS)throw Error('The saved expedition is too large to save.');
  return {text,layouts,layoutCharacters,serializedLayouts:this.lastSerializedLayouts};
 }

 /** replaceUnreadable is reserved for the confirmed Start new Survival run
  * action. Ordinary autosaves must never replace an unreadable existing save. */
 save(prepared:PreparedNativeRun,replaceUnreadable=false):Promise<void>{
  this.pending=this.pending.catch(()=>{}).then(async()=>{
   try{
    // Apply permission in queue order, never retroactively to an older queued
    // run. A transient first-write failure keeps the confirmed new run's
    // permission until a manifest commits, so later autosaves can recover.
    if(replaceUnreadable)this.replaceUnreadableUntilCommit=true;
    await this.initialize(this.replaceUnreadableUntilCommit);
    const same=this.committed?.layouts?.length===prepared.layouts.length&&prepared.layouts.every((layout,i)=>layout.identity===this.committed!.layouts![i].identity);
    let next=this.committed,layoutText:string|undefined;
    if(!same){
     const slot:Slot=this.committed?.slot==='a'?'b':'a';
     const generation=Date.now().toString(36)+'-'+(++this.serial).toString(36)+'-'+Math.random().toString(36).slice(2);
     layoutText='{"version":1,"generation":'+JSON.stringify(generation)+',"layouts":['+prepared.layouts.map(layout=>layout.text).join(',')+']}';
     next={slot,generation,layoutCharacters:layoutText.length,layouts:prepared.layouts};
    }
    const text='{"nativeStorage":'+JSON.stringify(FORMAT)+',"version":2,"slot":'+JSON.stringify(next!.slot)+',"generation":'+JSON.stringify(next!.generation)+',"run":'+prepared.text+'}';
    // Envelopes count towards the decoder's combined size cap as well. Reject
    // before either write so the save-side and load-side size limits agree.
    if(text.length+next!.layoutCharacters>MAX_SAVE_CHARACTERS)throw Error('The saved expedition is too large to save.');
    if(layoutText!==undefined)await this.storage.setItem(NATIVE_LAYOUT_SAVE_KEYS[next!.slot],layoutText);
    await this.storage.setItem(RUN_SAVE_KEY,text);
    this.committed=next;this.replaceUnreadableUntilCommit=false;this.error='';
   }catch{
    // A provider may reject after persisting. Re-read its actual manifest
    // before choosing a slot for another save, rather than overwriting it.
    this.initialized=false;this.committed=undefined;
    this.error='Progress could not be saved on this device.';
   }
  });
  return this.pending;
 }
 flush(){return this.pending}

 private async initialize(replaceUnreadable:boolean){
  if(this.initialized)return;
  const text=await this.storage.getItem(RUN_SAVE_KEY);
  try{
   if(text){
    const value=readJson(text);
    if(manifest(value)){
     const layoutText=await this.storage.getItem(NATIVE_LAYOUT_SAVE_KEYS[value.slot]);
     decodeCompact(value,layoutText,text.length);
     this.committed={slot:value.slot,generation:value.generation,layoutCharacters:layoutText!.length};
    }else if(value?.version===1&&!own(value,'nativeStorage')){decodeRun(text);this.committed=undefined}
    else throw Error('The saved expedition is not a supported version.');
   }else this.committed=undefined;
  }catch(error){if(!replaceUnreadable)throw error;this.committed=undefined}
  this.initialized=true;
 }

 /** Runs only during load. Full decode/validation/migration stays in the
  * existing codec, including old v1 saves and camp/interior return routes. */
 async load():Promise<TravelSnapshot|undefined>{
  await this.flush();
  this.initialized=false;this.committed=undefined;
  const text=await this.storage.getItem(RUN_SAVE_KEY);if(!text){this.initialized=true;this.error='';return undefined}
  const value=readJson(text);
  if(!own(value??{},'nativeStorage')){
   const snapshot=decodeRun(text);this.committed=undefined;this.initialized=true;
   for(const [,world]of snapshot.worlds)if(world.layout)this.layout(world.layout);
   this.error='';
   return snapshot;
  }
  if(!manifest(value))throw Error('The saved expedition is not a supported version.');
  const layoutText=await this.storage.getItem(NATIVE_LAYOUT_SAVE_KEYS[value.slot]);
  const {snapshot,layouts}=decodeCompact(value,layoutText,text.length);
  const entries:LayoutEncoding[]=[],rawTexts=layouts.map(layout=>JSON.stringify(layout,runSaveValue));
  let changed=false;
  for(let i=0;i<snapshot.worlds.length;i++){
   const layout=snapshot.worlds[i][1].layout!;
   const index=(value.run.worlds[i][1].layout as {nativeLayout:number}).nativeLayout,encoded=this.layout(layout);
   if(encoded.text!==rawTexts[index])changed=true;
   // The decoder creates independent objects even for a shared slot. Share
   // only their immutable content identity, never their observation nodes:
   // an in-place edit to the second world's layout must inspect that object.
   if(entries[index]&&entries[index].text!==encoded.text)changed=true;
   else entries[index]??=encoded;
   if(entries[index]?.text===encoded.text)encoded.identity=entries[index].identity;
  }
  this.committed={slot:value.slot,generation:value.generation,layoutCharacters:layoutText!.length,...(!changed&&entries.length===layouts.length&&entries.filter(Boolean).length===layouts.length?{layouts:entries}:{})};
  this.initialized=true;this.error='';return snapshot;
 }
}
