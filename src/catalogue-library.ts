import {type CatalogueEntry} from './catalogue-model';
export const categoryLabels:Record<string,string>={
 'Camp hearth, shelter and medical care':'Hearth, shelter & care',
 'Cooking, food production and farming':'Food & farming',
 'Water collection, storage and treatment':'Water',
 'Crafting, repairs and material processing':'Workshop & repairs',
 'Storage and logistics':'Storage & hauling',
 'Defences and warnings':'Defences & warnings',
 'Lighting and power':'Lighting & power',
 'Exploration, communication and visitors':'Exploration & visitors',
 'Optional social spaces and decoration':'Social & decoration',
 'Creatures':'Scrap monsters',
};
const core=['Headquarters','Camp bonfire','Well','Workshop','Treatment centre','Headquarters furniture','Perimeter walls','Scrap monsters'];
export type CatalogueFamily={key:string;name:string;category:string;items:CatalogueEntry[];base:CatalogueEntry};
export function groupCatalogue(list:CatalogueEntry[]):CatalogueFamily[]{
 const tiers=new Set(list.filter(e=>e.tier!==null).map(e=>e.category+'|'+e.family));const groups=new Map<string,CatalogueFamily>();
 for(const e of list){const family=e.category+'|'+e.family,key=tiers.has(family)?family:e.id;let g=groups.get(key);if(!g){g={key,name:tiers.has(family)?e.family:e.name,category:e.category,items:[],base:e};groups.set(key,g)}g.items.push(e)}
 for(const g of groups.values()){g.items.sort((a,b)=>(a.tier??99)-(b.tier??99));g.base=g.items[0]}
 const rank=(g:CatalogueFamily)=>{const n=core.indexOf(g.base.family);return n>=0?n:100+Number(g.base.phase.slice(1))*10+(['Critical','High','Medium','Low'].indexOf(g.base.priority)+1)};
 return [...groups.values()].sort((a,b)=>rank(a)-rank(b)||a.name.localeCompare(b.name));
}
export async function downloadArtwork(e:CatalogueEntry){
 if(!e.image)return;
 if(!e.crop){const a=document.createElement('a');a.href=e.image+(e.image.startsWith('/api/asset-files/')?'?download=1':'');a.download=e.image.split('/').pop()||e.id;a.click();return}
 const im=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('The artwork could not be downloaded.'));img.src=e.image!});
 const [x,y,w,h]=e.crop,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d')!.drawImage(im,x,y,w,h,0,0,w,h);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image export failed')),'image/png')),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=e.id+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
