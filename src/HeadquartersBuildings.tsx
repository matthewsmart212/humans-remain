import React, {useState} from 'react';
import {Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType} from 'react-native';
import {campAccessLevel, CAMP_LEVEL_NAMES, CAMP_MILESTONES, nextCampLevel, type BuiltCampLevel} from './camp-levels';
import {CAMP_REPAIRS, campBuildingPlacements} from './camp-restoration';
import {HQ_BUILDINGS, HQ_MAP, buildingArt, buildingFor, buildingStatus, planForBuilding, type HQArt, type HQBuildingId} from './headquarters-model';
import {buildingRepairCost, costRows} from './run-progression';
import type {World} from './survival-engine';
import type {RecipeStation} from './camp-recipes';
import {MAP_WIDTH, MAP_HEIGHT} from './factory-map';
import {hq, hqType, hqPrimary, hqPrimaryLabel} from './headquarters-theme';

type Source = (path: string) => ImageSourcePropType;
type Props = {
 world: World;
 width: number;
 height: number;
 source: Source;
 selected?: HQBuildingId;
 onSelect: (id: HQBuildingId) => void;
 onMark: (id: HQBuildingId) => void;
 onCrafting?: (id: RecipeStation) => void;
 onPlan: (id: string, trigger: string) => void;
 onProgression: (tier?: BuiltCampLevel) => void;
};

const states = {
 working: {label:'In service', color:hq.success},
 repair: {label:'Open for repair', color:hq.brass},
 locked: {label:'Locked', color:hq.muted},
 missing: {label:'Site missing', color:hq.muted},
} as const;
type State = keyof typeof states;

function siteState(status:string):State {
 if (status === 'In service') return 'working';
 if (status === 'Needs repair' || status === 'Damaged') return 'repair';
 return status === 'Site missing' ? 'missing' : 'locked';
}

function StateSeal({state, small = false}:{state:State; small?:boolean}) {
 const color = states[state].color;
 return <View accessible={false} style={[s.seal, small && s.smallSeal, {borderColor:color}]}>
  {state === 'working' ? <View style={[s.tick, {borderColor:color}]}/> :
   state === 'repair' ? <View style={s.hammer}><View style={[s.hammerHead,{backgroundColor:color}]}/><View style={[s.hammerHandle,{backgroundColor:color}]}/></View> :
   <View style={s.lock}><View style={[s.shackle,{borderColor:color}]}/><View style={[s.lockBody,{backgroundColor:color}]}/></View>}
 </View>;
}

function Illustration({art,source}:{art:HQArt;source:Source}) {
 // Desktop thumbnails and native sprites use the same transparent frame.
 return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
  <Image accessible={false} source={source(art.image)} resizeMode="contain" style={StyleSheet.absoluteFill}/>
  {art.overlay && <Image accessible={false} source={source(art.overlay)} resizeMode="contain" style={StyleSheet.absoluteFill}/>}
 </View>;
}

export default function HeadquartersBuildings({world,width,height,source,selected,onSelect,onPlan,onMark,onCrafting,onProgression}:Props) {
 const [box,setBox] = useState({width:0,height:0});
 const narrow = width < 640;
 const short = height < 505;
 const level = campAccessLevel(world);
 const next = nextCampLevel(level);
 // The waypoint resolver uses the first placement of each building type.
 const placed = campBuildingPlacements(world.layout);
 const sites = placed.filter((site,i)=>placed.findIndex(other=>other.id===site.id)===i);
 const findState = (id:HQBuildingId) => siteState(buildingStatus(world,buildingFor(id)));
 const nextRepair = next && CAMP_MILESTONES[next].requires.find(id => findState(id) === 'repair');
 const active = selected ?? (level === 0 ? 'headquarters' : nextRepair || sites.find(site=>findState(site.id)==='repair')?.id || 'headquarters');
 const building = buildingFor(active);
 const status = buildingStatus(world,building);
 const state = siteState(status);
 const {color} = states[state];
 const present = state !== 'missing';
 const locked = state === 'locked';
 const repairs = state === 'repair';
 const repairFromHQ = repairs && (active === 'headquarters' || world.creativeMode);
 const access = CAMP_REPAIRS[active].level;
 const requiredFor = next && CAMP_MILESTONES[next].requires.includes(active) ? next : undefined;
 const browse = (direction:number) => {
  const current = HQ_BUILDINGS.findIndex(b=>b.id===active);
  onSelect(HQ_BUILDINGS[(current + direction + HQ_BUILDINGS.length) % HQ_BUILDINGS.length].id);
 };
 const describe = status === 'Damaged' ? status : locked ? 'Locked · Camp '+access : states[state].label;
 const materials = repairs && !world.creativeMode ? costRows(world,buildingRepairCost(world,active)) : [];

 // Use a stable frame around the authored compound, expanding it for custom
 // layouts. Moving a perimeter building inside the camp moves its pin too.
 const xs = sites.map(site=>site.placement.x), ys = sites.map(site=>site.placement.y);
 const left = Math.min(MAP_WIDTH*.10,...xs), top = Math.min(MAP_HEIGHT*.09,...ys);
 const spanX = Math.max(MAP_WIDTH*.90,...xs)-left, spanY = Math.max(MAP_HEIGHT*.80,...ys)-top;
 const marker = Math.max(44,Math.min(box.width*.205,box.height*.275,153));
 const insetX = marker*.56 + 8, insetY = marker*.49 + (narrow ? 6 : 13);
 const cabinet = <View style={[s.mapFrame,narrow ? {height:Math.min(355,Math.max(215,height*.40))} : s.mapWide]}>
  <View testID="hq-building-map" style={s.map} onLayout={event=>{
   const {width:w,height:h} = event.nativeEvent.layout;
   setBox(prev=>prev.width===w && prev.height===h ? prev : {width:w,height:h});
  }}>
   <Image accessible={false} source={source(HQ_MAP)} resizeMode="stretch" style={[StyleSheet.absoluteFill,{opacity:.84}]}/>
   <View pointerEvents="none" style={[StyleSheet.absoluteFill,s.mapShade]}/>
   {box.width>0 && sites.map(({id,placement})=>{
    const b = buildingFor(id), selectedSite = active === id;
    const normalizedX = (placement.x-left)/spanX;
    const normalizedY = (placement.y-top)/spanY;
    const x = insetX + normalizedX * (box.width - 2*insetX);
    const y = insetY + normalizedY * (box.height - 2*insetY);
    const size = id==='headquarters' ? marker*1.13 : id==='fire' ? marker*.72 : marker;
    const w = Math.max(44,size), h = Math.max(44,size*.91);
    const markerState = findState(id);
    return <Pressable testID={'hq-site-'+id} key={id} accessibilityRole="button"
     accessibilityLabel={b.short+', '+buildingStatus(world,b)} accessibilityState={{selected:selectedSite}}
     onPress={()=>onSelect(id)} style={({pressed})=>[s.marker,{left:x-w/2,top:y-h/2,width:w,height:h,zIndex:selectedSite?100:Math.round(normalizedY*80)+1},pressed&&s.pressed]}>
     <View style={[s.footprint,selectedSite&&s.selectedFootprint]}/>
     <View style={[s.sprite,markerState==='locked'&&s.lockedSprite]}><Illustration art={buildingArt(world,b)} source={source}/></View>
     <View style={s.pin}><StateSeal state={markerState} small={marker<82}/></View>
     {selectedSite&&<View style={s.markerLabel}><Text numberOfLines={1} style={s.markerName}>{b.short}</Text></View>}
    </Pressable>;
   })}
   {!sites.length && <Text style={s.empty}>No building sites in this layout</Text>}
  </View>
  <View style={s.key}>{(['working','repair','locked'] as const).map(key=>
   <View key={key} style={s.keyItem}><StateSeal state={key} small/><Text style={s.keyLabel}>{states[key].label}</Text></View>
  )}</View>
 </View>;

 const action = locked ? () => onProgression(Math.max(1,access) as BuiltCampLevel) :
  repairFromHQ ? () => onPlan(planForBuilding(world,active),'hq-site-action') : () => onMark(active);
 const actionText = !present ? 'Site unavailable' : locked ? 'View camp '+access : repairFromHQ ? 'View repair plan' : 'Mark on map';
 const detail = <View style={[s.dossier,narrow && s.narrowDossier]}>
  <ScrollView style={s.scroll} contentContainerStyle={[s.page,narrow && s.narrowPage]}>
   <View style={[s.plate,{height:narrow ? 105 : short ? 108 : Math.max(175,Math.min(height*.37,285))}]}>
    <Image accessible={false} source={source(HQ_MAP)} resizeMode="cover" style={[StyleSheet.absoluteFill,s.plateTexture]}/>
    <View pointerEvents="none" style={[StyleSheet.absoluteFill,s.plateShade]}/>
    <View style={s.study}><Illustration art={buildingArt(world,building)} source={source}/></View>
    {([-1,1] as const).map(direction=><Pressable key={direction} accessibilityRole="button"
     accessibilityLabel={direction===1?'Next building':'Previous building'} onPress={()=>browse(direction)}
     style={({pressed})=>[s.turn,direction===1?s.right:s.left,pressed&&s.pressed]}>
     <Text style={s.arrow}>{direction===1?'›':'‹'}</Text>
    </Pressable>)}
   </View>
   <View style={[s.copy,short&&{paddingVertical:9}]}>
    <View style={s.status}><StateSeal state={state} small/><Text style={[s.stateText,{color}]}>{describe}</Text></View>
    <Text accessibilityRole="header" style={[s.title,(short||width<850)&&s.smallTitle]}>{building.short}</Text>
    <Text style={s.purpose}>{building.purpose}</Text>
    {requiredFor && <View style={s.requirement}><View style={s.diamond}/><Text style={s.note}>Required for Camp {requiredFor}</Text></View>}
    {locked && <Text style={s.hint}>Opens for repair at {CAMP_LEVEL_NAMES[access].toLowerCase()}.</Text>}
    {!present && <Text style={s.hint}>This building has no placement in the saved camp.</Text>}
    {!!materials.length && <View style={s.materials}>
     <Text style={s.ledgerHeading}>Repair supplies</Text>
     <View style={s.rows}>{materials.map(row=><View key={row.id} style={s.resource}>
      <Text style={s.resourceLabel}>{row.name}</Text><Text style={[s.count,{color:row.have>=row.needed?hq.success:hq.danger}]}>{row.have}/{row.needed}</Text>
     </View>)}</View>
    </View>}
    {onCrafting && (active==='fire'||active==='garden'||active==='furnace') &&
     <Pressable accessibilityRole="button" onPress={()=>onCrafting(active)} style={({pressed})=>[s.defence,pressed&&s.pressed]}><Text style={s.link}>Browse recipes　›</Text></Pressable>}
    {active==='headquarters' && level>0 && <Pressable accessibilityRole="button" testID="hq-defence-plan" onPress={()=>onPlan('reinforced-camp','hq-defence-plan')} style={({pressed})=>[s.defence,pressed&&s.pressed]}>
     <Text style={s.link}>Camp defences　›</Text>
    </Pressable>}
   </View>
  </ScrollView>
  <Pressable testID="hq-site-action" accessibilityRole="button" accessibilityLabel={actionText} disabled={!present} accessibilityState={{disabled:!present}}
   onPress={action} style={({pressed})=>[s.action,!present&&s.disabled,pressed&&s.pressed]}><Text style={s.actionText}>{actionText}</Text></Pressable>
 </View>;
 return <View style={[s.root,narrow&&s.stacked]}>{cabinet}{detail}</View>;
}

const s=StyleSheet.create({
 root:{flex:1,minHeight:0,flexDirection:'row',gap:6,backgroundColor:hq.inset,padding:5},
 stacked:{flexDirection:'column',gap:5},
 mapFrame:{borderRadius:7,borderWidth:1,borderColor:hq.edge,backgroundColor:hq.inset,overflow:'hidden'},
 mapWide:{flex:1.77,minWidth:0},
 map:{flex:1,minHeight:0,backgroundColor:hq.inset,alignItems:'center',justifyContent:'center',overflow:'hidden'},
 mapShade:Platform.OS==='web'?{backgroundImage:'radial-gradient(ellipse at 47% 47%,transparent 33%,rgba(46,36,16,.12) 68%,rgba(31,24,15,.58) 100%)'}:{},
 marker:{position:'absolute',alignItems:'center',justifyContent:'center'},
 footprint:{position:'absolute',bottom:'5%',width:'75%',height:'24%',borderRadius:100,backgroundColor:'#513e2555'},
 selectedFootprint:{borderWidth:2,borderColor:hq.brass,backgroundColor:hq.brass+'55'},
 sprite:{position:'absolute',left:0,right:0,top:1,bottom:4},
 lockedSprite:{opacity:.88,...(Platform.OS==='web'?{filter:'saturate(.73)'}:{})},
 pin:{position:'absolute',top:0,right:'10%',alignItems:'center'},
 seal:{width:28,height:28,borderRadius:15,borderWidth:2,alignItems:'center',justifyContent:'center',backgroundColor:hq.inset},
 smallSeal:{width:21,height:21,borderRadius:11,borderWidth:1.5},
 tick:{width:11,height:6,borderLeftWidth:2.5,borderBottomWidth:2.5,transform:[{rotate:'-43deg'}],marginTop:-2},
 hammer:{height:13,width:11,alignItems:'center',transform:[{rotate:'38deg'}]},
 hammerHead:{width:10,height:5,borderTopRightRadius:2,borderBottomLeftRadius:1},
 hammerHandle:{width:3,height:8},
 lock:{width:10,height:13,alignItems:'center'},
 shackle:{width:7,height:8,borderWidth:1.6,borderRadius:4,marginBottom:-3},
 lockBody:{width:10,height:7,borderRadius:1.5},
 markerLabel:{position:'absolute',bottom:-5,alignSelf:'center',backgroundColor:hq.panel,borderColor:hq.brass,borderWidth:1,paddingHorizontal:6,minWidth:42,borderRadius:3,maxWidth:'112%'},
 markerName:{fontFamily:hqType.label,fontWeight:'800',fontSize:12,lineHeight:15,letterSpacing:.4,color:hq.text,textAlign:'center',textTransform:'uppercase'},
 empty:{backgroundColor:hq.panel,color:hq.text,padding:9,textAlign:'center'},
 key:{flexDirection:'row',justifyContent:'space-evenly',alignItems:'center',gap:5,flexWrap:'wrap',borderTopWidth:1,borderTopColor:hq.edge,paddingVertical:6,backgroundColor:hq.panel},
 keyItem:{flexDirection:'row',alignItems:'center',gap:5},
 keyLabel:{fontFamily:hqType.label,fontWeight:'700',fontSize:13,letterSpacing:.4,textTransform:'uppercase',color:hq.text},
 dossier:{borderRadius:7,overflow:'hidden',flex:1,minWidth:0,minHeight:0,borderWidth:1,borderColor:hq.edge,backgroundColor:hq.panel},
 narrowDossier:{flex:1},
 scroll:{flex:1,minHeight:0},
 page:{flexGrow:1},narrowPage:{paddingBottom:3},
 plate:{backgroundColor:hq.surface,overflow:'hidden',alignItems:'center',justifyContent:'center',borderBottomWidth:1,borderBottomColor:hq.line},
 plateTexture:{opacity:.12},
 plateShade:Platform.OS==='web'?{backgroundImage:'radial-gradient(ellipse at 50% 65%,transparent 15%,rgba(7,27,29,.65) 88%)'}:{},
 study:{height:'99%',width:'81%'},
 turn:{position:'absolute',width:44,height:44,justifyContent:'center',alignItems:'center',backgroundColor:hq.inset,borderColor:hq.edge,borderWidth:1,borderRadius:7},
 left:{left:7},right:{right:7},
 arrow:{fontFamily:hqType.label,color:hq.text,fontSize:29,lineHeight:32,fontWeight:'700',marginTop:-2},
 copy:{paddingHorizontal:15,paddingVertical:16,gap:7},
 status:{flexDirection:'row',gap:7,alignItems:'center'},
 stateText:{fontFamily:hqType.label,fontSize:15,lineHeight:19,fontWeight:'800',letterSpacing:1.1,textTransform:'uppercase'},
 title:{fontFamily:hqType.display,fontSize:29,lineHeight:36,letterSpacing:.7,color:hq.text,textTransform:'uppercase'},
 smallTitle:{fontSize:21,lineHeight:27},
 purpose:{fontFamily:hqType.body,fontSize:16,lineHeight:23,color:hq.text},
 requirement:{flexDirection:'row',gap:9,alignItems:'center',marginTop:4,paddingTop:8,borderTopWidth:1,borderTopColor:hq.line},
 diamond:{width:7,height:7,transform:[{rotate:'45deg'}],backgroundColor:hq.brass},
 note:{fontFamily:hqType.label,fontWeight:'700',fontSize:15,color:hq.brass,letterSpacing:.65,textTransform:'uppercase'},
 hint:{fontFamily:hqType.body,fontSize:14,lineHeight:20,color:hq.muted},
 materials:{marginTop:3,gap:4},
 ledgerHeading:{fontFamily:hqType.label,fontWeight:'700',fontSize:13,letterSpacing:1.2,textTransform:'uppercase',color:hq.muted},
 rows:{flexDirection:'row',flexWrap:'wrap',gap:6},
 resource:{flexDirection:'row',gap:7,paddingHorizontal:8,paddingVertical:2,borderWidth:1,borderColor:hq.line,backgroundColor:hq.surface,alignItems:'center'},
 resourceLabel:{fontFamily:hqType.body,fontSize:13,color:hq.text},
 count:{fontFamily:hqType.label,fontWeight:'800',fontSize:17},
 defence:{alignSelf:'flex-start',minHeight:44,paddingHorizontal:11,justifyContent:'center',borderWidth:1,borderColor:hq.line,borderRadius:6,backgroundColor:hq.surface},
 link:{fontFamily:hqType.label,fontWeight:'700',fontSize:18,color:hq.brass},
 action:{margin:8,marginTop:3,minHeight:47,paddingVertical:7,paddingHorizontal:8,alignItems:'center',justifyContent:'center',...hqPrimary},
 actionText:{...hqPrimaryLabel,fontSize:21,lineHeight:26,textAlign:'center'},
 disabled:{opacity:.5},
 pressed:{opacity:.77},
});
