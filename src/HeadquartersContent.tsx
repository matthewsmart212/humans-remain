import {buildingNeedsRepair} from './camp-restoration';
import {buildingRestored,CAMP_REPAIRS,BROKEN_CAMP_ART} from './camp-restoration';
import React,{useEffect,useState} from 'react';
import {View,Text,Image,ImageBackground,Pressable,ScrollView,StyleSheet,Platform,type ImageSourcePropType,type StyleProp,type ViewStyle} from 'react-native';
import type {World} from './survival-engine';
import {HQ_PAPER,HQ_BENCH_ART,buildingFor,buildingArt,buildingPlacement,markBuilding,headquartersPlans,orderedCataloguePlans,planCampLevel,equipmentInventory,discoveries,type HQArt,type HQTab,type HQPlan,type HQBuildingId} from './headquarters-model';
import {restoreCampBuilding,buildingRepairStatus,buildingRepairCost,campWorkStatus,repairCamp,costRows,REPAIR_CAMP_COST,expandCamp,campExpansionStatus} from './run-progression';
import {CAMP_EXPANSION_COST,CAMP_LEVEL_NAMES,campAccessLevel,type CampLevel} from './camp-levels';
import {journalObjectives,journalNextStep,objectiveComplete,trackObjective,type JournalId} from './headquarters-journal';
import {canPayMaterials} from './camp-materials';
import type {MaterialCost} from './forge-recipes';

type Props={world:World;width:number;height:number;source:(path:string)=>ImageSourcePropType;onClose:()=>void;onChange:()=>void};
type Filter='all'|'buildings'|'equipment';
const font=Platform.OS==='web'?'Barlow Condensed':'FieldKitBarlow';
const tabs:{id:HQTab;label:string;icon:string}[]=[{id:'camp',label:'CAMP',icon:'⌂'},{id:'plans',label:'PLANS',icon:'▱'},{id:'journal',label:'JOURNAL',icon:'▤'}];
// Match the existing backpack / station surfaces without adding image assets.
const webSurface=(backgroundImage:string):ViewStyle=>Platform.OS==='web'?{backgroundImage}:{};
const stationSurface='radial-gradient(ellipse at 0 0,#8c997024,transparent 65%),repeating-linear-gradient(0deg,#e8d6ab04 0 1px,transparent 1px 4px),linear-gradient(120deg,#2b4138,#152d2c)';
const tileSurface='radial-gradient(ellipse at center,#60705244,#0d2426aa)';
const selectedSurface='radial-gradient(ellipse at center,#aa985866,#314238)';
const goldSurface='linear-gradient(#f0cf87,#d5a54f)';
const materialArt:Record<string,string>={pallets:'/survival/ui-field-kit-v1/logs.png',stone:'/survival/world-rocks-v1/river-stone-trio.webp',scrap:'/survival/ui-backpack-v1/scrap.png',ironIngot:'/survival/ironworks-v1/iron-ingot.png'};
function Art({art,source,style,locked=false}:{art:HQArt;source:Props['source'];style?:StyleProp<ViewStyle>;locked?:boolean}){
 const [box,setBox]=useState({width:1,height:1}),c=art.clip,k=c?Math.min(box.width/c[2],box.height/c[3]):1;
 return <View pointerEvents="none" onLayout={e=>setBox(e.nativeEvent.layout)} style={[s.art,style,locked&&s.lockedArt]}>
  <Image source={source(art.image)} blurRadius={locked?1:0} resizeMode={c?'stretch':'contain'} style={c?{position:'absolute',width:k,height:k,left:(box.width-c[2]*k)/2-c[0]*k,top:(box.height-c[3]*k)/2-c[1]*k}:StyleSheet.absoluteFill}/>
  {art.overlay&&<Image source={source(art.overlay)} blurRadius={locked?1:0} resizeMode="contain" style={StyleSheet.absoluteFill}/>}
 </View>;
}
function Pins(){return <>{[{top:5,left:5},{top:5,right:5},{bottom:5,left:5},{bottom:5,right:5}].map((p,i)=><View key={i} pointerEvents="none" style={[s.pin,p]}/>)}</>}
function LockBadge(){return <View pointerEvents="none" style={s.lockBadge}><View style={s.lockShackle}/><View style={s.lockBody}/></View>}
function Button({label,onPress,disabled=false,primary=false,ink=false,small=false,accessibilityLabel,style}:{label:string;onPress:()=>void;disabled?:boolean;primary?:boolean;ink?:boolean;small?:boolean;accessibilityLabel?:string;style?:StyleProp<ViewStyle>}){
 return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.button,primary&&s.primary,disabled&&s.disabled,pressed&&!disabled&&s.pressed,style]}>
  <Text style={[s.buttonText,primary&&s.primaryText,ink&&{color:'#243b2b'},small&&{fontSize:19,lineHeight:22}]}>{label}</Text>
 </Pressable>;
}
function Tag({label,good=false}:{label:string;good?:boolean}){return <View style={[s.tag,good&&s.goodTag]}><Text style={[s.tagText,good&&{color:'#c6df9d'}]}>{label}</Text></View>}
function Materials({world,cost,source,compact,dense=false}:{world:World;cost:MaterialCost;source:Props['source'];compact:boolean;dense?:boolean}){
 return <View style={[s.materials,dense&&{flex:1,gap:5}]}>{costRows(world,cost).map(m=><View key={m.id} accessibilityLabel={m.name+': '+m.have+' available, '+m.needed+' required'} style={[s.material,compact&&{padding:5,minHeight:42},dense&&s.denseMaterial]}>
  <Art art={{image:materialArt[m.id]??materialArt.scrap}} source={source} style={{width:dense?20:compact?29:43,height:dense?24:compact?29:43}}/>
  <View style={{flex:1,minWidth:0}}><Text style={[s.materialName,compact&&{fontSize:11},dense&&{fontSize:9,lineHeight:11}]}>{m.name}</Text><Text style={[s.materialValue,compact&&{fontSize:22,lineHeight:23},dense&&{fontSize:17,lineHeight:19},m.have<m.needed&&{color:'#edaa78'}]}>{m.have}<Text style={[s.materialDenominator,dense&&{fontSize:14}]}> / {m.needed}</Text></Text></View>
  {!dense&&<Text style={[s.materialCheck,compact&&{fontSize:13,lineHeight:16},{color:m.have>=m.needed?'#b2d88b':'#efbd61'}]}>{m.have>=m.needed?'✓':'Need '+(m.needed-m.have)+' more'}</Text>}
 </View>)}</View>;
}
const missingMaterials=(w:World,cost:MaterialCost)=>costRows(w,cost).filter(m=>m.have<m.needed).map(m=>(m.needed-m.have)+' more '+m.name.toLowerCase()).join(' · ');
const priority=['workshop','well','equipment-woodenAxe','metalworking','equipment-scrapKnife','equipment-metalPickaxe'];
function cardStatus(w:World,p:HQPlan){
 if(campAccessLevel(w)<planCampLevel(p))return 'Requires level '+planCampLevel(p);
 if(p.gearId&&!buildingRestored(w,'workshop'))return 'Repair workshop first';
 if(!p.gearId&&!buildingRestored(w,p.building))return 'Repair needed';
 if(p.gearId)return planCampLevel(p)===2&&w.progression&&!w.progression.furnaceRestored?'Furnace needed':'Craft at Workshop';
 if(p.id==='metalworking')return !w.progression||w.progression.furnaceRestored?'✓  Built':canPayMaterials(w,p.cost!)?'Ready to build':'Not built';
 if(p.id==='reinforced-camp')return w.progression?.fortified?'✓  Reinforced':'Upgrade available';
 if(p.id==='furnace-bellows')return 'Furnace upgrade';
 if(!buildingPlacement(w,buildingFor(p.building)))return 'Not in camp';
 return '✓  Built';
}

/** Shared web / native menu: progression first, details revealed on demand. */
export default function HeadquartersContent({world:w,width,height,source,onClose,onChange}:Props){
 const level=campAccessLevel(w),compact=height<500,tiny=height<380,portrait=width<height*1.12,denseHeader=compact||width<700;
 const [tab,setTab]=useState<HQTab>('camp'),[selectedLevel,setSelectedLevel]=useState<CampLevel>(level||1);
 const [unlockPage,setUnlockPage]=useState(0);
 const [filter,setFilter]=useState<Filter>('all'),[levelFilter,setLevelFilter]=useState<CampLevel|'all'>('all'),[levelMenu,setLevelMenu]=useState(false);
 const [planId,setPlanId]=useState<string>(),[page,setPage]=useState(0),[message,setMessage]=useState('');
 const [journalId,setJournalId]=useState<JournalId|'discoveries'>(w.progression?.trackedObjective??'metalworking');
 const [,setRevision]=useState(0);
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),3200);return()=>clearTimeout(timer)},[message]);
 const plans=headquartersPlans(w),plan=plans.find(p=>p.id===planId);
 const objectives=journalObjectives(w),objective=objectives.find(o=>o.id===journalId)??objectives[1],entries=discoveries(w);
 const changed=(text='')=>{setMessage(text);setRevision(n=>n+1);onChange()};
 const chooseTab=(next:HQTab)=>{setTab(next);setPlanId(undefined);setLevelMenu(false);setMessage('')};
 const openPlan=(id:string)=>{setPlanId(id);setTab('plans');setLevelMenu(false);setMessage('')};
 const viewLevel=(next:CampLevel=2)=>{chooseTab('camp');setSelectedLevel(next);setUnlockPage(0)};
 const findBuilding=(id:HQBuildingId)=>{if(markBuilding(w,id)){onChange();onClose()}else setMessage('This building is not in camp.')};
 const paper=(children:React.ReactNode,style?:StyleProp<ViewStyle>)=><ImageBackground source={source(HQ_PAPER)} resizeMode="stretch" style={[s.paper,style]}><Pins/>{children}</ImageBackground>;
 const costBlock=(cost:MaterialCost,label:string)=><View style={{gap:compact?4:7}}><View style={s.costHeading}><Text style={[s.sectionTitle,compact&&s.compactSection,tiny&&{fontSize:16,lineHeight:18}]}>{label}</Text><Text style={[s.muted,compact&&{fontSize:10}]}>Backpack + camp stores</Text></View><Materials world={w} cost={cost} source={source} compact={compact}/></View>;


 if(level===0){
  const status=buildingRepairStatus(w,'headquarters'),ready=status==='Ready';
  return <View style={s.frame} testID="headquarters-first-repair">
   <View style={[s.header,{gap:8}]}><Text style={[s.brandTitle,{flex:1,fontSize:compact?23:30}]}>HEADQUARTERS</Text><View style={s.levelBadge}><Text style={s.levelBadgeText}>LV 0</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Leave headquarters" onPress={onClose} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
   <ScrollView style={s.scroll} contentContainerStyle={{flexGrow:1,padding:compact?10:18,gap:12}}>
    <View style={[s.columns,portrait&&s.stacked,{minHeight:compact?200:330}]}>
     {paper(<><Text style={s.paperEyebrow}>DAY ONE · ABANDONED CAMP</Text><Art art={{image:BROKEN_CAMP_ART.headquarters}} source={source} style={{flex:1,width:'100%',minHeight:portrait?150:100}}/><Text style={s.paperSmall}>Restore the heart of your camp.</Text></>,[s.planHero,portrait&&{flexGrow:0,flexShrink:0,flexBasis:'auto',height:220}])}
     <View style={[s.planRight,{gap:compact?6:16,justifyContent:'center'},portrait&&{flexGrow:0,flexShrink:0,flexBasis:'auto'}]}>
      {!compact&&<Tag label="REPAIR REQUIRED"/>}
      <Text style={[s.detailTitle,{fontSize:compact?28:portrait?32:42,lineHeight:compact?31:portrait?35:46}]}>FIX HEADQUARTERS FIRST</Text>
      <Text style={[s.copy,compact&&{fontSize:12,lineHeight:16}]}>{compact?'Repair headquarters before restoring other buildings. It unlocks Camp Level 1 and your first plans.':'Your camp is in ruins. Repair headquarters before you can build or restore anything else.'}</Text>
      {!compact&&<Text style={s.copy}>Repairing it establishes Camp Level 1. Use your starting repair hammer at each ruined building to restore it.</Text>}
      {costBlock(CAMP_REPAIRS.headquarters.cost,'REPAIR COST')}
      {!compact&&<Text style={s.muted}>Chop trees with your starting axe and collect the fallen logs. Materials come from your backpack and camp stores.</Text>}
      <Button primary label="REPAIR HEADQUARTERS" disabled={!ready} onPress={()=>{if(restoreCampBuilding(w,'headquarters')){onChange();onClose()}else changed(buildingRepairStatus(w,'headquarters'))}}/>
      <Text accessibilityLiveRegion="polite" style={s.actionHint}>{ready?'4 logs · Unlock Camp Level 1':status==='Need repair materials'?'Chop trees · Collect '+missingMaterials(w,CAMP_REPAIRS.headquarters.cost):status}</Text>
     </View>
    </View>
   </ScrollView>
  </View>;
 }

 const expansionStatus=campExpansionStatus(w),upgradeReady=expansionStatus==='Ready';
 const unlocked=plans.filter(p=>!p.preview&&p.id!=='furnace-bellows'&&planCampLevel(p)===selectedLevel).sort((a,b)=>{
  const ai=priority.indexOf(a.id),bi=priority.indexOf(b.id);return (ai<0?100:ai)-(bi<0?100:bi);
 });
 const unlockColumns=portrait?2:3,unlockCapacity=portrait||tiny?6:9,unlockRows=unlockCapacity/unlockColumns;
 const unlockPages=Math.max(1,Math.ceil(unlocked.length/unlockCapacity)),currentUnlockPage=Math.min(unlockPage,unlockPages-1);
 const visibleUnlocks=unlocked.slice(currentUnlockPage*unlockCapacity,(currentUnlockPage+1)*unlockCapacity);
 const damaged=!!w.progression&&(w.progression.hqHp<w.progression.hqMax||w.progression.defence<w.progression.defenceMax);
 const conditionSummary=w.progression?[
  w.progression.hqHp<w.progression.hqMax?'HQ '+Math.ceil(w.progression.hqHp)+'/'+w.progression.hqMax:'',
  w.progression.defence<w.progression.defenceMax?'Defences '+Math.ceil(w.progression.defence)+'/'+w.progression.defenceMax:'',
 ].filter(Boolean).join(' · '):'';
 const hqRepairStatus=buildingRepairStatus(w,'headquarters'),hqRepairReady=hqRepairStatus==='Ready';
 const hqRepairCost=costRows(w,buildingRepairCost(w,'headquarters'));
 const hqRepairHint=hqRepairStatus==='Need repair materials'?'Need '+missingMaterials(w,buildingRepairCost(w,'headquarters')):hqRepairStatus;
 const condition=damaged&&<Pressable testID="camp-condition" accessibilityRole="button" accessibilityState={{disabled:!hqRepairReady}} disabled={!hqRepairReady} accessibilityLabel={'Repair headquarters and defences instantly. '+conditionSummary+'. Cost: '+hqRepairCost.map(m=>m.needed+' '+m.name.toLowerCase()+', '+m.have+' available').join('; ')+(hqRepairReady?'':'. '+hqRepairHint)} onPress={()=>{if(restoreCampBuilding(w,'headquarters'))changed('Headquarters and defences repaired.');else changed(buildingRepairStatus(w,'headquarters'))}} style={[s.condition,compact&&{paddingVertical:3,gap:6}]}>
  <View style={{flex:1,minWidth:0,gap:2}}><Text style={[s.conditionText,compact&&{fontSize:10,lineHeight:12}]}>{conditionSummary}</Text><View style={s.conditionMaterials}>{hqRepairCost.map(m=><View key={m.id} style={s.conditionMaterial}><Image source={source(materialArt[m.id]??materialArt.scrap)} resizeMode="contain" style={{width:17,height:17}}/><Text style={[s.conditionCost,m.have<m.needed&&{color:'#953f26'}]}>{m.needed}</Text></View>)}</View>{!hqRepairReady&&<Text style={s.conditionHint}>{hqRepairHint}</Text>}</View>
  <Text style={[s.paperLink,{fontSize:compact?12:14},!hqRepairReady&&{opacity:.5}]}>REPAIR</Text>
 </Pressable>;
 const showLevelPlans=()=>{chooseTab('plans');setFilter('all');setLevelFilter(selectedLevel);setPage(0)};
 const camp=<View style={[s.page,portrait&&s.portraitPage]}>
  <View style={[s.roadmap,compact&&{minHeight:46,paddingVertical:0}]}>{[1,2,3,4].map(n=><View key={n} style={s.roadmapStop}>
   <View pointerEvents="none" style={s.roadmapLine}/>
   <Pressable accessibilityRole="button" accessibilityLabel={n>2?'Camp level '+n+', coming soon':'View Camp level '+n+(n===level?', current level':'')} accessibilityState={{disabled:n>2,selected:n===selectedLevel}} disabled={n>2} onPress={()=>{setSelectedLevel(n as CampLevel);setUnlockPage(0)}} style={[s.levelStep,n===selectedLevel&&s.levelSelected,n>2&&{opacity:.44},compact&&{paddingVertical:1},portrait&&{minWidth:55,paddingHorizontal:8}]}>
    <Text style={[s.levelNumber,compact&&{fontSize:22,lineHeight:23}]}>{n}</Text><Text style={[s.levelCaption,n===selectedLevel&&{color:'#f5d37c'}]}>{n>2?'SOON':n===level?'CURRENT':n>level?'NEXT':'UNLOCKED'}</Text>
   </Pressable>
  </View>)}</View>
  <View style={[s.columns,{gap:compact?9:16},portrait&&s.stacked]}>
   {paper(<>
    <View testID="camp-hero" style={[s.campHeroContent,compact&&{gap:2}]}>
     <View style={[s.campHeroOverview,tiny&&{flexDirection:'row',alignItems:'center',gap:6}]}>
     <View style={[s.campHeroTitles,compact&&{gap:2},tiny&&{flex:1,minWidth:0}]}>
     {!compact&&<Text style={s.paperEyebrow}>CAMP LEVEL {selectedLevel}</Text>}
     <Text numberOfLines={2} adjustsFontSizeToFit style={[s.heroTitle,compact&&{fontSize:27,lineHeight:30},tiny&&{fontSize:21,lineHeight:23}]}>{CAMP_LEVEL_NAMES[selectedLevel].toUpperCase()}</Text>
     {height>=420&&<Text style={[s.paperCopy,compact&&{fontSize:11,lineHeight:15}]}>{selectedLevel===2?'Unlock metalworking.':'Your first foothold in the wilderness.'}</Text>}
     {tiny&&condition}
     </View>
     <Art art={buildingArt(w,buildingFor('headquarters'))} source={source} style={tiny?{flex:1,minHeight:0,height:'100%'}:{flex:1,minHeight:55,width:'100%'}}/>
     </View>
     {!tiny&&condition}
    </View>
    <View testID="camp-upgrade-controls" style={[s.campUpgradeControls,compact&&{gap:4,paddingTop:5}]}>
     {selectedLevel>level?<View accessibilityLabel="Upgrade cost. Uses backpack and camp stores." style={s.campUpgradeSummary}>
      <View style={s.levelTransition}><Text style={s.transitionLabel}>CAMP LEVEL</Text><Text style={s.transitionValue}>{level} → {selectedLevel}</Text></View>
      <Materials world={w} cost={CAMP_EXPANSION_COST} source={source} compact dense/>
     </View>:<Text style={s.unlockedLevelText}>✓ Level {selectedLevel} unlocked</Text>}
     <Button primary small label={selectedLevel>level?'UPGRADE TO LEVEL '+selectedLevel:'VIEW PLANS'} disabled={selectedLevel>level&&!upgradeReady} style={selectedLevel>level&&!upgradeReady?s.paperDisabledButton:undefined} onPress={selectedLevel>level?()=>{if(expandCamp(w))changed('Camp level 2 unlocked. Your new plans are ready.');else changed(campExpansionStatus(w))}:showLevelPlans}/>
     <Text numberOfLines={2} accessibilityLiveRegion="polite" style={s.upgradeHint}>{selectedLevel>level?'Backpack + camp stores'+(upgradeReady?'':expansionStatus==='Need expansion materials'?' · Need '+missingMaterials(w,CAMP_EXPANSION_COST):' · '+expansionStatus):'Browse this level’s buildings and equipment.'}</Text>
    </View>
   </>,[s.campHero,compact&&{padding:9,gap:3},portrait&&{flexGrow:0,flexShrink:0,flexBasis:'auto',height:350}])}
   <View testID="camp-unlocks" style={[s.campRight,portrait&&{flexGrow:0,flexShrink:0,flexBasis:'auto',height:510}]}>
    <View style={s.costHeading}><Text style={[s.sectionTitle,compact&&s.compactSection]}>{selectedLevel<=level?'AVAILABLE':'UNLOCKS'} AT LEVEL {selectedLevel}</Text><Pressable accessibilityRole="button" accessibilityLabel={'View all '+unlocked.length+' plans at Camp level '+selectedLevel} onPress={showLevelPlans} style={s.morePlans}><Text style={[s.textLink,compact&&{fontSize:13}]}>All {unlocked.length} plans ›</Text></Pressable></View>
    <View testID="camp-unlocks-grid" style={[s.unlockGrid,{gap:compact?6:10}]}>{Array.from({length:unlockRows},(_,row)=><View key={row} style={[s.unlockRow,{gap:compact?6:10}]}>{Array.from({length:unlockColumns},(_,col)=>{
     const p=visibleUnlocks[row*unlockColumns+col];if(!p)return <View key={col} style={{flex:1}}/>;
     const locked=level<planCampLevel(p);
     return <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={'View '+p.title+' plan'+(locked?'. Requires Camp level '+planCampLevel(p):'')} onPress={()=>openPlan(p.id)} style={[s.unlockCard,compact&&{padding:5,gap:2},locked&&s.lockedCard]}>
      <Art art={p.art} source={source} locked={locked} style={{flex:1,minHeight:compact?20:40,maxHeight:portrait?100:110,width:'88%'}}/>
      <View style={s.unlockLabel}><Text numberOfLines={1} adjustsFontSizeToFit style={[s.unlockName,{flex:1},compact&&{fontSize:17,lineHeight:20},portrait&&{fontSize:20}]}>{p.title}</Text><Text style={s.unlockChevron}>›</Text></View>
      {locked&&<LockBadge/>}
     </Pressable>;
    })}</View>)}</View>
    {unlockPages>1&&<View style={s.unlockPagination}><View style={s.pageControls}><Button small label="‹" accessibilityLabel="Previous unlocks page" disabled={currentUnlockPage===0} onPress={()=>setUnlockPage(currentUnlockPage-1)} style={s.pageButton}/><Text style={s.pageNumber}>{currentUnlockPage+1} / {unlockPages}</Text><Button small label="›" accessibilityLabel="Next unlocks page" disabled={currentUnlockPage===unlockPages-1} onPress={()=>setUnlockPage(currentUnlockPage+1)} style={s.pageButton}/></View></View>}
   </View>
  </View>
 </View>;

 const filtered=orderedCataloguePlans(w).filter(p=>(filter==='all'||(filter==='equipment'?!!p.gearId:!p.gearId))&&(levelFilter==='all'||planCampLevel(p)===levelFilter));
 const pages=Math.max(1,Math.ceil(filtered.length/6)),safePage=Math.min(page,pages-1),visible=filtered.slice(safePage*6,safePage*6+6);
 const cardGap=compact?7:12,cardWidth=portrait?'48%':'32.5%';
 const library=<View style={[s.page,portrait&&s.portraitPage]}>
  <View style={[s.toolbar,(compact||portrait)&&{paddingVertical:4,gap:5},portrait&&{flexWrap:'wrap'}]}>
   <View style={[s.filters,(compact||portrait)&&{gap:5}]}>{([{id:'all',label:'All'},{id:'buildings',label:'Buildings'},{id:'equipment',label:'Equipment'}] as const).map(f=><Pressable key={f.id} accessibilityRole="button" accessibilityState={{selected:filter===f.id}} onPress={()=>{setFilter(f.id);setPage(0);setLevelMenu(false)}} style={[s.filter,(compact||portrait)&&{minWidth:65,paddingHorizontal:12},filter===f.id&&s.filterSelected]}><Text style={[s.filterText,(compact||portrait)&&{fontSize:17},filter===f.id&&{color:'#292b1a'}]}>{f.label}</Text></Pressable>)}</View>
   <View style={s.levelPicker}>
    <Pressable accessibilityRole="button" accessibilityLabel="Filter plans by camp level" accessibilityState={{expanded:levelMenu}} onPress={()=>setLevelMenu(!levelMenu)} style={[s.filter,{minWidth:compact||portrait?110:150}]}><Text style={[s.filterText,(compact||portrait)&&{fontSize:16}]}>{levelFilter==='all'?'All levels':'Level '+levelFilter}　{levelMenu?'⌃':'⌄'}</Text></Pressable>
    {levelMenu&&<View style={s.levelOptions}>{(['all',1,2] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityLabel={value==='all'?'Show all levels':'Show Camp level '+value} accessibilityState={{selected:levelFilter===value}} onPress={()=>{setLevelFilter(value);setPage(0);setLevelMenu(false)}} style={[s.levelOption,levelFilter===value&&s.levelSelected]}><Text style={s.levelOptionText}>{value==='all'?'All levels':'Camp level '+value}</Text>{levelFilter===value&&<Text style={s.levelOptionText}>✓</Text>}</Pressable>)}</View>}
   </View>
  </View>
  <View style={[s.cardGrid,{gap:cardGap},portrait&&{flexGrow:0,flexShrink:0,flexBasis:'auto'}]}>{visible.map(p=><Pressable key={p.id} accessibilityRole="button" accessibilityLabel={'Open '+p.title+'. '+cardStatus(w,p)} onPress={()=>openPlan(p.id)} style={[s.planCard,{width:cardWidth},portrait?{height:164,flexDirection:'column',padding:8,gap:3}:{height:'48%'},compact&&{padding:7,gap:7},level<planCampLevel(p)&&s.lockedCard]}>
   {level<planCampLevel(p)&&<LockBadge/>}<Art art={p.art} source={source} locked={level<planCampLevel(p)} style={{width:portrait?'100%':compact?'40%':'43%',height:portrait?72:'100%'}}/>
   <View style={[{flex:1,minWidth:0,gap:compact?5:10},portrait&&{width:'100%',gap:4,alignItems:'center'}]}><Text numberOfLines={2} style={[s.cardTitle,compact&&{fontSize:21,lineHeight:23},portrait&&{fontSize:23,lineHeight:25,textAlign:'center'}]}>{p.title}</Text><Text numberOfLines={2} style={[s.cardState,(compact||portrait)&&{fontSize:12,lineHeight:15},level<planCampLevel(p)&&{color:'#c4b893'}]}>{cardStatus(w,p)}</Text></View>
   {!portrait&&<Text style={s.chevron}>›</Text>}
  </Pressable>)}</View>
  <View style={s.pagination}><Text style={[s.muted,compact&&{fontSize:11}]}>{filtered.length?filtered.length+' plans'+(levelFilter==='all'?' · Available first':''):'No plans at this level'}</Text><View style={s.pageControls}><Button label="‹" accessibilityLabel="Previous plans page" disabled={safePage===0} onPress={()=>setPage(safePage-1)} style={s.pageButton}/><Text style={s.pageNumber}>{safePage+1} / {pages}</Text><Button label="›" accessibilityLabel="Next plans page" disabled={safePage===pages-1} onPress={()=>setPage(safePage+1)} style={s.pageButton}/></View></View>
 </View>;

 const renderPlan=()=>{
  if(!plan)return library;
  const locked=level<planCampLevel(plan),built=plan.id==='metalworking'&&(!w.progression||w.progression.furnaceRestored);
  const reinforced=plan.id==='reinforced-camp'&&w.progression?.fortified,repairs=plan.id==='shelter'&&damaged;
  const isBuilt=!locked&&!repairs&&!plan.gearId&&(built||cardStatus(w,plan)==='✓  Built');
  const madeHere=plan.id==='workshop'&&buildingRestored(w,'workshop')?['equipment-woodenAxe','equipment-woodenPickaxe','equipment-woodenKnife'].flatMap(id=>plans.filter(p=>p.id===id)):[];
  const workStatus=plan.id==='shelter'?buildingRepairStatus(w,'headquarters'):campWorkStatus(w,plan.id==='reinforced-camp');
  let label='',action=()=>{},disabled=false,hint='',cost:MaterialCost|undefined=plan.cost;
  if(locked){label='VIEW LEVEL '+planCampLevel(plan);action=()=>viewLevel(planCampLevel(plan));hint='Unlocks when your camp reaches level '+planCampLevel(plan)+'.';cost=undefined}
  else if(!plan.gearId&&plan.building!=='headquarters'&&buildingNeedsRepair(w,plan.building)){cost=buildingRepairCost(w,plan.building);label='FIND '+buildingFor(plan.building).short.toUpperCase();disabled=!buildingPlacement(w,buildingFor(plan.building));action=()=>findBuilding(plan.building);hint='Equip your repair hammer and restore this existing building on site.'}
  else if(plan.gearId&&!buildingRestored(w,'workshop')){label='VIEW WORKSHOP REPAIR';action=()=>openPlan('workshop');hint='Repair the workshop before crafting equipment.';cost=undefined}
  else if(plan.id==='reinforced-camp'){label=reinforced?'CAMP REINFORCED':'REINFORCE CAMP';disabled=workStatus!=='Ready';action=()=>{if(repairCamp(w,true))changed('Camp defences reinforced.')};hint=reinforced?'Camp defence capacity increased to 220.':workStatus==='Ready'?plan.benefit:workStatus;if(reinforced)cost=undefined}
  else if(repairs){label='REPAIR HEADQUARTERS';disabled=workStatus!=='Ready';cost=REPAIR_CAMP_COST;action=()=>{if(restoreCampBuilding(w,'headquarters')){onChange();onClose()}};hint=workStatus==='Ready'?'Repair headquarters and defences immediately.':workStatus}
  else if(plan.id==='shelter'){label='VIEW CAMP LEVELS';action=()=>viewLevel();cost=undefined}
  else if((plan.gearId&&planCampLevel(plan)===2||plan.id==='furnace-bellows')&&w.progression&&!w.progression.furnaceRestored){label='VIEW FURNACE PLAN';action=()=>openPlan('metalworking');hint='Repair the furnace with your hammer to enable this recipe.'}
  else if(plan.building==='garden'||plan.building==='treatment'){label='STRUCTURE REPAIRED';disabled=true;cost=undefined;hint=plan.building==='garden'?'Garden restored. Planting and harvesting are coming later.':'Shelter restored. Medical treatment is coming later.'}
  else {label='MARK '+buildingFor(plan.building).short.toUpperCase()+' ON MAP';action=()=>findBuilding(plan.building);disabled=!buildingPlacement(w,buildingFor(plan.building));hint=plan.gearId?'Craft at the workshop. Materials are spent there.':plan.id==='furnace-bellows'?'Fit improved bellows at the furnace.':plan.id==='workshop'?'Craft tools at the workshop.':'Sets a waypoint to this building.';if(built)cost=undefined}
  return <View style={[s.page,portrait&&s.portraitPage]}>
   <View style={s.backRow}><Button label="‹  ALL PLANS" onPress={()=>{setPlanId(undefined);setMessage('')}} style={s.backButton}/></View>
   <View style={[s.columns,{gap:compact?9:18},portrait&&s.stacked]}>
    {paper(<><Text style={s.paperEyebrow}>{plan.gearId?'EQUIPMENT':plan.category==='defences'?'CAMP DEFENCES':'BUILDING'}</Text><Art art={plan.art} source={source} locked={locked||plan.preview} style={{flex:1,minHeight:80,width:'100%'}}/>{locked&&<LockBadge/>}<Text style={s.paperSmall}>{locked?'Requires Camp level '+planCampLevel(plan):'✓  Camp level '+planCampLevel(plan)+' unlocked'}</Text></>,[s.planHero,compact&&{padding:9},portrait&&{flexGrow:0,flexShrink:0,flexBasis:'auto',height:190}])}
    <View style={[s.planRight,portrait&&{flexGrow:0,flexShrink:0,flexBasis:'auto',minHeight:340}]}>
     <ScrollView style={s.scroll} contentContainerStyle={[s.planCopy,compact&&{gap:5}]}>
      <View style={s.detailHeading}><Text style={[s.detailTitle,compact&&{fontSize:31,lineHeight:33}]}>{plan.title.toUpperCase()}</Text>{isBuilt&&<Tag label="✓  BUILT" good/>}</View>
      {!(tiny&&madeHere.length>0)&&<Text style={[s.copy,compact&&{fontSize:12,lineHeight:16}]}>{plan.description}</Text>}
      {!isBuilt&&<Tag label={repairs?'REPAIRS NEEDED':locked?'CAMP LEVEL '+planCampLevel(plan):cardStatus(w,plan).toUpperCase()} good={!locked&&!repairs}/>}
      {plan.gearId&&<Text style={s.muted}>Backpack {equipmentInventory(w,plan.gearId).pack} · Storage {equipmentInventory(w,plan.gearId).stored}</Text>}
      {!!madeHere.length&&<View testID="workshop-recipes" style={[s.madeHere,compact&&{paddingTop:7,gap:5}]}><Text style={[s.sectionTitle,compact&&s.compactSection]}>MADE HERE</Text><View style={s.recipeRow}>{madeHere.map(p=><Pressable key={p.id} accessibilityRole="button" accessibilityLabel={'View '+p.title+' recipe'} onPress={()=>openPlan(p.id)} style={[s.recipeCard,compact&&{padding:5}]}><Art art={p.art} source={source} style={{height:tiny?42:compact?54:100,width:'100%'}}/><View style={s.unlockLabel}><Text numberOfLines={2} style={[s.recipeName,compact&&{fontSize:15,lineHeight:17}]}>{p.title}</Text><Text style={s.unlockChevron}>›</Text></View></Pressable>)}</View>{!compact&&<Text style={s.muted}>Tap an item to view its recipe.</Text>}</View>}
      {cost&&<View style={[s.detailCost,compact&&{marginTop:3,paddingTop:7}]}>{costBlock(cost,plan.gearId?'CRAFT COST':repairs||!buildingRestored(w,plan.building)?'REPAIR COST':plan.id==='metalworking'?'BUILD COST':'UPGRADE COST')}</View>}
      {built&&<Pressable accessibilityRole="button" accessibilityLabel="View improved bellows upgrade" onPress={()=>openPlan('furnace-bellows')} style={s.upgradeLink}><Text style={s.textLink}>Improved bellows upgrade ›</Text></Pressable>}
     </ScrollView>
     <View style={[s.primaryAction,compact&&{gap:4,paddingTop:5}]}><Button primary label={label} disabled={disabled} onPress={action}/><Text style={s.actionHint}>{hint}</Text></View>
    </View>
   </View>
  </View>;
 };

 const tracked=w.progression?.trackedObjective,nextStep=journalNextStep(w,objective),completed=objectiveComplete(objective);
 const needsCampUpgrade=objective.id==='metalworking'&&level<2;
 const nextIsSmelting=nextStep?.planId==='metalworking'&&!!w.progression?.furnaceRestored;
 const journal=<View style={[s.page,portrait&&s.portraitPage]}>
  <View style={[s.journalHeading,compact&&{paddingVertical:4}]}><Text style={[s.sectionTitle,compact&&s.compactSection]}>CAMP JOURNAL</Text><Text style={s.muted}>{tracked?'1 objective tracked':'Optional objectives'}</Text></View>
  <View style={[s.columns,portrait&&s.stacked]}>
   <View style={[s.journalList,portrait&&{flexGrow:0,flexShrink:0,flexBasis:'auto'}]}>{objectives.map(o=><Pressable key={o.id} accessibilityRole="button" accessibilityLabel={'Read '+o.title} accessibilityState={{selected:journalId===o.id}} onPress={()=>setJournalId(o.id)} style={[s.journalEntry,journalId===o.id&&s.levelSelected,compact&&{padding:7,minHeight:51}]}>
    <Text style={[s.journalSymbol,{color:objectiveComplete(o)?'#b4cf87':tracked===o.id?'#f2bf58':'#b5c0a5'}]}>{objectiveComplete(o)?'✓':tracked===o.id?'◆':'○'}</Text><View style={{flex:1,gap:2}}><Text style={[s.journalEntryTitle,compact&&{fontSize:19,lineHeight:21}]}>{o.title}</Text><Text style={[s.muted,{color:tracked===o.id?'#e2bb6c':'#b9c7a3'},compact&&{fontSize:10}]}>{objectiveComplete(o)?'Complete':tracked===o.id?'Tracked':o.steps.some(step=>step.done)?'In progress':'Not started'}</Text></View>
   </Pressable>)}
    <Pressable accessibilityRole="button" accessibilityLabel="Read camp discoveries" accessibilityState={{selected:journalId==='discoveries'}} onPress={()=>setJournalId('discoveries')} style={[s.discoveryNav,journalId==='discoveries'&&s.levelSelected]}><Text style={[s.journalEntryTitle,compact&&{fontSize:18}]}>▤  Discoveries</Text><Text style={s.muted}>{entries.length}</Text></Pressable>
    {!compact&&!portrait&&<Art art={{image:HQ_BENCH_ART}} source={source} style={{flex:1,minHeight:50,maxHeight:150}}/>}
   </View>
   {paper(journalId==='discoveries'?<ScrollView style={s.scroll} contentContainerStyle={{gap:14}}>
    <Text style={[s.heroTitle,{textAlign:'left'},compact&&{fontSize:28}]}>DISCOVERIES</Text>{entries.length?entries.map(e=><View key={e.id} style={s.discoveryEntry}><Art art={{image:e.image}} source={source} style={{width:compact?48:70,height:compact?48:70}}/><View style={{flex:1,gap:4}}><Text style={s.discoveryTitle}>{e.title}</Text><Text style={s.paperCopy}>{e.body}</Text></View></View>):<Text style={s.paperCopy}>Explore the world to record your discoveries.</Text>}
   </ScrollView>:<>
    <ScrollView style={s.scroll} contentContainerStyle={{gap:compact?5:12,flexGrow:1}}>
    <View style={s.journalHero}><View style={{flex:1,gap:compact?3:8}}><Text style={[s.journalTitle,compact&&{fontSize:27,lineHeight:29},tiny&&{fontSize:24,lineHeight:26}]}>{objective.title.toUpperCase()}</Text>{!tiny&&<Text style={[s.paperCopy,compact&&{fontSize:12,lineHeight:16}]}>{objective.description}</Text>}</View><Art art={{image:objective.image}} source={source} locked={objective.id==='metalworking'&&level<2} style={{width:tiny?36:compact?48:110,height:tiny?30:compact?48:105}}/></View>
    <Text accessibilityLiveRegion="polite" style={[s.paperSmall,compact&&{fontSize:10,lineHeight:12}]}>{objective.steps.filter(step=>step.done).length} of {objective.steps.length} completed</Text>
    {needsCampUpgrade&&<View testID="journal-prerequisite" style={[s.prerequisite,compact&&{minHeight:tiny?28:32,paddingVertical:3,paddingHorizontal:8}]}><LockBadge/><View style={{flex:1,gap:2}}><Text style={[s.prerequisiteTitle,compact&&{fontSize:16,lineHeight:18}]}>Requires Camp Level 2</Text>{!compact&&<Text style={s.paperSmall}>Upgrade your camp to begin.</Text>}</View></View>}
    <View style={s.journalSteps}>{objective.steps.map(step=><View key={step.label} accessibilityLabel={step.label+(step.done?', completed':', incomplete')} style={[s.journalStep,compact&&{minHeight:tiny?28:30,paddingVertical:3}]}><Text style={[s.stepCheck,compact&&{fontSize:20,lineHeight:22,width:24},step.done&&{color:'#5d783d'}]}>{step.done?'✓':'○'}</Text><Text style={[s.stepLabel,compact&&{fontSize:15,lineHeight:18}]}>{step.label}</Text></View>)}</View>
    </ScrollView>
    <View style={s.journalActions}>
     <Pressable accessibilityRole="button" accessibilityState={{selected:tracked===objective.id,disabled:!w.progression||completed&&tracked!==objective.id}} disabled={!w.progression||completed&&tracked!==objective.id} onPress={()=>{if(trackObjective(w,tracked===objective.id?undefined:objective.id))changed()}} style={[s.trackButton,tracked===objective.id&&{backgroundColor:'#17392c'}]}><Text style={[s.trackText,tracked===objective.id&&{color:'#f0c365'}]}>{tracked===objective.id?'◆  TRACKED':completed?'✓  COMPLETE':'◇  TRACK OBJECTIVE'}</Text></Pressable>
     {nextStep?.planId&&<Button small={compact} label={nextStep.planId==='shelter'?level<2&&objective.id!=='shelter'?'VIEW CAMP UPGRADE':'VIEW CAMP LEVELS':nextIsSmelting?'MARK FURNACE ON MAP':nextStep.planId==='metalworking'?'VIEW FURNACE PLAN':'VIEW PLAN'} onPress={()=>nextStep.planId==='shelter'?viewLevel():nextIsSmelting?findBuilding('furnace'):openPlan(nextStep.planId!)} style={s.journalPrimary}/>}
    </View>
   </>,[s.journalPaper,compact&&{padding:tiny?10:12,gap:5},portrait&&{flexGrow:0,flexShrink:0,flexBasis:'auto',minHeight:310}])}
  </View>
 </View>;

 return <View style={s.frame}>
  <View pointerEvents="none" style={s.innerFrame}/>
  <View style={[s.header,denseHeader&&{padding:5,gap:6}]}>
   <View style={[s.brand,{gap:denseHeader?5:8}]}><Art art={{image:HQ_BENCH_ART}} source={source} style={{width:denseHeader?29:42,height:denseHeader?31:44}}/>{width>=560&&<Text style={[s.brandTitle,{fontSize:denseHeader?23:33}]}>HEADQUARTERS</Text>}</View>
   <View accessibilityRole="tablist" style={[s.tabs,denseHeader&&{gap:5}]}>{tabs.map(t=><Pressable key={t.id} accessibilityRole="tab" accessibilityState={{selected:tab===t.id}} onPress={()=>chooseTab(t.id)} style={[s.tab,denseHeader&&{gap:5,paddingHorizontal:5},tab===t.id&&s.tabSelected]}>{width>740&&<Text style={[s.tabIcon,tab===t.id&&{color:'#253225'}]}>{t.icon}</Text>}<Text style={[s.tabText,denseHeader&&{fontSize:19},width<560&&{fontSize:16},tab===t.id&&{color:'#253225'}]}>{t.label}</Text></Pressable>)}</View>
   <View style={[s.levelBadge,denseHeader&&{minWidth:53,paddingHorizontal:5}]}><Text style={[s.levelBadgeText,denseHeader&&{fontSize:17}]}>LV {level}</Text></View>
   <Pressable accessibilityRole="button" accessibilityLabel="Leave headquarters" onPress={onClose} style={s.close}><Text style={s.closeText}>×</Text></Pressable>
  </View>
  {portrait?<ScrollView style={s.scroll} contentContainerStyle={{padding:6,gap:8}}>{tab==='camp'?camp:tab==='journal'?journal:plan?renderPlan():library}</ScrollView>:<View style={[s.body,compact&&{padding:6}]}>{tab==='camp'?camp:tab==='journal'?journal:plan?renderPlan():library}</View>}
  {!!message&&<Pressable accessibilityRole="button" accessibilityLabel="Dismiss headquarters notification" onPress={()=>setMessage('')} style={s.feedback}><Text accessibilityLiveRegion="polite" style={s.feedbackText}>{message}　×</Text></Pressable>}
 </View>;
}

const s=StyleSheet.create({
 frame:{flex:1,minWidth:0,minHeight:0,padding:4,borderWidth:2,borderColor:'#ae8b4b',borderRadius:13,backgroundColor:'#233d33',overflow:'hidden',...webSurface(stationSurface)},
 innerFrame:{position:'absolute',inset:3,borderWidth:1,borderColor:'#a5813b55',borderRadius:9},
 header:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:10,paddingVertical:7,borderBottomWidth:1,borderBottomColor:'#a18d5866',backgroundColor:'#102c2733'},
 brand:{flexDirection:'row',alignItems:'center'},brandTitle:{fontFamily:font,fontWeight:'800',color:'#f6e8c5',letterSpacing:.2},
 tabs:{flex:1,flexDirection:'row',gap:9,minWidth:0},tab:{flex:1,minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,paddingHorizontal:8,borderWidth:1,borderColor:'#7b714a',borderBottomWidth:3,borderBottomColor:'#061c17',borderRadius:5,backgroundColor:'#102b2677',...webSurface(tileSurface)},
 tabSelected:{backgroundColor:'#edbd5e',borderColor:'#f5d998',borderBottomColor:'#9d682f',...webSurface(goldSurface)},tabText:{fontFamily:font,fontWeight:'800',fontSize:25,letterSpacing:.4,color:'#d5c9a4'},tabIcon:{fontSize:27,color:'#c9b77e'},
 levelBadge:{minHeight:42,minWidth:78,paddingHorizontal:10,borderWidth:1,borderColor:'#b38e49',borderRadius:6,justifyContent:'center'},levelBadgeText:{fontFamily:font,fontWeight:'800',fontSize:22,color:'#eadbb9',textAlign:'center'},
 close:{width:44,height:44,borderWidth:2,borderColor:'#e2b75b',borderRadius:5,alignItems:'center',justifyContent:'center',backgroundColor:'#0a251d'},closeText:{fontSize:42,lineHeight:43,fontWeight:'700',color:'#f5d990'},
 body:{flex:1,minHeight:0,padding:10},page:{flex:1,minHeight:0,gap:8},portraitPage:{flexGrow:0,flexShrink:0,flexBasis:'auto'},columns:{flex:1,minHeight:0,flexDirection:'row',gap:12},stacked:{flexGrow:0,flexShrink:0,flexBasis:'auto',flexDirection:'column',gap:10},
 art:{position:'relative',overflow:'hidden',minWidth:0},lockedArt:{opacity:.8,...(Platform.OS==='web'?{filter:'saturate(0.6)'}:{})},scroll:{flex:1,minHeight:0},
 paper:{overflow:'hidden',borderWidth:1,borderColor:'#b38a4c',borderRadius:6,padding:18,gap:8,backgroundColor:'#ecd29a'},
 paperEyebrow:{fontSize:12,letterSpacing:2,color:'#654e2e',textAlign:'center'},paperCopy:{fontSize:15,lineHeight:21,color:'#49391f'},paperSmall:{fontSize:12,lineHeight:16,color:'#6b5632'},paperLink:{fontSize:13,color:'#694d22',textDecorationLine:'underline'},
 heroTitle:{fontFamily:font,fontWeight:'800',fontSize:43,lineHeight:46,color:'#372b18',textAlign:'center'},campHero:{flex:.9,alignItems:'center'},campRight:{flex:1.35,minWidth:0,minHeight:0,gap:7},
 roadmap:{flexDirection:'row',alignItems:'center',minHeight:50,paddingVertical:1,paddingHorizontal:15,borderBottomWidth:1,borderBottomColor:'#8c733d55'},roadmapStop:{flex:1,alignItems:'center',justifyContent:'center'},roadmapLine:{position:'absolute',height:1,left:0,right:0,top:'50%',backgroundColor:'#8e7746'},levelStep:{minHeight:44,minWidth:90,paddingVertical:2,paddingHorizontal:15,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#7e845b',borderRadius:18,backgroundColor:'#16352bd9',...webSurface(tileSurface)},levelSelected:{borderColor:'#d8c08b',backgroundColor:'#3b4630',...webSurface(selectedSurface)},levelNumber:{fontFamily:font,fontWeight:'800',fontSize:24,lineHeight:25,color:'#eddfb7'},levelCaption:{fontFamily:font,fontWeight:'700',fontSize:11,lineHeight:13,color:'#b9c296'},
 sectionTitle:{fontFamily:font,fontWeight:'800',fontSize:25,lineHeight:29,color:'#f1e3c1',letterSpacing:.5},compactSection:{fontSize:18,lineHeight:21},copy:{fontSize:15,lineHeight:21,color:'#e6e0ca'},muted:{fontSize:12,lineHeight:16,color:'#bfc4ac'},
 unlockCard:{flex:1,minWidth:0,minHeight:44,alignItems:'center',padding:8,gap:3,borderWidth:1,borderColor:'#8a90705c',borderRadius:6,backgroundColor:'#17382e',overflow:'hidden',...webSurface(tileSurface)},unlockName:{fontFamily:font,fontSize:23,fontWeight:'800',color:'#f2e3be',textAlign:'center',alignSelf:'stretch'},morePlans:{minHeight:24,alignSelf:'flex-end',justifyContent:'center'},textLink:{fontFamily:font,fontWeight:'700',fontSize:15,color:'#e4c478'},condition:{alignSelf:'stretch',minHeight:44,paddingVertical:5,paddingHorizontal:2,gap:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopWidth:1,borderTopColor:'#9f7e424c'},conditionText:{fontSize:12,color:'#754a2a'},conditionMaterials:{flexDirection:'row',alignItems:'center',gap:10},conditionMaterial:{flexDirection:'row',alignItems:'center',gap:3},conditionCost:{fontFamily:font,fontWeight:'800',fontSize:14,lineHeight:17,color:'#49391f'},conditionHint:{fontSize:10,lineHeight:12,color:'#953f26'},
 costHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:5},materials:{flexDirection:'row',gap:7},material:{flex:1,minWidth:0,minHeight:63,flexDirection:'row',alignItems:'center',padding:8,gap:7,borderWidth:1,borderColor:'#a38b53',borderRadius:5,backgroundColor:'#17352e',...webSurface(tileSurface)},materialName:{fontSize:13,color:'#d9d3b4'},materialValue:{fontFamily:font,fontWeight:'800',fontSize:30,lineHeight:32,color:'#f3e7c8'},materialDenominator:{fontFamily:font,fontSize:19,fontWeight:'700',color:'#ded3b4'},materialCheck:{fontFamily:font,fontWeight:'800',fontSize:18,lineHeight:21,flexShrink:1,textAlign:'right'},
 button:{minHeight:44,minWidth:44,paddingVertical:6,paddingHorizontal:13,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#b39a64',borderRadius:5,backgroundColor:'#16382f'},buttonText:{fontFamily:font,fontWeight:'800',fontSize:20,color:'#eddfbc',textAlign:'center'},primary:{backgroundColor:'#efbd58',borderColor:'#f8dc95',borderBottomWidth:3,borderBottomColor:'#97652e',...webSurface(goldSurface)},primaryText:{fontSize:24,color:'#252a1b'},disabled:{opacity:.44},pressed:{opacity:.75},primaryAction:{paddingTop:10,gap:6,flexShrink:0},actionHint:{fontSize:11,lineHeight:14,color:'#c5c4a7',textAlign:'center'},
 tag:{alignSelf:'flex-start',paddingVertical:4,paddingHorizontal:10,borderWidth:1,borderColor:'#8b885c',borderRadius:4,backgroundColor:'#2c4230'},goodTag:{backgroundColor:'#314b2d',borderColor:'#8eac63'},tagText:{fontFamily:font,fontWeight:'800',fontSize:15,letterSpacing:.3,color:'#e8d39c'},
 toolbar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:6,gap:8,zIndex:10},filters:{flexDirection:'row',gap:8},filter:{minHeight:44,minWidth:93,paddingHorizontal:18,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:'#a08954',borderRadius:5,backgroundColor:'#17382d',...webSurface(tileSurface)},filterText:{fontFamily:font,fontWeight:'800',fontSize:21,color:'#e4d6b2'},filterSelected:{backgroundColor:'#ebbd5e',borderColor:'#f5d591',...webSurface(goldSurface)},levelPicker:{position:'relative'},levelOptions:{position:'absolute',top:47,right:0,width:158,zIndex:30,borderWidth:1,borderColor:'#c7a45d',borderRadius:5,padding:4,gap:3,backgroundColor:'#0b251e'},levelOption:{minHeight:44,paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderColor:'transparent',borderRadius:3},
 cardGrid:{flex:1,minHeight:0,flexDirection:'row',flexWrap:'wrap',alignContent:'flex-start'},planCard:{minWidth:0,flexDirection:'row',alignItems:'center',gap:12,padding:14,borderWidth:1,borderColor:'#8a907088',borderRadius:6,backgroundColor:'#17382e',overflow:'hidden',...webSurface(tileSurface)},lockedCard:{borderColor:'#7d846366',backgroundColor:'#1d332c',...webSurface('radial-gradient(ellipse at center,#62715b20,#0e2526a6)')},cardTitle:{fontFamily:font,fontWeight:'800',fontSize:31,lineHeight:34,color:'#f2e4c3'},cardState:{fontSize:16,lineHeight:20,color:'#bfd394'},chevron:{fontFamily:font,fontSize:28,color:'#a99b6c'},pagination:{minHeight:44,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,borderTopWidth:1,borderTopColor:'#8b76493d',paddingTop:3},pageControls:{flexDirection:'row',alignItems:'center',gap:9},pageButton:{width:44,paddingHorizontal:0},pageNumber:{fontFamily:font,fontWeight:'700',fontSize:16,color:'#c6c4a7'},
 backRow:{minHeight:44,flexShrink:0,alignItems:'flex-start'},backButton:{borderWidth:0,backgroundColor:'transparent',paddingHorizontal:7},planHero:{flex:1,minHeight:0,alignItems:'center'},planRight:{flex:1.15,minWidth:0,minHeight:0},planCopy:{gap:12,paddingBottom:5},detailTitle:{fontFamily:font,fontWeight:'800',fontSize:51,lineHeight:55,color:'#f5e8c9'},detailCost:{borderTopWidth:1,borderTopColor:'#937b4659',paddingTop:15,marginTop:5},upgradeLink:{minHeight:44,justifyContent:'center',alignSelf:'flex-start'},
 journalHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:30,paddingVertical:5},journalList:{flex:0.85,minWidth:0,gap:6},journalEntry:{minHeight:70,padding:12,gap:10,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'transparent',borderRadius:5,backgroundColor:'#12322877',...webSurface(tileSurface)},journalSymbol:{width:29,fontSize:26,fontWeight:'700',textAlign:'center'},journalEntryTitle:{fontFamily:font,fontWeight:'800',fontSize:25,lineHeight:28,color:'#efdfbd'},discoveryNav:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:5,paddingHorizontal:12,borderWidth:1,borderColor:'#7d744e',borderRadius:5},journalPaper:{flex:2,minWidth:0,minHeight:0,gap:12},journalHero:{flexDirection:'row',alignItems:'center',gap:10},journalTitle:{fontFamily:font,fontWeight:'800',fontSize:40,lineHeight:42,color:'#392c17'},journalSteps:{flex:1,minHeight:0,justifyContent:'center'},journalStep:{minHeight:51,paddingVertical:9,gap:12,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#9f7e424c'},stepCheck:{fontSize:25,lineHeight:28,width:29,color:'#614d29'},stepLabel:{flex:1,fontSize:20,lineHeight:25,color:'#392e1d'},journalActions:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',gap:7},trackButton:{minHeight:44,paddingHorizontal:12,paddingVertical:6,justifyContent:'center',borderRadius:20,borderWidth:1,borderColor:'#7c753d'},trackText:{fontFamily:font,fontWeight:'800',fontSize:17,color:'#4c4b26'},journalPrimary:{backgroundColor:'#17382e',borderColor:'#9b854c',...webSurface(tileSurface)},discoveryEntry:{flexDirection:'row',gap:12,paddingBottom:10,borderBottomWidth:1,borderBottomColor:'#9f7e424c'},discoveryTitle:{fontFamily:font,fontSize:24,fontWeight:'800',color:'#3d301b'},
 levelOptionText:{fontFamily:font,fontWeight:'700',fontSize:18,color:'#e4d6b2'},
 unlockLabel:{alignSelf:'stretch',flexDirection:'row',alignItems:'center',gap:4},
 unlockChevron:{fontFamily:font,fontSize:20,lineHeight:22,color:'#a99b6c'},
 detailHeading:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:10},
 madeHere:{gap:8,paddingTop:12,borderTopWidth:1,borderTopColor:'#937b4659'},
 recipeRow:{flexDirection:'row',gap:7},
 recipeCard:{flex:1,minWidth:0,minHeight:44,padding:8,gap:5,borderWidth:1,borderColor:'#8a907088',borderRadius:6,backgroundColor:'#17382e',...webSurface(tileSurface)},
 recipeName:{flex:1,fontFamily:font,fontWeight:'700',fontSize:20,lineHeight:22,color:'#efdfbd'},
 prerequisite:{minHeight:40,paddingVertical:9,paddingLeft:12,paddingRight:34,borderWidth:1,borderColor:'#8d754c55',borderRadius:5,backgroundColor:'#8b6c2f16'},
 prerequisiteTitle:{fontFamily:font,fontWeight:'700',fontSize:21,lineHeight:24,color:'#5f4f29'},
 campHeroContent:{flex:1,minHeight:0,width:'100%',alignItems:'center',gap:5},
 campHeroOverview:{flex:1,minHeight:0,width:'100%',alignItems:'center',gap:3},
 campHeroTitles:{flexShrink:0,alignItems:'center',gap:5},
 campUpgradeControls:{alignSelf:'stretch',flexShrink:0,gap:6,paddingTop:8,borderTopWidth:1,borderTopColor:'#8c6c3f66'},
 campUpgradeSummary:{flexDirection:'row',alignItems:'center',gap:7},
 levelTransition:{width:66,alignItems:'center',gap:1},
 transitionLabel:{fontSize:8,lineHeight:10,letterSpacing:.6,color:'#755c32'},
 transitionValue:{fontFamily:font,fontSize:22,lineHeight:25,fontWeight:'800',color:'#49371c'},
 denseMaterial:{minHeight:36,padding:4,gap:3,borderRadius:4,borderColor:'#8a835d88'},
 upgradeHint:{fontSize:10,lineHeight:13,color:'#68522d',textAlign:'center'},
 paperDisabledButton:{opacity:1,backgroundColor:'#888e64',borderColor:'#b1a16e',borderBottomColor:'#73784f',...webSurface('linear-gradient(#a0a57c,#858b60)')},
 unlockedLevelText:{fontFamily:font,fontWeight:'700',fontSize:16,lineHeight:19,color:'#4d6338',textAlign:'center'},
 unlockGrid:{flex:1,minHeight:0},
 unlockRow:{flex:1,minHeight:0,flexDirection:'row'},
 unlockPagination:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:8},
 lockBadge:{position:'absolute',top:6,right:6,width:20,height:20,borderRadius:5,borderWidth:1,borderColor:'#bcb18a55',backgroundColor:'#122c26df',zIndex:3},
 lockShackle:{position:'absolute',left:5,top:3,width:8,height:8,borderRadius:5,borderWidth:1.5,borderColor:'#cebf96'},
 lockBody:{position:'absolute',left:4,top:9,width:10,height:7,borderRadius:2,backgroundColor:'#cebf96'},
 feedback:{paddingHorizontal:10,paddingVertical:5,borderTopWidth:1,borderTopColor:'#9b86524d',backgroundColor:'#293f2a'},feedbackText:{fontSize:12,lineHeight:16,color:'#f3d899'},pin:{position:'absolute',width:5,height:5,borderRadius:3,backgroundColor:'#c3a05a',borderWidth:1,borderColor:'#62512c',zIndex:3},
});
