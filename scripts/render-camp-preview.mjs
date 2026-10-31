// Shared renderer smoke test; this does not replace physical-device Skia testing.
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
const cache=new Map();
function sourceURL(file){if(!cache.has(file)){const code=ts.transpileModule(fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from (['"])(\.\/[^'"]+)\1/g,(_,q,p)=>'from '+JSON.stringify(sourceURL(p.slice(2)+'.ts')));cache.set(file,'data:text/javascript;base64,'+Buffer.from(code).toString('base64'));}return cache.get(file);}
const {drawSurvival}=await import(sourceURL('survival-renderer.ts'));
const {createWorld}=await import(sourceURL('survival-engine.ts'));
const src=fs.readFileSync('native/App.tsx','utf8');
const imgs={};for(const [,key,file] of src.matchAll(/(\w+):require\('\.\.\/(public\/[^']+\.(?:png|webp))'\)/g))imgs[key]=await loadImage(file);
GlobalFonts.registerFromPath('public/fonts/barlow-condensed-black.ttf','Barlow Condensed');
const atlas=JSON.parse(fs.readFileSync('public/packaging/atlas.json','utf8'));
const out=process.argv[2]||'/tmp/safety-last-camp-preview';fs.mkdirSync(out,{recursive:true});
for(const mode of ['day','night','blackout']){const w=createWorld();w.player.x=w.camp.storage.x;w.player.y=w.camp.hearth.y+90;if(mode!=='day')w.phase='night';if(mode==='blackout'){w.generator.fuel=0;w.camp.hearth.fuel=0;}const canvas=createCanvas(1280,720);drawSurvival(canvas.getContext('2d'),atlas,imgs,w,()=>createCanvas(1,1));fs.writeFileSync(out+'/'+mode+'.png',canvas.toBuffer('image/png'));}
console.log('Rendered day, night and blackout previews to '+out);
