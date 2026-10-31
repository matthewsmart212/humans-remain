// Run after the Sites build helper: its public-file copy can reintroduce older
// image URLs that the app's build already pruned. Only delete built copies with
// an explicit redirect and an existing local replacement; retain source art.
import fs from 'node:fs';
import path from 'node:path';
let files=0,bytes=0;
const root=path.resolve('dist/client');
for(const name of ['lossless-artwork-redirects','retired-road-redirects','river-quality-redirects']){
 const redirects=JSON.parse(fs.readFileSync('server/'+name+'.json'));
 for(const [old,next] of Object.entries(redirects)){
  const file=path.resolve(root,'.'+old),replacement=path.resolve(root,'.'+next);
  if(!file.startsWith(root+'/')||!replacement.startsWith(root+'/'))throw Error('Unexpected redirect path');
  if(!fs.existsSync(file))continue;
  if(!fs.existsSync(replacement))throw Error('Missing replacement for '+old);
  bytes+=fs.statSync(file).size;fs.unlinkSync(file);files++;
 }
}
// Match the existing build's retired tree exclusion if public files were copied
// again after its cleanup. The active catalogue uses the reviewed trees-v2 art.
for(const name of ['oak','birch','pine','deadwood']){
 const file=path.join(root,'survival/trees-v1/'+name+'.webp');
 if(!fs.existsSync(file))continue;
 if(!fs.existsSync(path.join(root,'survival/trees-v2/'+name+'.webp')))throw Error('Missing reviewed tree '+name);
 bytes+=fs.statSync(file).size;fs.unlinkSync(file);files++;
}
console.log(JSON.stringify({prunedBuiltCopies:files,bytes,sourceArtworkRetained:true}));
