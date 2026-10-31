import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),out=path.resolve(process.argv[2]||'../Humans-Remain-Cursor-Expo.zip');
if(out.startsWith(path.resolve('public')+'/'))throw Error('Source downloads belong outside the deployed runtime assets.');
const temp=fs.mkdtempSync('/tmp/humans-remain-source-'),base=path.join(temp,'Humans-Remain');
try{
 const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
 const selected=[...new Set(files)].filter(file=>{
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return false;
  if(/(^|\/)(node_modules|dist|\.expo|\.git|\.sites-runtime|\.qa|artwork-archive)(\/|$)/.test(file)||file.startsWith('.env')||/\.(zip|tar\.gz)$/.test(file))return false;
  if(file.startsWith('docs/'))return ['docs/APP-RUNTIME.md','docs/RIVER-QUALITY.md','docs/ASSET-CLEANUP.json','docs/NATIVE-VERIFICATION.json'].includes(file)||file.startsWith('docs/qa/')&&file.endsWith('.json');
  return true;
 });
 for(const file of selected){const dest=path.join(base,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest)}
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.rmSync(out,{force:true});
 execFileSync('zip',['-qr',out,'Humans-Remain'],{cwd:temp});
 execFileSync('unzip',['-tq',out],{stdio:'pipe'});
 console.log(JSON.stringify({archive:out,files:selected.length,bytes:fs.statSync(out).size,root:'Humans-Remain',launch:'cd native && npm ci && npx expo start'}));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
