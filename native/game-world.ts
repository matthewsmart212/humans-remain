import AsyncStorage from '@react-native-async-storage/async-storage';
import snapshot from './assets/world-snapshot.json';
import {installImportedArt} from '../src/imported-art';
import {validateLayout,type WorldLayout} from '../src/world-layout';
import {prepareAuthoredWorld} from '../src/authored-world';
import type {ArtworkRecord} from '../src/artwork-model';
import {loadingDeadline} from '../src/artwork-loading';
import {WORLD_URL} from './config';

export const WORLD_CACHE='safety-last-authored-world-v2';
export type SavedWorld={layout:WorldLayout;records:ArtworkRecord[];revision?:number;source?:string};
export function validateSavedWorld(raw:unknown,source:string):SavedWorld{
 const v=raw as SavedWorld;if(!v||!Array.isArray(v.records))throw Error('World artwork metadata is missing.');
 installImportedArt(v.records);
 const checked=validateLayout(v.layout);if(!checked.layout||checked.errors.length)throw Error(checked.errors.join(' ')||'The saved world is invalid.');
 return {...v,layout:prepareAuthoredWorld(checked.layout),source};
}
/** A saved draft is the authored game. The retired applied factory layout is ignored. */
export async function worldCandidates():Promise<{value:unknown;source:string}[]>{
 const candidates:{value:unknown;source:string}[]=[];
 const controller=new AbortController();
 try{
  const [world,art]=await loadingDeadline(Promise.all(['/api/world-layout','/api/asset-artwork?scope=world'].map(async route=>{
   const r=await fetch(WORLD_URL+route,{signal:controller.signal,cache:'no-store'});if(!r.ok)throw Error('The saved world could not download.');return r.json();
  })),12000,controller.signal);
  if(world.draft)candidates.push({value:{layout:world.draft,records:art.records,revision:world.revision},source:'Latest saved editor world'});
 }catch{/* Cached or bundled authored world remains playable offline. */}finally{controller.abort()}
 try{const cached=await AsyncStorage.getItem(WORLD_CACHE);if(cached)candidates.push({value:JSON.parse(cached),source:'Saved offline world'})}catch{}
 candidates.push({value:snapshot,source:'Included editor world'});return candidates;
}
