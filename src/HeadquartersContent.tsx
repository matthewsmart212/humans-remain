import {buildingNeedsRepair} from './camp-restoration';
import {buildingRestored,BROKEN_CAMP_ART} from './camp-restoration';
import React,{useEffect,useImperativeHandle,useRef,useState} from 'react';
import {View,Text,Image,ImageBackground,Pressable,ScrollView,StyleSheet,Platform,type ImageSourcePropType,type StyleProp,type ViewStyle} from 'react-native';
import type {World} from './survival-engine';
import {stationPalette as colors} from './station-palette';
import HeadquartersOverview from './HeadquartersOverview';
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
 const [planId,setPlanId]=useState<string>(),[message,setMessage]=useState('');
 const [journalId,setJournalId]=useState<JournalId|'discoveries'>(()=>w.progression?.trackedObjective??journalObjectives(w).find(o=>!objectiveComplete(o))?.id??'discoveries');
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
 const paper=(children:React.ReactNode,style?:StyleProp<ViewStyle>)=><ImageBackground source={source(HQ_PAPER)} resizeMode="stretch" imageStyle={{opacity:.15}} style={[s.paper,style]}>{children}</ImageBackground>;
 const costBlock=(cost:MaterialCost,label:string)=><View style={{gap:compact?4:7}}><View style={s.costHeading}><Text style={[s.sectionTitle,compact&&s.compactSection,tiny&&{fontSize:16,lineHeight:18}]}>{label}</Text><Text style={[s.muted,compact&&{fontSize:10}]}>Backpack + camp stores</Text></View><Materials world={w} cost={cost} source={source}/></View>;

 const sectionTabs=<View accessibilityRole="tablist" style={s.tabs}>{tabs.map(t=>
  <Pressable key={t.id} testID={'hq-tab-'+t.id} accessibilityRole="tab" aria-selected={tab===t.id} accessibilityState={{selected:tab===t.id}} onPress={()=>chooseTab(t.id)} style={[s.tab,tab===t.id&&s.tabSelected]}>
   <Text style={[s.tabText,denseHeader&&{fontSize:18},tab===t.id&&{color:colors.brass}]}>{t.label}</Text>
  </Pressable>)}</View>;
 const narrow=width<640;
 const header=<>
  <View style={[s.header,denseHeader&&{gap:8,paddingVertical:3}]}>
   <View style={[s.brand,narrow&&{flex:1}]}>
    <View style={s.emblem}><Art art={{image:HQ_BENCH_ART}} source={source} style={{width:34,height:33}}/></View>
    <Text accessibilityRole="header" style={[s.brandTitle,{fontSize:denseHeader?22:27}]}>Headquarters</Text>
   </View>
   {!!level&&!narrow&&sectionTabs}
   {!!level&&tab!=='camp'&&<View style={s.levelBadge}><Text style={s.levelBadgeText}>Level {level}</Text></View>}
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
  return <HeadquartersOverview world={w} level={level} width={width} height={height} source={source}
   illustration={<Art art={art} source={source} style={s.orderArt}/>}
   title={title} detail={detail} cost={cost} label={label} disabled={disabled} onAction={action}
   alternative={damaged&&level===1?{label:showUpgrade?'Camp repairs':'View camp upgrade',onPress:()=>setShowUpgrade(!showUpgrade)}:undefined}/>;

 };

 const filtered=orderedCataloguePlans(w).filter(p=>(filter==='all'||(filter==='equipment'?!!p.gearId:!p.gearId))&&(levelFilter==='all'||planCampLevel(p)===levelFilter));
 const planGroups=([1,2] as const).map(tier=>({tier,items:filtered.filter(p=>planCampLevel(p)===tier)})).filter(g=>g.items.length);
 const catalogue=<View style={s.catalogueGroups}>
  {planGroups.map(({tier,items})=><View key={tier} style={s.planGroup}>
   <View style={s.levelHeading}><Text accessibilityRole="header" style={s.levelName}>Camp level {tier}</Text>
    <View style={s.levelRule}/>{level<tier&&<Text style={s.levelState}>Locked</Text>}
   </View>
   <View style={s.planGrid}>{items.map(p=><Pressable key={p.id} testID={'hq-plan-'+p.id} accessibilityRole="button"
    accessibilityLabel={'Open '+p.title+'. '+cardStatus(w,p)} onPress={()=>openPlan(p.id)}
    style={({pressed})=>[s.catalogueCard,{width:width<520?'100%':width<1000?'49%':'32.6%'},level<tier&&s.catalogueLocked,pressed&&s.pressed]}>
    <Art art={p.art} source={source} locked={level<tier} style={s.catalogueArt}/>
    <View style={s.catalogueIdentity}><Text style={s.catalogueTitle}>{p.title}</Text>
     {level>=tier&&<Text style={s.catalogueState}>{cardStatus(w,p).replace(/^✓\s*/,'')}</Text>}
    </View><Text accessible={false} style={s.catalogueChevron}>›</Text>
   </Pressable>)}</View>
  </View>)}
  {!filtered.length&&<Text style={s.muted}>No plans match these filters.</Text>}
 </View>;
 const library=<View style={[s.page,portrait&&s.portraitPage]}>
  <View style={[s.toolbar,s.catalogueToolbar]}>
   <View style={s.catalogueFilters}>{([{id:'all',label:'All'},{id:'buildings',label:'Buildings'},{id:'equipment',label:'Equipment'}] as const).map(f=>
    <Pressable key={f.id} accessibilityRole="button" aria-pressed={filter===f.id} accessibilityState={{selected:filter===f.id}}
     onPress={()=>{setFilter(f.id);setLevelMenu(false)}} style={[s.catalogueFilter,filter===f.id&&s.catalogueFilterOn]}>
     <Text style={[s.catalogueFilterText,filter===f.id&&{color:colors.text}]}>{f.label}</Text>
    </Pressable>)}</View>
   <View style={s.levelPicker}>
    <Pressable testID="hq-level-filter" accessibilityRole="button" accessibilityLabel="Filter plans by camp level" aria-expanded={levelMenu}
     accessibilityState={{expanded:levelMenu}} onPress={()=>setLevelMenu(!levelMenu)} style={s.levelTrigger}>
     <Text style={s.catalogueFilterText}>{levelFilter==='all'?'All levels':'Level '+levelFilter}  {levelMenu?'▴':'▾'}</Text>
    </Pressable>
   </View>
  </View>
    {levelMenu&&<View style={s.levelChoices}>{(['all',1,2] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityLabel={value==='all'?'Show all levels':'Show Camp level '+value}
     aria-pressed={levelFilter===value} accessibilityState={{selected:levelFilter===value}}
     onPress={()=>{pendingFocus.current='hq-level-filter';setLevelFilter(value);setLevelMenu(false)}} style={[s.levelOption,levelFilter===value&&s.levelSelected]}>
     <Text style={s.levelOptionText}>{value==='all'?'All levels':'Level '+value}</Text>{levelFilter===value&&<Text style={s.levelOptionText}>✓</Text>}
    </Pressable>)}</View>}
  {portrait?catalogue:<ScrollView key={filter+'-'+levelFilter} style={s.scroll}>{catalogue}</ScrollView>}
 </View>;

 const renderPlan=()=>{
  if(!plan)return library;
  const previous=history.current.at(-1);
  const backLabel=previous?.planId?'Back to plan':'Back to '+(previous?.tab??'plans');
  const locked=level<planCampLevel(plan),built=plan.id==='metalworking'&&(!w.progression||w.progression.furnaceRestored);
  const reinforced=plan.id==='reinforced-camp'&&w.progression?.fortified,repairs=plan.id==='shelter'&&damaged;
  const held=plan.gearId?equipmentInventory(w,plan.gearId):undefined;
  const madeHere=plan.id==='workshop'&&buildingRestored(w,'workshop')?['equipment-woodenAxe','equipment-woodenPickaxe','equipment-woodenKnife'].flatMap(id=>plans.filter(p=>p.id===id)):[];
  const workStatus=plan.id==='shelter'?buildingRepairStatus(w,'headquarters'):campWorkStatus(w,plan.id==='reinforced-camp');
  let label='',action=()=>{},disabled=false,hint='',cost:MaterialCost|undefined=plan.cost;
  if(locked){label='View camp upgrade';action=viewLevel;cost=undefined}
  else if(!plan.gearId&&plan.building!=='headquarters'&&buildingNeedsRepair(w,plan.building)){cost=buildingRepairCost(w,plan.building);disabled=!buildingPlacement(w,buildingFor(plan.building));if(w.creativeMode){label='Restore '+buildingFor(plan.building).short.toLowerCase();action=()=>{if(restoreCampBuilding(w,plan.building))changed(buildingFor(plan.building).name+' restored.');else changed(buildingRepairStatus(w,plan.building))};hint='Creative Mode · Repair this building instantly.'}else{label='Find '+buildingFor(plan.building).short.toLowerCase();action=()=>findBuilding(plan.building);hint='Equip your repair hammer and restore this existing building on site.'}}
  else if(plan.gearId&&!buildingRestored(w,'workshop')){label='View workshop repair';action=()=>openPlan('workshop','hq-plan-action');hint='Repair the workshop before crafting equipment.';cost=undefined}
  else if(plan.id==='reinforced-camp'){label=reinforced?'Camp reinforced':'Reinforce camp';disabled=workStatus!=='Ready';action=()=>{if(repairCamp(w,true))changed('Camp defences reinforced.')};hint=reinforced?'Camp defence capacity increased to 220.':workStatus==='Ready'?plan.benefit:workStatus;if(reinforced)cost=undefined}
  else if(repairs){label='Repair headquarters';disabled=workStatus!=='Ready';cost=REPAIR_CAMP_COST;action=()=>{if(restoreCampBuilding(w,'headquarters')){onChange();onClose()}};hint=workStatus==='Ready'?'Repair headquarters and defences immediately.':workStatus}
  else if(plan.id==='shelter'){label='View camp';action=()=>viewLevel();cost=undefined}
  else if((plan.gearId&&planCampLevel(plan)===2||plan.id==='furnace-bellows')&&w.progression&&!w.progression.furnaceRestored){label='View furnace plan';action=()=>openPlan('metalworking','hq-plan-action');hint='Repair the furnace with your hammer to enable this recipe.'}
  else if(w.creativeMode&&plan.id==='furnace-bellows'){const furnace=furnaces(w.layout)[0],upgraded=!!furnace&&w.ironworks?.stations[furnace.id]?.level===2;label=upgraded?'Furnace upgraded':'Upgrade furnace';disabled=!furnace||upgraded;action=()=>{if(upgradeFurnace(w))changed('Furnace upgraded to level 2.');else changed('Repair the furnace first.')};hint=upgraded?'Level 2 bellows fitted.':'Creative Mode · Instant furnace upgrade.';if(upgraded)cost=undefined}
   else if(plan.building==='garden'||plan.building==='treatment'){label='Structure repaired';disabled=true;cost=undefined;hint=plan.building==='garden'?plan.hint:'Shelter restored. Medical treatment is coming later.'}
  else {label='Mark '+buildingFor(plan.building).short.toLowerCase()+' on map';action=()=>findBuilding(plan.building);disabled=!buildingPlacement(w,buildingFor(plan.building));hint=plan.id==='furnace-bellows'?'Fit improved bellows at the furnace.':'';if(built)cost=undefined}
  return <View style={[s.page,portrait&&s.portraitPage]}>
   <View style={s.backRow}><Button testID="hq-plan-back" label={'‹  '+backLabel} onPress={back} style={s.backButton}/></View>
   <View style={[s.columns,{gap:compact?9:18},portrait&&s.stacked]}>
    {paper(<Art art={plan.art} source={source} locked={locked||plan.preview} style={{flex:1,minHeight:80,width:'100%'}}/>,[s.planHero,compact&&{padding:9},portrait&&{flexGrow:0,flexShrink:0,flexBasis:'auto',height:116}])}
    <View style={[s.planRight,portrait&&{flexGrow:0,flexShrink:0,flexBasis:'auto',minHeight:340}]}>
     <ScrollView style={s.scroll} contentContainerStyle={[s.planCopy,compact&&{gap:5}]}>
      <View style={s.detailHeading}><Text style={[s.detailTitle,compact&&{fontSize:31,lineHeight:33}]}>{plan.title}</Text></View>
      {!(tiny&&madeHere.length>0)&&<Text style={[s.copy,compact&&{fontSize:12,lineHeight:16}]}>{plan.description}</Text>}
      {locked&&<Text style={s.muted}>Requires camp level {planCampLevel(plan)}</Text>}
      {held&&(held.pack>0||held.stored>0)&&<Text style={s.muted}>Backpack {held.pack} · Storage {held.stored}</Text>}
      {!!madeHere.length&&<View testID="workshop-recipes" style={[s.madeHere,compact&&{paddingTop:7,gap:5}]}><Text style={[s.sectionTitle,compact&&s.compactSection]}>Workshop recipes</Text><View style={s.recipeRow}>{madeHere.map(p=><Pressable key={p.id} testID={'hq-plan-'+p.id} accessibilityRole="button" accessibilityLabel={'View '+p.title+' recipe'} onPress={()=>openPlan(p.id)} style={[s.recipeCard,compact&&{padding:5}]}><Art art={p.art} source={source} style={{height:tiny?42:compact?54:100,width:'100%'}}/><View style={s.unlockLabel}><Text numberOfLines={2} style={[s.recipeName,compact&&{fontSize:15,lineHeight:17}]}>{p.title}</Text><Text style={s.unlockChevron}>›</Text></View></Pressable>)}</View></View>}
      {cost&&<View style={[s.detailCost,compact&&{marginTop:3,paddingTop:7}]}>{costBlock(cost,plan.gearId?'Crafting materials':repairs||!buildingRestored(w,plan.building)?'Repair materials':plan.id==='metalworking'?'Building materials':'Upgrade materials')}</View>}
      {built&&<Pressable accessibilityRole="button" testID="hq-bellows" accessibilityLabel="View improved bellows upgrade" onPress={()=>openPlan('furnace-bellows','hq-bellows')} style={s.upgradeLink}><Text style={s.textLink}>Improved bellows upgrade ›</Text></Pressable>}
     </ScrollView>
     <View style={[s.primaryAction,compact&&{gap:4,paddingTop:5}]}><Button primary label={label} disabled={disabled} testID="hq-plan-action" onPress={action}/>{!!hint&&<Text style={s.actionHint}>{hint}</Text>}</View>
    </View>
   </View>
  </View>;
 };

 const tracked=w.progression?.trackedObjective,nextStep=journalNextStep(w,objective),completed=objectiveComplete(objective);
 const needsCampUpgrade=objective.id==='metalworking'&&nextStep?.planId==='shelter';
 const nextIsSmelting=nextStep?.planId==='metalworking'&&!!w.progression?.furnaceRestored;
 const nextAction=nextStep?.planId==='shelter'?
  (level<2&&objective.id!=='shelter'?'View camp upgrade':'View camp'):
  nextIsSmelting?'Mark furnace on map':nextStep?.planId==='metalworking'?'View furnace plan':'View plan';
 const objectiveAction=()=>{
  if(!nextStep?.planId)return;
  if(nextStep.planId==='shelter'){viewLevel();return}
  if(nextIsSmelting){findBuilding('furnace');return}
  openPlan(nextStep.planId,'hq-journal-next');
 };
 const activeStep=needsCampUpgrade?-1:objective.steps.findIndex(step=>!step.done);
 const detailCopy=<View style={s.questCopy}>
  {!portrait&&<Text accessibilityRole="header" style={s.questTitle}>{journalId==='discoveries'?'Discoveries':objective.title}</Text>}
  {journalId==='discoveries'?
   entries.length?entries.map(entry=><View key={entry.id} style={s.recordEntry}>
    <Art art={{image:entry.image}} source={source} style={s.recordArt}/>
    <View style={s.questIdentity}><Text style={s.recordTitle}>{entry.title}</Text><Text style={s.questDescription}>{entry.body}</Text></View>
   </View>):<Text style={s.questDescription}>Explore the world to record your discoveries.</Text>
  :<>
   <Text style={s.questDescription}>{objective.description}</Text>
   {needsCampUpgrade&&<View testID="journal-prerequisite" accessibilityLabel="Next step, reach camp level 2" style={[s.questStep,s.nextQuestStep]}>
    <Text style={[s.questMark,s.questCurrent]}>›</Text><Text style={[s.questStepText,s.questCurrent]}>Reach camp level 2</Text>
   </View>}
   {objective.steps.map((step,i)=><View key={step.label} accessibilityLabel={step.label+(step.done?', completed':i===activeStep?', next step':', incomplete')} style={[s.questStep,i===activeStep&&s.nextQuestStep]}>
    <Text style={[s.questMark,i===activeStep&&s.questCurrent]}>{step.done?'✓':i===activeStep?'›':'○'}</Text>
    <Text style={[s.questStepText,step.done&&s.questFinished,i===activeStep&&s.questCurrent]}>{step.label}</Text>
   </View>)}
   <View style={s.questActions}>
    {nextStep?.planId&&<Button testID="hq-journal-next" small primary label={nextAction} onPress={objectiveAction}/>}
    {w.progression&&(!completed||tracked===objective.id)&&<Button label={tracked===objective.id?'Stop tracking':'Track objective'} small onPress={()=>{if(trackObjective(w,tracked===objective.id?undefined:objective.id))changed()}}/>}
   </View>
  </>}
 </View>;
 const journalEntry=(id:JournalId|'discoveries',title:string,art:string,progress:string)=>{
  const selected=journalId===id;
  return <Pressable accessibilityRole="button" testID={'hq-journal-'+id} accessibilityLabel={id==='discoveries'?'Read camp discoveries':'Read '+title}
   aria-pressed={selected} accessibilityState={{selected}} onPress={()=>setJournalId(id)}
   style={({pressed})=>[s.questEntry,selected&&s.questSelected,pressed&&s.pressed]}>
   <Art art={{image:art}} source={source} style={s.questIcon}/>
   <View style={s.questIdentity}><Text style={s.questLabel}>{title}</Text><Text style={s.questMeta}>{progress}</Text></View>
   {selected&&<Text accessible={false} style={s.catalogueChevron}>{portrait?'⌄':'›'}</Text>}
  </Pressable>;
 };
 const entryList=<View style={s.questList}>
  {objectives.map(o=>{
   const done=o.steps.filter(step=>step.done).length;
   const progress=done===o.steps.length?'Complete':(tracked===o.id?'Tracking · ':'')+done+' / '+o.steps.length+' steps';
   return <React.Fragment key={o.id}>{journalEntry(o.id,o.title,o.image,progress)}
    {portrait&&journalId===o.id&&detailCopy}
   </React.Fragment>;
  })}
  {journalEntry('discoveries','Discoveries',HQ_BENCH_ART,entries.length+' '+(entries.length===1?'entry':'entries'))}
  {portrait&&journalId==='discoveries'&&detailCopy}
 </View>;
 const journal=portrait?entryList:<View style={s.questLayout}>
  <ScrollView style={s.questNav}>{entryList}</ScrollView>
  <ScrollView key={journalId} style={s.questPane}>{detailCopy}</ScrollView>
 </View>;

 return <View style={[s.frame,overview&&s.overviewFrame]} testID={!level?'headquarters-first-repair':undefined}>
  {header}
  {overview?campView():portrait?<ScrollView key={tab+'-'+(planId??'list')} style={s.scroll} contentContainerStyle={{padding:6,gap:8}}>{tab==='journal'?journal:plan?renderPlan():library}</ScrollView>:<View style={[s.body,compact&&{padding:6}]}>{tab==='journal'?journal:plan?renderPlan():library}</View>}
  {!!message&&<Pressable accessibilityRole="button" accessibilityLabel="Dismiss headquarters notification" onPress={()=>setMessage('')} style={s.feedback}><Text accessibilityLiveRegion="polite" style={s.feedbackText}>{message}　×</Text></Pressable>}
 </View>;
}

const s=StyleSheet.create({
 overviewFrame:{width:'100%',height:'100%',maxWidth:1220,maxHeight:770,alignSelf:'center',margin:'auto',padding:0},
 overviewScroll:{flexGrow:0,flexShrink:1,minHeight:0},
 orderArt:{width:'92%',height:'92%'},
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
 levelBadge:{justifyContent:'center',paddingHorizontal:3},levelBadgeText:{fontFamily:font,fontWeight:'700',fontSize:17,color:colors.muted},
 close:{width:44,height:44,borderWidth:1,borderColor:colors.line,borderRadius:6,alignItems:'center',justifyContent:'center',backgroundColor:colors.inset},
 closeText:{fontSize:28,lineHeight:32,fontWeight:'400',color:colors.text},
 body:{flex:1,minHeight:0,padding:10},page:{flex:1,minHeight:0,gap:8},portraitPage:{flexGrow:0,flexShrink:0,flexBasis:'auto'},columns:{flex:1,minHeight:0,flexDirection:'row',gap:12},stacked:{flexGrow:0,flexShrink:0,flexBasis:'auto',flexDirection:'column',gap:10},
 art:{position:'relative',overflow:'hidden',minWidth:0},lockedArt:{opacity:.8,...(Platform.OS==='web'?{filter:'saturate(0.6)'}:{})},scroll:{flex:1,minHeight:0},
 paper:{overflow:'hidden',borderWidth:1,borderColor:colors.line,borderRadius:6,padding:18,gap:8,backgroundColor:'#36372e'},
 levelSelected:{borderColor:'#d8c08b',backgroundColor:colors.surface,...webSurface(selectedSurface)},
 sectionTitle:{fontFamily:font,fontWeight:'800',fontSize:25,lineHeight:29,color:colors.text,letterSpacing:.5},compactSection:{fontSize:18,lineHeight:21},copy:{fontSize:15,lineHeight:21,color:colors.text},muted:{fontSize:12,lineHeight:16,color:colors.muted},
 textLink:{fontFamily:font,fontWeight:'700',fontSize:15,color:'#e4c478'},
 costHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:5},
 button:{minHeight:44,minWidth:44,paddingVertical:6,paddingHorizontal:13,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.line,borderRadius:5,backgroundColor:colors.surface},buttonText:{fontFamily:font,fontWeight:'800',fontSize:20,color:colors.text,textAlign:'center'},primary:{backgroundColor:colors.brass,borderColor:colors.brass,...webSurface(goldSurface)},primaryText:{fontSize:24,color:colors.ink},disabled:{opacity:.62},pressed:{opacity:.75},primaryAction:{paddingTop:10,gap:6,flexShrink:0},actionHint:{fontSize:11,lineHeight:14,color:colors.muted,textAlign:'center'},
 toolbar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:6,gap:8,zIndex:10},levelPicker:{position:'relative'},levelChoices:{flexDirection:'row',alignItems:'center',gap:5,paddingBottom:3},levelOption:{minHeight:44,paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderColor:'transparent',borderRadius:3},
 backRow:{minHeight:44,flexShrink:0,alignItems:'flex-start'},backButton:{borderWidth:0,backgroundColor:'transparent',paddingHorizontal:7},planHero:{flex:1,minHeight:0,alignItems:'center'},planRight:{flex:1.15,minWidth:0,minHeight:0},planCopy:{gap:12,paddingBottom:5},detailTitle:{fontFamily:font,fontWeight:'800',fontSize:51,lineHeight:55,color:colors.text},detailCost:{borderTopWidth:1,borderTopColor:'#937b4659',paddingTop:15,marginTop:5},upgradeLink:{minHeight:44,justifyContent:'center',alignSelf:'flex-start'},
 questLayout:{flex:1,minHeight:0,flexDirection:'row',gap:12},
 questNav:{flex:.8,minWidth:0},questPane:{flex:1.7,minWidth:0,backgroundColor:colors.inset,borderWidth:1,borderColor:colors.line,borderTopColor:colors.brass,borderRadius:6},
 questList:{gap:5,paddingBottom:4},questEntry:{minHeight:60,flexDirection:'row',alignItems:'center',gap:9,padding:8,borderRadius:5,borderWidth:1,borderColor:colors.line,backgroundColor:colors.surface},
 questSelected:{borderColor:colors.brass,backgroundColor:'#3b3b30'},questIcon:{width:36,height:36},questIdentity:{flex:1,minWidth:0,gap:4},
 questLabel:{fontFamily:font,fontSize:21,lineHeight:23,fontWeight:'800',color:colors.text},questMeta:{fontSize:12,lineHeight:15,color:colors.muted},
 questCopy:{gap:9,padding:12,backgroundColor:colors.inset},questTitle:{fontFamily:font,fontSize:31,lineHeight:35,fontWeight:'800',color:colors.text},
 questDescription:{fontSize:15,lineHeight:21,color:colors.muted},
 questStep:{minHeight:39,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:5,paddingHorizontal:5,borderBottomWidth:1,borderBottomColor:colors.line},
 nextQuestStep:{backgroundColor:colors.surface,borderRadius:4},questMark:{width:21,fontSize:20,color:colors.muted,textAlign:'center'},
 questStepText:{flex:1,fontSize:16,lineHeight:21,color:colors.text},questFinished:{color:colors.muted},questCurrent:{color:colors.brass,fontWeight:'700'},
 questActions:{flexDirection:'row',flexWrap:'wrap',gap:6,alignItems:'center',paddingTop:5},recordEntry:{flexDirection:'row',alignItems:'center',gap:10,paddingBottom:10,borderBottomWidth:1,borderBottomColor:colors.line},
 recordArt:{width:45,height:45},recordTitle:{fontFamily:font,fontSize:22,fontWeight:'800',color:colors.text},
 catalogueToolbar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:4,paddingVertical:2},
 catalogueFilters:{flexDirection:'row',alignItems:'center',gap:3},
 catalogueFilter:{minHeight:44,paddingHorizontal:9,justifyContent:'center',borderBottomWidth:2,borderBottomColor:'transparent'},
 catalogueFilterOn:{borderBottomColor:colors.brass},catalogueFilterText:{fontSize:14,fontWeight:'600',color:colors.muted},
 levelTrigger:{minHeight:44,paddingHorizontal:8,alignItems:'center',justifyContent:'center'},
 catalogueGroups:{gap:16,paddingBottom:10},planGroup:{gap:7},levelHeading:{flexDirection:'row',gap:12,alignItems:'center'},
 levelName:{fontFamily:font,fontSize:20,fontWeight:'700',color:colors.text},levelRule:{flex:1,height:1,backgroundColor:colors.line},levelState:{fontSize:13,color:colors.brass},
 planGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'flex-start',columnGap:'1%',rowGap:6},
 catalogueCard:{minWidth:0,minHeight:76,paddingVertical:6,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:colors.line,borderRadius:6,backgroundColor:colors.surface,...webSurface(tileSurface)},
 catalogueLocked:{backgroundColor:colors.inset,...webSurface('linear-gradient(120deg,#272c28,#202522)')},
 catalogueArt:{width:58,height:58},catalogueIdentity:{flex:1,minWidth:0,gap:3},catalogueTitle:{fontFamily:font,fontWeight:'800',fontSize:22,lineHeight:25,color:colors.text},
 catalogueState:{fontSize:13,lineHeight:16,color:colors.muted},catalogueChevron:{fontSize:24,color:colors.brass},
 levelOptionText:{fontFamily:font,fontWeight:'700',fontSize:18,color:'#e4d6b2'},
 unlockLabel:{alignSelf:'stretch',flexDirection:'row',alignItems:'center',gap:4},
 unlockChevron:{fontFamily:font,fontSize:20,lineHeight:22,color:'#a99b6c'},
 detailHeading:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:10},
 madeHere:{gap:8,paddingTop:12,borderTopWidth:1,borderTopColor:'#937b4659'},
 recipeRow:{flexDirection:'row',gap:7},
 recipeCard:{flex:1,minWidth:0,minHeight:44,padding:8,gap:5,borderWidth:1,borderColor:colors.line,borderRadius:6,backgroundColor:colors.surface,...webSurface(tileSurface)},
 recipeName:{flex:1,fontFamily:font,fontWeight:'700',fontSize:20,lineHeight:22,color:colors.text},
 feedback:{paddingHorizontal:10,paddingVertical:5,borderTopWidth:1,borderTopColor:'#9b86524d',backgroundColor:'#293f2a'},feedbackText:{fontSize:12,lineHeight:16,color:'#f3d899'},
});
