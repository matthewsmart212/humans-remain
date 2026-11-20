import {useStationFeedback} from '../src/use-station-feedback';
import React,{useState} from 'react';
import {View,Text,Pressable,ScrollView,StyleSheet} from 'react-native';
import StationMenu from './StationMenu';
import {RecipeRow,StationButton,StationDetails} from './StationControls';
import {WORKSHOP_NATIVE_ART} from './workshop-animation-art';
import {BUNDLED_ART} from './bundled-art';
import {WORLD_URL} from './config';
import {ItemArt} from './FieldItemArt';
import {stationPalette as palette} from '../src/station-palette';
import {smithyView} from '../src/smithy-view';
import {smithyAction} from '../src/station-menu-model';
import type {World} from '../src/survival-engine';
import type {GearKind} from '../src/player-gear';
import type {CraftCategory} from '../src/forge-recipes';

type Props={world:World;width:number;height:number;onClose:()=>void;onChange:()=>void;safe:{top:number;bottom:number;left:number;right:number}};

export default function SmithyPanel({world,width,height,onClose,onChange,safe}:Props){
 const [category,setCategory]=useState<CraftCategory>('tools');
 const [inspection,setInspection]=useState<GearKind|null>(null);
 const [message,setMessage]=useStationFeedback();
 const v=smithyView(world);
 if(!v)return null;
 const recipes=v.recipes.filter(recipe=>recipe.category===category);
 const inspected=recipes.find(recipe=>recipe.id===inspection);
 const craft = (recipe: (typeof recipes)[number]) => {
  const result = recipe.craft();
  setMessage(result ? `${recipe.name} added to your backpack.` : 'Supplies or space changed. Check the recipe.');
  if (result) setInspection(null);
  onChange();
 };
 const closeDetails=()=>setInspection(null);
 return <StationMenu compact fitContent={!inspected} world={world} title="Workshop" image={WORKSHOP_NATIVE_ART[v.image]??BUNDLED_ART[v.image]??{uri:v.image.startsWith('/')?WORLD_URL+v.image:v.image}}
  closeLabel="Leave workshop" onClose={onClose} onBack={inspected?closeDetails:onClose}
  message={message} width={width} height={height} safe={safe}>
  <View accessibilityElementsHidden={!!inspected} importantForAccessibility={inspected?'no-hide-descendants':'auto'} style={s.tabs}>{v.categories.map(c=><Pressable key={c.id} accessibilityRole="button" accessibilityState={{selected:category===c.id}}
   onPress={()=>{setCategory(c.id);setInspection(null);setMessage('')}} style={[s.tab,category===c.id&&s.tabOn]}>
   <Text style={s.tabText}>{c.label}</Text>
  </Pressable>)}</View>
  <ScrollView key={category} nestedScrollEnabled accessibilityElementsHidden={!!inspected}
   importantForAccessibility={inspected?'no-hide-descendants':'auto'} style={s.catalog} contentContainerStyle={s.rows}>
   {recipes.map(recipe=><RecipeRow key={recipe.id} image={recipe.id} name={recipe.name} detail={recipe.costLabel}
    verb="Craft" actionLabel={`Craft ${recipe.name.toLowerCase()}`} blocked={recipe.canCraft?undefined:smithyAction(recipe)} onDetails={()=>setInspection(recipe.id)}
    onSubmit={()=>craft(recipe)}/>)}
  </ScrollView>
  {inspected&&<StationDetails title={inspected.name} closeLabel="Close item information" onClose={closeDetails}>
   <View style={s.stat}><ItemArt id={inspected.id} size={40}/><Text style={s.statText}>{inspected.stat.join(' · ')}</Text></View>
   <Text style={s.detailText}>{inspected.description}</Text>
   <Text style={s.detailText}>{Number(inspected.weight.toFixed(2))} kg{inspected.owned > 0 ? ` · ${inspected.owned} in backpack` : ''}{inspected.stored > 0 ? ` · ${inspected.stored} in storage` : ''}</Text>
   {inspected.ingredients.map(m=><Text key={m.id} style={[s.detailText,!m.enough&&s.shortfall]}>{m.name} · {m.available} / {m.needed}</Text>)}
   {!inspected.canCraft && inspected.status !== 'Need materials' && <Text style={s.shortfall}>{smithyAction(inspected)}</Text>}
   <StationButton primary label="Craft" accessibilityLabel={`Craft ${inspected.name}`} disabled={!inspected.canCraft} onPress={()=>craft(inspected)} />
  </StationDetails>}
 </StationMenu>;
}

const s=StyleSheet.create({
 tabs:{flexDirection:'row',gap:3,padding:2,borderWidth:1,borderColor:palette.line,borderRadius:6,backgroundColor:palette.inset},
 tab:{flex:1,minHeight:42,paddingHorizontal:3,justifyContent:'center',alignItems:'center',borderBottomWidth:2,borderColor:'transparent'},
 tabOn:{borderColor:palette.brass,backgroundColor:palette.surface},
 tabText:{fontSize:14,fontWeight:'600',textAlign:'center',color:palette.text},
 catalog:{flexGrow:0,flexShrink:1,minHeight:0},
 rows:{gap:6,padding:2},
 stat:{flexDirection:'row',alignItems:'center',gap:9},
 statText:{fontFamily:'FieldKitBarlow',fontSize:21,color:palette.text},
 detailText:{fontSize:14,lineHeight:19,color:palette.muted},
 shortfall:{color:palette.danger},
});
