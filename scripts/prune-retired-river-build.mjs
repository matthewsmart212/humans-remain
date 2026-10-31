import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
// Use a fresh destination on every build. Replacing an existing archived file
// is unreliable on the managed filesystem and can leave the old asset present.
fs.mkdirSync('.sites-runtime',{recursive:true});
const archive=fs.mkdtempSync('.sites-runtime/retired-river-build-');
const redirects={...JSON.parse(fs.readFileSync('server/calm-river-redirects.json','utf8')),...JSON.parse(fs.readFileSync('server/river-features-redirects.json','utf8'))};
// Retire lingering source exports too, so a subsequent public-directory copy
// cannot restore obsolete guide images after the build has been pruned.
let sourceArchive;
for(const old of Object.keys(redirects)){
 const publicSource='public'+old;
 if(fs.existsSync(publicSource)){
  sourceArchive??=fs.mkdtempSync('artwork-archive/retired-runtime/river-retired-exports-');
  const archived=sourceArchive+old;fs.mkdirSync(path.dirname(archived),{recursive:true});fs.renameSync(publicSource,archived);
 }
 const source='dist/client'+old,destination=archive+old;
 if(fs.existsSync(source)){fs.mkdirSync(path.dirname(destination),{recursive:true});fs.renameSync(source,destination)}
 assert(!fs.existsSync(source),'Superseded asset remained in build: '+old);
}
console.log('Excluded superseded river artwork from the publish bundle.');
