import React from 'react';
import {Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType} from 'react-native';
import {CAMP_BUILDING_IDS, CAMP_REPAIRS, campBuildingPlacements, buildingRestored, type CampBuildingId} from './camp-restoration';
import {CAMP_LEVEL_NAMES, CAMP_MILESTONES, campRequirementMet, nextCampLevel, type CampLevel} from './camp-levels';
import {costRows, campExpansionStatus, buildingRepairStatus} from './run-progression';

import type {World} from './survival-engine';
import {stationPalette as palette} from './station-palette';

type Props = {
 world: World;
 level: CampLevel;
 width: number;
 height: number;
 source: (path: string) => ImageSourcePropType;
 selectedTier?:1|2|3|4;
 onSelectTier: (tier?:1|2|3|4)=>void;
 onBuild: () => void;
 onBuilding: (id:CampBuildingId, trigger:string) => void;
 onBrowse: () => void;
};

const display = Platform.OS === 'ios' ? 'Georgia' : Platform.OS === 'web' ? 'Georgia, serif' : 'serif';
const condensed = Platform.OS === 'web' ? 'Barlow Condensed' : 'FieldKitBarlow';
const ink = '#161b19';
const brass = '#d5b67d';
const landscapeArt = '/survival/headquarters-menu-v1/camp-dawn.webp';

function Meter({label, amount, maximum, compact}: {label: string; amount: number; maximum: number; compact: boolean}) {
 const value = Math.max(0, Math.ceil(amount));
 const percent = maximum ? Math.min(100, value / maximum * 100) : 0;
 return <View style={[styles.meter, compact && styles.compactMeter]}>
  <View style={[styles.meterHeading, compact && styles.compactMeterHeading]}>
   <Text style={styles.meterLabel}>{label}</Text>
   <Text style={[styles.meterValue, compact && styles.compactMeterValue]}>{value}<Text style={styles.meterMax}> / {maximum}</Text></Text>
  </View>
  <View accessible={false} style={styles.meterTrack}>
   <View style={[styles.meterBar, {width:`${percent}%`}]} />
  </View>
 </View>;
}

export default function HeadquartersOverview({world,level,width,height,source,selectedTier,onSelectTier,onBuild,onBuilding,onBrowse}: Props) {
 const short = height < 510 && width >= height * 1.32;
 const narrow = width < 700;
 const compactStats = short || narrow;
 const night = world.phase==='night';
 const buildings = new Set(campBuildingPlacements(world.layout).map(site => site.id));
 const restored = [...buildings].filter(id => buildingRestored(world,id)).length;
 const progression = world.progression;
 const next = nextCampLevel(level);
 const selected = selectedTier ?? next ?? 4;
 const goal = CAMP_MILESTONES[selected];
 const reached = selected <= level;
 const active = selected === next;
 const status = level === 0 ? buildingRepairStatus(world,'headquarters') : campExpansionStatus(world);
 const ingredients = costRows(world,goal.cost);
 const unlocks = CAMP_BUILDING_IDS.filter(id => CAMP_REPAIRS[id].level === selected);
 const buildingLink = (id:CampBuildingId) => onBuilding(id,'hq-goal-'+id);
 const heroTitle = short ? Math.min(43, width * .05) : narrow ? Math.min(49, width * .115) : Math.min(86, width * .052);
 const campArt = <View style={[styles.hero, {minHeight:short ? 124 : narrow ? 146 : 215}]} testID="hq-camp-illustration">
  <Image accessibilityIgnoresInvertColors accessible={false} source={source(landscapeArt)} resizeMode="cover" style={[StyleSheet.absoluteFill, (night || !level) && styles.subduedArt]} />
  {(night || !level) && <View pointerEvents="none" style={[StyleSheet.absoluteFill,night?styles.nightTint:styles.ruinTint]}/>}
  <View pointerEvents="none" style={[StyleSheet.absoluteFill,styles.shading]}/>
  <View pointerEvents="none" style={[styles.corner,styles.topLeft]}/>
  <View pointerEvents="none" style={[styles.corner,styles.topRight]}/>
  <View style={[styles.heroCaption, (short || narrow) && styles.smallCaption]}>
   <View style={styles.locationLine}>
    <View style={styles.shortRule}/><Text style={styles.location}>CAMP LEVEL {level}</Text>
    {world.cycle && world.phase!=='over' && <><View style={styles.separator}/><Text style={styles.location}>{world.phase==='night'?'NIGHT':'DAY'} {world.round}</Text></>}
   </View>
   <Text accessibilityRole="header" style={[styles.tier,{fontSize:heroTitle,lineHeight:Math.ceil(heroTitle*1.1)}]}>{CAMP_LEVEL_NAMES[level]}</Text>
  </View>
 </View>;
 const conditions = <View style={[styles.conditions, compactStats && styles.compactConditions]}>
  {!compactStats && <Text style={styles.legend}>CAMP CONDITION</Text>}
  <View style={[styles.meters,compactStats && styles.metersAcross]}>
   <Meter label="Buildings restored" amount={restored} maximum={buildings.size} compact={compactStats}/>
   {progression && <Meter label="Defences" amount={progression.defence} maximum={progression.defenceMax} compact={compactStats}/>}
  </View>
 </View>;
 const order = <View style={[styles.order, !narrow && styles.wideOrder, (short || narrow) && styles.compactOrder]}>
  <View style={styles.orderLegend}><Text style={styles.legend}>CAMP PROGRESSION</Text><View style={styles.longRule}/></View>
  <View style={styles.steps}>
   {([1,2,3,4] as const).map(tier=><Pressable key={tier} accessibilityRole="button" accessibilityLabel={'View camp level '+tier}
    accessibilityState={{selected:selected===tier}} onPress={()=>onSelectTier(tier)}
    style={[styles.step,selected===tier&&styles.stepSelected]}>
    <Text style={[styles.stepText,selected===tier&&styles.stepTextSelected]}>LV {tier}</Text>
    <Text style={styles.stepState}>{tier<=level?'Reached':tier===next?'Next':'Locked'}</Text>
   </Pressable>)}
  </View>
  <Text accessibilityRole="header" style={[styles.orderTitle,(short||narrow)&&styles.smallOrderTitle]}>{CAMP_LEVEL_NAMES[selected]}</Text>
  {!reached&&<Text style={styles.note}>{selected===1?'Build headquarters with supplies from camp.':'Restore these buildings and bring the supplies to HQ.'}</Text>}
  {!!goal.requires.length&&<View style={styles.prereqs}>{goal.requires.map(id=>{
   const done=reached||campRequirementMet(world,id);
   return <Pressable key={id} testID={'hq-goal-'+id} accessibilityRole="button" accessibilityLabel={CAMP_REPAIRS[id].name+', '+(done?'requirement met':'repair required')+', view building'}
    onPress={()=>buildingLink(id)} style={[styles.requirement,done&&styles.met]}>
    <Text style={[styles.check,done&&styles.checked]}>{done?'✓':'○'}</Text>
    <Text style={styles.requirementName}>{CAMP_REPAIRS[id].name}</Text><Text style={styles.chevron}>›</Text>
   </Pressable>
  })}</View>}
  <View style={styles.costs}>{ingredients.map(row => <View key={row.id} style={styles.cost}>
   <Text style={styles.costText}>{row.needed} {row.name.toLowerCase()}</Text>
   {active&&!world.creativeMode&&<Text style={[styles.availability,row.have<row.needed&&styles.missing]}>
    {row.have<row.needed?`${row.needed-row.have} short`:'✓'}</Text>}
  </View>)}</View>
  <View style={styles.reward}><Text style={styles.legend}>OPENS FOR REPAIR</Text>
   <Text style={styles.rewardText}>{unlocks.map(id=>CAMP_REPAIRS[id].name).join('  ·  ')}</Text></View>
  {active ? <>
   {status!=='Ready'&&<Text style={styles.note}>{status}</Text>}
   <Pressable testID="hq-camp-action" accessibilityRole="button" accessibilityState={{disabled:status!=='Ready'}}
    disabled={status!=='Ready'} onPress={()=>{onBuild();onSelectTier(undefined)}}
    style={({pressed})=>[styles.primary,status!=='Ready'&&styles.disabled,pressed&&styles.pressed]}>
    <Text style={[styles.primaryText,status!=='Ready'&&styles.disabledText]}>{selected===1?'Establish camp':'Upgrade to level '+selected}</Text>
   </Pressable>
  </> : reached ? <Pressable testID="hq-camp-action" accessibilityRole="button" onPress={onBrowse} style={styles.primary}>
    <Text style={styles.primaryText}>View buildings</Text>
   </Pressable> : <Text style={styles.note}>Reach camp level {selected-1} to begin this upgrade.</Text>}
  {level>0&&progression&&(progression.hqHp<progression.hqMax||progression.defence<progression.defenceMax)&&
   <Pressable testID="hq-goal-headquarters" accessibilityRole="button" onPress={()=>buildingLink('headquarters')} style={styles.secondary}>
    <Text style={styles.secondaryText}>Repair camp damage ›</Text></Pressable>}
 </View>;
 return <ScrollView style={styles.scroller} contentContainerStyle={[styles.content,!narrow&&styles.sideBySide]}>
  <View style={[styles.landscapeHero,narrow&&styles.narrowHero]}>{campArt}{conditions}</View>{order}
 </ScrollView>;
}

const styles=StyleSheet.create({
 scroller:{flex:1,minHeight:0},
 content:{flexGrow:1,backgroundColor:ink},
 sideBySide:{flexDirection:'row'},
 landscapeHero:{flex:1,minWidth:0},
 hero:{flex:1,justifyContent:'flex-end',overflow:'hidden',backgroundColor:'#343c30',borderBottomWidth:1,borderBottomColor:'#ae8d56'},
 subduedArt:Platform.OS==='web'?{filter:'saturate(0.68)'}:{},
 nightTint:{backgroundColor:'#10243d83',backgroundImage:'linear-gradient(115deg,rgba(8,18,33,.20),rgba(24,45,74,.12) 68%,rgba(8,18,35,.3))'},
 ruinTint:{backgroundColor:'#34392c33'},
 shading:{backgroundImage:'linear-gradient(0deg, rgba(11,17,16,.91) 0%, rgba(15,19,18,.32) 30%, transparent 63%)'},
 corner:{position:'absolute',top:12,width:16,height:16,borderColor:'#d4bd8eaa',borderTopWidth:1},
 topLeft:{left:12,borderLeftWidth:1},
 topRight:{right:12,borderRightWidth:1},
 heroCaption:{paddingHorizontal:32,paddingBottom:26,gap:5},
 smallCaption:{paddingHorizontal:17,paddingBottom:12,gap:3},
 locationLine:{flexDirection:'row',alignItems:'center',gap:9},
 shortRule:{width:23,height:1,backgroundColor:brass},
 separator:{width:3,height:3,backgroundColor:brass,transform:[{rotate:'45deg'}]},
 location:{fontFamily:condensed,fontWeight:'700',fontSize:13,lineHeight:16,letterSpacing:1.9,color:'#f4dfb4'},
 tier:{fontFamily:display,color:'#fff6e3',fontWeight:'400',letterSpacing:-1.4,textShadowColor:'#0e110ec9',textShadowOffset:{width:0,height:1},textShadowRadius:5},
 narrowHero:{flex:0,flexBasis:'auto'},
 conditions:{backgroundColor:'#1b211f',padding:19,gap:14,borderBottomWidth:1,borderBottomColor:'#454a3d'},
 compactConditions:{paddingHorizontal:16,paddingVertical:10},
 legend:{fontFamily:condensed,fontWeight:'700',fontSize:13,letterSpacing:1.7,lineHeight:16,color:brass},
 meters:{gap:15},
 metersAcross:{flexDirection:'row',gap:16},
 meter:{gap:5,minWidth:0},
 compactMeter:{flex:1,gap:4},
 meterHeading:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',gap:6},
 compactMeterHeading:{flexWrap:'wrap',rowGap:0},
 meterLabel:{fontSize:14,lineHeight:18,color:palette.muted},
 meterValue:{fontFamily:condensed,fontWeight:'700',fontSize:22,lineHeight:24,color:'#f3e9cd'},
 compactMeterValue:{fontSize:16,lineHeight:19},
 meterMax:{fontSize:13,color:palette.muted},
 meterTrack:{height:3,backgroundColor:'#44473c'},
 meterBar:{height:3,backgroundColor:'#bca16c'},
 wideOrder:{flex:1.15},
 order:{flexGrow:1,minWidth:0,justifyContent:'center',padding:24,gap:12,backgroundColor:'#242820',backgroundImage:'linear-gradient(120deg,#303329,#202521 70%)'},
 steps:{flexDirection:'row',gap:4},
 step:{flex:1,alignItems:'center',justifyContent:'center',minHeight:48,gap:1,borderBottomWidth:2,borderBottomColor:'#53594e',backgroundColor:'#262d27'},
 stepSelected:{borderBottomColor:brass,backgroundColor:'#464333'},
 stepText:{fontFamily:condensed,fontSize:18,fontWeight:'800',color:palette.muted},
 stepTextSelected:{color:'#f3ddae'},
 stepState:{fontSize:11,color:palette.muted},
 prereqs:{gap:4},
 requirement:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:10,borderWidth:1,borderColor:'#696954',borderRadius:3,backgroundColor:'#292e28'},
 met:{borderColor:'#607258'},
 check:{fontSize:18,color:brass},
 checked:{color:'#b5cb94'},
 requirementName:{flex:1,fontFamily:condensed,fontSize:20,fontWeight:'700',color:palette.text},
 chevron:{color:brass,fontSize:22},
 reward:{paddingVertical:8,paddingHorizontal:10,gap:3,borderLeftWidth:2,borderLeftColor:brass,backgroundColor:'#33392e'},
 rewardText:{color:palette.text,fontSize:15,lineHeight:20},
 compactOrder:{paddingHorizontal:14,paddingVertical:12,gap:8},
 orderLegend:{flexDirection:'row',alignItems:'center',gap:10},
 longRule:{flex:1,height:1,backgroundColor:'#77705277'},
 orderTitle:{fontFamily:condensed,fontWeight:'800',fontSize:32,lineHeight:35,color:palette.text},
 smallOrderTitle:{fontSize:24,lineHeight:27},
 note:{fontSize:14,lineHeight:19,color:palette.muted},
 costs:{flexDirection:'row',flexWrap:'wrap',gap:7},
 cost:{minHeight:27,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:9,borderColor:'#777053',borderWidth:1,borderRadius:2},
 costText:{fontSize:13,lineHeight:17,color:palette.text},
 availability:{fontSize:12,lineHeight:16,color:'#ccdcab'},
 missing:{color:palette.danger},
 primary:{minHeight:44,minWidth:'48%',paddingHorizontal:17,paddingVertical:6,justifyContent:'center',alignItems:'center',borderRadius:3,borderWidth:1,borderColor:'#f2d7a3',backgroundColor:'#e3c38a',backgroundImage:'linear-gradient(110deg,#ecd5a4,#d3b579)'},
 primaryText:{fontFamily:condensed,fontWeight:'800',fontSize:20,lineHeight:25,color:palette.ink,textAlign:'center'},
 disabled:{borderColor:'#787968',backgroundColor:'#575e52',backgroundImage:'linear-gradient(110deg,#5d6357,#4c524a)'},
 disabledText:{color:'#dfdfd1'},
 pressed:{opacity:.84},
 secondary:{minHeight:44,justifyContent:'center',paddingHorizontal:8},
 secondaryText:{fontFamily:condensed,fontWeight:'700',fontSize:17,color:brass},
});
