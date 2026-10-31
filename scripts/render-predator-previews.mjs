import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const sharp=createRequire(import.meta.url)('sharp');
export async function renderPredatorPreviews(qa,manifest){
 for(const kind of ['boar','wolf'])for(const action of ['walk','run','attack']){
  const clip=manifest.combatClips[kind][action]??manifest.clips[action],inputs=[],delays=[];
  for(const dir of ['down','down-left','left','up-left','up'])for(let i=0;i<clip.frames.length;i++){
   const frame=clip.frames[i];inputs.push(fs.readFileSync(`${qa}/frames/${kind}/${dir}/${String(frame).padStart(2,'0')}-${manifest.frames[frame]}.png`));delays.push(clip.milliseconds[i]);
  }
  const output=`${qa}/${kind}-${action}.gif`;await sharp(inputs,{join:{animated:true}}).gif({loop:0,delay:delays}).toFile(output);
  // Decode every exported page, not merely the first thumbnail.
  const {info}=await sharp(output,{animated:true}).raw().toBuffer({resolveWithObject:true});
  if(info.width!==224||info.height<224*16)throw Error('Incomplete animation preview: '+output);
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){await renderPredatorPreviews('docs/qa/predator-sprites-v1',JSON.parse(fs.readFileSync('public/survival/predators-v1/artwork.json')));console.log('Six complete animation previews encoded and decoded successfully.');}
