import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),inventory=JSON.parse(fs.readFileSync('.qa/native-world/asset-inventory.json'));
const keep=new Set(inventory.protected),removed=[];
const walk=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]):[];
const remove=(file,reason)=>{
 const absolute=path.resolve(file);if(!absolute.startsWith(root+'/'))throw Error('Cleanup must remain in the project.');
 if(keep.has(absolute))throw Error('Attempted to remove protected artwork: '+file);
 if(!fs.existsSync(file))return;
 const bytes=fs.statSync(file).size;fs.unlinkSync(file);removed.push({file,bytes,reason});
};
// Never touch uploaded storage or live world data. This list is derived from
// the saved world, current editor catalogue, wall tiers and terrain manifests.
for(const file of walk('public/survival'))if(!keep.has(path.resolve(file)))remove(file,'Retired or superseded runtime art');
for(const file of walk('artwork-archive'))remove(file,'Historical artwork source; recoverable in Git history');
for(const file of [...walk('public/packaging'),...walk('public/downloads'),...walk('native/assets').filter(f=>f.endsWith('.wav')),...walk('native/.expo')])remove(file,'Retired factory mode or stale generated export');
for(const file of ['src/SurvivalGame.tsx','src/AssetYard.tsx','src/asset-yard.ts','src/asset-yard-art.ts','src/PackagingGame.tsx','src/survival-renderer.ts','src/legacy-world-art.json','src/world-image-sources.ts','src/packaging-engine.ts','src/survival.css','src/asset-yard.css','src/world-packaging-atlas.json'])remove(file,'Unmounted retired game mode');
// Retain only the tiny shared type; the active character renderer no longer
// needs the obsolete packaging game's texture atlas or drawing implementation.
fs.writeFileSync('src/packaging-renderer.ts','/** Shared artwork frame shape; no legacy packaging game is bundled. */\nexport type Atlas={frames:Record<string,{sheet:string;rect:[number,number,number,number];anchor:[number,number]}>};\n');
const existing=fs.existsSync('docs/ASSET-CLEANUP.json')?JSON.parse(fs.readFileSync('docs/ASSET-CLEANUP.json')).removed:[];
const all=[...existing,...removed],report={date:'2026-10-18',placed:inventory.placed,protected:keep.size,removedFiles:all.length,removedBytes:all.reduce((n,f)=>n+f.bytes,0),recovery:'Files remain recoverable in repository history before this cleanup.',removed:all};
fs.writeFileSync('docs/ASSET-CLEANUP.json',JSON.stringify(report,null,2)+'\n');
const redirects=Object.assign({},...['lossless-artwork','retired-road','calm-river','river-features','river-quality'].map(n=>JSON.parse(fs.readFileSync(`server/${n}-redirects.json`))));
const urls=new Set(all.filter(f=>f.file.startsWith('public/survival/')).map(f=>f.file.slice(6)));
const collect=value=>{if(typeof value==='string'&&value.startsWith('/survival/'))urls.add(value);else if(value&&typeof value==='object')Object.values(value).forEach(collect)};
collect(JSON.parse(fs.readFileSync('src/base-catalogue.json')));
const retired=[...urls].filter(url=>{const seen=new Set();while(redirects[url]&&!seen.has(url)){seen.add(url);url=redirects[url]}return !fs.existsSync('public'+url)}).sort();
fs.writeFileSync('src/retired-artwork-paths.json',JSON.stringify(retired,null,2)+'\n');
console.log(JSON.stringify({removed:removed.length,bytes:removed.reduce((n,f)=>n+f.bytes,0),protected:keep.size}));
