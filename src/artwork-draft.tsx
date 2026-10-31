import React from 'react';
import type {CatalogueEntry} from './catalogue-model';
import type {ArtworkFile,ArtworkRecord} from './artwork-model';
import {ASSET_BY_ID,imageDimensions,type WorldAsset} from './world-assets';
import {emptyCollision,type AssetCollision,type CollisionPoint} from './asset-collision';
export type PendingImage={key:string;file?:File;stored?:ArtworkFile;url:string;width:number;height:number;name:string;sourceSize?:number[];crop?:number[];destination?:number[]};
export const fromStored=(f:ArtworkFile):PendingImage=>({key:f.id,stored:f,url:f.url,width:f.width,height:f.height,name:f.name});
function source(url:string,crop?:number[],canvas?:number[],destination?:number[]):PendingImage{const dim=imageDimensions[url]||[1254,1254],rect=crop||[0,0,...dim],size=canvas||rect.slice(2);return{key:url,url,name:url.split('/').pop()||'Artwork',width:size[0],height:size[1],sourceSize:dim,crop:rect,destination:destination||[0,0,...size]}}
export function existingArtwork(entry:CatalogueEntry,record?:ArtworkRecord){
 if(record){const c=record.config;return{base:fromStored(c.base),frames:c.frames.map(fromStored),roof:c.roof?fromStored(c.roof):undefined,idle:c.unlit?fromStored(c.unlit):undefined}}
 const a=ASSET_BY_ID.get(entry.id),url=a?.image||entry.image;if(!url)return{base:undefined,frames:[],roof:undefined,idle:undefined};
 const crop=a?.crop||entry.crop||[0,0,...(imageDimensions[url]||[1254,1254])],size=crop.slice(2),base=source(url,crop),frames=(a?.frames||entry.artPreview?.frames||[]).map(url=>source(url,crop)),roofUrl=a?.roof||entry.artPreview?.roof,idleUrl=a?.unlit||entry.artPreview?.unlit;
 const roof=roofUrl?source(roofUrl,undefined,size,a?.roofRect||entry.artPreview?.roofRect):undefined;
 let idle:PendingImage|undefined;
 if(idleUrl){const dim=imageDimensions[idleUrl]||[1254,1254],scale=size[0]/dim[0],anchor=a?.unlitAnchor,litAnchor=a?.anchor;const destination=anchor&&litAnchor?[litAnchor[0]-anchor[0]*scale,litAnchor[1]-anchor[1]*scale,dim[0]*scale,dim[1]*scale]:[0,0,...size];idle=source(idleUrl,undefined,size,destination)}
 return{base,frames,roof,idle};
}
export function assetOutline(a?:WorldAsset):AssetCollision|undefined{
 if(!a)return undefined;if(a.collision)return structuredClone(a.collision);
 const point=(x:number,y:number):CollisionPoint=>[Math.max(0,Math.min(1,x/a.width+a.anchor[0]/a.crop[2])),Math.max(0,Math.min(1,y/a.height+a.anchor[1]/a.crop[3]))];
 return{...emptyCollision(),lineWidth:Math.max(.002,Math.min(.1,(a.segments?.[0]?.r||a.width*.006)*2/a.width)),paths:[...a.body.map(b=>({closed:true,points:[point(b.x-b.hw,b.y-b.hh),point(b.x+b.hw,b.y-b.hh),point(b.x+b.hw,b.y+b.hh),point(b.x-b.hw,b.y+b.hh)]})),...(a.segments||[]).map(b=>({closed:false,points:[point(b.x,b.y),point(b.ex,b.ey)]}))]};
}
export function ArtworkImage({image,alt,className}:{image:PendingImage;alt:string;className?:string}){
 const r=image.crop||[0,0,image.width,image.height],d=image.destination||[0,0,image.width,image.height],size=image.sourceSize||[image.width,image.height];
 return <svg className={className} viewBox={`0 0 ${image.width} ${image.height}`} role="img" aria-label={alt} preserveAspectRatio="xMidYMid meet"><svg x={d[0]} y={d[1]} width={d[2]} height={d[3]} viewBox={r.join(' ')} preserveAspectRatio="none"><image href={image.url} width={size[0]} height={size[1]}/></svg></svg>;
}
/** Materialise original atlas crops only when saved; existing source art is kept. */
export async function imageFile(image:PendingImage):Promise<File>{
 if(image.file)return image.file;
 const response=await fetch(image.url);if(!response.ok)throw Error('An existing image could not be loaded. Retry without closing your changes.');const blob=await response.blob();
 if(!image.crop)return new File([blob],image.name,{type:blob.type});
 const bitmap=await createImageBitmap(blob);try{const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image preparation is unavailable.');ctx.drawImage(bitmap,...image.crop as [number,number,number,number],...image.destination as [number,number,number,number]);const out=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image preparation failed.')),'image/png'));return new File([out],image.name.replace(/\.[^.]+$/,'.png'),{type:'image/png'})}finally{bitmap.close()}
}
