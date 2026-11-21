import React, {useState} from 'react';
import {Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType, type ViewStyle} from 'react-native';
import {campRecipes, type CampRecipe, type RecipeStation} from './camp-recipes';
import {FURNACE_COLD_IMAGE} from './furnace-animation-art';
import {GARDEN_ART} from './camp-garden-art';
import {HQ_PAPER} from './headquarters-model';
import {hq, hqType, hqPrimary, hqPrimaryLabel} from './headquarters-theme';
import type {World} from './survival-engine';

type Props = {
 world: World;
 width: number;
 height: number;
 source: (path: string) => ImageSourcePropType;
 onMark: (id: RecipeStation) => void;
 initialStation?: RecipeStation;
};
type Station = ReturnType<typeof campRecipes>[number];
const art = {fire: '/survival/camp-hearth-v4/flame-0.webp', garden: GARDEN_ART[1].image, furnace: FURNACE_COLD_IMAGE};
const kitchen = '/hq-art/fire-kitchen.webp';

function MarkStation({station,onMark}:{station:Station;onMark:Props['onMark']}) {
 return <View style={s.actionBar}>
   <Pressable disabled={!station.placed} accessibilityState={{disabled:!station.placed}} accessibilityRole="button"
    testID="hq-crafting-mark" onPress={()=>onMark(station.id)} style={({pressed})=>[s.mark,!station.placed&&s.disabled,pressed&&s.pressed]}>
    <View accessible={false} style={s.pin}><View style={s.pinHole}/></View>
    <Text style={s.markText}>Mark {station.name.toLowerCase()}</Text>
   </Pressable>
 </View>;
}

function RecipeDetail({recipe, station, height, source}: Pick<Props,'height'|'source'> & {recipe: CampRecipe; station: Station}) {
 const cooking = station.id === 'fire';
 return <View style={s.detail}>
  <View style={[s.illustration,{height:Math.max(105,Math.min(320,height*.34))}]}>
   <Image accessible={false} source={source(cooking ? kitchen : HQ_PAPER)} resizeMode="cover" style={[s.fill, !cooking && {opacity:.24}]}/>
   {!cooking && <Image accessible={false} source={source(art[station.id])} resizeMode="contain" style={s.displayArt}/>}
   <View style={s.vignette}/>
   <View style={s.heroCaption}>
    <Text style={s.kicker}>{recipe.status}</Text>
    <Text accessibilityRole="header" style={[s.recipeTitle,height<480 && {fontSize:23,lineHeight:29}]}>{recipe.name}</Text>
   </View>
  </View>
  <View style={s.ledger}>
   <View style={s.ingredientHeading}><Text style={s.kicker}>Ingredients</Text><View style={s.rule}/><Text style={s.small}>{station.packOnly?'Backpack':'Backpack + stores'}</Text></View>
   {recipe.ingredients.map(row=>
    <View key={row.name} style={s.fact} accessibilityLabel={row.name + ', ' + row.have + ' on hand, ' + row.need + ' needed'}>
     <Image accessible={false} source={source(row.art)} resizeMode="contain" style={s.ingredientIcon}/>
     <Text style={s.factLabel}>{row.name}</Text><Text style={[s.quantity,row.have>=row.need && s.enough]}>{row.have} / {row.need}</Text>
    </View>)}
   <View style={s.result}><Text style={s.method}>{recipe.method}</Text><Text style={s.small}>{recipe.result}</Text></View>
   {!station.lock && <Text style={s.condition}>{station.condition}</Text>}
  </View>
 </View>;
}

export default function HeadquartersCrafting({world,width,height,source,onMark,initialStation='fire'}: Props) {
 const [stationId,setStation] = useState<RecipeStation>(initialStation);
 const [selected,setSelected] = useState<string | null>();
 const [readyOnly,setReadyOnly] = useState(false);
 const groups = campRecipes(world);
 const station = groups.find(group=>group.id===stationId)!;
 const rows = station.recipes.filter(recipe=>!readyOnly || recipe.ready);
 const narrow = width < 670, short = height < 490;
 const current = rows.find(row=>row.id===selected) ?? rows[0];
 const detail = current && <RecipeDetail recipe={current} station={station} height={height} source={source}/>;
 return <View testID="hq-crafting-list" style={s.page}>
  <View accessibilityRole="tablist" accessibilityLabel="Crafting stations" style={s.stationRail}>
   {groups.map(group=><Pressable key={group.id} accessibilityRole="tab" aria-selected={stationId===group.id}
    accessibilityState={{selected:stationId===group.id}} accessibilityLabel={group.name+', '+(group.lock || group.condition)} testID={'hq-station-'+group.id}
    onPress={()=>{setStation(group.id);setSelected(undefined)}} style={({pressed})=>[s.station,stationId===group.id && s.stationSelected,pressed && s.pressed]}>
    {width>=440 && <Image accessible={false} source={source(art[group.id])} resizeMode="contain" style={[s.stationIcon,short&&{height:35}]}/>}
    {!!group.lock && <View accessible={false} style={s.lock}><View style={s.shackle}/><View style={s.lockBody}/></View>}
    <Text style={[s.stationName,stationId===group.id && s.gold,narrow&&{fontSize:16}]}>{group.name}</Text>
   </Pressable>)}
  </View>
  <View style={s.columns}>
   <ScrollView key={stationId} style={[s.list,narrow&&{flex:1}]} contentContainerStyle={[s.listContent,short&&{padding:10,gap:7}]}>
    <View style={s.listHeading}>
     <Text accessibilityRole="header" style={[s.heading,short&&{fontSize:21}]}>{station.id==='garden'?'Planting':station.name+' recipes'}</Text>
     <View style={s.rule}/>
     <Pressable testID="hq-ready-toggle" accessibilityRole="checkbox" accessibilityLabel="Ready now" accessibilityState={{checked:readyOnly}}
      aria-checked={readyOnly} onPress={()=>setReadyOnly(!readyOnly)} style={({pressed})=>[s.toggle,pressed&&s.pressed]}>
      <View style={[s.checkbox,readyOnly&&s.checked]}>{readyOnly && <Text style={s.tick}>✓</Text>}</View><Text style={s.toggleLabel}>Ready now</Text>
     </Pressable>
    </View>
    {rows.map(row=>{
     const active = current?.id===row.id && (!narrow || selected!==null);
     return <View key={row.id}>
      <Pressable testID={'hq-recipe-'+row.id} accessibilityRole="button" accessibilityState={{selected:active}}
       accessibilityLabel={[row.name,row.method,row.status].join(', ')} onPress={()=>setSelected(narrow && active ? null : row.id)}
       style={({pressed})=>[s.card,{minHeight:short?59:narrow?75:Math.min(109,Math.max(80,(height-220)/4-10))},active&&s.current,pressed&&s.pressed]}>
       <Image accessible={false} source={source(row.art)} resizeMode="contain" style={[s.food,short&&{width:49,height:44}]}/>
       <View style={s.identity}>
        <Text style={[s.cardTitle,short&&{fontSize:20}]}>{row.name}</Text>
        <Text style={s.small}>{row.method}</Text>
       </View><Text accessible={false} style={[s.chevron,active&&s.gold]}>{narrow&&active?'⌄':'›'}</Text>
      </Pressable>
      {narrow && active && <>{detail}<MarkStation station={station} onMark={onMark}/></>}
     </View>;
    })}
    {rows.length===0 && <View style={s.empty}><Text style={s.cardTitle}>No recipes ready</Text>
     <Text style={s.small}>{station.lock || 'Show all recipes to check the ingredients and station requirements.'}</Text>
     <Pressable accessibilityRole="button" onPress={()=>setReadyOnly(false)} style={({pressed})=>[s.showAll,pressed&&s.pressed]}><Text style={s.toggleLabel}>Show all recipes</Text></Pressable>
    </View>}
   </ScrollView>
   {!narrow && <View style={s.detailColumn}>
    <ScrollView key={current?.id ?? 'empty'} style={s.detailScroll} contentContainerStyle={s.detailContent}>
    {detail || <View style={s.idleScene}>
     <Image accessible={false} resizeMode={stationId==='fire'?'cover':'contain'} source={source(stationId==='fire'?kitchen:art[stationId])} style={[s.fill,{opacity:.55}]}/>
    </View>}
    </ScrollView>
    {current && <MarkStation station={station} onMark={onMark}/>}
   </View>}
  </View>
 </View>;
}

const gradient = (value:string): ViewStyle => Platform.OS==='web' ? {backgroundImage:value} : {};
const s = StyleSheet.create({
 page:{flex:1,minHeight:0,backgroundColor:hq.inset},
 stationRail:{flexDirection:'row',backgroundColor:hq.panel,borderBottomWidth:1,borderBottomColor:hq.edge},
 station:{flex:1,minWidth:0,minHeight:46,paddingVertical:3,paddingHorizontal:4,gap:6,flexDirection:'row',alignItems:'center',justifyContent:'center',borderRightWidth:1,borderRightColor:hq.line,borderBottomWidth:3,borderBottomColor:'transparent'},
 lock:{width:10,height:16,justifyContent:'flex-end',alignItems:'center'},shackle:{width:8,height:8,borderWidth:1.5,borderColor:hq.muted,borderTopLeftRadius:4,borderTopRightRadius:4,marginBottom:-2},lockBody:{width:10,height:8,borderRadius:1,backgroundColor:hq.muted},
 stationSelected:{backgroundColor:hq.selected,borderBottomColor:hq.brass},
 stationName:{flexShrink:1,fontFamily:hqType.label,fontWeight:'700',fontSize:21,textAlign:'center',color:hq.muted},stationIcon:{width:52,height:48},
 columns:{flex:1,minHeight:0,flexDirection:'row'},list:{flex:.96,minWidth:0,minHeight:0},listContent:{padding:18,gap:10},
 listHeading:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},
 heading:{fontFamily:hqType.label,fontWeight:'800',fontSize:26,lineHeight:30,color:hq.text,textTransform:'uppercase'},rule:{flex:1,minWidth:4,height:1,backgroundColor:hq.line},
 toggle:{minHeight:44,flexDirection:'row',gap:6,alignItems:'center',paddingHorizontal:5},
 toggleLabel:{fontFamily:hqType.label,fontWeight:'700',fontSize:17,color:hq.text},checkbox:{width:18,height:18,borderColor:hq.edge,borderWidth:1,borderRadius:2,alignItems:'center',justifyContent:'center',backgroundColor:hq.inset},
 checked:{backgroundColor:hq.success,borderColor:hq.success},tick:{color:hq.ink,fontWeight:'bold',fontSize:15,lineHeight:17},
 card:{minHeight:80,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:10,paddingVertical:5,borderRadius:6,borderColor:hq.line,borderWidth:1,borderLeftWidth:3,backgroundColor:hq.surface},
 current:{borderColor:hq.brass,backgroundColor:hq.selected},
 food:{width:70,height:60},identity:{flex:1,minWidth:0,gap:2},cardTitle:{fontFamily:hqType.label,fontSize:25,fontWeight:'800',color:hq.text,textTransform:'uppercase'},
 small:{fontFamily:hqType.body,fontSize:13,lineHeight:18,color:hq.muted},chevron:{fontSize:26,color:hq.muted},gold:{color:hq.brass},
 empty:{padding:16,borderWidth:1,borderColor:hq.line,gap:8},showAll:{alignSelf:'flex-start',justifyContent:'center',minHeight:44,paddingHorizontal:12,borderWidth:1,borderColor:hq.edge,borderRadius:6,backgroundColor:hq.surface},
 detailColumn:{flex:1,minHeight:0,minWidth:0,borderLeftWidth:1,borderColor:hq.line,backgroundColor:hq.panel},
 detailScroll:{flex:1,minHeight:0},
 detailContent:{flexGrow:1},detail:{flexGrow:1,backgroundColor:hq.panel},idleScene:{flex:1,minHeight:180},
 illustration:{flexGrow:1,backgroundColor:hq.surface,overflow:'hidden',justifyContent:'flex-end'},fill:{position:'absolute',top:0,left:0,width:'100%',height:'100%'},
 displayArt:{position:'absolute',top:'-3%',left:0,width:'100%',height:'100%'},
 vignette:{position:'absolute',bottom:0,left:0,right:0,height:'78%',backgroundColor:Platform.OS==='web'?'transparent':'#071b1dbf',...gradient('linear-gradient(0deg,'+hq.panel+' 0%,rgba(7,27,29,.86) 38%,transparent 100%)')},
 heroCaption:{paddingHorizontal:18,paddingVertical:8},kicker:{fontFamily:hqType.label,fontSize:15,lineHeight:18,letterSpacing:1.3,fontWeight:'700',textTransform:'uppercase',color:hq.brass},
 recipeTitle:{fontFamily:hqType.display,fontSize:28,lineHeight:34,textTransform:'uppercase',color:hq.text},
 ledger:{paddingHorizontal:18,paddingTop:8,paddingBottom:9,gap:6},ingredientHeading:{flexDirection:'row',alignItems:'center',gap:8},
 fact:{minHeight:34,borderBottomWidth:1,borderBottomColor:hq.line,flexDirection:'row',alignItems:'center',gap:9},
 ingredientIcon:{width:31,height:28},factLabel:{fontFamily:hqType.body,flex:1,minWidth:0,fontSize:15,color:hq.text},quantity:{fontFamily:hqType.label,fontSize:20,fontWeight:'700',color:hq.danger},enough:{color:hq.success},
 result:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:5},method:{color:hq.text,fontFamily:hqType.label,fontSize:18,fontWeight:'700'},
 condition:{fontFamily:hqType.body,fontSize:13,color:hq.muted,lineHeight:18},
 actionBar:{paddingHorizontal:10,paddingVertical:6,borderTopWidth:1,borderTopColor:hq.line,backgroundColor:hq.panel},
 mark:{minHeight:46,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,paddingVertical:6,paddingHorizontal:8,...hqPrimary},
 markText:{...hqPrimaryLabel,fontSize:21,lineHeight:26,flexShrink:1,textAlign:'center'},pin:{width:15,height:15,alignItems:'center',justifyContent:'center',borderRadius:9,borderBottomRightRadius:1,transform:[{rotate:'45deg'}],backgroundColor:hq.ink},pinHole:{width:5,height:5,borderRadius:4,backgroundColor:hq.parchment},
 disabled:{opacity:.5},pressed:{opacity:.8}
});
