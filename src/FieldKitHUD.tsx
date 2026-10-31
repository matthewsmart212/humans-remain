import FieldKitTargetCard from './FieldKitTargetCard';
import ExpeditionStatus from './ExpeditionStatus';
import BowLockGlyph from './BowLockGlyph';
import {toggleBowLock} from './bow-lock';
import {useWaypointNavigation} from './use-waypoint-navigation';
import WaypointGuide from './WaypointGuide';
import CampStationPanel from './CampStationPanel';
import React,{useEffect,useRef,useState,type RefObject} from 'react';
import {Map as MapIcon} from 'lucide-react';
import {fieldKitArt,fieldKitBadge,FieldKitController,sameFieldKit,dodgeProgress,type FieldKitIcon,type FieldKitSnapshot} from './field-kit';
import {useBackpackItem,dropBackpackItem} from './backpack';
import FieldKitBag from './FieldKitBag';
import SkyClock from './SkyClock';
import QuickBar from './QuickBar';
import {selectQuickItem,QUICK_ITEMS,QUICK_BAR_LAYOUT,type QuickItem} from './quick-items';
import type {World} from './survival-engine';
import FieldKitMovement from './FieldKitMovement';
import {setFieldKitTarget} from './field-kit-target';
import {COMBAT_VITALS_SLICES,FIELD_KIT_TOP} from './field-kit-vitals-layout';
import './field-kit.css';
import {ACTION_HEX,actionHexOutline,type ActionHexCell} from './action-hex';
import {WAREHOUSE_MATERIALS} from './warehouse';
import type {WarehouseStock} from './warehouse-hud';

export function KitIcon({name,className='',light=false}:{name:FieldKitIcon;className?:string;light?:boolean}){return <img className={`kit-icon ${className}`} data-icon={name} src={light&&(name==='pause'||name==='backpack')?`/survival/ui-field-kit-v1/${name}-light.png`:fieldKitArt(name)} draggable={false} alt="" aria-hidden="true"/>}
// Pointer-down also works while Safari's other finger is moving the character.
const tap=(perform:()=>void)=>({onPointerDown:(e:React.PointerEvent<HTMLButtonElement>)=>{if(e.button!==0||e.currentTarget.disabled)return;e.preventDefault();e.stopPropagation();perform()},onClick:(e:React.MouseEvent<HTMLButtonElement>)=>{e.stopPropagation();if(e.detail===0&&!e.currentTarget.disabled)perform()}});
type ButtonProps={loadBadge?:string;label:string;holdToRepair?:boolean;icon?:FieldKitIcon;glyph?:React.ReactNode;image?:string;ariaLabel?:string;className?:string;disabled?:boolean;unavailable?:boolean;repairProgress?:number;pressed?:boolean;progress?:number;cell?:ActionHexCell;onDown:()=>void;onUp?:()=>void};
export function KitButton({loadBadge,label,holdToRepair=false,icon,glyph,image,ariaLabel,className='',disabled=false,unavailable=false,repairProgress,pressed,progress,cell,onDown,onUp}:ButtonProps){
 const pointer=useRef<number|null>(null),keyboard=useRef<string|null>(null),up=useRef(onUp);up.current=onUp;
 const release=()=>{if(pointer.current===null&&keyboard.current===null)return;pointer.current=null;keyboard.current=null;up.current?.()};
 useEffect(()=>()=>up.current?.(),[]);
 return <button type="button" className={`kit-button ${className}`} aria-label={ariaLabel||label} aria-pressed={pressed} aria-disabled={disabled} data-unavailable={unavailable} data-hold-repair={holdToRepair} disabled={disabled} style={{...cell,...(progress===undefined?{}:{'--kit-progress':progress})} as React.CSSProperties}
  onContextMenu={e=>e.preventDefault()} onPointerDown={e=>{e.stopPropagation();if(disabled||e.button!==0||pointer.current!==null)return;e.preventDefault();pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);onDown()}}
  onPointerUp={e=>{if(e.pointerId===pointer.current)release()}} onPointerCancel={release} onLostPointerCapture={release} onBlur={release}
  onClick={e=>{e.stopPropagation();if(e.detail===0&&!disabled){onDown();onUp?.()}}}
  onKeyDown={e=>{if(e.key!==' '&&e.key!=='Enter')return;e.preventDefault();e.stopPropagation();if(disabled||e.repeat||keyboard.current!==null||pointer.current!==null)return;keyboard.current=e.key;onDown()}}
  onKeyUp={e=>{if(e.key!==' '&&e.key!=='Enter')return;e.preventDefault();e.stopPropagation();if(keyboard.current===e.key)release()}}>
  <img className="kit-button-rim" src={cell?`/survival/ui-action-hex-v1/${pressed?'active':className.includes('kit-primary')?'primary':'secondary'}.png`:`/survival/ui-field-kit-v1/action-${pressed?'active':'normal'}.png`} alt="" draggable={false}/>{image?<img className="kit-icon" src={image} alt="" draggable={false}/>:glyph?<span className="kit-map-glyph" aria-hidden="true">{glyph}</span>:icon?<KitIcon name={icon} light={className.split(' ').includes('kit-utility')}/>:null} {label&&<span className="kit-button-label">{holdToRepair&&<small>HOLD TO</small>}{label}</span>}{pressed!==undefined&&<i className="kit-toggle-pip" data-active={pressed} aria-hidden="true"/>}
  {loadBadge&&<span className="kit-pack-load" data-overloaded={loadBadge==='Overloaded'} aria-hidden="true">!</span>}
  {repairProgress!==undefined&&cell&&<svg className="kit-repair-outline" viewBox={`0 0 ${cell.width} ${cell.height}`} aria-hidden="true"><path d={actionHexOutline(cell)} pathLength={100} strokeDasharray={`${Math.max(0,Math.min(1,repairProgress))*100} 100`}/></svg>}
 </button>;
}

export function FieldKitVitals({stats}:{stats:FieldKitSnapshot}){
 const [expanded,setExpanded]=useState(false);
 const summary=`Health ${stats.health}%. Stamina ${stats.stamina}%. Food ${stats.hunger}%. Water ${stats.thirst}%.`;
 return <div className="kit-vitals-toggle" data-expanded={expanded} data-combat={stats.healthCombat}>
 <button type="button" className="kit-vitals-hit" aria-label={`${summary} ${expanded?'Collapse':'Expand'} survivor status`} aria-expanded={expanded} {...tap(()=>setExpanded(value=>!value))} onKeyDown={e=>e.stopPropagation()} onKeyUp={e=>e.stopPropagation()}>
 {!expanded?<span className="kit-vitals-compact" data-combat={stats.healthCombat} style={{width:'100%',height:FIELD_KIT_TOP.height}}>
  <span className="kit-combat-skin" aria-hidden="true">{COMBAT_VITALS_SLICES.map(part=><span key={part.id} className="kit-combat-slice" style={'width' in part?{width:part.width}:{flex:1}}><img src={fieldKitArt('vitals')} alt="" draggable={false} style={{position:'absolute',left:`${-part.from/(part.to-part.from)*100}%`,top:0,width:`${834/(part.to-part.from)*100}%`,height:40}}/></span>)}</span>
  <span style={fieldKitBadge.portraitClip} aria-hidden="true"><img style={fieldKitBadge.portraitImage} src={fieldKitArt('vitals')} alt="" draggable={false}/></span>
  {stats.healthCombat?<span className="kit-combat-grid">
   <span className="kit-compact-health"><KitIcon name="heart"/><span className="kit-combat-meter" role="progressbar" aria-label="Combat health" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0,Math.min(100,stats.health))}><i style={{width:`${Math.max(0,Math.min(100,stats.health))}%`}}/></span><b>{stats.health}%</b></span>
   {([['stamina',stats.stamina],['food',stats.hunger],['water',stats.thirst]] as const).map(([icon,value])=><span className="kit-compact-cell" key={icon}><KitIcon name={icon}/><b>{value}%</b></span>)}
  </span>:<span className="kit-compact-grid">{([['heart',stats.health],['stamina',stats.stamina],['food',stats.hunger],['water',stats.thirst]] as const).map(([icon,value])=><span className="kit-compact-cell" key={icon}><KitIcon name={icon}/><b>{value}%</b></span>)}</span>}
 </span>:<span className="kit-vitals" data-downed={stats.downed}>
  <img className="kit-vitals-skin" src={fieldKitArt('vitals')} alt="" draggable={false}/>
  <span className="kit-meters">{(['health','stamina'] as const).map(name=><span className={`kit-stat kit-stat-${name}`} key={name}>
   <KitIcon name={name==='health'?'heart':'stamina'}/><span className="kit-stat-name">{name}</span><span className="kit-meter" role="progressbar" aria-label={name==='health'?'Health':'Stamina'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,stats[name])}><i style={{width:`${Math.min(100,stats[name])}%`}}/></span><b>{stats[name]}</b>
  </span>)}</span>
  <span className="kit-needs"><span aria-label={`Food ${stats.hunger}%`}><KitIcon name="food"/><b>{stats.hunger}%</b></span><span aria-label={`Water ${stats.thirst}%`}><KitIcon name="water"/><b>{stats.thirst}%</b></span></span>
 </span>}
 </button>
 </div>;
}

type Props={world:RefObject<World>;controller:FieldKitController;enabled:boolean;mobile:boolean;input:React.MutableRefObject<{x:number;y:number}>;sprinting:boolean;onSprint:()=>void;onHeld:(held:boolean)=>void;onDodge:()=>unknown;onTool:()=>void;onMove:()=>void;onPause:()=>void;bagOpen:boolean;onBag:(open:boolean)=>void;mapOpen:boolean;onMap:(open:boolean)=>void;isPinching?:()=>boolean;onCheckpoint?:()=>void};
export function FieldKitWarehouseStock({stock}:{stock:WarehouseStock}){
 return <div className="kit-target kit-warehouse-stock" role="group" aria-label="Stored in warehouse">
  <div className="kit-target-heading"><b className="kit-target-name">Warehouse</b><span className="kit-warehouse-label">Stored</span></div>
  <div className="kit-warehouse-materials">{WAREHOUSE_MATERIALS.map(material=><span className="kit-warehouse-material" key={material.id} aria-label={`${material.name}: ${stock[material.id]} stored`}>
   <img src={material.image} alt="" draggable={false}/><strong>{stock[material.id]}</strong>
  </span>)}</div>
 </div>;
}
export default function FieldKitHUD({world,controller,enabled,mobile,input,sprinting,onSprint,onHeld,onDodge,onTool,onMove,onPause,bagOpen,onBag,mapOpen,onMap,isPinching,onCheckpoint}:Props){
 const navigation=useWaypointNavigation(world,false),[dayExpanded,setDayExpanded]=useState(false),[quickExpanded,setQuickExpanded]=useState(false);
 const [stats,setStats]=useState(()=>controller.sample(world.current)),statsRef=useRef(stats);statsRef.current=stats;
 const available=useRef(false);available.current=enabled&&!bagOpen&&!mapOpen&&!stats.stationPanel;
 const release=()=>{controller.release();onHeld(false)};
 const refresh=()=>{const next=controller.sample(world.current);setFieldKitTarget(world.current,available.current?(next.repairAction?.target??next.action.target):undefined);statsRef.current=next;setStats(old=>sameFieldKit(old,next)?old:next)};
 useEffect(()=>{refresh();const timer=setInterval(refresh,100);return()=>{clearInterval(timer);controller.cancel();onHeld(false)}},[world,controller]);
 useEffect(()=>{if(!enabled||bagOpen||mapOpen||stats.stationPanel){release();input.current={x:0,y:0}}},[enabled,bagOpen,mapOpen,stats.stationPanel]);
 useEffect(()=>{const hide=()=>{if(document.hidden)release()};window.addEventListener('blur',release);window.addEventListener('resize',release);document.addEventListener('visibilitychange',hide);return()=>{window.removeEventListener('blur',release);window.removeEventListener('resize',release);document.removeEventListener('visibilitychange',hide)}},[]);
 const action=stats.action,repairAction=stats.repairAction,caption=repairAction??action,disabled=!enabled||bagOpen||mapOpen||!!stats.stationPanel||stats.downed;
 const press=()=>{if(disabled)return;if(controller.press(world.current,statsRef.current.action)){onHeld(controller.holdingAttack);if(statsRef.current.action.key.startsWith('broken:'))onCheckpoint?.()}refresh()};
 const pressRepair=()=>{const shown=statsRef.current.repairAction;if(disabled||!shown)return;if(controller.pressRepair(world.current,shown)){onHeld(controller.holdingAttack);if(shown.target?.buildingId==='headquarters')onCheckpoint?.()}refresh()};
 const releasePrimary=()=>{controller.release('primary');onHeld(controller.holdingAttack)};
 const releaseRepair=()=>{controller.release('repair');onHeld(controller.holdingAttack)};
 const lock=()=>{if(disabled)return;release();toggleBowLock(world.current);refresh()};
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.code!=='KeyQ'||e.repeat||e.altKey||e.ctrlKey||e.metaKey||!available.current||world.current.player.equipped!=='bow'||(e.target instanceof HTMLElement&&(e.target.isContentEditable||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))))return;e.preventDefault();release();toggleBowLock(world.current);refresh()};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[]);
 const select=(item:QuickItem)=>{if(disabled||statsRef.current.action.owner!==world.current)return;release();selectQuickItem(world.current,item);refresh()};
 return <div className="field-kit" data-threat={!!stats.campThreat} data-input={mobile?'touch':'desktop'} data-map-open={mapOpen} data-waypoint={!!navigation.target} data-sky-expanded={dayExpanded} style={{'--kit-top-height':`${FIELD_KIT_TOP.height}px`,'--kit-top-radius':`${FIELD_KIT_TOP.radius}px`,'--kit-quick-height':`${QUICK_BAR_LAYOUT.height}px`,'--kit-target-right':`${repairAction?ACTION_HEX.width+4:ACTION_HEX.width-ACTION_HEX.cells.primary.left+4}px`,'--kit-target-mid':`${ACTION_HEX.cells.primary.top+ACTION_HEX.cells.primary.height/2}px`} as React.CSSProperties}>
  {mobile&&!disabled&&<FieldKitMovement input={input} onStart={onMove} isPinching={isPinching}/>}
  <FieldKitVitals stats={stats}/>
  {!stats.stationPanel&&!bagOpen&&!mapOpen&&<ExpeditionStatus threat={stats.campThreat}/>}
  {!stats.stationPanel&&!bagOpen&&<div className="kit-utilities">{stats.cycle&&<SkyClock cycle={stats.cycle} world={world} paused={!enabled} onExpanded={setDayExpanded}/>}<div className="kit-utility-buttons">{navigation.target&&<KitButton glyph={<WaypointGuide world={world}/>} label="" ariaLabel="Waypoint direction. Open map to edit or remove" className="kit-utility kit-waypoint-toggle" disabled={disabled} onDown={()=>onMap(true)}/>}<KitButton icon="settings" label="" ariaLabel="Open game settings. Pauses game" className="kit-utility" onDown={onPause}/><KitButton icon="backpack" label="" ariaLabel={'Open backpack'+(stats.loadLabel==='Comfortable'?'':'. '+stats.loadLabel)} loadBadge={stats.loadLabel==='Comfortable'?undefined:stats.loadLabel} className="kit-utility" onDown={()=>{world.current!.stationPanel=undefined;onBag(true)}}/><KitButton glyph={<MapIcon size={21} strokeWidth={1.8}/>} label="" ariaLabel="Open map (M)" className="kit-utility kit-map-toggle" disabled={!enabled||stats.downed} onDown={()=>onMap(true)}/></div></div>}
  {!!stats.notice&&<div className="kit-notice" role="status">{stats.notice}</div>}
  {!bagOpen&&!stats.stationPanel&&<div className="kit-action-cluster" style={{width:ACTION_HEX.width,height:ACTION_HEX.height}}>
   {!quickExpanded&&(stats.warehouseStock?<FieldKitWarehouseStock stock={stats.warehouseStock}/>:caption.target?.revealed&&<FieldKitTargetCard target={caption.target} description={caption.description}/>)}
   <KitButton cell={ACTION_HEX.cells.primary} className="kit-primary" label={action.label} holdToRepair={!!action.repair&&action.label==='REPAIR'} icon={action.icon} image={action.image??(action.label==='EAT'?QUICK_ITEMS.find(item=>item.id===stats.selected)?.image:undefined)} ariaLabel={action.disabled&&action.target?'Inspect '+action.target.label+'. '+action.target.detail:action.description} unavailable={action.disabled} disabled={disabled||action.disabled&&!action.target} repairProgress={action.target?.repairState?action.target.progress:undefined} onDown={press} onUp={releasePrimary}/>
   {repairAction&&<KitButton cell={ACTION_HEX.cells.repair} className="kit-secondary kit-repair" label={repairAction.label} holdToRepair={!!repairAction.repair&&repairAction.label==='REPAIR'} icon={repairAction.icon} image={repairAction.image} ariaLabel={repairAction.description} unavailable={repairAction.disabled} disabled={disabled||repairAction.disabled&&!repairAction.target} repairProgress={repairAction.target?.repairState?repairAction.target.progress:undefined} onDown={pressRepair} onUp={releaseRepair}/>}
   <KitButton cell={ACTION_HEX.cells.sprint} className="kit-north kit-secondary" label={sprinting?'WALK':'SPRINT'} icon="sprint" ariaLabel={sprinting?'Walk. Tap to stop sprinting':'Sprint. Tap to start sprinting'} pressed={sprinting} disabled={disabled} onDown={onSprint}/>
   {stats.selected==='bow'?<KitButton cell={ACTION_HEX.cells.dodge} className="kit-north-west kit-secondary kit-bow-lock" label={stats.bowTarget?'LOCKED':'LOCK'} glyph={<BowLockGlyph locked={!!stats.bowTarget}/>} ariaLabel={stats.bowTarget?`Release lock on ${stats.bowTarget.label.toLowerCase()} (Q)`:'Lock onto a nearby target (Q)'} pressed={!!stats.bowTarget} disabled={disabled} onDown={lock}/>:stats.combat&&<KitButton cell={ACTION_HEX.cells.dodge} className="kit-north-west kit-secondary" label={stats.dodge>0?`${stats.dodge.toFixed(1)}s`:'DODGE'} icon="dodge" ariaLabel={stats.dodge>0?`Dodge ready in ${stats.dodge.toFixed(1)} seconds`:'Dodge'} disabled={disabled||stats.dodge>0} progress={dodgeProgress(stats.dodge)} onDown={()=>{onDodge();refresh()}}/>}
   {!mobile&&<span className="kit-key-hint">WASD move · Space action{repairAction?' · R repair':''} · Shift run{stats.selected==='bow'?' · Q lock':''} · M map</span>}
  </div>}
  {!bagOpen&&!stats.stationPanel&&<QuickBar torch={stats.torch} axes={stats.axes} selected={stats.selected} cooked={stats.cooked} cookedRabbit={stats.cookedRabbit} cookedVenison={stats.cookedVenison} provisions={stats.provisions} disabled={disabled} onSelect={select} onExpandedChange={setQuickExpanded}/>}
  {stats.stationPanel&&!bagOpen&&enabled&&<CampStationPanel key={stats.stationPanel} world={world.current} onClose={()=>{world.current.stationPanel=undefined;refresh()}} onChange={()=>{onCheckpoint?.();refresh()}}/>}
  <FieldKitBag open={bagOpen} stats={stats} onClose={()=>onBag(false)} onUse={id=>{if(stats.action.owner!==world.current)return false;const result=useBackpackItem(world.current,id);refresh();return result}} onDrop={(id,quantity)=>{if(stats.action.owner!==world.current)return{ok:false,message:'This run has ended.'};const result=dropBackpackItem(world.current,id,quantity);refresh();return result}}/>
 </div>;
}
