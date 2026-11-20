import type {World} from './survival-engine';
import {WAREHOUSE_MATERIALS} from './warehouse';
import {warehouseView} from './warehouse-storage';

export function warehouseTransferRows(world:World,taking:boolean){
 const verb=taking?'Take':'Store';
 return WAREHOUSE_MATERIALS.map(material=>{
  const {bag,stored,limit}=warehouseView(world,material.id,taking,1);
  const available=taking?stored:bag;
  const blocked=limit?'':!taking&&world.creativeMode?'Creative stock':available?'Pack full':'Empty';
  return {
   material,available,limit,
   stockLabel:taking?`${stored} stored${bag?` · ${bag} in pack`:''}`:`${bag} in pack${stored?` · ${stored} stored`:''}`,
   itemId:material.id==='pallets'?'logs' as const:material.id,
   singleLabel:blocked||(limit>1?`${verb} 1`:verb),
   stackLabel:limit===available?`${verb} all`:`${verb} ${limit}`,
  };
 }).filter(row=>row.available>0);
}
