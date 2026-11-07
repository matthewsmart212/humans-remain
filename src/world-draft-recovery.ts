import {emptyLayout,LAYOUT_KEY,validateLayout,type WorldLayout} from './world-layout';

export const DRAFT_BACKUP_KEY=LAYOUT_KEY+'-before-recovery';
export const EMPTY_DRAFT_KEY=LAYOUT_KEY+'-confirmed-empty';
type DraftStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export type EditorDraft={layout:WorldLayout|null;raw:string|null;unconfirmedEmpty:boolean};

/** v105 could cache emptyLayout() after rejecting a valid saved camp. Recognize
 * only that untouched placeholder; preserve named/edited worlds and future clears. */
function emptyPlaceholder(layout:WorldLayout){
 const blank=emptyLayout();
 return layout.items.length===0&&layout.name===blank.name&&layout.spawn.x===blank.spawn.x&&layout.spawn.y===blank.spawn.y&&Object.keys(layout).every(k=>k in blank);
}
export function readEditorDraft(storage:DraftStorage=localStorage):EditorDraft{
 let raw:string|null=null;
 try{raw=storage.getItem(LAYOUT_KEY);const layout=validateLayout(JSON.parse(raw||'null')).layout||null;return{layout,raw,unconfirmedEmpty:!!layout&&emptyPlaceholder(layout)&&storage.getItem(EMPTY_DRAFT_KEY)!==raw}}
 catch{return{layout:null,raw,unconfirmedEmpty:false}}
}
/** A load/validation error is not an empty world. Never silently replace it. */
export function resolveEditorDraft(local:EditorDraft,remote:WorldLayout|null):WorldLayout{
 const checked=remote?validateLayout(remote):null;
 if(checked&&!checked.layout)throw Error('Your saved camp could not be loaded. No saved objects have been changed. Retry loading.');
 const cloud=checked?.layout;
 // A background-cached empty draft must never hide a populated cloud camp,
 // even when Safari gave the empty placeholder a newer timestamp.
 // An intentional deletion must be explicitly saved to the shared world.
 if(cloud?.items.length&&(local.layout?.items.length??0)===0)return cloud;
 if(cloud&&(!local.layout||cloud.updatedAt>local.layout.updatedAt))return cloud;
 if(local.layout)return local.layout;
 if(local.raw)throw Error('Your local draft could not be loaded. It has been kept unchanged. Retry loading.');
 return cloud||emptyLayout();
}
export function offlineEditorDraft(local:EditorDraft):WorldLayout{
 if(local.layout&&!local.unconfirmedEmpty)return local.layout;
 throw Error('Your saved camp is unavailable right now. Retry loading to reconnect; your draft has not been replaced.');
}
/** Called only after successful hydration or a deliberate edit. Keep one prior
 * nonempty/invalid draft before replacing it, and distinguish deliberate clears. */
export function persistEditorDraft(layout:WorldLayout,storage:DraftStorage=localStorage){
 if(!validateLayout(layout).layout)throw Error('Cannot cache an invalid world');
 const raw=JSON.stringify(layout),previous=storage.getItem(LAYOUT_KEY);
 if(previous&&previous!==raw){
  let old:WorldLayout|null=null;try{old=validateLayout(JSON.parse(previous)).layout||null}catch{}
  if(!old||(old.items.length>0&&layout.items.length===0))storage.setItem(DRAFT_BACKUP_KEY,previous);
 }
 storage.setItem(LAYOUT_KEY,raw);
 if(layout.items.length===0)storage.setItem(EMPTY_DRAFT_KEY,raw);else storage.removeItem(EMPTY_DRAFT_KEY);
}
