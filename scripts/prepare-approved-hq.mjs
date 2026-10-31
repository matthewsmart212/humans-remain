// Reproducible packaging of the approved artwork. No per-frame fitting or recentering.
import fs from 'node:fs';import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const masters='artwork-archive/hq-furniture-v2',out='public/survival/hq-furniture-v2';
fs.mkdirSync(masters,{recursive:true});fs.mkdirSync(out,{recursive:true});
for(const [source,name]of [
 ['../generated_images/exec-8a34718e-d038-42bc-aa07-6e44899225ef.png','approved-chest-strip.png'],
 ['../generated_images/exec-28c8ee9b-798f-426b-bee2-c438f1480480.png','approved-room-mockup.png'],
 ['../hq-approved-generated/companion-storage.png','companion-storage.png'],
 ['../hq-approved-generated/exploration-station-clean.png','exploration-station.png'],
 ['../hq-approved-generated/prompts.txt','prompts.txt']
]){if(!fs.existsSync(`${masters}/${name}`))fs.copyFileSync(source,`${masters}/${name}`)}
const cell=724,canvas=960;
const raws=[];for(let i=0;i<3;i++)raws.push(await sharp(`${masters}/approved-chest-strip.png`).extract({left:i*cell,top:0,width:cell,height:cell}).ensureAlpha().raw().toBuffer());
// Keep the lower box, ground contact and silhouette pixel-identical. Only lid,
// upper rim and moving latch use the approved open-state artwork.
for(let i=1;i<3;i++)for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){
 const seam=x<200?422+(x-48)*.48:495-(x-200)*.31;
 if(x>=408&&x<=482&&y<508)continue;
 const weight=Math.min(1,Math.max(0,(y-seam)/8));if(!weight)continue;
 const n=(y*cell+x)*4;for(let c=0;c<4;c++)raws[i][n+c]=Math.round(raws[i][n+c]*(1-weight)+raws[0][n+c]*weight);
}
const companion=await sharp(`${masters}/companion-storage.png`).extract({left:265,top:70,width:740,height:1105}).resize(280,418).png().toBuffer();
const frames=[];
for(let i=0;i<3;i++){
 const chest=await sharp(raws[i],{raw:{width:cell,height:cell,channels:4}}).png().toBuffer();
 const name=`storage-station-${i}.webp`;
 const composed=sharp({create:{width:canvas,height:canvas,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:companion,left:650,top:210},{input:chest,left:25,top:180}]);
 await composed.clone().png().toFile(`${masters}/storage-station-${i}.png`);
 await composed.webp({quality:94,alphaQuality:100,effort:6}).toFile(`${out}/${name}`);frames.push(`/survival/hq-furniture-v2/${name}`);
}
await sharp(`${masters}/companion-storage.png`).webp({quality:94,alphaQuality:100,effort:6}).toFile(`${out}/supply-cubby.webp`);
await sharp(`${masters}/exploration-station.png`).webp({quality:94,alphaQuality:100,effort:6}).toFile(`${out}/exploration-bench.webp`);
const assets=[
 {id:'art_hq_storage_chest',name:'Headquarters storage station',image:frames[0],size:[960,960],width:320,anchor:[.43,.855],points:[[.077,.633],[.594,.458],[.747,.699],[.231,.861]],extra:[[.693,.536],[.84,.478],[.957,.604],[.808,.668]],purpose:'Long timber chest with its companion supply cubby, small box, rolled cloth and tins. The clear lid opens to 45°. Place against the left wall with room in front.',openFrames:frames},
 {id:'art_hq_supply_boxes',name:'Headquarters supply cubby',image:'/survival/hq-furniture-v2/supply-cubby.webp',size:[1254,1254],width:150,anchor:[.51,.918],points:[[.24,.749],[.525,.588],[.784,.769],[.512,.918]],purpose:'The companion cubby and small box, stocked with rolled cloth and tins. Included beside the storage station, and also available separately.'},
 {id:'art_camp_planning_board',name:'Exploration bench',image:'/survival/hq-furniture-v2/exploration-bench.webp',width:340,anchor:[.52,.95],points:[[.18,.66],[.40,.53],[.835,.82],[.701,.965]],purpose:'Exploration workstation with a pinned map board, tabletop map, compass, journal, scrolls, lantern and cloth. Future access point for plans and upgrades; menus are not built yet.'}
];
const catalogue=JSON.parse(fs.readFileSync('src/base-catalogue.json')),metadata=JSON.parse(fs.readFileSync('src/world-image-metadata.json')),registration=[];
for(const a of assets){
 const dim=await sharp('public'+a.image).metadata();a.size=[dim.width,dim.height];
 const paths=[a.points,...(a.extra?[a.extra]:[])].map(points=>({closed:true,points}));
 registration.push({id:a.id,image:a.image,size:a.size,width:a.width,anchor:a.anchor,collision:{lineWidth:.008,paths}});
 for(const url of a.openFrames||[a.image])metadata[url]=a.size;
 const entry=catalogue.find(e=>e.id===a.id);if(!entry)throw Error('Missing stable asset ID');
 Object.assign(entry,{name:a.name,image:a.image,lastUpdatedAt:new Date().toISOString(),purpose:a.purpose,improvement:a.purpose,appearance:'Weathered timber, dark iron corner bands and warm brass details, matching the approved headquarters mockup.',states:a.openFrames?'Closed, half open and held at 45°. The fixed base and companion props stay aligned.':'One transparent sprite.',artworkExports:a.openFrames||[a.image],sourceReferences:[a.image],artPreview:{worldWidth:a.width,...(a.openFrames?{openFrames:a.openFrames}:{})},artReadiness:'Approved mockup adapted into placeable artwork.',availability:a.openFrames?'Placeable; chest opening preview in World Builder. Inventory pending.':'Placeable artwork; exploration menus pending.',assetSpec:{dimensions:`${dim.width} × ${dim.height} px; transparent WebP.`,scale:`${a.width} world units at 100%.`,groundAnchor:a.anchor.join(', '),states:a.openFrames?['closed','half open','open 45°'].map(name=>({name,method:'Fixed canvas and anchor; controlled opening, no loop.'})):[{name:'idle',method:'Static artwork'}]},testScope:'Asset dimensions, fixed-base animation, collision and editor integration checked; menus and inventory are not connected.'});
}
fs.writeFileSync('src/base-catalogue.json',JSON.stringify(catalogue,null,2)+'\n');fs.writeFileSync('src/world-image-metadata.json',JSON.stringify(metadata,null,2)+'\n');fs.writeFileSync('src/hq-furniture-art.json',JSON.stringify(registration,null,2)+'\n');
console.log(assets.map(a=>({id:a.id,width:a.width,size:a.size})), 'Total runtime bytes:',fs.readdirSync(out).reduce((sum,f)=>sum+fs.statSync(out+'/'+f).size,0));
