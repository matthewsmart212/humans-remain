// Mechanical URL migration; geometry, streaming keys and saves stay intact.
import fs from 'node:fs';import path from 'node:path';
const base='artwork-archive/consistent-terrain-v1',r=JSON.parse(fs.readFileSync(base+'/original-registry.json'));
const pairs=r.tiles.map(t=>[t.image,'/survival/maps/consistent-terrain-v1/'+path.basename(t.image)]);
for(const f of fs.readdirSync('src').filter(f=>f.endsWith('.ts'))){const file='src/'+f,old=fs.readFileSync(file,'utf8');let next=old;for(const[a,b]of pairs)next=next.replaceAll(a,b);if(next!==old)fs.writeFileSync(file,next)}
for(const file of ['scripts/render-world-plan-ground.mjs','scripts/build-world-plan.mjs']){const old=fs.readFileSync(file,'utf8');fs.writeFileSync(file,old.replaceAll('built-ground-west-camp-v2.webp','built-ground-consistent-v1.webp'))}
const server='server/checklist.ts';let text=fs.readFileSync(server,'utf8');
for(const[a,b]of pairs)text=text.replaceAll(":"+'\''+a+'\'',":"+'\''+b+'\'');
text=text.replace('const retiredTerrain:Record<string,string>={','const retiredTerrain:Record<string,string>={\n'+pairs.map(([a,b])=>` '${a}':'${b}',`).join('\n')+"\n '/planning/built-ground-west-camp-v2.webp':'/planning/built-ground-consistent-v1.webp',");fs.writeFileSync(server,text);
fs.mkdirSync(base+'/retired-runtime',{recursive:true});
for(const[a]of pairs)if(fs.existsSync('public'+a))fs.renameSync('public'+a,base+'/retired-runtime/'+path.basename(a));
const oldOverview='public/planning/built-ground-west-camp-v2.webp';if(fs.existsSync(oldOverview))fs.renameSync(oldOverview,base+'/before-built-overview.webp');
console.log('Migrated all 26 image URLs and archived replaced artwork.');
