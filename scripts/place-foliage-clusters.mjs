import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const usage=`Place natural scenery clusters in an exported Humans Remain world.
  npm run foliage:clusters -- --input native/assets/world-snapshot.json --output .qa/foliage-clusters/world.json --seed 161126 --count 180
  Optional: --bounds x,y,width,height (world coordinates)
Writes a new world JSON and a placement-plan SVG beside it. Never publishes.
Re-running replaces this script's unlocked placements; other scenery stays put.`;
const args=process.argv.slice(2);
if(args.includes('--help')){console.log(usage);process.exit(0)}
const allowed=new Set(['--input','--output','--seed','--count','--bounds']),opts={};
for(let i=0;i<args.length;i+=2){if(!allowed.has(args[i])||!args[i+1]||args[i+1].startsWith('--'))throw Error(usage);opts[args[i].slice(2)]=args[i+1]}
const input=opts.input??'native/assets/world-snapshot.json',output=opts.output??'.qa/foliage-clusters/world.json';
if(path.resolve(input)===path.resolve(output))throw Error('Choose a separate output file so the source world stays available.');
const seed=Number(opts.seed??161126),count=Number(opts.count??180);
let bounds;
if(opts.bounds){const values=opts.bounds.split(',').map(Number);if(values.length!==4||values.some(n=>!Number.isFinite(n)))throw Error('Bounds must be x,y,width,height.');const [x,y,width,height]=values;bounds={x,y,width,height}}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'foliage-composition-'));
try{
 await build({stdin:{contents:"export * from './src/foliage-composition';export * from './src/authored-world';export * from './src/imported-art';export * from './src/world-layout';export * from './src/world-assets';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'model.mjs')});
 const m=await import(pathToFileURL(path.join(temp,'model.mjs'))),source=JSON.parse(fs.readFileSync(input,'utf8'));
 m.installImportedArt(source.records??[]);
 const key=source.layout?'layout':source.draft?'draft':null,raw=key?source[key]:source,checked=m.validateLayout(raw);
 if(!checked.layout||checked.errors.length)throw Error('Invalid input world: '+checked.errors.join(' '));
 const prepared=m.prepareAuthoredWorld(checked.layout),result=m.composeFoliageClusters(prepared,{seed,count,bounds});
 const verified=m.validateLayout(result.layout);if(!verified.layout||verified.errors.length)throw Error(verified.errors.join(' '));
 fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(output,JSON.stringify(key?{...source,[key]:result.layout}:result.layout,null,2)+'\n');
 const plants=result.layout.items.filter(m.decorativeFoliage),boxes=result.layout.items.map(m.foliageEnvelope),left=Math.min(...boxes.map(b=>b.x)),top=Math.min(...boxes.map(b=>b.y)),right=Math.max(...boxes.map(b=>b.x+b.width)),bottom=Math.max(...boxes.map(b=>b.y+b.height));
 const marks=result.layout.items.filter(p=>!m.decorativeFoliage(p)).map(p=>{const b=m.foliageEnvelope(p),colour=p.assetId.startsWith('art_forage_')?'#edb04c':'#655c4f';return `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="${colour}" opacity=".55"/>`});
 for(const p of plants){const b=m.foliageEnvelope(p);marks.push(`<ellipse cx="${b.x+b.width/2}" cy="${b.y+b.height/2}" rx="${b.width/2}" ry="${b.height/2}" fill="${p.id.startsWith(m.FOLIAGE_CLUSTER_PREFIX)?'#9dcb6e':'#536d45'}" opacity=".8"/>`)}
 fs.writeFileSync(output.replace(/\.json$/i,'')+'-plan.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left-100} ${top-100} ${right-left+200} ${bottom-top+200}"><title>Scenery placement plan: light green new clusters, dark green existing foliage, gold food</title><rect x="${left-100}" y="${top-100}" width="${right-left+200}" height="${bottom-top+200}" fill="#22251e"/>${marks.join('')}</svg>`);
 console.log(JSON.stringify({output,seed,requested:count,added:result.added,clusters:result.clusters,total:result.layout.items.length,remainingSlots:5000-result.layout.items.length,sourcePreserved:true},null,2));
 if(result.added<count)console.log('Some plants were skipped to preserve clearances and the world item limit.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
