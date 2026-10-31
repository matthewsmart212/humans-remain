import fs from 'node:fs';import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp'),archive='artwork-archive/hq-support-v1',out='public/survival/hq-support-v1';
fs.mkdirSync(archive,{recursive:true});fs.mkdirSync(out,{recursive:true});
const definitions=[
 ['peg-rail','art_hq_peg_rail','Headquarters expedition peg rail',175,[.5,.92],'Wall rail with a backpack, coiled rope and hatchet. Decorative; no movement blocker.'],
 ['supply-bundle','art_hq_supply_bundle','Headquarters sack and bedrolls',80,[.5,.94],'Burlap supplies and rolled olive canvas tucked beside the storage chest. Decorative; no movement blocker.'],
 ['field-shelf','art_hq_field_shelf','Headquarters field journal shelf',82,[.5,.92],'Small wall shelf with field journals and a tin beside the exploration bench. Decorative; no movement blocker.'],
 ['woven-rug','art_hq_woven_rug','Headquarters woven runner',250,[.5,.5],'Worn olive-and-tan floor runner in front of the exploration bench. Fully walkable.'],
 ['boots','art_hq_boots','Headquarters muddy boots',56,[.5,.94],'Worn boots tucked against the wall beside the exploration bench. Decorative; no movement blocker.'],
];
const catalogue=JSON.parse(fs.readFileSync('src/base-catalogue.json')),metadata=JSON.parse(fs.readFileSync('src/world-image-metadata.json')),registration=[];
for(const [file,id,name,width,anchor,purpose]of definitions){
 const master=`${archive}/${file}.png`;if(!fs.existsSync(master))fs.copyFileSync(`../hq-support-generated/${file}.png`,master);
 const {data,info}=await sharp(master).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 // Drop tiny isolated matte specks, not artwork; keep every substantial component
 // (including both separate boots), plus its antialiased fringe.
 const n=info.width*info.height,seen=new Uint8Array(n);let largest=[];
 for(let p=0;p<n;p++){if(seen[p]||data[p*4+3]<10)continue;const component=[p];seen[p]=1;
  for(let q=0;q<component.length;q++){const i=component[q],x=i%info.width;for(const j of [x?i-1:-1,x<info.width-1?i+1:-1,i-info.width,i+info.width])if(j>=0&&j<n&&!seen[j]&&data[j*4+3]>=10){seen[j]=1;component.push(j)}}
  if(component.length>=1000)for(const pixel of component)largest.push(pixel);
 }
 const keep=new Uint8Array(n);let left=info.width,top=info.height,right=0,bottom=0;
 for(const p of largest){keep[p]=1;const x=p%info.width,y=Math.floor(p/info.width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
 // Preserve the antialiased fringe of the kept component too.
 for(let p=0;p<n;p++)if(!keep[p]&&data[p*4+3]){const x=p%info.width,y=Math.floor(p/info.width);let near=false;for(let dy=-2;dy<=2&&!near;dy++)for(let dx=-2;dx<=2;dx++)if(x+dx>=0&&x+dx<info.width&&y+dy>=0&&y+dy<info.height&&keep[(y+dy)*info.width+x+dx]){near=true;break}if(!near)data[p*4+3]=0}
 left=Math.max(0,left-16);top=Math.max(0,top-16);right=Math.min(info.width-1,right+16);bottom=Math.min(info.height-1,bottom+16);
 const image=`/survival/hq-support-v1/${file}.webp`,crop={left,top,width:right-left+1,height:bottom-top+1};
 await sharp(data,{raw:info}).extract(crop).webp({quality:94,alphaQuality:100,effort:6}).toFile('public'+image);
 metadata[image]=[crop.width,crop.height];registration.push({id,image,size:metadata[image],width,anchor,floorDecal:file==='woven-rug'});
 const entry={id,name,lastUpdatedAt:new Date().toISOString(),group:'Supporting props',family:'Headquarters furniture',category:'Storage and logistics',recordType:'movable equipment',phase:'B2',priority:'Medium',tier:null,art:true,conceptApproved:true,exportComplete:true,implemented:true,tested:false,presentInPrototype:true,image,artworkExports:[image],sourceReferences:[image],artReadiness:'Approved headquarters dressing; placeable transparent artwork.',purpose,improvement:purpose,appearance:'Weathered timber, olive canvas, tan cloth, aged brass and iron. Matches the approved headquarters mockup.',states:'Static prop.',artLinks:[],implementationDependencies:[],blockers:[],playerUnlock:'World editor',resourceCost:'Decorative artwork; no gameplay cost.',inputs:'None.',outputs:'Visual camp dressing.',capacity:'Compact wall-side prop; central floor remains clear.',buildMenuVisibility:'World editor',availability:'Available in Headquarters furniture.',artPreview:{worldWidth:width},physical:{currentCollision:'Non-blocking decoration.',orientations:'Matches the approved room perspective. Can rotate or flip.',roofFrontLayer:'Covered by the headquarters roof.'},assetSpec:{dimensions:`${crop.width} × ${crop.height} px; transparent WebP.`,scale:`${width} world units wide at 100%.`,groundAnchor:anchor.join(', '),states:[{name:'idle',method:'single static sprite'}]},testScope:'Placement, transparency, non-blocking behavior, layer ordering and persistence checks.'};
 const old=catalogue.find(e=>e.id===id);if(old)Object.assign(old,entry);else catalogue.push(entry);
}
fs.copyFileSync('../hq-support-generated/prompts.json',`${archive}/prompts.json`);
fs.writeFileSync('src/base-catalogue.json',JSON.stringify(catalogue,null,2)+'\n');
let text=fs.readFileSync('src/world-image-metadata.json','utf8');const existing=JSON.parse(text);const added=registration.filter(a=>!existing[a.image]);if(added.length)text=text.trimEnd().slice(0,-1).trimEnd()+',\n'+added.map(a=>'  '+JSON.stringify(a.image)+': '+JSON.stringify(a.size)).join(',\n')+'\n}\n';fs.writeFileSync('src/world-image-metadata.json',text);
fs.writeFileSync('src/hq-support-art.json',JSON.stringify(registration,null,2)+'\n');console.log(registration);
