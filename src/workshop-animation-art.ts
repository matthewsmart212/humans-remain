import type {ArtworkRecord} from './artwork-model';
import imageBytes from './workshop-image-bytes.json';

export const WORKSHOP_ART_ROOT='/survival/camp-workshop-v2';
export const WORKSHOP_IDLE_FRAMES=Array.from({length:16},(_,index)=>`${WORKSHOP_ART_ROOT}/idle-${String(index).padStart(2,'0')}.webp`);
export const WORKSHOP_BROKEN_IMAGE=`${WORKSHOP_ART_ROOT}/broken.webp`;

/** Refresh legacy workshop uploads while retaining saved placement geometry. */
export function resolveWorkshopArtwork(record:ArtworkRecord):ArtworkRecord{
 const config=record.config;
 if(record.id!=='base_workshop_t1'||!config.base.url.startsWith('/survival/camp-workshop-v1/'))return record;
 const file=(url:string)=>{
  const name=url.split('/').pop()!;
  return {...config.base,id:`workshop-v2-${name}`,url,name,mime:'image/webp' as const,width:627,height:627,bytes:imageBytes[name as keyof typeof imageBytes]};
 };
 return {...record,config:{...config,base:file(WORKSHOP_IDLE_FRAMES[0]),frames:WORKSHOP_IDLE_FRAMES.map(file),fps:25/6,animationMode:'loop'}};
}
