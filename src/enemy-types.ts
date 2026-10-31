import {BRUTE} from './brute-model';
import {HOUND} from './hound-model';
export const combatEnemyBody=(kind?:EnemyKind)=>kind==='iron-brute'?BRUTE.body:kind==='scrap-hound'?HOUND.body:kind==='skitter'?14:18;
export type EnemyKind='scrap-walker'|'scrap-bomber'|'skitter'|'iron-brute'|'scrap-hound';
// Independent salvage robots: an explosive, a melee Walker and a small laser hunter.
export const ENEMY_TYPES:Record<EnemyKind,{name:string;assetId:string;health:number;speed:number;damage:number;attackSeconds:number}>={
 'scrap-bomber':{name:'Scrap Bomber',assetId:'art-scrapling-scrapling',health:80,speed:108,damage:44,attackSeconds:1.9},
 'scrap-walker':{name:'Scrap Walker',assetId:'scrap-walker-humanoid-v3',health:160,speed:200,damage:22,attackSeconds:1.25},
 skitter:{name:'Skitter',assetId:'skitter-v1',health:56,speed:260,damage:12,attackSeconds:1.8},
 'iron-brute':{name:'Iron Brute',assetId:'iron-brute-v1',health:480,speed:133.2,damage:34,attackSeconds:2.25},
 'scrap-hound':{name:'Scrap Hound',assetId:'scrap-hound-v1',health:120,speed:310,damage:28,attackSeconds:3.1},
};
export const COMBAT_ENEMY_LIMIT=12;
