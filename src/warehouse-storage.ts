import {buildingRestored} from './camp-restoration';
import type {World} from './survival-engine';
import {nearbyWarehouse,WAREHOUSE_MATERIALS,type WarehouseMaterial} from './warehouse';
import {storeItem,withdrawItem} from './camp-storage';
import {itemCount,storedCount,canCarryCount} from './expedition-inventory';
export function warehouseLimit(w:World,kind:WarehouseMaterial,taking:boolean){return taking?canCarryCount(w,kind,storedCount(w,kind)):w.creativeMode?0:itemCount(w,kind)}
export function warehouseView(w:World,kind:WarehouseMaterial,taking:boolean,quantity:number){
 const material=WAREHOUSE_MATERIALS.find(m=>m.id===kind)!,bag=itemCount(w,kind),stored=storedCount(w,kind),limit=warehouseLimit(w,kind,taking),amount=Math.min(Math.max(1,quantity),limit);
 const empty=taking?!stored:!bag;
 return{material,bag,stored,limit,amount,action:limit?`${taking?'Take':'Store'} ${amount} ${amount===1?material.singular:material.unit}`:empty?`No ${material.name.toLowerCase()} ${taking?'stored':'in backpack'}`:'Backpack full',
  hint:!taking&&w.creativeMode?'Creative supplies are virtual and cannot be stored. Turn Creative Mode off to transfer real items.':limit?'Camp stores also supply crafting and station upgrades.':taking?(stored?'Store a few items to make room in your backpack.':'Store materials from your backpack first.'):kind==='pallets'?'Chop trees with an axe to collect logs.':kind==='stone'?'Mine boulders with a pickaxe to collect stone.':'Collect scrap piles while exploring.'};
}
export function transferWarehouse(w:World,kind:WarehouseMaterial,taking:boolean,quantity:number|'all'){
 if(!buildingRestored(w,'warehouse')||!WAREHOUSE_MATERIALS.some(m=>m.id===kind)||w.stationPanel!=='warehouse'||!nearbyWarehouse(w)||w.phase==='over')return 0;
 return taking?withdrawItem(w,kind,quantity):storeItem(w,kind,quantity);
}
