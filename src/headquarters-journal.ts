/** Preserve objective and achievement fields written by earlier expeditions. */
const JOURNAL_IDS=['shelter','metalworking','defences'] as const;
type JournalId=typeof JOURNAL_IDS[number];
export function validJournalSave(p:{trackedObjective?:unknown;ingotsSmelted?:unknown;craftedMetalPickaxe?:unknown}){
 return (p.trackedObjective===undefined||JOURNAL_IDS.includes(p.trackedObjective as JournalId))
  &&(p.ingotsSmelted===undefined||Number.isSafeInteger(p.ingotsSmelted)&&Number(p.ingotsSmelted)>=0)
  &&(p.craftedMetalPickaxe===undefined||typeof p.craftedMetalPickaxe==='boolean');
}
