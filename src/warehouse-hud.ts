import {buildingNeedsRepair} from './camp-restoration';
import {storedCount} from './expedition-inventory';
import type {FieldKitTarget} from './field-kit-target';
import type {World} from './survival-engine';
import type {WarehouseMaterial} from './warehouse';

export type WarehouseStock=Record<WarehouseMaterial,number>;

/** Show the real shared stock only while the warehouse is the usable focus.
 * Damage always owns this space, even when the hammer is not equipped. */
export function warehouseStockForHUD(w:World,target?:FieldKitTarget,repairTarget?:FieldKitTarget):WarehouseStock|undefined{
 if(target?.buildingId!=='warehouse'||target.repairInfo||repairTarget||w.stationPanel||w.player.hp<=0||w.player.downedUntil||buildingNeedsRepair(w,'warehouse'))return;
 return{pallets:storedCount(w,'pallets'),stone:storedCount(w,'stone'),scrap:storedCount(w,'scrap')};
}

export const sameWarehouseStock=(a:WarehouseStock|undefined,b:WarehouseStock|undefined)=>a?.pallets===b?.pallets&&a?.stone===b?.stone&&a?.scrap===b?.scrap;
