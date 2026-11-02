import {invalidateLayoutViews} from './layout-views';
import {currentArtworkSources} from './artwork-source-policy';
import {invalidateFoliageMotion} from './foliage-motion';
import {resolveArtworkReskin} from './artwork-reskins';
import type {ArtworkRecord} from './artwork-model';
import {customCatalogueEntry,type CustomAsset} from './custom-assets';
import {entries,type CatalogueEntry} from './catalogue-model';
import {ASSET_BY_ID,WORLD_ASSETS,imageDimensions,type WorldAsset} from './world-assets';
import {installWallTiers} from './world-tiers';
import {addCampGround} from './camp-ground-art';
import {withSouthHeadquartersGeometry} from './headquarters-south-art';
const originalAssets=new Map(ASSET_BY_ID);
export function withImportedArt(entry:CatalogueEntry,record?:ArtworkRecord):CatalogueEntry{
 if(!record)return entry;record=resolveArtworkReskin(record);const c=record.config;
 return{...entry,image:c.base.url,crop:undefined,lastUpdatedAt:record.updatedAt,artReadiness:'Imported artwork · review before approval',artPreview:{frames:c.frames.length?c.frames.map(f=>f.url):undefined,unlit:c.unlit?.url,roof:c.roof?.url,roofRect:c.roof?[0,0,c.base.width,c.base.height]:undefined,worldWidth:c.kind==='building'?c.worldWidth:undefined,fps:c.fps,animationMode:c.animationMode},artworkExports:[...new Set([c.base.url,...c.frames.map(f=>f.url),c.roof?.url,c.unlit?.url].filter((s):s is string=>!!s))],sourceReferences:currentArtworkSources([...new Set([entry.image,...(entry.sourceReferences||[]),...(entry.artworkExports||[])].filter((s):s is string=>!!s))])};
}
export function importedWorldAsset(record:ArtworkRecord):WorldAsset{
 record=resolveArtworkReskin(record);
 const c=record.config,old=originalAssets.get(record.id),e=entries.find(e=>e.id===record.id)||(record.customAsset&&customCatalogueEntry(record.customAsset))||{name:old?.name||record.id,family:old?.group||'Archived artwork',category:'Archived artwork'},width=c.worldWidth,height=width*c.base.height/c.base.width;
 const a:WorldAsset={id:record.id,catalogueId:record.id,name:e.name,group:e.family||e.category,image:c.base.url,crop:[0,0,c.base.width,c.base.height],anchor:[c.anchor[0]*c.base.width,c.anchor[1]*c.base.height],width,height,solid:c.solid,allowTransparency:c.allowTransparency!==false,role:old?.role||'prop',body:c.solid?[{x:0,y:-height*c.footprint.depth/2,hw:width*c.footprint.width/2,hh:height*c.footprint.depth/2}]:[],frames:c.frames.length?c.frames.map(f=>f.url):undefined,animationArea:c.animationArea,fps:c.fps,animationMode:c.animationMode,unlit:c.unlit?.url,unlitAnchor:[c.anchor[0]*c.base.width,c.anchor[1]*c.base.height],unlitSize:[c.base.width,c.base.height],roof:c.roof?.url,roofRect:c.roof?[0,0,c.base.width,c.base.height]:undefined,note:old?.note||'Imported artwork · visual prop'};
 if(c.kind==='building'&&c.building){const b=c.building,left=(b.left-c.anchor[0])*width,top=(b.top-c.anchor[1])*height,w=(b.right-b.left)*width,h=(b.bottom-b.top)*height;
  a.body=[];a.interior={x:left,y:top,width:w,height:h};const thick=8;
  for(const side of ['north','south','west','east'] as const){const horizontal=side==='north'||side==='south',length=horizontal?w:h,ranges=side===b.doorSide?[[0,b.doorStart*length],[b.doorEnd*length,length]]:[[0,length]];
   for(const [start,end] of ranges)if(end>start)a.body.push(horizontal?{x:left+(start+end)/2,y:top+(side==='south'?h:0),hw:(end-start)/2,hh:thick}:{x:left+(side==='east'?w:0),y:top+(start+end)/2,hw:thick,hh:(end-start)/2});
  }
  // Repaint the front wall strips above the worker, keeping the doorway unobscured.
  const y=b.bottom-.12;const parts=b.doorSide==='south'?[[b.left,b.left+(b.right-b.left)*b.doorStart],[b.left+(b.right-b.left)*b.doorEnd,b.right]]:[[b.left,b.right]];
  a.foreground=parts.map(([l,r])=>[l*c.base.width,Math.max(0,y)*c.base.height,(r-l)*c.base.width,(b.bottom-Math.max(0,y))*c.base.height]);a.note='Imported interior + roof · verify wall bounds in the editor';
 }
 if(c.collision){a.collision=c.solid?c.collision:{...c.collision,paths:[]};a.body=[];a.segments=[];}
 if(!c.solid){a.body=[];a.segments=[];}
 // Artwork replacements keep the plant's behaviour; all copies still share one texture.
 if(old?.foliage){a.foliage=true;a.solid=false;a.body=[];a.segments=[];a.collision={lineWidth:.008,paths:[]};a.allowTransparency=false;}
 if(old?.gate){a.gate=old.gate;a.perimeter=old.perimeter;}
 if(old?.puddle){a.puddle=old.puddle;a.solid=false;a.body=[];a.segments=[];a.collision={lineWidth:.008,paths:[]};a.allowTransparency=false;}
 return addCampGround(withSouthHeadquartersGeometry(a));
}
export function assetMapWithImports(records:ArtworkRecord[]){const map=new Map(originalAssets);for(const record of records)if(originalAssets.has(record.id)||entries.some(e=>e.id===record.id)||record.customAsset?.id===record.id)map.set(record.id,importedWorldAsset(record));return installWallTiers(map);}
export function installImportedArt(records:ArtworkRecord[]){invalidateLayoutViews();invalidateFoliageMotion();records=records.map(resolveArtworkReskin);const map=assetMapWithImports(records);ASSET_BY_ID.clear();for(const [id,a]of map){ASSET_BY_ID.set(id,a);if(a.image.startsWith('/survival/wall-tiers-v1/'))imageDimensions[a.image]=[a.crop[2],a.crop[3]];if(a.ground)imageDimensions[a.ground.image]=a.ground.size}WORLD_ASSETS.splice(0,WORLD_ASSETS.length,...map.values());for(const r of records)for(const f of [r.config.base,...r.config.frames,r.config.roof,r.config.unlit])if(f)imageDimensions[f.url]=[f.width,f.height];}
export async function fetchArtwork(origin=''){const response=await fetch(origin+'/api/asset-artwork?scope=world',{cache:'no-store'});if(!response.ok)throw Error('Imported artwork is unavailable. Retry before editing the world.');return await response.json() as {records:ArtworkRecord[];customAssets:CustomAsset[];canEdit:boolean};}
