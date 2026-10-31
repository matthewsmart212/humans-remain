export type PickaxeKind='woodenPickaxe'|'metalPickaxe';
export const PICKAXE_GEAR={
 woodenPickaxe:{name:'Wooden pickaxe',weight:1.3,image:'/survival/equipment/wooden-pickaxe-v1.png',damage:20},
 metalPickaxe:{name:'Metal pickaxe',weight:2.1,image:'/survival/equipment/metal-pickaxe-v1.png',damage:40},
} as const;
export const isPickaxe=(id:unknown):id is PickaxeKind=>id==='woodenPickaxe'||id==='metalPickaxe';
export const STONE_IMAGE='/survival/world-rocks-v1/river-stone-trio.webp';
export const MINING_IMAGES={woodenPickaxe:PICKAXE_GEAR.woodenPickaxe.image,metalPickaxe:PICKAXE_GEAR.metalPickaxe.image,stone:STONE_IMAGE};
export const PICKAXE_STRIKE={duration:.70,contact:.32,cooldown:.76,cost:0,damage:40,reach:140,halfArc:Math.PI*.34,push:0} as const;
export const WOODEN_PICKAXE_STRIKE={...PICKAXE_STRIKE,duration:.78,contact:.36,cooldown:.86,damage:20} as const;
