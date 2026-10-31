import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'predator-pack-')),qa=path.resolve('docs/qa/predator-sprites-v1'),out=path.resolve('public/survival/predators-v1');
try{
 for(const kind of ['boar','wolf'])fs.cpSync(path.join(out,kind),path.join(temp,'atlases-webp',kind),{recursive:true});
 fs.cpSync(path.join(qa,'frames'),path.join(temp,'individual-png'),{recursive:true});fs.mkdirSync(path.join(temp,'atlases-png'));fs.mkdirSync(path.join(temp,'previews'));
 for(const file of fs.readdirSync(qa)){if(file.endsWith('.png'))fs.copyFileSync(path.join(qa,file),path.join(temp,'atlases-png',file));if(file.endsWith('.gif'))fs.copyFileSync(path.join(qa,file),path.join(temp,'previews',file))}
 for(const file of ['artwork.json'])fs.copyFileSync(path.join(out,file),path.join(temp,file));
 fs.copyFileSync(path.join(root,'docs/PREDATOR-SPRITES.md'),path.join(temp,'README.md'));fs.copyFileSync(path.join(qa,'generation.json'),path.join(temp,'generation.json'));fs.cpSync(path.join(qa,'sources'),path.join(temp,'provenance'),{recursive:true});
 const archive=path.join(out,'sprite-pack.zip');execFileSync('zip',['-q','-r',archive,'.'],{cwd:temp});console.log(JSON.stringify({archive,bytes:fs.statSync(archive).size}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
