import React,{useEffect,useImperativeHandle,useRef,useState} from 'react';
import {View,Text,Image,ImageBackground,Pressable,ScrollView,StyleSheet,Platform,type ImageSourcePropType,type StyleProp,type ViewStyle} from 'react-native';
import type {World} from './survival-engine';
import {hq, hqType, hqPrimary, hqPrimaryLabel} from './headquarters-theme';
import HeadquartersOverview from './HeadquartersOverview';
import HeadquartersCrafting from './HeadquartersCrafting';
import HeadquartersBuildings from './HeadquartersBuildings';
import type {RecipeStation} from './camp-recipes';
import {CAMP_REPAIRS, buildingNeedsRepair} from './camp-restoration';
import {HQ_PAPER,HQ_BENCH_ART,buildingFor,buildingPlacement,markBuilding,headquartersPlans,planCampLevel,type HQArt,type HQTab,type HQPlan,type HQBuildingId} from './headquarters-model';
import {restoreCampBuilding,buildingRepairStatus,buildingRepairCost,campWorkStatus,repairCamp,costRows,expandCamp,campExpansionStatus} from './run-progression';
import {campAccessLevel} from './camp-levels';
import {hasGear} from './player-gear';
import type {MaterialCost} from './forge-recipes';

export type HeadquartersNavigation={back:()=>void};
type Props={navigation?:React.Ref<HeadquartersNavigation>;focusControl?:(id:string)=>void;world:World;width:number;height:number;source:(path:string)=>ImageSourcePropType;onClose:()=>void;onChange:()=>void};
const font=hqType.label;
const tabs:{id:HQTab;label:string}[]=[
 {id:'camp',label:'Progression'},{id:'buildings',label:'Buildings'},{id:'crafting',label:'Crafting'}
];
const webSurface=(backgroundImage:string):ViewStyle=>Platform.OS==='web'?{backgroundImage}:{};
const materialArt:Record<string,string>={pallets:'/survival/ui-field-kit-v1/logs.png',stone:'/survival/world-rocks-v1/river-stone-trio.webp',scrap:'/survival/ui-backpack-v1/scrap.png',ironIngot:'/survival/ironworks-v1/iron-ingot.png'};
function Art({art,source,style,locked=false}:{art:HQArt;source:Props['source'];style?:StyleProp<ViewStyle>;locked?:boolean}){
 const [box,setBox]=useState({width:1,height:1}),c=art.clip,k=c?Math.min(box.width/c[2],box.height/c[3]):1;
 return <View pointerEvents="none" onLayout={e=>setBox(e.nativeEvent.layout)} style={[s.art,style,locked&&s.lockedArt]}>
  <Image source={source(art.image)} blurRadius={locked?1:0} resizeMode={c?'stretch':'contain'} style={c?{position:'absolute',width:k,height:k,left:(box.width-c[2]*k)/2-c[0]*k,top:(box.height-c[3]*k)/2-c[1]*k}:StyleSheet.absoluteFill}/>
  {art.overlay&&<Image source={source(art.overlay)} blurRadius={locked?1:0} resizeMode="contain" style={StyleSheet.absoluteFill}/>}
 </View>;
}
function Button({testID,label,onPress,disabled=false,primary=false,ink=false,small=false,accessibilityLabel,style}:{testID?:string;label:string;onPress:()=>void;disabled?:boolean;primary?:boolean;ink?:boolean;small?:boolean;accessibilityLabel?:string;style?:StyleProp<ViewStyle>}){
 return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.button,primary&&s.primary,disabled&&s.disabled,pressed&&!disabled&&s.pressed,style]}>
  <Text style={[s.buttonText,primary&&s.primaryText,ink&&{color:'#243b2b'},small&&{fontSize:19,lineHeight:22}]}>{label}</Text>
 </Pressable>;
}
function Materials({world,cost,source}:{world:World;cost:MaterialCost;source:Props['source']}){
 const rows=costRows(world,cost);
 return <View style={s.repairLedger}>{rows.map(m=>
  <View key={m.id} accessibilityLabel={m.name+', '+m.have+' available, '+m.needed+' required'} style={s.repairRow}>
   <Art art={{image:materialArt[m.id]??materialArt.scrap}} source={source} style={{width:27,height:27}}/>
   <Text style={[s.copy,{flex:1}]}>{m.needed} {m.name.toLowerCase()}</Text>
   <Text style={[s.repairCount,m.have<m.needed&&{color:hq.danger}]}>{m.have<m.needed?(m.needed-m.have)+' short':'✓'}</Text>
  </View>)}</View>;
}
export function FurnaceRepairContent({world,source,onClose,onChange}:Pick<Props,'world'|'source'|'onClose'|'onChange'>){
 const [details,setDetails]=useState(false);
 const cost=buildingRepairCost(world,'furnace');
 const missing=costRows(world,cost).filter(row=>row.have<row.needed);
 const locked=!world.creativeMode&&campAccessLevel(world)<CAMP_REPAIRS.furnace.level;
 const canLocate=!!buildingPlacement(world,buildingFor('headquarters'));
 const instruction=world.creativeMode?'Restore the furnace.':locked?'Reach camp level '+CAMP_REPAIRS.furnace.level+' to repair the furnace.':!hasGear(world,'repairHammer')?'Find a repair hammer.':
  missing.length?'Gather '+missing.map(row=>(row.needed-row.have)+' more '+row.name.toLowerCase()).join(' and ')+'.':
  world.player.equipped!=='repairHammer'?'Equip a repair hammer.':'Hold Repair beside the furnace.';
 return <ScrollView style={s.overviewScroll} contentContainerStyle={s.furnaceRepair}>
  <Text style={s.sectionTitle}>{instruction}</Text>
  {!locked&&!world.creativeMode&&world.player.equipped!=='repairHammer'&&<Text style={s.muted}>Hold Repair beside the furnace to rebuild it.</Text>}
  {!world.creativeMode&&<Pressable testID="repair-materials" accessibilityRole="button" aria-expanded={details} accessibilityState={{expanded:details}} onPress={()=>setDetails(!details)} style={s.disclosure}>
   <Text style={s.copy}>Repair materials</Text><Text style={s.textLink}>{details?'−':'+'}</Text>
  </Pressable>}
  {details&&<Materials world={world} cost={cost} source={source}/>}
  {world.creativeMode&&!locked&&<Button primary testID="furnace-repair-action" label="Repair furnace" onPress={()=>{if(restoreCampBuilding(world,'furnace')){onChange();onClose()}}}/>}
  {locked&&canLocate&&<Button primary testID="furnace-repair-action" label="Mark headquarters on map" onPress={()=>{if(markBuilding(world,'headquarters')){onChange();onClose()}}}/>}
 </ScrollView>;
}
export default function HeadquartersContent({world:w,width,height,source,onClose,onChange,navigation,focusControl}:Props){
 const level=campAccessLevel(w),compact=height<500,narrow=width<640;
 const [tab,setTab]=useState<HQTab>('camp');
 const [selectedSite,setSelectedSite]=useState<HQBuildingId>();
 const [station,setStation]=useState<RecipeStation>('fire');
 const [planId,setPlanId]=useState<string>();
 const [milestone,setMilestone]=useState<1|2|3|4>();
 const [message,setMessage]=useState('');
 const [,setRevision]=useState(0);
 const history=useRef<{planId?:string;trigger:string}[]>([]);
 const focus=useRef('');
 const plan=planId?headquartersPlans(w).find(p=>p.id===planId):undefined;
 useEffect(()=>{
  if(focus.current){focusControl?.(focus.current);focus.current=''}
 },[tab,planId,focusControl]);
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),3200);return()=>clearTimeout(timer)},[message]);
 const changed=(text:string)=>{setMessage(text);setRevision(n=>n+1);onChange()};
 const chooseTab=(next:HQTab)=>{
  history.current=[];focus.current='hq-tab-'+next;
  setTab(next);setPlanId(undefined);setMessage('');
 };
 const visitSite=(id?:HQBuildingId)=>{
  setSelectedSite(id);
  chooseTab('buildings');
 };
 const viewProgression=(tier?:1|2|3|4)=>{
  setMilestone(tier);
  chooseTab('camp');
 };
 const visitStation=(id:RecipeStation)=>{
  setStation(id);
  chooseTab('crafting');
 };
 const openPlan=(id:string,trigger='hq-plan-'+id)=>{
  history.current.push({planId,trigger});focus.current='hq-plan-back';setPlanId(id);setMessage('');
 };
 const back=()=>{
  const previous=history.current.pop();
  if(!previous){onClose();return}
  focus.current=previous.trigger;setPlanId(previous.planId);setMessage('');
 };
 useImperativeHandle(navigation,()=>({back}));
 const findBuilding=(id:HQBuildingId)=>{if(markBuilding(w,id)){onChange();onClose()}else setMessage('This site is missing from camp.')};
 const build=()=>{
  const ok=level===0?restoreCampBuilding(w,'headquarters'):expandCamp(w);
  changed(ok?'':level===0?buildingRepairStatus(w,'headquarters'):campExpansionStatus(w));
 };
 const sectionTabs=<View accessibilityRole="tablist" style={s.tabs}>{tabs.map(t=>
  <Pressable key={t.id} testID={'hq-tab-'+t.id} accessibilityRole="tab" aria-selected={tab===t.id} accessibilityState={{selected:tab===t.id}}
   onPress={()=>chooseTab(t.id)} style={({pressed})=>[s.tab,tab===t.id&&s.tabSelected,pressed&&s.pressed]}>
   <Text style={[s.tabText,(compact||narrow)&&{fontSize:16},tab===t.id&&{color:hq.ink}]}>{t.label}</Text>
  </Pressable>)}</View>;
 const header=<>
  <View testID="hq-header" style={[s.header,(compact||narrow)&&{gap:8,paddingHorizontal:9,paddingVertical:3}]}>
   <View style={[s.brand,narrow&&{flex:1}]}>
    <View style={s.emblem}><Art art={{image:HQ_BENCH_ART}} source={source} style={{width:narrow?37:48,height:narrow?35:43}}/></View>
    <Text accessibilityRole="header" style={[s.brandTitle,{fontSize:compact||narrow?19:Math.min(27,width*.027)}]}>Headquarters</Text>
   </View>
   {!narrow&&sectionTabs}
   <View style={s.levelBadge}><Text style={s.levelBadgeText}>Camp {level}</Text></View>
   <Pressable accessibilityRole="button" accessibilityLabel="Leave headquarters" onPress={onClose} style={({pressed})=>[s.close,pressed&&s.pressed]}>
    <Image accessible={false} source={source('/survival/ui-field-kit-v1/utility-panel.png')} resizeMode="stretch" style={StyleSheet.absoluteFill}/>
    <Image accessible={false} source={source('/survival/ui-field-kit-v1/close.png')} resizeMode="contain" style={s.closeIcon}/></Pressable>
  </View>
  {narrow&&<View style={s.tabRow}>{sectionTabs}</View>}
 </>;
 const detail=(p:HQPlan)=>{
  const id=p.building,b=buildingFor(id),placed=!!buildingPlacement(w,b),locked=!w.creativeMode&&level<CAMP_REPAIRS[id].level;
  const reinforced=p.id==='reinforced-camp',needsRepair=buildingNeedsRepair(w,id);
  const previous=history.current.at(-1);
  const backLabel=previous?.planId?'Back to building':'Back to '+(tabs.find(t=>t.id===tab)?.label.toLowerCase()??'camp');
  let action=()=>findBuilding(id),label='Mark '+b.short.toLowerCase()+' on map',disabled=!placed;
  let cost:MaterialCost|undefined,ledgertitle='',hint=b.hint;
  if(locked||reinforced&&level<planCampLevel(p)){
   hint='Repair access opens at camp level '+planCampLevel(p)+'.';label='View progression';disabled=false;
   action=()=>viewProgression(Math.max(1,planCampLevel(p)) as 1|2|3|4);
  }else if(!placed){hint='This site is missing from camp.'}
  else if(reinforced){
   cost=p.cost;ledgertitle='Upgrade materials';const status=campWorkStatus(w,true);
   label=w.progression?.fortified?'Camp reinforced':'Reinforce camp';hint=status==='Ready'?p.benefit:status;disabled=status!=='Ready';
   action=()=>{if(repairCamp(w,true))changed('Camp defences reinforced.')};
   if(w.progression?.fortified)cost=undefined;
  }else if(needsRepair){
   cost=buildingRepairCost(w,id);ledgertitle=level===0&&id==='headquarters'?'Building materials':'Repair materials';
   if(id==='headquarters'||w.creativeMode){
    const status=buildingRepairStatus(w,id);label=!level&&id==='headquarters'?'Establish camp':'Repair '+b.short.toLowerCase();disabled=status!=='Ready';
    hint=disabled?status:id==='headquarters'?'Use supplies at the planning table.':'Restore this site instantly.';
    action=()=>{if(restoreCampBuilding(w,id))changed(b.name+' restored.');else changed(buildingRepairStatus(w,id))};
   }else{label='Mark repair site';hint='Equip your repair hammer and hold Repair at the marked site.'}
  }else if(id==='headquarters'){label='View progression';action=()=>{setMilestone(undefined);chooseTab('camp')}}
  return <View style={s.page}>
   <View style={s.backRow}><Button testID="hq-plan-back" label={'‹  '+backLabel} onPress={back} style={s.backButton}/></View>
   <ScrollView key={p.id} style={s.scroll} contentContainerStyle={[s.detailBody,!narrow&&s.detailAcross]}>
    <ImageBackground source={source(HQ_PAPER)} resizeMode="stretch" imageStyle={{opacity:.15}} style={[s.paper,narrow?s.portraitArt:s.wideArt]}>
     <Art art={p.art} source={source} locked={locked} style={{width:'100%',height:'100%'}}/>
    </ImageBackground>
    <View style={s.planCopy}>
     <Text style={s.levelState}>{b.group}</Text>
     <Text accessibilityRole="header" style={[s.detailTitle,(narrow||compact)&&{fontSize:32,lineHeight:36}]}>{p.title}</Text>
     <Text style={s.copy}>{p.description}</Text>
     {cost&&<View style={s.madeHere}><Text style={s.sectionTitle}>{ledgertitle}</Text><Text style={s.muted}>Backpack + camp stores</Text>
      <Materials world={w} cost={cost} source={source}/></View>}
     <Text style={s.muted}>{hint}</Text>
     <Button primary label={label} disabled={disabled} testID="hq-plan-action" onPress={action}/>
     {id==='headquarters'&&!reinforced&&level>0&&<Button label="Camp defences" testID="hq-defence-plan" onPress={()=>openPlan('reinforced-camp','hq-defence-plan')}/>}
     {(id==='fire'||id==='garden'||id==='furnace')&&<Button label="Browse crafting" onPress={()=>visitStation(id)}/>}
    </View>
   </ScrollView>
  </View>
 };
 return <View style={[s.frame,s.overviewFrame]} testID={!level?'headquarters-first-repair':undefined}>
  {header}
  {plan?<View style={s.body}>{detail(plan)}</View>:tab==='camp'?<HeadquartersOverview world={w} level={level} width={width} height={height} source={source}
   selectedTier={milestone} onSelectTier={setMilestone} onBuild={build} onMark={findBuilding} onBuilding={visitSite} onBrowse={visitSite}/>:
   tab==='buildings'?<HeadquartersBuildings world={w} width={width} height={height} source={source}
    selected={selectedSite} onSelect={setSelectedSite} onMark={findBuilding} onPlan={openPlan} onProgression={viewProgression} onCrafting={visitStation}/>:
   <HeadquartersCrafting world={w} width={width} height={height} source={source} initialStation={station} onMark={findBuilding}/>}
  {!!message&&<Pressable accessibilityRole="button" accessibilityLabel="Dismiss headquarters notification" onPress={()=>setMessage('')} style={s.feedback}><Text accessibilityLiveRegion="polite" style={s.feedbackText}>{message}　×</Text></Pressable>}
 </View>;
}

const s=StyleSheet.create({
 overviewFrame:{width:'100%',height:'100%',alignSelf:'center',margin:'auto',padding:0},
 overviewScroll:{flexGrow:0,flexShrink:1,minHeight:0},
 disclosure:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:hq.line},
 furnaceRepair:{flexGrow:1,padding:8,gap:12},
 repairLedger:{borderWidth:1,borderColor:hq.line,borderRadius:5,overflow:'hidden',backgroundColor:hq.inset},
 repairRow:{flexDirection:'row',minHeight:42,alignItems:'center',gap:8,paddingHorizontal:10},
 repairCount:{fontSize:16,fontWeight:'700',color:hq.text},
 frame:{flex:1,minWidth:0,minHeight:0,borderWidth:1,borderColor:hq.edge,borderRadius:12,backgroundColor:hq.panel,overflow:'hidden'},
 header:{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:18,paddingVertical:5,borderBottomWidth:2,borderBottomColor:hq.edge,backgroundColor:hq.surface,...webSurface('linear-gradient(178deg,#23494a,#102e2f)')},
 emblem:{alignItems:'center',justifyContent:'center'},
 brand:{flexDirection:'row',alignItems:'center',gap:8,paddingRight:12,borderRightWidth:1,borderRightColor:hq.line},
 brandTitle:{fontFamily:hqType.display,color:hq.text,textTransform:'uppercase',letterSpacing:.4},
 tabs:{flex:1,minWidth:0,flexDirection:'row',alignItems:'stretch',gap:3,paddingVertical:2},
 tabRow:{paddingHorizontal:6,borderBottomWidth:1,borderBottomColor:hq.line,backgroundColor:hq.inset},
 tab:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'transparent',borderRadius:6},
 tabSelected:hqPrimary,
 tabText:{fontFamily:font,fontWeight:'800',fontSize:20,color:hq.text},
 levelBadge:{paddingHorizontal:10,paddingVertical:4,borderWidth:1,borderColor:hq.edge,borderRadius:6,backgroundColor:hq.inset},
 levelBadgeText:{fontFamily:font,fontWeight:'800',fontSize:17,color:hq.brass,letterSpacing:1,textTransform:'uppercase'},
 close:{width:44,height:44,alignItems:'center',justifyContent:'center'},
 closeIcon:{width:23,height:23},
 body:{flex:1,minHeight:0,padding:10},
 page:{flex:1,minHeight:0,gap:8},
 art:{position:'relative',overflow:'hidden',minWidth:0},
 lockedArt:{opacity:.8,...(Platform.OS==='web'?{filter:'saturate(0.6)'}:{})},
 scroll:{flex:1,minHeight:0},
 paper:{overflow:'hidden',borderWidth:1,borderColor:hq.line,borderRadius:6,padding:18,gap:8,backgroundColor:hq.surface},
 sectionTitle:{fontFamily:font,fontWeight:'800',fontSize:25,lineHeight:29,color:hq.text,letterSpacing:.5},
 copy:{fontFamily:hqType.body,fontSize:16,lineHeight:21,color:hq.text},
 muted:{fontFamily:hqType.body,fontSize:14,lineHeight:19,color:hq.muted},
 textLink:{fontFamily:font,fontWeight:'700',fontSize:15,color:hq.brass},
 button:{minHeight:44,minWidth:44,paddingVertical:6,paddingHorizontal:13,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:hq.line,borderRadius:5,backgroundColor:hq.surface},
 buttonText:{fontFamily:font,fontWeight:'800',fontSize:20,color:hq.text,textAlign:'center'},
 primary:hqPrimary,
 primaryText:{...hqPrimaryLabel,fontSize:21},
 disabled:{opacity:.62},
 pressed:{opacity:.75},
 backRow:{minHeight:44,flexShrink:0,alignItems:'flex-start'},
 backButton:{borderWidth:0,backgroundColor:'transparent',paddingHorizontal:7},
 planCopy:{flex:1,minWidth:0,gap:12,paddingBottom:5},
 detailTitle:{fontFamily:hqType.display,fontSize:40,lineHeight:46,color:hq.text},
 levelState:{fontSize:13,color:hq.brass},
 detailBody:{paddingBottom:12,gap:14},
 detailAcross:{flexDirection:'row',alignItems:'flex-start'},
 wideArt:{flex:1,minWidth:0,height:260},
 portraitArt:{height:120},
 madeHere:{gap:8,paddingTop:12,borderTopWidth:1,borderTopColor:hq.line},
 feedback:{paddingHorizontal:10,paddingVertical:5,borderTopWidth:1,borderTopColor:hq.edge,backgroundColor:hq.surface},
 feedbackText:{fontSize:12,lineHeight:16,color:hq.text},
});
