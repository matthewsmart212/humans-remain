// Review actual registered pixels at unchanged joins and both finished road ends.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require('@napi-rs/canvas');
const kit=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(kit,'../..');
const read=p=>JSON.parse(fs.readFileSync(p));
const before={art:read(path.join(kit,'previous-art.json')),plan:read(path.join(kit,'previous-layout.json'))};
const after={art:read(path.join(repo,'src/camp-circular-wall-art.json')),plan:read(path.join(repo,'src/camp-circular-wall-layout.json'))};
const imgs=new Map();for(const a of [...before.art,...after.art])if(!imgs.has(a.image))imgs.set(a.image,await loadImage(path.join(repo,'public'+a.image)));
const draw=(ctx,model,bounds,k)=>{for(const {p,a} of model.plan.placements.map(p=>({p,a:model.art.find(a=>a.id===p.assetId)})).sort((a,b)=>a.a.drawOrder-b.a.drawOrder))ctx.drawImage(imgs.get(a.image),(p.x-a.anchor[0]*a.width-bounds.left)*k,(p.y-a.anchor[1]*a.height-bounds.top)*k,a.width*k,a.height*k)};
const [cx,cy]=after.plan.centre,at=a=>[cx+1650*Math.sin(a*Math.PI/180),cy-1650*Math.cos(a*Math.PI/180)];
const cases=[['01 / 02 join',22.5],['02 road post',47],['03 road post',57],['03 / 04 join',67.5]];
const sheet=createCanvas(1600,1420),ctx=sheet.getContext('2d');ctx.fillStyle='#23332c';ctx.fillRect(0,0,1600,1420);
for(let row=0;row<2;row++)for(let col=0;col<4;col++){
 const [label,theta]=cases[col],[x,y]=at(theta),k=1.4,panelX=col*400,panelY=row*710;
 ctx.save();ctx.beginPath();ctx.rect(panelX+2,panelY+2,396,670);ctx.clip();ctx.translate(panelX,panelY);draw(ctx,row?after:before,{left:x-142.86,top:y-340},k);ctx.restore();
 ctx.fillStyle='#eee5cf';ctx.font='20px sans-serif';ctx.textAlign='center';ctx.fillText((row?'After · ':'Before · ')+label,panelX+200,panelY+699);
}
fs.writeFileSync(path.join(kit,'previews/seam-comparison.jpg'),sheet.toBuffer('image/jpeg',96));
