import React from 'react';
import {View} from 'react-native';
export default function BowLockGlyph({locked=false}:{locked?:boolean}){
 const color=locked?'#d7edab':'#f1d39b';
 return <View pointerEvents="none" style={{width:25,height:25}}>
  {([[-1,-1],[1,-1],[-1,1],[1,1]] as const).map(([x,y])=><View key={`${x},${y}`} style={{position:'absolute',width:7,height:7,...(x<0?{left:3,borderLeftWidth:2}:{right:3,borderRightWidth:2}),...(y<0?{top:3,borderTopWidth:2}:{bottom:3,borderBottomWidth:2}),borderColor:color}}/>)}
  <View style={{position:'absolute',left:7,top:7,width:11,height:11,borderRadius:6,borderWidth:1.8,borderColor:color,backgroundColor:'#173a32'}}/>
  <View style={{position:'absolute',left:10.5,top:10.5,width:4,height:4,backgroundColor:locked?'#c2e98a':'#f4e6c7',transform:[{rotate:'45deg'}]}}/>
 </View>;
}
