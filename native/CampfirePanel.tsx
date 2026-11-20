import {stationPalette as palette} from '../src/station-palette';
import React,{useEffect,useState} from 'react';
import {View,Text,Pressable,ScrollView,StyleSheet} from 'react-native';
import {campfireView} from '../src/campfire-view';
import {campfireFoodSelection,queueCampfireFood} from '../src/campfire-menu';
import type {FoodSpecies} from '../src/food-items';
import {SectionHeading, FuelMeter, QuantityControl, StationButton} from './StationControls';
import StationMenu,{stationMenuLayout} from './StationMenu';
import {ItemArt} from './InventoryUI';
import {packLoad} from '../src/expedition-inventory';
import type {World} from '../src/survival-engine';

const foodIds={chicken:{raw:'raw',cooked:'meal'},rabbit:{raw:'rabbitRaw',cooked:'rabbitMeal'},venison:{raw:'venisonRaw',cooked:'venisonMeal'}} as const;
const rawName=(name:string)=>`Raw ${name.toLowerCase()}`;
const cookedName=(name:string)=>`Cooked ${name.toLowerCase()}`;
const rows=<T,>(items:T[],columns:number)=>Array.from({length:Math.ceil(items.length/columns)},(_,i)=>items.slice(i*columns,(i+1)*columns));
type Props={world:World;width:number;height:number;safe:{top:number;bottom:number;left:number;right:number};onClose:()=>void;onChange:()=>void};

export default function CampfirePanel({world,width,height,safe,onClose,onChange}:Props){
 const [selected,setSelected]=useState<FoodSpecies|null>(null),[quantity,setQuantity]=useState(1),[message,setMessage]=useState(''),[more,setMore]=useState<'food'|'meal'|null>(null);
 const v=campfireView(world),load=packLoad(world),owned=v.food.filter(item=>item.count>0),jobs=v.jobs.filter(job=>job!==null);
 const {food,limit,amount,blocked}=campfireFoodSelection(v,selected,quantity);
 const p=stationMenuLayout(width,height,safe).panel,short=p.height<430,narrow=p.width<360,quiet=!owned.length&&!jobs.length;
 const jobColumns=p.width>=440?4:2;
 useEffect(()=>{if(selected&&!food){setSelected(null);setQuantity(1);if(more==='food')setMore(null)}},[selected,food?.species,more]);
 useEffect(()=>{if(more==='meal'&&!v.preparedMeal.count)setMore(null)},[more,v.preparedMeal.count]);
 const act=(run:()=>boolean|number,text:string)=>{setMessage(run()?text:'Supplies or backpack space changed.');onChange()};
 const choose=(species:FoodSpecies)=>{setSelected(species);setQuantity(1);setMessage('');setMore(null)};
 const add=()=>{
  if(!food||!amount)return;
  const count=queueCampfireFood(world,food.species,amount);
  setMessage(count?`${count} ${count===1?'portion':'portions'} added to the fire${world.camp.hearth.fuel>0?'.':' · add wood to cook.'}`:'Supplies or fire space changed.');
  setQuantity(1);setMore(null);
  if(!campfireView(world).food.some(item=>item.species===food.species&&item.count>0))setSelected(null);
  onChange();
 };
 const prepare=()=>{if(v.preparedMeal.prepare()){setMessage('Hunter’s meal added to your backpack.');setMore(null)}else setMessage('Supplies or backpack space changed.');onChange()};
 const fuelLabel=!v.logs?'Need wood':!v.canStoke?'Fire full':'Add wood';
 const selectionHint=food?(blocked||(!v.burning?(v.incoming?'Lighting…':'Add wood to cook'):`Bag ${food.count}`)):'';
 const jobLabel=(label:string)=>label==='NO HEAT'?(v.incoming?'Lighting…':'Needs wood'):label==='WAIT'?'Waiting':`${label} left`;

 return <StationMenu compact fitContent={quiet&&!more} world={world} title="Campfire" label="Tend the campfire" image={require('../public/survival/ui-field-kit-v1/cook.png')} closeLabel="Leave campfire" onClose={onClose} onBack={more ? () => setMore(null) : onClose} weight={load.weight} loadLabel={load.label} message={message} width={width} height={height} safe={safe} footerAction={v.preparedMeal.count>0?<Pressable accessibilityRole="button" accessibilityLabel="Prepare a meal" accessibilityState={{expanded:more==='meal'}} onPress={()=>setMore(more==='meal'?null:'meal')} style={n.mealLink}><Text style={n.mealLinkText}>Prepare meal</Text></Pressable>:undefined}>
  <ScrollView nestedScrollEnabled style={[n.scroll,quiet&&!more&&{flexGrow:0}]} contentContainerStyle={[n.body,{gap:short?6:9}]} accessibilityElementsHidden={!!more} importantForAccessibility={more?'no-hide-descendants':'auto'}>
   <View style={[n.fuel,{padding:short?6:8,gap:short?6:8}]}><ItemArt id="logs" size={short?28:36}/><View style={{flex:1,minWidth:0}}><Text style={[n.fuelTitle,{fontSize:short?16:18}]}>{v.burning?`Fire ${v.time}`:v.incoming?'Lighting…':'Fire out'}</Text><FuelMeter label="Fire fuel remaining" amount={Math.ceil(v.fuel*v.fuelMax)} max={v.fuelMax}/></View><StationButton label={v.canStoke ? `Add wood (${v.logs})` : fuelLabel} accessibilityLabel={`Add wood. ${v.packLogs} in backpack, ${v.storedLogs} in camp. One log adds 90 seconds`} disabled={!v.canStoke} onPress={()=>act(v.stoke,'Added a log · +90s fire.')}/></View>
   <View style={{gap:short?4:6}}><SectionHeading title="In your backpack" info={owned.length?'Raw food':''}/>
    {owned.length?<View style={n.inventory}>{owned.map(item=><Pressable key={item.species} accessibilityRole="button" accessibilityLabel={`Select ${rawName(item.name)}. ${item.count} in backpack`} accessibilityState={{selected:selected===item.species}} onPress={()=>choose(item.species)} style={[n.foodTile,{minHeight:short?60:88,paddingVertical:short?5:8},selected===item.species&&n.foodTileOn]}><ItemArt id={foodIds[item.species].raw} size={short?28:42}/><Text numberOfLines={2} style={[n.foodName,{fontSize:narrow?12:short?14:17}]}>{rawName(item.name)}</Text><Text style={n.count}>×{item.count}</Text></Pressable>)}</View>:<View style={[n.empty,{paddingVertical:short?12:20}]}><Text style={n.emptyTitle}>No raw food in your backpack</Text><Text style={n.emptyHint}>Bring raw food here to cook.</Text></View>}
   </View>
   <Text style={n.emptyHint}>Cooked food lands on the ground. Close this menu to collect it.</Text>
   {(jobs.length>0)&&<View style={[n.status,{gap:short?6:9}]}>
    {jobs.length>0&&<View style={n.statusColumn}><SectionHeading title="Cooking" info={`${jobs.length} / ${v.queueMax}`}/>{rows(jobs,jobColumns).map((row,index)=><View key={index} style={n.statusRow}>{row.map(job=><Pressable key={job.id} accessibilityRole="button" accessibilityLabel={`Cancel ${rawName(job.name)}, ${jobLabel(job.label)}. Return raw food to backpack`} accessibilityState={{disabled:!job.canReturn}} disabled={!job.canReturn} onPress={()=>act(job.remove,'Raw food returned to your backpack.')} style={[n.job,job.active&&n.jobActive,!job.canReturn&&n.disabled]}><View style={[n.row,{gap:4,paddingRight:12}]}><ItemArt id={foodIds[job.species].raw} size={short?20:26}/><Text numberOfLines={1} style={[n.jobTitle,{fontSize:narrow?11:13}]}>{job.name}</Text></View><Text numberOfLines={1} style={[n.jobState,job.label==='NO HEAT'&&n.warning]}>{jobLabel(job.label)}</Text><Text accessibilityElementsHidden importantForAccessibility="no" style={n.cancel}>×</Text><FuelMeter amount={Math.round(job.progress*100)} max={100} label={`${job.name} cooking progress`}/></Pressable>)}</View>)}</View>}
   </View>}
  </ScrollView>
  {owned.length>0&&<View style={n.transfer} accessibilityElementsHidden={!!more} importantForAccessibility={more?'no-hide-descendants':'auto'}>
   <View style={n.selection}>{food?<><ItemArt id={foodIds[food.species].raw} size={22}/><Text numberOfLines={1} style={n.selectedName}>{rawName(food.name)}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${rawName(food.name)} information`} accessibilityState={{expanded:more==='food'}} onPress={()=>setMore(more==='food'?null:'food')} hitSlop={5} style={n.infoButton}><Text style={n.infoGlyph}>i</Text></Pressable><Text accessibilityLiveRegion="polite" numberOfLines={2} style={[n.selectionHint,(!v.burning||!!blocked)&&n.warning]}>{selectionHint}</Text></>:<Text style={n.prompt}>Select food to add to the fire</Text>}</View>
   <View style={[n.actions,{gap:narrow?4:5}]}>
    <QuantityControl amount={amount} limit={limit} onChange={setQuantity} />
    <StationButton grow primary label={food && !limit ? 'Fire full' : food ? `Add to fire ×${amount}` : 'Add to fire'}
     accessibilityLabel={food ? `Add ${amount} ${rawName(food.name).toLowerCase()} to the fire${blocked ? `. ${blocked}` : ''}` : 'Select raw food to add to the fire'}
     disabled={!food || !limit} onPress={add} />
   </View>
  </View>}
  {more&&<View style={n.overlay}><Pressable accessible={false} onPress={()=>setMore(null)} style={StyleSheet.absoluteFill}/><View accessibilityViewIsModal accessibilityLabel={more==='food'&&food?`${rawName(food.name)} information`:'Prepare a meal'} onAccessibilityEscape={()=>setMore(null)} style={n.popover}><View style={n.popoverHeader}><Text style={n.popoverTitle}>{more==='food'&&food?rawName(food.name):'Hunter’s meal'}</Text><StationButton label="×" accessibilityLabel="Close food information" onPress={()=>setMore(null)}/></View><ScrollView contentContainerStyle={n.popoverBody}>{more==='food'&&food?<><View style={n.row}><ItemArt id={foodIds[food.species].cooked} size={40}/><Text style={n.description}>Makes 1 {cookedName(food.name).toLowerCase()} in {food.seconds}s.</Text></View><Text style={n.description}>After cooking: +{food.food} food{food.health>0?` · +${food.health} health`:''}.</Text><Text style={n.description}>Food cooks automatically while the fire has fuel, then hops onto the ground. Close this menu and collect it. If the fire goes out, cooking pauses safely.</Text></>:more==='meal'?<><View style={n.row}><ItemArt id="huntersMeal" size={44}/><Text style={n.description}>1 cooked meat + 2 berries</Text></View><Text style={n.description}>+{v.preparedMeal.food} food · +{v.preparedMeal.healthOverTime} health over {v.preparedMeal.duration}s.</Text><StationButton primary label={v.preparedMeal.canPrepare?'Prepare meal':v.preparedMeal.actionLabel==='PACK FULL'?'Backpack full':!v.preparedMeal.count?'Need ingredients':'Wait a moment'} accessibilityLabel="Prepare Hunter’s meal" disabled={!v.preparedMeal.canPrepare} onPress={prepare}/></>:null}</ScrollView></View></View>}
 </StationMenu>;
}

const n=StyleSheet.create({
 scroll:{minHeight:0,flexGrow:1,flexShrink:1},
 body:{padding:1},
 row:{flexDirection:'row',alignItems:'center',gap:7},
 fuel:{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:palette.line,borderRadius:8,backgroundColor:palette.surface},
 fuelTitle:{fontFamily:'FieldKitBarlow',color:palette.text},
 inventory:{flexDirection:'row',gap:6},
 foodTile:{position:'relative',flex:1,minWidth:0,alignItems:'center',justifyContent:'center',gap:3,paddingHorizontal:5,borderWidth:1,borderBottomWidth:2,borderColor:palette.line,borderBottomColor:palette.line,borderRadius:8,backgroundColor:palette.surface},
 foodTileOn:{borderColor:palette.brass,borderBottomColor:palette.brass,backgroundColor:palette.line},
 foodName:{fontFamily:'FieldKitBarlow',color:palette.text,textAlign:'center'},
 count:{position:'absolute',top:4,right:4,paddingHorizontal:4,paddingVertical:2,fontSize:10,fontWeight:'700',color:palette.text,borderRadius:4,backgroundColor:palette.inset},
 empty:{alignItems:'center',justifyContent:'center',gap:5,paddingHorizontal:10,borderWidth:1,borderStyle:'dashed',borderColor:palette.line,borderRadius:8,backgroundColor:palette.inset},
 emptyTitle:{fontFamily:'FieldKitBarlow',fontSize:19,color:palette.muted,textAlign:'center'},
 emptyHint:{fontSize:11,lineHeight:15,color:palette.muted,textAlign:'center'},
 status:{flexDirection:'row',alignItems:'flex-start'},
 statusColumn:{flex:1,minWidth:0,gap:4},
 statusRow:{flexDirection:'row',gap:4},
 job:{position:'relative',flex:1,minWidth:0,minHeight:50,gap:3,padding:5,borderWidth:1,borderColor:palette.line,borderRadius:6,backgroundColor:palette.surface},
 jobActive:{borderColor:palette.brass},
 jobTitle:{fontFamily:'FieldKitBarlow',fontSize:13,color:palette.text,flexShrink:1},
 jobState:{fontSize:9,lineHeight:11,color:palette.muted},
 cancel:{position:'absolute',top:2,right:4,fontSize:16,color:palette.text},
 warning:{color:palette.danger},
 disabled:{opacity:.55},
 transfer:{flexShrink:0,borderTopWidth:1,borderTopColor:palette.line,paddingTop:4,gap:3},
 selection:{minHeight:25,flexDirection:'row',alignItems:'center',gap:4},
 selectedName:{fontFamily:'FieldKitBarlow',fontSize:17,color:palette.text,flexShrink:1},
 infoButton:{width:25,height:25,alignItems:'center',justifyContent:'center'},
 infoGlyph:{fontFamily:'Georgia',fontSize:17,fontWeight:'900',color:palette.brass},
 selectionHint:{marginLeft:'auto',fontSize:10,color:palette.muted,textAlign:'right',flexShrink:1},
 prompt:{fontSize:11,color:palette.muted},
 actions:{flexDirection:'row',alignItems:'stretch'},
 mealLink:{minHeight:30,justifyContent:'center'},
 mealLinkText:{fontSize:13,color:palette.brass},
 overlay:{...StyleSheet.absoluteFill,backgroundColor:'rgba(8,12,10,.72)',padding:7,alignItems:'center',justifyContent:'center',borderRadius:8,zIndex:5},
 popover:{width:'100%',maxWidth:440,maxHeight:'100%',padding:12,borderWidth:1,borderColor:palette.line,borderRadius:10,backgroundColor:palette.panel},
 popoverHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:7,paddingBottom:6,borderBottomWidth:1,borderBottomColor:palette.line},
 popoverTitle:{fontFamily:'FieldKitBarlow',fontSize:22,color:palette.text,flex:1},
 popoverBody:{gap:10,paddingTop:10},
 description:{fontSize:12,lineHeight:17,color:palette.muted,flexShrink:1},
});
