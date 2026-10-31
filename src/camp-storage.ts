import type {World} from './survival-engine';
import {atStorage} from './station-access';
import {addInventory,takeInventory,itemCount,storedCount,setStoredCount,type InventoryKind} from './expedition-inventory';
export function storeItem(w:World,kind:InventoryKind,quantity:number|'all'){
 if(!atStorage(w)||w.player.hp<=0||w.player.downedUntil)return 0;
 if(quantity!=='all'&&(!Number.isSafeInteger(quantity)||quantity<1))return 0;
 const n=quantity==='all'?itemCount(w,kind):Math.min(quantity,itemCount(w,kind));if(!takeInventory(w,kind,n))return 0;setStoredCount(w,kind,storedCount(w,kind)+n);return n;
}
export function withdrawItem(w:World,kind:InventoryKind,quantity:number|'all'){
 if(!atStorage(w)||w.player.hp<=0||w.player.downedUntil)return 0;
 if(quantity!=='all'&&(!Number.isSafeInteger(quantity)||quantity<1))return 0;
 const n=addInventory(w,kind,quantity==='all'?storedCount(w,kind):Math.min(quantity,storedCount(w,kind)));if(n)setStoredCount(w,kind,storedCount(w,kind)-n);return n;
}
