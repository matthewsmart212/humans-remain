import {cropRipeUrl,WILD_FORAGE_ROOT as ROOT} from './crop-art';

/** Shared, registered sprites. Fruit is a separate layer so picking never changes a plant's size. */
export const FORAGE_ART=[
 {id:'art_forage_berry_bush',name:'Wild berry bush',kind:'berries' as const,image:`${ROOT}/berry-bush.webp`,size:[1254,1254],anchor:[.5,.835],worldWidth:156,capacity:4,regrowDays:2,reach:118},
 {id:'art_forage_apple_tree',name:'Wild apple tree',kind:'apple' as const,image:`${ROOT}/apple-tree.webp`,size:[1254,1254],anchor:[.5,.94],worldWidth:280,capacity:3,regrowDays:3,reach:138},
 {id:'art_forage_wild_potato',name:'Wild potato plant',kind:'potato' as const,image:cropRipeUrl('potato'),size:[256,256],anchor:[.5,.86],worldWidth:112,capacity:1,regrowDays:0,reach:116},
 {id:'art_forage_wild_carrot',name:'Wild carrot plant',kind:'carrot' as const,image:cropRipeUrl('carrot'),size:[256,256],anchor:[.5,.86],worldWidth:110,capacity:1,regrowDays:0,reach:116},
];

/** Each fruit cluster sits on its own twig and leaves the canopy intact when gathered. */
export const FORAGE_FRUIT_ART={
 berries:{images:[`${ROOT}/berry-truss-purple.webp`,`${ROOT}/berry-truss-russet.webp`],size:25,points:[
  {x:.28,y:.53,variation:1},{x:.53,y:.36,variation:0},{x:.68,y:.55,variation:1},{x:.50,y:.67,variation:0},
 ]},
 apple:{images:[`${ROOT}/crabapple-gold.webp`,`${ROOT}/crabapple-russet.webp`],size:24,points:[
  {x:.30,y:.38,variation:1},{x:.56,y:.24,variation:0},{x:.73,y:.47,variation:1},
 ]},
} as const;

export const FORAGE_BY_ID=new Map(FORAGE_ART.map(a=>[a.id,a]));
export type ForageArt=typeof FORAGE_ART[number];
