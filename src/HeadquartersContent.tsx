import {buildingNeedsRepair} from './camp-restoration';
import {buildingRestored,BROKEN_CAMP_ART} from './camp-restoration';
import React,{useEffect,useImperativeHandle,useRef,useState} from 'react';
import {View,Text,Image,ImageBackground,Pressable,ScrollView,StyleSheet,Platform,type ImageSourcePropType,type StyleProp,type ViewStyle} from 'react-native';
import type {World} from './survival-engine';
import {stationPalette as colors} from './station-palette';
import {HQ_PAPER,HQ_BENCH_ART,buildingFor,buildingArt,buildingPlacement,markBuilding,headquartersPlans,orderedCataloguePlans,planCampLevel,equipmentInventory,discoveries,type HQArt,type HQTab,type HQPlan,type HQBuildingId} from './headquarters-model';
import {restoreCampBuilding,buildingRepairStatus,buildingRepairCost,campWorkStatus,repairCamp,costRows,REPAIR_CAMP_COST,expandCamp,campExpansionStatus} from './run-progression';
import {CAMP_EXPANSION_COST,campAccessLevel,type CampLevel} from './camp-levels';
import {journalObjectives,journalNextStep,objectiveComplete,trackObjective,type JournalId} from './headquarters-journal';
import {hasGear} from './player-gear';
import {canPayMaterials} from './camp-materials';
import type {MaterialCost} from './forge-recipes';
import {furnaces,upgradeFurnace} from './camp-furnace';

export type HeadquartersNavigation={back:()=>void};
type Props={navigation?:React.Ref<HeadquartersNavigation>;focusControl?:(id:string)=>void;world:World;width:number;height:number;source:(path:string)=>ImageSourcePropType;onClose:()=>void;onChange:()=>void};
type Filter='all'|'buildings'|'equipment';
const font=Platform.OS==='web'?'Barlow Condensed':'FieldKitBarlow';
const tabs:{id:HQTab;label:string}[]=[
 {id:'camp',label:'Camp'},{id:'plans',label:'Plans'},{id:'journal',label:'Journal'}
];
const webSurface=(backgroundImage:string):ViewStyle=>Platform.OS==='web'?{backgroundImage}:{};
const stationSurface='linear-gradient(115deg,#2a302d,#202523 55%,#1d211f)';
const tileSurface='linear-gradient(135deg,#323934,#272c29)';
const selectedSurface='linear-gradient(115deg,#524a37,#3c392f)';
const goldSurface='linear-gradient(110deg,#ead09a,#d5b479)';
const materialArt:Record<string,string>={pallets:'/survival/ui-field-kit-v1/logs.png',stone:'/survival/world-rocks-v1/river-stone-trio.webp',scrap:'/survival/ui-backpack-v1/scrap.png',ironIngot:'/survival/ironworks-v1/iron-ingot.png'};
function Art({art,source,style,locked=false}:{art:HQArt;source:Props['source'];style?:StyleProp<ViewStyle>;locked?:boolean}){
 const [box,setBox]=useState({width:1,height:1}),c=art.clip,k=c?Math.min(box.width/c[2],box.height/c[3]):1;
 return <View pointerEvents="none" onLayout={e=>setBox(e.nativeEvent.layout)} style={[s.art,style,locked&&s.lockedArt]}>
  <Image source={source(art.image)} blurRadius={locked?1:0} resizeMode={c?'stretch':'contain'} style={c?{position:'absolute',width:k,height:k,left:(box.width-c[2]*k)/2-c[0]*k,top:(box.height-c[3]*k)/2-c[1]*k}:StyleSheet.absoluteFill}/>
  {art.overlay&&<Image source={source(art.overlay)} blurRadius={locked?1:0} resizeMode="contain" style={StyleSheet.absoluteFill}/>}
 </View>;
}
function LockBadge(){return <View pointerEvents="none" style={s.lockBadge}><View style={s.lockShackle}/><View style={s.lockBody}/></View>}
function Button({testID,label,onPress,disabled=false,primary=false,ink=false,small=false,accessibilityLabel,style}:{testID?:string;label:string;onPress:()=>void;disabled?:boolean;primary?:boolean;ink?:boolean;small?:boolean;accessibilityLabel?:string;style?:StyleProp<ViewStyle>}){
 return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.button,primary&&s.primary,disabled&&s.disabled,pressed&&!disabled&&s.pressed,style]}>
  <Text style={[s.buttonText,primary&&s.primaryText,ink&&{color:'#243b2b'},small&&{fontSize:19,lineHeight:22}]}>{label}</Text>
 </Pressable>;
}
function Tag({label,good=false}:{label:string;good?:boolean}){return <View style={[s.tag,good&&s.goodTag]}><Text style={[s.tagText,good&&{color:'#c6df9d'}]}>{label}</Text></View>}
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
 const locked=campAccessLevel(world)<2&&!world.creativeMode;
 const canLocate=!!buildingPlacement(world,buildingFor('headquarters'));
 const instruction=world.creativeMode?'Restore the furnace.':locked?'Upgrade headquarters to level 2.':!hasGear(world,'repairHammer')?'Find a repair hammer.':
  missing.length?'Gather '+missing.map(row=>(row.needed-row.have)+' more '+row.name.toLowerCase()).join(' and ')+'.':
  world.player.equipped!=='repairHammer'?'Equip a repair hammer.':'Hold Repair beside the furnace.';
 return <ScrollView style={s.overviewScroll} contentContainerStyle={s.furnaceRepair}>
  <Text style={s.sectionTitle}>{instruction}</Text>
  {!locked&&!world.creativeMode&&world.player.equipped!=='repairHammer'&&<Text style={s.muted}>Hold Repair beside the furnace to rebuild it.</Text>}
  {!world.creativeMode&&<Pressable testID="repair-materials" accessibilityRole="button" aria-expanded={details} accessibilityState={{expanded:details}} onPress={()=>setDetails(!details)} style={s.disclosure}>
   <Text style={s.copy}>Repair materials</Text><Text style={s.textLink}>{details?'−':'+'}</Text>
  </Pressable>}
  {details&&<Materials world={world} cost={cost} source={source}/>}
  {world.creativeMode&&<Button primary testID="furnace-repair-action" label="Repair furnace" onPress={()=>{if(restoreCampBuilding(world,'furnace')){onChange();onClose()}}}/>}
  {locked&&canLocate&&<Button primary testID="furnace-repair-action" label="Mark headquarters on map" onPress={()=>{if(markBuilding(world,'headquarters')){onChange();onClose()}}}/>}
 </ScrollView>;
}
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
export default function HeadquartersContent({world:w,width,height,source,onClose,onChange,navigation,focusControl}:Props){
 const level=campAccessLevel(w),compact=height<500,tiny=height<380,portrait=width<height*1.12,denseHeader=compact||width<700;
 const [tab,setTab]=useState<HQTab>('camp'),[showUpgrade,setShowUpgrade]=useState(false);
 const [filter,setFilter]=useState<Filter>('all'),[levelFilter,setLevelFilter]=useState<CampLevel|'all'>('all'),[levelMenu,setLevelMenu]=useState(false);
 const [planId,setPlanId]=useState<string>(),[page,setPage]=useState(0),[message,setMessage]=useState('');
 const [journalId,setJournalId]=useState<JournalId|'discoveries'>(w.progression?.trackedObjective??'metalworking');
 const [,setRevision]=useState(0);
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),3200);return()=>clearTimeout(timer)},[message]);
 const plans=headquartersPlans(w),plan=plans.find(p=>p.id===planId);
 const objectives=journalObjectives(w),objective=objectives.find(o=>o.id===journalId)??objectives[1],entries=discoveries(w);
 const changed=(text='')=>{setMessage(text);setRevision(n=>n+1);onChange()};
 const history=useRef<{tab:HQTab;planId?:string;trigger:string}[]>([]);
 const pendingFocus=useRef('');
 useEffect(()=>{
  if(pendingFocus.current){focusControl?.(pendingFocus.current);pendingFocus.current=''}
 },[tab,planId,levelMenu,focusControl]);
 const chooseTab=(next:HQTab)=>{history.current=[];setShowUpgrade(false);pendingFocus.current=(tab!==next||planId||levelMenu)?'hq-tab-'+next:'';setTab(next);setPlanId(undefined);setLevelMenu(false);setMessage('')};
 const openPlan=(id:string,trigger='hq-plan-'+id)=>{
  history.current.push({tab,planId,trigger});pendingFocus.current='hq-plan-back';
  setPlanId(id);setTab('plans');setLevelMenu(false);setMessage('');
 };
 const back=()=>{
  if(levelMenu){pendingFocus.current='hq-level-filter';setLevelMenu(false);return}
  if(tab==='camp'&&showUpgrade){setShowUpgrade(false);focusControl?.('hq-tab-camp');return}
  const previous=history.current.pop();
  if(!previous){onClose();return}
  pendingFocus.current=previous.trigger;
  setTab(previous.tab);setPlanId(previous.planId);setMessage('');
 };
 useImperativeHandle(navigation,()=>({back}));
 const viewLevel=()=>{chooseTab('camp');setShowUpgrade(true)};
 const findBuilding=(id:HQBuildingId)=>{if(markBuilding(w,id)){onChange();onClose()}else setMessage('This building is not in camp.')};
 const paper=(children:React.ReactNode,style?:StyleProp<ViewStyle>)=><ImageBackground source={source(HQ_PAPER)} resizeMode="stretch" imageStyle={{opacity:.22}} style={[s.paper,style]}>{children}</ImageBackground>;
 const costBlock=(cost:MaterialCost,label:string)=><View style={{gap:compact?4:7}}><View style={s.costHeading}><Text style={[s.sectionTitle,compact&&s.compactSection,tiny&&{fontSize:16,lineHeight:18}]}>{label}</Text><Text style={[s.muted,compact&&{fontSize:10}]}>Backpack + camp stores</Text></View><Materials world={w} cost={cost} source={source}/></View>;

 const sectionTabs=<View accessibilityRole="tablist" style={s.tabs}>{tabs.map(t=>
  <Pressable key={t.id} testID={'hq-tab-'+t.id} accessibilityRole="tab" aria-selected={tab===t.id} accessibilityState={{selected:tab===t.id}} onPress={()=>chooseTab(t.id)} style={[s.tab,tab===t.id&&s.tabSelected]}>
   <Text style={[s.tabText,denseHeader&&{fontSize:18},tab===t.id&&{color:colors.brass}]}>{t.label}</Text>
  </Pressable>)}</View>;
 const narrow=width<640;
 const header=<>
  <View style={[s.header,denseHeader&&{gap:8,paddingVertical:3}]}>
   <View style={[s.brand,narrow&&{flex:1}]}>
    <Art art={{image:HQ_BENCH_ART}} source={source} style={{width:denseHeader?32:48,height:denseHeader?34:48}}/>
    <Text accessibilityRole="header" style={[s.brandTitle,{fontSize:denseHeader?23:31}]}>Headquarters</Text>
   </View>
   {!!level&&!narrow&&sectionTabs}
   {!!level&&<View style={s.levelBadge}><Text style={s.levelBadgeText}>Level {level}</Text></View>}
   <Pressable accessibilityRole="button" accessibilityLabel="Leave headquarters" onPress={onClose} style={s.close}><Text style={s.closeText}>×</Text></Pressable>
  </View>
  {!!level&&narrow&&<View style={s.tabRow}>{sectionTabs}</View>}
 </>;

 const damaged=!!w.progression&&(w.progression.hqHp<w.progression.hqMax||w.progression.defence<w.progression.defenceMax);
 const overview=tab==='camp'||!level;
 const campView=()=>{
  let art=buildingArt(w,buildingFor('headquarters')),title='',detail='',label='',disabled=false;
  let cost:MaterialCost|undefined,action=onClose;
  const repair=!level||(damaged&&!showUpgrade);
  if(repair){
   const status=buildingRepairStatus(w,'headquarters');
   art=!level?{image:BROKEN_CAMP_ART.headquarters}:art;
   title=!level?'Establish camp':'Camp repairs';
   detail=!level?'Unlock camp buildings and plans.':[
    w.progression!.hqHp<w.progression!.hqMax?'Headquarters '+Math.ceil(w.progression!.hqHp)+' / '+w.progression!.hqMax:'',
    w.progression!.defence<w.progression!.defenceMax?'Defences '+Math.ceil(w.progression!.defence)+' / '+w.progression!.defenceMax:'',
   ].filter(Boolean).join('  ·  ');
   cost=buildingRepairCost(w,'headquarters');label=!level?'Repair headquarters':'Repair camp';disabled=status!=='Ready';
   if(disabled&&status!=='Need repair materials')detail=status;
   action=()=>{if(restoreCampBuilding(w,'headquarters')){if(!level){onChange();onClose()}else changed('Camp repaired.')}else changed(buildingRepairStatus(w,'headquarters'))};
  }else if(level===1){
   const status=campExpansionStatus(w);
   const facility=status==='Repair the workshop first'?'workshop':status==='Repair the warehouse first'?'warehouse':undefined;
   if(facility){
    art=buildingArt(w,buildingFor(facility));title='Restore the '+facility;
    detail='Required for Camp Level 2.';label='Mark '+facility+' on map';
    disabled=!buildingPlacement(w,buildingFor(facility));action=()=>findBuilding(facility);
   }else{
    title='Unlock metalworking';label='Upgrade to level 2';cost=CAMP_EXPANSION_COST;
    disabled=status!=='Ready';detail=disabled&&status!=='Need expansion materials'?status:'';
    action=()=>{if(expandCamp(w)){setShowUpgrade(false);changed('Camp level 2 unlocked.')}else changed(campExpansionStatus(w))};
   }
  }else{
   const active=objectives.find(o=>o.id===w.progression?.trackedObjective&&!objectiveComplete(o))??objectives.find(o=>!objectiveComplete(o));
   const step=active&&journalNextStep(w,active),next=step?.planId&&plans.find(p=>p.id===step.planId);
   title=step?.label??'Working camp';
   if(next){
    art=next.art;
    const smelting=next.id==='metalworking'&&!!w.progression?.furnaceRestored;
    label=smelting?'Mark furnace on map':'View '+next.title.toLowerCase()+' plan';
    action=smelting?()=>findBuilding('furnace'):()=>openPlan(next.id,'hq-camp-action');
   }else if(active){
    label='View objective';action=()=>{setJournalId(active.id);chooseTab('journal')};
   }else{
    label='Browse plans';action=()=>chooseTab('plans');
   }
  }
  return <ScrollView style={s.overviewScroll} contentContainerStyle={[s.campAction,compact&&{padding:12,gap:8}]}>
   <View style={s.actionHeading}>
    <Art art={art} source={source} style={[s.actionArt,narrow&&{width:70,height:66}]}/>
    <View style={s.actionCopy}><Text style={s.actionTitle}>{title}</Text>{!!detail&&<Text style={s.copy}>{detail}</Text>}</View>
   </View>
   {cost&&!w.creativeMode&&<Materials world={w} cost={cost} source={source}/>}
   <Button primary testID="hq-camp-action" label={label} onPress={action} disabled={disabled}/>
   {damaged&&level===1&&<Button small label={showUpgrade?'Camp repairs':'View camp upgrade'} onPress={()=>setShowUpgrade(!showUpgrade)} style={s.quietButton}/>}
  </ScrollView>;
 };

 const filtered=orderedCataloguePlans(w).filter(p=>(filter==='all'||(filter==='equipment'?!!p.gearId:!p.gearId))&&(levelFilter==='all'||planCampLevel(p)===levelFilter));
 const pages=Math.max(1,Math.ceil(filtered.length/6)),safePage=Math.min(page,pages-1),visible=filtered.slice(safePage*6,safePage*6+6);
 const cardGap=compact?7:12;
 const columns=portrait?2:3;
 const cardWidth=Math.floor((width-(portrait?24:compact?24:32)-cardGap*(columns-1))/columns);
 const library=<View style={[s.page,portrait&&s.portraitPage]}>
  <View style={[s.toolbar,(compact||portrait)&&{paddingVertical:4,gap:5},portrait&&{flexWrap:'wrap'}]}>
   <View style={[s.filters,(compact||portrait)&&{gap:5}]}>{([{id:'all',label:'All'},{id:'buildings',label:'Buildings'},{id:'equipment',label:'Equipment'}] as const).map(f=><Pressable key={f.id} accessibilityRole="button" aria-pressed={filter===f.id} accessibilityState={{selected:filter===f.id}} onPress={()=>{setFilter(f.id);setPage(0);setLevelMenu(false)}} style={[s.filter,(compact||portrait)&&{minWidth:65,paddingHorizontal:12},filter===f.id&&s.filterSelected]}><Text style={[s.filterText,(compact||portrait)&&{fontSize:17},filter===f.id&&{color:'#292b1a'}]}>{f.label}</Text></Pressable>)}</View>
   <View style={s.levelPicker}>
    <Pressable accessibilityRole="button" testID="hq-level-filter" accessibilityLabel="Filter plans by camp level" aria-expanded={levelMenu} accessibilityState={{expanded:levelMenu}} onPress={()=>setLevelMenu(!levelMenu)} style={[s.filter,{minWidth:compact||portrait?110:150}]}><Text style={[s.filterText,(compact||portrait)&&{fontSize:16}]}>{levelFilter==='all'?'All levels':'Level '+levelFilter}　{levelMenu?'⌃':'⌄'}</Text></Pressable>
    {levelMenu&&<View style={s.levelOptions}>{(['all',1,2] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityLabel={value==='all'?'Show all levels':'Show Camp level '+value} aria-pressed={levelFilter===value} accessibilityState={{selected:levelFilter===value}} onPress={()=>{pendingFocus.current='hq-level-filter';setLevelFilter(value);setPage(0);setLevelMenu(false)}} style={[s.levelOption,levelFilter===value&&s.levelSelected]}><Text style={s.levelOptionText}>{value==='all'?'All levels':'Camp level '+value}</Text>{levelFilter===value&&<Text style={s.levelOptionText}>✓</Text>}</Pressable>)}</View>}
   </View>
  </View>
  <View style={[s.cardGrid,{gap:cardGap},portrait&&{flexGrow:0,flexShrink:0,flexBasis:'auto'}]}>{visible.map(p=><Pressable key={p.id} testID={'hq-plan-'+p.id} accessibilityRole="button" accessibilityLabel={'Open '+p.title+'. '+cardStatus(w,p)} onPress={()=>openPlan(p.id)} style={[s.planCard,{width:cardWidth},portrait?{height:164,flexDirection:'column',padding:8,gap:3}:{height:'48%'},compact&&{padding:7,gap:7},level<planCampLevel(p)&&s.lockedCard]}>
   {level<planCampLevel(p)&&<LockBadge/>}<Art art={p.art} source={source} locked={level<planCampLevel(p)} style={{width:portrait?'100%':compact?'40%':'43%',height:portrait?72:'100%'}}/>
   <View style={[{flex:1,minWidth:0,gap:compact?5:10},portrait&&{width:'100%',gap:4,alignItems:'center'}]}><Text numberOfLines={2} style={[s.cardTitle,compact&&{fontSize:21,lineHeight:23},portrait&&{fontSize:23,lineHeight:25,textAlign:'center'}]}>{p.title}</Text><Text numberOfLines={2} style={[s.cardState,(compact||portrait)&&{fontSize:12,lineHeight:15},level<planCampLevel(p)&&{color:'#c4b893'}]}>{cardStatus(w,p)}</Text></View>
   {!portrait&&<Text style={s.chevron}>›</Text>}
  </Pressable>)}</View>
  <View style={s.pagination}><Text style={[s.muted,compact&&{fontSize:11}]}>{filtered.length?filtered.length+' plans'+(levelFilter==='all'?' · Available first':''):'No plans at this level'}</Text><View style={s.pageControls}><Button label="‹" accessibilityLabel="Previous plans page" disabled={safePage===0} onPress={()=>setPage(safePage-1)} style={s.pageButton}/><Text style={s.pageNumber}>{safePage+1} / {pages}</Text><Button label="›" accessibilityLabel="Next plans page" disabled={safePage===pages-1} onPress={()=>setPage(safePage+1)} style={s.pageButton}/></View></View>
 </View>;

 const renderPlan=()=>{
  if(!plan)return library;
  const previous=history.current.at(-1);
  const backLabel=previous?.planId?'Back to plan':'Back to '+(previous?.tab??'plans');
  const locked=level<planCampLevel(plan),built=plan.id==='metalworking'&&(!w.progression||w.progression.furnaceRestored);
  const reinforced=plan.id==='reinforced-camp'&&w.progression?.fortified,repairs=plan.id==='shelter'&&damaged;
  const isBuilt=!locked&&!repairs&&!plan.gearId&&(built||cardStatus(w,plan)==='✓  Built');
  const madeHere=plan.id==='workshop'&&buildingRestored(w,'workshop')?['equipment-woodenAxe','equipment-woodenPickaxe','equipment-woodenKnife'].flatMap(id=>plans.filter(p=>p.id===id)):[];
  const workStatus=plan.id==='shelter'?buildingRepairStatus(w,'headquarters'):campWorkStatus(w,plan.id==='reinforced-camp');
  let label='',action=()=>{},disabled=false,hint='',cost:MaterialCost|undefined=plan.cost;
  if(locked){label='VIEW CAMP UPGRADE';action=viewLevel;cost=undefined}
  else if(!plan.gearId&&plan.building!=='headquarters'&&buildingNeedsRepair(w,plan.building)){cost=buildingRepairCost(w,plan.building);disabled=!buildingPlacement(w,buildingFor(plan.building));if(w.creativeMode){label='RESTORE '+buildingFor(plan.building).short.toUpperCase();action=()=>{if(restoreCampBuilding(w,plan.building))changed(buildingFor(plan.building).name+' restored.');else changed(buildingRepairStatus(w,plan.building))};hint='Creative Mode · Repair this building instantly.'}else{label='FIND '+buildingFor(plan.building).short.toUpperCase();action=()=>findBuilding(plan.building);hint='Equip your repair hammer and restore this existing building on site.'}}
  else if(plan.gearId&&!buildingRestored(w,'workshop')){label='VIEW WORKSHOP REPAIR';action=()=>openPlan('workshop','hq-plan-action');hint='Repair the workshop before crafting equipment.';cost=undefined}
  else if(plan.id==='reinforced-camp'){label=reinforced?'CAMP REINFORCED':'REINFORCE CAMP';disabled=workStatus!=='Ready';action=()=>{if(repairCamp(w,true))changed('Camp defences reinforced.')};hint=reinforced?'Camp defence capacity increased to 220.':workStatus==='Ready'?plan.benefit:workStatus;if(reinforced)cost=undefined}
  else if(repairs){label='REPAIR HEADQUARTERS';disabled=workStatus!=='Ready';cost=REPAIR_CAMP_COST;action=()=>{if(restoreCampBuilding(w,'headquarters')){onChange();onClose()}};hint=workStatus==='Ready'?'Repair headquarters and defences immediately.':workStatus}
  else if(plan.id==='shelter'){label='VIEW CAMP';action=()=>viewLevel();cost=undefined}
  else if((plan.gearId&&planCampLevel(plan)===2||plan.id==='furnace-bellows')&&w.progression&&!w.progression.furnaceRestored){label='VIEW FURNACE PLAN';action=()=>openPlan('metalworking','hq-plan-action');hint='Repair the furnace with your hammer to enable this recipe.'}
  else if(w.creativeMode&&plan.id==='furnace-bellows'){const furnace=furnaces(w.layout)[0],upgraded=!!furnace&&w.ironworks?.stations[furnace.id]?.level===2;label=upgraded?'FURNACE UPGRADED':'UPGRADE FURNACE';disabled=!furnace||upgraded;action=()=>{if(upgradeFurnace(w))changed('Furnace upgraded to level 2.');else changed('Repair the furnace first.')};hint=upgraded?'Level 2 bellows fitted.':'Creative Mode · Instant furnace upgrade.';if(upgraded)cost=undefined}
   else if(plan.building==='garden'||plan.building==='treatment'){label='STRUCTURE REPAIRED';disabled=true;cost=undefined;hint=plan.building==='garden'?'Garden restored. Planting and harvesting are coming later.':'Shelter restored. Medical treatment is coming later.'}
  else {label='MARK '+buildingFor(plan.building).short.toUpperCase()+' ON MAP';action=()=>findBuilding(plan.building);disabled=!buildingPlacement(w,buildingFor(plan.building));hint=plan.gearId?'Craft at the workshop.':plan.id==='furnace-bellows'?'Fit improved bellows at the furnace.':plan.id==='workshop'?'Craft tools at the workshop.':'';if(built)cost=undefined}
  return <View style={[s.page,portrait&&s.portraitPage]}>
   <View style={s.backRow}><Button testID="hq-plan-back" label={'‹  '+backLabel} onPress={back} style={s.backButton}/></View>
   <View style={[s.columns,{gap:compact?9:18},portrait&&s.stacked]}>
    {paper(<><Art art={plan.art} source={source} locked={locked||plan.preview} style={{flex:1,minHeight:80,width:'100%'}}/></>,[s.planHero,compact&&{padding:9},portrait&&{flexGrow:0,flexShrink:0,flexBasis:'auto',height:116}])}
    <View style={[s.planRight,portrait&&{flexGrow:0,flexShrink:0,flexBasis:'auto',minHeight:340}]}>
     <ScrollView style={s.scroll} contentContainerStyle={[s.planCopy,compact&&{gap:5}]}>
      <View style={s.detailHeading}><Text style={[s.detailTitle,compact&&{fontSize:31,lineHeight:33}]}>{plan.title.toUpperCase()}</Text>{isBuilt&&<Tag label="✓  BUILT" good/>}</View>
      {!(tiny&&madeHere.length>0)&&<Text style={[s.copy,compact&&{fontSize:12,lineHeight:16}]}>{plan.description}</Text>}
      {!isBuilt&&<Tag label={repairs?'REPAIRS NEEDED':locked?'CAMP LEVEL '+planCampLevel(plan):cardStatus(w,plan).toUpperCase()} good={!locked&&!repairs}/>}
      {plan.gearId&&<Text style={s.muted}>Backpack {equipmentInventory(w,plan.gearId).pack} · Storage {equipmentInventory(w,plan.gearId).stored}</Text>}
      {!!madeHere.length&&<View testID="workshop-recipes" style={[s.madeHere,compact&&{paddingTop:7,gap:5}]}><Text style={[s.sectionTitle,compact&&s.compactSection]}>MADE HERE</Text><View style={s.recipeRow}>{madeHere.map(p=><Pressable key={p.id} testID={'hq-plan-'+p.id} accessibilityRole="button" accessibilityLabel={'View '+p.title+' recipe'} onPress={()=>openPlan(p.id)} style={[s.recipeCard,compact&&{padding:5}]}><Art art={p.art} source={source} style={{height:tiny?42:compact?54:100,width:'100%'}}/><View style={s.unlockLabel}><Text numberOfLines={2} style={[s.recipeName,compact&&{fontSize:15,lineHeight:17}]}>{p.title}</Text><Text style={s.unlockChevron}>›</Text></View></Pressable>)}</View></View>}
      {cost&&<View style={[s.detailCost,compact&&{marginTop:3,paddingTop:7}]}>{costBlock(cost,plan.gearId?'CRAFT COST':repairs||!buildingRestored(w,plan.building)?'REPAIR COST':plan.id==='metalworking'?'BUILD COST':'UPGRADE COST')}</View>}
      {built&&<Pressable accessibilityRole="button" testID="hq-bellows" accessibilityLabel="View improved bellows upgrade" onPress={()=>openPlan('furnace-bellows','hq-bellows')} style={s.upgradeLink}><Text style={s.textLink}>Improved bellows upgrade ›</Text></Pressable>}
     </ScrollView>
     <View style={[s.primaryAction,compact&&{gap:4,paddingTop:5}]}><Button primary label={label} disabled={disabled} testID="hq-plan-action" onPress={action}/>{!!hint&&<Text style={s.actionHint}>{hint}</Text>}</View>
    </View>
   </View>
  </View>;
 };

 const tracked=w.progression?.trackedObjective,nextStep=journalNextStep(w,objective),completed=objectiveComplete(objective);
 const needsCampUpgrade=objective.id==='metalworking'&&level<2;
 const nextIsSmelting=nextStep?.planId==='metalworking'&&!!w.progression?.furnaceRestored;
 const journal=<View style={[s.page,portrait&&s.portraitPage]}>
  <View style={[s.columns,portrait&&s.stacked]}>
   <View style={[s.journalList,portrait&&{flexGrow:0,flexShrink:0,flexBasis:'auto'}]}>{objectives.map(o=><Pressable key={o.id} accessibilityRole="button" accessibilityLabel={'Read '+o.title} aria-pressed={journalId===o.id} accessibilityState={{selected:journalId===o.id}} onPress={()=>setJournalId(o.id)} style={[s.journalEntry,journalId===o.id&&s.levelSelected,compact&&{padding:7,minHeight:51}]}>
    <Text style={[s.journalSymbol,{color:objectiveComplete(o)?'#b4cf87':tracked===o.id?'#f2bf58':'#b5c0a5'}]}>{objectiveComplete(o)?'✓':tracked===o.id?'◆':'○'}</Text><View style={{flex:1,gap:2}}><Text style={[s.journalEntryTitle,compact&&{fontSize:19,lineHeight:21}]}>{o.title}</Text><Text style={[s.muted,{color:tracked===o.id?'#e2bb6c':'#b9c7a3'},compact&&{fontSize:10}]}>{objectiveComplete(o)?'Complete':tracked===o.id?'Tracked':o.steps.some(step=>step.done)?'In progress':'Not started'}</Text></View>
   </Pressable>)}
    <Pressable accessibilityRole="button" accessibilityLabel="Read camp discoveries" aria-pressed={journalId==='discoveries'} accessibilityState={{selected:journalId==='discoveries'}} onPress={()=>setJournalId('discoveries')} style={[s.discoveryNav,journalId==='discoveries'&&s.levelSelected]}><Text style={[s.journalEntryTitle,compact&&{fontSize:18}]}>Discoveries</Text><Text style={s.muted}>{entries.length}</Text></Pressable>
   </View>
   {paper(journalId==='discoveries'?<ScrollView style={s.scroll} contentContainerStyle={{gap:14}}>
    <Text style={[s.heroTitle,{textAlign:'left'},compact&&{fontSize:28}]}>DISCOVERIES</Text>{entries.length?entries.map(e=><View key={e.id} style={s.discoveryEntry}><Art art={{image:e.image}} source={source} style={{width:compact?48:70,height:compact?48:70}}/><View style={{flex:1,gap:4}}><Text style={s.discoveryTitle}>{e.title}</Text><Text style={s.paperCopy}>{e.body}</Text></View></View>):<Text style={s.paperCopy}>Explore the world to record your discoveries.</Text>}
   </ScrollView>:<>
    <ScrollView style={s.scroll} contentContainerStyle={{gap:compact?5:12,flexGrow:1}}>
    <View style={s.journalHero}><View style={{flex:1,gap:compact?3:8}}><Text style={[s.journalTitle,compact&&{fontSize:27,lineHeight:29},tiny&&{fontSize:24,lineHeight:26}]}>{objective.title.toUpperCase()}</Text>{!tiny&&<Text style={[s.paperCopy,compact&&{fontSize:12,lineHeight:16}]}>{objective.description}</Text>}</View><Art art={{image:objective.image}} source={source} locked={objective.id==='metalworking'&&level<2} style={{width:tiny?36:compact?48:110,height:tiny?30:compact?48:105}}/></View>
    <Text accessibilityLiveRegion="polite" style={[s.paperSmall,compact&&{fontSize:10,lineHeight:12}]}>{objective.steps.filter(step=>step.done).length} of {objective.steps.length} completed</Text>
    {needsCampUpgrade&&<View testID="journal-prerequisite" style={[s.prerequisite,compact&&{minHeight:tiny?28:32,paddingVertical:3,paddingHorizontal:8}]}><LockBadge/><View style={{flex:1,gap:2}}><Text style={[s.prerequisiteTitle,compact&&{fontSize:16,lineHeight:18}]}>Requires Camp Level 2</Text></View></View>}
    <View style={s.journalSteps}>{objective.steps.map(step=><View key={step.label} accessibilityLabel={step.label+(step.done?', completed':', incomplete')} style={[s.journalStep,compact&&{minHeight:tiny?28:30,paddingVertical:3}]}><Text style={[s.stepCheck,compact&&{fontSize:20,lineHeight:22,width:24},step.done&&{color:'#5d783d'}]}>{step.done?'✓':'○'}</Text><Text style={[s.stepLabel,compact&&{fontSize:15,lineHeight:18}]}>{step.label}</Text></View>)}</View>
    </ScrollView>
    <View style={s.journalActions}>
     <Pressable accessibilityRole="button" accessibilityState={{selected:tracked===objective.id,disabled:!w.progression||completed&&tracked!==objective.id}} disabled={!w.progression||completed&&tracked!==objective.id} onPress={()=>{if(trackObjective(w,tracked===objective.id?undefined:objective.id))changed()}} style={[s.trackButton,tracked===objective.id&&{backgroundColor:'#17392c'}]}><Text style={[s.trackText,tracked===objective.id&&{color:'#f0c365'}]}>{tracked===objective.id?'◆  TRACKED':completed?'✓  COMPLETE':'◇  TRACK OBJECTIVE'}</Text></Pressable>
     {nextStep?.planId&&<Button testID="hq-journal-next" small={compact} label={nextStep.planId==='shelter'?level<2&&objective.id!=='shelter'?'VIEW CAMP UPGRADE':'VIEW CAMP':nextIsSmelting?'MARK FURNACE ON MAP':nextStep.planId==='metalworking'?'VIEW FURNACE PLAN':'VIEW PLAN'} onPress={()=>nextStep.planId==='shelter'?viewLevel():nextIsSmelting?findBuilding('furnace'):openPlan(nextStep.planId!,'hq-journal-next')} style={s.journalPrimary}/>}
    </View>
   </>,[s.journalPaper,compact&&{padding:tiny?10:12,gap:5},portrait&&{flexGrow:0,flexShrink:0,flexBasis:'auto',minHeight:310}])}
  </View>
 </View>;

 return <View style={[s.frame,overview&&s.overviewFrame]} testID={!level?'headquarters-first-repair':undefined}>
  {header}
  {overview?campView():portrait?<ScrollView style={s.scroll} contentContainerStyle={{padding:6,gap:8}}>{tab==='journal'?journal:plan?renderPlan():library}</ScrollView>:<View style={[s.body,compact&&{padding:6}]}>{tab==='journal'?journal:plan?renderPlan():library}</View>}
  {!!message&&<Pressable accessibilityRole="button" accessibilityLabel="Dismiss headquarters notification" onPress={()=>setMessage('')} style={s.feedback}><Text accessibilityLiveRegion="polite" style={s.feedbackText}>{message}　×</Text></Pressable>}
 </View>;
}

const s=StyleSheet.create({
 overviewFrame:{width:'100%',maxWidth:760,maxHeight:'100%',flexGrow:0,flexShrink:1,flexBasis:'auto',alignSelf:'center',margin:'auto'},
 overviewScroll:{flexGrow:0,flexShrink:1,minHeight:0},
 campAction:{padding:20,gap:14},
 actionHeading:{flexDirection:'row',alignItems:'center',gap:14},
 actionArt:{width:100,height:82},
 actionCopy:{flex:1,minWidth:0,gap:3},
 actionTitle:{fontFamily:font,fontWeight:'800',fontSize:29,lineHeight:33,color:colors.text},
 disclosure:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:colors.line},
 quietButton:{backgroundColor:'transparent',borderWidth:0},
 furnaceRepair:{flexGrow:1,padding:8,gap:12},
 repairLedger:{borderWidth:1,borderColor:colors.line,borderRadius:5,overflow:'hidden',backgroundColor:colors.inset},
 repairRow:{flexDirection:'row',minHeight:42,alignItems:'center',gap:8,paddingHorizontal:10},
 repairCount:{fontSize:16,fontWeight:'700',color:colors.text},
 frame:{flex:1,minWidth:0,minHeight:0,padding:4,borderWidth:1,borderColor:colors.line,borderRadius:10,backgroundColor:colors.panel,overflow:'hidden',...webSurface(stationSurface)},
 header:{flexDirection:'row',alignItems:'center',gap:16,paddingHorizontal:8,paddingVertical:6,borderBottomWidth:1,borderBottomColor:colors.line},
 brand:{flexDirection:'row',alignItems:'center',gap:8,marginRight:'auto'},
 brandTitle:{fontFamily:font,fontWeight:'800',color:colors.text},
 tabs:{flex:1,minWidth:0,flexDirection:'row',alignItems:'stretch',gap:4},
 tabRow:{paddingHorizontal:6,borderBottomWidth:1,borderBottomColor:colors.line},
 tab:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderBottomWidth:2,borderBottomColor:'transparent'},
 tabSelected:{borderBottomColor:colors.brass,backgroundColor:'#e4c17b0e'},
 tabText:{fontFamily:font,fontWeight:'700',fontSize:22,color:colors.muted},
 levelBadge:{justifyContent:'center',paddingHorizontal:3},levelBadgeText:{fontFamily:font,fontWeight:'700',fontSize:17,color:colors.muted},
 close:{width:44,height:44,borderWidth:1,borderColor:colors.line,borderRadius:6,alignItems:'center',justifyContent:'center',backgroundColor:colors.inset},
 closeText:{fontSize:28,lineHeight:32,fontWeight:'400',color:colors.text},
 body:{flex:1,minHeight:0,padding:10},page:{flex:1,minHeight:0,gap:8},portraitPage:{flexGrow:0,flexShrink:0,flexBasis:'auto'},columns:{flex:1,minHeight:0,flexDirection:'row',gap:12},stacked:{flexGrow:0,flexShrink:0,flexBasis:'auto',flexDirection:'column',gap:10},
 art:{position:'relative',overflow:'hidden',minWidth:0},lockedArt:{opacity:.8,...(Platform.OS==='web'?{filter:'saturate(0.6)'}:{})},scroll:{flex:1,minHeight:0},
 paper:{overflow:'hidden',borderWidth:1,borderColor:'#b38a4c',borderRadius:6,padding:18,gap:8,backgroundColor:'#d9ceae'},
 paperCopy:{fontSize:15,lineHeight:21,color:'#49391f'},paperSmall:{fontSize:12,lineHeight:16,color:'#6b5632'},
 heroTitle:{fontFamily:font,fontWeight:'800',fontSize:43,lineHeight:46,color:'#372b18',textAlign:'center'},
 levelSelected:{borderColor:'#d8c08b',backgroundColor:colors.surface,...webSurface(selectedSurface)},
 sectionTitle:{fontFamily:font,fontWeight:'800',fontSize:25,lineHeight:29,color:colors.text,letterSpacing:.5},compactSection:{fontSize:18,lineHeight:21},copy:{fontSize:15,lineHeight:21,color:colors.text},muted:{fontSize:12,lineHeight:16,color:colors.muted},
 textLink:{fontFamily:font,fontWeight:'700',fontSize:15,color:'#e4c478'},
 costHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:5},
 button:{minHeight:44,minWidth:44,paddingVertical:6,paddingHorizontal:13,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.line,borderRadius:5,backgroundColor:colors.surface},buttonText:{fontFamily:font,fontWeight:'800',fontSize:20,color:colors.text,textAlign:'center'},primary:{backgroundColor:colors.brass,borderColor:colors.brass,...webSurface(goldSurface)},primaryText:{fontSize:24,color:colors.ink},disabled:{opacity:.62},pressed:{opacity:.75},primaryAction:{paddingTop:10,gap:6,flexShrink:0},actionHint:{fontSize:11,lineHeight:14,color:colors.muted,textAlign:'center'},
 tag:{alignSelf:'flex-start',paddingVertical:4,paddingHorizontal:10,borderWidth:1,borderColor:colors.line,borderRadius:4,backgroundColor:colors.surface},goodTag:{backgroundColor:'#314b2d',borderColor:'#8eac63'},tagText:{fontFamily:font,fontWeight:'800',fontSize:15,letterSpacing:.3,color:'#e8d39c'},
 toolbar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:6,gap:8,zIndex:10},filters:{flexDirection:'row',gap:8},filter:{minHeight:44,minWidth:93,paddingHorizontal:18,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:colors.line,borderRadius:5,backgroundColor:colors.surface,...webSurface(tileSurface)},filterText:{fontFamily:font,fontWeight:'800',fontSize:21,color:'#e4d6b2'},filterSelected:{backgroundColor:colors.brass,borderColor:'#f5d591',...webSurface(goldSurface)},levelPicker:{position:'relative'},levelOptions:{position:'absolute',top:47,right:0,width:158,zIndex:30,borderWidth:1,borderColor:'#c7a45d',borderRadius:5,padding:4,gap:3,backgroundColor:colors.inset},levelOption:{minHeight:44,paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderColor:'transparent',borderRadius:3},
 cardGrid:{flex:1,minHeight:0,flexDirection:'row',flexWrap:'wrap',alignContent:'flex-start'},planCard:{minWidth:0,flexDirection:'row',alignItems:'center',gap:12,padding:14,borderWidth:1,borderColor:colors.line,borderRadius:6,backgroundColor:colors.surface,overflow:'hidden',...webSurface(tileSurface)},lockedCard:{borderColor:'#7d846366',backgroundColor:colors.inset,...webSurface('linear-gradient(115deg,#2c302b,#252925)')},cardTitle:{fontFamily:font,fontWeight:'800',fontSize:31,lineHeight:34,color:colors.text},cardState:{fontSize:16,lineHeight:20,color:'#bfd394'},chevron:{fontFamily:font,fontSize:28,color:'#a99b6c'},pagination:{minHeight:44,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,borderTopWidth:1,borderTopColor:'#8b76493d',paddingTop:3},pageControls:{flexDirection:'row',alignItems:'center',gap:9},pageButton:{width:44,paddingHorizontal:0},pageNumber:{fontFamily:font,fontWeight:'700',fontSize:16,color:'#c6c4a7'},
 backRow:{minHeight:44,flexShrink:0,alignItems:'flex-start'},backButton:{borderWidth:0,backgroundColor:'transparent',paddingHorizontal:7},planHero:{flex:1,minHeight:0,alignItems:'center'},planRight:{flex:1.15,minWidth:0,minHeight:0},planCopy:{gap:12,paddingBottom:5},detailTitle:{fontFamily:font,fontWeight:'800',fontSize:51,lineHeight:55,color:colors.text},detailCost:{borderTopWidth:1,borderTopColor:'#937b4659',paddingTop:15,marginTop:5},upgradeLink:{minHeight:44,justifyContent:'center',alignSelf:'flex-start'},
 journalList:{flex:0.85,minWidth:0,gap:6},journalEntry:{minHeight:70,padding:12,gap:10,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'transparent',borderRadius:5,backgroundColor:colors.surface,...webSurface(tileSurface)},journalSymbol:{width:29,fontSize:26,fontWeight:'700',textAlign:'center'},journalEntryTitle:{fontFamily:font,fontWeight:'800',fontSize:25,lineHeight:28,color:colors.text},discoveryNav:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:5,paddingHorizontal:12,borderWidth:1,borderColor:'#7d744e',borderRadius:5},journalPaper:{flex:2,minWidth:0,minHeight:0,gap:12},journalHero:{flexDirection:'row',alignItems:'center',gap:10},journalTitle:{fontFamily:font,fontWeight:'800',fontSize:40,lineHeight:42,color:'#392c17'},journalSteps:{flex:1,minHeight:0,justifyContent:'center'},journalStep:{minHeight:51,paddingVertical:9,gap:12,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#9f7e424c'},stepCheck:{fontSize:25,lineHeight:28,width:29,color:'#614d29'},stepLabel:{flex:1,fontSize:20,lineHeight:25,color:'#392e1d'},journalActions:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',gap:7},trackButton:{minHeight:44,paddingHorizontal:12,paddingVertical:6,justifyContent:'center',borderRadius:20,borderWidth:1,borderColor:'#7c753d'},trackText:{fontFamily:font,fontWeight:'800',fontSize:17,color:'#4c4b26'},journalPrimary:{backgroundColor:colors.surface,borderColor:'#9b854c',...webSurface(tileSurface)},discoveryEntry:{flexDirection:'row',gap:12,paddingBottom:10,borderBottomWidth:1,borderBottomColor:'#9f7e424c'},discoveryTitle:{fontFamily:font,fontSize:24,fontWeight:'800',color:'#3d301b'},
 levelOptionText:{fontFamily:font,fontWeight:'700',fontSize:18,color:'#e4d6b2'},
 unlockLabel:{alignSelf:'stretch',flexDirection:'row',alignItems:'center',gap:4},
 unlockChevron:{fontFamily:font,fontSize:20,lineHeight:22,color:'#a99b6c'},
 detailHeading:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:10},
 madeHere:{gap:8,paddingTop:12,borderTopWidth:1,borderTopColor:'#937b4659'},
 recipeRow:{flexDirection:'row',gap:7},
 recipeCard:{flex:1,minWidth:0,minHeight:44,padding:8,gap:5,borderWidth:1,borderColor:colors.line,borderRadius:6,backgroundColor:colors.surface,...webSurface(tileSurface)},
 recipeName:{flex:1,fontFamily:font,fontWeight:'700',fontSize:20,lineHeight:22,color:colors.text},
 prerequisite:{minHeight:40,paddingVertical:9,paddingLeft:12,paddingRight:34,borderWidth:1,borderColor:'#8d754c55',borderRadius:5,backgroundColor:'#8b6c2f16'},
 prerequisiteTitle:{fontFamily:font,fontWeight:'700',fontSize:21,lineHeight:24,color:'#5f4f29'},

 lockBadge:{position:'absolute',top:6,right:6,width:20,height:20,borderRadius:5,borderWidth:1,borderColor:'#bcb18a55',backgroundColor:'#122c26df',zIndex:3},
 lockShackle:{position:'absolute',left:5,top:3,width:8,height:8,borderRadius:5,borderWidth:1.5,borderColor:'#cebf96'},
 lockBody:{position:'absolute',left:4,top:9,width:10,height:7,borderRadius:2,backgroundColor:'#cebf96'},
 feedback:{paddingHorizontal:10,paddingVertical:5,borderTopWidth:1,borderTopColor:'#9b86524d',backgroundColor:'#293f2a'},feedbackText:{fontSize:12,lineHeight:16,color:'#f3d899'},
});
