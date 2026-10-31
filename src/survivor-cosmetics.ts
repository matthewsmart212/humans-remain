/** Cosmetic-only appearance. No movement, damage, storage or survival stats. */
export type SurvivorAppearance={outfit?:string;headwear?:string;back?:string};
export type SurvivorDirection='up'|'right'|'down'|'left';
export type CosmeticSlot=keyof SurvivorAppearance;
export type CosmeticDefinition={
 id:string;slot:CosmeticSlot;sheet:string;
 /** Full costumes can intentionally conceal hats or back accessories. */
 hides?:('headwear'|'back')[];
 /** A helmet may provide a matching hair-hidden body atlas. */
 bodySheet?:string;
};
export const SURVIVOR_BASE_SHEET='survivorBase';
// Artwork is registered here once all directions and animation cells are ready.
// Purchases/entitlements belong in a separate server-authoritative system.
export const SURVIVOR_COSMETICS:readonly CosmeticDefinition[]=[];
export function survivorLayers(direction:SurvivorDirection,appearance:SurvivorAppearance={},catalogue:readonly CosmeticDefinition[]=SURVIVOR_COSMETICS){
 const find=(slot:CosmeticSlot)=>catalogue.find(c=>c.slot===slot&&c.id===appearance[slot]);
 const outfit=find('outfit'),head=outfit?.hides?.includes('headwear')?undefined:find('headwear'),back=outfit?.hides?.includes('back')?undefined:find('back');
 const body=outfit?.sheet||head?.bodySheet||SURVIVOR_BASE_SHEET;
 // Every sheet uses the base atlas cells, registration and animation index.
 return [...(back&&direction!=='up'?[back.sheet]:[]),body,...(back&&direction==='up'?[back.sheet]:[]),...(head?[head.sheet]:[])];
}
