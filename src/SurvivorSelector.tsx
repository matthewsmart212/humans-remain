import React from 'react';
import {Image,Pressable,StyleSheet,Text,View,type ImageSourcePropType} from 'react-native';
import {SURVIVOR_ROLES,survivorRole,type SurvivorRoleId} from './survivor-roles';
type Props={selected:SurvivorRoleId;onSelect:(id:SurvivorRoleId)=>void;portrait:ImageSourcePropType};
export default function SurvivorSelector({selected,onSelect,portrait}:Props){
 const current=survivorRole(selected);
 return <View style={s.root}>
  <Text style={s.heading}>SELECT CHARACTER</Text>
  <View accessibilityRole="radiogroup" style={s.grid}>
   {SURVIVOR_ROLES.map(role=>{
    const active=selected===role.id;
    return <Pressable key={role.id} accessibilityRole="radio" accessibilityLabel={role.label+', '+role.subtitle} accessibilityState={{selected:active}} onPress={()=>onSelect(role.id)} style={({pressed})=>[s.card,active&&s.active,pressed&&s.pressed]}>
     <View style={s.cardTop}>
      {role.id==='survivor'?<Image accessible={false} source={portrait} resizeMode="contain" style={s.portrait}/>:<View style={s.glyphBox}><Text style={s.glyph}>{role.glyph}</Text></View>}
      <View style={s.cardIdentity}><Text style={s.roleTitle}>{role.label.toUpperCase()}</Text><Text style={s.roleSubtitle}>{role.subtitle}</Text></View>
      {active&&<Text style={s.check}>✓</Text>}
     </View>
     <Text style={s.statPreview}>{role.health} HP     {role.stamina} STAMINA</Text>
    </Pressable>;
   })}
  </View>
  <View style={s.details}>
   <Text style={s.detailsHeading}>{current.label.toUpperCase()} · STATS PREVIEW</Text>
   <Text style={s.description}>{current.description}</Text>
   <View style={s.statGrid}>
    <Text style={s.statLine}>Health  {current.health}</Text>
    <Text style={s.statLine}>Stamina  {current.stamina}</Text>
    <Text style={s.statLine}>Gathering  {current.gathering}/5</Text>
    <Text style={s.statLine}>Support  {current.support}/5</Text>
   </View>
  </View>
  <Text style={s.footnote}>This saves your character choice. Alternate in-game sprites and stat effects will be added separately.</Text>
 </View>;
}
const s=StyleSheet.create({
 root:{gap:12},heading:{color:'#e6c997',fontSize:11,letterSpacing:2,fontWeight:'700'},
 grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',rowGap:10},
 card:{width:'48.5%',minHeight:105,borderWidth:1,borderColor:'#6c6b58',borderRadius:9,backgroundColor:'#092426',padding:10,justifyContent:'space-between',gap:8},
 active:{borderColor:'#f1b65f',borderWidth:2,backgroundColor:'#23403a'},pressed:{opacity:.8},
 cardTop:{flexDirection:'row',alignItems:'center',gap:8},
 portrait:{width:42,height:53},glyphBox:{width:42,height:53,borderWidth:1,borderColor:'#bc945e',borderRadius:8,backgroundColor:'#1b3c3d',alignItems:'center',justifyContent:'center'},
 glyph:{color:'#f7cd8e',fontSize:28,fontWeight:'700'},cardIdentity:{flex:1,flexShrink:1,gap:3},
 roleTitle:{color:'#f4e1bf',fontSize:14,fontWeight:'900'},roleSubtitle:{color:'#b8c4b7',fontSize:11},
 check:{color:'#f9c377',fontWeight:'900',fontSize:17,alignSelf:'flex-start'},
 statPreview:{color:'#eacb95',fontSize:11,fontWeight:'700'},
 details:{padding:12,gap:9,borderWidth:1,borderColor:'#99836366',backgroundColor:'#071d1eaa',borderRadius:8},
 detailsHeading:{color:'#e9c58b',fontWeight:'900',fontSize:13,letterSpacing:1},
 description:{color:'#d8d4bf',fontSize:13,lineHeight:19},
 statGrid:{flexDirection:'row',flexWrap:'wrap',gap:7,justifyContent:'space-between'},
 statLine:{color:'#f4e0bc',fontSize:12,minWidth:'44%'},
 footnote:{color:'#aeb6a9',fontSize:12,lineHeight:17}
});
