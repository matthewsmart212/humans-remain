import React from 'react';
import {Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType} from 'react-native';
import {campBuildingPlacements, buildingRestored} from './camp-restoration';
import {CAMP_LEVEL_NAMES, type CampLevel} from './camp-levels';
import {costRows} from './run-progression';
import type {MaterialCost} from './forge-recipes';
import type {World} from './survival-engine';
import {stationPalette as palette} from './station-palette';

type Props = {
 world: World;
 level: CampLevel;
 width: number;
 height: number;
 source: (path: string) => ImageSourcePropType;
 illustration: React.ReactNode;
 title: string;
 detail: string;
 cost?: MaterialCost;
 label: string;
 disabled: boolean;
 onAction: () => void;
 alternative?: {label: string; onPress: () => void};
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

export default function HeadquartersOverview({world,level,width,height,source,illustration,title,detail,cost,label,disabled,onAction,alternative}: Props) {
 const short = height < 510 && width >= height * 1.32;
 const narrow = width < 700;
 const compactStats = short || narrow;
 const night = world.phase==='night';
 const buildings = new Set(campBuildingPlacements(world.layout).map(site => site.id));
 const restored = [...buildings].filter(id => buildingRestored(world,id)).length;
 const progression = world.progression;
 const ingredients = cost && !world.creativeMode ? costRows(world,cost) : [];
 const heroTitle = short ? Math.min(43, width * .05) : narrow ? Math.min(49, width * .115) : Math.min(86, width * .065);
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
 const order = <View style={[styles.order,(short || narrow) && styles.compactOrder, short && styles.sideOrder]}>
  <View style={styles.orderLegend}><Text style={styles.legend}>NEXT ACTION</Text><View style={styles.longRule}/></View>
  <View style={styles.orderHeading}>
   <View style={[styles.thumbnail,(short || narrow) && styles.smallThumbnail]}>
    <View style={styles.thumbnailGround}/>{illustration}
   </View>
   <View style={styles.orderCopy}>
    <Text accessibilityRole="header" style={[styles.orderTitle,(short || narrow) && styles.smallOrderTitle]}>{title}</Text>
    {!!detail && <Text style={styles.note}>{detail}</Text>}
   </View>
  </View>
  {!!ingredients.length && <View style={styles.costs}>{ingredients.map(row => <View key={row.id} style={styles.cost} accessibilityLabel={`${row.name}: ${row.have} available, ${row.needed} required`}>
   <Text style={styles.costText}>{row.needed} {row.name.toLowerCase()}</Text>
   <Text style={[styles.availability,row.have<row.needed && styles.missing]}>{row.have<row.needed?`${row.needed-row.have} short`:'✓'}</Text>
  </View>)}</View>}
  <View style={[styles.orderActions, (short||narrow) && styles.compactActions]}>
   <Pressable testID="hq-camp-action" accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onAction}
    style={({pressed})=>[styles.primary,disabled&&styles.disabled,pressed&&!disabled&&styles.pressed]}>
    <Text style={[styles.primaryText,disabled&&styles.disabledText]}>{label}</Text>
   </Pressable>
   {alternative&&<Pressable accessibilityRole="button" onPress={alternative.onPress} style={styles.secondary}><Text style={styles.secondaryText}>{alternative.label}</Text></Pressable>}
  </View>
 </View>;
 return <ScrollView style={styles.scroller} contentContainerStyle={[styles.content,short&&styles.sideBySide]}>
  {short ? <><View style={styles.landscapeHero}>{campArt}{conditions}</View>{order}</> :
   <>{campArt}<View style={[styles.board,narrow&&styles.stacked]}>{conditions}{order}</View></>}
 </ScrollView>;
}

const styles=StyleSheet.create({
 scroller:{flex:1,minHeight:0},
 content:{flexGrow:1,backgroundColor:ink},
 sideBySide:{flexDirection:'row'},
 landscapeHero:{flex:1.55,minWidth:0},
 hero:{flex:1,justifyContent:'flex-end',overflow:'hidden',backgroundColor:'#343c30',borderBottomWidth:1,borderBottomColor:'#ae8d56'},
 subduedArt:Platform.OS==='web'?{filter:'saturate(0.68)'}:{},
 nightTint:{backgroundColor:'#10243d83',backgroundImage:'linear-gradient(115deg,rgba(8,18,33,.20),rgba(24,45,74,.12) 68%,rgba(8,18,35,.3))'},
 ruinTint:{backgroundColor:'#34392c33'},
 shading:{backgroundImage:'linear-gradient(0deg, rgba(11,17,16,.91) 0%, rgba(15,19,18,.32) 30%, transparent 63%)'},
 corner:{position:'absolute',top:12,width:16,height:16,borderColor:'#d4bd8eaa',borderTopWidth:1},
 topLeft:{left:12,borderLeftWidth:1},topRight:{right:12,borderRightWidth:1},
 heroCaption:{paddingHorizontal:32,paddingBottom:26,gap:5},
 smallCaption:{paddingHorizontal:17,paddingBottom:12,gap:3},
 locationLine:{flexDirection:'row',alignItems:'center',gap:9},
 shortRule:{width:23,height:1,backgroundColor:brass},separator:{width:3,height:3,backgroundColor:brass,transform:[{rotate:'45deg'}]},
 location:{fontFamily:condensed,fontWeight:'700',fontSize:13,lineHeight:16,letterSpacing:1.9,color:'#f4dfb4'},
 tier:{fontFamily:display,color:'#fff6e3',fontWeight:'400',letterSpacing:-1.4,textShadowColor:'#0e110ec9',textShadowOffset:{width:0,height:1},textShadowRadius:5},
 board:{flexDirection:'row'},stacked:{flexDirection:'column'},
 conditions:{flex:0.8,minWidth:0,justifyContent:'center',backgroundColor:'#1b211f',padding:24,gap:18,borderRightWidth:1,borderRightColor:'#62583f'},
 compactConditions:{flexGrow:0,flexShrink:0,flexBasis:'auto',paddingHorizontal:16,paddingVertical:10,borderRightWidth:0,borderBottomWidth:1,borderBottomColor:'#454a3d'},
 legend:{fontFamily:condensed,fontWeight:'700',fontSize:13,letterSpacing:1.7,lineHeight:16,color:brass},
 meters:{gap:15},metersAcross:{flexDirection:'row',gap:16},
 meter:{gap:5,minWidth:0},compactMeter:{flex:1,gap:4},
 meterHeading:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',gap:6},compactMeterHeading:{flexWrap:'wrap',rowGap:0},
 meterLabel:{fontSize:14,lineHeight:18,color:palette.muted},meterValue:{fontFamily:condensed,fontWeight:'700',fontSize:22,lineHeight:24,color:'#f3e9cd'},
 compactMeterValue:{fontSize:16,lineHeight:19},meterMax:{fontSize:13,color:palette.muted},
 meterTrack:{height:3,backgroundColor:'#44473c'},meterBar:{height:3,backgroundColor:'#bca16c'},
 order:{flex:1.35,minWidth:0,justifyContent:'center',padding:24,gap:12,backgroundColor:'#242820',backgroundImage:'linear-gradient(120deg,#303329,#202521 70%)'},
 sideOrder:{flex:1.1},
 compactOrder:{paddingHorizontal:14,paddingVertical:12,gap:8},orderLegend:{flexDirection:'row',alignItems:'center',gap:10},
 longRule:{flex:1,height:1,backgroundColor:'#77705277'},
 orderHeading:{flexDirection:'row',gap:13,alignItems:'center'},
 thumbnail:{width:66,height:62,justifyContent:'center',alignItems:'center',backgroundColor:'#36392e',borderColor:'#a88f5c70',borderWidth:1,borderRadius:3,overflow:'hidden'},
 smallThumbnail:{width:48,height:48},
 thumbnailGround:{...StyleSheet.absoluteFill,backgroundImage:'linear-gradient(140deg,#555a44,#30362c)'},
 orderCopy:{flex:1,minWidth:0,gap:2},
 orderTitle:{fontFamily:condensed,fontWeight:'800',fontSize:32,lineHeight:35,color:palette.text},smallOrderTitle:{fontSize:24,lineHeight:27},
 note:{fontSize:14,lineHeight:19,color:palette.muted},
 costs:{flexDirection:'row',flexWrap:'wrap',gap:7},
 cost:{minHeight:27,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:9,borderColor:'#777053',borderWidth:1,borderRadius:2},
 costText:{fontSize:13,lineHeight:17,color:palette.text},availability:{fontSize:12,lineHeight:16,color:'#ccdcab'},missing:{color:palette.danger},
 orderActions:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8},compactActions:{alignItems:'stretch'},
 primary:{minHeight:44,minWidth:'48%',paddingHorizontal:17,paddingVertical:6,justifyContent:'center',alignItems:'center',borderRadius:3,borderWidth:1,borderColor:'#f2d7a3',backgroundColor:'#e3c38a',backgroundImage:'linear-gradient(110deg,#ecd5a4,#d3b579)'},
 primaryText:{fontFamily:condensed,fontWeight:'800',fontSize:20,lineHeight:25,color:palette.ink,textAlign:'center'},
 disabled:{borderColor:'#787968',backgroundColor:'#575e52',backgroundImage:'linear-gradient(110deg,#5d6357,#4c524a)'},disabledText:{color:'#dfdfd1'},pressed:{opacity:.84},
 secondary:{minHeight:44,justifyContent:'center',paddingHorizontal:8},secondaryText:{fontFamily:condensed,fontWeight:'700',fontSize:17,color:brass},
});
