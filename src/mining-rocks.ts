import {IRON_BOULDER_ID} from './ironworks-data';
export type MiningRockSpec={hp:number;stone:number;ore?:number;metalOnly?:boolean};
// Existing boulders give stone with occasional ore. Marked deposits guarantee ore.
export const MINEABLE_ROCKS=new Map<string,MiningRockSpec>([
 ['art_rock_moss_capped_boulder',{hp:100,stone:4}],
 ['art_rock_lichen_twin_stones',{hp:120,stone:5}],
 ['art_rock_split_forest_rock',{hp:100,stone:4}],
 ['art_rock_ochre_lone_boulder',{hp:100,stone:4}],
 ['art_rock_broad_granite_erratic',{hp:120,stone:5}],
 ['art_rock_smooth_river_boulder',{hp:100,stone:4}],
 ['art_rock_chalk_cracked_rock',{hp:80,stone:3}],
 ['art_rock_rust_sandstone_fin',{hp:100,stone:4}],
 [IRON_BOULDER_ID,{hp:160,stone:2,ore:3,metalOnly:true}],
]);
