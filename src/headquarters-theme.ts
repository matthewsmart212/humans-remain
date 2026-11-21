import {Platform, type TextStyle, type ViewStyle} from 'react-native';
import {START_SCREEN_MENU_FONT} from './start-screen-art';

// Match the starting screen's brass-edged panels and the field kit's paper controls.
export const hq = {
 panel:'#102e2f', surface:'#173b3c', inset:'#091f21', selected:'#23494a',
 line:'#526d65', edge:'#a38a60', brass:'#e1b66e', text:'#f4e6c7',
 muted:'#bdc4ae', ink:'#173c3d', parchment:'#e4d4ad', success:'#afd584', danger:'#ffb395',
} as const;

export const hqType = {
 display:START_SCREEN_MENU_FONT,
 label:Platform.OS==='web'?'Barlow Condensed':'FieldKitBarlow',
 body:Platform.OS==='web'?'Barlow':undefined,
};

export const hqPrimary:ViewStyle = {
 backgroundColor:hq.parchment, borderWidth:1, borderColor:hq.edge, borderRadius:7,
 ...(Platform.OS==='web'?{
  backgroundImage:'linear-gradient(175deg,#f3e5c7,#e4d4ad 60%,#d1bc8e)',
  boxShadow:'inset 0 0 0 1px #fff1cd, 0 2px 2px #04111355',
 }:{}),
};
export const hqPrimaryLabel:TextStyle = {
 fontFamily:hqType.label, fontWeight:Platform.OS==='web'?'800':'normal',
 color:hq.ink, fontSize:20, lineHeight:25, letterSpacing:0.7, textTransform:'uppercase',
};
