import type {GearKind} from './player-gear';
import type {Resource} from './survival-engine';
export type MaterialCost=Partial<Record<Resource,number>>;
export type ForgeRecipe={id:GearKind;name:string;count:number;cost:MaterialCost};
export type CraftCategory='tools'|'weapons'|'ranged';
export const CRAFT_CATEGORIES=[{id:'tools',label:'Tools'},{id:'weapons',label:'Weapons'},{id:'ranged',label:'Bow & arrows'}] as const;
export const craftCategory=(id:GearKind):CraftCategory=>id==='bow'||id==='arrows'?'ranged':['repairHammer','woodenAxe','axe','woodenPickaxe','metalPickaxe'].includes(id)?'tools':'weapons';
export const FORGE_RECIPES:readonly ForgeRecipe[]=[
 {id:'woodenPickaxe',name:'Wooden pickaxe',count:1,cost:{pallets:3}},
 {id:'metalPickaxe',name:'Metal pickaxe',count:1,cost:{ironIngot:2,pallets:2}},
 {id:'woodenAxe',name:'Wooden axe',count:1,cost:{pallets:2}},
 {id:'axe',name:'Camp axe',count:1,cost:{ironIngot:2,pallets:2}},
 {id:'woodenKnife',name:'Wooden knife',count:1,cost:{pallets:1}},
 {id:'scrapKnife',name:'Scrap knife',count:1,cost:{ironIngot:1,pallets:1}},
 {id:'woodenSpear',name:'Wooden spear',count:1,cost:{pallets:2}},
 {id:'metalSpear',name:'Metal spear',count:1,cost:{ironIngot:2,pallets:2}},
 {id:'woodenSword',name:'Wooden sword',count:1,cost:{pallets:3}},
 {id:'metalSword',name:'Metal sword',count:1,cost:{ironIngot:3,pallets:1}},
 {id:'bow',name:'Makeshift bow',count:1,cost:{pallets:4}},
 {id:'arrows',name:'10 arrows',count:10,cost:{ironIngot:1,pallets:1}},
];
export const FURNACE_UPGRADE_COST:MaterialCost={stone:8,ironIngot:2,pallets:2};
