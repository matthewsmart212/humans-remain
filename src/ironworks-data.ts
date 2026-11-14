import {FURNACE_ACTIVE_FRAMES,FURNACE_COLD_IMAGE} from './furnace-animation-art';
export const FURNACE_ID='art_camp_smelting_furnace';
export const FURNACE_FIRE_IMAGES=Object.fromEntries(FURNACE_ACTIVE_FRAMES.map((url,index)=>[`furnaceFire${index}`,url]));
export const IRON_BOULDER_ID='art_rock_iron_veined_boulder';
export const IRONWORKS_IMAGES={ironOre:'/survival/ironworks-v1/iron-ore.png',ironIngot:'/survival/ironworks-v1/iron-ingot.png',campFurnace:FURNACE_COLD_IMAGE,ironBoulder:'/survival/ironworks-v1/iron-boulder.png'};
export const IRONWORKS_MATERIALS={ironOre:{name:'Iron ore',weight:.9,image:IRONWORKS_IMAGES.ironOre},ironIngot:{name:'Iron ingot',weight:.6,image:IRONWORKS_IMAGES.ironIngot}} as const;
export const IRONWORKS_WORLD_ART=[
 {id:FURNACE_ID,name:'Camp smelting furnace',image:IRONWORKS_IMAGES.campFurnace,size:[627,627],anchor:[.5,.90],worldWidth:480},
 {id:IRON_BOULDER_ID,name:'Iron-veined boulder',image:IRONWORKS_IMAGES.ironBoulder,size:[1485,1059],anchor:[.5,.89],worldWidth:205},
];
export const ORE_BONUS_CHANCE=.25;
export const SMELT_RECIPES={ore:{name:'Smelt iron ore',input:'ironOre',count:2,seconds:20},scrap:{name:'Recycle metal scrap',input:'scrap',count:3,seconds:16}} as const;
export type SmeltRecipe=keyof typeof SMELT_RECIPES;
export const FURNACE_LOG_SECONDS=60;
export const FURNACE_RULES={1:{queue:4,rack:8,fuel:180,rate:1},2:{queue:6,rack:12,fuel:240,rate:1.25}} as const;
