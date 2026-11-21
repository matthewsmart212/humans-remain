import React, {useEffect, useRef, useState} from 'react';
import {
 AccessibilityInfo, Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View,
 type ImageSourcePropType,
} from 'react-native';
import {CAMP_BUILDING_IDS, CAMP_REPAIRS, buildingRestored, campBuildingPlacements, type CampBuildingId} from './camp-restoration';
import {CAMP_LEVEL_NAMES, CAMP_MILESTONES, campAccessLevel, campRequirementMet, nextCampLevel, type BuiltCampLevel, type CampLevel} from './camp-levels';
import {buildingRepairStatus, campExpansionStatus, costRows} from './run-progression';
import {buildingFor, buildingPlacement} from './headquarters-model';
import {hq, hqType, hqPrimary, hqPrimaryLabel} from './headquarters-theme';
import {ASSET_BY_ID} from './world-assets';
import {GARDEN_ART} from './camp-garden-art';
import {WAREHOUSE_ART} from './warehouse';
import type {World} from './survival-engine';

type Props = {
 world: World;
 level: CampLevel;
 width: number;
 height: number;
 source: (path: string) => ImageSourcePropType;
 selectedTier?: BuiltCampLevel;
 onSelectTier: (tier?: BuiltCampLevel) => void;
 onBuild: () => void;
 onMark: (id: CampBuildingId) => void;
 onBuilding: (id: CampBuildingId) => void;
 onBrowse: () => void;
};

const campArt = '/hq-art/camp-overlook.webp';
const hammer = '/survival/equipment/repair-hammer-v1.webp';
const supplies: Record<string, string> = {
 pallets:'/survival/ui-field-kit-v1/logs.png',
 stone:'/survival/world-rocks-v1/river-stone-trio.webp',
 scrap:'/survival/ui-backpack-v1/scrap.png',
};
const tiers = [1,2,3,4] as const;

function Lock({color}: {color: string}) {
 return <View style={s.lock} accessible={false}>
  <View style={[s.shackle,{borderColor:color}]}/>
  <View style={[s.lockBody,{backgroundColor:color}]}>
   <View style={s.keyhole}/>
  </View>
 </View>;
}

function RuleHeading({children}: {children: string}) {
 return <View style={s.sectionHeading}>
  <Text accessibilityRole="header" style={s.sectionName}>{children}</Text>
  <View style={s.rule}/>
 </View>;
}

function repairedPreview(id: CampBuildingId) {
 if(id==='garden') return GARDEN_ART[1].image;
 if(id==='warehouse') return WAREHOUSE_ART.empty;
 return ASSET_BY_ID.get(CAMP_REPAIRS[id].assetId)?.image;
}

export default function HeadquartersOverview({world, level, width, height, source, selectedTier, onSelectTier, onBuild, onMark, onBuilding, onBrowse}: Props) {
 const stacked = width < 625 || width < height * .96;
 const compact = width < 900 || height < 510;
 const next = nextCampLevel(level);
 const selected = selectedTier ?? next ?? 4;
 const goal = CAMP_MILESTONES[selected];
 const reached = selected <= level;
 const active = selected === next;
 const status = level === 0 ? buildingRepairStatus(world,'headquarters') : campExpansionStatus(world);
 const rewards = CAMP_BUILDING_IDS.filter(id=>CAMP_REPAIRS[id].level===selected);
 const rows = costRows(world,goal.cost);
 const wideMaterials = rows.length<=2 && (stacked ? width>475 : width>=1020);
 const sites = new Set(campBuildingPlacements(world.layout).map(site=>site.id));
 const restored = [...sites].filter(id=>buildingRestored(world,id)).length;
 const [achieved,setAchieved] = useState<BuiltCampLevel>();
 const celebrating = achieved === selected;
 const reveal = useRef(new Animated.Value(1)).current;
 const reduceMotion = useRef(true);
 useEffect(()=>{
  let live = true;
  void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(live) reduceMotion.current=value}).catch(()=>{});
  const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged',value=>{reduceMotion.current=value});
  return ()=>{live=false;subscription.remove();reveal.stopAnimation()};
 },[reveal]);

 const choose = (tier?: BuiltCampLevel) => {
  setAchieved(undefined);
  onSelectTier(tier);
 };
 const build = () => {
  onBuild();
  // The game owns spending and placement checks. Only an earned level gets a reveal.
  if (campAccessLevel(world)!==selected) return;
  setAchieved(selected);
  onSelectTier(selected);
  if(reduceMotion.current || world.weather?.reducedMotion) { reveal.setValue(1); return; }
  reveal.setValue(0);
  Animated.timing(reveal,{toValue:1,duration:1050,easing:Easing.out(Easing.cubic),useNativeDriver:Platform.OS!=='web'}).start();
 };

 const heroTitleSize = stacked ? Math.min(40,width*.09) : compact ? Math.min(40,width*.047) : Math.min(62,width*.046);
 const hero = <View style={[s.hero,stacked && {minHeight:Math.min(300,Math.max(218,height*.36)),flexGrow:0,flexShrink:0,flexBasis:'auto'}]} testID="hq-camp-illustration">
  <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,{transform:[{scale:reveal.interpolate({inputRange:[0,1],outputRange:[1.14,1]})}]}]}>
   <Image accessible={false} accessibilityIgnoresInvertColors source={source(campArt)} resizeMode="cover" style={s.cover}/>
  </Animated.View>
  {world.phase==='night' && <View pointerEvents="none" style={[StyleSheet.absoluteFill,s.night]}/>}
  <View pointerEvents="none" style={[StyleSheet.absoluteFill,s.heroShade]}/>
  <View style={[s.condition,compact && s.conditionCompact]}>
   <View style={s.dot}/><Text style={s.conditionText}>{restored}/{sites.size} sites restored</Text>
   {!!world.progression && <><View style={s.conditionRule}/><Text style={s.conditionText}>{Math.ceil(world.progression.defence)}/{world.progression.defenceMax} defence</Text></>}
  </View>
  <View style={[s.heroFoot,compact && s.heroFootCompact]}>
   <View style={s.eyebrowRow}><View style={s.brassDash}/><Text style={s.eyebrow}>
    {celebrating?'Milestone reached':reached?'Established milestone':active?'Next milestone':'Future milestone'}  /  Level {selected}
   </Text></View>
   <Text accessibilityRole="header" style={[s.heroTitle,{fontSize:heroTitleSize,lineHeight:Math.ceil(heroTitleSize*1.1)}]}>{CAMP_LEVEL_NAMES[selected]}</Text>
   <View style={s.track}>
    <View style={s.trackLine}><View style={[s.earnedLine,{width:`${Math.max(0,(level-1)/3)*100}%`}]}/></View>
    {tiers.map(tier=>{
     const earned=tier<=level;
     return <Pressable key={tier} accessibilityRole="button" accessibilityLabel={'View camp level '+tier} accessibilityState={{selected:selected===tier}}
      onPress={()=>choose(tier)} style={({pressed})=>[s.nodeButton,pressed && s.pressed]}>
      <View style={[s.node,earned && s.earnedNode,selected===tier && s.selectedNode]}>
       {earned ? <Text style={[s.nodeValue,{color:selected===tier?hq.ink:hq.success}]}>✓</Text> :
        tier===next ? <Text style={[s.nodeValue,{color:selected===tier?hq.ink:hq.brass}]}>{tier}</Text> : <Lock color={selected===tier?hq.ink:hq.muted}/>}
      </View>
      <Text style={[s.nodeCaption,selected===tier && s.currentCaption]}>{tier}</Text>
     </Pressable>
    })}
   </View>
  </View>
 </View>;

 const blocked = active && status!=='Ready';
 const gateHint = blocked && status!=='Need expansion materials' && !status.startsWith('Restore the ') ? status : undefined;
 const order = <View style={[s.order,compact && s.compactOrder]}>
  <View style={s.headlineRow}>
   <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={[s.headline,compact && s.smallHeadline]}>{celebrating?'Camp '+level+' reached':reached?'Camp established':selected===1?'Establish camp':'Prepare the camp'}</Text>
   <View style={s.rule}/>
  </View>
  {!reached && world.creativeMode && <Text style={s.note}>Creative mode grants this upgrade without repairs or supplies.</Text>}
  {!reached && !world.creativeMode && <View style={s.group}>
   {goal.requires.length===0 ? <View style={s.founding}>
    <Image accessible={false} source={source(hammer)} resizeMode="contain" style={s.tool}/>
    <Text style={s.foundingCopy}>Restore headquarters to open the first repair sites.</Text>
   </View> : goal.requires.map(id=>{
    const done=campRequirementMet(world,id);
    const available=!!buildingPlacement(world,buildingFor(id));
    const name=CAMP_REPAIRS[id].name;
    const canMark=active && available && !done;
    const trigger='hq-goal-'+id;
    return <Pressable key={id} testID={trigger} accessibilityRole="button"
     accessibilityLabel={canMark?'Mark '+name.toLowerCase()+' on map':name+', '+(done?'repaired':'view site')}
     onPress={()=>canMark?onMark(id):onBuilding(id)}
     style={({pressed})=>[s.requirement,done && s.done,pressed && s.pressed]}>
     {done ? <Text style={s.doneMark}>✓</Text> : <Image accessible={false} source={source(hammer)} resizeMode="contain" style={s.tool}/>}
     <Text style={[s.taskName,done && s.metText]}>{done?name+' repaired':'Repair '+(id==='fire'?'campfire':'the '+name.toLowerCase())}</Text>
     {canMark ? <View style={s.mark}><Text style={s.markText}>Mark on map  ›</Text></View> : <Text style={s.chevron}>›</Text>}
    </Pressable>;
   })}
  </View>}
  {!reached && !world.creativeMode && <View style={s.group}>
   <RuleHeading>Bring to headquarters</RuleHeading>
   <View style={s.supplies}>{rows.map(row=>{
    const enough=row.have>=row.needed;
    const count=<Text style={[s.count,{color:enough?hq.success:hq.danger}]}>{row.have}<Text style={s.total}>/{row.needed}</Text></Text>;
    return <View key={row.id} accessible accessibilityLabel={`${row.name}, ${row.have} available, ${row.needed} required`} style={s.material}>
     <View style={s.materialRow}>
      {!!supplies[row.id] && <Image accessible={false} resizeMode="contain" source={source(supplies[row.id])} style={[s.resourceArt,wideMaterials && s.largeResourceArt]}/>}
      <Text style={[s.materialName,wideMaterials && s.wideMaterialName]}>{row.name}</Text>
      {wideMaterials && count}
     </View>
     {!wideMaterials && count}
     <View style={s.capacity}><View style={[s.capacityFill,{width:`${Math.min(row.have/row.needed,1)*100}%`,backgroundColor:enough?hq.success:hq.brass}]}/></View>
    </View>;
   })}</View>
  </View>}
  <Animated.View style={[s.rewardGroup,celebrating && {opacity:reveal.interpolate({inputRange:[0,.35,1],outputRange:[.5,.75,1]})}]}>
   <Text style={[s.eyebrow,s.rewardLabel]}>{celebrating?'New repair access':reached?'Repair access unlocked':'Opens for repair'}</Text>
   <View style={s.rewards}>{rewards.map(id=>{
    const preview=repairedPreview(id);
    const trigger='hq-reward-'+id;
    return <Pressable key={id} testID={trigger} accessibilityRole="button" accessibilityLabel={'View '+CAMP_REPAIRS[id].name}
     onPress={()=>onBuilding(id)} style={({pressed})=>[s.reward,pressed && s.pressed]}>
     {preview && <Image accessible={false} source={source(preview)} resizeMode="contain" style={[s.rewardArt,compact && s.compactRewardArt]}/>}
     <Text style={s.rewardName}>{CAMP_REPAIRS[id].name}</Text>
     {!world.creativeMode && !reached && <View style={[s.seal,s.lockedSeal]}><Lock color={hq.muted}/></View>}
     {celebrating && <View style={[s.seal,s.unlockedSeal]}><Image accessible={false} source={source(hammer)} style={s.sealArt}/></View>}
    </Pressable>;
   })}</View>
  </Animated.View>
  {gateHint && <Text style={s.note}>{gateHint}</Text>}
  {active ? <Pressable testID="hq-camp-action" accessibilityRole="button" disabled={blocked} accessibilityState={{disabled:blocked}}
    onPress={build} style={({pressed})=>[s.action,blocked && s.blocked,pressed && s.pressed]}>
    <Text style={[s.actionText,blocked && s.blockedText]}>{selected===1?'Establish camp':'Upgrade to level '+selected}</Text>
    {blocked?<Lock color={hq.muted}/>:<Text style={s.actionText}>›</Text>}
   </Pressable> : reached ? <Pressable testID="hq-camp-action" accessibilityRole="button" onPress={()=>celebrating && next ? choose(next) : onBrowse()} style={({pressed})=>[s.action,pressed && s.pressed]}>
    <Text style={s.actionText}>{celebrating && next?'Next milestone':'View buildings'}</Text><Text style={s.actionText}>›</Text>
   </Pressable> : <Text style={s.note}>Reach camp level {selected-1} to begin this upgrade.</Text>}
  {level>0 && world.progression && (world.progression.hqHp<world.progression.hqMax || world.progression.defence<world.progression.defenceMax) &&
   <Pressable testID="hq-goal-headquarters" accessibilityRole="button" onPress={()=>onBuilding('headquarters')} style={({pressed})=>[s.damage,pressed && s.pressed]}>
    <Text style={s.markText}>Repair camp damage  ›</Text>
   </Pressable>}
 </View>;

 return stacked ? <ScrollView style={s.scroll} contentContainerStyle={s.vertical}>{hero}{order}</ScrollView> :
  <View style={s.split}>{hero}<ScrollView style={s.ledger} contentContainerStyle={s.ledgerContent}>{order}</ScrollView></View>;
}

const s=StyleSheet.create({
 split:{flex:1,minHeight:0,flexDirection:'row',backgroundColor:hq.panel},
 scroll:{flex:1,minHeight:0,backgroundColor:hq.panel},
 vertical:{flexGrow:1},
 ledger:{flex:1,minHeight:0,minWidth:0,borderLeftColor:hq.line,borderLeftWidth:1},
 ledgerContent:{flexGrow:1},
 hero:{flex:1.13,minWidth:0,overflow:'hidden',position:'relative',backgroundColor:hq.inset,justifyContent:'flex-end'},
 cover:{width:'100%',height:'100%'},
 night:{backgroundColor:'#172e4b60'},
 heroShade:{...(Platform.OS==='web'?{backgroundImage:`linear-gradient(180deg,#05191b33,transparent 22%,transparent 40%,#05191b82 65%,${hq.inset} 100%)`}:{})},
 condition:{position:'absolute',top:18,left:20,alignItems:'center',flexDirection:'row',gap:8,paddingHorizontal:11,paddingVertical:5,borderWidth:1,borderColor:hq.edge,backgroundColor:hq.inset,borderRadius:7},
 conditionCompact:{top:10,left:12},
 conditionText:{color:hq.text,fontFamily:hqType.label,fontWeight:'700',fontSize:12,letterSpacing:.65,textTransform:'uppercase'},
 conditionRule:{width:1,height:11,backgroundColor:hq.line},
 dot:{width:6,height:6,borderRadius:3,backgroundColor:hq.success},
 heroFoot:{gap:7,paddingHorizontal:30,paddingTop:14,paddingBottom:22,...(Platform.OS==='web'?{}:{backgroundColor:'#071b1de6'})},
 heroFootCompact:{paddingHorizontal:18,paddingBottom:12,gap:4},
 eyebrowRow:{alignItems:'center',flexDirection:'row',gap:9},
 brassDash:{height:2,width:24,backgroundColor:hq.brass},
 eyebrow:{fontFamily:hqType.label,fontWeight:'800',fontSize:13,lineHeight:18,letterSpacing:1.7,color:hq.brass,textTransform:'uppercase'},
 heroTitle:{color:hq.text,fontFamily:hqType.display,letterSpacing:.4,textShadowColor:'#031719',textShadowOffset:{width:0,height:2},textShadowRadius:4},
 track:{marginTop:6,height:58,flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',paddingHorizontal:1},
 trackLine:{position:'absolute',height:3,left:25,right:25,top:19,backgroundColor:hq.line},
 earnedLine:{height:3,backgroundColor:hq.success},
 nodeButton:{minWidth:46,minHeight:54,alignItems:'center',justifyContent:'flex-start',gap:2},
 node:{width:37,height:37,borderRadius:20,borderWidth:2,borderColor:hq.line,backgroundColor:hq.inset,alignItems:'center',justifyContent:'center'},
 earnedNode:{borderColor:hq.success,backgroundColor:hq.panel},
 selectedNode:{borderColor:hq.brass,backgroundColor:hq.parchment},
 nodeValue:{fontFamily:hqType.label,fontWeight:'800',fontSize:23,lineHeight:27},
 nodeCaption:{fontFamily:hqType.label,fontWeight:'800',fontSize:14,color:hq.text},
 currentCaption:{color:hq.brass},
 lock:{width:13,height:16,justifyContent:'flex-end',alignItems:'center'},
 shackle:{position:'absolute',top:1,width:9,height:10,borderWidth:1.7,borderRadius:5},
 lockBody:{width:13,height:9,borderRadius:2,alignItems:'center',justifyContent:'center'},
 keyhole:{width:2,height:4,borderRadius:1,backgroundColor:hq.line},
 order:{flexGrow:1,padding:25,gap:16,justifyContent:'center',backgroundColor:hq.panel,
  ...(Platform.OS==='web'?{backgroundImage:`radial-gradient(ellipse at 100% 4%,${hq.surface},transparent 68%)`}:{})},
 compactOrder:{padding:14,gap:10},
 headlineRow:{flexDirection:'row',alignItems:'center',gap:13},
 headline:{fontFamily:hqType.display,fontSize:29,lineHeight:36,letterSpacing:.4,color:hq.text,flexShrink:1},
 smallHeadline:{fontSize:24,lineHeight:30},
 rule:{height:1,flexGrow:1,backgroundColor:hq.line},
 group:{gap:7},
 sectionHeading:{flexDirection:'row',alignItems:'center',gap:11},
 sectionName:{fontFamily:hqType.label,fontWeight:'800',fontSize:20,lineHeight:24,letterSpacing:.85,color:hq.text,textTransform:'uppercase',flexShrink:1},
 requirement:{minHeight:49,flexDirection:'row',gap:8,alignItems:'center',paddingHorizontal:9,paddingVertical:4,borderWidth:1,borderColor:hq.edge,borderRadius:7,backgroundColor:hq.surface},
 done:{borderColor:hq.line,backgroundColor:hq.inset},
 tool:{width:30,height:31},
 doneMark:{width:30,textAlign:'center',fontSize:24,fontWeight:'800',color:hq.success},
 taskName:{flex:1,minWidth:0,fontFamily:hqType.label,fontWeight:'800',fontSize:20,lineHeight:23,color:hq.text,letterSpacing:.2},
 metText:{color:hq.success},
 founding:{gap:10,flexDirection:'row',alignItems:'center',borderLeftWidth:2,borderLeftColor:hq.brass,paddingVertical:6,paddingHorizontal:10,backgroundColor:hq.surface},
 foundingCopy:{flex:1,fontFamily:hqType.body,fontSize:16,lineHeight:21,color:hq.text},
 mark:{borderWidth:1,borderColor:hq.edge,borderRadius:5,paddingHorizontal:9,paddingVertical:6,backgroundColor:hq.inset},
 markText:{fontFamily:hqType.label,fontWeight:'800',color:hq.brass,fontSize:15,lineHeight:19,letterSpacing:.55,textTransform:'uppercase'},
 chevron:{fontSize:21,color:hq.brass},
 supplies:{flexDirection:'row',flexWrap:'wrap',gap:6},
 material:{minWidth:76,flex:1,gap:3,borderWidth:1,borderColor:hq.line,borderRadius:7,paddingHorizontal:9,paddingVertical:6,backgroundColor:hq.inset,overflow:'hidden'},
 materialRow:{flexDirection:'row',alignItems:'center',gap:7},
 resourceArt:{width:29,height:25},
 largeResourceArt:{width:42,height:38},
 wideMaterialName:{flex:1,fontSize:20,lineHeight:24},
 materialName:{flexShrink:1,fontFamily:hqType.label,fontSize:17,lineHeight:19,fontWeight:'800',letterSpacing:.5,color:hq.text,textTransform:'uppercase'},
 count:{fontFamily:hqType.label,fontWeight:'800',fontSize:27,lineHeight:30,fontVariant:['tabular-nums']},
 total:{fontFamily:hqType.label,color:hq.muted,fontSize:20},
 capacity:{height:3,backgroundColor:hq.line,borderRadius:2,overflow:'hidden'},
 capacityFill:{height:3},
 rewardGroup:{borderWidth:1,borderColor:hq.edge,backgroundColor:hq.surface,paddingHorizontal:12,paddingVertical:9,borderRadius:8},
 rewardLabel:{fontSize:14,letterSpacing:1.5},
 rewards:{flexDirection:'row',gap:9},
 reward:{flex:1,minWidth:0,minHeight:59,flexDirection:'row',alignItems:'center',gap:5},
 rewardArt:{width:'42%',maxWidth:88,height:70},
 compactRewardArt:{height:48},
 rewardName:{flex:1,fontFamily:hqType.label,fontSize:20,lineHeight:22,fontWeight:'800',color:hq.text},
 seal:{position:'absolute',left:0,bottom:2,width:21,height:21,borderRadius:11,borderWidth:1,alignItems:'center',justifyContent:'center'},
 lockedSeal:{borderColor:hq.line,backgroundColor:hq.inset},
 unlockedSeal:{borderColor:hq.brass,backgroundColor:hq.selected},
 sealArt:{width:15,height:15},
 action:{...hqPrimary,minHeight:44,paddingHorizontal:14,paddingVertical:6,alignItems:'center',justifyContent:'space-between',flexDirection:'row'},
 actionText:{...hqPrimaryLabel,fontSize:19,lineHeight:24,flexShrink:1},
 blocked:{backgroundColor:hq.inset,borderColor:hq.line,...(Platform.OS==='web'?{backgroundImage:'none'}:{})},
 blockedText:{color:hq.muted},
 note:{fontFamily:hqType.body,fontSize:14,lineHeight:19,color:hq.muted},
 damage:{minHeight:44,justifyContent:'center',alignItems:'center',borderBottomWidth:1,borderBottomColor:hq.line},
 pressed:{opacity:.82},
});
