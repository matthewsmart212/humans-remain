// Package the three generated, unaltered sprites for the existing asset library.
import fs from 'node:fs';import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const root='public/survival/hq-furniture-v1',masters='artwork-archive/hq-furniture-v1';
fs.mkdirSync(root,{recursive:true});fs.mkdirSync(masters,{recursive:true});
const assets=[
 {id:'art_hq_storage_chest',file:'hq-storage-chest',name:'Headquarters storage chest',width:144,anchor:[.5,1070/1254],points:[[338,662],[1180,810],[930,1060],[90,806]],category:'Storage and logistics',purpose:'Compact reusable storage chest for the headquarters; place along a side wall with its latch facing the central aisle.'},
 {id:'art_hq_supply_boxes',file:'hq-supply-boxes',name:'Headquarters supply boxes',width:128,anchor:[.5,1130/1254],points:[[347,717],[1144,942],[930,1121],[144,889]],category:'Storage and logistics',purpose:'Two compact stacked supply boxes for the headquarters. Keeps storage close to a wall and the central floor free.'},
 {id:'art_camp_planning_board',file:'hq-planning-bench',name:'Exploration bench',width:216,anchor:[.5,1096/1254],points:[[374,696],[1170,896],[940,1090],[142,838]],category:'Exploration, communication and visitors',purpose:'A map, compass and plans mark the future place to access exploration, upgrades and blueprints. Artwork only; menu interactions are not built yet.'},
];
const catalogue=JSON.parse(fs.readFileSync('src/base-catalogue.json')),metadata=JSON.parse(fs.readFileSync('src/world-image-metadata.json')),registration=[];
let metadataText=fs.readFileSync('src/world-image-metadata.json','utf8');
for(const a of assets){
 const master=`${masters}/${a.file}.png`;if(!fs.existsSync(master))fs.copyFileSync(`../hq-interior-generated/${a.file}.png`,master);
 const meta=await sharp(master).metadata();if(!meta.hasAlpha)throw Error('Transparent sprite required');
 const image=`/survival/hq-furniture-v1/${a.file}.webp`;
 await sharp(master).webp({lossless:true,effort:6}).toFile('public'+image);
 if(!metadata[image])metadataText=metadataText.trimEnd().replace(/\n}$/,`,\n  ${JSON.stringify(image)}: [${meta.width}, ${meta.height}]\n}`)+'\n';
 else if(metadata[image][0]!==meta.width||metadata[image][1]!==meta.height)throw Error('Update the existing metadata if replacing a sprite canvas');
 registration.push({id:a.id,image,size:[meta.width,meta.height],width:a.width,anchor:a.anchor,collision:{lineWidth:.008,paths:[{closed:true,points:a.points.map(p=>p.map(v=>v/1254))}]}});
 const old=catalogue.find(e=>e.id===a.id),entry={...old,id:a.id,name:a.name,lastUpdatedAt:'2026-10-09T12:20:00.000Z',group:'Supporting props',family:'Headquarters furniture',category:a.category,recordType:'movable equipment',phase:'B2',priority:'High',tier:null,art:false,conceptApproved:false,exportComplete:true,implemented:false,tested:false,presentInPrototype:false,image,artworkExports:[image],sourceReferences:[image],artReadiness:'Artwork ready to place; gameplay interactions pending.',purpose:a.purpose,improvement:a.purpose,appearance:'Weathered taupe timber, worn bevels and dark iron fittings. Matches the headquarters perspective and material palette.',states:'One static, transparent sprite.',artLinks:old?.artLinks||[],implementationDependencies:old?.implementationDependencies||[],blockers:[],playerUnlock:'World editor',resourceCost:'To define with gameplay progression.',inputs:'None for artwork placement.',outputs:a.purpose,capacity:'Compact furniture for a headquarters used by four characters.',buildMenuVisibility:'World editor',availability:'Placeable artwork; future interaction.',artPreview:{worldWidth:a.width},physical:{currentCollision:'Traced ground footprint; the transparent canvas does not block movement.',entrance:'Keep the front approach clear and leave the central doorway aisle open.',orientations:'Matches headquarters floorboards; rotate or flip in the editor.',roofFrontLayer:'Freestanding furniture; no roof.'},assetSpec:{dimensions:`${meta.width} × ${meta.height} px; transparent WebP.`,scale:`${a.width} world units wide at 100%.`,groundAnchor:`${a.anchor[0]}, ${a.anchor[1]} in normalized source coordinates.`,states:[{name:'idle',method:'single static sprite'}]},testScope:'Artwork, footprint and four-character spacing checked in an offline render of the actual headquarters; future menu behavior not implemented.'};
 if(old)Object.assign(old,entry);else catalogue.push(entry);
}
fs.writeFileSync('src/base-catalogue.json',JSON.stringify(catalogue,null,2)+'\n');
fs.writeFileSync('src/world-image-metadata.json',metadataText);
fs.writeFileSync('src/hq-furniture-art.json',JSON.stringify(registration,null,2)+'\n');
console.log(registration.map(a=>({id:a.id,bytes:fs.statSync('public'+a.image).size})));
