import {resolveWorksiteWarehouse} from './camp-worksites-art';
import {resolveAnimationDefaults} from './asset-animation-defaults';
import {resolveWorkshopArtwork} from './workshop-animation-art';
import type {ArtworkRecord} from './artwork-model';
import manifest from './wall-artwork-replacements.json';
import campManifest from './camp-artwork-replacements.json';
import structureManifest from './camp-structure-refresh.json';
import {resolveSouthHeadquarters} from './headquarters-south-art';
const replacements=[...manifest,...campManifest] as {entryId:string;sourceId:string;url:string;name:string;width:number;height:number;bytes:number}[];

/** Replace only the specific source uploads selected for artwork refreshes.
 * Stable catalogue IDs keep all placed copies linked. Normalized collision paths,
 * anchors and world dimensions remain authoritative; future uploads take priority.
 */
export function resolveArtworkReskin(record:ArtworkRecord):ArtworkRecord{
 record=resolveWorkshopArtwork(resolveSouthHeadquarters(resolveAnimationDefaults(record)));
 const worksite=resolveWorksiteWarehouse(record);if(worksite!==record)return worksite;
 // Registered ground-edge refreshes retain the original architectural pixels.
 // Animated bunker frames are an all-or-nothing match so a later owner upload
 // never becomes mixed with this particular three-frame doorway sequence.
 const structure=structureManifest.find(r=>r.entryId===record.id&&r.sourceId===record.config.base.id);
 if(structure&&record.config.kind==='sprite'&&!record.config.roof&&!record.config.unlit&&structure.frames.length===record.config.frames.length&&structure.frames.every((f,i)=>f.sourceId===record.config.frames[i].id)){
  const file=(source:ArtworkRecord['config']['base'],art:typeof structure)=>({...source,url:art.url,name:art.name,mime:'image/webp',width:art.width,height:art.height,bytes:art.bytes});
  return {...record,config:{...record.config,base:file(record.config.base,structure),frames:record.config.frames.map((source,i)=>file(source,{...structure,...structure.frames[i]}))}};
 }
 const replacement=replacements.find(r=>r.entryId===record.id&&r.sourceId===record.config.base.id);
 if(!replacement||record.config.kind!=='sprite'||record.config.frames.length||record.config.roof||record.config.unlit)return record;
 return {...record,config:{...record.config,base:{...record.config.base,url:replacement.url,name:replacement.name,mime:'image/webp',width:replacement.width,height:replacement.height,bytes:replacement.bytes}}};
}
