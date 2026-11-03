import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

/** Assemble a fresh output tree containing only the selected exports. This
 * also prevents a later packaging walk from rediscovering retired entries in
 * a reused output directory. Original artwork remains in public/source. */
export function finalizePublishAssets(circularWallImages,historicalPublishExports){
 const source=path.resolve('dist'),stage=fs.mkdtempSync(path.resolve('.sites-runtime/final-publish-'));
 const target=path.join(stage,'dist');
 const wallFolders=['camp-circular-wall-v1','camp-circular-wall-install-v1','camp-circular-wall-weathered-v1','camp-circular-wall-ne-v2','camp-circular-wall-nw-v1'];
 // Repeat every build exclusion while selecting the final tree. A reused
 // output directory can otherwise rediscover earlier removed exports during
 // packaging, exceeding the host's 256 MiB compressed-input limit.
 const redirected=Object.keys(Object.assign({},...['lossless-artwork','retired-road','calm-river','river-features','river-quality'].map(name=>JSON.parse(fs.readFileSync(`server/${name}-redirects.json`,'utf8')))));
 const retired=[...historicalPublishExports,...redirected,
  '/survival/headquarters-south-v1/interior.webp','/survival/headquarters-south-v1/ruined-interior.webp','/survival/headquarters-south-v1/cutaway.webp','/survival/headquarters-south-v1/ruined-cutaway.webp',
  '/survival/headquarters-south-v1/ground-contact-v4.webp','/survival/headquarters-south-v1/ground-contact-v5.webp',
  '/survival/predators-v1/sprite-pack.zip','/survival/trees-v1',
  '/survival/maps/consistent-terrain-v1','/survival/world-ground-v1',
  '/survival/road-materials-v1','/survival/world-ground-v2/olive.webp',
  '/survival/home-terrain-perimeter-v4-preview.webp',
  '/survival/camp-ruins-v1/headquarters.webp','/survival/camp-ruins-v1/headquarters-interior.webp'];
 let excluded=0,bytes=0;
 fs.cpSync(source,target,{recursive:true,filter:filename=>{
  const relative=path.relative(source,filename).split(path.sep).join('/');
  const url=relative.startsWith('client/')?'/'+relative.slice(7):'';
  const previewSource=url.startsWith('/previews/dawn-camp/')&&fs.statSync(filename).isFile()&&path.basename(filename)!=='watch.html';
  const unused=previewSource||url.startsWith('/api/asset-files/')||retired.some(old=>url===old||url.startsWith(old+'/'))||
   wallFolders.some(folder=>url.startsWith('/survival/'+folder+'/'))&&fs.statSync(filename).isFile()&&!circularWallImages.has(url);
  if(unused){excluded++;if(fs.statSync(filename).isFile())bytes+=fs.statSync(filename).size;return false}
  return true;
 }});
 for(const url of circularWallImages)assert(fs.existsSync(path.join(target,'client'+url)),'Required wall: '+url);
 for(const file of ['cutaway-v3','exterior','ruined-cutaway-v3','ruined','settled-ground-v6','rooted-footing-v6'])assert(fs.existsSync(path.join(target,'client/survival/headquarters-south-v1',file+'.webp')),'Required headquarters state: '+file);
 for(const url of retired)assert(!fs.existsSync(path.join(target,'client'+url)),'Retired export cannot enter the final publish tree: '+url);
 const previous=fs.mkdtempSync(path.resolve('.sites-runtime/previous-dist-'));
 fs.renameSync(source,path.join(previous,'dist'));fs.renameSync(target,source);
 console.log(JSON.stringify({finalPublishTree:true,excludedRediscoveredExports:excluded,excludedBytes:bytes}));
}
