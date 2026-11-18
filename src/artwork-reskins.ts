import {resolveWorksiteWarehouse} from './camp-worksites-art';
import {resolveAnimationDefaults} from './asset-animation-defaults';
import {resolveWorkshopArtwork} from './workshop-animation-art';
import {resolveTreatmentArtwork} from './treatment-animation-art';
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
 record=resolveTreatmentArtwork(resolveWorkshopArtwork(resolveSouthHeadquarters(resolveAnimationDefaults(record))));
 const worksite=resolveWorksiteWarehouse(record);if(worksite!==record)return worksite;
 // Match all states together so a new owner upload never mixes old and new frames.
 const structure=structureManifest.find(r=>r.entryId===record.id&&r.sourceId===record.config.base.id);
 const c=record.config;
 if(structure&&c.kind==='sprite'&&!c.roof&&structure.unlit?.sourceId===c.unlit?.id&&structure.frames.length===c.frames.length&&structure.frames.every((f,i)=>f.sourceId===c.frames[i].id)){
  const file=(source:typeof c.base,art:Pick<typeof c.base,'url'|'name'|'width'|'height'|'bytes'>)=>({...source,url:art.url,name:art.name,mime:'image/webp',width:art.width,height:art.height,bytes:art.bytes});
  return {...record,config:{...c,base:file(c.base,structure),frames:c.frames.map((source,i)=>file(source,structure.frames[i])),...(c.unlit&&structure.unlit?{unlit:file(c.unlit,structure.unlit)}:{})}};
 }
 const replacement=replacements.find(r=>r.entryId===record.id&&r.sourceId===record.config.base.id);
 if(!replacement||record.config.kind!=='sprite'||record.config.frames.length||record.config.roof||record.config.unlit)return record;
 return {...record,config:{...record.config,base:{...record.config.base,url:replacement.url,name:replacement.name,mime:'image/webp',width:replacement.width,height:replacement.height,bytes:replacement.bytes}}};
}
