import React,{useEffect,useImperativeHandle,useRef,useState} from 'react';
import {View,Text,Image,ImageBackground,Pressable,ScrollView,StyleSheet,Platform,type ImageSourcePropType,type StyleProp,type ViewStyle} from 'react-native';
import type {World} from './survival-engine';
import {stationPalette as colors} from './station-palette';
import HeadquartersOverview from './HeadquartersOverview';
import HeadquartersCrafting from './HeadquartersCrafting';
import {CAMP_BUILDING_IDS, CAMP_REPAIRS, buildingNeedsRepair, buildingRestored} from './camp-restoration';
import {HQ_PAPER,HQ_BENCH_ART,buildingFor,buildingStatus,buildingPlacement,markBuilding,headquartersPlans,planForBuilding,planCampLevel,equipmentInventory,type HQArt,type HQTab,type HQPlan,type HQBuildingId} from './headquarters-model';
import {restoreCampBuilding,buildingRepairStatus,buildingRepairCost,campWorkStatus,repairCamp,costRows,recipeUnlocked,expandCamp,campExpansionStatus} from './run-progression';
import {campAccessLevel} from './camp-levels';
import {hasGear} from './player-gear';
import {canPayMaterials} from './camp-materials';
import type {MaterialCost} from './forge-recipes';

export type HeadquartersNavigation={back:()=>void};
type Props={navigation?:React.Ref<HeadquartersNavigation>;focusControl?:(id:string)=>void;world:World;width:number;height:number;source:(path:string)=>ImageSourcePropType;onClose:()=>void;onChange:()=>void};
const font=Platform.OS==='web'?'Barlow Condensed':'FieldKitBarlow';
const tabs:{id:HQTab;label:string}[]=[
 {id:'camp',label:'Progression'},{id:'buildings',label:'Buildings'},{id:'crafting',label:'Crafting'}
];
const webSurface=(backgroundImage:string):ViewStyle=>Platform.OS==='web'?{backgroundImage}:{};
const stationSurface='linear-gradient(115deg,#2a302d,#202523 55%,#1d211f)';
const tileSurface='linear-gradient(135deg,#323934,#272c29)';
const goldSurface='linear-gradient(110deg,#ead09a,#d5b479)';
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
   <Text style={[s.repairCount,m.have<m.needed&&{color:colors.danger}]}>{m.have<m.needed?(m.needed-m.have)+' short':'✓'}</Text>
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
 const [planId,setPlanId]=useState<string>();
 const [milestone,setMilestone]=useState<1|2|3|4>();
 const [message,setMessage]=useState('');
 const [,setRevision]=useState(0);
 const history=useRef<{planId?:string;trigger:string}[]>([]);
 const focus=useRef('');
 const plans=headquartersPlans(w);
 const plan=plans.find(p=>p.id===planId);
 useEffect(()=>{
  if(focus.current){focusControl?.(focus.current);focus.current=''}
 },[tab,planId,focusControl]);
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),3200);return()=>clearTimeout(timer)},[message]);
 const changed=(text:string)=>{setMessage(text);setRevision(n=>n+1);onChange()};
 const chooseTab=(next:HQTab)=>{
  history.current=[];focus.current='hq-tab-'+next;
  setTab(next);setPlanId(undefined);setMessage('');
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
  changed(ok?'Camp level '+campAccessLevel(w)+' reached.':level===0?buildingRepairStatus(w,'headquarters'):campExpansionStatus(w));
 };
 const sectionTabs=<View accessibilityRole="tablist" style={s.tabs}>{tabs.map(t=>
  <Pressable key={t.id} testID={'hq-tab-'+t.id} accessibilityRole="tab" aria-selected={tab===t.id} accessibilityState={{selected:tab===t.id}}
   onPress={()=>chooseTab(t.id)} style={[s.tab,tab===t.id&&s.tabSelected]}>
   <Text style={[s.tabText,(compact||narrow)&&{fontSize:18},tab===t.id&&{color:colors.brass}]}>{t.label}</Text>
  </Pressable>)}</View>;
 const header=<>
  <View style={[s.header,(compact||narrow)&&{gap:8,paddingVertical:3}]}>
   <View style={[s.brand,narrow&&{flex:1}]}>
    <View style={s.emblem}><Art art={{image:HQ_BENCH_ART}} source={source} style={{width:34,height:33}}/></View>
    <Text accessibilityRole="header" style={[s.brandTitle,{fontSize:compact||narrow?22:27}]}>Headquarters</Text>
   </View>
   {!narrow&&sectionTabs}
   <Text style={s.levelBadgeText}>Camp {level}</Text>
   <Pressable accessibilityRole="button" accessibilityLabel="Leave headquarters" onPress={onClose} style={s.close}><Text style={s.closeText}>×</Text></Pressable>
  </View>
  {narrow&&<View style={s.tabRow}>{sectionTabs}</View>}
 </>;
 const buildingRoster=()=>{
  const groups=[
   {title:'In service',items:[] as HQPlan[]},
   {title:'Open for repair',items:[] as HQPlan[]},
   {title:'Locked sites',items:[] as HQPlan[]},
  ];
  for(const id of CAMP_BUILDING_IDS){
   const entry=plans.find(p=>p.building===id)!;
   const group=!w.creativeMode&&level<CAMP_REPAIRS[id].level?2:buildingRestored(w,id)&&buildingPlacement(w,buildingFor(id))?0:1;
   groups[group].items.push(entry);
  }
  return <ScrollView style={s.scroll} contentContainerStyle={s.roster}>
   {groups.filter(group=>group.items.length).map(({title,items})=><View key={title} style={s.planGroup}>
    <View style={s.levelHeading}><Text accessibilityRole="header" style={s.levelName}>{title}</Text><View style={s.levelRule}/><Text style={s.levelState}>{items.length}</Text></View>
    <View style={s.planGrid}>{items.sort((a,b)=>planCampLevel(a)-planCampLevel(b)).map(p=>{
     const info=buildingFor(p.building),locked=!w.creativeMode&&level<CAMP_REPAIRS[p.building].level;
     const state=buildingStatus(w,info);
     const badge=state==='Needs repair'&&canPayMaterials(w,buildingRepairCost(w,p.building))?'Repair supplies ready':state;
     return <Pressable key={p.id} testID={'hq-plan-'+p.id} accessibilityRole="button" accessibilityLabel={p.title+'. '+badge}
      onPress={()=>openPlan(p.id)} style={({pressed})=>[s.catalogueCard,{width:width<540?'100%':width<1030?'49%':'32.6%'},locked&&s.catalogueLocked,pressed&&s.pressed]}>
      <Art art={p.art} source={source} locked={locked} style={s.catalogueArt}/>
      <View style={s.catalogueIdentity}><Text style={s.catalogueState}>{badge}</Text>
       <Text style={s.catalogueTitle}>{p.title}</Text><Text style={s.muted}>{info.purpose}</Text>
      </View><Text accessible={false} style={s.catalogueChevron}>›</Text>
     </Pressable>
    })}</View>
   </View>)}
  </ScrollView>;
 };
 const detail=(p:HQPlan)=>{
  const id=p.building,b=buildingFor(id),placed=!!buildingPlacement(w,b),locked=!w.creativeMode&&level<CAMP_REPAIRS[id].level;
  const reinforced=p.id==='reinforced-camp',needsRepair=buildingNeedsRepair(w,id);
  const previous=history.current.at(-1);
  const backLabel=previous?.planId?'Back to building':'Back to '+(tabs.find(t=>t.id===tab)?.label.toLowerCase()??'camp');
  let action=()=>findBuilding(id),label='Mark '+b.short.toLowerCase()+' on map',disabled=!placed;
  let cost:MaterialCost|undefined,ledgertitle='',hint=b.hint;
  if(locked||reinforced&&level<planCampLevel(p)){
   hint='Repair access opens at camp level '+planCampLevel(p)+'.';label='View progression';disabled=false;
   action=()=>{setMilestone(Math.max(1,planCampLevel(p)) as 1|2|3|4);chooseTab('camp')};
  }else if(!placed){hint='This site is missing from camp.'}
  else if(reinforced){
   cost=p.cost;ledgertitle='Upgrade materials';const status=campWorkStatus(w,true);
   label=w.progression?.fortified?'Camp reinforced':'Reinforce camp';hint=status==='Ready'?p.benefit:status;disabled=status!=='Ready';
   action=()=>{if(repairCamp(w,true))changed('Camp defences reinforced.')};
   if(w.progression?.fortified)cost=undefined;
  }else if(p.gearId){
   cost=p.cost;ledgertitle='Crafting materials';
   if(!recipeUnlocked(w,p.gearId)){
    const needed=!buildingRestored(w,'headquarters')?'headquarters':!buildingRestored(w,'workshop')?'workshop':'furnace';
    label='View '+buildingFor(needed).short.toLowerCase();hint='Repair '+buildingFor(needed).short.toLowerCase()+' to unlock this recipe.';
    action=()=>openPlan(planForBuilding(w,needed),'hq-plan-action');
   }else{hint='Craft at the workshop using backpack and camp supplies.'}
  }else if(needsRepair){
   cost=buildingRepairCost(w,id);ledgertitle=level===0&&id==='headquarters'?'Building materials':'Repair materials';
   if(id==='headquarters'||w.creativeMode){
    const status=buildingRepairStatus(w,id);label=!level&&id==='headquarters'?'Establish camp':'Repair '+b.short.toLowerCase();disabled=status!=='Ready';
    hint=disabled?status:id==='headquarters'?'Use supplies at the planning table.':'Restore this site instantly.';
    action=()=>{if(restoreCampBuilding(w,id))changed(b.name+' restored.');else changed(buildingRepairStatus(w,id))};
   }else{label='Mark repair site';hint='Equip your repair hammer and hold Repair at the marked site.'}
  }else if(id==='headquarters'){label='View progression';action=()=>{setMilestone(undefined);chooseTab('camp')}}
  const held=p.gearId?equipmentInventory(w,p.gearId):undefined;
  return <View style={s.page}>
   <View style={s.backRow}><Button testID="hq-plan-back" label={'‹  '+backLabel} onPress={back} style={s.backButton}/></View>
   <ScrollView key={p.id} style={s.scroll} contentContainerStyle={[s.detailBody,!narrow&&s.detailAcross]}>
    <ImageBackground source={source(HQ_PAPER)} resizeMode="stretch" imageStyle={{opacity:.15}} style={[s.paper,narrow?s.portraitArt:s.wideArt]}>
     <Art art={p.art} source={source} locked={locked} style={{width:'100%',height:'100%'}}/>
    </ImageBackground>
    <View style={s.planCopy}>
     <Text style={s.levelState}>{p.gearId?'Workshop recipe':b.group}</Text>
     <Text accessibilityRole="header" style={[s.detailTitle,(narrow||compact)&&{fontSize:32,lineHeight:36}]}>{p.title}</Text>
     <Text style={s.copy}>{p.description}</Text>
     {held&&<Text style={s.muted}>Backpack {held.pack} · Storage {held.stored}</Text>}
     {cost&&<View style={s.madeHere}><Text style={s.sectionTitle}>{ledgertitle}</Text><Text style={s.muted}>Backpack + camp stores</Text>
      <Materials world={w} cost={cost} source={source}/></View>}
     <Text style={s.muted}>{hint}</Text>
     <Button primary label={label} disabled={disabled} testID="hq-plan-action" onPress={action}/>
     {id==='headquarters'&&!reinforced&&level>0&&<Button label="Camp defences" testID="hq-defence-plan" onPress={()=>openPlan('reinforced-camp','hq-defence-plan')}/>}
     {!p.gearId&&['workshop','fire','garden','furnace'].includes(id)&&<Button label="Browse crafting" onPress={()=>chooseTab('crafting')}/>}
    </View>
   </ScrollView>
  </View>
 };
 return <View style={[s.frame,s.overviewFrame]} testID={!level?'headquarters-first-repair':undefined}>
  {header}
  {plan?<View style={s.body}>{detail(plan)}</View>:tab==='camp'?<HeadquartersOverview world={w} level={level} width={width} height={height} source={source}
   selectedTier={milestone} onSelectTier={setMilestone} onBuild={build} onBuilding={(id,trigger)=>openPlan(planForBuilding(w,id),trigger)} onBrowse={()=>chooseTab('buildings')}/>:
   tab==='buildings'?buildingRoster():<HeadquartersCrafting world={w} width={width} source={source} openPlan={openPlan}/>}
  {!!message&&<Pressable accessibilityRole="button" accessibilityLabel="Dismiss headquarters notification" onPress={()=>setMessage('')} style={s.feedback}><Text accessibilityLiveRegion="polite" style={s.feedbackText}>{message}　×</Text></Pressable>}
 </View>;
}

const s=StyleSheet.create({
 overviewFrame:{width:'100%',height:'100%',maxWidth:1220,maxHeight:770,alignSelf:'center',margin:'auto',padding:0},
 overviewScroll:{flexGrow:0,flexShrink:1,minHeight:0},
 disclosure:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:colors.line},
 furnaceRepair:{flexGrow:1,padding:8,gap:12},
 repairLedger:{borderWidth:1,borderColor:colors.line,borderRadius:5,overflow:'hidden',backgroundColor:colors.inset},
 repairRow:{flexDirection:'row',minHeight:42,alignItems:'center',gap:8,paddingHorizontal:10},
 repairCount:{fontSize:16,fontWeight:'700',color:colors.text},
 frame:{flex:1,minWidth:0,minHeight:0,padding:4,borderWidth:1,borderColor:'#857657',borderRadius:5,backgroundColor:colors.panel,overflow:'hidden',...webSurface(stationSurface)},
 header:{flexDirection:'row',alignItems:'center',gap:20,paddingHorizontal:14,paddingVertical:6,borderBottomWidth:1,borderBottomColor:'#726449',backgroundColor:'#1a201d'},
 emblem:{width:37,height:37,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#776b50',backgroundColor:'#32372c',borderRadius:3},
 brand:{flexDirection:'row',alignItems:'center',gap:8,marginRight:'auto'},
 brandTitle:{fontFamily:font,fontWeight:'800',color:colors.text},
 tabs:{flex:1,maxWidth:500,minWidth:0,flexDirection:'row',alignItems:'stretch',gap:4},
 tabRow:{paddingHorizontal:6,borderBottomWidth:1,borderBottomColor:colors.line},
 tab:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderBottomWidth:2,borderBottomColor:'transparent'},
 tabSelected:{borderBottomColor:colors.brass,backgroundColor:'#e4c17b0e'},
 tabText:{fontFamily:font,fontWeight:'700',fontSize:22,color:colors.muted},
 levelBadgeText:{fontFamily:font,fontWeight:'700',fontSize:17,color:colors.muted},
 close:{width:44,height:44,borderWidth:1,borderColor:colors.line,borderRadius:6,alignItems:'center',justifyContent:'center',backgroundColor:colors.inset},
 closeText:{fontSize:28,lineHeight:32,fontWeight:'400',color:colors.text},
 body:{flex:1,minHeight:0,padding:10},
 page:{flex:1,minHeight:0,gap:8},
 art:{position:'relative',overflow:'hidden',minWidth:0},
 lockedArt:{opacity:.8,...(Platform.OS==='web'?{filter:'saturate(0.6)'}:{})},
 scroll:{flex:1,minHeight:0},
 paper:{overflow:'hidden',borderWidth:1,borderColor:colors.line,borderRadius:6,padding:18,gap:8,backgroundColor:'#36372e'},
 sectionTitle:{fontFamily:font,fontWeight:'800',fontSize:25,lineHeight:29,color:colors.text,letterSpacing:.5},
 copy:{fontSize:15,lineHeight:21,color:colors.text},
 muted:{fontSize:12,lineHeight:16,color:colors.muted},
 textLink:{fontFamily:font,fontWeight:'700',fontSize:15,color:'#e4c478'},
 button:{minHeight:44,minWidth:44,paddingVertical:6,paddingHorizontal:13,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.line,borderRadius:5,backgroundColor:colors.surface},
 buttonText:{fontFamily:font,fontWeight:'800',fontSize:20,color:colors.text,textAlign:'center'},
 primary:{backgroundColor:colors.brass,borderColor:colors.brass,...webSurface(goldSurface)},
 primaryText:{fontSize:24,color:colors.ink},
 disabled:{opacity:.62},
 pressed:{opacity:.75},
 backRow:{minHeight:44,flexShrink:0,alignItems:'flex-start'},
 backButton:{borderWidth:0,backgroundColor:'transparent',paddingHorizontal:7},
 planCopy:{flex:1,minWidth:0,gap:12,paddingBottom:5},
 detailTitle:{fontFamily:font,fontWeight:'800',fontSize:51,lineHeight:55,color:colors.text},
 planGroup:{gap:7},
 levelHeading:{flexDirection:'row',gap:12,alignItems:'center'},
 levelName:{fontFamily:font,fontSize:20,fontWeight:'700',color:colors.text},
 levelRule:{flex:1,height:1,backgroundColor:colors.line},
 levelState:{fontSize:13,color:colors.brass},
 roster:{padding:12,gap:20},
 detailBody:{paddingBottom:12,gap:14},
 detailAcross:{flexDirection:'row',alignItems:'flex-start'},
 wideArt:{flex:1,minWidth:0,height:260},
 portraitArt:{height:120},
 planGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'flex-start',columnGap:'1%',rowGap:6},
 catalogueCard:{minWidth:0,minHeight:76,paddingVertical:6,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:colors.line,borderRadius:6,backgroundColor:colors.surface,...webSurface(tileSurface)},
 catalogueLocked:{backgroundColor:colors.inset,...webSurface('linear-gradient(120deg,#272c28,#202522)')},
 catalogueArt:{width:58,height:58},
 catalogueIdentity:{flex:1,minWidth:0,gap:3},
 catalogueTitle:{fontFamily:font,fontWeight:'800',fontSize:22,lineHeight:25,color:colors.text},
 catalogueState:{fontSize:13,lineHeight:16,color:colors.muted},
 catalogueChevron:{fontSize:24,color:colors.brass},
 madeHere:{gap:8,paddingTop:12,borderTopWidth:1,borderTopColor:'#937b4659'},
 feedback:{paddingHorizontal:10,paddingVertical:5,borderTopWidth:1,borderTopColor:'#9b86524d',backgroundColor:'#293f2a'},
 feedbackText:{fontSize:12,lineHeight:16,color:'#f3d899'},
});
