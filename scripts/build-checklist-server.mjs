import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
// Only generated output is replaced. Game source and artwork remain untouched.
fs.rmSync('dist',{recursive:true,force:true});
execFileSync(process.execPath,['scripts/build-world-plan.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build','--configLoader','runner'],{stdio:'inherit'});
// Retired exports now live under artwork-archive/retired-runtime. Keep these
// defensive exclusions in case a historical generation script is rerun.
// Retired sector artwork stays recoverable in source/history, never in the
// published active asset bundle. Old URL requests use the server redirect.
fs.rmSync('dist/client/survival/maps/consistent-terrain-v1',{recursive:true,force:true});
// Losslessly encoded sources stay recoverable in artwork-archive, not duplicated
// in the publish bundle. Old saved URLs redirect to the identical WebP pixels.
// Rename into a fresh ignored directory: unlinking alone can leave restored
// copies visible on the managed filesystem, inflating the publish archive.
fs.mkdirSync('.sites-runtime',{recursive:true});
const losslessArchive=fs.mkdtempSync('.sites-runtime/lossless-build-');
for(const old of Object.keys(JSON.parse(fs.readFileSync('server/lossless-artwork-redirects.json','utf8')))){
 const source='dist/client'+old,destination=losslessArchive+old;
 if(fs.existsSync(source)){fs.mkdirSync(path.dirname(destination),{recursive:true});fs.renameSync(source,destination)}
 assert(!fs.existsSync(source),'Original image remained in publish bundle: '+old);
}
execFileSync(process.execPath,['scripts/prune-retired-river-build.mjs'],{stdio:'inherit'});
// Superseded texture experiments are not loaded by the active world. Keep the
// originals in source, and redirect legacy image URLs to their current assets.
for(const retired of ['world-ground-v1','road-materials-v1','world-ground-v2/olive.webp','home-terrain-perimeter-v4-preview.webp'])fs.rmSync('dist/client/survival/'+retired,{recursive:true,force:true});
for(const name of ['built-ground-consistent-v1','built-ground-earth-v3','built-ground-regions-v1','built-ground-regions-v2','built-ground-world-v1','built-roads-textured-v1','built-roads-bedded-v2','built-river-headwaters-v1','river-headwaters-detail'])fs.rmSync(`dist/client/planning/${name}.webp`,{force:true});
// Superseded hearth and camp terrain textures are retained under
// artwork-archive/retired-runtime, outside Vite's published public directory.
// Whole road paintings are retained in source for editing and native packaging.
// The browser streams the replacement chunks; old tabs receive their aligned previews.
for(const old of Object.keys(JSON.parse(fs.readFileSync('server/retired-road-redirects.json','utf8'))))fs.rmSync('dist/client'+old,{force:true});
// Keep the original tree art in source for comparison/rollback, not as a second
// unused runtime texture set. Stable catalogue IDs now point to trees-v2.
fs.rmSync('dist/client/survival/trees-v1',{recursive:true,force:true});
// This artist download duplicates the individually loaded predator sprites.
// Retain the ZIP in source without spending the deployment's asset budget on it.
fs.rmSync('dist/client/survival/predators-v1/sprite-pack.zip',{force:true});
await build({entryPoints:['server/checklist.ts'],outfile:'dist/server/index.js',bundle:true,platform:'neutral',format:'esm',target:'es2022',define:{__INDEX_HTML__:JSON.stringify(fs.readFileSync('dist/client/index.html','utf8'))}});
fs.mkdirSync('dist/.openai',{recursive:true});
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
fs.cpSync('drizzle','dist/.openai/drizzle',{recursive:true});
