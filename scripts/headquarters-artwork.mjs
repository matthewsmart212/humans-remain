import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

// Read the same plans and authored images as the menu; never crop or replace
// world sprites. Both broken and restored states need bounded UI copies.
export async function headquartersArtwork(){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hq-artwork-'));
 try{
  const modules=['headquarters-model','camp-restoration','studio-play','authored-world','imported-art'];
  await build({stdin:{contents:modules.map(id=>`export * from './src/${id}';`).join(''),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error'});
  const m=createRequire(import.meta.url)(path.join(temp,'model.cjs'));
  const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));m.installImportedArt(snapshot.records);
  const layout=m.prepareAuthoredWorld(snapshot.layout),worlds=[m.createCampPlaySession(layout,undefined,'survival'),m.createCampPlaySession(layout)];
  const images=new Set([m.HQ_PAPER,m.HQ_BENCH_ART,...Object.values(m.BROKEN_CAMP_ART),'/survival/ui-field-kit-v1/logs.png','/survival/world-rocks-v1/river-stone-trio.webp','/survival/ui-backpack-v1/scrap.png','/survival/ironworks-v1/iron-ingot.png']);
  for(const w of worlds){
   for(const art of [...m.headquartersPlans(w).map(p=>p.art),...m.HQ_BUILDINGS.map(b=>m.buildingArt(w,b))]){images.add(art.image);if(art.overlay)images.add(art.overlay)}
   Object.assign(w.progression??(w.progression={}),{campLevel:2,briefed:true,repairPart:true,furnaceRestored:true,metalCrafted:true,fortified:true});
   for(const entry of m.discoveries(w))images.add(entry.image);
  }
  return [...images].sort();
 }finally{fs.rmSync(temp,{recursive:true,force:true})}
}

export function localArtwork(url){
 const redirects=JSON.parse(fs.readFileSync('server/lossless-artwork-redirects.json'));
 const seen=new Set();while(redirects[url]&&!seen.has(url)){seen.add(url);url=redirects[url]}
 return url.startsWith('/api/asset-files/')?'native/assets/world/'+url.split('/').at(-1)+'.png':'public'+url;
}

export function imageProcessor(){
 const require=createRequire(import.meta.url);
 return require(require.resolve('sharp',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES].filter(Boolean)}));
}
