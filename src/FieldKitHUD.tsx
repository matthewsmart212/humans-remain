import PatchScannerControl,{ScannerPowerGlyph} from './PatchScannerControl';
import {togglePatchScanner} from './patch-scanner';
import {PatchChatHUD} from './PatchPanel';
import FieldKitTargetCard from './FieldKitTargetCard';
import ExpeditionStatus from './ExpeditionStatus';
import BowLockGlyph from './BowLockGlyph';
import {toggleBowLock} from './bow-lock';
import {useWaypointNavigation} from './use-waypoint-navigation';
import WaypointGuide from './WaypointGuide';
import {PatchFieldJournal} from './PatchFieldJournal';
import CampStationPanel from './CampStationPanel';
import React,{useEffect,useRef,useState,type RefObject} from 'react';
import {Map as MapIcon} from 'lucide-react';
import {fieldKitArt,fieldKitBadge,FieldKitController,opensPatchPanelOnRelease,sameFieldKit,type FieldKitIcon,type FieldKitSnapshot} from './field-kit';
import {useBackpackItem,dropBackpackItem} from './backpack';
import FieldKitBag from './FieldKitBag';
import SkyClock from './SkyClock';
import QuickBar from './QuickBar';
import QuickItemIcon from './QuickItemIcon';
import {selectQuickItem,QUICK_ITEMS,QUICK_BAR_LAYOUT,type QuickItem} from './quick-items';
import {timeOf,type World} from './survival-engine';
import {FishingAudio,fishingSoundEnabled,FISHING_SOUND_EVENT} from './fishing-audio';
import FieldKitMovement from './FieldKitMovement';
import {setFieldKitTarget} from './field-kit-target';
import {COMBAT_VITALS_SLICES,FIELD_KIT_TOP} from './field-kit-vitals-layout';
import './field-kit.css';
import {ACTION_HEX,actionHexOutline,type ActionHexCell} from './action-hex';
import {WAREHOUSE_MATERIALS} from './warehouse';
import type {WarehouseStock} from './warehouse-hud';
import FishingHUD from './FishingHUD';
import {FishingCatchCheckpoint} from './fishing-hud-presentation';
import {resolveFishingCatch} from './fishing';

export function KitIcon({name,className='',light=false}:{name:FieldKitIcon;className?:string;light?:boolean}){return <img className={`kit-icon ${className}`} data-icon={name} src={light&&(name==='pause'||name==='backpack')?`/survival/ui-field-kit-v1/${name}-light.png`:fieldKitArt(name)} draggable={false} alt="" aria-hidden="true"/>}
// Pointer-down also works while Safari's other finger is moving the character.
const tap=(perform:()=>void)=>({onPointerDown:(e:React.PointerEvent<HTMLButtonElement>)=>{if(e.button!==0||e.currentTarget.disabled)return;e.preventDefault();e.stopPropagation();perform()},onClick:(e:React.MouseEvent<HTMLButtonElement>)=>{e.stopPropagation();if(e.detail===0&&!e.currentTarget.disabled)perform()}});
type ButtonProps={activeColor?:string;activateOnRelease?:boolean;activateOnClick?:boolean;attention?:'bite';loadBadge?:string;label:string;holdToRepair?:boolean;icon?:FieldKitIcon;glyph?:React.ReactNode;image?:string;ariaLabel?:string;className?:string;disabled?:boolean;unavailable?:boolean;repairProgress?:number;pressed?:boolean;cooldown?:string;cell?:ActionHexCell;onDown:()=>void;onUp?:()=>void;onCancel?:()=>void};
export function KitButton({activeColor,activateOnRelease=false,activateOnClick=false,attention,loadBadge,label,holdToRepair=false,icon,glyph,image,ariaLabel,className='',disabled=false,unavailable=false,repairProgress,pressed,cooldown,cell,onDown,onUp,onCancel}:ButtonProps){
 const item=cell&&image?QUICK_ITEMS.find(entry=>entry.image===image):undefined;
 const main=cell===ACTION_HEX.cells.primary;
 const iconSize=main?36:holdToRepair||cooldown?18:22;
 const pointer=useRef<number|null>(null),keyboard=useRef<string|null>(null),up=useRef(onUp),cancel=useRef(onCancel);up.current=onUp;cancel.current=onCancel;
 const releaseTap=useRef<(()=>void)|null>(null);
 const overButton=(event:React.PointerEvent<HTMLButtonElement>)=>event.currentTarget.contains(document.elementFromPoint(event.clientX,event.clientY));
 const release=(cancelled=false)=>{releaseTap.current=null;if(pointer.current===null&&keyboard.current===null)return;pointer.current=null;keyboard.current=null;(cancelled?cancel.current??up.current:up.current)?.()};
 useEffect(()=>()=>release(true),[]);
 useEffect(()=>{if(disabled)release(true)},[disabled]);
 return <button type="button" className={`kit-button ${className}`} aria-label={ariaLabel||label} aria-pressed={pressed} aria-disabled={disabled} data-unavailable={unavailable} data-hold-repair={holdToRepair} disabled={disabled} data-cooling={!!cooldown} style={cell}
  onContextMenu={e=>e.preventDefault()} onPointerDown={e=>{e.stopPropagation();if(activateOnClick||disabled||e.button!==0||pointer.current!==null||keyboard.current!==null)return;e.preventDefault();pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);releaseTap.current=activateOnRelease?onDown:null;if(!activateOnRelease)onDown()}}
  onPointerMove={e=>{if(e.pointerId===pointer.current&&(releaseTap.current||repairProgress!==undefined)&&!overButton(e))release(true)}}
  onPointerUp={e=>{
   if(e.pointerId!==pointer.current)return;
   if(activateOnRelease&&overButton(e)&&!disabled)releaseTap.current?.();
   release();
  }} onPointerCancel={e=>{if(e.pointerId===pointer.current)release(true)}} onLostPointerCapture={e=>{if(e.pointerId===pointer.current)release(true)}} onBlur={()=>release(true)}
  onClick={e=>{e.stopPropagation();if(activateOnClick){if(!disabled)onDown();return}if(e.detail===0&&!(e.nativeEvent as PointerEvent|undefined)?.pointerType&&!disabled&&pointer.current===null&&keyboard.current===null){onDown();onUp?.()}}}
  onKeyDown={e=>{if(e.key!==' '&&e.key!=='Enter')return;e.stopPropagation();if(activateOnClick||activateOnRelease)return;e.preventDefault();if(disabled||e.repeat||keyboard.current!==null||pointer.current!==null)return;keyboard.current=e.key;onDown()}}
  onKeyUp={e=>{if(e.key!==' '&&e.key!=='Enter')return;e.stopPropagation();if(activateOnClick||activateOnRelease)return;e.preventDefault();if(keyboard.current===e.key)release()}}>
  <img className="kit-button-rim" src={cell?`/survival/ui-action-hex-v1/${pressed?'active':className.includes('kit-primary')?'primary':'secondary'}.png`:`/survival/ui-field-kit-v1/action-${pressed?'active':'normal'}.png`} alt="" draggable={false}/>{item?<QuickItemIcon item={item} size={iconSize}/>:image?<img className="kit-icon" src={image} alt="" draggable={false}/>:glyph?<span className="kit-map-glyph" aria-hidden="true">{glyph}</span>:icon?<KitIcon name={icon} light={className.split(' ').includes('kit-utility')}/>:null} {label&&<span className="kit-button-label" data-long={label.length>8}>{holdToRepair&&<small>HOLD TO</small>}{label}{cooldown&&<small>{cooldown}</small>}</span>}{pressed!==undefined&&<i className="kit-toggle-pip" data-active={pressed} style={pressed&&activeColor?{background:activeColor,borderColor:'#204b56'}:undefined} aria-hidden="true"/>}
  {activeColor&&pressed&&cell&&<svg className="kit-scanner-outline" viewBox={`0 0 ${cell.width} ${cell.height}`} aria-hidden="true"><path d={actionHexOutline(cell)} fill="none" stroke={activeColor} strokeWidth="1.2" strokeLinejoin="round" opacity=".65"/></svg>}
  {attention==='bite'&&cell&&<svg className="fishing-hook-outline" viewBox={`0 0 ${cell.width} ${cell.height}`} aria-hidden="true"><path d={actionHexOutline(cell)} fill="none" stroke="#ffe6a0" strokeWidth="3" strokeLinejoin="round"/></svg>}
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
 const fishingAudio=useRef<FishingAudio|null>(null);
 useEffect(()=>{const audio=new FishingAudio();fishingAudio.current=audio;audio.setEnabled(fishingSoundEnabled());const unlock=()=>{if(available.current)audio.unlock()},settings=()=>{audio.setEnabled(fishingSoundEnabled());unlock()};document.addEventListener('pointerdown',unlock,true);document.addEventListener('keydown',unlock,true);window.addEventListener(FISHING_SOUND_EVENT,settings);return()=>{document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);window.removeEventListener(FISHING_SOUND_EVENT,settings);audio.dispose();fishingAudio.current=null}},[]);
 const available=useRef(false);available.current=enabled&&!bagOpen&&!mapOpen&&!stats.stationPanel;
 const release=()=>{controller.cancel();onHeld(false);fishingAudio.current?.pause()};
 const catchCheckpoint=useRef(new FishingCatchCheckpoint(world.current,world.current.fishing?.kept??0,world.current.fishing?.pendingCatch?.id)),checkpointCallback=useRef(onCheckpoint);checkpointCallback.current=onCheckpoint;
 const refresh=()=>{const owner=world.current,next=controller.sample(owner),saveCatch=catchCheckpoint.current.update(owner,owner.fishing?.kept??0,owner.fishing?.pendingCatch?.id);fishingAudio.current?.update(owner,next.fishing??undefined,timeOf(owner),available.current&&!document.hidden);setFieldKitTarget(owner,available.current&&!next.patchChat?(next.repairAction?.target??next.action.target):undefined);statsRef.current=next;setStats(old=>sameFieldKit(old,next)?old:next);if(saveCatch)checkpointCallback.current?.()};
 useEffect(()=>{refresh();const timer=setInterval(refresh,100);return()=>{clearInterval(timer);controller.cancel();onHeld(false)}},[world,controller]);
 useEffect(()=>{if(!enabled||bagOpen||mapOpen||stats.stationPanel){release();input.current={x:0,y:0}}},[enabled,bagOpen,mapOpen,stats.stationPanel]);
 useEffect(()=>{const hide=()=>{if(document.hidden)release()};window.addEventListener('blur',release);window.addEventListener('resize',release);document.addEventListener('visibilitychange',hide);return()=>{window.removeEventListener('blur',release);window.removeEventListener('resize',release);document.removeEventListener('visibilitychange',hide)}},[]);
 const action=stats.action,repairAction=stats.repairAction,secondaryRepair=repairAction?.key===action.key?undefined:repairAction,caption=repairAction??action,disabled=!enabled||bagOpen||mapOpen||!!stats.stationPanel||stats.downed;
 const grabbed=action.key==='brute-escape',scannerPrimary=action.key.startsWith('scanner-power:');
 const scannerPower=()=>{if(disabled||statsRef.current.action.owner!==world.current)return;release();if(togglePatchScanner(world.current))onCheckpoint?.();refresh()};
 const press=()=>{if(disabled)return;if(controller.press(world.current,action)){onHeld(controller.holdingAttack);if(action.key.startsWith('broken:')||action.key.startsWith('scanner-power:'))onCheckpoint?.()}refresh()};
 const pressRepair=()=>{const shown=statsRef.current.repairAction;if(disabled||!shown)return;if(controller.pressRepair(world.current,shown)){onHeld(controller.holdingAttack);if(shown.target?.buildingId==='headquarters')onCheckpoint?.()}refresh()};
 const releasePrimary=()=>{controller.release('primary');onHeld(controller.holdingAttack);refresh()};
 const cancelPrimary=()=>{controller.release('primary',true);onHeld(controller.holdingAttack);refresh()};
 const stop=()=>{release();refresh()};
 const catchFish=(keep:boolean)=>{if(disabled||statsRef.current.action.owner!==world.current)return;controller.release('primary',true);if(resolveFishingCatch(world.current,keep)&&!keep)onCheckpoint?.();refresh()};
 const openFishingBag=()=>{if(disabled)return;release();world.current.stationPanel=undefined;onBag(true)};
 const releaseRepair=()=>{controller.release('repair');onHeld(controller.holdingAttack)};
 const lock=()=>{if(disabled)return;release();toggleBowLock(world.current);refresh()};
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.code!=='KeyQ'||e.repeat||e.altKey||e.ctrlKey||e.metaKey||!available.current||statsRef.current.patchChat||world.current.bruteGrab||world.current.player.equipped!=='bow'||(e.target instanceof HTMLElement&&(e.target.isContentEditable||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))))return;e.preventDefault();release();toggleBowLock(world.current);refresh()};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[]);
 const select=(item:QuickItem)=>{if(disabled||statsRef.current.action.owner!==world.current)return;release();selectQuickItem(world.current,item);refresh()};
 return <div className="field-kit" data-threat={!!stats.campThreat} data-fishing={!!action.fishing} data-fishing-phase={action.fishing?stats.fishing?.phase:undefined} data-input={mobile?'touch':'desktop'} data-map-open={mapOpen} data-waypoint={!!navigation.target} data-sky-expanded={dayExpanded} style={{'--fishing-offset':`${ACTION_HEX.width-34}px`,'--kit-top-height':`${FIELD_KIT_TOP.height}px`,'--kit-top-radius':`${FIELD_KIT_TOP.radius}px`,'--kit-quick-height':`${QUICK_BAR_LAYOUT.height}px`,'--kit-target-right':`${secondaryRepair?ACTION_HEX.width+4:ACTION_HEX.width-ACTION_HEX.cells.primary.left+4}px`,'--kit-target-mid':`${ACTION_HEX.cells.primary.top+ACTION_HEX.cells.primary.height/2}px`} as React.CSSProperties}>
  {mobile&&!disabled&&<FieldKitMovement input={input} onStart={onMove} isPinching={isPinching}/>}
  {!stats.patchChat&&<>
  <FieldKitVitals stats={stats}/>
  {!stats.stationPanel&&!bagOpen&&!mapOpen&&<ExpeditionStatus threat={stats.campThreat}/>}
  {!stats.stationPanel&&!bagOpen&&<div className="kit-utilities">{stats.cycle&&<SkyClock cycle={stats.cycle} world={world} paused={!enabled} onExpanded={setDayExpanded}/>}<div className="kit-utility-buttons">{navigation.target&&<KitButton activateOnClick glyph={<WaypointGuide world={world}/>} label="" ariaLabel="Waypoint direction. Open map to edit or remove" className="kit-utility kit-waypoint-toggle" disabled={disabled} onDown={()=>onMap(true)}/>}<KitButton icon="settings" label="" ariaLabel="Open game settings. Pauses game" className="kit-utility" onDown={onPause}/><KitButton icon="backpack" label="" ariaLabel={'Open backpack'+(stats.loadLabel==='Comfortable'?'':'. '+stats.loadLabel)} loadBadge={stats.loadLabel==='Comfortable'?undefined:stats.loadLabel} className="kit-utility" onDown={()=>{world.current!.stationPanel=undefined;onBag(true)}}/><KitButton activateOnClick glyph={<MapIcon size={21} strokeWidth={1.8}/>} label="" ariaLabel="Open map (M)" className="kit-utility kit-map-toggle" disabled={!enabled||stats.downed} onDown={()=>onMap(true)}/></div></div>}
  {!!stats.notice&&<div className="kit-notice" role="status">{stats.notice}</div>}
  </>}
  {!bagOpen&&!stats.stationPanel&&!stats.patchChat&&<div className="kit-action-cluster" style={{width:ACTION_HEX.width,height:ACTION_HEX.height}}>
   {!disabled&&stats.selected==='scanner'&&<PatchScannerControl hint={stats.scannerHint} powered={!!stats.scannerOn} onToggle={!scannerPrimary&&stats.scannerAvailable?scannerPower:undefined}/>}
   {(stats.fishing&&action.fishing||stats.fishingReceipt)&&<FishingHUD hud={action.fishing?stats.fishing??undefined:undefined} receipt={stats.fishingReceipt} inputMode={mobile?'touch':'keyboard'} disabled={disabled} onCatch={catchFish} onOpenBag={openFishingBag}/>}
   {!action.fishing&&!stats.fishingReceipt&&!quickExpanded&&(stats.warehouseStock?<FieldKitWarehouseStock stock={stats.warehouseStock}/>:caption.target?.revealed&&<FieldKitTargetCard target={caption.target} description={caption.description}/>)}
   {!stats.fishing?.catch&&<><KitButton activateOnRelease={opensPatchPanelOnRelease(action.key)} cell={ACTION_HEX.cells.primary} className="kit-primary" activeColor={scannerPrimary?'#72d9f1':undefined} glyph={scannerPrimary?<ScannerPowerGlyph powered={!!stats.scannerOn}/>:undefined} attention={action.fishing&&stats.fishing?.phase==='bite'?'bite':undefined} label={action.label} holdToRepair={!!action.repair&&action.label==='REPAIR'} icon={action.icon} image={action.image} ariaLabel={action.disabled&&action.target?'Inspect '+action.target.label+'. '+action.target.detail:action.description} unavailable={action.disabled} disabled={disabled||action.disabled&&!action.target} repairProgress={action.target?.repairState?action.target.progress:undefined} pressed={scannerPrimary?!!stats.scannerOn:action.fishing&&stats.fishing?.active?stats.fishing.holding:undefined} onDown={press} onUp={releasePrimary} onCancel={cancelPrimary}/>
   {secondaryRepair&&<KitButton cell={ACTION_HEX.cells.repair} className="kit-secondary kit-repair" label={secondaryRepair.label} holdToRepair={!!secondaryRepair.repair&&secondaryRepair.label==='REPAIR'} icon={secondaryRepair.icon} image={secondaryRepair.image} ariaLabel={secondaryRepair.description} unavailable={secondaryRepair.disabled} disabled={disabled||secondaryRepair.disabled&&!secondaryRepair.target} repairProgress={secondaryRepair.target?.repairState?secondaryRepair.target.progress:undefined} onDown={pressRepair} onUp={releaseRepair}/>}
   {stats.fishing?.active&&!stats.fishing.catch?<KitButton cell={ACTION_HEX.cells.sprint} className="kit-north kit-secondary" label="STOP" icon="close" ariaLabel="Stop fishing" disabled={disabled} onDown={stop}/>:<KitButton cell={ACTION_HEX.cells.sprint} className="kit-north kit-secondary" label="SPRINT" icon="sprint" ariaLabel={sprinting?'Walk. Tap to stop sprinting':'Sprint. Tap to start sprinting'} pressed={sprinting} disabled={disabled||grabbed} onDown={onSprint}/>}
   {!grabbed&&!stats.fishing?.active&&(stats.selected==='bow'?<KitButton cell={ACTION_HEX.cells.dodge} className="kit-north-west kit-secondary kit-bow-lock" label={stats.bowTarget?'UNLOCK':'LOCK'} glyph={<BowLockGlyph locked={!!stats.bowTarget}/>} ariaLabel={stats.bowTarget?`Release lock on ${stats.bowTarget.label.toLowerCase()} (Q)`:'Lock onto a nearby target (Q)'} pressed={!!stats.bowTarget} disabled={disabled} onDown={lock}/>:stats.combat&&<KitButton cell={ACTION_HEX.cells.dodge} className="kit-north-west kit-secondary" label="DODGE" cooldown={stats.dodge>0?`${stats.dodge.toFixed(1)}s`:undefined} icon="dodge" ariaLabel={stats.dodge>0?`Dodge ready in ${stats.dodge.toFixed(1)} seconds`:'Dodge'} disabled={disabled||stats.dodge>0} onDown={()=>{onDodge();refresh()}}/>)}
   {!mobile&&<span className="kit-key-hint">{action.fishing?'Space / E · Action · WASD aim while holding cast · Esc stop':grabbed?'Tap Space repeatedly to break free':<>WASD move · Space action{repairAction?' · R repair':''} · Shift run{stats.selected==='bow'?' · Q lock':stats.combat?' · Q dodge':''} · M map</>}</span>}</>}
  </div>}
  {!bagOpen&&!stats.stationPanel&&!stats.patchChat&&<QuickBar scanner={stats.scannerOwned} torch={stats.torch} axes={stats.axes} selected={stats.selected} cooked={stats.cooked} cookedRabbit={stats.cookedRabbit} cookedVenison={stats.cookedVenison} cookedFish={stats.cookedFish} cookedCarp={stats.cookedCarp} cookedPike={stats.cookedPike} provisions={stats.provisions} disabled={disabled} onSelect={select} onExpandedChange={setQuickExpanded}/>}
  {stats.patchChat&&!disabled&&<PatchChatHUD world={world.current} onChange={save=>{if(save)onCheckpoint?.();refresh()}}/>}
  {!disabled&&!stats.patchChat&&!stats.combat&&!stats.campThreat&&!stats.fishing?.active&&stats.patchTracker&&<PatchFieldJournal world={world.current} tracker={stats.patchTracker} concealTab={!!stats.notice}/>}
  {stats.stationPanel&&!bagOpen&&enabled&&<CampStationPanel key={stats.stationPanel} world={world.current} onClose={()=>{world.current.stationPanel=undefined;refresh()}} onChange={()=>{onCheckpoint?.();refresh()}}/>}
  <FieldKitBag open={bagOpen} stats={stats} onClose={()=>onBag(false)} onUse={id=>{if(stats.action.owner!==world.current)return false;const result=useBackpackItem(world.current,id);refresh();return result}} onDrop={(id,quantity)=>{if(stats.action.owner!==world.current)return{ok:false,message:'This run has ended.'};const result=dropBackpackItem(world.current,id,quantity);refresh();return result}}/>
 </div>;
}
