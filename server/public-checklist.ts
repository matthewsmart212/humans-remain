import {HOME_TERRAIN} from '../src/terrain-art';
import {entries,type CatalogueEntry,type SavedRow} from '../src/catalogue-model';
import {withImportedArt} from '../src/imported-art';
import {isLibraryAssetId} from '../src/asset-library-policy';
import type {ArtworkRecord} from '../src/artwork-model';
import {categoryLabels} from '../src/catalogue-library';
import metadata from '../src/world-image-metadata.json';
import {libraryPublicStyle} from './library-public-style';

const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export function renderPublicChecklist(origin:string,_rows:SavedRow[],savedAvailable=true,artwork:ArtworkRecord[]=[],customEntries:CatalogueEntry[]=[]){
 const imported=new Map(artwork.map(r=>[r.id,r]));
 const assets=[...entries,...customEntries.filter(e=>isLibraryAssetId(e.id))].map(e=>withImportedArt(e,imported.get(e.id)));
 const url=(path:string)=>esc(new URL(path,origin).href);
 const preview=(e:CatalogueEntry)=>{
  if(!e.image)return '<span class="missing">Upload artwork to use this asset</span>';
  if(e.crop){const [x,y,w,h]=e.crop,[iw,ih]=(metadata as Record<string,number[]>)[e.image]||[2508,2508];return `<svg viewBox="${x} ${y} ${w} ${h}" aria-label="${esc(e.name)}"><image href="${url(e.image)}" width="${iw}" height="${ih}"/></svg>`;}
  return `<img src="${url(e.image)}" alt="${esc(e.name)}" loading="lazy">`;
 };
 const card=(e:CatalogueEntry)=>{
  const files=[...new Set(e.artworkExports?.length?e.artworkExports:e.image?[e.image]:[])];
  return `<article id="asset-${esc(e.id)}"><div class="preview">${preview(e)}</div><div class="body"><p class="meta">${esc(categoryLabels[e.category]||e.category)}</p><h4>${esc(e.name)}</h4><p>${esc(e.purpose||e.improvement)}</p>${e.image?`<a href="${url(e.image)}${e.image.startsWith('/api/asset-files/')?'?download=1':''}" download>Download image</a> · <a href="${url(e.image)}">Open artwork</a>`:''}${files.length>1?`<details><summary>Animation & layers (${files.length})</summary><div class="image-list">${files.map((path,i)=>`<a href="${url(path)}" download><img src="${url(path)}" alt="" loading="lazy"><span>${path===e.artPreview?.roof?'Roof':path===e.artPreview?.unlit?'Unlit':e.artPreview?.openFrames?.includes(path)?['Closed','Half open','Open 45°'][e.artPreview.openFrames.indexOf(path)]:`Image ${i+1}`}</span></a>`).join('')}</div></details>`:''}<details><summary>Asset details</summary><p>${esc(e.states)}</p><code>${esc(e.id)}</code></details></div></article>`;
 };
 const section=(id:string,title:string,list:CatalogueEntry[])=>list.length?`<section id="${id}"><h2>${esc(title)}</h2><div class="families">${list.map(card).join('')}</div></section>`:'';
 const camp=assets.filter(e=>e.category!=='Creatures'&&e.family!=='Perimeter walls'),walls=assets.filter(e=>e.family==='Perimeter walls'),creatures=assets.filter(e=>e.category==='Creatures');
 const updated=new Date(Math.max(...assets.map(e=>Date.parse(e.lastUpdatedAt)))).toLocaleString('en-GB',{timeZone:'Europe/London'});
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Humans Remain — Asset library</title><meta name="description" content="Current camp buildings, props, wall pieces and Scrapling robots."><style>${libraryPublicStyle}</style></head><body><main><header><div><small>HUMANS REMAIN</small><h1>Asset library</h1></div><a href="/#checklist">Open interactive library</a></header><p class="totals">${assets.length} assets · wall tiers 1 and 2<br>Last updated ${esc(updated)}</p><p>Your camp collection. Add new assets whenever you need them.</p>${savedAvailable?'':'<p>Saved marks are temporarily unavailable; artwork is shown below.</p>'}<nav><a href="#camp">Camp assets</a><a href="#walls">Walls</a><a href="#creatures">Scrap monsters</a><a href="/#editor">World Builder</a></nav><details class="terrain"><summary>Camp terrain · ${HOME_TERRAIN.fullSize} × ${HOME_TERRAIN.fullSize}</summary><img src="${url(HOME_TERRAIN.image)}" alt="Camp terrain map"><p><a href="${url(HOME_TERRAIN.fullImage)}" download>Download full-size terrain</a></p></details>${section('camp','Camp assets',camp)}${section('walls','Perimeter walls',walls)}${section('creatures','Scrap monsters',creatures)}<footer>Read-only library. Sign in as the site owner to upload or edit assets.</footer></main></body></html>`;
}
