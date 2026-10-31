export const FURNACE_ID='art_camp_smelting_furnace';
// Reuse the approved campfire animation, cropped at draw time above its logs.
// The same URLs are already streamed for the campfire on web and native.
export const FURNACE_FIRE_IMAGES=Object.fromEntries([
 '0e6f4385-99d4-4bd1-990e-1f3cb3fa87ea','33c670e0-ef26-487e-b46f-230d28a66446',
 'c63dbbf8-c089-49b4-9559-94f40439ab97','f24d5a53-da03-4ef1-81c3-84bbfda7f56f',
 '71d702cf-d32a-45da-9f28-ef28d1d5dc36','10f7b0ab-a198-4373-a434-bfe90aacec5d',
 '18bea2f8-1dd6-4d86-b767-89473f47eda6','c9095651-2b46-40dd-8eaf-c73ea3ee5f5b',
].map((id,i)=>[`furnaceFire${i}`,`/api/asset-files/${id}`]));
export const IRON_BOULDER_ID='art_rock_iron_veined_boulder';
export const IRONWORKS_IMAGES={ironOre:'/survival/ironworks-v1/iron-ore.png',ironIngot:'/survival/ironworks-v1/iron-ingot.png',campFurnace:'/survival/ironworks-v1/camp-furnace.png',ironBoulder:'/survival/ironworks-v1/iron-boulder.png'};
export const IRONWORKS_MATERIALS={ironOre:{name:'Iron ore',weight:.9,image:IRONWORKS_IMAGES.ironOre},ironIngot:{name:'Iron ingot',weight:.6,image:IRONWORKS_IMAGES.ironIngot}} as const;
export const IRONWORKS_WORLD_ART=[
 {id:FURNACE_ID,name:'Camp smelting furnace',image:IRONWORKS_IMAGES.campFurnace,size:[1254,1254],anchor:[.5,.90],worldWidth:240},
 {id:IRON_BOULDER_ID,name:'Iron-veined boulder',image:IRONWORKS_IMAGES.ironBoulder,size:[1485,1059],anchor:[.5,.89],worldWidth:205},
];
export const ORE_BONUS_CHANCE=.25;
export const SMELT_RECIPES={ore:{name:'Smelt iron ore',input:'ironOre',count:2,seconds:20},scrap:{name:'Recycle metal scrap',input:'scrap',count:3,seconds:16}} as const;
export type SmeltRecipe=keyof typeof SMELT_RECIPES;
export const FURNACE_LOG_SECONDS=60;
export const FURNACE_RULES={1:{queue:4,rack:8,fuel:180,rate:1},2:{queue:6,rack:12,fuel:240,rate:1.25}} as const;
