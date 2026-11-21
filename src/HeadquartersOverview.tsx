import React, {useEffect, useRef, useState} from 'react';
import {
 AccessibilityInfo, Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View,
 type ImageSourcePropType,
} from 'react-native';
import {CAMP_BUILDING_IDS, CAMP_REPAIRS, buildingRestored, campBuildingPlacements, type CampBuildingId} from './camp-restoration';
import {CAMP_LEVEL_NAMES, CAMP_MILESTONES, campAccessLevel, campRequirementMet, nextCampLevel, type BuiltCampLevel, type CampLevel} from './camp-levels';
import {buildingRepairStatus, campExpansionStatus, costRows} from './run-progression';
import {buildingFor, buildingPlacement} from './headquarters-model';
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
const heading = Platform.OS === 'web' ? 'Barlow Condensed' : 'FieldKitBarlow';
const bodyFont = Platform.OS === 'web' ? 'Barlow' : undefined;
const serif = Platform.OS === 'web' ? 'Georgia, serif' : Platform.OS === 'ios' ? 'Georgia' : 'serif';
const amber = '#ffb65c';
const bone = '#f9ecd1';
const sage = '#b4cc87';
const accent = '#c89655';
const muted = '#c4bca6';
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

 const heroTitleSize = stacked ? Math.min(44,width*.107) : compact ? Math.min(48,width*.055) : Math.min(76,width*.054);
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
   <View style={s.eyebrowRow}><View style={s.amberDash}/><Text style={s.eyebrow}>
    {celebrating?'Milestone reached':reached?'Established milestone':active?'Next milestone':'Future milestone'}  /  Level {selected}
   </Text></View>
   <Text accessibilityRole="header" style={[s.heroTitle,{fontSize:heroTitleSize,lineHeight:Math.ceil(heroTitleSize*1.1)}]}>{CAMP_LEVEL_NAMES[selected]}</Text>
   <View style={s.track}>
    <View style={s.trackLine}><View style={[s.earnedLine,{width:`${Math.max(0,(level-1)/3)*100}%`}]}/></View>
    {tiers.map(tier=>{
     const earned=tier<=level;
     return <Pressable key={tier} accessibilityRole="button" accessibilityLabel={'View camp level '+tier} accessibilityState={{selected:selected===tier}}
      onPress={()=>choose(tier)} style={s.nodeButton}>
      <View style={[s.node,earned && s.earnedNode,selected===tier && s.selectedNode]}>
       {earned ? <Text style={[s.nodeValue,{color:selected===tier?amber:sage}]}>✓</Text> :
        tier===next ? <Text style={[s.nodeValue,{color:amber}]}>{tier}</Text> : <Lock color={selected===tier?amber:'#b2b2a2'}/>}
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
    const count=<Text style={[s.count,{color:enough?sage:amber}]}>{row.have}<Text style={s.total}>/{row.needed}</Text></Text>;
    return <View key={row.id} accessible accessibilityLabel={`${row.name}, ${row.have} available, ${row.needed} required`} style={s.material}>
     <View style={s.materialRow}>
      {!!supplies[row.id] && <Image accessible={false} resizeMode="contain" source={source(supplies[row.id])} style={[s.resourceArt,wideMaterials && s.largeResourceArt]}/>}
      <Text style={[s.materialName,wideMaterials && s.wideMaterialName]}>{row.name}</Text>
      {wideMaterials && count}
     </View>
     {!wideMaterials && count}
     <View style={s.capacity}><View style={[s.capacityFill,{width:`${Math.min(row.have/row.needed,1)*100}%`,backgroundColor:enough?sage:accent}]}/></View>
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
     {!world.creativeMode && !reached && <View style={[s.seal,s.lockedSeal]}><Lock color="#c9c5af"/></View>}
     {celebrating && <View style={[s.seal,s.unlockedSeal]}><Image accessible={false} source={source(hammer)} style={s.sealArt}/></View>}
    </Pressable>;
   })}</View>
  </Animated.View>
  {gateHint && <Text style={s.note}>{gateHint}</Text>}
  {active ? <Pressable testID="hq-camp-action" accessibilityRole="button" disabled={blocked} accessibilityState={{disabled:blocked}}
    onPress={build} style={({pressed})=>[s.action,blocked && s.blocked,pressed && s.pressed]}>
    <Text style={[s.actionText,blocked && s.blockedText]}>{selected===1?'Establish camp':'Upgrade to level '+selected}</Text>
    {blocked?<Lock color="#aaa991"/>:<Text style={s.actionText}>›</Text>}
   </Pressable> : reached ? <Pressable testID="hq-camp-action" accessibilityRole="button" onPress={()=>celebrating && next ? choose(next) : onBrowse()} style={s.action}>
    <Text style={s.actionText}>{celebrating && next?'Next milestone':'View buildings'}</Text><Text style={s.actionText}>›</Text>
   </Pressable> : <Text style={s.note}>Reach camp level {selected-1} to begin this upgrade.</Text>}
  {level>0 && world.progression && (world.progression.hqHp<world.progression.hqMax || world.progression.defence<world.progression.defenceMax) &&
   <Pressable testID="hq-goal-headquarters" accessibilityRole="button" onPress={()=>onBuilding('headquarters')} style={s.damage}>
    <Text style={s.markText}>Repair camp damage  ›</Text>
   </Pressable>}
 </View>;

 return stacked ? <ScrollView style={s.scroll} contentContainerStyle={s.vertical}>{hero}{order}</ScrollView> :
  <View style={s.split}>{hero}<ScrollView style={s.ledger} contentContainerStyle={s.ledgerContent}>{order}</ScrollView></View>;
}

const s=StyleSheet.create({
 split:{flex:1,minHeight:0,flexDirection:'row',backgroundColor:'#171e19'},
 scroll:{flex:1,minHeight:0,backgroundColor:'#171e19'},
 vertical:{flexGrow:1},
 ledger:{flex:1,minHeight:0,minWidth:0,borderLeftColor:'#6f6449',borderLeftWidth:1},
 ledgerContent:{flexGrow:1},
 hero:{flex:1.13,minWidth:0,overflow:'hidden',position:'relative',backgroundColor:'#2e3328',justifyContent:'flex-end'},
 cover:{width:'100%',height:'100%'},
 night:{backgroundColor:'#172e4b60'},
 heroShade:{...(Platform.OS==='web'?{backgroundImage:'linear-gradient(180deg,rgba(9,17,16,.32) 0%,transparent 20%,transparent 42%,rgba(12,20,17,.44) 62%,#101910 102%)'}:{})},
 condition:{position:'absolute',top:18,left:20,alignItems:'center',flexDirection:'row',gap:8,paddingHorizontal:10,paddingVertical:5,borderWidth:1,borderColor:'#b195635c',backgroundColor:'#121c16df',borderRadius:2},
 conditionCompact:{top:10,left:12},
 conditionText:{color:'#e2d8be',fontFamily:heading,fontWeight:'700',fontSize:12,letterSpacing:.65,textTransform:'uppercase'},
 conditionRule:{width:1,height:11,backgroundColor:'#9b8d6d'},
 dot:{width:6,height:6,borderRadius:3,backgroundColor:sage},
 heroFoot:{gap:7,paddingHorizontal:30,paddingTop:14,paddingBottom:22,...(Platform.OS==='web'?{}:{backgroundColor:'#101a15db'})},
 heroFootCompact:{paddingHorizontal:18,paddingBottom:12,gap:4},
 eyebrowRow:{alignItems:'center',flexDirection:'row',gap:9},
 amberDash:{height:2,width:24,backgroundColor:amber},
 eyebrow:{fontFamily:heading,fontWeight:'800',fontSize:13,lineHeight:18,letterSpacing:1.7,color:'#f8d99b',textTransform:'uppercase'},
 heroTitle:{color:bone,fontFamily:serif,letterSpacing:-1.5,fontWeight:'400',textShadowColor:'#06100dd9',textShadowOffset:{width:0,height:2},textShadowRadius:6},
 track:{marginTop:6,height:58,flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',paddingHorizontal:1},
 trackLine:{position:'absolute',height:3,left:25,right:25,top:19,backgroundColor:'#817d65'},
 earnedLine:{height:3,backgroundColor:'#bfd194'},
 nodeButton:{minWidth:46,minHeight:54,alignItems:'center',justifyContent:'flex-start',gap:2},
 node:{width:37,height:37,borderRadius:20,borderWidth:2,borderColor:'#8e8e7d',backgroundColor:'#1b241dea',alignItems:'center',justifyContent:'center'},
 earnedNode:{borderColor:sage,backgroundColor:'#344031'},
 selectedNode:{borderColor:amber,backgroundColor:'#422f1e',...(Platform.OS==='web'?{boxShadow:'0 0 12px #f99e3a85'}:{})},
 nodeValue:{fontFamily:heading,fontWeight:'800',fontSize:23,lineHeight:27},
 nodeCaption:{fontFamily:heading,fontWeight:'800',fontSize:14,color:'#d9d5bd'},
 currentCaption:{color:amber},
 lock:{width:13,height:16,justifyContent:'flex-end',alignItems:'center'},
 shackle:{position:'absolute',top:1,width:9,height:10,borderWidth:1.7,borderRadius:5},
 lockBody:{width:13,height:9,borderRadius:2,alignItems:'center',justifyContent:'center'},
 keyhole:{width:2,height:4,borderRadius:1,backgroundColor:'#2c302a'},
 order:{flexGrow:1,padding:25,gap:16,justifyContent:'center',backgroundColor:'#1a221c',
  ...(Platform.OS==='web'?{backgroundImage:'radial-gradient(ellipse at 100% 4%, #303729 0%, transparent 67%), linear-gradient(120deg,#222b21,#151c18)'}:{})},
 compactOrder:{padding:14,gap:10},
 headlineRow:{flexDirection:'row',alignItems:'center',gap:13},
 headline:{fontFamily:heading,fontSize:35,lineHeight:39,fontWeight:'800',letterSpacing:.45,color:bone,textTransform:'uppercase',flexShrink:1},
 smallHeadline:{fontSize:28,lineHeight:30},
 rule:{height:1,flexGrow:1,backgroundColor:'#947d4b8c'},
 group:{gap:7},
 sectionHeading:{flexDirection:'row',alignItems:'center',gap:11},
 sectionName:{fontFamily:heading,fontWeight:'800',fontSize:22,lineHeight:26,letterSpacing:.85,color:bone,textTransform:'uppercase'},
 requirement:{minHeight:49,flexDirection:'row',gap:8,alignItems:'center',paddingHorizontal:9,paddingVertical:4,borderWidth:1,borderColor:'#967645',borderRadius:3,backgroundColor:'#303428'},
 done:{borderColor:'#69765586',backgroundColor:'#263026'},
 tool:{width:30,height:31},
 doneMark:{width:30,textAlign:'center',fontSize:24,fontWeight:'800',color:sage},
 taskName:{flex:1,minWidth:0,fontFamily:heading,fontWeight:'800',fontSize:22,lineHeight:24,color:bone,textTransform:'uppercase',letterSpacing:.2},
 metText:{color:'#b7c5a6'},
 founding:{gap:10,flexDirection:'row',alignItems:'center',borderLeftWidth:2,borderLeftColor:accent,paddingVertical:6,paddingHorizontal:10,backgroundColor:'#2a3026'},
 foundingCopy:{flex:1,fontFamily:bodyFont,fontSize:16,lineHeight:21,color:bone},
 mark:{borderWidth:1,borderColor:'#dc9047',borderRadius:3,paddingHorizontal:9,paddingVertical:6,backgroundColor:'#9a471c',...(Platform.OS==='web'?{backgroundImage:'linear-gradient(#a95c28,#833918)'}:{})},
 markText:{fontFamily:heading,fontWeight:'800',color:bone,fontSize:16,lineHeight:19,letterSpacing:.55,textTransform:'uppercase'},
 chevron:{fontSize:21,color:'#b4b999'},
 supplies:{flexDirection:'row',flexWrap:'wrap',gap:6},
 material:{minWidth:76,flex:1,gap:3,borderWidth:1,borderColor:'#70704e',borderRadius:3,paddingHorizontal:9,paddingVertical:6,backgroundColor:'#263024',overflow:'hidden'},
 materialRow:{flexDirection:'row',alignItems:'center',gap:7},
 resourceArt:{width:29,height:25},
 largeResourceArt:{width:42,height:38},
 wideMaterialName:{flex:1,fontSize:22,lineHeight:24},
 materialName:{flexShrink:1,fontFamily:heading,fontSize:17,lineHeight:19,fontWeight:'800',letterSpacing:.5,color:bone,textTransform:'uppercase'},
 count:{fontFamily:heading,fontWeight:'800',fontSize:27,lineHeight:30},
 total:{fontFamily:heading,color:'#ccc9ad',fontSize:20},
 capacity:{height:2,backgroundColor:'#575943'},
 capacityFill:{height:2},
 rewardGroup:{borderWidth:1,borderColor:'#8c7445',backgroundColor:'#2b3023',paddingHorizontal:11,paddingVertical:8,borderRadius:3},
 rewardLabel:{fontSize:14,letterSpacing:1.5},
 rewards:{flexDirection:'row',gap:9},
 reward:{flex:1,minWidth:0,minHeight:59,flexDirection:'row',alignItems:'center',gap:5},
 rewardArt:{width:'42%',maxWidth:88,height:70},
 compactRewardArt:{height:48},
 rewardName:{flex:1,fontFamily:heading,fontSize:20,lineHeight:22,fontWeight:'800',color:bone,textTransform:'uppercase'},
 seal:{position:'absolute',left:0,bottom:2,width:21,height:21,borderRadius:11,borderWidth:1,alignItems:'center',justifyContent:'center'},
 lockedSeal:{borderColor:'#888876',backgroundColor:'#262c23'},
 unlockedSeal:{borderColor:amber,backgroundColor:'#5e3b1c'},
 sealArt:{width:15,height:15},
 action:{minHeight:44,borderWidth:1,borderColor:'#dc9a56',borderRadius:3,paddingHorizontal:14,paddingVertical:6,alignItems:'center',justifyContent:'space-between',flexDirection:'row',backgroundColor:'#a45121',...(Platform.OS==='web'?{backgroundImage:'linear-gradient(100deg,#ad5623,#93411b)'}:{})},
 actionText:{fontFamily:heading,fontWeight:'800',fontSize:19,lineHeight:22,letterSpacing:.8,color:bone,textTransform:'uppercase'},
 blocked:{backgroundColor:'#242b23',borderColor:'#666951',...(Platform.OS==='web'?{backgroundImage:'none'}:{})},
 blockedText:{color:'#b4b5a0'},
 note:{fontFamily:bodyFont,fontSize:14,lineHeight:18,color:muted},
 damage:{minHeight:44,justifyContent:'center',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#6e6240'},
 pressed:{opacity:.82},
});
