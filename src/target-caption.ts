import type {FieldKitTarget} from './field-kit-target';
import {CAMP_REPAIRS} from './camp-restoration';

export type TargetCaptionMaterial=NonNullable<FieldKitTarget['repairInfo']>['materials'][number]&{missing:number;available:boolean};
export type TargetCaption={
 label:string;repair:boolean;status:string;progress?:number;shield:boolean;
 materials:TargetCaptionMaterial[];hint:string;hintKind:'equipment'|'shortage'|'requirement'|'none';
 detail:string;accessibilityLabel:string;
};
const singularMaterials:Record<string,string>={Logs:'log','Iron ingots':'iron ingot'};
const materialNoun=(name:string,count:number)=>count===1?(singularMaterials[name]??name.toLowerCase()):name.toLowerCase();
/** Presentation only: preserve authoritative costs, inventory sources and repair rules. */
export function targetCaption(target:FieldKitTarget):TargetCaption{
 const repair=target.repairInfo,label=target.buildingId?CAMP_REPAIRS[target.buildingId].name:target.label;
 const active=target.repairState==='holding'||target.repairState==='falling';
 const progress=active&&target.progress!==undefined?Math.round(Math.max(0,Math.min(1,target.progress))*100):undefined;
 const percent=repair?.condition.match(/(\d+)%/),shield=!!repair&&!active&&(!!percent||repair.condition==='Defences damaged');
 const status=active?(target.repairState==='holding'?'Repairing':'Hold to continue'):repair?(percent?percent[0]:repair.condition):'';
 const materials=(repair?.materials??[]).filter(row=>row.needed>0).map(row=>({...row,missing:Math.max(0,row.needed-row.have),available:row.have>=row.needed}));
 const missing=materials.filter(row=>!row.available);
 let hint='',hintKind:TargetCaption['hintKind']='none';
 if(repair&&!active){
  if(/headquarters menu/i.test(repair.hint)){hint='Repair in HQ';hintKind='requirement'}
  else if(/Camp level|Repair headquarters|Requires headquarters/i.test(repair.hint)){hint=repair.hint.replace(/^Requires (Camp level \d+)$/,'$1 required').replace('Repair headquarters first','Repair HQ first');hintKind='requirement'}
  else if(/hammer/i.test(repair.hint)){hint=/equip/i.test(repair.hint)?'Equip hammer':'Hammer needed';hintKind='equipment'}
  else if(missing.length){hint=missing.length===1?`Need ${missing[0].missing} more ${materialNoun(missing[0].name,missing[0].missing)}`:'Need '+missing.map(row=>`${row.missing} ${materialNoun(row.name,row.missing)}`).join(', ');hintKind='shortage'}
  else if(!/^(Hold to repair|Tap to repair|Materials used on completion|Ready)$/.test(repair.hint)){hint=repair.hint;hintKind='requirement'}
 }
 const detail=repair?'':target.detail==='Water is full'?'Fully hydrated':target.detail??'';
 const requirement=materials.map(row=>`${row.needed} ${materialNoun(row.name,row.needed)} required, ${row.have} available${row.missing?`, need ${row.missing} more`:''}`).join('; ');
 const accessibilityLabel=[label,status,progress===undefined?'':`${progress}% repair progress`,repair?`Repair cost: ${requirement}`:'',repair?.hint??detail].filter(Boolean).join('. ');
 return {label,repair:!!repair,status,progress,shield,materials,hint,hintKind,detail,accessibilityLabel};
}
