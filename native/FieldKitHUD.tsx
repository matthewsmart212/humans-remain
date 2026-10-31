import CampThreatBanner from './CampThreatBanner';
import FieldKitTargetCaption from './FieldKitTargetCaption';
import {IRONWORKS_NATIVE_ART} from './ironworks-art';
import {isPickaxe} from '../src/pickaxes';
const miningToolArt={woodenPickaxe:require('../public/survival/equipment/wooden-pickaxe-v1.png'),metalPickaxe:require('../public/survival/equipment/metal-pickaxe-v1.png')};
import BowLockGlyph from './BowLockGlyph';
import {toggleBowLock} from '../src/bow-lock';
import {movementTrailDots,type MovementTrail} from '../src/movement-trail';
import {useWaypointNavigation} from '../src/use-waypoint-navigation';
import WaypointGuide from './WaypointGuide';
import CampStationPanel from './CampStationPanel';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {AppState,View,Text,Image,Pressable,StyleSheet,type GestureResponderEvent,type NativeTouchEvent} from 'react-native';
import {useFonts} from 'expo-font';
import {FIELD_KIT_NATIVE_ART as art} from './field-kit-art';
import {heldFoodArt} from './food-art';
import {FieldKitController,fieldKitBadge,fieldKitLayout,sameFieldKit,type FieldKitIcon,type FieldKitSnapshot} from '../src/field-kit';
import {useBackpackItem,dropBackpackItem} from '../src/backpack';
import NativeFieldKitBag from './FieldKitBag';
import SkyClock from './SkyClock';
import {skyHudLayout} from '../src/sky-clock';
import NativeQuickBar from './QuickBar';
import HexActions from './HexActions';
import {ACTION_HEX} from '../src/action-hex';
import {selectQuickItem,type QuickItem} from '../src/quick-items';
import type {World,Vec} from '../src/survival-engine';
import {setFieldKitTarget} from '../src/field-kit-target';
import {combatVitalsFrame,FIELD_KIT_TOP,FIELD_KIT_UTILITY} from '../src/field-kit-vitals-layout';

const font='FieldKitBarlow';
const lightIcons={pause:require('../public/survival/ui-field-kit-v1/pause-light.png'),backpack:require('../public/survival/ui-field-kit-v1/backpack-light.png')};
export function KitIcon({name,size=24,light=false}:{name:FieldKitIcon;size?:number;light?:boolean}){return <Image source={name==='bow'?require('../public/survival/scrap-runner/bow-v1/bow-icon.webp'):name==='settings'?require('../public/survival/ui-field-kit-v1/settings.png'):light&&(name==='pause'||name==='backpack')?lightIcons[name]:art[name]} resizeMode="contain" style={{width:size,height:size,...(!light&&name==='pause'?{tintColor:'#193b3d'}:{})}}/>}
type KitButtonProps={loadBadge?:string;icon?:FieldKitIcon;glyph?:React.ReactNode;image?:number;label?:string;ariaLabel:string;kind?:'primary'|'secondary'|'utility';disabled?:boolean;pressed?:boolean;onDown:()=>void;onUp?:()=>void};
export function KitButton({loadBadge,icon,glyph,image,label='',ariaLabel,kind='secondary',disabled=false,pressed,onDown,onUp}:KitButtonProps){
 const up=useRef(onUp);up.current=onUp;
 useEffect(()=>()=>up.current?.(),[]);
 const size=kind==='utility'?FIELD_KIT_UTILITY.width:46;
 return <Pressable hitSlop={kind==='utility'?FIELD_KIT_UTILITY.hitSlop:0} accessibilityRole="button" accessibilityLabel={ariaLabel} accessibilityState={{disabled,...(pressed===undefined?{}:{selected:pressed})}} disabled={disabled}
  accessibilityActions={[{name:'activate',label:ariaLabel}]} onAccessibilityAction={e=>{if(e.nativeEvent.actionName==='activate'&&!disabled){onDown();onUp?.()}}}
  onPressIn={onDown} onPressOut={()=>up.current?.()} style={({pressed:touching})=>[s.button,{width:size,height:size},kind==='primary'?s.primary:kind==='utility'?s.utility:s.secondary,touching&&s.touching,pressed&&s.toggled,disabled&&s.disabled]}>
  {kind==='utility'&&<View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={require('../public/survival/ui-field-kit-v1/utility-panel.png')} style={[StyleSheet.absoluteFill,{width:36,height:30,borderRadius:9}]}/></View>}
  {kind!=='utility'&&<Image source={pressed?require('../public/survival/ui-field-kit-v1/action-active.png'):require('../public/survival/ui-field-kit-v1/action-normal.png')} style={[StyleSheet.absoluteFill,{width:size,height:size,opacity:1}]}/>}
  {image?<Image source={image} resizeMode="contain" style={{width:24,height:24}}/>:glyph??(icon?<KitIcon name={icon} size={kind==='utility'?21:24} light={kind==='utility'}/>:null)}
  {loadBadge&&<Text pointerEvents="none" style={{position:'absolute',right:-2,top:-2,width:12,height:12,borderRadius:6,borderWidth:1,borderColor:'#ddbe7b',backgroundColor:loadBadge==='Overloaded'?'#7c3530':'#76572c',color:'#ffedbb',fontFamily:font,fontSize:10,lineHeight:10,textAlign:'center'}}>!</Text>}
  {!!label&&<Text pointerEvents="none" style={[s.buttonLabel,kind==='primary'&&s.primaryLabel]}>{label}</Text>}
  {pressed!==undefined&&<View pointerEvents="none" style={[s.pip,pressed&&s.pipOn]}/>}
  {kind==='utility'&&<View pointerEvents="none" style={s.repair}/>}
 </Pressable>;
}

function MapGlyph(){return <View pointerEvents="none" style={{width:22,height:20,flexDirection:'row',alignItems:'center'}}>{[1,-1,1].map((fold,i)=><View key={i} style={{width:7,height:16,borderWidth:1.4,borderColor:'#f4e6c7',marginLeft:i?-1:0,transform:[{skewY:`${fold*18}deg`}]}}/>)}</View>}

/** Touching the left 40% sets an invisible origin; dragging from it moves.
 * Raw identifiers keep that drag independent of action buttons across the screen. */
type MovementGestures={isPinching?:()=>boolean;onMovementTouchStart?:(e:GestureResponderEvent)=>void};
export function FieldKitMovement({input,width,height,isPinching,onMovementTouchStart}:{input:React.MutableRefObject<Vec>;width:number;height:number}&MovementGestures){
 const active=useRef<{id:string;x:number;y:number;localX:number;localY:number}|null>(null);
 const [trail,setTrail]=useState<MovementTrail|null>(null);
 const clear=useCallback(()=>{active.current=null;input.current={x:0,y:0};setTrail(null)},[input]);
 useEffect(()=>{clear()},[clear,width,height]);
 useEffect(()=>{const state=AppState.addEventListener('change',value=>{if(value!=='active')clear()}),blur=AppState.addEventListener('blur',clear);return()=>{state.remove();blur.remove();clear()}},[clear]);
 const update=(touch:NativeTouchEvent)=>{const a=active.current;if(!a)return;const dx=touch.pageX-a.x,dy=touch.pageY-a.y,d=Math.hypot(dx,dy),length=Math.max(30,d);input.current=d<5?{x:0,y:0}:{x:dx/length,y:dy/length};setTrail({origin:{x:a.localX,y:a.localY},current:{x:a.localX+dx,y:a.localY+dy}})};
 const move=(e:GestureResponderEvent)=>{if(isPinching?.()){clear();return}const a=active.current;if(!a)return;const touch=e.nativeEvent.touches.find(t=>t.identifier===a.id);if(touch)update(touch);else clear()};
 const finish=(e:GestureResponderEvent)=>{const a=active.current;if(a&&(e.nativeEvent.changedTouches.some(t=>t.identifier===a.id)||!e.nativeEvent.touches.some(t=>t.identifier===a.id)))clear()};
 return <View accessibilityLabel="Movement touch area" accessibilityHint="Touch anywhere in the left 40 percent of the screen, then drag from that starting point to move. Release to stop." style={[s.movementZone,{width:width*.4,height}]}
  onTouchStart={e=>{onMovementTouchStart?.(e);if(isPinching?.()){clear();return}if(active.current)return;const t=e.nativeEvent;if(t.locationX<0||t.locationX>=width*.4||t.locationY<0||t.locationY>=height)return;active.current={id:t.identifier,x:t.pageX,y:t.pageY,localX:t.locationX,localY:t.locationY};input.current={x:0,y:0};const point={x:t.locationX,y:t.locationY};setTrail({origin:point,current:point})}}
  onTouchMove={move} onTouchEnd={finish} onTouchCancel={finish}>
   {trail&&<View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>{movementTrailDots(trail).map((dot,i)=><View key={i} style={{position:'absolute',left:dot.x-dot.r,top:dot.y-dot.r,width:dot.r*2,height:dot.r*2,borderRadius:dot.r,borderWidth:1,borderColor:'#123936',backgroundColor:'#f1dfb3',opacity:dot.opacity,shadowColor:'#092a2d',shadowOpacity:.8,shadowRadius:2,shadowOffset:{width:0,height:1}}}/>)}</View>}
  </View>;
}

export function FieldKitVitals({stats,width,combatWidth=width,compactWidth,onExpanded}:{stats:FieldKitSnapshot;width:number;combatWidth?:number;compactWidth?:number;onExpanded?:(open:boolean)=>void}){
 const [expanded,setExpanded]=useState(false);
 const k=width/278,compact=stats.healthCombat||compactWidth!==undefined?combatVitalsFrame(stats.healthCombat?combatWidth:compactWidth!):null,compactSize=compact?.size??fieldKitBadge.size,small=compactSize.width<220,tiny=compactSize.width<180;
 return <Pressable hitSlop={FIELD_KIT_TOP.hitSlop} accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={`Health ${stats.health} percent. Stamina ${stats.stamina} percent. Food ${stats.hunger} percent. Water ${stats.thirst} percent.`} accessibilityHint={expanded?'Tap to collapse survivor status':'Tap to expand survivor status'} onPress={()=>{setExpanded(!expanded);onExpanded?.(!expanded)}} style={expanded?{width,height:90*k}:compactSize}>
 {!expanded?<View pointerEvents="none" style={compactSize}>
  {compact?compact.pieces.map(part=><View key={part.id} style={part.clip}><Image source={art.vitals} resizeMode="stretch" style={part.image}/></View>):<View style={fieldKitBadge.panelClip}><Image source={art.vitals} resizeMode="stretch" style={fieldKitBadge.panelImage}/></View>}
  <View style={fieldKitBadge.portraitClip}><Image source={art.vitals} resizeMode="stretch" style={fieldKitBadge.portraitImage}/></View>
  {compact&&stats.healthCombat&&small?<View style={[compact.grid,{top:6,height:29}]}><View accessibilityLabel="Combat survivor status" style={{height:29}}>
   <View style={[s.combatHealth,{flex:0,height:14,gap:3}]}><KitIcon name="heart" size={12}/><View accessibilityRole="progressbar" accessibilityLabel="Combat health" accessibilityValue={{min:0,max:100,now:Math.max(0,Math.min(100,stats.health))}} style={s.combatMeter}><View style={[s.meterFill,{width:`${Math.max(0,Math.min(100,stats.health))}%`,backgroundColor:'#e9604b'}]}/></View><Text style={[s.compactValue,{width:24,fontSize:10,textAlign:'right'}]}>{stats.health}%</Text></View>
   <View style={{flexDirection:'row',height:15}}>{([['stamina',stats.stamina],['food',stats.hunger],['water',stats.thirst]] as const).map(([icon,value])=><View key={icon} style={[s.compactCell,{width:compact.grid.width/3,height:15,gap:tiny?0:1}]}><KitIcon name={icon} size={tiny?10:12}/><Text style={[s.compactValue,{fontSize:tiny?8.5:10}]}>{value}%</Text></View>)}</View>
  </View></View>:compact&&stats.healthCombat?<View style={compact.grid}><View accessibilityLabel="Combat survivor status" style={s.combatRow}>
   <View style={[s.combatHealth,{gap:compact.gap}]}><KitIcon name="heart" size={compact.iconSize}/><View accessibilityRole="progressbar" accessibilityLabel="Combat health" accessibilityValue={{min:0,max:100,now:Math.max(0,Math.min(100,stats.health))}} style={s.combatMeter}><View style={[s.meterFill,{width:`${Math.max(0,Math.min(100,stats.health))}%`,backgroundColor:'#e9604b'}]}/></View><Text numberOfLines={1} style={[s.compactValue,{width:compact.valueWidth,fontSize:compact.fontSize,textAlign:'right'}]}>{stats.health}%</Text></View>
   {([['stamina',stats.stamina],['food',stats.hunger],['water',stats.thirst]] as const).map(([icon,value])=><View key={icon} style={[s.compactCell,{width:compact.cellWidth}]}><KitIcon name={icon} size={compact.iconSize}/><Text numberOfLines={1} style={[s.compactValue,{fontSize:compact.fontSize}]}>{value}%</Text></View>)}
  </View></View>:<View style={compact?{...compact.grid,...(tiny?{top:6,height:29}:{})}:fieldKitBadge.grid}><View style={compact?{flexDirection:'row',flexWrap:'wrap',height:tiny?29:24}:s.compactRow}>{([['heart',stats.health],['stamina',stats.stamina],['food',stats.hunger],['water',stats.thirst]] as const).map(([icon,value])=><View key={icon} style={[s.compactCell,compact&&{width:compact.grid.width/(tiny?2:4),height:tiny?14.5:24,gap:tiny?0:small?1:2}]}><KitIcon name={icon} size={tiny?10:small?12:14}/><Text numberOfLines={1} style={[s.compactValue,small&&{fontSize:tiny?8.5:10}]}>{value}%</Text></View>)}</View></View>}</View>:<View pointerEvents="none" style={{width,height:90*k}}>
  <Image source={art.vitals} resizeMode="stretch" style={{position:'absolute',left:0,top:0,width,height:70*k}}/>
  <View style={{position:'absolute',left:width*.25,right:width*.05,top:18.5*k,gap:7*k}}>{(['health','stamina'] as const).map(name=><View key={name} style={{flexDirection:'row',alignItems:'center',gap:3*k,height:13*k}}>
   <KitIcon name={name==='health'?'heart':'stamina'} size={13*k}/><Text style={[s.statName,{width:39*k,fontSize:10*k}]}>{name.toUpperCase()}</Text>
   <View accessibilityRole="progressbar" accessibilityLabel={name==='health'?'Health':'Stamina'} accessibilityValue={{min:0,max:100,now:Math.min(100,stats[name])}} style={[s.meter,{height:9*k}]}><View style={[s.meterFill,{width:`${Math.min(100,stats[name])}%`,backgroundColor:name==='health'?'#e9604b':'#99bc6e'}]}/></View>
   <Text style={[s.statValue,{width:21*k,fontSize:13*k}]}>{stats[name]}</Text>
  </View>)}</View>
  <View style={{position:'absolute',left:width*.24,top:66*k,flexDirection:'row',gap:7*k}}>{(['food','water'] as const).map(name=><View key={name} style={[s.need,{gap:4*k,paddingHorizontal:7*k,paddingVertical:3*k}]}><KitIcon name={name} size={17*k}/><Text style={[s.needValue,{fontSize:13*k}]}>{name==='food'?stats.hunger:stats.thirst}%</Text></View>)}</View>
 </View>}
 </Pressable>;
}
type Props={world:React.RefObject<World|null>;controller:FieldKitController;input:React.MutableRefObject<Vec>;enabled:boolean;mapOpen?:boolean;width:number;height:number;safe:{top:number;right:number;bottom:number;left:number};sprinting:boolean;bagOpen:boolean;onBag:(open:boolean)=>void;onMap:()=>void;onHeld:(held:boolean)=>void;onSprint:()=>void;onTool:()=>void;onDodge:()=>unknown;onPause:()=>void;onLock?:()=>void;onCheckpoint?:()=>void}&MovementGestures;
export default function NativeFieldKitHUD({world,controller,input,enabled,mapOpen=false,width,height,safe,sprinting,bagOpen,onBag,onMap,onHeld,onSprint,onTool,onDodge,onPause,onLock,onCheckpoint,isPinching,onMovementTouchStart}:Props){
 const navigation=useWaypointNavigation(world,false),hasWaypoint=!!navigation.target,[dayExpanded,setDayExpanded]=useState(false);
 useFonts({[font]:require('../public/fonts/barlow-condensed-black.ttf')});
 const [stats,setStats]=useState(()=>controller.sample(world.current!)),[vitalsExpanded,setVitalsExpanded]=useState(false),latest=useRef(stats);latest.current=stats;
 const available=useRef(false);available.current=enabled&&!bagOpen&&!stats.stationPanel;
 const release=()=>{controller.release();onHeld(false)};
 const releaseAction=(channel:'primary'|'repair')=>{controller.release(channel);onHeld(controller.holdingAttack)};
 const refresh=()=>{if(!world.current)return;const next=controller.sample(world.current);setFieldKitTarget(world.current,available.current?(next.repairAction?.target??next.action.target):undefined);latest.current=next;setStats(old=>sameFieldKit(old,next)?old:next)};
 useEffect(()=>{refresh();const timer=setInterval(refresh,100);return()=>{clearInterval(timer);controller.cancel();onHeld(false)}},[world,controller]);
 useEffect(()=>{if(!enabled||bagOpen||stats.stationPanel){release();input.current={x:0,y:0}}},[enabled,bagOpen,stats.stationPanel]);
 const layout=fieldKitLayout(width,height,safe),disabled=!enabled||bagOpen||!!stats.stationPanel||stats.downed;
 const sky=skyHudLayout(width,height,safe,vitalsExpanded,!!stats.cycle,hasWaypoint,dayExpanded);
 const primary=()=>{if(!disabled&&world.current&&controller.press(world.current,latest.current.action)){onHeld(controller.holdingAttack);if(latest.current.action.key.startsWith('broken:'))onCheckpoint?.()}refresh()};
 const repair=()=>{const shown=latest.current.repairAction;if(!disabled&&!mapOpen&&world.current&&shown&&controller.pressRepair(world.current,shown)){onHeld(controller.holdingAttack);if(!shown.repair)onCheckpoint?.()}refresh()};
 const lock=()=>{if(disabled||mapOpen||!world.current)return;release();if(toggleBowLock(world.current))onLock?.();refresh()};
 const select=(item:QuickItem)=>{if(disabled||!world.current||latest.current.action.owner!==world.current)return;release();selectQuickItem(world.current,item);refresh()};
 const target=stats.repairAction?.target??stats.action.target,captionRight=stats.combat||stats.repairAction?ACTION_HEX.width+8:ACTION_HEX.width-ACTION_HEX.cells.primary.left+8;
 return <View pointerEvents="box-none" style={[StyleSheet.absoluteFill,{opacity:mapOpen?0:1}]}>
  {(!disabled||mapOpen)&&<FieldKitMovement input={input} width={width} height={height} isPinching={isPinching} onMovementTouchStart={onMovementTouchStart}/>}
  <View pointerEvents="box-none" style={{position:'absolute',left:layout.left,top:layout.top+sky.vitalsTopOffset}}><FieldKitVitals stats={stats} width={layout.vitals} compactWidth={Math.min(fieldKitBadge.size.width,sky.combatWidth)} combatWidth={stats.campThreat?Math.min(fieldKitBadge.size.width,sky.combatWidth):sky.combatWidth} onExpanded={setVitalsExpanded}/></View>
  {!stats.stationPanel&&!bagOpen&&!mapOpen&&stats.campThreat&&<CampThreatBanner threat={stats.campThreat} width={width} height={height} left={layout.left} right={layout.right} top={layout.top} toolbarWidth={sky.toolbarWidth} vitalsExpanded={vitalsExpanded}/>}
  {!stats.stationPanel&&!bagOpen&&<View pointerEvents="box-none" style={{position:'absolute',right:layout.right,top:layout.top+sky.topOffset-FIELD_KIT_UTILITY.hitSlop,gap:12,flexDirection:'row',zIndex:10}}>{stats.cycle&&<View pointerEvents="box-none" style={sky.portrait?{position:'absolute',right:0,top:44}:undefined}><SkyClock cycle={stats.cycle} world={world} paused={!enabled} width={sky.clockWidth} onExpanded={setDayExpanded}/></View>}<View pointerEvents="box-none" style={{flexDirection:'row',gap:10,paddingVertical:FIELD_KIT_UTILITY.hitSlop}}>{hasWaypoint&&<View pointerEvents="box-none"><KitButton kind="utility" glyph={<WaypointGuide world={world}/>} ariaLabel="Waypoint direction. Open map to edit or remove" disabled={disabled||mapOpen} onDown={onMap}/></View>}<KitButton kind="utility" icon="settings" ariaLabel="Open game settings. Pauses game" onDown={onPause}/><KitButton kind="utility" icon="backpack" ariaLabel={'Open backpack'+(stats.loadLabel==='Comfortable'?'':'. '+stats.loadLabel)} loadBadge={stats.loadLabel==='Comfortable'?undefined:stats.loadLabel} onDown={()=>{world.current!.stationPanel=undefined;onBag(true)}}/><KitButton kind="utility" glyph={<MapGlyph/>} ariaLabel="Open live world map" disabled={disabled} onDown={onMap}/></View></View>}
  {!!stats.notice&&<View pointerEvents="none" style={[s.notice,{left:layout.left,top:layout.top+sky.vitalsTopOffset+(vitalsExpanded?90:40)+7,maxWidth:Math.min(232,width-layout.left-layout.right)}]}><Text style={s.noticeText}>{stats.notice}</Text></View>}
  {!bagOpen&&!stats.stationPanel&&<View pointerEvents="box-none" style={{position:'absolute',right:layout.right,bottom:layout.controlsBottom,width:ACTION_HEX.width,height:ACTION_HEX.height}}>
   {target?.revealed&&<FieldKitTargetCaption target={target} width={Math.min(256,height>=width?width-layout.left-layout.right:width*.6-layout.right-captionRight-8)} style={height>=width?{right:0,bottom:ACTION_HEX.height+8}:{right:captionRight,bottom:ACTION_HEX.height-(ACTION_HEX.cells.primary.top+ACTION_HEX.cells.primary.height/2)-21}}/>}
   <HexActions primary={{icon:stats.action.icon,image:stats.action.image==='/survival/equipment/repair-hammer-v1.webp'?require('../public/survival/equipment/repair-hammer-v1.webp'):stats.action.key.startsWith('smithy:')?art.axe:stats.action.key.startsWith('furnace:')?IRONWORKS_NATIVE_ART.ironIngot:stats.action.key.startsWith('mine:')?miningToolArt[isPickaxe(stats.selected)?stats.selected:'woodenPickaxe']:stats.action.key.startsWith('forage:')?heldFoodArt(stats.action.image?.includes('apple')?'apple':'berries'):stats.action.icon==='bow'?require('../public/survival/scrap-runner/bow-v1/bow-icon.webp'):stats.action.label==='EAT'?heldFoodArt(stats.selected):undefined,label:stats.action.label,holdToRepair:!!stats.action.repair&&stats.action.label==='REPAIR',ariaLabel:stats.action.disabled&&stats.action.target?'Inspect '+stats.action.target.label+'. '+stats.action.target.detail:stats.action.description,disabled:disabled||stats.action.disabled&&!stats.action.target,unavailable:stats.action.disabled,repairProgress:stats.action.target?.repairState?stats.action.target.progress:undefined,onDown:primary,onUp:()=>releaseAction('primary')}}
    repair={stats.repairAction?{icon:stats.repairAction.icon,image:require('../public/survival/equipment/repair-hammer-v1.webp'),label:stats.repairAction.label,holdToRepair:!!stats.repairAction.repair&&stats.repairAction.label==='REPAIR',ariaLabel:stats.repairAction.description,disabled:disabled||mapOpen||stats.repairAction.disabled&&!stats.repairAction.target,unavailable:stats.repairAction.disabled,repairProgress:stats.repairAction.target?.repairState?stats.repairAction.target.progress:undefined,onDown:repair,onUp:()=>releaseAction('repair')}:undefined}
    sprint={{icon:'sprint',label:sprinting?'WALK':'SPRINT',ariaLabel:sprinting?'Walk. Tap to stop sprinting':'Sprint. Tap to start sprinting',pressed:sprinting,disabled,onDown:onSprint}}
    dodge={stats.selected==='bow'?{glyph:<BowLockGlyph locked={!!stats.bowTarget}/>,label:stats.bowTarget?'LOCKED':'LOCK',ariaLabel:stats.bowTarget?`Release lock on ${stats.bowTarget.label.toLowerCase()}`:'Lock onto a nearby target',pressed:!!stats.bowTarget,disabled:disabled||mapOpen,onDown:lock}:stats.combat?{icon:'dodge',label:stats.dodge>0?`${stats.dodge.toFixed(1)}s`:'DODGE',ariaLabel:stats.dodge>0?`Dodge ready in ${stats.dodge.toFixed(1)} seconds`:'Dodge',disabled:disabled||stats.dodge>0,onDown:()=>{onDodge();refresh()}}:undefined}/>

  </View>}
  {!bagOpen&&!stats.stationPanel&&<View pointerEvents="box-none" style={{position:'absolute',left:layout.left,bottom:layout.bottom}}><NativeQuickBar maxWidth={layout.quickbarMaxWidth} torch={stats.torch} axes={stats.axes} selected={stats.selected} cooked={stats.cooked} cookedRabbit={stats.cookedRabbit} cookedVenison={stats.cookedVenison} provisions={stats.provisions} disabled={disabled} onSelect={select}/></View>}
  {stats.stationPanel&&!bagOpen&&enabled&&world.current&&<CampStationPanel key={stats.stationPanel} world={world.current} safe={safe} width={width} height={height} onClose={()=>{world.current!.stationPanel=undefined;refresh()}} onChange={()=>{onCheckpoint?.();refresh()}}/>}
  {bagOpen&&<NativeFieldKitBag stats={stats} width={width} safe={safe} onClose={()=>onBag(false)} onUse={id=>{if(!world.current||stats.action.owner!==world.current)return false;const result=useBackpackItem(world.current,id);refresh();return result}} onDrop={(id,quantity)=>{if(!world.current||stats.action.owner!==world.current)return{ok:false,message:'This run has ended.'};const result=dropBackpackItem(world.current,id,quantity);refresh();return result}}/>}
 </View>;
}

const s=StyleSheet.create({
 toggled:{backgroundColor:'#356e43eb',borderWidth:2,borderColor:'#ffe3a0',padding:4},
 compactRow:{flexDirection:'row',height:24},compactCell:{width:44,height:24,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:2},compactValue:{fontFamily:font,fontSize:12,color:'#f4e6c7',fontVariant:['tabular-nums']},
 combatRow:{flexDirection:'row',height:24,alignItems:'center'},combatHealth:{flex:1,minWidth:0,height:24,flexDirection:'row',alignItems:'center'},combatMeter:{flex:1,minWidth:0,height:9,overflow:'hidden',borderWidth:1,borderColor:'#718c7e',borderRadius:8,backgroundColor:'#0a1d21'},
 button:{alignItems:'center',justifyContent:'center',borderRadius:40,padding:6},primary:{backgroundColor:'#123c40b8'},secondary:{backgroundColor:'#153d3f32'},utility:{padding:8,height:FIELD_KIT_UTILITY.height,backgroundColor:'#123936',borderRadius:11,borderWidth:2,borderColor:'#7f7857'},touching:{backgroundColor:'#6e877d80'},disabled:{opacity:.5},buttonLabel:{fontFamily:font,fontSize:10,lineHeight:10,color:'#f4e6c7',textAlign:'center'},primaryLabel:{fontSize:10,lineHeight:10},pip:{position:'absolute',right:1,top:1,width:7,height:7,borderRadius:5,borderWidth:1,borderColor:'#d6d5ac',backgroundColor:'#53685e'},pipOn:{backgroundColor:'#a7d86c'},repair:{position:'absolute',right:0,top:4,width:7,height:3,borderRadius:1,backgroundColor:'#b96038',transform:[{rotate:'48deg'}]},
 movementZone:{position:'absolute',left:0,top:0},
 statName:{fontFamily:font,color:'#f4e6c7'},statValue:{fontFamily:font,color:'#f4e6c7',textAlign:'right',fontVariant:['tabular-nums']},meter:{flex:1,overflow:'hidden',borderWidth:1,borderColor:'#718c7e',borderRadius:8,backgroundColor:'#0a1d21'},meterFill:{height:'100%',borderRadius:8,borderTopWidth:1,borderTopColor:'#e8dcb580'},need:{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'#554f36',borderRadius:5,backgroundColor:'#e8d9b6'},needValue:{fontFamily:font,color:'#193a3d'},
 notice:{position:'absolute',borderLeftWidth:2,borderLeftColor:'#ad9d72',borderTopRightRadius:4,borderBottomRightRadius:4,paddingHorizontal:8,paddingVertical:5,backgroundColor:'#10322fe8'},noticeText:{fontFamily:font,fontSize:12,color:'#f4e6c7',textAlign:'left'},
});
