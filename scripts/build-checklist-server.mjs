import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {finalizePublishAssets} from './finalize-publish-assets.mjs';
// Only generated output is replaced. Game source and artwork remain untouched.
fs.rmSync('dist',{recursive:true,force:true});
execFileSync(process.execPath,['scripts/build-world-plan.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build','--configLoader','runner'],{stdio:'inherit'});
// /api/asset-files/* is served exclusively by the Worker's database/R2 artwork
// handler before static assets. Native/offline source copies remain under public/;
// publishing this local cache only duplicates R2 images in the archive.
fs.mkdirSync('.sites-runtime',{recursive:true});
const apiArtworkCache='dist/client/api/asset-files';
const apiArtworkArchive=fs.mkdtempSync('.sites-runtime/api-artwork-build-');
if(fs.existsSync(apiArtworkCache))fs.renameSync(apiArtworkCache,path.join(apiArtworkArchive,'asset-files'));
assert(!fs.existsSync(apiArtworkCache),'R2 artwork cache remained in publish bundle');
// Interrupted asset copies can leave dot-prefixed temporary images/ZIPs under
// public/. They are never runtime URLs and must not duplicate source art in dist.
const temporaryArtArchive=fs.mkdtempSync('.sites-runtime/temporary-art-build-');
function excludeTemporaryArt(directory){
 for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
  const source=path.join(directory,entry.name);
  if(entry.isDirectory()){excludeTemporaryArt(source);continue}
  if(!/^\..+\.(?:png|jpe?g|webp|zip)\.[A-Za-z0-9]{6}$/.test(entry.name))continue;
  const destination=path.join(temporaryArtArchive,path.relative('dist/client',source));
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.renameSync(source,destination);
  assert(!fs.existsSync(source),'Temporary artwork remained in publish bundle: '+source);
 }
}
excludeTemporaryArt('dist/client/survival');
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
// The circular-wall kit includes editable PNGs and unused closed-ring pieces.
// Preserve every original in public/source, but publish only the active and
// saved-world compatibility WebPs referenced by runtime metadata.
const circularWallImages=new Set(JSON.parse(fs.readFileSync('src/camp-circular-wall-art.json','utf8')).map(entry=>entry.image));
const wallBuildArchive=fs.mkdtempSync('.sites-runtime/circular-wall-build-');
let excludedWallBytes=0,excludedWallFiles=0;
for(const folder of ['camp-circular-wall-v1','camp-circular-wall-install-v1','camp-circular-wall-weathered-v1','camp-circular-wall-ne-v2']){
 const directory='dist/client/survival/'+folder;
 for(const name of fs.readdirSync(directory)){
  const url='/survival/'+folder+'/'+name,source=directory+'/'+name;
  if(circularWallImages.has(url))continue;
  const destination=wallBuildArchive+'/'+folder+'/'+name;
  excludedWallBytes+=fs.statSync(source).size;excludedWallFiles++;
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.renameSync(source,destination);
  assert(!fs.existsSync(source),'Unused wall export remained in publish bundle: '+url);
 }
}
for(const image of circularWallImages)assert(fs.existsSync('dist/client'+image),'Required wall image missing from publish bundle: '+image);
console.log(JSON.stringify({publishedCircularWallImages:circularWallImages.size,excludedWallFiles,excludedWallBytes,originalArtworkPreserved:true}));
// These specific historic exports have no current source, native or compiled
// runtime references. Keep their editable originals under public/ and in Git,
// but omit them from the host's expanded-archive budget. The active grain SVG,
// illustrated map and v3 walker sprites remain in the published bundle.
const historicalPublishExports=[
 '/maps/world-terrain.webp','/maps/world-terrain.json','/survival/scrap-walker-v2',
 // Unused sword study, retired HQ map art and duplicate food PNG exports.
 // Source/native copies remain available; the browser uses the food WebPs.
 '/survival/scrap-runner/sword-west-study-v1.webp',
 '/survival/headquarters-menu-v1/camp-plan.webp',
 '/survival/chicken-food-v1/raw-chicken.png','/survival/chicken-food-v1/cooked-chicken.png',
 ...['arena','ben-avatar','challenge-heading','dave-avatar','faceoff','factory-background','flattened-stamp-v3','flattened','locker-background','metal-texture','night-card','night-scene','night-worker','paper-texture','press-worker','result-stamp','results-background-v3','room-background','sarah-avatar','uniform-card','worker'].map(name=>'/art/'+name+'.webp'),
];
const historicalBuildArchive=fs.mkdtempSync('.sites-runtime/historical-publish-');
for(const url of historicalPublishExports){
 const source='dist/client'+url,destination=historicalBuildArchive+url;
 if(!fs.existsSync(source))continue;
 fs.mkdirSync(path.dirname(destination),{recursive:true});fs.renameSync(source,destination);
 assert(!fs.existsSync(source),'Historical source export remained in publish bundle: '+url);
}
for(const active of ['/art/grain.svg','/maps/world-illustrated.webp','/survival/scrap-walker-v3/atlas.json'])assert(fs.existsSync('dist/client'+active),'Active artwork must remain published: '+active);
await build({entryPoints:['server/checklist.ts'],outfile:'dist/server/index.js',bundle:true,platform:'neutral',format:'esm',target:'es2022',define:{__INDEX_HTML__:JSON.stringify(fs.readFileSync('dist/client/index.html','utf8'))}});
fs.mkdirSync('dist/.openai',{recursive:true});
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
fs.cpSync('drizzle','dist/.openai/drizzle',{recursive:true});
finalizePublishAssets(circularWallImages,historicalPublishExports);
