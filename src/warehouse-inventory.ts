import type {BagItem,BagItemId} from './backpack';
import {itemCount,storedCount} from './expedition-inventory';
import type {World} from './survival-engine';
import {WAREHOUSE_MATERIALS,type WarehouseMaterial} from './warehouse';

/** The warehouse uses the same item slots as the backpack, including empty stacks. */
export function warehouseInventoryItems(world:World,taking:boolean):BagItem[]{
 return WAREHOUSE_MATERIALS.map(material=>{
  const bag=itemCount(world,material.id),stored=storedCount(world,material.id);
  return {
   id:material.id==='pallets'?'logs':material.id,
   name:material.name,
   category:'Materials',
   count:taking?stored:bag,
   image:material.image,
   facts:[['Backpack',String(bag)],['Warehouse',String(stored)]],
   description:'Camp materials for crafting, repairs, and upgrades.',
   hint:'',
   useDisabled:true,
   droppable:false,
  };
 });
}

export function warehouseMaterialForItem(id:BagItemId):WarehouseMaterial|null{
 return id==='logs'?'pallets':id==='stone'||id==='scrap'?id:null;
}
