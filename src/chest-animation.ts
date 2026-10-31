/** Per-instance presentation state, separate from saved placement and inventory. */
export type ChestMotion={from:number;target:0|1;started:number};
type ChestWorld={tick:number;chestMotions?:Record<string,ChestMotion>};
export const CHEST_OPEN_TICKS=24;
export function chestAmount(world:ChestWorld,id:string){
 const motion=world.chestMotions?.[id];if(!motion)return 0;
 const distance=Math.abs(motion.target-motion.from);
 const t=distance?Math.min(1,Math.max(0,(world.tick-motion.started)/(CHEST_OPEN_TICKS*distance))):1;
 return motion.from+(motion.target-motion.from)*t;
}
export function chestIsOpen(world:ChestWorld,id:string){return world.chestMotions?.[id]?.target===1}
export function toggleChest(world:ChestWorld,id:string){
 const from=chestAmount(world,id),target=chestIsOpen(world,id)?0:1;
 (world.chestMotions??={})[id]={from,target,started:world.tick};
}
export function chestFrame(world:ChestWorld,id:string,count:number){return Math.round(chestAmount(world,id)*Math.max(0,count-1))}
