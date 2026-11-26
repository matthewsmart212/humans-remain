import React from 'react';
import {Image,ImageBackground,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {World} from '../src/survival-engine';
import type {MenuInsets} from '../src/station-menu-layout';
import {fieldNoteDestination,markFieldNote} from '../src/patch-field-notes';
import {patchEvidence} from '../src/patch-evidence';
import StationMenu from './StationMenu';

const dispatch=require('../public/survival/patch-v5/dispatch-slip.webp');
const plate=require('../public/survival/patch-v5/drive-rubbing.webp');
const paper=require('../public/survival/patch-v3/letter.webp');
type Props={world:World;width:number;height:number;safe:MenuInsets;onClose:()=>void};

export function PatchEvidencePanel({world,onClose,...frame}:Props){
 const clue=patchEvidence(world),lead=fieldNoteDestination(world);
 const art=world.patchQuest?.haulerInspected?plate:dispatch;
 return <StationMenu {...frame} compact presentation="letter" world={world} title={clue.title} image={art} closeLabel="Close inspection" onClose={onClose}
  footerAction={<View style={s.actions}>
   {lead&&<Pressable accessibilityRole="button" style={s.button} onPress={()=>{markFieldNote(world);onClose()}}><Text style={s.ink}>Mark {lead.label.toLowerCase()}</Text></Pressable>}
   <Pressable accessibilityRole="button" style={s.button} onPress={onClose}><Text style={s.ink}>Back to the trail</Text></Pressable>
  </View>}>
  <ScrollView style={s.scroll}><ImageBackground source={paper} resizeMode="stretch" style={s.paper}>
   <Text style={s.legend}>{clue.provenance}</Text>
   <View style={s.content}><Image source={art} resizeMode="contain" style={{width:Math.min(144,frame.width*.22),height:116}}/>
    <View style={s.copy}><Text style={s.body}>{clue.text}</Text>
     <Text style={s.caption}>{clue.annotationLabel}</Text><Text style={[s.body,s.annotation]}>{clue.annotation}</Text>
    </View>
   </View>
  </ImageBackground></ScrollView>
 </StationMenu>;
}
const s=StyleSheet.create({
 actions:{flexDirection:'row',alignItems:'center',gap:10},button:{minHeight:44,justifyContent:'center',paddingHorizontal:10},ink:{color:'#fae3b4',fontSize:16,fontWeight:'600'},
 scroll:{flexShrink:1,backgroundColor:'#ded5bd'},paper:{padding:15},content:{flexDirection:'row',alignItems:'center',gap:14},
 copy:{flex:1},legend:{color:'#5b4d38',fontSize:12,fontWeight:'700',letterSpacing:1.1,marginBottom:10},
 body:{color:'#292e22',fontFamily:'Georgia',fontSize:17,lineHeight:23},caption:{color:'#65543b',fontSize:12,marginTop:10,marginBottom:2},annotation:{fontStyle:'italic'},
});
