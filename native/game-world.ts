import snapshot from './assets/world-snapshot.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {WORLD_URL} from './config';
import {installImportedArt} from '../src/imported-art';
import {validateLayout,type WorldLayout} from '../src/world-layout';
import {prepareAuthoredWorld} from '../src/authored-world';
import type {ArtworkRecord} from '../src/artwork-model';

export type SavedWorld={layout:WorldLayout;records:ArtworkRecord[];revision?:number;source?:string};
export function validateSavedWorld(raw:unknown,source:string):SavedWorld{
 const v=raw as SavedWorld;if(!v||!Array.isArray(v.records))throw Error('World artwork metadata is missing.');
 installImportedArt(v.records);
 const checked=validateLayout(v.layout);if(!checked.layout||checked.errors.length)throw Error(checked.errors.join(' ')||'The saved world is invalid.');
 return {...v,layout:prepareAuthoredWorld(checked.layout),source};
}
/** Native releases own their world. Editor drafts and old draft caches must
 * never decide what ships, delay startup or replace the device's Survival run. */
export function loadGameWorld():SavedWorld{
 return validateSavedWorld(snapshot,'Game world');
}


type PublishedPayload=SavedWorld&{schemaVersion:number;updatedAt?:string};
const CLOUD_WORLD_KEY='humans-remain-published-world-v1:'+WORLD_URL;
const CLOUD_TIMEOUT_MS=6500;

/** Load only a deliberately published world, never a private editor draft.
 * A bad/unreachable release must not prevent offline iPhone gameplay.
 * Cached published worlds are used offline before the bundled release.
 */
export async function loadPublishedGameWorld():Promise<SavedWorld>{
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),CLOUD_TIMEOUT_MS);
 try{
  const response=await fetch(WORLD_URL+'/api/published-world',{headers:{Accept:'application/json'},signal:controller.signal});
  if(!response.ok)throw Error('Published world unavailable ('+response.status+')');
  const payload=await response.json() as PublishedPayload;
  if(payload.schemaVersion!==1)throw Error('Unsupported published world version');
  const result=validateSavedWorld(payload,'Cloudflare published world');
  try{await AsyncStorage.setItem(CLOUD_WORLD_KEY,JSON.stringify(payload))}catch{/* Cache is optional. */}
  return result;
 }catch(error){
  console.warn('Using offline world source',error);
  try{
   const raw=await AsyncStorage.getItem(CLOUD_WORLD_KEY);
   if(raw){
    const cached=validateSavedWorld(JSON.parse(raw),'Cached published world');
    const bundled=loadGameWorld();
    if(cached.layout.updatedAt>=bundled.layout.updatedAt)return cached;
   }
  }catch{/* An invalid cache must never block gameplay. */}
  return loadGameWorld();
 }finally{clearTimeout(timeout)}
}
