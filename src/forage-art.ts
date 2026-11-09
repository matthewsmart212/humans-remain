/** Shared, registered sprites. Fruit is a separate layer so picking never changes a plant's size. */
export const FORAGE_ART=[
 {id:'art_forage_berry_bush',name:'Wild berry bush',kind:'berries' as const,image:'/survival/forage-v1/berry-bush.png',size:[1254,1254],anchor:[.5,.835],worldWidth:156,capacity:4,regrowDays:2,reach:118},
 {id:'art_forage_apple_tree',name:'Wild apple tree',kind:'apple' as const,image:'/survival/forage-v1/apple-tree.png',size:[1254,1254],anchor:[.5,.94],worldWidth:280,capacity:3,regrowDays:3,reach:138},
 {id:'art_forage_wild_potato',name:'Wild potato plant',kind:'potato' as const,image:'/survival/forage-v1/berry-bush.png',size:[1254,1254],anchor:[.5,.835],worldWidth:148,capacity:1,regrowDays:0,reach:116},
];
export const FORAGE_BY_ID=new Map(FORAGE_ART.map(a=>[a.id,a]));
export type ForageArt=typeof FORAGE_ART[number];
